// Manual activity credit store. Writes an audit row and a point_ledger entry.
(function () {
  if (window.__manualCreditStore) return;

  const STORE_KEY = 'exo:manual-credits:v1';
  const listeners = new Set();
  const state = { credits: [], loaded: false, error: '' };

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persistLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.credits)); } catch {}
  }

  function notify() {
    persistLocal();
    listeners.forEach(fn => fn());
  }

  function genId() {
    return 'mcredit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  async function actorId() {
    if (!window.__db?.auth) return localStorage.getItem('exo:userId') || null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || localStorage.getItem('exo:userId') || null;
  }

  function fromRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      cohortId: row.cohort_id || 'c2627',
      trackCode: row.track_code || '',
      activityType: row.activity_type || 'manual',
      relatedId: row.related_id || '',
      relatedLabel: row.related_label || '',
      grade: row.grade || 'approved',
      points: Number(row.points) || 0,
      pillar: row.pillar || 'missions',
      evidenceNote: row.evidence_note || '',
      proofUrl: row.proof_url || '',
      pointLedgerId: row.point_ledger_id || '',
      creditedBy: row.credited_by || '',
      creditedAt: row.credited_at || row.created_at,
      metadata: row.metadata || {},
    };
  }

  function toRow(credit) {
    return {
      id: credit.id,
      user_id: credit.userId,
      cohort_id: credit.cohortId || 'c2627',
      track_code: credit.trackCode || null,
      activity_type: credit.activityType || 'manual',
      related_id: credit.relatedId || null,
      related_label: credit.relatedLabel || null,
      grade: credit.grade || 'approved',
      points: Number(credit.points) || 0,
      pillar: credit.pillar || 'missions',
      evidence_note: credit.evidenceNote || '',
      proof_url: credit.proofUrl || null,
      point_ledger_id: credit.pointLedgerId || null,
      credited_by: credit.creditedBy || null,
      credited_at: credit.creditedAt || new Date().toISOString(),
      metadata: credit.metadata || {},
    };
  }

  function duplicateOf(draft) {
    const noteKey = String(draft.evidenceNote || '').trim().toLowerCase().slice(0, 120);
    return state.credits.find(c =>
      c.userId === draft.userId &&
      (c.cohortId || 'c2627') === (draft.cohortId || 'c2627') &&
      c.activityType === draft.activityType &&
      String(c.relatedId || '') === String(draft.relatedId || '') &&
      String(c.evidenceNote || '').trim().toLowerCase().slice(0, 120) === noteKey
    );
  }

  async function refresh() {
    if (!window.__db) {
      state.loaded = true;
      notify();
      return state.credits;
    }
    const { data, error } = await window.__db
      .from('manual_activity_credits')
      .select('*')
      .order('credited_at', { ascending: false });
    if (error) {
      console.warn('Could not load manual credits:', error.message || error);
      state.loaded = true;
      state.error = error.message || 'Could not load manual credits.';
      notify();
      return state.credits;
    }
    state.credits = (data || []).map(fromRow);
    state.loaded = true;
    state.error = '';
    notify();
    return state.credits;
  }

  const store = {
    all() { return [...state.credits].sort((a, b) => new Date(b.creditedAt || 0) - new Date(a.creditedAt || 0)); },
    forUser(userId) { return store.all().filter(c => c.userId === userId); },
    duplicateOf,
    async create(data, options = {}) {
      if (window.__db) await refresh();
      const existing = duplicateOf(data);
      if (existing && !options.allowDuplicate) {
        const err = new Error('This looks like a duplicate manual credit.');
        err.duplicate = existing;
        throw err;
      }

      const creditedBy = await actorId();
      const creditId = data.id || genId();
      const ledgerId = data.pointLedgerId || 'pts-manual-' + creditId;
      const credit = {
        id: creditId,
        userId: data.userId,
        cohortId: data.cohortId || 'c2627',
        trackCode: data.trackCode || '',
        activityType: data.activityType || 'manual',
        relatedId: data.relatedId || '',
        relatedLabel: data.relatedLabel || '',
        grade: data.grade || 'approved',
        points: Number(data.points) || 0,
        pillar: data.pillar || 'missions',
        evidenceNote: String(data.evidenceNote || '').trim(),
        proofUrl: String(data.proofUrl || '').trim(),
        pointLedgerId: ledgerId,
        creditedBy,
        creditedAt: new Date().toISOString(),
        metadata: {
          ...(data.metadata || {}),
          actorRole: data.actorRole || null,
          actorTrackCode: data.actorTrackCode || null,
        },
      };

      if (!credit.userId) throw new Error('Choose an Exonaut.');
      if (!credit.evidenceNote) throw new Error('Add an evidence/source note.');
      if (!Number.isFinite(credit.points) || credit.points <= 0) throw new Error('Points must be greater than zero.');

      if (window.__db) {
        const { error } = await window.__db.from('manual_activity_credits').insert(toRow(credit));
        if (error) {
          console.warn('Could not save manual credit audit:', error.message || error);
          if ((error.message || '').includes('row-level security')) {
            throw new Error('You can only grant manual credit for Exonauts inside your authorized track.');
          }
          throw error;
        }
      }

      const ledgerEntry = await window.__pointsStore.award({
        id: ledgerId,
        userId: credit.userId,
        sourceType: 'manual',
        sourceId: credit.id,
        cohortId: credit.cohortId,
        trackCode: credit.trackCode,
        pillar: credit.pillar,
        points: credit.points,
        note: `${credit.relatedLabel || credit.activityType} - ${credit.grade}`,
        awardedBy: creditedBy,
        awardedAt: credit.creditedAt,
      });
      credit.pointLedgerId = ledgerEntry.id;

      if (credit.activityType === 'track_task' && credit.relatedId && window.upsertManualApprovedSubmission) {
        try {
          await window.upsertManualApprovedSubmission({
            id: 'manual-sub-' + credit.id,
            missionId: credit.relatedId,
            missionTitle: credit.relatedLabel || credit.relatedId,
            exonautId: credit.userId,
            grade: credit.grade,
            feedback: credit.evidenceNote,
            pointsAwarded: credit.points,
            gradedBy: creditedBy,
            gradedAt: credit.creditedAt,
          });
        } catch (err) {
          console.warn('Manual credit saved, but could not sync completed mission state:', err.message || err);
        }
      }

      state.credits.unshift(credit);
      notify();
      if (window.__db) refresh();

      if (window.__notifStore) {
        window.__notifStore.add({
          toUserId: credit.userId,
          type: 'manual-credit',
          title: `+${credit.points} manual credit awarded`,
          sub: `${credit.relatedLabel || credit.activityType} - ${credit.grade}`,
          icon: 'fa-clipboard-check',
          share: {
            kind: 'citation',
            payload: {
              id: 'CIT-' + credit.id,
              title: credit.relatedLabel || 'Manual Activity Credit',
              grade: credit.grade,
              pointsAwarded: credit.points,
              color: '#C9F24A',
              feedback: credit.evidenceNote,
            },
          },
          metadata: { manualCreditId: credit.id, pointLedgerId: credit.pointLedgerId },
        });
      }

      return credit;
    },
    refresh,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  state.credits = loadLocal().map(c => ({ ...c }));
  window.__manualCreditStore = store;

  window.useManualCredits = function useManualCredits() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = store.subscribe(() => setTick(t => t + 1));
      if (!state.loaded) store.refresh();
      return unsub;
    }, []);
    return {
      credits: store.all(),
      loaded: state.loaded,
      error: state.error,
      create: store.create,
      duplicateOf: store.duplicateOf,
      refresh: store.refresh,
    };
  };
})();
