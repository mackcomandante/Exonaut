// ============================================================================
// Platform Admin — cohort CRUD, Exonaut assignment, user directory.
// Platform-wide role; does NOT scope to a single cohort like Commander.
// ============================================================================

// -------- Admin cohort scope (separate from Commander's) --------
// 'all' = platform-wide (default), or a specific cohortId.
(function () {
  const KEY = 'exo:admin-scope:v1';
  let scope = 'all';
  try { scope = localStorage.getItem(KEY) || 'all'; } catch (e) {}
  const listeners = new Set();
  window.__adminScope = {
    get() { return scope; },
    set(v) {
      scope = v;
      try { localStorage.setItem(KEY, v); } catch (e) {}
      listeners.forEach(fn => fn());
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  window.useAdminScope = function useAdminScope() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => window.__adminScope.subscribe(() => setTick(t => t + 1)), []);
    return { scope: window.__adminScope.get(), setScope: window.__adminScope.set };
  };
})();

// -------- Admin-created tracks --------
(function () {
  const KEY = 'exo:admin-tracks:v1';
  const listeners = new Set();
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  const loadedTracks = load();
  let createdTracks = Array.isArray(loadedTracks) ? loadedTracks : (loadedTracks.createdTracks || []);
  let hiddenTrackCodes = Array.isArray(loadedTracks.hiddenTrackCodes) ? loadedTracks.hiddenTrackCodes : [];
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ createdTracks, hiddenTrackCodes })); } catch (e) {}
  }
  function syncGlobalTracks() {
    if (typeof TRACKS === 'undefined') return;
    createdTracks.forEach(track => {
      if (!TRACKS.some(t => t.code === track.code)) TRACKS.push(track);
    });
  }
  function notify() {
    syncGlobalTracks();
    listeners.forEach(fn => fn());
  }
  async function currentUserId() {
    if (!window.__db || !window.__db.auth) return null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || null;
  }
  function fromRow(row) {
    return {
      code: row.code,
      name: row.name,
      short: row.short,
      emoji: row.emoji || '',
      objective: row.objective || '',
      clientType: row.client_type || '',
      leadTitle: row.lead_title || 'Track Lead',
      trackBadge: row.track_badge || row.name,
      custom: row.custom !== false,
    };
  }
  async function refreshRemote() {
    if (!window.__db) return;
    const { data, error } = await window.__db
      .from('tracks')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Could not load admin tracks:', error.message || error);
      return;
    }
    createdTracks = (data || []).map(fromRow);
    hiddenTrackCodes = [];
    persist();
    notify();
  }
  syncGlobalTracks();
  window.__adminTrackStore = {
    all() {
      syncGlobalTracks();
      const hidden = new Set(hiddenTrackCodes);
      return (typeof TRACKS !== 'undefined' ? TRACKS : createdTracks).filter(t => !hidden.has(t.code));
    },
    custom() { return createdTracks; },
    create(data) {
      const code = (data.code || data.short || data.name || 'TRK')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || ('TRK' + Date.now().toString(36).slice(-3).toUpperCase());
      if (this.all().some(t => t.code === code)) throw new Error('Track code already exists.');
      const track = {
        code,
        name: data.name || 'New Track',
        short: data.short || code,
        emoji: data.emoji || '',
        objective: data.objective || '',
        clientType: data.clientType || '',
        leadTitle: data.leadTitle || 'Track Lead',
        trackBadge: data.trackBadge || data.name || code,
        custom: true,
      };
      createdTracks = [...createdTracks, track];
      persist();
      notify();
      if (window.__db) {
        currentUserId().then(createdBy => window.__db.from('tracks').upsert({
          code: track.code,
          name: track.name,
          short: track.short,
          emoji: track.emoji || null,
          objective: track.objective || null,
          client_type: track.clientType || null,
          lead_title: track.leadTitle || null,
          track_badge: track.trackBadge || null,
          status: 'active',
          custom: true,
          created_by: createdBy,
        }, { onConflict: 'code' }).then(({ error }) => {
          if (error) console.warn('Could not save track:', error.message || error);
          else refreshRemote();
        }));
      }
      return track;
    },
    delete(code) {
      createdTracks = createdTracks.filter(t => t.code !== code);
      if (typeof TRACKS !== 'undefined') {
        const idx = TRACKS.findIndex(t => t.code === code && t.custom);
        if (idx !== -1) TRACKS.splice(idx, 1);
      }
      if (!hiddenTrackCodes.includes(code)) hiddenTrackCodes.push(code);
      persist();
      notify();
      if (window.__db) {
        window.__db.from('tracks').update({ status: 'archived' }).eq('code', code).then(({ error }) => {
          if (error) console.warn('Could not archive track:', error.message || error);
          else refreshRemote();
        });
      }
    },
    refresh: refreshRemote,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  window.useAdminTracks = function useAdminTracks() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__adminTrackStore.subscribe(() => setTick(t => t + 1));
      window.__adminTrackStore.refresh();
      return unsub;
    }, []);
    return window.__adminTrackStore.all();
  };
  refreshRemote();
})();

