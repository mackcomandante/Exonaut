// Shared points ledger. Mission and project approvals write here; dashboard,
// leaderboard, badges, and certificates read from the same totals.
(function () {
  if (window.__pointsStore) return;

  const listeners = new Set();
  let state = { ledger: [], loaded: false };

  function activeUserId() {
    return localStorage.getItem('exo:userId') || ME_ID;
  }

  function toEntry(row) {
    return {
      id: row.id,
      userId: row.user_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      cohortId: row.cohort_id || 'c2627',
      trackCode: row.track_code || '',
      pillar: row.pillar || 'project',
      points: Number(row.points) || 0,
      note: row.note || '',
      awardedBy: row.awarded_by,
      awardedAt: row.awarded_at,
    };
  }

  function notify() {
    listeners.forEach(fn => fn());
  }

  function fallbackFromApprovedSubs() {
    const subs = (window.__subStore && window.__subStore.subs) || [];
    return subs
      .filter(s => s.state === 'approved' && Number(s.pointsAwarded) > 0)
      .map(s => ({
        id: 'fallback-' + s.id,
        userId: s.exonautId,
        sourceType: 'mission',
        sourceId: s.id,
        cohortId: 'c2627',
        trackCode: '',
        pillar: 'project',
        points: Number(s.pointsAwarded) || 0,
        note: s.missionTitle || 'Approved mission',
        awardedBy: null,
        awardedAt: s.gradedAt || s.submittedAtIso || new Date().toISOString(),
      }));
  }

  async function refresh() {
    if (!window.__db) {
      state = { ledger: fallbackFromApprovedSubs(), loaded: true };
      notify();
      return state;
    }

    const { data, error } = await window.__db
      .from('point_ledger')
      .select('*')
      .order('awarded_at', { ascending: false });
    if (error) {
      console.warn('Could not load point ledger:', error.message || error);
      state = { ledger: fallbackFromApprovedSubs(), loaded: true };
      notify();
      return state;
    }
    state = { ledger: (data || []).map(toEntry), loaded: true };
    notify();
    return state;
  }

  async function currentActorId() {
    if (!window.__db || !window.__db.auth) return null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || null;
  }

  async function award(entry) {
    const now = new Date();
    const id = entry.id || ('pts-' + (entry.sourceType || 'manual') + '-' + (entry.sourceId || now.getTime()) + '-' + (entry.userId || '').slice(0, 8));
    const row = {
      id,
      user_id: entry.userId,
      source_type: entry.sourceType || 'manual',
      source_id: entry.sourceId || id,
      cohort_id: entry.cohortId || 'c2627',
      track_code: entry.trackCode || null,
      pillar: entry.pillar || 'project',
      points: Number(entry.points) || 0,
      note: entry.note || '',
      awarded_by: entry.awardedBy || await currentActorId(),
      awarded_at: entry.awardedAt || now.toISOString(),
    };
    const local = toEntry(row);
    state = { ...state, ledger: [local, ...state.ledger.filter(e => e.id !== row.id)] };
    notify();

    if (window.__db) {
      const { error } = await window.__db.from('point_ledger').upsert(row, { onConflict: 'id' });
      if (error) console.warn('Could not save point ledger entry:', error.message || error);
      else refresh();
    }
    return local;
  }

  function totalForUser(userId = activeUserId()) {
    return state.ledger
      .filter(e => e.userId === userId)
      .reduce((sum, e) => sum + Number(e.points || 0), 0);
  }

  function breakdownForUser(userId = activeUserId()) {
    const entries = state.ledger.filter(e => e.userId === userId);
    return entries.reduce((acc, e) => {
      acc[e.pillar] = (acc[e.pillar] || 0) + Number(e.points || 0);
      return acc;
    }, {});
  }

  window.__pointsStore = {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state; },
    refresh,
    award,
    totalForUser,
    breakdownForUser,
    entriesForUser(userId = activeUserId()) { return state.ledger.filter(e => e.userId === userId); },
  };

  window.usePoints = function usePoints() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__pointsStore.subscribe(() => setTick(t => t + 1));
      if (!state.loaded) window.__pointsStore.refresh();
      return unsub;
    }, []);
    return window.__pointsStore.all();
  };

  window.useUserPoints = function useUserPoints(userId) {
    const pointsState = window.usePoints();
    const id = userId || activeUserId();
    return React.useMemo(() => {
      const entries = pointsState.ledger.filter(e => e.userId === id);
      const total = entries.reduce((sum, e) => sum + Number(e.points || 0), 0);
      const breakdown = entries.reduce((acc, e) => {
        acc[e.pillar] = (acc[e.pillar] || 0) + Number(e.points || 0);
        return acc;
      }, {});
      return { total, entries, breakdown, loaded: pointsState.loaded };
    }, [pointsState.ledger, pointsState.loaded, id]);
  };

  window.__pointsStore.refresh();
})();
