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
    // Pull a handful of users for authorship if USERS is available.
    const U = (typeof USERS !== 'undefined') ? USERS : [];
    const U_IDS = U.map(u => u.id);
    const pick = (i) => U_IDS[i % U_IDS.length] || 'u01';

    const H = 3600 * 1000, D = 86400 * 1000;

    const T = [
      {
        id: 'th-welcome',
        channel: 'general',
        pinned: true,
        title: 'Welcome to the Exonaut message board',
        body: 'This is where the cohort talks — open questions, gear recs, shipping wins, missed-ritual apologies, and the occasional gif. Be direct. Lift before you climb. No karma farming; we already track points.\n\nUse channels to target your post (track channels are for track-specific chatter, #general for everything else, #alumni for cross-batch).',
        authorId: 'cmdr-seed', authorRole: 'commander', authorName: 'Mission Commander',
        ts: Date.now() - 10 * D,
        votes: { u01: 1, u02: 1, u03: 1, u04: 1, u05: 1, u06: 1, u07: 1 },
        comments: [
          { id: 'c-welc-1', authorId: pick(1), ts: Date.now() - 9 * D, body: 'First 👋', votes: { u01: 1, u05: 1 }, replies: [] },
          { id: 'c-welc-2', authorId: pick(3), ts: Date.now() - 8 * D, body: 'Can we pin a channel index post? Hard to keep track of where things go.', votes: { u02: 1 }, replies: [
            { id: 'c-welc-2a', authorId: 'cmdr-seed', authorName: 'Mission Commander', ts: Date.now() - 7.5 * D, body: "Good call — I'll pin one this week.", votes: {}, replies: [] },
          ] },
        ],
      },
      {
        id: 'th-ais-prompt',
        channel: 'ais',
        title: 'Prompt chain I stole from the AI Strategy brief — saved me 2 hours on Monday',
        body: 'For the competitive landscape mission, chaining:\n1) "List 6 competitors of X with one-sentence positioning each"\n2) "Score each on [criteria] from 1–5 with justification"\n3) "Rewrite as a slide title + 2 supporting bullets, Exoasia tone"\n\nEach step gets its own chat window so context stays clean. Works better than asking all at once.',
        authorId: 'u05', authorRole: 'exonaut',
        ts: Date.now() - 3 * D - 4 * H,
        votes: { u01: 1, u02: 1, u03: 1, u07: 1, u14: 1, u06: 1 },
        comments: [
          { id: 'c-ais-1', authorId: 'u06', ts: Date.now() - 2.5 * D, body: 'Stealing this. Have you tried a 4th step that asks it to critique its own bullets? Rescued two decks last week.', votes: { u05: 1, u03: 1 }, replies: [
            { id: 'c-ais-1a', authorId: 'u05', ts: Date.now() - 2 * D, body: "I have — it's like a 15-sec peer review.", votes: { u06: 1 }, replies: [] },
          ] },
          { id: 'c-ais-2', authorId: 'u03', ts: Date.now() - 2 * D, body: 'Does this fit the word limit for Mission P1? I keep blowing past.', votes: {}, replies: [] },
        ],
      },
      {
        id: 'th-rituals',
        channel: 'general',
        title: 'Anyone else feel Monday Ignition has gotten sharper over the last 3 weeks?',
        body: "Genuinely the best hour of my Monday. Whoever's been prepping the prompts — thank you. Culture move.",
        authorId: 'u07', authorRole: 'exonaut',
        ts: Date.now() - 1 * D - 6 * H,
        votes: { u01: 1, u02: 1, u03: 1, u04: 1, u05: 1, u06: 1, u08: 1, u09: 1, u14: 1, u11: 1 },
        comments: [
          { id: 'c-rit-1', authorId: 'u11', ts: Date.now() - 1 * D, body: 'Agreed. The "what did you ship that you forgot to be proud of" prompt last week wrecked me in the best way.', votes: { u07: 1, u05: 1 }, replies: [] },
          { id: 'c-rit-2', authorId: 'u02', ts: Date.now() - 22 * H, body: 'It really helps when people come with receipts instead of vibes.', votes: { u07: 1 }, replies: [] },
        ],
      },
      {
        id: 'th-client',
        channel: 'ais',
        title: 'Kestrel client call tomorrow — anyone free to pressure-test my deck at 20:00 SGT?',
        body: 'Going in with the competitive map + 3-option recommendation. Want a skeptical eye, especially on slide 6 (market sizing). 15 mins on Meet. Will trade: kudos and a coffee at next Friday Win Wall.',
        authorId: 'u14', authorRole: 'exonaut', authorName: null,
        ts: Date.now() - 5 * H,
        votes: { u05: 1, u06: 1, u07: 1 },
        comments: [
          { id: 'c-cli-1', authorId: 'u06', ts: Date.now() - 4 * H, body: "I'm in. Drop the link.", votes: { u14: 1 }, replies: [] },
          { id: 'c-cli-2', authorId: 'u05', ts: Date.now() - 3 * H, body: 'Same — can join 20:15 onwards if you need a second pair of eyes.', votes: {}, replies: [] },
        ],
      },
      {
        id: 'th-alumni',
        channel: 'alumni',
        title: '[2025-26 cohort] Hiring: Senior AI Consultant at Exoasia, referrals get priority',
        body: 'We just opened a role on my team. Looking for someone who can own a client workstream end-to-end. If anyone in the current batch is thinking about full-time post-program, ping me — happy to chat even if you\'re not sure yet.',
        authorId: 'a01', authorName: 'Zara Okonkwo', authorRole: 'alumni',
        ts: Date.now() - 2 * D,
        votes: { u01: 1, u02: 1, u05: 1, u06: 1, u07: 1, u11: 1, u14: 1 },
        comments: [
          { id: 'c-alu-1', authorId: 'u14', ts: Date.now() - 1.5 * D, body: "Messaged. Thanks for opening this up.", votes: {}, replies: [] },
        ],
      },
      {
        id: 'th-vb',
        channel: 'vb',
        title: 'Venture Builder track — who is using cap tables in the diligence mission?',
        body: 'Mission 2 specifically asks for a "simple cap table pre/post". Is that just pre-seed dilution math or full waterfall? The brief is a little vague and I don\'t want to over-build.',
        authorId: 'u02', authorRole: 'exonaut',
        ts: Date.now() - 18 * H,
        votes: { u04: 1, u09: 1 },
        comments: [],
      },
      {
        id: 'th-pol',
        channel: 'pol',
        title: 'Policy research — stop pasting 40 tabs of MAS pages into one doc',
        body: "Friendly reminder the grading rubric rewards a sharp 2-page memo over a 20-page dump. Spend the last 25% of your time cutting, not researching.",
        authorId: 'u03', authorRole: 'exonaut',
        ts: Date.now() - 9 * H,
        votes: { u11: 1, u14: 1 },
        comments: [
          { id: 'c-pol-1', authorId: 'u11', ts: Date.now() - 8 * H, body: 'This is the reminder I needed. Two-page rule > all.', votes: {}, replies: [] },
        ],
      },
    ];
    return T;
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
