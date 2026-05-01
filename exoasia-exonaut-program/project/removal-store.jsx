// ============================================================================
// Removal / Resignation workflow store
//
// Two initiation paths, converging on Admin execution:
//
//   LEAD-INITIATED (removal for cause):
//     Lead endorses → 'endorsed' → Commander approves → 'approved' → Admin executes → 'executed'
//
//   EXONAUT-INITIATED (voluntary resignation):
//     Exonaut submits → 'pending' → Lead endorses → 'endorsed' → Commander approves → 'approved' → Admin executes → 'executed'
//
// At each stage the current role-holder can approve (advance) or deny (terminal).
// Exonaut can also withdraw their own pending resignation.
//
// An 'executed' request flags the user as removed; they're filtered out of
// getCohortUsers() and all roster/directory views. Persists to localStorage.
// ============================================================================

(function () {
  const KEY = 'exo:removals:v2';

  // Valid reasons — shown in Lead's endorsement form & surfaced in reviews.
  const REASONS = [
    { id: 'no-show',     label: 'No-show / Absenteeism',      desc: 'Missed 3+ consecutive rituals or standups without notice', source: 'lead' },
    { id: 'misconduct',  label: 'Code of Conduct Violation',  desc: 'Breached program integrity (plagiarism, harassment, disrespect)', source: 'lead' },
    { id: 'academic',    label: 'Performance Floor Breach',   desc: 'Points < 100 for 2+ weeks; failed remediation plan', source: 'lead' },
    { id: 'conflict',    label: 'Program Fit / Conflict',     desc: 'Irreconcilable conflict with track scope or team', source: 'lead' },
    { id: 'withdrawal',  label: 'Voluntary Withdrawal',       desc: 'Exonaut formally requested to exit the program', source: 'lead' },
    { id: 'other',       label: 'Other (explain in notes)',   desc: 'Requires detailed justification in notes field', source: 'lead' },
  ];

  // Exonaut-facing resignation reasons (lighter tone than removal reasons).
  const RESIGN_REASONS = [
    { id: 'personal',    label: 'Personal / Family',          desc: 'Health, caregiving, or personal circumstances' },
    { id: 'financial',   label: 'Financial',                  desc: 'Cannot sustain the program financially' },
    { id: 'career',      label: 'Career Opportunity',         desc: 'Received an offer I need to accept' },
    { id: 'fit',         label: 'Program Fit',                desc: 'The program is not the right fit for me' },
    { id: 'health',      label: 'Health / Wellbeing',         desc: 'Mental or physical health needs attention' },
    { id: 'other',       label: 'Other (explain)',            desc: 'Other reason — please explain in the message' },
  ];

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return { requests: Array.isArray(p.requests) ? p.requests : [] };
      }
    } catch (e) {}
    // Seed demo data spanning every workflow state so all 4 roles have something to see.
    return {
      requests: [
        // 1. Exonaut resignation awaiting Lead endorsement
        {
          id: 'rm_seed_1',
          userId: 'u5', cohortId: 'c2627', leadId: 'lead-ais',
          source: 'exonaut',
          reason: 'personal',
          notes: 'I need to step away to care for a parent who has been hospitalized. I appreciate the opportunity and hope to re-apply in a future batch.',
          status: 'pending',
          createdAt: Date.now() - 1000 * 60 * 60 * 14,
          endorsedBy: null, endorsedAt: null, endorseNote: null,
          reviewedBy: null, reviewedAt: null, reviewNote: null,
          denyNote: null,
          executedBy: null, executedAt: null,
        },
        // 2. Lead-initiated removal awaiting Commander approval
        {
          id: 'rm_seed_2',
          userId: 'u19', cohortId: 'c2627', leadId: 'lead-ais',
          source: 'lead',
          reason: 'no-show',
          notes: 'Missed 4 consecutive weekly rituals. Phone + email unreturned for 12 days. Remediation plan was ignored.',
          status: 'endorsed',
          createdAt: Date.now() - 1000 * 60 * 60 * 22,
          endorsedBy: 'lead-ais', endorsedAt: Date.now() - 1000 * 60 * 60 * 22, endorseNote: null,
          reviewedBy: null, reviewedAt: null, reviewNote: null,
          denyNote: null,
          executedBy: null, executedAt: null,
        },
        // 3. Lead-initiated, commander-approved, waiting for Admin execution
        {
          id: 'rm_seed_3',
          userId: 'u27', cohortId: 'c2627', leadId: 'lead-clim',
          source: 'lead',
          reason: 'academic',
          notes: 'Points at 78 across 3 weeks. Two remediation 1:1s with no improvement in deliverables.',
          status: 'approved',
          createdAt: Date.now() - 1000 * 60 * 60 * 72,
          endorsedBy: 'lead-clim', endorsedAt: Date.now() - 1000 * 60 * 60 * 72, endorseNote: null,
          reviewedBy: 'commander', reviewedAt: Date.now() - 1000 * 60 * 60 * 6, reviewNote: 'Approved. Please execute after exit interview.',
          denyNote: null,
          executedBy: null, executedAt: null,
        },
        // 4. Executed (historical record)
        {
          id: 'rm_seed_4',
          userId: 'u33', cohortId: 'c2627', leadId: 'lead-biotech',
          source: 'exonaut',
          reason: 'health',
          notes: 'Formally requested exit on Nov 14; family medical circumstances.',
          status: 'executed',
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
          endorsedBy: 'lead-biotech', endorsedAt: Date.now() - 1000 * 60 * 60 * 24 * 13, endorseNote: 'Endorsed. Smooth handoff of open deliverables arranged.',
          reviewedBy: 'commander', reviewedAt: Date.now() - 1000 * 60 * 60 * 24 * 13, reviewNote: null,
          denyNote: null,
          executedBy: 'admin', executedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
        },
      ],
    };
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ requests: state.requests })); } catch (e) {}
  }

  const state = loadState();
  const listeners = new Set();
  function notify() { listeners.forEach(fn => fn()); }

  const store = {
    getAll() { return state.requests.slice(); },
    byStatus(status) { return state.requests.filter(r => r.status === status); },
    byUser(userId) { return state.requests.filter(r => r.userId === userId); },
    forLead(leadId) { return state.requests.filter(r => r.leadId === leadId); },
    activeForUser(userId) {
      // Open request (any non-terminal state)
      return state.requests.find(r => r.userId === userId && r.status !== 'denied' && r.status !== 'executed');
    },
    isRemoved(userId) {
      return state.requests.some(r => r.userId === userId && r.status === 'executed');
    },

    // --- Lead-initiated removal — skips 'pending', starts at 'endorsed'
    endorseByLead({ userId, leadId, cohortId, reason, notes }) {
      if (store.activeForUser(userId)) return store.activeForUser(userId);
      const req = {
        id: 'rm_' + Math.random().toString(36).slice(2, 9),
        userId, leadId, cohortId,
        source: 'lead',
        reason: reason || 'other',
        notes: notes || '',
        status: 'endorsed',
        createdAt: Date.now(),
        endorsedBy: leadId, endorsedAt: Date.now(), endorseNote: null,
        reviewedBy: null, reviewedAt: null, reviewNote: null,
        denyNote: null,
        executedBy: null, executedAt: null,
      };
      state.requests.unshift(req);
      persist(); notify();
      return req;
    },

    // --- Exonaut-initiated resignation — starts at 'pending' (awaiting lead)
    submitByExonaut({ userId, cohortId, leadId, reason, notes }) {
      if (store.activeForUser(userId)) return store.activeForUser(userId);
      const req = {
        id: 'rm_' + Math.random().toString(36).slice(2, 9),
        userId, leadId, cohortId,
        source: 'exonaut',
        reason: reason || 'other',
        notes: notes || '',
        status: 'pending',
        createdAt: Date.now(),
        endorsedBy: null, endorsedAt: null, endorseNote: null,
        reviewedBy: null, reviewedAt: null, reviewNote: null,
        denyNote: null,
        executedBy: null, executedAt: null,
      };
      state.requests.unshift(req);
      persist(); notify();
      return req;
    },

    // --- Lead step on exonaut-submitted resignation ---
    leadEndorse(requestId, leadId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'pending') return;
      r.status = 'endorsed';
      r.endorsedBy = leadId || r.leadId;
      r.endorsedAt = Date.now();
      r.endorseNote = note || '';
      persist(); notify();
    },
    leadDeny(requestId, leadId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'pending') return;
      r.status = 'denied';
      r.reviewedBy = leadId || r.leadId;
      r.reviewedAt = Date.now();
      r.denyNote = note || '';
      persist(); notify();
    },

    // --- Commander step ---
    approve(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'endorsed') return;
      r.status = 'approved';
      r.reviewedBy = commanderId || 'commander';
      r.reviewedAt = Date.now();
      r.reviewNote = note || '';
      persist(); notify();
    },
    deny(requestId, commanderId, note) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'endorsed') return;
      r.status = 'denied';
      r.reviewedBy = commanderId || 'commander';
      r.reviewedAt = Date.now();
      r.denyNote = note || '';
      persist(); notify();
    },

    // --- Admin step ---
    execute(requestId, adminId) {
      const r = state.requests.find(x => x.id === requestId);
      if (!r || r.status !== 'approved') return;
      r.status = 'executed';
      r.executedBy = adminId || 'admin';
      r.executedAt = Date.now();
      persist(); notify();
    },

    // --- Exonaut can withdraw their own pending resignation ---
    withdrawByExonaut(requestId, userId) {
      const idx = state.requests.findIndex(x => x.id === requestId);
      if (idx === -1) return;
      const r = state.requests[idx];
      if (r.status !== 'pending' || r.userId !== userId) return;
      state.requests.splice(idx, 1);
      persist(); notify();
    },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getReasons() { return REASONS; },
    getResignReasons() { return RESIGN_REASONS; },
    reasonLabel(id) {
      const all = [...REASONS, ...RESIGN_REASONS];
      return (all.find(r => r.id === id) || {}).label || id;
    },
  };

  window.__removalStore = store;
  window.REMOVAL_REASONS = REASONS;
  window.RESIGN_REASONS = RESIGN_REASONS;

  window.useRemovals = function useRemovals() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
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
      withdrawByExonaut: store.withdrawByExonaut,
      activeForUser: store.activeForUser,
      isRemoved: store.isRemoved,
      reasonLabel: store.reasonLabel,
    };
  };

  window.isUserRemoved = function isUserRemoved(userId) { return store.isRemoved(userId); };
  window.getActiveRemovalFor = function getActiveRemovalFor(userId) { return store.activeForUser(userId); };

  // Status → display metadata helper (used by all role views)
  window.REMOVAL_STATUS_META = {
    pending:  { label: 'AWAITING MANAGER',   color: 'var(--amber)',    icon: 'fa-user-clock' },
    endorsed: { label: 'AWAITING COMMANDER', color: 'var(--lavender)', icon: 'fa-hourglass-half' },
    approved: { label: 'AWAITING ADMIN',     color: 'var(--sky)',      icon: 'fa-check-double' },
    denied:   { label: 'DENIED',             color: 'var(--off-white-40)', icon: 'fa-ban' },
    executed: { label: 'REMOVED',            color: 'var(--red)',      icon: 'fa-user-slash' },
  };
})();
