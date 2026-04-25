// ============================================================================
// User Registry — stores all self-registered users in localStorage.
// Seed CREDENTIALS (data.js) remain read-only; this store handles everyone
// who signs up through the UI. Admin can promote roles here.
// ============================================================================

(function () {
  const KEY = 'exo:registered-users:v1';
  const listeners = new Set();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }

  function save(users) {
    try { localStorage.setItem(KEY, JSON.stringify(users)); } catch {}
    listeners.forEach(fn => fn());
  }

  const ROLE_ROUTES = {
    exonaut:   'dashboard',
    lead:      'lead-home',
    commander: 'cmdr-home',
    admin:     'pa-cohorts',
  };

  window.__userRegistry = {
    getAll() { return load(); },

    find(email) {
      return load().find(u => u.email === email.trim().toLowerCase()) || null;
    },

    emailTaken(email) {
      const e = email.trim().toLowerCase();
      return !!(CREDENTIALS[e] || this.find(e));
    },

    register({ name, email, password }) {
      const users = load();
      const userId = 'reg-' + Date.now();
      const entry = {
        userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'exonaut',
        leadId: null,
        homeRoute: 'dashboard',
        createdAt: new Date().toISOString(),
      };
      users.push(entry);
      save(users);
      return entry;
    },

    // role: 'exonaut' | 'lead' | 'commander' | 'admin'
    // leadId: LEADS entry id — required when role === 'lead'
    updateRole(userId, role, leadId) {
      const users = load();
      const idx = users.findIndex(u => u.userId === userId);
      if (idx < 0) return;
      users[idx].role = role;
      users[idx].leadId = leadId || null;
      users[idx].homeRoute = ROLE_ROUTES[role] || 'dashboard';
      save(users);
    },

    remove(userId) {
      save(load().filter(u => u.userId !== userId));
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  // React hook — re-renders whenever registry changes
  window.useRegisteredUsers = function useRegisteredUsers() {
    const [users, setUsers] = React.useState(() => window.__userRegistry.getAll());
    React.useEffect(
      () => window.__userRegistry.subscribe(() => setUsers(window.__userRegistry.getAll())),
      []
    );
    return users;
  };
})();
