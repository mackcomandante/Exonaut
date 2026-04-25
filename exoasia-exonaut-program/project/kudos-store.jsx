// ============================================================================
// Kudos store — any role can give kudos to any community member (active or alumni).
// Persisted to localStorage. Seeded from the hardcoded KUDOS_FEED const on first load.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:kudos:v1';

  function seed() {
    if (typeof KUDOS_FEED === 'undefined' || !Array.isArray(KUDOS_FEED)) return [];
    // Fake creation times staggered by the text hints ("4h ago", "2d ago", …).
    function msFromHint(hint) {
      const m = /(\d+)\s*(h|d)/.exec(hint || '');
      if (!m) return 3600000;
      const n = parseInt(m[1], 10);
      return (m[2] === 'h' ? n * 3600000 : n * 86400000);
    }
    return KUDOS_FEED.map((k, i) => ({
      id: 'kseed-' + i,
      from: k.from, fromName: null, fromRole: 'exonaut',
      to: k.to,
      msg: k.msg,
      pillar: k.pillar || 'project',
      createdAt: Date.now() - msFromHint(k.time),
    }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.kudos)) return parsed;
      }
    } catch (e) { /* ignore */ }
    return { kudos: seed() };
  }
  function persist(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  const listeners = new Set();
  const state = load();

  function notify() { persist(state); listeners.forEach(fn => fn()); }

  function timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(d / 3600000);
    if (h < 24) return h + 'h ago';
    const days = Math.floor(d / 86400000);
    if (days < 7) return days + 'd ago';
    const w = Math.floor(days / 7);
    if (w < 5) return w + 'w ago';
    return Math.floor(days / 30) + 'mo ago';
  }

  const store = {
    all() {
      return [...state.kudos].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    involving(userId) {
      return store.all().filter(k => k.to === userId || k.from === userId);
    },
    toUser(userId)   { return store.all().filter(k => k.to === userId); },
    fromUser(userId) { return store.all().filter(k => k.from === userId); },
    give({ from, fromName, fromRole, to, msg, pillar }) {
      const k = {
        id: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        from, fromName: fromName || null, fromRole: fromRole || 'exonaut',
        to, msg: String(msg || '').trim(),
        pillar: pillar || 'project',
        createdAt: Date.now(),
      };
      state.kudos.unshift(k);
      notify();
      return k;
    },
    timeAgo,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.__kudosStore = store;
  window.useKudos = function useKudos() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      all: store.all(),
      involving: store.involving,
      toUser: store.toUser,
      fromUser: store.fromUser,
      give: store.give,
      timeAgo,
    };
  };
})();
