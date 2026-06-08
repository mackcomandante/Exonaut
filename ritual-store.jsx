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
    // Returns the stored award record for a given week, or null
    getIotwWinner(weekNum) {
      try {
        const raw = localStorage.getItem('exo:iotw:awarded:w' + weekNum);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    },
  };

  // True once it's Friday 6:00 PM or later
  function isFridayCutoff() {
    const now = new Date();
    return now.getDay() === 5 && now.getHours() >= 18;
  }

  // Resolve the active cohort object
  function getActiveCohort(cohortId) {
    const all = [
      ...(window.COHORTS || []),
      ...(window.__cohortStore ? window.__cohortStore.getAll() : []),
    ];
    return all.find(c => c.id === cohortId) || all.find(c => c.status === 'active') || all[0] || null;
  }

  // Award the weekly winner and auto-post to the community board as Commander.
  // Runs at most once per (cohortId, weekNum) pair — guarded by localStorage.
  async function awardInternOfWeek(cohortId, weekNum) {
    if (!isFridayCutoff()) return;
    if (!window.EOW) return;

    const awardedKey = 'exo:iotw:awarded:w' + weekNum;
    if (localStorage.getItem(awardedKey)) return; // already done this week

    const cohort = getActiveCohort(cohortId);
    if (!cohort) return;

    const winners = window.EOW.topOfWeek(cohort.id, weekNum, 1);
    if (!winners.length) return;

    const winner = winners[0];
    __ritualStore.autoLogInternOfWeek(winner.user.id, weekNum);

    // Persist the award so the ritual card lights up on reload
    localStorage.setItem(awardedKey, JSON.stringify({
      userId:     winner.user.id,
      userName:   winner.user.name,
      weekPoints: winner.weekPoints,
      breakdown:  winner.breakdown,
      ts:         Date.now(),
    }));

    // Commander auto-post to the community thread
    if (window.__boardStore) {
      const win   = window.EOW.weekWindow(cohort, weekNum);
      const track = (window.TRACKS || []).find(t => t.code === (winner.user.track || ''));
      const trackLabel = track ? ` from the ${track.name} track` : '';
      await window.__boardStore.createThread({
        title:      `🏆 Intern of the Week · Week ${String(weekNum).padStart(2, '0')} — ${winner.user.name}`,
        body:       [
          `🏆 **Intern of the Week — Week ${weekNum}**`,
          '',
          `Congratulations to **${winner.user.name}**${trackLabel}!`,
          '',
          `They earned **+${winner.weekPoints} points** this week (${win.label}) — the highest in the cohort.`,
          '',
          `Head to your Rituals page to download your certificate and share it on LinkedIn. Keep pushing! 🚀`,
          '',
          `#InternOfTheWeek #ExonautProgram #Exoasia`,
        ].join('\n'),
        channel:    'general',
        authorId:   'cmdr-mack',
        authorName: 'Mack Comandante',
        authorRole: 'commander',
      });
    }
  }

  function useRituals(userId, weekNum) {
    const [tick, setTick] = React.useState(0);

    // Legacy: auto-log IotW if user tops the all-time leaderboard
    React.useEffect(() => {
      if (!userId || !weekNum) return;
      const totals = (window.USERS || []).map(u => ({ id: u.id, points: window.computeTotal ? window.computeTotal(u.id, []) : u.points || 0 }));
      const top = totals.sort((a, b) => b.points - a.points)[0];
      if (top?.id === userId) __ritualStore.autoLogInternOfWeek(userId, weekNum);
    }, [userId, weekNum]);

    // Friday 6PM cutoff — check on mount and every 60 s
    React.useEffect(() => {
      if (!userId || !weekNum) return;
      const cohortId = (typeof ME !== 'undefined' && ME?.cohort) || 'c2627';
      awardInternOfWeek(cohortId, weekNum);
      const iv = setInterval(() => awardInternOfWeek(cohortId, weekNum), 60000);
      return () => clearInterval(iv);
    }, [userId, weekNum]);

    const weekData = __ritualStore.getWeek(userId, weekNum);
    const refresh  = React.useCallback(() => setTick(t => t + 1), []);
    return { weekData, refresh };
  }

  Object.assign(window, { __ritualStore, useRituals });
})();
