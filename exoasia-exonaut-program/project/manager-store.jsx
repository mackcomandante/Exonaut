// ============================================================================
// Manager store — Platform Admin creates / edits / removes Managers (Mission Leads).
// Seeded from data.js LEADS on first load, persists to localStorage, and
// re-publishes the live array as window.LEADS so every downstream reader
// (cohort-store, directives, admin assign, lead sidebars) sees updates.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:managers:v2';

  // Deep-copy the seed from data.js so our mutations don't touch the original const.
  function seedFromData() {
    const src = (typeof LEADS !== 'undefined') ? LEADS : [];
    // Seed all existing managers as belonging to the active cohort c2627.
    const activeCohorts = (typeof COHORTS !== 'undefined')
      ? COHORTS.filter(c => c.status === 'active').map(c => c.id)
      : ['c2627'];
    return src.map(l => ({
      id: l.id,
      name: l.name,
      role: l.role || 'manager',
      track: l.track,
      email: l.email || '',
      cohorts: Array.isArray(l.cohorts) && l.cohorts.length ? [...l.cohorts] : [...activeCohorts],
      reports: Array.isArray(l.reports) ? [...l.reports] : [],
      reviewQueue: l.reviewQueue ?? 0,
      avgSubmitRate: l.avgSubmitRate ?? 0,
      satisfaction: l.satisfaction ?? 0,
      custom: false,
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.managers)) {
          // Migration: ensure every manager has a `cohorts` array.
          const activeCohorts = (typeof COHORTS !== 'undefined')
            ? COHORTS.filter(c => c.status === 'active').map(c => c.id)
            : ['c2627'];
          parsed.managers.forEach(m => {
            if (!Array.isArray(m.cohorts) || m.cohorts.length === 0) {
              m.cohorts = [...activeCohorts];
            }
          });
          return parsed;
        }
      }
    } catch (e) { /* ignore */ }
    return { managers: seedFromData() };
  }

  function persist(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  const listeners = new Set();
  const state = loadState();

  // Re-publish as window.LEADS so existing code that reads LEADS.find(...) keeps working.
  // Mutations below splice in place so the published array stays the same reference.
  window.LEADS = state.managers;

  function notify() {
    // Keep window.LEADS pointing at the live array (it already does; defensive).
    window.LEADS = state.managers;
    persist(state);
    listeners.forEach(fn => fn());
  }

  function genId(track) {
    const base = 'lead-' + (track || 'new').toLowerCase();
    let id = base;
    let n = 2;
    while (state.managers.some(m => m.id === id)) {
      id = base + '-' + n++;
    }
    return id;
  }

  const store = {
    all() { return state.managers; },
    byId(id) { return state.managers.find(m => m.id === id) || null; },
    byTrack(track) { return state.managers.filter(m => m.track === track); },

    // Create a new manager. Returns the created record.
    create({ name, track, email, cohorts }) {
      const activeCohorts = (typeof COHORTS !== 'undefined')
        ? COHORTS.filter(c => c.status === 'active').map(c => c.id)
        : ['c2627'];
      const m = {
        id: genId(track),
        name: (name || '').trim() || 'New Manager',
        role: 'manager',
        track: track || '',
        email: (email || '').trim(),
        cohorts: Array.isArray(cohorts) && cohorts.length ? [...cohorts] : [...activeCohorts],
        reports: [],
        reviewQueue: 0,
        avgSubmitRate: 0,
        satisfaction: 0,
        custom: true,
      };
      state.managers.push(m);
      notify();
      return m;
    },

    // Update fields on an existing manager (name / track / email / cohorts).
    update(id, patch) {
      const m = state.managers.find(x => x.id === id);
      if (!m) return null;
      if (patch.name !== undefined)    m.name    = String(patch.name).trim() || m.name;
      if (patch.track !== undefined)   m.track   = patch.track;
      if (patch.email !== undefined)   m.email   = String(patch.email).trim();
      if (patch.cohorts !== undefined) m.cohorts = Array.isArray(patch.cohorts) ? [...patch.cohorts] : m.cohorts;
      notify();
      return m;
    },

    // Add / remove a single cohort from a manager's cohort list.
    addCohort(id, cohortId) {
      const m = state.managers.find(x => x.id === id);
      if (!m) return;
      if (!Array.isArray(m.cohorts)) m.cohorts = [];
      if (!m.cohorts.includes(cohortId)) { m.cohorts.push(cohortId); notify(); }
    },
    removeCohort(id, cohortId) {
      const m = state.managers.find(x => x.id === id);
      if (!m) return;
      if (!Array.isArray(m.cohorts)) return;
      const before = m.cohorts.length;
      m.cohorts = m.cohorts.filter(c => c !== cohortId);
      if (m.cohorts.length !== before) notify();
    },

    // Remove a manager.  Any Exonauts assigned to them via the lead-assignment
    // override are re-routed to another manager on the same track (if any) or
    // cleared to "unassigned".
    remove(id) {
      const idx = state.managers.findIndex(m => m.id === id);
      if (idx === -1) return false;
      const removed = state.managers[idx];
      state.managers.splice(idx, 1);

      // Cascade: rewire lead-assignment overrides via the cohort-store.
      const cohortStore = window.__cohortStore;
      if (cohortStore && typeof cohortStore.getLeadAssignments === 'function') {
        const assignments = cohortStore.getLeadAssignments() || {};
        const fallback = state.managers.find(m => m.track === removed.track);
        Object.keys(assignments).forEach(userId => {
          if (assignments[userId] === id) {
            cohortStore.assignUserToLead(userId, fallback ? fallback.id : '');
          }
        });
      }

      // Also rewire any Exonauts who were in removed.reports but have no
      // override — fold them into the fallback's reports so getUserLead still
      // finds them by the reports-array fallback path.
      const fallback = state.managers.find(m => m.track === removed.track);
      if (fallback) {
        removed.reports.forEach(uid => {
          if (!fallback.reports.includes(uid)) fallback.reports.push(uid);
        });
      }

      notify();
      return true;
    },

    // Assign one Exonaut to a manager.  Writes the lead-assignment override
    // in the cohort-store AND keeps the manager.reports array in sync so the
    // "fallback by reports array" path stays consistent.
    assignExonaut(userId, managerId) {
      // Clear from all manager.reports first
      state.managers.forEach(m => {
        m.reports = m.reports.filter(u => u !== userId);
      });
      const target = state.managers.find(m => m.id === managerId);
      if (target && !target.reports.includes(userId)) {
        target.reports.push(userId);
      }
      // Also write the override via cohort-store so getUserLead resolves fast.
      if (window.__cohortStore?.assignUserToLead) {
        window.__cohortStore.assignUserToLead(userId, managerId || '');
      }
      notify();
    },

    // Remove a specific exonaut from a manager's reports list (unassign).
    unassignExonaut(userId) {
      state.managers.forEach(m => {
        m.reports = m.reports.filter(u => u !== userId);
      });
      if (window.__cohortStore?.assignUserToLead) {
        window.__cohortStore.assignUserToLead(userId, '');
      }
      notify();
    },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.__managerStore = store;

  window.useManagers = function useManagers() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      managers: store.all(),
      byId: store.byId,
      byTrack: store.byTrack,
      create: store.create,
      update: store.update,
      remove: store.remove,
      addCohort: store.addCohort,
      removeCohort: store.removeCohort,
      assignExonaut: store.assignExonaut,
      unassignExonaut: store.unassignExonaut,
    };
  };
})();
