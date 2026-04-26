// ============================================================================
// Message Board store — Supabase-backed, real-time synced.
// Threads and comments are stored in `board_threads` table.
// All users see the same feed in real time.
// ============================================================================

(function () {

  // ---- Helpers ---------------------------------------------------------------
  function voteScore(votes) {
    if (!votes) return 0;
    let s = 0;
    for (const k in votes) s += votes[k] | 0;
    return s;
  }
  function countComments(thread) {
    let n = 0;
    const walk = (arr) => { arr.forEach(c => { n++; if (c.replies) walk(c.replies); }); };
    walk(thread.comments || []);
    return n;
  }
  function hotScore(thread) {
    const s = voteScore(thread.votes);
    const age = Math.max(1, (Date.now() - thread.ts) / 3600000);
    return (s + 1) / Math.pow(age + 2, 1.4);
  }
  function timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm';
    const h = Math.floor(d / 3600000);
    if (h < 24) return h + 'h';
    const days = Math.floor(d / 86400000);
    if (days < 7) return days + 'd';
    const w = Math.floor(days / 7);
    if (w < 5) return w + 'w';
    return Math.floor(days / 30) + 'mo';
  }
  function genId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }
  function findComment(thread, commentId) {
    const walk = (arr, parent) => {
      for (const c of arr) {
        if (c.id === commentId) return { comment: c, parent };
        if (c.replies?.length) { const r = walk(c.replies, c); if (r) return r; }
      }
      return null;
    };
    return walk(thread.comments || [], null);
  }

  // ---- Row ↔ thread conversion -----------------------------------------------
  function rowToThread(row) {
    return {
      id:         row.id,
      channel:    row.channel,
      title:      row.title,
      body:       row.body,
      authorId:   row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      ts:         new Date(row.created_at).getTime(),
      votes:      row.votes   || {},
      comments:   row.comments || [],
      pinned:     row.pinned  || false,
    };
  }

  // ---- In-memory state -------------------------------------------------------
  let threads = [];
  const listeners = new Set();
  function notify() { listeners.forEach(fn => fn()); }

  // ---- Load from Supabase ----------------------------------------------------
  async function loadFromDB() {
    if (!window.__db) return;
    const { data, error } = await window.__db
      .from('board_threads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[board] load:', error); return; }
    threads = (data || []).map(rowToThread);
    notify();
  }

  // ---- Real-time subscription ------------------------------------------------
  function initRealtime() {
    if (!window.__db) return;
    window.__db
      .channel('board_threads_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_threads' }, () => {
        loadFromDB();
      })
      .subscribe();
  }

  // Kick off on script load — DB client is already initialised by supabase-client.js
  loadFromDB().then(initRealtime);

  // ---- Public store API ------------------------------------------------------
  const store = {

    list({ channel = 'all', sort = 'hot', search = '' } = {}) {
      let list = threads.filter(t => {
        if (channel !== 'all' && t.channel !== channel) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!(t.title.toLowerCase().includes(q) || (t.body || '').toLowerCase().includes(q))) return false;
        }
        return true;
      });
      if (sort === 'new')      list.sort((a, b) => b.ts - a.ts);
      else if (sort === 'top') list.sort((a, b) => voteScore(b.votes) - voteScore(a.votes));
      else                     list.sort((a, b) => hotScore(b) - hotScore(a));
      list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      return list;
    },

    get(threadId) { return threads.find(t => t.id === threadId); },

    async createThread({ title, body, channel, authorId, authorName, authorRole }) {
      const id = genId('th-');
      const row = {
        id,
        channel:     channel || 'general',
        title:       String(title || '').trim() || 'Untitled',
        body:        String(body  || '').trim(),
        author_id:   authorId,
        author_name: authorName,
        author_role: authorRole || 'exonaut',
        votes:       { [authorId]: 1 },
        comments:    [],
        pinned:      false,
      };
      // Optimistic insert
      const t = rowToThread({ ...row, created_at: new Date().toISOString() });
      threads.unshift(t);
      notify();
      const { error } = await window.__db.from('board_threads').insert(row);
      if (error) {
        console.error('[board] createThread:', error);
        threads = threads.filter(x => x.id !== id);
        notify();
      }
      return t;
    },

    async deleteThread(threadId) {
      const i = threads.findIndex(t => t.id === threadId);
      if (i === -1) return false;
      threads.splice(i, 1);
      notify();
      const { error } = await window.__db.from('board_threads').delete().eq('id', threadId);
      if (error) console.error('[board] deleteThread:', error);
      return true;
    },

    async voteThread(threadId, userId, direction) {
      const t = threads.find(x => x.id === threadId);
      if (!t) return;
      if (!t.votes) t.votes = {};
      const cur = t.votes[userId] || 0;
      const next = cur === direction ? 0 : direction;
      if (next === 0) delete t.votes[userId]; else t.votes[userId] = next;
      notify();
      const { error } = await window.__db
        .from('board_threads').update({ votes: t.votes }).eq('id', threadId);
      if (error) console.error('[board] voteThread:', error);
    },

    async addComment(threadId, { parentId = null, body, authorId, authorName, authorRole }) {
      const t = threads.find(x => x.id === threadId);
      if (!t) return null;
      const comment = {
        id: genId('c-'),
        authorId, authorName, authorRole: authorRole || 'exonaut',
        ts: Date.now(),
        body: String(body || '').trim(),
        votes: { [authorId]: 1 },
        replies: [],
      };
      if (parentId) {
        const found = findComment(t, parentId);
        if (!found) return null;
        (found.comment.replies = found.comment.replies || []).push(comment);
      } else {
        t.comments = t.comments || [];
        t.comments.push(comment);
      }
      notify();
      const { error } = await window.__db
        .from('board_threads').update({ comments: t.comments }).eq('id', threadId);
      if (error) console.error('[board] addComment:', error);
      return comment;
    },

    async voteComment(threadId, commentId, userId, direction) {
      const t = threads.find(x => x.id === threadId);
      if (!t) return;
      const found = findComment(t, commentId);
      if (!found) return;
      const c = found.comment;
      if (!c.votes) c.votes = {};
      const cur = c.votes[userId] || 0;
      const next = cur === direction ? 0 : direction;
      if (next === 0) delete c.votes[userId]; else c.votes[userId] = next;
      notify();
      const { error } = await window.__db
        .from('board_threads').update({ comments: t.comments }).eq('id', threadId);
      if (error) console.error('[board] voteComment:', error);
    },

    voteScore, countComments, timeAgo,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  // ---- Channel metadata ------------------------------------------------------
  window.BOARD_CHANNELS = [
    { id: 'all',     label: 'All',         icon: 'fa-layer-group',    color: 'var(--off-white)' },
    { id: 'general', label: 'General',     icon: 'fa-comments',       color: 'var(--off-white)' },
    { id: 'ais',     label: 'AI Strategy', icon: 'fa-brain',          color: 'var(--lime)'      },
    { id: 'aid',     label: 'AI Data',     icon: 'fa-database',       color: 'var(--sky)'       },
    { id: 'vb',      label: 'Venture',     icon: 'fa-rocket',         color: 'var(--amber)'     },
    { id: 'pol',     label: 'Policy',      icon: 'fa-scale-balanced', color: 'var(--lavender)'  },
    { id: 'cc',      label: 'Content',     icon: 'fa-pen-nib',        color: 'var(--platinum)'  },
    { id: 'xm',      label: 'Experience',  icon: 'fa-palette',        color: 'var(--peach)'     },
    { id: 'lp',      label: 'Leadership',  icon: 'fa-compass',        color: 'var(--ink)'       },
    { id: 'alumni',  label: 'Alumni',      icon: 'fa-user-astronaut', color: 'var(--lavender)'  },
  ];

  window.__boardStore = store;

  window.useBoard = function useBoard() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      list:         store.list,
      get:          store.get,
      createThread: store.createThread,
      deleteThread: store.deleteThread,
      voteThread:   store.voteThread,
      addComment:   store.addComment,
      voteComment:  store.voteComment,
      voteScore, countComments, timeAgo,
    };
  };

})();
