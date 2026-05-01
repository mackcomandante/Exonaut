// ============================================================================
// Cohort store — Commander-scoped cohort filter.
// Persists selected cohort id + user-created cohorts to localStorage.
// Seeded from data.js COHORTS.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:cohort-store:v1';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          selectedId: parsed.selectedId || 'c2627',
          createdCohorts: Array.isArray(parsed.createdCohorts) ? parsed.createdCohorts : [],
          assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {},
          trackAssignments: parsed.trackAssignments && typeof parsed.trackAssignments === 'object' ? parsed.trackAssignments : {},
          leadAssignments: parsed.leadAssignments && typeof parsed.leadAssignments === 'object' ? parsed.leadAssignments : {},
        };
      }
    } catch (e) { /* ignore */ }
    return { selectedId: 'c2627', createdCohorts: [], assignments: {}, trackAssignments: {}, leadAssignments: {} };
  }

  function persist(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  const listeners = new Set();
  const state = loadState();

  function notify() { listeners.forEach(fn => fn()); }

  const store = {
    // Get every known cohort — seeds from data.js + user-created ones
    getAll() {
      const seed = (typeof COHORTS !== 'undefined') ? COHORTS : [];
      return [...seed, ...state.createdCohorts];
    },
    getSelected() {
      return store.getAll().find(c => c.id === state.selectedId) || store.getAll()[0];
    },
    getSelectedId() { return state.selectedId; },
    setSelected(id) {
      if (state.selectedId === id) return;
      state.selectedId = id;
      persist(state);
      notify();
    },
    createCohort({ name, code, start, end }) {
      const id = 'c' + Date.now().toString(36);
      const cohort = {
        id, name, code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, '-'),
        status: 'upcoming',
        start: start || '',
        end: end || '',
        color: '#C9E500',
        custom: true,
      };
      state.createdCohorts.push(cohort);
      state.selectedId = id;  // auto-select newly created
      persist(state);
      notify();
      return cohort;
    },
    deleteCohort(id) {
      const idx = state.createdCohorts.findIndex(c => c.id === id);
      if (idx === -1) return;
      state.createdCohorts.splice(idx, 1);
      if (state.selectedId === id) state.selectedId = 'c2627';
      persist(state);
      notify();
    },
    // Assignment overrides — Platform Admin can move Exonauts between cohorts.
    // Stored as { [userId]: cohortId }. Falls back to user.cohort from data.js.
    assignUserToCohort(userId, cohortId) {
      if (!state.assignments) state.assignments = {};
      state.assignments[userId] = cohortId;
      persist(state);
      notify();
    },
    getAssignments() { return state.assignments || {}; },
    // Track assignment overrides — { [userId]: trackCode }
    assignUserToTrack(userId, trackCode) {
      if (!state.trackAssignments) state.trackAssignments = {};
      state.trackAssignments[userId] = trackCode;
      persist(state);
      notify();
    },
    getTrackAssignments() { return state.trackAssignments || {}; },
    // Manager (Lead) assignment overrides — { [userId]: leadId }
    assignUserToLead(userId, leadId) {
      if (!state.leadAssignments) state.leadAssignments = {};
      state.leadAssignments[userId] = leadId;
      persist(state);
      notify();
    },
    getLeadAssignments() { return state.leadAssignments || {}; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.__cohortStore = store;

  // React hook — returns [selectedCohort, allCohorts, api]
  window.useCohort = function useCohort() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      cohort: store.getSelected(),
      cohortId: store.getSelectedId(),
      all: store.getAll(),
      setSelected: store.setSelected,
      createCohort: store.createCohort,
      deleteCohort: store.deleteCohort,
      assignUserToCohort: store.assignUserToCohort,
      getAssignments: store.getAssignments,
      assignUserToTrack: store.assignUserToTrack,
      getTrackAssignments: store.getTrackAssignments,
      assignUserToLead: store.assignUserToLead,
      getLeadAssignments: store.getLeadAssignments,
    };
  };

  window.getUserTrack = function getUserTrack(userId) {
    const t = (state.trackAssignments || {})[userId];
    if (t) return t;
    const u = (typeof USERS !== 'undefined') ? USERS.find(x => x.id === userId) : null;
    return u?.track || '';
  };

  window.getUserLead = function getUserLead(userId) {
    const overrideLeadId = (state.leadAssignments || {})[userId];
    if (overrideLeadId) {
      return (typeof LEADS !== 'undefined') ? LEADS.find(l => l.id === overrideLeadId) : null;
    }
    // Fall back: find lead whose reports includes this user
    if (typeof LEADS === 'undefined') return null;
    return LEADS.find(l => l.reports.includes(userId)) || null;
  };

  // Helper — users for the selected cohort (honors assignment overrides, filters removed)
  window.getCohortUsers = function getCohortUsers(cohortId) {
    if (typeof USERS === 'undefined') return [];
    const id = cohortId || store.getSelectedId();
    const assignments = state.assignments || {};
    const removed = (typeof window.isUserRemoved === 'function') ? window.isUserRemoved : () => false;
    return USERS.filter(u =>
      (assignments[u.id] || u.cohort || 'c2627') === id && !removed(u.id)
    );
  };
  window.getUserCohort = function getUserCohort(userId) {
    const assignments = state.assignments || {};
    if (assignments[userId]) return assignments[userId];
    const u = (typeof USERS !== 'undefined') ? USERS.find(x => x.id === userId) : null;
    return u?.cohort || 'c2627';
  };
})();
