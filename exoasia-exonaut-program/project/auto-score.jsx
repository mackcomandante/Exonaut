// Auto-score + auto-badge engine. The point ledger is the source of truth.
(function () {
  const MILESTONES = [
    { code: 'MIL-BRZ', at: 100, name: 'Bronze Builder' },
    { code: 'MIL-SLV', at: 300, name: 'Silver Strategist' },
    { code: 'MIL-GLD', at: 600, name: 'Gold Innovator' },
    { code: 'MIL-PLT', at: 900, name: 'Platinum Disruptor' },
  ];

  if (!window.__autoBadges) {
    window.__autoBadges = { celebratedCodes: new Set() };
  }

  function computeTotal(userId) {
    return window.__pointsStore ? window.__pointsStore.totalForUser(userId) : 0;
  }

  function useComputedPoints(userId = ME_ID) {
    const pointsState = usePoints();
    return React.useMemo(() => {
      const total = pointsState.ledger
        .filter(e => e.userId === userId)
        .reduce((sum, e) => sum + Number(e.points || 0), 0);
      return { total, baseline: 0, delta: total };
    }, [pointsState.ledger, userId]);
  }

  function useComputedMilestones(userId = ME_ID) {
    const { total } = useComputedPoints(userId);
    return React.useMemo(() => MILESTONES.map(m => ({ ...m, earned: total >= m.at })), [total]);
  }

  function useAutoBadgeFire(onCelebrate) {
    const { total } = useComputedPoints(ME_ID);
    React.useEffect(() => {
      if (!onCelebrate) return;
      for (const m of MILESTONES) {
        if (total >= m.at && !window.__autoBadges.celebratedCodes.has(m.code)) {
          window.__autoBadges.celebratedCodes.add(m.code);
          const badge = BADGES.find(b => b.code === m.code);
          if (badge) {
            badge.earned = true;
            badge.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
            setTimeout(() => onCelebrate('badge', { badge }), 900);
          }
        }
      }
    }, [total, onCelebrate]);
  }

  function useLiveBadges(userId = ME_ID) {
    const milestones = useComputedMilestones(userId);
    return React.useMemo(() => BADGES.map(b => {
      const live = milestones.find(m => m.code === b.code);
      if (!live) return { ...b, earned: !!b.earned };
      return { ...b, earned: live.earned, date: live.earned ? (b.date || 'EARNED') : undefined };
    }), [milestones]);
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
