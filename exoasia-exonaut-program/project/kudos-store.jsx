// ============================================================================
// Kudos store - cohort-scoped kudos with Supabase sync and local fallback.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:kudos:v3';
  if (window.__kudosStore) return;

  function seed() {
    if (typeof KUDOS_FEED === 'undefined' || !Array.isArray(KUDOS_FEED)) return [];
    function msFromHint(hint) {
      const m = /(\d+)\s*(h|d)/.exec(hint || '');
      if (!m) return 3600000;
      const n = parseInt(m[1], 10);
      return (m[2] === 'h' ? n * 3600000 : n * 86400000);
    }
    return KUDOS_FEED.map((k, i) => ({
      id: 'kseed-' + i,
      from: k.from,
      fromName: null,
      fromRole: 'exonaut',
      to: k.to,
      toName: null,
      msg: k.msg,
      pillar: k.pillar || 'culture',
      cohortId: 'c2627',
      week: (typeof COHORT !== 'undefined' ? COHORT.week : 1) || 1,
      giverPoints: 0,
      receiverPoints: 0.25,
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

  function notify() {
    persist(state);
    listeners.forEach(fn => fn());
  }

  function timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(d / 3600000);
    if (h < 24) return h + 'h ago';
    const days = Math.floor(d / 86400000);
    if (days < 7) return days + 'd ago';
    const w = Math.floor(days / 7);
    if (w < 5) return w + 'w ago';
    return Math.floor(days / 30) + 'mo ago';
  }

  function currentWeekForCohort(cohortId) {
    const cohort = window.__cohortStore?.getAll?.().find(c => c.id === cohortId);
    if (window.EOW?.currentWeek) return window.EOW.currentWeek(cohort);
    return (typeof COHORT !== 'undefined' ? COHORT.week : 1) || 1;
  }

  function fromRemote(row) {
    return {
      id: row.id,
      from: row.giver_id,
      fromName: null,
      fromRole: 'exonaut',
      to: row.receiver_id,
      toName: null,
      msg: row.message || '',
      pillar: row.pillar || 'culture',
      cohortId: row.cohort_id || 'c2627',
      week: Number(row.week) || 1,
      giverPoints: Number(row.giver_points) || 0,
      receiverPoints: Number(row.receiver_points) || 0.25,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  }

  async function refreshRemote() {
    if (!window.__db) return state.kudos;
    const { data, error } = await window.__db
      .from('kudos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Could not load kudos:', error.message || error);
      return state.kudos;
    }
    state.kudos = (data || []).map(fromRemote);
    notify();
    return state.kudos;
  }

  function weeklyGiverAwardCount(giverId, cohortId, week) {
    return state.kudos.filter(k =>
      k.from === giverId &&
      (k.cohortId || 'c2627') === (cohortId || 'c2627') &&
      Number(k.week || 1) === Number(week || 1) &&
      Number(k.giverPoints || 0) > 0
    ).length;
  }

  async function awardKudosPoints(k) {
    if (!window.__pointsStore?.award) return;
    await window.__pointsStore.award({
      id: `${k.id}-receiver`,
      userId: k.to,
      sourceType: 'kudos',
      sourceId: `${k.id}:receiver`,
      cohortId: k.cohortId || 'c2627',
      pillar: 'culture',
      points: Number(k.receiverPoints) || 0.25,
      note: 'Received kudos',
    });
    if (Number(k.giverPoints || 0) > 0) {
      await window.__pointsStore.award({
        id: `${k.id}-giver`,
        userId: k.from,
        sourceType: 'kudos',
        sourceId: `${k.id}:giver`,
        cohortId: k.cohortId || 'c2627',
        pillar: 'culture',
        points: Number(k.giverPoints) || 0.5,
        note: 'Gave kudos',
      });
    }
  }

  const store = {
    all() {
      return [...state.kudos].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    involving(userId) {
      return store.all().filter(k => k.to === userId || k.from === userId);
    },
    toUser(userId) { return store.all().filter(k => k.to === userId); },
    fromUser(userId) { return store.all().filter(k => k.from === userId); },
    weeklyUsage(userId, cohortId, week) {
      return weeklyGiverAwardCount(userId, cohortId, week || currentWeekForCohort(cohortId));
    },
    async refresh() {
      return refreshRemote();
    },
    async give({ from, fromName, fromRole, to, toName, msg, pillar, cohortId, week }) {
      const effectiveCohort = cohortId || 'c2627';
      const effectiveWeek = week || currentWeekForCohort(effectiveCohort);
      if (window.__db) await refreshRemote();
      const used = weeklyGiverAwardCount(from, effectiveCohort, effectiveWeek);
      const giverPoints = used < 4 ? 0.5 : 0;
      const k = {
        id: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        from,
        fromName: fromName || null,
        fromRole: fromRole || 'exonaut',
        to,
        toName: toName || null,
        msg: String(msg || '').trim(),
        pillar: pillar || 'culture',
        cohortId: effectiveCohort,
        week: effectiveWeek,
        giverPoints,
        receiverPoints: 0.25,
        createdAt: Date.now(),
      };
      state.kudos.unshift(k);
      notify();

      let canAward = true;
      if (window.__db) {
        const row = {
          id: k.id,
          giver_id: k.from,
          receiver_id: k.to,
          cohort_id: k.cohortId,
          message: k.msg,
          pillar: k.pillar,
          week: k.week,
          giver_points: k.giverPoints,
          receiver_points: k.receiverPoints,
          created_at: new Date(k.createdAt).toISOString(),
        };
        const { error } = await window.__db.from('kudos').insert(row);
        if (error) {
          canAward = false;
          console.warn('Could not save kudos:', error.message || error);
        }
      }

      if (canAward) await awardKudosPoints(k);
      return k;
    },
    timeAgo,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.__kudosStore = store;
  window.useKudos = function useKudos() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = store.subscribe(() => setTick(t => t + 1));
      store.refresh();
      return unsub;
    }, []);
    return {
      all: store.all(),
      involving: store.involving,
      toUser: store.toUser,
      fromUser: store.fromUser,
      weeklyUsage: store.weeklyUsage,
      refresh: store.refresh,
      give: store.give,
      timeAgo,
    };
  };

  refreshRemote();
})();
