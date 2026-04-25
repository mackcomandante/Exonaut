// Per-user notification store — localStorage-backed
(function () {
  const STORE_KEY = 'exo:notifs:v1';

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return {};
  }
  function persist(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }

  const listeners = new Set();
  const state = load(); // { [userId]: [{ id, type, title, sub, icon, ts, unread }] }

  function notify() { persist(state); listeners.forEach(fn => fn()); }
  function genId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(d / 3600000);
    if (h < 24) return h + 'h ago';
    const days = Math.floor(d / 86400000);
    if (days < 7) return days + 'd ago';
    return Math.floor(days / 7) + 'w ago';
  }

  const store = {
    getForUser(userId) {
      return [...(state[userId] || [])].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    },
    hasUnread(userId) {
      return (state[userId] || []).some(n => n.unread);
    },
    add({ toUserId, type, title, sub, icon }) {
      if (!state[toUserId]) state[toUserId] = [];
      state[toUserId].unshift({ id: genId(), type, title, sub, icon, ts: Date.now(), unread: true });
      notify();
    },
    markAllRead(userId) {
      (state[userId] || []).forEach(n => { n.unread = false; });
      notify();
    },
    timeAgo,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.__notifStore = store;

  window.useNotifications = function useNotifications(userId) {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      list: store.getForUser(userId),
      hasUnread: userId ? store.hasUnread(userId) : false,
      markAllRead: () => store.markAllRead(userId),
    };
  };
})();
