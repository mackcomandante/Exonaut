// Removal / resignation workflow store. Supabase is primary; localStorage is a
// fallback for offline/dev use.
(function () {
  const KEY = 'exo:removals:v2';
  const TABLE = 'removal_requests';

  const REASONS = [
    { id: 'no-show', label: 'No-show / Absenteeism', desc: 'Missed 3+ consecutive rituals or standups without notice', source: 'lead' },
    { id: 'misconduct', label: 'Code of Conduct Violation', desc: 'Breached program integrity (plagiarism, harassment, disrespect)', source: 'lead' },
    { id: 'academic', label: 'Performance Floor Breach', desc: 'Points < 100 for 2+ weeks; failed remediation plan', source: 'lead' },
    { id: 'conflict', label: 'Program Fit / Conflict', desc: 'Irreconcilable conflict with track scope or team', source: 'lead' },
    { id: 'withdrawal', label: 'Voluntary Withdrawal', desc: 'Exonaut formally requested to exit the program', source: 'lead' },
    { id: 'other', label: 'Other (explain in notes)', desc: 'Requires detailed justification in notes field', source: 'lead' },
  ];

  const RESIGN_REASONS = [
    { id: 'personal', label: 'Personal / Family', desc: 'Health, caregiving, or personal circumstances' },
    { id: 'financial', label: 'Financial', desc: 'Cannot sustain the program financially' },
    { id: 'career', label: 'Career Opportunity', desc: 'Received an offer I need to accept' },
    { id: 'fit', label: 'Program Fit', desc: 'The program is not the right fit for me' },
    { id: 'health', label: 'Health / Wellbeing', desc: 'Mental or physical health needs attention' },
    { id: 'other', label: 'Other (explain)', desc: 'Other reason - please explain in the message' },
  ];

  const BOOKING_URL = 'https://link.gamechangerfunnel.com/widget/booking/L6l6siGhUd4ras8fMWHd';

  const state = { requests: [], loaded: false };
  const listeners = new Set();

  function notify() { listeners.forEach(fn => fn()); }
  function hasDb() { return !!window.__db; }
  function nowIso() { return new Date().toISOString(); }
  function newId() {
    if (window.crypto?.randomUUID) return 'rm_' + window.crypto.randomUUID();
    return 'rm_' + Math.random().toString(36).slice(2, 11);
  }
  function parseTime(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function localRows() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Array.isArray(parsed.requests)
        ? parsed.requests.filter(r => !String(r?.id || '').startsWith('rm_seed_'))
        : [];
    } catch (e) {
      return [];
    }
  }
  function persistLocal() {
    if (hasDb()) return;
    try { localStorage.setItem(KEY, JSON.stringify({ requests: state.requests })); } catch (e) {}
  }
  function fromRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      leadId: row.lead_id,
      cohortId: row.cohort_id,
      source: row.source || 'lead',
      reason: row.reason || 'other',
      notes: row.notes || '',
      status: row.status || 'pending',
      createdAt: parseTime(row.created_at),
      endorsedBy: row.endorsed_by,
      endorsedAt: parseTime(row.endorsed_at),
      endorseNote: row.endorse_note,
      reviewedBy: row.reviewed_by,
      reviewedAt: parseTime(row.reviewed_at),
      reviewNote: row.review_note,
      denyNote: row.deny_note,
      executedBy: row.executed_by,
      executedAt: parseTime(row.executed_at),
    };
  }
  function toRow(req) {
    const iso = value => value ? new Date(value).toISOString() : null;
    return {
      id: req.id,
      user_id: req.userId,
      lead_id: req.leadId || null,
      cohort_id: req.cohortId || null,
      source: req.source || 'lead',
      reason: req.reason || 'other',
      notes: req.notes || '',
      status: req.status || 'pending',
      endorsed_by: req.endorsedBy || null,
      endorsed_at: iso(req.endorsedAt),
      endorse_note: req.endorseNote || null,
      reviewed_by: req.reviewedBy || null,
      reviewed_at: iso(req.reviewedAt),
      review_note: req.reviewNote || null,
      deny_note: req.denyNote || null,
      executed_by: req.executedBy || null,
      executed_at: iso(req.executedAt),
      created_at: iso(req.createdAt) || nowIso(),
      updated_at: nowIso(),
    };
  }
  function sortRequests() {
    state.requests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  function upsertLocal(req) {
    const idx = state.requests.findIndex(r => r.id === req.id);
    if (idx >= 0) state.requests[idx] = req;
    else state.requests.unshift(req);
    sortRequests();
    persistLocal();
    notify();
  }
  function removeLocal(id) {
    state.requests = state.requests.filter(r => r.id !== id);
    persistLocal();
    notify();
  }
  function activeForUser(userId) {
    return state.requests.find(r => r.userId === userId && r.status !== 'denied' && r.status !== 'executed');
  }
  async function persistInsert(req) {
    if (!hasDb()) return req;
    const { data, error } = await window.__db.from(TABLE).insert(toRow(req)).select('*').single();
    if (error) throw error;
    return fromRow(data);
  }
  async function persistUpdate(req) {
    if (!hasDb()) return req;
    const { data, error } = await window.__db.from(TABLE).update(toRow(req)).eq('id', req.id).select('*').single();
    if (error) throw error;
    return fromRow(data);
  }
  async function persistDelete(id) {
    if (!hasDb()) return;
    const { error } = await window.__db.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }

  const store = {
    async refresh() {
      if (!hasDb()) {
        state.requests = localRows();
        sortRequests();
        state.loaded = true;
        notify();
        return state.requests;
      }
      const { data, error } = await window.__db.from(TABLE).select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn('Could not load removal requests:', error.message || error);
        return state.requests;
      }
      state.requests = (data || []).map(fromRow);
      state.loaded = true;
      notify();
      return state.requests;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    subscribeRemote() {
      if (!hasDb()) return () => {};
      const channel = window.__db
        .channel('removal-requests-store')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => store.refresh())
        .subscribe();
      return () => {
        if (window.__db && channel) window.__db.removeChannel(channel);
      };
    },
    getAll() { return state.requests.slice(); },
    byStatus(status) { return state.requests.filter(r => r.status === status); },
    byUser(userId) { return state.requests.filter(r => r.userId === userId); },
    forLead(leadId) { return state.requests.filter(r => r.leadId === leadId); },
    activeForUser,
    isRemoved(userId) { return state.requests.some(r => r.userId === userId && r.status === 'executed'); },

    async endorseByLead({ userId, leadId, cohortId, reason, notes }) {
      const existing = activeForUser(userId);
      if (existing) return existing;
      const req = {
        id: newId(),
        userId,
        leadId,
        cohortId,
        source: 'lead',
        reason: reason || 'other',
        notes: notes || '',
        status: 'endorsed',
        createdAt: Date.now(),
        endorsedBy: leadId,
        endorsedAt: Date.now(),
        endorseNote: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        denyNote: null,
        executedBy: null,
        executedAt: null,
      };
      upsertLocal(req);
      try {
        const saved = await persistInsert(req);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },

    async submitByExonaut({ userId, cohortId, leadId, reason, notes }) {
      const existing = activeForUser(userId);
      if (existing) return existing;
      const req = {
        id: newId(),
        userId,
        leadId,
        cohortId,
        source: 'exonaut',
        reason: reason || 'other',
        notes: notes || '',
        status: 'pending',
        createdAt: Date.now(),
        endorsedBy: null,
        endorsedAt: null,
        endorseNote: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        denyNote: null,
        executedBy: null,
        executedAt: null,
      };
      upsertLocal(req);
      try {
        const saved = await persistInsert(req);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },

    async requestTurnoverPlan(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'pending') return null;
      const next = {
        ...r,
        status: 'endorsed',
        endorsedBy: commanderId || r.leadId,
        endorsedAt: Date.now(),
        reviewNote: note || '',
        denyNote: null,
      };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async closeContinuing(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'pending') return null;
      const next = {
        ...r,
        status: 'denied',
        reviewedBy: commanderId,
        reviewedAt: Date.now(),
        denyNote: note || 'Closed after Sir Mack call - continuing program.',
      };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async submitTurnoverPlan(requestId, userId, plan) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'endorsed' || r.userId !== userId) return null;
      const next = {
        ...r,
        status: 'approved',
        endorseNote: JSON.stringify({
          emailSent: !!plan.emailSent,
          handoffUserId: plan.handoffUserId || '',
          handoffName: plan.handoffName || '',
          turnoverNotes: plan.turnoverNotes || '',
          finalWorkingDate: plan.finalWorkingDate || '',
          submittedAt: nowIso(),
        }),
        denyNote: null,
      };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async requestTurnoverChanges(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'approved') return null;
      const next = {
        ...r,
        status: 'endorsed',
        reviewedBy: commanderId,
        reviewedAt: Date.now(),
        denyNote: note || 'Sir Mack requested changes to the turnover plan.',
      };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async approveFinalExit(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'approved') return null;
      const next = {
        ...r,
        status: 'executed',
        reviewedBy: commanderId,
        reviewedAt: r.reviewedAt || Date.now(),
        reviewNote: note || r.reviewNote || '',
        executedBy: commanderId,
        executedAt: Date.now(),
      };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async leadEndorse(requestId, leadId, note) {
      return store.requestTurnoverPlan(requestId, leadId, note);
    },
    async leadDeny(requestId, leadId, note) {
      return store.closeContinuing(requestId, leadId, note);
    },
    async approve(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'endorsed') return null;
      const next = { ...r, status: 'approved', reviewedBy: commanderId, reviewedAt: Date.now(), reviewNote: note || '' };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async deny(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'endorsed') return null;
      const next = { ...r, status: 'denied', reviewedBy: commanderId, reviewedAt: Date.now(), denyNote: note || '' };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async execute(requestId, adminId) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'approved') return null;
      const next = { ...r, status: 'executed', executedBy: adminId, executedAt: Date.now() };
      upsertLocal(next);
      try {
        const saved = await persistUpdate(next);
        upsertLocal(saved);
        return saved;
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    async withdrawByExonaut(requestId, userId) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'pending' || r.userId !== userId) return;
      removeLocal(requestId);
      try {
        await persistDelete(requestId);
      } catch (err) {
        if (hasDb()) await store.refresh();
        throw err;
      }
    },
    getReasons() { return REASONS; },
    getResignReasons() { return RESIGN_REASONS; },
    bookingUrl: BOOKING_URL,
    reasonLabel(id) {
      const all = [...REASONS, ...RESIGN_REASONS];
      return (all.find(r => r.id === id) || {}).label || id;
    },
  };

  state.requests = hasDb() ? [] : localRows();
  sortRequests();
  if (hasDb()) store.refresh();
  const unsubscribeRemote = store.subscribeRemote();
  window.addEventListener?.('beforeunload', unsubscribeRemote);

  window.__removalStore = store;
  window.REMOVAL_REASONS = REASONS;
  window.RESIGN_REASONS = RESIGN_REASONS;

  window.useRemovals = function useRemovals() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = store.subscribe(() => setTick(t => t + 1));
      store.refresh();
      return unsub;
    }, []);
    return {
      all: store.getAll(),
      pending: store.byStatus('pending'),
      endorsed: store.byStatus('endorsed'),
      approved: store.byStatus('approved'),
      denied: store.byStatus('denied'),
      executed: store.byStatus('executed'),
      endorseByLead: store.endorseByLead,
      submitByExonaut: store.submitByExonaut,
      leadEndorse: store.leadEndorse,
      leadDeny: store.leadDeny,
      approve: store.approve,
      deny: store.deny,
      execute: store.execute,
      requestTurnoverPlan: store.requestTurnoverPlan,
      closeContinuing: store.closeContinuing,
      submitTurnoverPlan: store.submitTurnoverPlan,
      requestTurnoverChanges: store.requestTurnoverChanges,
      approveFinalExit: store.approveFinalExit,
      bookingUrl: store.bookingUrl,
      withdrawByExonaut: store.withdrawByExonaut,
      activeForUser: store.activeForUser,
      isRemoved: store.isRemoved,
      reasonLabel: store.reasonLabel,
    };
  };

  window.isUserRemoved = userId => store.isRemoved(userId);
  window.getActiveRemovalFor = userId => store.activeForUser(userId);

  window.REMOVAL_STATUS_META = {
    pending: { label: 'AWAITING SIR MACK CALL', color: 'var(--amber)', icon: 'fa-calendar-check' },
    endorsed: { label: 'AWAITING TURNOVER PLAN', color: 'var(--lavender)', icon: 'fa-clipboard-list' },
    approved: { label: 'AWAITING FINAL SIGNAL', color: 'var(--sky)', icon: 'fa-check-double' },
    denied: { label: 'CLOSED - CONTINUING', color: 'var(--off-white-40)', icon: 'fa-circle-check' },
    executed: { label: 'FINAL EXIT APPROVED', color: 'var(--red)', icon: 'fa-user-slash' },
  };
})();
