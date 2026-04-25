// ritual-store.jsx — per-user, per-week ritual submission tracking
(function () {
  const STORE_KEY = 'exo:rituals:v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
  }

  const __ritualStore = {
    submit(userId, ritualId, weekNum, postId) {
      const data = load();
      if (!data[userId]) data[userId] = {};
      if (!data[userId][weekNum]) data[userId][weekNum] = {};
      data[userId][weekNum][ritualId] = { state: 'submitted', ts: Date.now(), postId: postId || null };
      save(data);
    },
    confirm(userId, ritualId, weekNum) {
      const data = load();
      if (data[userId]?.[weekNum]?.[ritualId]) {
        data[userId][weekNum][ritualId].state = 'confirmed';
        save(data);
      }
    },
    getWeek(userId, weekNum) {
      return load()[userId]?.[weekNum] || {};
    },
    getAll(userId) {
      return load()[userId] || {};
    },
    getState(userId, ritualId, weekNum) {
      return load()[userId]?.[weekNum]?.[ritualId]?.state || 'not-started';
    },
  };

  function useRituals(userId, weekNum) {
    const [tick, setTick] = React.useState(0);
    const weekData = __ritualStore.getWeek(userId, weekNum);
    const refresh = React.useCallback(() => setTick(t => t + 1), []);
    return { weekData, refresh };
  }

  Object.assign(window, { __ritualStore, useRituals });
})();