// -------- Admin Cohort Filter (sidebar widget) --------
function AdminCohortFilter() {
  const { all, createCohort, deleteCohort } = useCohort();
  const { scope, setScope } = useAdminScope();
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const current = scope === 'all' ? null : all.find(c => c.id === scope);
  const totalUsers = USERS.length;
  const scopedUsers = scope === 'all' ? totalUsers : getCohortUsers(scope).length;
  const accent = scope === 'all' ? 'var(--sky)' : (current?.status === 'active' ? 'var(--lime)' : 'var(--lavender)');

  return (
    <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--off-white-07)' }}>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 8 }}>
        COHORT FILTER
      </div>

      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '10px 12px',
        background: 'var(--off-white-07)',
        border: '1px solid ' + (open ? accent : 'var(--off-white-15)'),
        borderRadius: 2, cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.12s',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, margin: 0, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scope === 'all' ? 'All Cohorts' : (current?.name || '—')}
          </div>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.06em', marginTop: 2 }}>
            {scopedUsers} EXONAUT{scopedUsers === 1 ? '' : 'S'} · {scope === 'all' ? 'PLATFORM-WIDE' : (current?.status || '').toUpperCase()}
          </div>
        </div>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--off-white-40)', fontSize: 10 }} />
      </button>

      {open && (
        <div style={{
          marginTop: 6, padding: 4,
          background: 'var(--deep-black)', border: '1px solid var(--off-white-15)', borderRadius: 2,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {/* All Cohorts option */}
          <div onClick={() => { setScope('all'); setOpen(false); }} style={{
            padding: '8px 10px', borderRadius: 2, cursor: 'pointer',
            background: scope === 'all' ? 'var(--off-white-07)' : 'transparent',
            border: '1px solid ' + (scope === 'all' ? 'var(--sky)' : 'transparent'),
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={(e) => { if (scope !== 'all') e.currentTarget.style.background = 'var(--off-white-07)'; }}
          onMouseLeave={(e) => { if (scope !== 'all') e.currentTarget.style.background = 'transparent'; }}>
            <i className="fa-solid fa-globe" style={{ fontSize: 10, color: 'var(--sky)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white)' }}>All Cohorts</div>
              <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.06em' }}>
                {totalUsers} EXONAUTS · PLATFORM-WIDE
              </div>
            </div>
            {scope === 'all' && <i className="fa-solid fa-check" style={{ fontSize: 10, color: 'var(--sky)' }} />}
          </div>

          <div style={{ height: 1, background: 'var(--off-white-07)', margin: '4px 0' }} />

          {all.map(c => {
            const count = getCohortUsers(c.id).length;
            const isActive = c.id === scope;
            const cAccent = c.status === 'active' ? 'var(--lime)' : c.status === 'upcoming' ? 'var(--sky)' : 'var(--lavender)';
            return (
              <div key={c.id}
                onClick={() => { setScope(c.id); setOpen(false); }}
                style={{
                  padding: '8px 10px', borderRadius: 2, cursor: 'pointer',
                  background: isActive ? 'var(--off-white-07)' : 'transparent',
                  border: '1px solid ' + (isActive ? cAccent : 'transparent'),
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--off-white-07)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cAccent, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.06em' }}>
                    {count} EXONAUT{count === 1 ? '' : 'S'} · {(c.status || '').toUpperCase()}
                  </div>
                </div>
                {isActive && <i className="fa-solid fa-check" style={{ fontSize: 10, color: cAccent }} />}
                {c.custom && !isActive && (
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete cohort "${c.name}"?`)) deleteCohort(c.id); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--off-white-40)', cursor: 'pointer', padding: 2, fontSize: 9 }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                )}
              </div>
            );
          })}

          <div style={{ height: 1, background: 'var(--off-white-07)', margin: '4px 0' }} />
          <div onClick={() => { setCreating(true); setOpen(false); }} style={{
            padding: '8px 10px', borderRadius: 2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sky)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(100,180,230,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
            <div className="t-mono" style={{ fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>NEW COHORT</div>
          </div>
        </div>
      )}

      {creating && <AdminCreateCohortModal onClose={() => setCreating(false)} onCreate={(data) => {
        try {
          createCohort(data);
          setCreating(false);
        } catch (err) {
          alert(err.message || 'Could not create cohort.');
        }
      }} />}
    </div>
  );
}

// -------- Platform Admin sidebar --------
function PlatformAdminSidebar({ current, onNavigate, onSignOut }) {
  const { profile } = useCurrentUserProfile();
  const displayName = profile.fullName || 'Platform Admin';
  const me = [
    { id: 'pa-profile',  label: 'My Profile',         icon: 'fa-id-badge' },
    { id: 'community',   label: 'Community',          icon: 'fa-users-rectangle' },
  ];
  const links = [
    { id: 'pa-cohorts',  label: 'Cohort Management',  icon: 'fa-layer-group' },
    { id: 'pa-missions', label: 'Track Creation',      icon: 'fa-bullseye' },
    { id: 'pa-assign',   label: 'Exonaut Assignment', icon: 'fa-user-gear' },
    { id: 'pa-managers', label: 'Track Management',   icon: 'fa-route' },
    { id: 'pa-projects', label: 'Project Builder',     icon: 'fa-diagram-project' },
    { id: 'pa-users',    label: 'User Directory',     icon: 'fa-address-book' },
    { id: 'pa-console',  label: 'System Console',     icon: 'fa-shield-halved' },
    { id: 'pa-removals', label: 'Removals',           icon: 'fa-user-slash' },
    { id: 'pa-announce', label: 'Announcements',      icon: 'fa-bullhorn' },
    { id: 'kudos',       label: 'Kudos',              icon: 'fa-hand-sparkles' },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">EXOASIA</div>
        <div className="sidebar-tag" style={{ color: 'var(--sky)' }}>PLATFORM · ADMIN</div>
      </div>
      <div className="sidebar-user" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pa-profile')} title="Open my profile">
        <AvatarWithRing name={displayName} avatarUrl={profile.avatarUrl} size={36} tier="corps" />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-tier" style={{ color: 'var(--sky)' }}>PLATFORM ADMIN</div>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="sidebar-nav-section" style={{ color: 'var(--sky)' }}>Me</div>
        {me.map(l => (
          <div key={l.id} className={'sidebar-link' + (current === l.id ? ' active' : '')} onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
          </div>
        ))}
      </nav>

      <AdminCohortFilter />

      <nav className="sidebar-nav">
        <div className="sidebar-nav-section" style={{ color: 'var(--sky)' }}>Platform</div>
        {links.map(l => (
          <div key={l.id} className={'sidebar-link' + (current === l.id ? ' active' : '')} onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button title="Notifications" onClick={() => onNavigate('notifications')}><i className="fa-solid fa-bell" /><span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--sky)' }} /></button>
        <button title="Settings" onClick={() => onNavigate('settings')}><i className="fa-solid fa-gear" /></button>
        <button title="Log out" onClick={onSignOut}><i className="fa-solid fa-right-from-bracket" /></button>
      </div>
    </aside>
  );
}

// -------- Cohort Management --------
function AdminCohorts() {
  const { all, cohortId, setSelected, createCohort, updateCohort, deleteCohort, assignUserToCohort, unassignUserFromCohort, isUserUnassigned, getAssignments } = useCohort();
  const { profiles, updateProfile } = useUserProfiles();
  const [creating, setCreating] = React.useState(false);
  const [editingCohort, setEditingCohort] = React.useState(null);
  const [selectedUsers, setSelectedUsers] = React.useState([]);
  const [targetCohort, setTargetCohort] = React.useState(cohortId || 'c2627');
  const [, setTick] = React.useState(0);
  const selectedCohort = all.find(c => c.id === cohortId) || all[0];
  const assignments = getAssignments();
  const rows = profiles.length
    ? profiles.map(p => ({
        id: p.id,
        name: p.fullName || p.email || 'User',
        role: p.role || 'exonaut',
        cohort: p.cohortId || 'c2627',
        track: p.trackCode || '',
        supabaseProfile: true,
      }))
    : USERS.map(u => ({ ...u, role: 'exonaut', cohort: getUserCohort(u.id), track: getUserTrack(u.id) }));

  function rowCohort(row) {
    if (isUserUnassigned(row.id)) return '';
    return assignments[row.id] || row.cohort || 'c2627';
  }

  const assignedRows = rows.filter(row => rowCohort(row) === selectedCohort?.id);
  const unassignedRows = rows.filter(row => !rowCohort(row));

  function toggleSelected(userId) {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  }

  async function assignSelected() {
    if (!selectedUsers.length || !targetCohort) return;
    for (const userId of selectedUsers) {
      const row = rows.find(u => u.id === userId);
      assignUserToCohort(userId, targetCohort);
      if (row?.supabaseProfile) {
        try { await updateProfile(userId, { cohortId: targetCohort }); } catch (err) { console.warn('Could not update cohort profile:', err); }
      }
    }
    setSelectedUsers([]);
    setSelected(targetCohort);
    setTick(t => t + 1);
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · COHORT MANAGEMENT
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Cohorts</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Create new batches, manage lifecycle, and retire old cohorts. {all.length} total on platform.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <i className="fa-solid fa-plus" /> NEW COHORT
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.65fr)', gap: 18, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 18 }}>
        {all.map(c => {
          const users = rows.filter(row => rowCohort(row) === c.id);
          const accent = c.status === 'active' ? 'var(--lime)' : c.status === 'upcoming' ? 'var(--sky)' : 'var(--lavender)';
          const isSelected = c.id === cohortId;
          return (
            <div key={c.id} className="card-panel" style={{
              padding: 20, borderColor: isSelected ? accent : undefined, cursor: 'pointer',
            }} onClick={() => setSelected(c.id)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="t-mono" style={{ fontSize: 9, color: accent, letterSpacing: '0.12em', fontWeight: 700 }}>
                  {(c.status || '').toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button title="Edit cohort" onClick={(e) => { e.stopPropagation(); setSelected(c.id); setEditingCohort(c); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--off-white-40)', cursor: 'pointer', fontSize: 11 }}>
                    <i className="fa-solid fa-calendar-days" />
                  </button>
                  {c.custom && (
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete cohort "${c.name}"?`)) deleteCohort(c.id); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--off-white-40)', cursor: 'pointer', fontSize: 11 }}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  )}
                </div>
              </div>
              <h2 className="t-heading" style={{ fontSize: 18, margin: '0 0 4px 0', textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
                {c.name}
              </h2>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em', marginBottom: 14 }}>
                ID {c.id} · {c.code || '—'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>START</div>
                  <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white)', marginTop: 2 }}>{c.start || '—'}</div>
                </div>
                <div>
                  <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>END</div>
                  <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white)', marginTop: 2 }}>{c.end || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--off-white-07)', borderRadius: 2 }}>
                <i className="fa-solid fa-user-group" style={{ fontSize: 10, color: 'var(--off-white-68)' }} />
                <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white)', letterSpacing: '0.06em' }}>
                  {users.length} EXONAUT{users.length === 1 ? '' : 'S'}
                </span>
              </div>
            </div>
          );
        })}
          </div>

          <div className="card-panel" style={{ padding: 20 }}>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <div>
                <div className="t-label" style={{ color: 'var(--sky)', marginBottom: 6 }}>{selectedCohort?.code || selectedCohort?.id}</div>
                <h2 style={{ fontSize: 16 }}>{selectedCohort?.name || 'Selected Cohort'} Roster</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingCohort(selectedCohort)}>
                  <i className="fa-solid fa-pen-to-square" /> Edit Cohort
                </button>
                <span className="section-meta">{assignedRows.length} USERS</span>
              </div>
            </div>
            {assignedRows.length === 0 && <div className="empty-line">No users assigned to this cohort.</div>}
            <div style={{ display: 'grid', gap: 8 }}>
              {assignedRows.map(row => {
                const track = row.track ? (TRACKS.find(t => t.code === row.track)?.short || row.track) : 'N/A';
                const role = row.role ? row.role.toUpperCase() : 'N/A';
                return (
                  <div key={row.id} className="card-flat" style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px auto', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{row.name}</div>
                      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>{row.id}</div>
                    </div>
                    <span className="status-pill status-submitted">{track}</span>
                    <span className="status-pill status-not-started">{role}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => { unassignUserFromCohort(row.id); setTick(t => t + 1); }}>
                      Unassign
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card-panel" style={{ padding: 20, position: 'sticky', top: 70 }}>
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16 }}>Unassigned Users</h2>
            <span className="section-meta">{unassignedRows.length} WAITING</span>
          </div>
          <select className="select" value={targetCohort} onChange={e => setTargetCohort(e.target.value)} style={{ marginBottom: 12 }}>
            {all.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflow: 'auto', marginBottom: 12 }}>
            {unassignedRows.length === 0 && <div className="empty-line">No unassigned users.</div>}
            {unassignedRows.map(row => (
              <label key={row.id} className="card-flat" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedUsers.includes(row.id)} onChange={() => toggleSelected(row.id)} />
                <span className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{row.name}</span>
              </label>
            ))}
          </div>
          <button className="btn btn-primary" disabled={!selectedUsers.length} onClick={assignSelected} style={{ width: '100%', justifyContent: 'center', opacity: selectedUsers.length ? 1 : 0.45 }}>
            Assign Selected
          </button>
        </div>
      </div>

      {creating && <AdminCreateCohortModal onClose={() => setCreating(false)} onCreate={(data) => {
        try {
          createCohort(data);
          setCreating(false);
        } catch (err) {
          alert(err.message || 'Could not create cohort.');
        }
      }} />}
      {editingCohort && (
        <AdminEditCohortDatesModal
          cohort={editingCohort}
          onClose={() => setEditingCohort(null)}
          onSave={async (data) => {
            const oldId = editingCohort.id;
            const renamedUsers = rows.filter(row => rowCohort(row) === oldId);
            let updated;
            try {
              updated = updateCohort(oldId, data);
            } catch (err) {
              alert(err.message || 'Could not update cohort.');
              return;
            }
            if (data.id && data.id !== oldId) {
              if (window.__adminScope?.get() === oldId) window.__adminScope.set(data.id);
              setTargetCohort(t => t === oldId ? data.id : t);
              for (const row of renamedUsers) {
                if (row.supabaseProfile) {
                  try { await updateProfile(row.id, { cohortId: data.id }); } catch (err) { console.warn('Could not update renamed cohort profile:', err); }
                }
              }
            }
            if (updated?.id) setSelected(updated.id);
            setEditingCohort(null);
          }}
        />
      )}
    </div>
  );
}

