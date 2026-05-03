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
    const baseline = (user?.points) || 0;
    // Approved mission submissions
    const subDelta = subs
      ? subs.filter(s => s.exonautId === userId && s.state === 'approved' && s.pointsAwarded)
            .reduce((sum, s) => sum + s.pointsAwarded, 0)
      : 0;
    // Points ledger (kudos, rituals, onboarding, manual entries)
    const ledger = window.__pointsStore ? window.__pointsStore.getTotal(userId) : 0;
    return baseline + subDelta + ledger;
  }

  function computePillarScores(userId, subs) {
    const user = USERS.find(u => u.id === userId) || {};
    const events = window.__pointsStore ? window.__pointsStore.getAll(userId) : [];
    const approvedTrack = subs
      ? subs.filter(s => s.exonautId === userId && s.state === 'approved' && s.pointsAwarded)
            .reduce((sum, s) => sum + s.pointsAwarded, 0)
      : 0;
    const sumSource = (prefixes) => events
      .filter(e => prefixes.some(prefix => String(e.source || '').startsWith(prefix)))
      .reduce((sum, e) => sum + (Number(e.pts) || 0), 0);
    return {
      missions: (user.p1 || 0) + approvedTrack + sumSource(['mission.', 'project.task']),
      client: (user.p2 || 0) + sumSource(['client.']),
      recruitment: (user.p3 || 0) + sumSource(['recruit.']),
    };
  }

  function usePillarScores(userId = ME_ID) {
    const subs = useSubs();
    const [ledgerTick, setLedgerTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__pointsStore?.subscribe ? window.__pointsStore.subscribe(() => setLedgerTick(t => t + 1)) : null;
      return () => { if (unsub) unsub(); };
    }, []);
    return React.useMemo(() => computePillarScores(userId, subs), [userId, subs, ledgerTick]);
  }

  // ---- Live hook: returns { total, delta, baseline } ----
  function useComputedPoints(userId = ME_ID) {
    const subs = useSubs();
    // Re-render when pointsStore changes (tick from usePointsLedger if mounted, or manual)
    const [ledgerTick, setLedgerTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__pointsStore?.subscribe ? window.__pointsStore.subscribe(() => setLedgerTick(t => t + 1)) : null;
      function onStorage(e) {
        if (e.key === 'exo:points:v1') setLedgerTick(t => t + 1);
      }
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener('storage', onStorage);
        if (unsub) unsub();
      };
    }, []);

    return React.useMemo(() => {
      const baseline = (USERS.find(u => u.id === userId) || {}).points || 0;
      const total = computeTotal(userId, subs);
      const subDelta = subs
        ? subs.filter(s => s.exonautId === userId && s.state === 'approved' && s.pointsAwarded)
              .reduce((sum, s) => sum + s.pointsAwarded, 0)
        : 0;
      const ledger = window.__pointsStore ? window.__pointsStore.getTotal(userId) : 0;
      return { total, baseline, delta: subDelta + ledger };
    }, [subs, userId, ledgerTick]);
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

  // Tier upgrade thresholds
  const TIER_THRESHOLDS = [
    { at: 100, key: 'builder', label: 'Exonaut Builder' },
    { at: 300, key: 'prime',   label: 'Exonaut Prime'   },
    { at: 600, key: 'elite',   label: 'Exonaut Elite'   },
    { at: 900, key: 'apex',    label: 'Exonaut Apex'    },
  ];
  if (!window.__autoTiers) window.__autoTiers = { celebratedKeys: new Set() };

  // ---- Auto-celebrate: fires onCelebrate('badge', …) for milestone badges
  // and onCelebrate('tier', …) for tier upgrades when total crosses thresholds.
  function useAutoBadgeFire(onCelebrate) {
    const { total } = useComputedPoints(ME_ID);
    React.useEffect(() => {
      if (!onCelebrate) return;
      // Badge milestones
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
      // Tier upgrades — payload.tier must be the tier key string (e.g. 'builder')
      for (const t of TIER_THRESHOLDS) {
        if (total >= t.at && !window.__autoTiers.celebratedKeys.has(t.key)) {
          window.__autoTiers.celebratedKeys.add(t.key);
          setTimeout(() => onCelebrate('tier', { tier: t.key }), 1400);
          // Persist earned tier to DB so the certificate reflects it
          if (window.__userRegistry?.updateTier && typeof ME_ID !== 'undefined' && ME_ID) {
            window.__userRegistry.updateTier(ME_ID, t.key);
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
    computePillarScores,
    usePillarScores,
    useComputedPoints,
    useComputedMilestones,
    useAutoBadgeFire,
    useLiveBadges,
  });
})();
