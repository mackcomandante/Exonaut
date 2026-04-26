// ============================================================================
// User Registry — stores self-registered users in Supabase (registered_users).
// Seed CREDENTIALS (data.js) remain read-only; this store handles sign-ups.
// Admin can promote roles here.
// ============================================================================

(function () {
  const ROLE_ROUTES = {
    exonaut:   'dashboard',
    lead:      'lead-home',
    commander: 'cmdr-home',
    admin:     'pa-cohorts',
  };

  function toClient(row) {
    if (!row) return null;
    return {
      userId:    row.user_id,
      name:      row.name,
      email:     row.email,
      password:  row.password,
      role:      row.role,
      leadId:    row.lead_id,
      cohortId:  row.cohort_id  || null,        // assigned by Admin after signup
      tier:      row.tier       || 'entry',    // persisted tier (for display)
      homeRoute: row.home_route,
      createdAt: row.created_at,
    };
  }

  window.__userRegistry = {
    async getAll() {
      const { data, error } = await window.__db
        .from('registered_users')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) { console.error('getAll:', error); return []; }
      return (data || []).map(toClient);
    },

    async find(email) {
      const { data } = await window.__db
        .from('registered_users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      return toClient(data);
    },

    async emailTaken(email) {
      const e = email.trim().toLowerCase();
      if (CREDENTIALS[e]) return true;
      const { data } = await window.__db
        .from('registered_users')
        .select('user_id')
        .eq('email', e)
        .maybeSingle();
      return !!data;
    },

    async register({ name, email, password }) {
      // 1. Create Supabase Auth user — triggers verification email
      const { data: authData, error: authError } = await window.__db.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: 'https://exonaut.exoasia.org' },
      });
      if (authError) throw authError;

      // 2. Insert profile row using the Supabase Auth UUID.
      // Only insert columns that are guaranteed to exist.
      // cohort_id, track — assigned by Admin after signup (not inserted here).
      const userId = authData.user.id;
      const row = {
        user_id: userId,
        name:    name.trim(),
        email:   email.trim().toLowerCase(),
        password,
        role:    'exonaut',
      };

      // Attempt insert; if optional columns are missing in schema just skip them
      let { error: dbError } = await window.__db.from('registered_users').insert(row);

      // If the slim insert also fails, surface the real error
      if (dbError) throw dbError;

      return toClient({
        ...row,
        lead_id:    null,
        tier:       'entry',
        home_route: 'dashboard',
        created_at: new Date().toISOString(),
      });
    },

    async updateRole(userId, role, leadId) {
      const { error } = await window.__db
        .from('registered_users')
        .update({
          role,
          lead_id:    leadId || null,
          home_route: ROLE_ROUTES[role] || 'dashboard',
        })
        .eq('user_id', userId);
      if (error) console.error('updateRole:', error);
    },

    // Called by Admin (cohort-store) when reassigning a user to a batch
    async updateCohortAssignment(userId, cohortId) {
      const { error } = await window.__db
        .from('registered_users')
        .update({ cohort_id: cohortId })
        .eq('user_id', userId);
      if (error) console.error('updateCohortAssignment:', error);
    },

    // Called by auto-score when an Exonaut's tier crosses a threshold
    async updateTier(userId, tier) {
      const { error } = await window.__db
        .from('registered_users')
        .update({ tier })
        .eq('user_id', userId);
      if (error) console.error('updateTier:', error);
    },

    async remove(userId) {
      const { error } = await window.__db
        .from('registered_users')
        .delete()
        .eq('user_id', userId);
      if (error) console.error('remove:', error);
    },
  };

  window.useRegisteredUsers = function useRegisteredUsers() {
    const [users, setUsers] = React.useState([]);
    React.useEffect(() => {
      window.__userRegistry.getAll().then(setUsers);
      const channel = window.__db
        .channel('registered_users_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registered_users' }, () => {
          window.__userRegistry.getAll().then(setUsers);
        })
        .subscribe();
      return () => window.__db.removeChannel(channel);
    }, []);
    return users;
  };
})();