// -------- Exonaut Assignment --------
// Admin sets Cohort + Track + Manager (Lead) for any Exonaut.
// Respects the sidebar Cohort Filter ("All Cohorts" or specific cohort).
function AdminAssign() {
  const { all, assignUserToCohort, unassignUserFromCohort, isUserUnassigned, getAssignments, assignUserToTrack, assignUserToLead } = useCohort();
  const { profiles, updateProfile } = useUserProfiles();
  const { scope } = useAdminScope();
  const tracks = useAdminTracks();
  const [, setTick] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [cohortFilter, setCohortFilter] = React.useState(scope || 'all');

  // Leads bucketed by track — lets admin pick a plausible manager.
  const leadsByTrack = React.useMemo(() => {
    const map = {};
    LEADS.forEach(l => { (map[l.track] = map[l.track] || []).push(l); });
    return map;
  }, []);

  const rows = profiles.length
    ? profiles.map(p => ({
        id: p.id,
        name: p.fullName || p.email || 'Exonaut',
        points: 0,
        tier: 'entry',
        cohort: p.cohortId || 'c2627',
        track: p.trackCode || 'AIS',
        role: p.role || 'exonaut',
        supabaseProfile: true,
      }))
    : USERS.map(u => ({ ...u, role: 'exonaut', cohort: getUserCohort(u.id), track: getUserTrack(u.id) || 'AIS' }));

  const filtered = rows.filter(u => {
    const assignments = getAssignments();
    const curCohort = isUserUnassigned(u.id) ? '' : (assignments[u.id] || u.cohort || getUserCohort(u.id));
    if (cohortFilter !== 'all' && curCohort !== cohortFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const scopeLabel = cohortFilter === 'all' ? 'All Cohorts' : (all.find(c => c.id === cohortFilter)?.name || 'Selected Cohort');

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · EXONAUT ASSIGNMENT · {scopeLabel.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Assign Exonauts</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Set Cohort, Track, and role. New accounts stay Exonaut by default until Admin changes them.
          </div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
            style={{
              width: '100%', padding: '9px 12px 9px 32px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none',
            }} />
        </div>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em', marginTop: 10 }}>
          <i className="fa-solid fa-filter" style={{ marginRight: 5 }} />
          SCOPE: {scopeLabel.toUpperCase()} · CHANGE VIA SIDEBAR COHORT FILTER
        </div>
        <select className="select" value={cohortFilter} onChange={e => setCohortFilter(e.target.value)}>
          <option value="all">All cohorts</option>
          {all.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '48px 1.4fr 80px 130px 150px 150px 180px' }}>
          <div></div>
          <div>USER</div>
          <div>POINTS</div>
          <div>ROLE</div>
          <div>COHORT</div>
          <div>TRACK</div>
          <div>MANAGER</div>
        </div>
        {filtered.slice(0, 50).map(u => {
          const assignments = getAssignments();
          const curCohort = isUserUnassigned(u.id) ? '' : (assignments[u.id] || u.cohort || getUserCohort(u.id));
          const curTrack = u.supabaseProfile ? u.track : getUserTrack(u.id);
          const curLead = getUserLead(u.id);
          const leadOptions = leadsByTrack[curTrack] || LEADS;
          const selectStyle = {
            padding: '6px 8px', background: 'var(--deep-black)', color: 'var(--off-white)',
            border: '1px solid var(--off-white-15)', borderRadius: 2,
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
            cursor: 'pointer', outline: 'none', width: '100%',
          };
          return (
            <div key={u.id} className="lb-row" style={{ gridTemplateColumns: '48px 1.4fr 80px 130px 150px 150px 180px' }}>
              <AvatarWithRing name={u.name} size={34} tier={u.tier} />
              <div className="lb-name">{u.name}</div>
              <div className="lb-points">{u.points}</div>
              <select value={u.role || 'exonaut'} onChange={async (e) => { if (u.supabaseProfile) await updateProfile(u.id, { role: e.target.value }); u.role = e.target.value; setTick(t => t + 1); }} style={selectStyle}>
                <option value="exonaut">Exonaut</option>
                <option value="commander">Commander</option>
                <option value="admin">Admin</option>
              </select>
              <select value={curCohort} onChange={async (e) => {
                if (!e.target.value) {
                  unassignUserFromCohort(u.id);
                } else {
                  assignUserToCohort(u.id, e.target.value);
                  if (u.supabaseProfile) await updateProfile(u.id, { cohortId: e.target.value });
                }
                setTick(t => t + 1);
              }} style={selectStyle}>
                <option value="">Unassigned</option>
                {all.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <select value={curTrack} onChange={async (e) => { u.supabaseProfile ? await updateProfile(u.id, { trackCode: e.target.value }) : assignUserToTrack(u.id, e.target.value); setTick(t => t + 1); }} style={selectStyle}>
                {tracks.map(t => (<option key={t.code} value={t.code}>{t.short} - {t.name}</option>))}
              </select>
              <select value={curLead?.id || ''} onChange={(e) => { assignUserToLead(u.id, e.target.value); setTick(t => t + 1); }} style={selectStyle}>
                <option value="">— Unassigned —</option>
                <optgroup label={'In ' + (TRACKS.find(t => t.code === curTrack)?.short || curTrack)}>
                  {leadOptions.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </optgroup>
                <optgroup label="Other tracks">
                  {LEADS.filter(l => l.track !== curTrack).map(l => {
                    const tr = TRACKS.find(t => t.code === l.track);
                    return (<option key={l.id} value={l.id}>{l.name} ({tr?.short})</option>);
                  })}
                </optgroup>
              </select>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card-panel" style={{ textAlign: 'center', padding: 48, marginTop: 14 }}>
          <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No Exonauts match your filters.</div>
        </div>
      )}
    </div>
  );
}

// -------- User Directory --------
function AdminUsers() {
  const { all } = useCohort();
  const { profiles, updateProfile } = useUserProfiles();
  const { crowns } = useCrownState();
  const { scope } = useAdminScope();
  const commanderCount = 1;
  const leadCount = (typeof LEADS !== 'undefined') ? LEADS.length : 0;

  const profileRows = profiles.map(p => ({
    id: p.id,
    name: p.fullName || p.email || 'User',
    role: p.role === 'lead' ? 'exonaut' : p.role,
    cohort: p.cohortId || 'c2627',
    track: p.trackCode || '',
    tier: p.role === 'exonaut' ? 'entry' : 'corps',
    supabaseProfile: true,
  }));
  const seedRows = USERS.map(u => ({ ...u, role: 'exonaut', cohort: getUserCohort(u.id), track: getUserTrack(u.id) }));
  const userRows = profileRows.length ? profileRows : seedRows;
  const scopedUsers = scope === 'all' ? userRows : userRows.filter(u => u.cohort === scope);
  const scopeLabel = scope === 'all' ? 'All Cohorts' : (all.find(c => c.id === scope)?.name || '—');

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · USER DIRECTORY · {scopeLabel.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>
            {scope === 'all' ? 'All Users' : 'Users in ' + scopeLabel}
          </h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {scope === 'all' ? 'Platform-wide user roster across all roles and cohorts.' : 'Users scoped to the selected cohort. Change scope via the sidebar Cohort Filter.'}
          </div>
        </div>
        <button className="btn btn-primary"><i className="fa-solid fa-user-plus" /> INVITE USER</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPI label="TOTAL USERS" value={scopedUsers.length} accent="sky" sub={scope === 'all' ? `${all.length} COHORTS` : 'IN SCOPE'} />
        <KPI label="COMMANDERS" value={scopedUsers.filter(u => u.role === 'commander').length} accent="amber" sub="FOUNDER TIER" />
        <KPI label="CROWN HOLDERS" value={crowns.filter(c => c.status === 'active').length} accent="platinum" sub={`${(typeof TRACKS !== 'undefined') ? TRACKS.length : 7} TRACKS`} />
        <KPI label="EXONAUTS" value={scopedUsers.filter(u => u.role === 'exonaut').length} accent="lime" sub={scope === 'all' ? 'ACROSS ALL BATCHES' : 'IN COHORT'} />
      </div>

      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '48px 1fr 120px 140px 120px 140px 100px' }}>
          <div></div>
          <div>NAME</div>
          <div>ROLE</div>
          <div>COHORT</div>
          <div>TRACK</div>
          <div>MANAGER</div>
          <div>STATUS</div>
        </div>
        {scopedUsers.slice(0, 40).map(u => {
          const curCohort = u.cohort;
          const cohortObj = all.find(c => c.id === curCohort);
          const trackCode = u.track;
          const track = TRACKS.find(t => t.code === trackCode);
          const lead = getUserLead(u.id);
          return (
            <div key={u.id} className="lb-row" style={{ gridTemplateColumns: '48px 1fr 120px 140px 120px 140px 100px' }}>
              <AvatarWithRing name={u.name} size={34} tier={u.tier} />
              <div className="lb-name">{u.name}</div>
              {u.supabaseProfile
                ? <select value={u.role === 'lead' ? 'exonaut' : u.role} onChange={async (e) => updateProfile(u.id, { role: e.target.value })} style={{ background: 'var(--deep-black)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    {['exonaut','commander','admin'].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                : <div className="t-mono" style={{ fontSize: 10, color: 'var(--lime)', letterSpacing: '0.08em' }}>{u.role.toUpperCase()}</div>}
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-68)', letterSpacing: '0.06em' }}>
                {cohortObj?.name?.replace('Batch ', '') || '—'}
              </div>
              <div className="lb-track">{track?.short || trackCode}</div>
              <div className="t-body" style={{ fontSize: 11, color: lead ? 'var(--off-white-68)' : 'var(--off-white-40)' }}>
                {lead?.name || <span style={{ fontStyle: 'italic' }}>Unassigned</span>}
              </div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--green)', letterSpacing: '0.08em' }}>ACTIVE</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------- Create Cohort Modal (platform admin variant) --------
function AdminCreateCohortModal({ onClose, onCreate }) {
  const [id, setId] = React.useState('');
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');

  const cleanId = id.trim();
  const canSave = name.trim().length >= 3 && (!cleanId || /^[a-zA-Z0-9_-]+$/.test(cleanId));

  function save() {
    if (!canSave) return;
    onCreate({ id: cleanId, name: name.trim(), code: code.trim(), start: start.trim(), end: end.trim() });
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(440px, 100%)', padding: 0, borderColor: 'var(--sky)',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            PLATFORM ADMIN · CREATE COHORT
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>New Batch</h2>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 4 }}>
            Spin up a cohort shell. Use Exonaut Assignment to add members.
          </div>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminLabeledInput label="COHORT ID" value={id} onChange={setId} placeholder="e.g. c2728" />
          <AdminLabeledInput label="NAME" value={name} onChange={setName} placeholder="e.g. Batch 2027–2028" autoFocus />
          <AdminLabeledInput label="CODE (OPTIONAL)" value={code} onChange={setCode} placeholder="e.g. EXO-B-2728" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <AdminLabeledInput label="START" value={start} onChange={setStart} placeholder="OCT 05 2027" />
            <AdminLabeledInput label="END" value={end} onChange={setEnd} placeholder="JAN 28 2028" />
          </div>
        </div>

        <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Cancel</button>
          <button onClick={save} disabled={!canSave} style={{
            padding: '9px 16px', background: canSave ? 'var(--sky)' : 'var(--off-white-15)',
            border: 'none', borderRadius: 2, color: canSave ? 'var(--deep-black)' : 'var(--off-white-40)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>
            <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Create
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminEditCohortDatesModal({ cohort, onClose, onSave }) {
  const [id, setId] = React.useState(cohort?.id || '');
  const [name, setName] = React.useState(cohort?.name || '');
  const [code, setCode] = React.useState(cohort?.code || '');
  const [start, setStart] = React.useState(cohort?.start || '');
  const [end, setEnd] = React.useState(cohort?.end || '');
  const cleanId = id.trim();
  const canSave = name.trim().length >= 3 && /^[a-zA-Z0-9_-]+$/.test(cleanId);

  function save() {
    if (!canSave) return;
    onSave({ id: cleanId, name: name.trim(), code: code.trim(), start: start.trim(), end: end.trim() });
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(440px, 100%)', padding: 0, borderColor: 'var(--sky)',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            PLATFORM ADMIN · EDIT COHORT
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>{cohort?.name || 'Cohort'}</h2>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 4 }}>
            Update the cohort ID, name, code, and dates shown across admin and cohort views.
          </div>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminLabeledInput label="COHORT ID" value={id} onChange={setId} placeholder="e.g. c2728" />
          <AdminLabeledInput label="NAME" value={name} onChange={setName} placeholder="e.g. Batch 2027-2028" autoFocus />
          <AdminLabeledInput label="CODE" value={code} onChange={setCode} placeholder="e.g. EXO-B-2728" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <AdminLabeledInput label="START" value={start} onChange={setStart} placeholder="OCT 05 2027" />
            <AdminLabeledInput label="END" value={end} onChange={setEnd} placeholder="JAN 28 2028" />
          </div>
        </div>

        <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Cancel</button>
          <button onClick={save} disabled={!canSave} style={{
            padding: '9px 16px', background: canSave ? 'var(--sky)' : 'var(--off-white-15)',
            border: 'none', borderRadius: 2, color: canSave ? 'var(--deep-black)' : 'var(--off-white-40)', cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>
            <i className="fa-solid fa-floppy-disk" style={{ marginRight: 6 }} />Save Cohort
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLabeledInput({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>{label}</div>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px',
          background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2,
          fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none',
        }}
      />
    </div>
  );
}

// ============================================================================
// Manager Management — create, edit, assign Exonauts to, and remove Managers.
// Respects the sidebar cohort scope for the assign-roster column.
// ============================================================================
function AdminTrackControl() {
  const { all } = useCohort();
  const tracks = useAdminTracks();
  const { profiles, loading: profilesLoading, error: profilesError, updateProfile } = useUserProfiles();
  const { crowns, requests, loaded: crownsLoaded } = useCrownState();
  const { scope } = useAdminScope();
  const [expanded, setExpanded] = React.useState({});
  const [leadDraft, setLeadDraft] = React.useState({});
  const [savingTrack, setSavingTrack] = React.useState('');
  const [error, setError] = React.useState('');

  const scopeLabel = scope === 'all' ? 'All Cohorts' : (all.find(c => c.id === scope)?.name || 'Selected Cohort');
  const selectStyle = {
    padding: '7px 8px',
    background: 'var(--deep-black)',
    color: 'var(--off-white)',
    border: '1px solid var(--off-white-15)',
    borderRadius: 2,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    outline: 'none',
    width: '100%',
  };

  const exonauts = profiles.filter(p => (p.role === 'lead' ? 'exonaut' : (p.role || 'exonaut')) === 'exonaut');
  const scopedExonauts = scope === 'all' ? exonauts : exonauts.filter(p => (p.cohortId || 'c2627') === scope);

  function rosterFor(trackCode) {
    return scopedExonauts
      .filter(p => (p.trackCode || 'AIS') === trackCode)
      .sort((a, b) => (a.fullName || a.email || '').localeCompare(b.fullName || b.email || ''));
  }

  function profileName(userId) {
    const p = profiles.find(row => row.id === userId);
    return p ? (p.fullName || p.email || 'Exonaut') : 'Unassigned';
  }

  function formatDate(ms) {
    if (!ms) return '-';
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function assignLead(trackCode) {
    const userId = leadDraft[trackCode];
    if (!userId) {
      setError('Choose an Exonaut from the roster first.');
      return;
    }
    const target = profiles.find(p => p.id === userId);
    if (!target || (target.trackCode || 'AIS') !== trackCode) {
      setError('Admin can only assign the crown to someone in that track roster.');
      return;
    }
    if (scope !== 'all' && (target.cohortId || 'c2627') !== scope) {
      setError('The selected Exonaut is outside the current cohort scope.');
      return;
    }

    const track = TRACKS.find(t => t.code === trackCode);
    const ok = confirm(`Set ${target.fullName || target.email || 'this Exonaut'} as lead for ${track?.short || trackCode}?`);
    if (!ok) return;

    setError('');
    setSavingTrack(trackCode);
    try {
      await window.__crownStore.assignInitialCrown({
        trackCode,
        userId,
        cohortId: target.cohortId || 'c2627',
        assignedBy: 'admin',
        note: 'Admin set lead from Track Management',
      });
      setLeadDraft(prev => ({ ...prev, [trackCode]: '' }));
    } catch (err) {
      setError((err && err.message) || 'Could not assign lead.');
    } finally {
      setSavingTrack('');
    }
  }

  async function removeLead(trackCode) {
    const active = crowns.find(c => c.trackCode === trackCode && c.status === 'active');
    if (!active) return;
    const track = TRACKS.find(t => t.code === trackCode);
    const ok = confirm(`Remove ${profileName(active.userId)} as lead for ${track?.short || trackCode}?`);
    if (!ok) return;

    setError('');
    setSavingTrack(trackCode);
    try {
      await window.__crownStore.revokeActiveCrown(trackCode, 'admin', 'Admin removed lead from Track Management');
    } catch (err) {
      setError((err && err.message) || 'Could not remove lead.');
    } finally {
      setSavingTrack('');
    }
  }

  function deleteTrack(trackCode) {
    const track = tracks.find(t => t.code === trackCode);
    const ok = confirm(`Delete ${track?.short || trackCode} from Track Management and admin track lists? Existing tasks and profiles keep their saved track code.`);
    if (!ok) return;
    window.__adminTrackStore.delete(trackCode);
    setExpanded(prev => {
      const next = { ...prev };
      delete next[trackCode];
      return next;
    });
  }

  async function updateMember(userId, patch) {
    setError('');
    try {
      await updateProfile(userId, patch);
    } catch (err) {
      setError((err && err.message) || 'Could not update Exonaut.');
    }
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · TRACK MANAGEMENT · {scopeLabel.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Tracks & Rosters</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            View each track roster, see the current lead, and assign or remove the crown without changing anyone's login.
          </div>
        </div>
      </div>

      {(profilesLoading || !crownsLoaded) && (
        <div className="card-panel" style={{ padding: 14, marginBottom: 14 }}>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-68)', letterSpacing: '0.08em' }}>
            LOADING TRACK ROSTERS AND CROWN DATA...
          </div>
        </div>
      )}

      {(profilesError || error) && (
        <div className="card-panel" style={{ padding: 14, marginBottom: 14, borderColor: 'rgba(255,120,120,0.45)' }}>
          <div className="t-body" style={{ color: '#ff9b9b', fontSize: 12 }}>{error || profilesError}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 14 }}>
        {tracks.map(track => {
          const roster = rosterFor(track.code);
          const active = crowns.find(c => c.trackCode === track.code && c.status === 'active');
          const pending = requests.find(r => r.trackCode === track.code && r.status === 'pending');
          const lead = active ? profiles.find(p => p.id === active.userId) : null;
          const isOpen = expanded[track.code] !== false;
          const isSaving = savingTrack === track.code;

          return (
            <div key={track.code} className="card-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 5 }}>
                    {track.short} · {roster.length} EXONAUT{roster.length === 1 ? '' : 'S'}
                  </div>
                  <h2 className="t-heading" style={{ fontSize: 18, margin: 0, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
                    {track.name}
                  </h2>
                </div>
                <button
                  title={isOpen ? 'Collapse roster' : 'Expand roster'}
                  onClick={() => setExpanded(prev => ({ ...prev, [track.code]: !isOpen }))}
                  style={{ background: 'transparent', border: '1px solid var(--off-white-15)', borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer', padding: '6px 8px', fontSize: 10 }}
                >
                  <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} />
                </button>
                <button
                  title="Delete track"
                  onClick={() => deleteTrack(track.code)}
                  style={{ background: 'transparent', border: '1px solid var(--off-white-15)', borderRadius: 2, color: 'var(--red)', cursor: 'pointer', padding: '6px 8px', fontSize: 10 }}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>

              <div style={{ padding: 12, background: 'var(--off-white-07)', border: '1px solid var(--off-white-15)', borderRadius: 4, marginBottom: 12 }}>
                <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 8 }}>
                  CURRENT LEAD
                </div>
                {active ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <AvatarWithRing name={lead?.fullName || lead?.email || 'Lead'} size={34} tier="corps" />
                      <div style={{ minWidth: 0 }}>
                        <div className="t-heading" style={{ fontSize: 13, margin: 0, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead?.fullName || lead?.email || 'Unknown Exonaut'}
                        </div>
                        <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.08em', marginTop: 2 }}>
                          DUE {formatDate(active.dueAt)}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeLead(track.code)} disabled={isSaving} className="btn btn-ghost btn-sm">
                      <i className="fa-solid fa-crown" /> REMOVE
                    </button>
                  </div>
                ) : (
                  <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
                    No active lead assigned for this track.
                  </div>
                )}
              </div>

              {pending && (
                <div style={{ padding: 10, background: 'rgba(244,197,66,0.08)', border: '1px solid rgba(244,197,66,0.35)', borderRadius: 4, marginBottom: 12 }}>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--amber, #F4C542)', letterSpacing: '0.08em', fontWeight: 700 }}>
                    PENDING COMMANDER APPROVAL
                  </div>
                  <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', marginTop: 3 }}>
                    {profileName(pending.fromUserId)} requested transfer to {profileName(pending.toUserId)}.
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 14 }}>
                <select value={leadDraft[track.code] || ''} onChange={(e) => setLeadDraft(prev => ({ ...prev, [track.code]: e.target.value }))} style={selectStyle}>
                  <option value="">SELECT ROSTER MEMBER</option>
                  {roster.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName || p.email || 'Exonaut'}</option>
                  ))}
                </select>
                <button onClick={() => assignLead(track.code)} disabled={isSaving || roster.length === 0} className="btn btn-primary" style={{ minWidth: 110 }}>
                  <i className="fa-solid fa-crown" /> SET LEAD
                </button>
              </div>

              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roster.map(p => {
                    const memberIsLead = active?.userId === p.id;
                    return (
                      <div key={p.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '40px minmax(0, 1fr) 130px 130px',
                        gap: 8,
                        alignItems: 'center',
                        padding: 10,
                        border: '1px solid ' + (memberIsLead ? 'var(--lime)' : 'var(--off-white-07)'),
                        background: memberIsLead ? 'rgba(201,242,74,0.06)' : 'var(--off-white-04)',
                        borderRadius: 4,
                      }}>
                        <AvatarWithRing name={p.fullName || p.email || 'Exonaut'} size={32} tier={memberIsLead ? 'corps' : 'entry'} />
                        <div style={{ minWidth: 0 }}>
                          <div className="t-heading" style={{ fontSize: 12, margin: 0, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.fullName || p.email || 'Exonaut'}
                          </div>
                          <div className="t-mono" style={{ fontSize: 8, color: memberIsLead ? 'var(--lime)' : 'var(--off-white-40)', letterSpacing: '0.08em', marginTop: 2 }}>
                            {memberIsLead ? 'CURRENT LEAD' : (p.email || 'EXONAUT')}
                          </div>
                        </div>
                        <select value={p.cohortId || 'c2627'} onChange={(e) => updateMember(p.id, { cohortId: e.target.value })} style={selectStyle}>
                          {all.map(c => <option key={c.id} value={c.id}>{c.code || c.name}</option>)}
                        </select>
                        <select value={p.trackCode || 'AIS'} onChange={(e) => updateMember(p.id, { trackCode: e.target.value })} style={selectStyle}>
                          {TRACKS.map(t => <option key={t.code} value={t.code}>{t.short}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  {roster.length === 0 && (
                    <div style={{ padding: 18, textAlign: 'center', border: '1px dashed var(--off-white-15)', borderRadius: 4 }}>
                      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
                        No Exonauts in this track for the current cohort scope.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminManagers() {
  const { managers, create, update, remove, assignExonaut, unassignExonaut } = useManagers();
  const { all } = useCohort();
  const { scope } = useAdminScope();
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState(null);       // manager being edited
  const [assigning, setAssigning] = React.useState(null);   // manager id whose roster we're managing
  const [, setTick] = React.useState(0);

  const scopeLabel = scope === 'all' ? 'All Cohorts' : (all.find(c => c.id === scope)?.name || '—');

  // Filter managers by cohort scope.
  // - "all": show everyone.
  // - specific cohort: show managers assigned to that cohort.
  const scopedManagers = scope === 'all'
    ? managers
    : managers.filter(m => Array.isArray(m.cohorts) && m.cohorts.includes(scope));

  function confirmRemove(m) {
    const assignedCount = USERS.filter(u => getUserLead(u.id)?.id === m.id).length;
    const msg = assignedCount > 0
      ? `Remove Manager "${m.name}"?\n\n${assignedCount} Exonaut${assignedCount === 1 ? '' : 's'} will be reassigned to another ${TRACKS.find(t => t.code === m.track)?.short || m.track} manager, or marked unassigned if none remain.`
      : `Remove Manager "${m.name}"?`;
    if (confirm(msg)) {
      remove(m.id);
      setTick(t => t + 1);
    }
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · MANAGER MANAGEMENT · {scopeLabel.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Managers</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Create, assign to cohorts, and remove Mission Leads. {scope === 'all'
              ? `${managers.length} manager${managers.length === 1 ? '' : 's'} on platform.`
              : `${scopedManagers.length} of ${managers.length} assigned to ${scopeLabel}.`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <i className="fa-solid fa-user-plus" /> NEW MANAGER
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
        {scopedManagers.map(m => {
          const track = TRACKS.find(t => t.code === m.track);
          // Assigned-to-manager Exonauts, optionally filtered by cohort scope.
          const assignedExonauts = USERS.filter(u => getUserLead(u.id)?.id === m.id);
          const scopedAssigned = scope === 'all'
            ? assignedExonauts
            : assignedExonauts.filter(u => getUserCohort(u.id) === scope);
          const accent = 'var(--platinum)';
          const mgrCohorts = (m.cohorts || []).map(cid => all.find(c => c.id === cid)).filter(Boolean);
          return (
            <div key={m.id} className="card-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <AvatarWithRing name={m.name} size={44} tier="corps" />
                  <div style={{ minWidth: 0 }}>
                    <h2 className="t-heading" style={{
                      fontSize: 15, margin: '0 0 2px 0', textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{m.name}</h2>
                    <div className="t-mono" style={{ fontSize: 9, color: accent, letterSpacing: '0.1em', fontWeight: 700 }}>
                      MANAGER · {track?.short || m.track || 'UNASSIGNED'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setEditing(m)}
                    title="Edit"
                    style={{
                      background: 'transparent', border: '1px solid var(--off-white-15)', borderRadius: 2,
                      color: 'var(--off-white-68)', cursor: 'pointer', padding: '5px 8px', fontSize: 10,
                    }}><i className="fa-solid fa-pen" /></button>
                  <button onClick={() => confirmRemove(m)}
                    title="Remove"
                    style={{
                      background: 'transparent', border: '1px solid var(--off-white-15)', borderRadius: 2,
                      color: 'var(--off-white-68)', cursor: 'pointer', padding: '5px 8px', fontSize: 10,
                    }}><i className="fa-solid fa-trash" /></button>
                </div>
              </div>

              {m.email && (
                <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-envelope" style={{ fontSize: 10, color: 'var(--off-white-40)' }} />
                  {m.email}
                </div>
              )}

              {/* Cohort chips */}
              <div style={{ marginBottom: 12 }}>
                <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
                  ASSIGNED TO COHORT{mgrCohorts.length === 1 ? '' : 'S'}
                </div>
                {mgrCohorts.length === 0 ? (
                  <div style={{
                    padding: '6px 10px',
                    background: 'rgba(255,176,32,0.08)', border: '1px solid var(--amber, #F4C542)', borderRadius: 2,
                    color: 'var(--amber, #F4C542)',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 9 }} />
                    UNASSIGNED — EDIT TO ASSIGN COHORT
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {mgrCohorts.map(c => {
                      const cAccent = c.status === 'active' ? 'var(--lime)' : c.status === 'upcoming' ? 'var(--sky)' : 'var(--lavender)';
                      return (
                        <div key={c.id} style={{
                          padding: '3px 8px', background: 'var(--off-white-07)', border: '1px solid ' + cAccent, borderRadius: 2,
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: cAccent }} />
                          <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white)', letterSpacing: '0.06em' }}>
                            {c.code || c.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                <Stat label="ASSIGNED" value={scopedAssigned.length} />
                <Stat label="QUEUE" value={m.reviewQueue} />
                <Stat label="SAT" value={m.satisfaction ? m.satisfaction.toFixed(1) : '—'} />
              </div>

              <button onClick={() => setAssigning(m.id)} style={{
                width: '100%', padding: '8px 10px',
                background: 'var(--off-white-07)', border: '1px solid var(--off-white-15)', borderRadius: 2,
                color: 'var(--off-white)', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
              }}>
                <i className="fa-solid fa-user-gear" style={{ marginRight: 6 }} />
                MANAGE ROSTER
              </button>
            </div>
          );
        })}

        {scopedManagers.length === 0 && (
          <div className="card-panel" style={{ textAlign: 'center', padding: 48, gridColumn: '1 / -1' }}>
            <i className="fa-solid fa-user-tie" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
            <div className="t-body" style={{ color: 'var(--off-white-68)', marginBottom: 12 }}>
              {scope === 'all'
                ? 'No managers on the platform yet.'
                : `No managers assigned to ${scopeLabel}. Create one or edit an existing manager to assign them here.`}
            </div>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <i className="fa-solid fa-user-plus" /> CREATE MANAGER
            </button>
          </div>
        )}
      </div>

      {creating && (
        <ManagerEditModal
          mode="create"
          defaultCohortId={scope === 'all' ? null : scope}
          cohorts={all}
          onClose={() => setCreating(false)}
          onSave={(data) => { create(data); setCreating(false); }}
        />
      )}
      {editing && (
        <ManagerEditModal
          mode="edit"
          initial={editing}
          cohorts={all}
          onClose={() => setEditing(null)}
          onSave={(data) => { update(editing.id, data); setEditing(null); }}
        />
      )}
      {assigning && (
        <ManagerRosterModal
          managerId={assigning}
          scopedCohortId={scope === 'all' ? null : scope}
          scopeLabel={scopeLabel}
          onClose={() => setAssigning(null)}
          onAssign={(userId) => assignExonaut(userId, assigning)}
          onUnassign={(userId) => unassignExonaut(userId)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      padding: '6px 8px', background: 'var(--off-white-07)', borderRadius: 2, textAlign: 'center',
    }}>
      <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>{label}</div>
      <div className="t-heading" style={{
        fontSize: 16, margin: '2px 0 0 0', textTransform: 'none', letterSpacing: 0,
        color: 'var(--off-white)',
      }}>{value}</div>
    </div>
  );
}

// Create / Edit modal (shared)
function ManagerEditModal({ mode, initial, cohorts = [], defaultCohortId, onClose, onSave }) {
  const [name, setName]   = React.useState(initial?.name  || '');
  const [track, setTrack] = React.useState(initial?.track || (TRACKS[0]?.code || ''));
  const [email, setEmail] = React.useState(initial?.email || '');
  const [selectedCohorts, setSelectedCohorts] = React.useState(() => {
    if (initial?.cohorts) return [...initial.cohorts];
    if (defaultCohortId)   return [defaultCohortId];
    // Default: all active cohorts
    return cohorts.filter(c => c.status === 'active').map(c => c.id);
  });

  const canSave = name.trim().length >= 2 && !!track && selectedCohorts.length > 0;

  function toggleCohort(id) {
    setSelectedCohorts(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function save() {
    if (!canSave) return;
    onSave({ name: name.trim(), track, email: email.trim(), cohorts: selectedCohorts });
  }

  const title = mode === 'create' ? 'New Manager' : 'Edit Manager';
  const cta   = mode === 'create' ? 'Create'      : 'Save Changes';
  const icon  = mode === 'create' ? 'fa-user-plus' : 'fa-check';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(500px, 100%)', padding: 0, borderColor: 'var(--sky)',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            PLATFORM ADMIN · {mode === 'create' ? 'CREATE MANAGER' : 'EDIT MANAGER'}
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>{title}</h2>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 4 }}>
            {mode === 'create'
              ? 'Provision a Mission Lead, assign them to cohort(s), then add Exonauts via Manage Roster.'
              : 'Update details or toggle cohort membership. Existing Exonaut assignments are preserved.'}
          </div>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <AdminLabeledInput label="FULL NAME" value={name} onChange={setName} placeholder="e.g. Mission Lead" autoFocus />
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>TRACK</div>
            <select value={track} onChange={(e) => setTrack(e.target.value)} style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none', cursor: 'pointer',
            }}>
              {TRACKS.map(t => (<option key={t.code} value={t.code}>{t.short} — {t.name}</option>))}
            </select>
          </div>
          <AdminLabeledInput label="EMAIL (OPTIONAL)" value={email} onChange={setEmail} placeholder="name@exoasia.com" />

          {/* Cohort selection */}
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>
              COHORTS · PICK ONE OR MORE
            </div>
            <div style={{
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              background: 'var(--deep-black)',
              maxHeight: 200, overflowY: 'auto',
            }}>
              {cohorts.length === 0 && (
                <div style={{ padding: 14, color: 'var(--off-white-40)', fontSize: 12 }}>No cohorts available.</div>
              )}
              {cohorts.map(c => {
                const cAccent = c.status === 'active' ? 'var(--lime)' : c.status === 'upcoming' ? 'var(--sky)' : 'var(--lavender)';
                const checked = selectedCohorts.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCohort(c.id)}
                    style={{
                      padding: '9px 12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: checked ? 'var(--off-white-07)' : 'transparent',
                      borderBottom: '1px solid var(--off-white-07)',
                    }}
                    onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 2,
                      border: '1.5px solid ' + (checked ? cAccent : 'var(--off-white-40)'),
                      background: checked ? cAccent : 'transparent',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      {checked && <i className="fa-solid fa-check" style={{ fontSize: 9, color: 'var(--deep-black)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>
                        {c.code || c.id} · {(c.status || '').toUpperCase()}
                      </div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cAccent }} />
                  </div>
                );
              })}
            </div>
            {selectedCohorts.length === 0 && (
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--amber, #F4C542)', letterSpacing: '0.06em', marginTop: 5 }}>
                PICK AT LEAST ONE COHORT
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Cancel</button>
          <button onClick={save} disabled={!canSave} style={{
            padding: '9px 16px', background: canSave ? 'var(--sky)' : 'var(--off-white-15)',
            border: 'none', borderRadius: 2, color: canSave ? 'var(--deep-black)' : 'var(--off-white-40)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>
            <i className={'fa-solid ' + icon} style={{ marginRight: 6 }} />{cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// Roster modal — add / remove Exonauts from one Manager's list.
// Candidate pool is the UNION of the manager's cohort memberships, intersected
// with the sidebar scope when one is set.
function ManagerRosterModal({ managerId, scopedCohortId, scopeLabel, onClose, onAssign, onUnassign }) {
  const [, setTick] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const manager = window.__managerStore?.byId(managerId);
  const { all } = useCohort();
  if (!manager) return null;

  const track = TRACKS.find(t => t.code === manager.track);
  const mgrCohortIds = Array.isArray(manager.cohorts) && manager.cohorts.length
    ? manager.cohorts
    : all.map(c => c.id);

  // Candidate cohorts: manager's cohorts, narrowed by sidebar scope if set.
  const candidateCohortIds = scopedCohortId
    ? (mgrCohortIds.includes(scopedCohortId) ? [scopedCohortId] : [])
    : mgrCohortIds;

  const mgrCohorts = mgrCohortIds.map(id => all.find(c => c.id === id)).filter(Boolean);

  // Exonauts currently on this manager (via lead-assignment override or reports).
  const assigned = USERS.filter(u => getUserLead(u.id)?.id === managerId);

  // Candidates: users inside candidate cohorts, NOT already on this manager.
  const inScope = USERS.filter(u =>
    candidateCohortIds.includes(getUserCohort(u.id)) &&
    !assigned.some(a => a.id === u.id)
  );

  const filtered = inScope.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase())
  );
  const sameTrack = filtered.filter(u => getUserTrack(u.id) === manager.track);
  const otherTrack = filtered.filter(u => getUserTrack(u.id) !== manager.track);

  // Label at top of modal reflects the narrowed scope.
  const effectiveScopeLabel = scopedCohortId
    ? scopeLabel
    : (mgrCohorts.length === 1 ? mgrCohorts[0].name
       : mgrCohorts.length > 1 ? `${mgrCohorts.length} cohorts`
       : 'No cohorts assigned');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(820px, 100%)', maxHeight: '88vh', padding: 0, borderColor: 'var(--sky)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            PLATFORM ADMIN · MANAGE ROSTER · {effectiveScopeLabel.toUpperCase()}
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>{manager.name}</h2>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 4 }}>
            Manager · {track?.short || manager.track} · {assigned.length} Exonaut{assigned.length === 1 ? '' : 's'} assigned
          </div>
          {/* Cohort chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {mgrCohorts.map(c => {
              const cAccent = c.status === 'active' ? 'var(--lime)' : c.status === 'upcoming' ? 'var(--sky)' : 'var(--lavender)';
              const dimmed = scopedCohortId && c.id !== scopedCohortId;
              return (
                <div key={c.id} style={{
                  padding: '3px 8px', background: 'var(--off-white-07)', border: '1px solid ' + cAccent, borderRadius: 2,
                  display: 'inline-flex', alignItems: 'center', gap: 5, opacity: dimmed ? 0.4 : 1,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: cAccent }} />
                  <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white)', letterSpacing: '0.06em' }}>
                    {c.code || c.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, minHeight: 0 }}>
          {/* LEFT: currently assigned — remove */}
          <div style={{ borderRight: '1px solid var(--off-white-07)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--off-white-07)' }}>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--lime)', letterSpacing: '0.12em', fontWeight: 700 }}>
                ASSIGNED · {assigned.length}
              </div>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '6px 10px 12px' }}>
              {assigned.length === 0 && (
                <div className="t-body" style={{ color: 'var(--off-white-40)', fontSize: 12, textAlign: 'center', padding: 24 }}>
                  No Exonauts assigned yet.
                </div>
              )}
              {assigned.map(u => {
                const uCohort = all.find(c => c.id === getUserCohort(u.id));
                return (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 2,
                  }}>
                    <AvatarWithRing name={u.name} size={30} tier={u.tier} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name}
                      </div>
                      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.06em' }}>
                        {TRACKS.find(t => t.code === getUserTrack(u.id))?.short || getUserTrack(u.id)}
                        {uCohort && ' · ' + (uCohort.code || uCohort.name)}
                      </div>
                    </div>
                    <button
                      onClick={() => { onUnassign(u.id); setTick(t => t + 1); }}
                      title="Remove from roster"
                      style={{
                        background: 'transparent', border: '1px solid var(--off-white-15)', borderRadius: 2,
                        color: 'var(--off-white-68)', cursor: 'pointer', padding: '4px 8px', fontSize: 10,
                      }}><i className="fa-solid fa-minus" /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: add Exonauts */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--off-white-07)' }}>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>
                ADD EXONAUT · {candidateCohortIds.length} COHORT{candidateCohortIds.length === 1 ? '' : 'S'}
              </div>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 10 }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
                  style={{
                    width: '100%', padding: '7px 10px 7px 28px',
                    background: 'var(--deep-black)', color: 'var(--off-white)',
                    border: '1px solid var(--off-white-15)', borderRadius: 2,
                    fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none',
                  }} />
              </div>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '6px 10px 12px' }}>
              {candidateCohortIds.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--amber, #F4C542)', letterSpacing: '0.08em', marginBottom: 6 }}>
                    MANAGER HAS NO COHORTS IN SCOPE
                  </div>
                  <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)' }}>
                    Change the sidebar cohort filter or edit the manager to add cohorts.
                  </div>
                </div>
              )}
              {sameTrack.length > 0 && (
                <div>
                  <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', padding: '8px 10px 4px' }}>
                    SAME TRACK · {track?.short || manager.track}
                  </div>
                  {sameTrack.map(u => (
                    <RosterAddRow key={u.id} user={u} onAdd={() => { onAssign(u.id); setTick(t => t + 1); }} />
                  ))}
                </div>
              )}
              {otherTrack.length > 0 && (
                <div>
                  <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', padding: '12px 10px 4px' }}>
                    OTHER TRACKS
                  </div>
                  {otherTrack.map(u => (
                    <RosterAddRow key={u.id} user={u} onAdd={() => { onAssign(u.id); setTick(t => t + 1); }} />
                  ))}
                </div>
              )}
              {candidateCohortIds.length > 0 && filtered.length === 0 && (
                <div className="t-body" style={{ color: 'var(--off-white-40)', fontSize: 12, textAlign: 'center', padding: 24 }}>
                  {search ? 'No matches.' : 'Everyone in scope is already assigned.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'var(--sky)', border: 'none', borderRadius: 2,
            color: 'var(--deep-black)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Done</button>
        </div>
      </div>
    </div>
  );
}

function RosterAddRow({ user, onAdd }) {
  const curLead = getUserLead(user.id);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
    }}>
      <AvatarWithRing name={user.name} size={28} tier={user.tier} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name}
        </div>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.06em' }}>
          {TRACKS.find(t => t.code === getUserTrack(user.id))?.short || getUserTrack(user.id)}
          {curLead && ` · under ${curLead.name.split(' ').slice(-1)[0]}`}
        </div>
      </div>
      <button onClick={onAdd}
        title="Add to roster"
        style={{
          background: 'var(--lime)', border: 'none', borderRadius: 2,
          color: 'var(--deep-black)', cursor: 'pointer', padding: '4px 10px', fontSize: 10, fontWeight: 700,
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
        }}><i className="fa-solid fa-plus" style={{ marginRight: 4 }} />ADD</button>
    </div>
  );
}

function AdminMissionBuilder() {
  const missions = useMissions();
  const { scope } = useAdminScope();
  const { all: cohorts } = useCohort();
  const tracks = useAdminTracks();
  const [trackDraft, setTrackDraft] = React.useState({ name: '', code: '', short: '', objective: '' });
  const [trackError, setTrackError] = React.useState('');
  const [taskTrackFilter, setTaskTrackFilter] = React.useState('all');
  const [selectedTaskId, setSelectedTaskId] = React.useState('');
  const [draft, setDraft] = React.useState({
    title: '',
    track: 'AIS',
    cohortId: scope === 'all' ? 'c2627' : scope,
    pillar: 'project',
    points: 35,
    week: COHORT.week,
    dueDate: 'OCT 24',
    dueTime: '23:59 SGT',
    dueIn: 2,
    deliverable: 'document',
    description: '',
    criteriaText: '',
  });

  React.useEffect(() => {
    setDraft(d => ({ ...d, cohortId: scope === 'all' ? d.cohortId || 'c2627' : scope }));
  }, [scope]);

  const scopedMissions = missions
    .filter(m => scope === 'all' || (m.cohortId || 'c2627') === scope)
    .filter(m => taskTrackFilter === 'all' ? true : taskTrackFilter === 'all-cohort' ? !m.track : m.track === taskTrackFilter);
  const selectedTask = scopedMissions.find(m => m.id === selectedTaskId) || scopedMissions[0];
  const canCreate = draft.title.trim().length >= 4 && draft.description.trim().length >= 10;

  function setField(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function createTrack() {
    setTrackError('');
    try {
      const track = window.__adminTrackStore.create(trackDraft);
      setDraft(d => ({ ...d, track: track.code }));
      setTrackDraft({ name: '', code: '', short: '', objective: '' });
    } catch (err) {
      setTrackError(err.message || 'Could not create track.');
    }
  }

  function createMission() {
    if (!canCreate) return;
    const criteria = draft.criteriaText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    window.__missionStore.create({
      title: draft.title.trim(),
      track: draft.track === 'all' ? null : draft.track,
      cohortId: draft.cohortId || 'c2627',
      pillar: draft.pillar,
      points: Number(draft.points) || 0,
      week: Number(draft.week) || COHORT.week,
      dueDate: draft.dueDate.trim(),
      dueTime: draft.dueTime.trim() || '23:59 SGT',
      dueIn: Number(draft.dueIn) || 0,
      deliverable: draft.deliverable,
      description: draft.description.trim(),
      criteria,
      status: 'not-started',
    });
    setDraft(d => ({
      ...d,
      title: '',
      description: '',
      criteriaText: '',
    }));
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · NORMAL MISSION BUILDER
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Track Creation</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Create the standard cohort or track task list. Track Leads grade submissions; directives remain Lead-created custom tasks.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="card-panel">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16 }}>Create Track</h2>
            <span className="section-meta">{tracks.length} TRACKS</span>
          </div>
          {trackError && <div className="t-body" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{trackError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px', gap: 10, marginBottom: 10 }}>
            <input className="input" placeholder="Track name" value={trackDraft.name} onChange={e => setTrackDraft(d => ({ ...d, name: e.target.value }))} />
            <input className="input" placeholder="CODE" value={trackDraft.code} onChange={e => setTrackDraft(d => ({ ...d, code: e.target.value }))} />
            <input className="input" placeholder="Short label" value={trackDraft.short} onChange={e => setTrackDraft(d => ({ ...d, short: e.target.value }))} />
          </div>
          <textarea className="textarea" rows={2} placeholder="Track objective" value={trackDraft.objective} onChange={e => setTrackDraft(d => ({ ...d, objective: e.target.value }))} style={{ marginBottom: 10 }} />
          <button className="btn btn-ghost btn-sm" disabled={!trackDraft.name.trim()} onClick={createTrack} style={{ marginBottom: 22 }}>
            <i className="fa-solid fa-route" /> Create Track
          </button>

          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16 }}>Create Track Task</h2>
            <span className="section-meta">{scope === 'all' ? 'PLATFORM SCOPE' : scope.toUpperCase()}</span>
          </div>

          <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>MISSION TITLE</label>
          <input className="input" value={draft.title} onChange={e => setField('title', e.target.value)}
            placeholder="e.g. Competitive Landscape Analysis" style={{ marginBottom: 14 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>TRACK</label>
              <select className="input" value={draft.track} onChange={e => setField('track', e.target.value)}>
                <option value="all">ALL-COHORT</option>
                {tracks.map(t => <option key={t.code} value={t.code}>{t.short} - {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>COHORT</label>
              <select className="input" value={draft.cohortId} onChange={e => setField('cohortId', e.target.value)}>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>PILLAR</label>
              <select className="input" value={draft.pillar} onChange={e => setField('pillar', e.target.value)}>
                <option value="project">PROJECT</option>
                <option value="client">CLIENT</option>
                <option value="recruitment">RECRUITMENT</option>
              </select>
            </div>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>POINTS</label>
              <input className="input" type="number" value={draft.points} onChange={e => setField('points', e.target.value)} />
            </div>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>WEEK</label>
              <input className="input" type="number" min="1" max="12" value={draft.week} onChange={e => setField('week', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>DUE DATE</label>
              <input className="input" value={draft.dueDate} onChange={e => setField('dueDate', e.target.value)} />
            </div>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>DUE TIME</label>
              <input className="input" value={draft.dueTime} onChange={e => setField('dueTime', e.target.value)} />
            </div>
            <div>
              <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>DUE IN DAYS</label>
              <input className="input" type="number" value={draft.dueIn} onChange={e => setField('dueIn', e.target.value)} />
            </div>
          </div>

          <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>DELIVERABLE</label>
          <select className="input" value={draft.deliverable} onChange={e => setField('deliverable', e.target.value)} style={{ marginBottom: 14 }}>
            <option value="document">DOCUMENT</option>
            <option value="presentation">PRESENTATION</option>
            <option value="video">VIDEO</option>
            <option value="link">LINK</option>
            <option value="code">CODE</option>
          </select>

          <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>MISSION BRIEF</label>
          <textarea className="textarea" rows={5} value={draft.description} onChange={e => setField('description', e.target.value)}
            placeholder="What needs to be done, why it matters, and what done looks like." style={{ marginBottom: 14 }} />

          <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>GRADING CRITERIA · ONE PER LINE</label>
          <textarea className="textarea" rows={3} value={draft.criteriaText} onChange={e => setField('criteriaText', e.target.value)}
            placeholder={'Clear competitor selection\nSpecific comparison\nActionable recommendation'} />

          <button className="btn btn-primary" disabled={!canCreate}
            onClick={createMission}
            style={{ width: '100%', justifyContent: 'center', marginTop: 16, opacity: canCreate ? 1 : 0.4 }}>
            <i className="fa-solid fa-plus" /> CREATE NORMAL MISSION
          </button>
        </div>

        <div className="card-panel">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16 }}>Published Track Tasks</h2>
            <span className="section-meta">{scopedMissions.length} LIVE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, marginBottom: 14 }}>
            <select className="input" value={taskTrackFilter} onChange={e => { setTaskTrackFilter(e.target.value); setSelectedTaskId(''); }}>
              <option value="all">All tracks</option>
              <option value="all-cohort">All-cohort tasks</option>
              {tracks.map(t => <option key={t.code} value={t.code}>{t.short}</option>)}
            </select>
            <select className="input" value={selectedTask?.id || ''} onChange={e => setSelectedTaskId(e.target.value)}>
              {scopedMissions.map(m => {
                const track = m.track ? tracks.find(t => t.code === m.track) : null;
                return <option key={m.id} value={m.id}>WK {m.week || '-'} · {track?.short || 'ALL'} · {m.title}</option>;
              })}
            </select>
          </div>
          {scopedMissions.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <i className="fa-solid fa-bullseye" style={{ fontSize: 30, color: 'var(--off-white-40)', marginBottom: 12 }} />
              <div className="t-heading" style={{ fontSize: 14, marginBottom: 6 }}>No track tasks yet</div>
              <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
                Create one here and it will appear for Exonauts and staff immediately.
              </div>
            </div>
          )}
          {selectedTask && (() => {
            const m = selectedTask;
            const track = m.track ? tracks.find(t => t.code === m.track) : null;
            return (
              <div key={m.id} style={{ padding: '14px 0', borderTop: '1px solid var(--off-white-07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <div>
                    <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{m.title}</div>
                    <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 3 }}>
                      {m.id} · {track?.short || 'ALL-COHORT'} · WK {m.week || '-'} · +{m.points} · DUE {m.dueDate || '-'}
                    </div>
                  </div>
                  <span className="status-pill status-not-started">{(m.status || 'not-started').toUpperCase()}</span>
                </div>
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.45, marginBottom: 10 }}>
                  {(m.description || '').slice(0, 180)}{(m.description || '').length > 180 ? '...' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <select value={m.status || 'not-started'} onChange={e => window.__missionStore.update(m.id, { status: e.target.value })}
                    style={{ background: 'var(--deep-black)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    <option value="not-started">NOT STARTED</option>
                    <option value="in-progress">IN PROGRESS</option>
                    <option value="submitted">SUBMITTED</option>
                    <option value="approved">APPROVED</option>
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    if (confirm('Delete this normal mission?')) window.__missionStore.remove(m.id);
                    setSelectedTaskId('');
                  }}>
                    <i className="fa-solid fa-trash" /> DELETE
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PlatformAdminSidebar, AdminCohortFilter,
  AdminCohorts, AdminAssign, AdminUsers, AdminManagers, AdminTrackControl, AdminMissionBuilder,
});
