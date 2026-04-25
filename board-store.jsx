// ============================================================================
// Message Board store — Reddit-style threads inside Community.
// Supports channels (all, general, tracks, alumni), upvote/downvote, comments
// (incl. nested replies), sorting by hot/new/top.
// Persisted to localStorage; seeded with a realistic set of Exoasia threads on
// first load so the board doesn't look empty.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:board:v2';

  // ---- Seed content -------------------------------------------------------
  function seedThreads() {
    return [];
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.threads)) return parsed;
      }
    } catch (e) {}
    return { threads: seedThreads() };
  }
  function persist(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch(e) {} }

  const listeners = new Set();
  const state = load();
  function notify() { persist(state); listeners.forEach(fn => fn()); }

  // --------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------
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
    const age = Math.max(1, (Date.now() - thread.ts) / 3600000);   // hours
    return (s + 1) / Math.pow(age + 2, 1.4);                       // Reddit-ish decay
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
  function genId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  function findComment(thread, commentId) {
    const walk = (arr, parent) => {
      for (const c of arr) {
        if (c.id === commentId) return { comment: c, parent };
        if (c.replies?.length) {
          const r = walk(c.replies, c);
          if (r) return r;
        }
      }
      return null;
    };
    return walk(thread.comments || [], null);
  }

  // --------------------------------------------------------------------
  // Public store
  // --------------------------------------------------------------------
  const store = {
    list({ channel = 'all', sort = 'hot', search = '' } = {}) {
      let list = state.threads.filter(t => {
        if (channel !== 'all' && t.channel !== channel) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!(t.title.toLowerCase().includes(q) || (t.body || '').toLowerCase().includes(q))) return false;
        }
        return true;
      });

      if (sort === 'new') list.sort((a, b) => b.ts - a.ts);
      else if (sort === 'top') list.sort((a, b) => voteScore(b.votes) - voteScore(a.votes));
      else /* hot */           list.sort((a, b) => hotScore(b) - hotScore(a));

      // Pinned always on top.
      list.sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
      return list;
    },
    get(threadId) { return state.threads.find(t => t.id === threadId); },

    createThread({ title, body, channel, authorId, authorName, authorRole }) {
      const t = {
        id: genId('th-'),
        channel: channel || 'general',
        title: String(title || '').trim() || 'Untitled',
        body: String(body || '').trim(),
        authorId, authorName: authorName || null, authorRole: authorRole || 'exonaut',
        ts: Date.now(),
        votes: { [authorId]: 1 },
        comments: [],
        pinned: false,
      };
      state.threads.unshift(t);
      notify();
      return t;
    },
    deleteThread(threadId) {
      const i = state.threads.findIndex(t => t.id === threadId);
      if (i === -1) return false;
      state.threads.splice(i, 1);
      notify();
      return true;
    },
    voteThread(threadId, userId, direction) {
      const t = state.threads.find(x => x.id === threadId);
      if (!t) return;
      if (!t.votes) t.votes = {};
      const cur = t.votes[userId] || 0;
      const next = cur === direction ? 0 : direction;      // toggle-off if pressing the same arrow
      if (next === 0) delete t.votes[userId];
      else            t.votes[userId] = next;
      notify();
    },

    addComment(threadId, { parentId = null, body, authorId, authorName, authorRole }) {
      const t = state.threads.find(x => x.id === threadId);
      if (!t) return null;
      const comment = {
        id: genId('c-'),
        authorId, authorName: authorName || null, authorRole: authorRole || 'exonaut',
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
      return comment;
    },
    voteComment(threadId, commentId, userId, direction) {
      const t = state.threads.find(x => x.id === threadId);
      if (!t) return;
      const found = findComment(t, commentId);
      if (!found) return;
      const c = found.comment;
      if (!c.votes) c.votes = {};
      const cur = c.votes[userId] || 0;
      const next = cur === direction ? 0 : direction;
      if (next === 0) delete c.votes[userId];
      else            c.votes[userId] = next;
      notify();
    },

    // Constants
    voteScore, countComments, timeAgo,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  // Channel metadata
  window.BOARD_CHANNELS = [
    { id: 'all',     label: 'All',        icon: 'fa-layer-group',    color: 'var(--off-white)' },
    { id: 'general', label: 'General',    icon: 'fa-comments',       color: 'var(--off-white)' },
    { id: 'ais',     label: 'AI Strategy',icon: 'fa-brain',          color: 'var(--lime)' },
    { id: 'aid',     label: 'AI Data',    icon: 'fa-database',       color: 'var(--sky)' },
    { id: 'vb',      label: 'Venture',    icon: 'fa-rocket',         color: 'var(--amber)' },
    { id: 'pol',     label: 'Policy',     icon: 'fa-scale-balanced', color: 'var(--lavender)' },
    { id: 'cc',      label: 'Content',    icon: 'fa-pen-nib',        color: 'var(--platinum)' },
    { id: 'xm',      label: 'Experience', icon: 'fa-palette',        color: 'var(--peach)' },
    { id: 'lp',      label: 'Leadership', icon: 'fa-compass',        color: 'var(--ink)' },
    { id: 'alumni',  label: 'Alumni',     icon: 'fa-user-astronaut', color: 'var(--lavender)' },
  ];

  window.__boardStore = store;
  window.useBoard = function useBoard() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      list: store.list,
      get: store.get,
      createThread: store.createThread,
      deleteThread: store.deleteThread,
      voteThread: store.voteThread,
      addComment: store.addComment,
      voteComment: store.voteComment,
      voteScore, countComments, timeAgo,
    };
  };
})();
