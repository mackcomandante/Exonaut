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

  const EMPTY_BADGES = [];
  const badgeState = { byUser: {}, loadedUsers: new Set(), catalogLoaded: false, listeners: new Set() };

  function notifyBadges() {
    badgeState.listeners.forEach(fn => fn());
  }

  function fromBadgeRow(row) {
    return {
      code: row.badge_code,
      name: row.badge_name,
      category: row.category,
      source: row.source || 'system',
      earned: true,
      date: row.earned_at ? new Date(row.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : 'EARNED',
      earnedAt: row.earned_at,
      metadata: row.metadata || {},
    };
  }

  function fromCatalogRow(row) {
    return {
      code: row.code,
      name: row.name,
      subtitle: row.subtitle || '',
      category: row.category,
      color: row.color || '#C9F24A',
      earned: false,
      certificate: !!row.certificate,
      triggerType: row.trigger_type || 'manual',
      threshold: row.threshold || null,
      description: row.description || '',
    };
  }

  function toCatalogRow(b, index) {
    const threshold = Number((b.subtitle || '').match(/\d+/)?.[0] || 0) || null;
    return {
      code: b.code,
      name: b.name,
      subtitle: b.subtitle || '',
      category: b.category || 'special',
      color: b.color || null,
      certificate: b.category === 'milestone' || b.category === 'track',
      trigger_type: b.category === 'milestone' || b.category === 'track' ? 'automatic' : 'manual',
      threshold,
      description: b.description || '',
      sort_order: index,
      active: true,
    };
  }

  async function currentUserId() {
    if (!window.__db || !window.__db.auth) return null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || null;
  }

  async function refreshUserBadges(userId = ME_ID) {
    if (!userId || !window.__db) return [];
    const { data, error } = await window.__db
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    if (error) {
      console.warn('Could not load user badges:', error.message || error);
      return badgeState.byUser[userId] || [];
    }
    badgeState.byUser[userId] = (data || []).map(fromBadgeRow);
    badgeState.loadedUsers.add(userId);
    notifyBadges();
    return badgeState.byUser[userId];
  }

  async function refreshBadgeCatalog() {
    if (!window.__db || badgeState.catalogLoaded) return BADGES;
    const { data, error } = await window.__db
      .from('badge_catalog')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      console.warn('Could not load badge catalog:', error.message || error);
      return BADGES;
    }
    badgeState.catalogLoaded = true;
    if ((data || []).length === 0 && BADGES.length) {
      const { error: seedError } = await window.__db
        .from('badge_catalog')
        .upsert(BADGES.map(toCatalogRow), { onConflict: 'code' });
      if (seedError) console.warn('Could not seed badge catalog:', seedError.message || seedError);
      return BADGES;
    }
    BADGES.splice(0, BADGES.length, ...(data || []).map(fromCatalogRow));
    notifyBadges();
    return BADGES;
  }

  async function persistUserBadge(userId, badge, source = 'system', metadata = {}) {
    if (!userId || !badge || !window.__db) return;
    const awardedBy = source === 'system' ? null : await currentUserId();
    const row = {
      user_id: userId,
      badge_code: badge.code,
      badge_name: badge.name,
      category: badge.category || 'milestone',
      source,
      metadata,
      awarded_by: awardedBy,
      earned_at: new Date().toISOString(),
    };
    const { error } = await window.__db.from('user_badges').upsert(row, { onConflict: 'user_id,badge_code' });
    if (error) console.warn('Could not save user badge:', error.message || error);
    else refreshUserBadges(userId);
  }

  function useUserBadges(userId = ME_ID) {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const fn = () => setTick(t => t + 1);
      badgeState.listeners.add(fn);
      if (!badgeState.loadedUsers.has(userId)) refreshUserBadges(userId);
      return () => badgeState.listeners.delete(fn);
    }, [userId]);
    return badgeState.byUser[userId] || EMPTY_BADGES;
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
    const remoteBadges = useUserBadges(ME_ID);
    React.useEffect(() => {
      if (!onCelebrate) return;
      for (const m of MILESTONES) {
        const alreadyEarned = remoteBadges.some(b => b.code === m.code);
        if (total >= m.at && !alreadyEarned && !window.__autoBadges.celebratedCodes.has(m.code)) {
          window.__autoBadges.celebratedCodes.add(m.code);
          const badge = BADGES.find(b => b.code === m.code);
          if (badge) {
            badge.earned = true;
            badge.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
            persistUserBadge(ME_ID, badge, 'system', { threshold: m.at });
            setTimeout(() => onCelebrate('badge', { badge }), 900);
          }
        }
      }
    }, [total, onCelebrate, remoteBadges]);
  }

  function useLiveBadges(userId = ME_ID) {
    const milestones = useComputedMilestones(userId);
    const remoteBadges = useUserBadges(userId);
    React.useEffect(() => { refreshBadgeCatalog(); }, []);
    return React.useMemo(() => BADGES.map(b => {
      const live = milestones.find(m => m.code === b.code);
      const remote = remoteBadges.find(r => r.code === b.code);
      if (remote) return { ...b, ...remote, earned: true };
      if (!live) return { ...b, earned: !!b.earned };
      return { ...b, earned: live.earned, date: live.earned ? (b.date || 'EARNED') : undefined };
    }), [milestones, remoteBadges]);
  }

  Object.assign(window, {
    MILESTONES,
    computeTotal,
    useComputedPoints,
    useComputedMilestones,
    useAutoBadgeFire,
    useLiveBadges,
    useUserBadges,
    refreshUserBadges,
    refreshBadgeCatalog,
    persistUserBadge,
  });
})();
