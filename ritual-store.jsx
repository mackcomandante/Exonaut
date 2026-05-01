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
    // Returns all entries with state === 'submitted' across every user/week
    getAllSubmitted() {
      const data = load();
      const result = [];
      for (const userId of Object.keys(data)) {
        for (const weekNum of Object.keys(data[userId])) {
          for (const ritualId of Object.keys(data[userId][weekNum])) {
            const entry = data[userId][weekNum][ritualId];
            if (entry.state === 'submitted') {
              result.push({ userId, weekNum: Number(weekNum), ritualId, ts: entry.ts, postId: entry.postId });
            }
          }
        }
      }
      return result.sort((a, b) => a.ts - b.ts); // oldest first
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
