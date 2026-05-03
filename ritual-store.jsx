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
      data[userId][weekNum][ritualId] = { state: 'logged', ts: Date.now(), postId: postId || null };
      save(data);
      const ritual = (window.RITUALS || []).find(r => r.id === ritualId);
      const source = ritualId === 'mon-ign' ? 'ritual.mon_ign'
        : ritualId === 'mid-pls' ? 'ritual.mid_pls'
        : ritualId === 'fri-win' ? 'ritual.fri_win'
        : 'ritual.' + ritualId.replaceAll('-', '_');
      if (window.__pointsStore && !window.__pointsStore.getAll(userId).some(e => e.source === source && e.weekNum === weekNum && e.ref === ritualId)) {
        window.__pointsStore.add(userId, { source, pts: ritual?.points || 0, note: (ritual?.name || ritualId) + ' logged', weekNum, ref: ritualId });
      }
    },
    confirm(userId, ritualId, weekNum) {
      const data = load();
      if (data[userId]?.[weekNum]?.[ritualId]) {
        data[userId][weekNum][ritualId].state = 'logged';
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
    autoLogInternOfWeek(userId, weekNum) {
      const data = load();
      if (!data[userId]) data[userId] = {};
      if (!data[userId][weekNum]) data[userId][weekNum] = {};
      if (!data[userId][weekNum]['intern-of-week']) {
        data[userId][weekNum]['intern-of-week'] = { state: 'logged', ts: Date.now(), postId: null, auto: true };
        save(data);
        if (window.__pointsStore && !window.__pointsStore.getAll(userId).some(e => e.source === 'milestone.iotw' && e.weekNum === weekNum)) {
          window.__pointsStore.add(userId, { source: 'milestone.iotw', weekNum, ref: 'intern-of-week' });
        }
      }
    },
  };

  function useRituals(userId, weekNum) {
    const [tick, setTick] = React.useState(0);
    React.useEffect(() => {
      if (!userId || !weekNum) return;
      const totals = (window.USERS || []).map(u => ({ id: u.id, points: window.computeTotal ? window.computeTotal(u.id, []) : u.points || 0 }));
      const top = totals.sort((a, b) => b.points - a.points)[0];
      if (top?.id === userId) __ritualStore.autoLogInternOfWeek(userId, weekNum);
    }, [userId, weekNum]);
    const weekData = __ritualStore.getWeek(userId, weekNum);
    const refresh = React.useCallback(() => setTick(t => t + 1), []);
    return { weekData, refresh };
  }

  Object.assign(window, { __ritualStore, useRituals });
})();
