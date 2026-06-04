// ============================================================================
// Cohort store — Commander-scoped cohort filter.
// Persists selected cohort id + user-created cohorts to localStorage.
// Seeded from data.js COHORTS.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:cohort-store:v1';
  const DEFAULT_HIDDEN_COHORT_IDS = new Set(['c2526', 'c2425']);

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          selectedId: parsed.selectedId || 'c2627',
          createdCohorts: Array.isArray(parsed.createdCohorts) ? parsed.createdCohorts : [],
          assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {},
          unassignedUsers: Array.isArray(parsed.unassignedUsers) ? parsed.unassignedUsers : [],
          trackAssignments: parsed.trackAssignments && typeof parsed.trackAssignments === 'object' ? parsed.trackAssignments : {},
          leadAssignments: parsed.leadAssignments && typeof parsed.leadAssignments === 'object' ? parsed.leadAssignments : {},
          cohortPatches: parsed.cohortPatches && typeof parsed.cohortPatches === 'object' ? parsed.cohortPatches : {},
          remoteCohorts: Array.isArray(parsed.remoteCohorts) ? parsed.remoteCohorts : [],
        };
      }
    } catch (e) { /* ignore */ }
    return { selectedId: 'c2627', createdCohorts: [], assignments: {}, unassignedUsers: [], trackAssignments: {}, leadAssignments: {}, cohortPatches: {}, remoteCohorts: [] };
  }

  function persist(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  const listeners = new Set();
  const state = loadState();

  function notify() { listeners.forEach(fn => fn()); }

  async function currentUserId() {
    if (!window.__db || !window.__db.auth) return null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || null;
  }

  function fromRemoteCohort(row) {
    return {
      id: row.id,
      name: row.name,
      code: row.code || '',
      status: row.status || 'upcoming',
      start: row.start_date || '',
      end: row.end_date || '',
      color: row.color || '#C9E500',
      custom: row.custom !== false,
      hidden: !!row.hidden,
    };
  }

  function toRemoteCohort(cohort, createdBy) {
    return {
      id: cohort.id,
      name: cohort.name,
      code: cohort.code || null,
      status: cohort.status || 'upcoming',
      start_date: cohort.start || null,
      end_date: cohort.end || null,
      color: cohort.color || '#C9E500',
      custom: cohort.custom !== false,
      hidden: !!cohort.hidden,
      created_by: createdBy || null,
    };
  }

  async function saveCohortRemote(cohort) {
    if (!window.__db) return;
    const createdBy = await currentUserId();
    const { error } = await window.__db
      .from('cohorts')
      .upsert(toRemoteCohort(cohort, createdBy), { onConflict: 'id' });
    if (error) console.warn('Could not sync cohort:', error.message || error);
  }

  async function deleteCohortRemote(id) {
    if (!window.__db) return;
    const { error } = await window.__db.from('cohorts').delete().eq('id', id);
    if (error) console.warn('Could not delete cohort remotely:', error.message || error);
  }

  async function hideSeedCohortRemote(cohort) {
    if (!window.__db || !cohort?.id) return;
    await saveCohortRemote({ ...cohort, custom: false, hidden: true });
  }

  async function renameCohortRemote(oldId, cohort, affectedUserIds) {
    if (!window.__db || !oldId || !cohort?.id || oldId === cohort.id) return;
    const createdBy = await currentUserId();
    const payload = toRemoteCohort(cohort, createdBy);
    const rpc = await window.__db.rpc('rename_cohort_id', {
      old_cohort_id: oldId,
      new_cohort_id: cohort.id,
      new_name: cohort.name,
      new_code: cohort.code || null,
      new_start_date: cohort.start || null,
      new_end_date: cohort.end || null,
    });
    if (!rpc.error) return;

    console.warn('Could not rename cohort via RPC, falling back to client updates:', rpc.error.message || rpc.error);
    const { error: upsertError } = await window.__db.from('cohorts').upsert(payload, { onConflict: 'id' });
    if (upsertError) console.warn('Could not save renamed cohort:', upsertError.message || upsertError);
    const userIds = Array.isArray(affectedUserIds) ? affectedUserIds : [];
    if (userIds.length) {
      const { error: profileError } = await window.__db.from('user_profiles').update({ cohort_id: cohort.id }).in('id', userIds);
      if (profileError) console.warn('Could not update renamed cohort users:', profileError.message || profileError);
    }
    const { error: assignmentError } = await window.__db
      .from('admin_user_cohort_assignments')
      .update({ cohort_id: cohort.id, updated_at: new Date().toISOString() })
      .eq('cohort_id', oldId);
    if (assignmentError) console.warn('Could not update cohort assignments:', assignmentError.message || assignmentError);
    await deleteCohortRemote(oldId);
  }

  async function refreshCohortsRemote() {
    if (!window.__db) return;
    const { data, error } = await window.__db
      .from('cohorts')
      .select('id, name, code, status, start_date, end_date, color, custom, hidden')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Could not load cohorts:', error.message || error);
      return;
    }
    state.remoteCohorts = (data || []).map(fromRemoteCohort);
    persist(state);
    notify();
  }

  async function saveAssignmentRemote(userId, cohortId, unassigned) {
    if (!window.__db) return;
    const updatedBy = await currentUserId();
    const { error } = await window.__db
      .from('admin_user_cohort_assignments')
      .upsert({
        user_id: userId,
        cohort_id: cohortId || null,
        unassigned: !!unassigned,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) console.warn('Could not sync cohort assignment:', error.message || error);
  }

  async function refreshAssignmentsRemote() {
    if (!window.__db) return;
    const { data, error } = await window.__db
      .from('admin_user_cohort_assignments')
      .select('user_id, cohort_id, unassigned');
    if (error) {
      console.warn('Could not load cohort assignment overrides:', error.message || error);
      return;
    }
    state.assignments = {};
    state.unassignedUsers = [];
    (data || []).forEach(row => {
      if (row.unassigned) state.unassignedUsers.push(row.user_id);
      else if (row.cohort_id) state.assignments[row.user_id] = row.cohort_id;
    });
    persist(state);
    notify();
  }

  const store = {
    // Get every known cohort — seeds from data.js + user-created ones
    getAll() {
      const seed = (typeof COHORTS !== 'undefined') ? COHORTS : [];
      const patches = state.cohortPatches || {};
      const byId = new Map();
      const remoteHidden = new Set([
        ...DEFAULT_HIDDEN_COHORT_IDS,
        ...(state.remoteCohorts || []).filter(c => c.hidden).map(c => c.id),
      ]);
      seed.forEach(c => {
        if (c.hidden || patches[c.id]?.hidden || remoteHidden.has(c.id)) return;
        byId.set(c.id, { ...c, ...(patches[c.id] || {}) });
      });
      (state.createdCohorts || []).forEach(c => {
        if (c.hidden || patches[c.id]?.hidden || remoteHidden.has(c.id)) return;
        byId.set(c.id, { ...c, ...(patches[c.id] || {}) });
      });
      (state.remoteCohorts || []).forEach(c => {
        if (c.hidden || patches[c.id]?.hidden || remoteHidden.has(c.id)) {
          byId.delete(c.id);
          return;
        }
        byId.set(c.id, { ...(byId.get(c.id) || {}), ...c, ...(patches[c.id] || {}) });
      });
      return Array.from(byId.values());
    },
    getById(id) {
      return store.getAll().find(c => c.id === id) || null;
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
    createCohort({ id: requestedId, name, code, start, end }) {
      const id = (requestedId || ('c' + Date.now().toString(36))).trim();
      if (!id) throw new Error('Cohort ID is required.');
      if (store.getAll().some(c => c.id === id)) throw new Error('That cohort ID already exists.');
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
      saveCohortRemote(cohort);
      return cohort;
    },
    deleteCohort(id) {
      const cohort = store.getAll().find(c => c.id === id);
      const idx = state.createdCohorts.findIndex(c => c.id === id);
      if (idx !== -1) state.createdCohorts.splice(idx, 1);
      state.remoteCohorts = (state.remoteCohorts || []).filter(c => c.id !== id);
      if (!state.cohortPatches) state.cohortPatches = {};
      if (cohort && idx === -1) state.cohortPatches[id] = { ...(state.cohortPatches[id] || {}), hidden: true };
      else delete state.cohortPatches[id];
      if (!state.unassignedUsers) state.unassignedUsers = [];
      Object.keys(state.assignments || {}).forEach(userId => {
        if (state.assignments[userId] === id) {
          delete state.assignments[userId];
          if (!state.unassignedUsers.includes(userId)) state.unassignedUsers.push(userId);
        }
      });
      if (state.selectedId === id) {
        const fallback = store.getAll().find(c => c.id !== id);
        state.selectedId = fallback?.id || '';
      }
      persist(state);
      notify();
      if (cohort && idx === -1) hideSeedCohortRemote(cohort);
      else deleteCohortRemote(id);
    },
    updateCohort(id, patch) {
      const nextId = (patch.id || id || '').trim();
      if (!nextId) throw new Error('Cohort ID is required.');
      if (nextId !== id && store.getAll().some(c => c.id === nextId)) throw new Error('That cohort ID already exists.');
      const cleanPatch = {
        id: nextId,
        ...(Object.prototype.hasOwnProperty.call(patch, 'name') ? { name: patch.name || '' } : {}),
        ...(Object.prototype.hasOwnProperty.call(patch, 'code') ? { code: patch.code || '' } : {}),
        start: patch.start || '',
        end: patch.end || '',
      };
      const affectedUserIds = [];
      if (nextId !== id && typeof USERS !== 'undefined') {
        USERS.forEach(u => {
          if ((state.assignments?.[u.id] || u.cohort || 'c2627') === id && !(state.unassignedUsers || []).includes(u.id)) {
            affectedUserIds.push(u.id);
            state.assignments[u.id] = nextId;
          }
        });
      }
      const idx = state.createdCohorts.findIndex(c => c.id === id);
      if (idx !== -1) {
        state.createdCohorts[idx] = { ...state.createdCohorts[idx], ...cleanPatch };
      } else if ((state.remoteCohorts || []).some(c => c.id === id)) {
        state.remoteCohorts = state.remoteCohorts.map(c => c.id === id ? { ...c, ...cleanPatch } : c);
      } else {
        if (!state.cohortPatches) state.cohortPatches = {};
        if (nextId !== id && state.cohortPatches[id]) {
          state.cohortPatches[nextId] = { ...(state.cohortPatches[id] || {}), ...cleanPatch };
          state.cohortPatches[id] = { hidden: true };
        } else {
          state.cohortPatches[nextId] = { ...(state.cohortPatches[nextId] || {}), ...cleanPatch };
          if (nextId !== id) state.cohortPatches[id] = { hidden: true };
        }
      }
      if (nextId !== id) {
        if (!state.cohortPatches) state.cohortPatches = {};
        state.cohortPatches[id] = { ...(state.cohortPatches[id] || {}), hidden: true };
        Object.keys(state.assignments || {}).forEach(userId => {
          if (state.assignments[userId] === id) state.assignments[userId] = nextId;
        });
        if (state.selectedId === id) state.selectedId = nextId;
      }
      persist(state);
      notify();
      const updated = store.getAll().find(c => c.id === nextId);
      if (updated) {
        if (nextId !== id) renameCohortRemote(id, updated, affectedUserIds);
        else saveCohortRemote(updated);
      }
      return updated;
    },
    // Assignment overrides — Platform Admin can move Exonauts between cohorts.
    // Stored as { [userId]: cohortId }. Falls back to user.cohort from data.js.
    assignUserToCohort(userId, cohortId) {
      if (!state.assignments) state.assignments = {};
      if (!state.unassignedUsers) state.unassignedUsers = [];
      state.unassignedUsers = state.unassignedUsers.filter(id => id !== userId);
      state.assignments[userId] = cohortId;
      persist(state);
      notify();
      saveAssignmentRemote(userId, cohortId, false);
    },
    unassignUserFromCohort(userId) {
      if (!state.assignments) state.assignments = {};
      if (!state.unassignedUsers) state.unassignedUsers = [];
      delete state.assignments[userId];
      if (!state.unassignedUsers.includes(userId)) state.unassignedUsers.push(userId);
      persist(state);
      notify();
      saveAssignmentRemote(userId, null, true);
    },
    isUserUnassigned(userId) {
      return (state.unassignedUsers || []).includes(userId);
    },
    getUnassignedUsers() {
      return state.unassignedUsers || [];
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
    refreshCohortsRemote,
    refreshAssignmentsRemote,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.__cohortStore = store;

  function activeCohort(profile) {
    const assignedId = profile?.id ? (state.assignments || {})[profile.id] : '';
    const id = assignedId || profile?.cohortId || (typeof ME !== 'undefined' ? ME.cohort : '') || store.getSelectedId() || 'c2627';
    return store.getById(id) || store.getSelected() || (typeof COHORT !== 'undefined' ? COHORT : null);
  }

  const DAY_MS = 86400000;
  const MONTHS = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
    dec: 11, december: 11,
  };

  function localDate(year, month, day) {
    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  function parseDate(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return localDate(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const text = String(value || '').trim();
    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return localDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    match = text.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
    if (!match) return null;
    const month = MONTHS[match[1].toLowerCase()];
    return month === undefined ? null : localDate(Number(match[3]), month, Number(match[2]));
  }

  function calendarDayNumber(date) {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  }

  function timelineFor(cohort, today = new Date()) {
    const start = parseDate(cohort?.start || cohort?.startDate);
    const end = parseDate(cohort?.end || cohort?.demoDay);
    const now = parseDate(today);
    if (!start || !end || !now || calendarDayNumber(end) < calendarDayNumber(start)) {
      return { valid: false, currentDay: 0, totalDays: 0, currentWeek: 1, totalWeeks: 0, daysToDemo: null, countdownLabel: 'SCHEDULE PENDING', status: 'pending' };
    }
    const startDay = calendarDayNumber(start);
    const endDay = calendarDayNumber(end);
    const todayDay = calendarDayNumber(now);
    const totalDays = endDay - startDay + 1;
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
    const status = todayDay < startDay ? 'upcoming' : todayDay > endDay ? 'completed' : 'active';
    const currentDay = status === 'upcoming' ? 0 : status === 'completed' ? totalDays : todayDay - startDay + 1;
    const currentWeek = Math.min(totalWeeks, Math.max(1, Math.ceil(Math.max(1, currentDay) / 7)));
    const daysToDemo = Math.max(0, endDay - todayDay);
    const countdownLabel = status === 'completed'
      ? 'PROGRAM COMPLETE'
      : daysToDemo === 0 ? 'DEMO DAY' : `${daysToDemo} DAYS TO DEMO DAY`;
    return { valid: true, start, end, currentDay, totalDays, currentWeek, totalWeeks, daysToDemo, countdownLabel, status };
  }

  function weekTotalFor(cohort) {
    const timeline = timelineFor(cohort);
    return timeline.valid ? timeline.totalWeeks : ((typeof COHORT !== 'undefined' ? COHORT.weekTotal : 12) || 12);
  }

  function weekWindowLabel(cohort, week) {
    const normalized = cohort ? { ...cohort, start: cohort.start || cohort.startDate, end: cohort.end || cohort.demoDay } : cohort;
    const start = parseDate(normalized?.start);
    const end = parseDate(normalized?.end);
    if (start && end) {
      const startDay = calendarDayNumber(start) + (Math.max(1, Number(week) || 1) - 1) * 7;
      const endDay = Math.min(calendarDayNumber(end), startDay + 6);
      const rangeStart = new Date(start);
      rangeStart.setDate(rangeStart.getDate() + (Math.max(1, Number(week) || 1) - 1) * 7);
      const rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + (endDay - startDay));
      const fmt = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      return `${fmt(rangeStart)} - ${fmt(rangeEnd)}, ${rangeEnd.getFullYear()}`;
    }
    if (window.EOW?.weekWindow) return window.EOW.weekWindow(normalized, week).label;
    return [normalized?.start, normalized?.end].filter(Boolean).join(' - ');
  }

  function demoDayFor(cohort) {
    return cohort?.end || cohort?.demoDay || (typeof COHORT !== 'undefined' ? COHORT.demoDay : '');
  }

  Object.assign(window, {
    getActiveCohort: activeCohort,
    getCohortTimeline: timelineFor,
    getCohortWeekTotal: weekTotalFor,
    getCohortWeekWindowLabel: weekWindowLabel,
    getCohortDemoDay: demoDayFor,
  });

  // React hook — returns [selectedCohort, allCohorts, api]
  window.useCohort = function useCohort() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      cohort: store.getSelected(),
      cohortId: store.getSelectedId(),
      all: store.getAll(),
      getById: store.getById,
      setSelected: store.setSelected,
      createCohort: store.createCohort,
      deleteCohort: store.deleteCohort,
      updateCohort: store.updateCohort,
      assignUserToCohort: store.assignUserToCohort,
      unassignUserFromCohort: store.unassignUserFromCohort,
      isUserUnassigned: store.isUserUnassigned,
      getUnassignedUsers: store.getUnassignedUsers,
      getAssignments: store.getAssignments,
      assignUserToTrack: store.assignUserToTrack,
      getTrackAssignments: store.getTrackAssignments,
      assignUserToLead: store.assignUserToLead,
      getLeadAssignments: store.getLeadAssignments,
      refreshCohortsRemote: store.refreshCohortsRemote,
      refreshAssignmentsRemote: store.refreshAssignmentsRemote,
    };
  };

  refreshCohortsRemote();
  refreshAssignmentsRemote();

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
    const unassigned = new Set(state.unassignedUsers || []);
    const removed = (typeof window.isUserRemoved === 'function') ? window.isUserRemoved : () => false;
    return USERS.filter(u =>
      !unassigned.has(u.id) && (assignments[u.id] || u.cohort || 'c2627') === id && !removed(u.id)
    );
  };
  window.getUserCohort = function getUserCohort(userId) {
    if ((state.unassignedUsers || []).includes(userId)) return '';
    const assignments = state.assignments || {};
    if (assignments[userId]) return assignments[userId];
    const u = (typeof USERS !== 'undefined') ? USERS.find(x => x.id === userId) : null;
    return u?.cohort || 'c2627';
  };
})();
