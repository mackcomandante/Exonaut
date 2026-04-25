// Auto-score + auto-badge engine
// -------------------------------------------------------------
// Single source of truth for what the Exonaut has *actually* earned.
// Combines the seeded baseline (ME.points from data.js — represents
// historical ledger through last week) + live deltas from newly-graded
// submissions in subStore. Every time a Lead grades a sub, these hooks
// recompute and any badge thresholds that cross fire a celebration.

(function () {
  // ---- Milestone threshold table (matches BADGES in data.js) ----
  const MILESTONES = [
    { code: 'MIL-BRZ', at: 100,  name: 'Bronze Builder'     },
    { code: 'MIL-SLV', at: 300,  name: 'Silver Strategist'  },
    { code: 'MIL-GLD', at: 600,  name: 'Gold Innovator'     },
    { code: 'MIL-PLT', at: 900,  name: 'Platinum Disruptor' },
  ];

  // Persistent record of which badges the engine has already celebrated,
  // so we don't fire twice across renders.
  if (!window.__autoBadges) {
    window.__autoBadges = {
      celebratedCodes: new Set(
        BADGES.filter(b => b.earned).map(b => b.code)
      ),
    };
  }

  // ---- Compute total for a given user id ----
  // For ME: baseline + live graded deltas from subs.
  // For others: baseline only (no live subs in this prototype).
  function computeTotal(userId, subs) {
    const user = USERS.find(u => u.id === userId);
    if (!user) return 0;
    const baseline = user.points || 0;
    if (!subs || userId !== ME_ID) return baseline;
    const delta = subs
      .filter(s => s.exonautId === userId && s.state === 'approved' && s.pointsAwarded)
      .reduce((sum, s) => sum + s.pointsAwarded, 0);
    return baseline + delta;
  }

  // ---- Live hook: returns { total, delta, baseline } ----
  function useComputedPoints(userId = ME_ID) {
    const subs = useSubs();
    return React.useMemo(() => {
      const baseline = (USERS.find(u => u.id === userId) || {}).points || 0;
      const total = computeTotal(userId, subs);
      return { total, baseline, delta: total - baseline };
    }, [subs, userId]);
  }

  // ---- Live hook: which milestone badges are earned ----
  // Returns an array of { code, earned, at, name } in order.
  function useComputedMilestones(userId = ME_ID) {
    const { total } = useComputedPoints(userId);
    return React.useMemo(() => {
      return MILESTONES.map(m => ({
        ...m,
        earned: total >= m.at,
      }));
    }, [total]);
  }

  // ---- Auto-celebrate: fires onCelebrate('badge', …) when total crosses
  // a threshold that hasn't been celebrated yet. Mount this once at the
  // app root.
  function useAutoBadgeFire(onCelebrate) {
    const { total } = useComputedPoints(ME_ID);
    React.useEffect(() => {
      if (!onCelebrate) return;
      for (const m of MILESTONES) {
        if (total >= m.at && !window.__autoBadges.celebratedCodes.has(m.code)) {
          window.__autoBadges.celebratedCodes.add(m.code);
          const badge = BADGES.find(b => b.code === m.code);
          if (badge) {
            // mark earned in the source so Profile Badges tab updates
            badge.earned = true;
            badge.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
            // Slight delay so it fires after the toast from grading lands.
            setTimeout(() => onCelebrate('badge', { badge }), 900);
          }
        }
      }
    }, [total, onCelebrate]);
  }

  // ---- Earned badges view (milestones + existing non-milestone) ----
  // Merges the BADGES array with live milestone computation.
  function useLiveBadges() {
    const milestones = useComputedMilestones(ME_ID);
    return React.useMemo(() => {
      return BADGES.map(b => {
        const live = milestones.find(m => m.code === b.code);
        if (!live) return b;
        return { ...b, earned: live.earned };
      });
    }, [milestones]);
  }

  Object.assign(window, {
    MILESTONES,
    computeTotal,
    useComputedPoints,
    useComputedMilestones,
    useAutoBadgeFire,
    useLiveBadges,
  });
})();
