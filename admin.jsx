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

// -------- Admin Cohort Filter (sidebar widget) --------
function AdminCohortFilter() {
  const { all, createCohort, deleteCohort } = useCohort();
  const { scope, setScope } = useAdminScope();
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const current = scope === 'all' ? null : all.find(c => c.id === scope);
  const totalUsers = USERS.length;
  const scopedUsers = scope === 'all' ? totalUsers : getCohortUsers(scope).length;
  const accent = scope === 'all' ? 'var(--sky)' : (COHORT_STATUS_COLOR[current?.status] || 'var(--lavender)');

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
            const cAccent = COHORT_STATUS_COLOR[c.status] || 'var(--lavender)';
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

      {creating && <AdminCreateCohortModal onClose={() => setCreating(false)} onCreate={(data) => { createCohort(data); setCreating(false); }} />}
    </div>
  );
}

// -------- Platform Admin sidebar --------
function PlatformAdminSidebar({ current, onNavigate, onSignOut }) {
  const me = [
    { id: 'pa-profile',  label: 'My Profile',         icon: 'fa-id-badge' },
    { id: 'community',   label: 'Community',          icon: 'fa-users-rectangle' },
  ];
  const links = [
    { id: 'pa-cohorts',  label: 'Cohort Management',  icon: 'fa-layer-group' },
    { id: 'pa-managers', label: 'Track Creation',     icon: 'fa-route' },
    { id: 'pa-assign',   label: 'Exonaut Assignment', icon: 'fa-user-gear' },
    { id: 'pa-projects', label: 'Project Builder',    icon: 'fa-diagram-project' },
    { id: 'pa-users',    label: 'User Directory',     icon: 'fa-address-book' },
    { id: 'pa-console',  label: 'System Console',     icon: 'fa-shield-halved' },
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
        <AvatarWithRing name="Ops Admin" size={36} tier="corps" />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">Ops Admin</div>
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
// Cohort lifecycle: upcoming → open → closed → active → alumni
// Each status maps to the actions available and the resulting next status.
const COHORT_LIFECYCLE = {
  upcoming: [{ label: 'OPEN',  icon: 'fa-door-open',        color: 'var(--lime)',     next: 'open',   verb: 'Open enrollment for' }],
  open:     [
    { label: 'CLOSE', icon: 'fa-lock',             color: 'var(--amber)',    next: 'closed', verb: 'Close enrollment for' },
    { label: 'START', icon: 'fa-play',             color: 'var(--lime)',     next: 'active', verb: 'Start mission for' },
  ],
  closed:   [{ label: 'START', icon: 'fa-play',             color: 'var(--lime)',     next: 'active', verb: 'Start mission for' }],
  active:   [{ label: 'END',   icon: 'fa-flag-checkered',   color: 'var(--lavender)', next: 'alumni', verb: 'End cohort' }],
  alumni:   [],
};

const COHORT_STATUS_COLOR = {
  upcoming: 'var(--sky)',
  open:     'var(--lime)',
  closed:   'var(--amber)',
  active:   'var(--lime)',
  alumni:   'var(--lavender)',
};

function AdminCohorts() {
  const { all, cohortId, setSelected, createCohort, deleteCohort, updateCohortStatus } = useCohort();
  const registeredUsers = useRegisteredUsers();
  const [creating, setCreating] = React.useState(false);

  // Count users per cohort including Supabase-registered users
  function cohortUserCount(cId) {
    const seedCount = getCohortUsers(cId).length;
    const regCount  = registeredUsers.filter(u => u.cohortId === cId).length;
    return seedCount + regCount;
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
          <i className="fa-solid fa-plus" /> Add Cohort
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {all.map(c => {
          const count     = cohortUserCount(c.id);
          const status    = c.status || 'upcoming';
          const accent    = COHORT_STATUS_COLOR[status] || 'var(--off-white-40)';
          const isSelected = c.id === cohortId;
          const actions   = COHORT_LIFECYCLE[status] || [];
          return (
            <div key={c.id} className="card-panel" style={{
              padding: 20, borderColor: isSelected ? accent : undefined, cursor: 'pointer',
            }} onClick={() => setSelected(c.id)}>

              {/* Status row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="t-mono" style={{ fontSize: 9, color: accent, letterSpacing: '0.12em', fontWeight: 700 }}>
                  {status.toUpperCase()}
                </div>
                {c.custom && (
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete cohort "${c.name}"?`)) deleteCohort(c.id); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--off-white-40)', cursor: 'pointer', fontSize: 11 }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                )}
              </div>

              {/* Name + code */}
              <h2 className="t-heading" style={{ fontSize: 18, margin: '0 0 4px 0', textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
                {c.name}
              </h2>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em', marginBottom: 14 }}>
                {c.code || '—'}
              </div>

              {/* Dates */}
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

              {/* Member count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--off-white-07)', borderRadius: 2, marginBottom: actions.length ? 12 : 0 }}>
                <i className="fa-solid fa-user-group" style={{ fontSize: 10, color: 'var(--off-white-68)' }} />
                <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white)', letterSpacing: '0.06em' }}>
                  {count} EXONAUT{count === 1 ? '' : 'S'}
                </span>
              </div>

              {/* Lifecycle action buttons */}
              {actions.length > 0 && (
                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  {actions.map(act => (
                    <button key={act.label} onClick={() => {
                      if (confirm(`${act.verb} "${c.name}"?`)) updateCohortStatus(c.id, act.next);
                    }} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 10px', background: 'transparent',
                      border: '1px solid ' + act.color, borderRadius: 2,
                      color: act.color, cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = act.color; e.currentTarget.style.color = 'var(--deep-black)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = act.color; }}
                    >
                      <i className={'fa-solid ' + act.icon} style={{ fontSize: 10 }} />
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {creating && <AdminCreateCohortModal onClose={() => setCreating(false)} onCreate={(data) => { createCohort(data); setCreating(false); }} />}
    </div>
  );
}

// -------- Exonaut Assignment --------
// Admin sets Cohort + Track + Manager (Lead) for any Exonaut.
// Respects the sidebar Cohort Filter ("All Cohorts" or specific cohort).
function AdminAssign() {
  const { all, assignUserToCohort, assignUserToTrack, assignUserToLead } = useCohort();
  const { scope } = useAdminScope();
  const registeredUsers = useRegisteredUsers();
  const [, setTick] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [commanderId, setCommanderId] = React.useState(() => localStorage.getItem('exo:commander-id') || 'cmdr-01');

  const leadsByTrack = React.useMemo(() => {
    const map = {};
    LEADS.forEach(l => { (map[l.track] = map[l.track] || []).push(l); });
    return map;
  }, []);

  // Registered Exonauts only — seed users are demo data
  const filtered = registeredUsers.filter(u => {
    if (u.role !== 'exonaut') return false;
    const curCohort = u.cohortId || getUserCohort(u.userId);
    if (scope !== 'all' && curCohort !== scope) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const scopeLabel = scope === 'all' ? 'All Cohorts' : (all.find(c => c.id === scope)?.name || '—');
  const deployPredefinedMissions = () => {
    localStorage.setItem('exo:missions-deployed:' + scopeLabel, String(Date.now()));
    if (window.__notifStore) {
      filtered.forEach(u => window.__notifStore.add({
        toUserId: u.userId,
        type: 'track',
        title: 'PREDEFINED MISSIONS DEPLOYED',
        sub: `Track missions are ready for ${scopeLabel}.`,
        icon: 'fa-rocket',
      }));
    }
    setTick(t => t + 1);
  };

  const selectStyle = {
    padding: '6px 8px', background: 'var(--deep-black)', color: 'var(--off-white)',
    border: '1px solid var(--off-white-15)', borderRadius: 2,
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
    cursor: 'pointer', outline: 'none', width: '100%',
  };

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · EXONAUT ASSIGNMENT · {scopeLabel.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Assign Exonauts</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Set Commander, Cohort, Track, and Track Lead for each Exonaut. Changes take effect immediately.
          </div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 12 }}>
          <select value={commanderId} onChange={e => { setCommanderId(e.target.value); localStorage.setItem('exo:commander-id', e.target.value); }} style={selectStyle}>
            <option value="cmdr-01">Mission Commander · Mack Comandante</option>
            {registeredUsers.filter(u => u.role === 'commander').map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={deployPredefinedMissions}>
            <i className="fa-solid fa-rocket" /> Deploy Predefined Missions
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 11 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', background: 'var(--deep-black)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none' }} />
        </div>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em', marginTop: 10 }}>
          <i className="fa-solid fa-filter" style={{ marginRight: 5 }} />
          SCOPE: {scopeLabel.toUpperCase()} · {filtered.length} EXONAUT{filtered.length !== 1 ? 'S' : ''}
        </div>
      </div>

      {registeredUsers.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: 48 }}>
          <i className="fa-solid fa-user-plus" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 12, display: 'block' }} />
          <div className="t-heading" style={{ fontSize: 15, marginBottom: 6 }}>No registered Exonauts yet</div>
          <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-40)' }}>
            Users will appear here once they sign up via the Create Account screen.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: 48 }}>
          <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No Exonauts match your filters.</div>
        </div>
      ) : (
        <div className="lb-table">
          <div className="lb-header" style={{ gridTemplateColumns: '48px 1.4fr 160px 180px 200px' }}>
            <div></div><div>EXONAUT</div><div>COHORT</div><div>TRACK</div><div>TRACK LEAD</div>
          </div>
          {filtered.map(u => {
            const uid = u.userId;
            const curCohort = u.cohortId || getUserCohort(uid) || '';
            const curTrack  = getUserTrack(uid) || '';
            const curLead   = getUserLead(uid);
            const leadOpts  = leadsByTrack[curTrack] || LEADS;
            return (
              <div key={uid} className="lb-row" style={{ gridTemplateColumns: '48px 1.4fr 160px 180px 200px' }}>
                <AvatarWithRing name={u.name} size={34} tier={u.tier || 'entry'} />
                <div>
                  <div className="lb-name">{u.name}</div>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.06em', marginTop: 2 }}>{u.email}</div>
                </div>
                <select value={curCohort} onChange={e => { assignUserToCohort(uid, e.target.value); setTick(t => t + 1); }} style={selectStyle}>
                  <option value="">— Unassigned —</option>
                  {all.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={curTrack} onChange={e => { assignUserToTrack(uid, e.target.value); setTick(t => t + 1); }} style={selectStyle}>
                  <option value="">— Unassigned —</option>
                  {TRACKS.map(t => <option key={t.code} value={t.code}>{t.short} — {t.name}</option>)}
                </select>
                <select value={curLead?.id || ''} onChange={e => { assignUserToLead(uid, e.target.value); setTick(t => t + 1); }} style={selectStyle}>
                  <option value="">— Unassigned —</option>
                  <optgroup label={'In ' + (TRACKS.find(t => t.code === curTrack)?.short || curTrack || 'Track')}>
                    {leadOpts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </optgroup>
                  {LEADS.filter(l => l.track !== curTrack).length > 0 && (
                    <optgroup label="Other tracks">
                      {LEADS.filter(l => l.track !== curTrack).map(l => {
                        const tr = TRACKS.find(t => t.code === l.track);
                        return <option key={l.id} value={l.id}>{l.name} ({tr?.short})</option>;
                      })}
                    </optgroup>
                  )}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -------- User Directory --------
// Role-change row for a registered user
function AdminUserRoleRow({ user, onRoleChange, onDelete }) {
  const [editing, setEditing] = React.useState(false);
  const [newRole, setNewRole] = React.useState(user.role);
  const [leadId, setLeadId] = React.useState(user.leadId || '');
  const [saving, setSaving] = React.useState(false);

  const ROLE_COLORS = { exonaut: 'var(--lime)', lead: 'var(--platinum)', commander: 'var(--amber)', admin: 'var(--sky)' };
  const ROLE_ICONS  = { exonaut: 'fa-user-astronaut', lead: 'fa-user-shield', commander: 'fa-star', admin: 'fa-shield-halved' };

  async function save() {
    if (newRole === 'lead' && !leadId) return;
    setSaving(true);
    await onRoleChange(user.userId, newRole, newRole === 'lead' ? leadId : null);
    setEditing(false);
    setSaving(false);
  }

  const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  return (
    <div style={{ borderBottom: '1px solid var(--off-white-07)', padding: '14px 16px' }}>
      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 130px 120px 120px 80px', gap: 12, alignItems: 'center' }}>
        <AvatarWithRing name={user.name} size={34} tier={user.role === 'exonaut' ? 'entry' : 'corps'} />
        <div>
          <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{user.name}</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.04em', marginTop: 2 }}>{user.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={'fa-solid ' + ROLE_ICONS[user.role]} style={{ color: ROLE_COLORS[user.role], fontSize: 10 }} />
          <span className="t-mono" style={{ fontSize: 10, color: ROLE_COLORS[user.role], letterSpacing: '0.08em', fontWeight: 700 }}>
            {user.role.toUpperCase()}
          </span>
          {user.role === 'lead' && user.leadId && (
            <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>
              · {(LEADS.find(l => l.id === user.leadId) || {}).track || user.leadId}
            </span>
          )}
        </div>
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{createdDate}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { setEditing(v => !v); setNewRole(user.role); setLeadId(user.leadId || ''); }}
            className="btn btn-ghost btn-sm" title="Change role">
            <i className="fa-solid fa-pen" />
          </button>
          <button onClick={() => { if (confirm(`Remove account for ${user.name}?`)) onDelete(user.userId); }}
            className="btn btn-ghost btn-sm" title="Delete user" style={{ color: 'var(--red)' }}>
            <i className="fa-solid fa-trash" />
          </button>
        </div>
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--green)', letterSpacing: '0.08em' }}>ACTIVE</div>
      </div>

      {/* Inline role editor */}
      {editing && (
        <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--bg-darkest)', borderRadius: 4, border: '1px solid var(--off-white-07)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.1em', marginBottom: 6 }}>NEW ROLE</div>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{
              background: 'var(--bg-deep)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2,
              padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer',
            }}>
              <option value="exonaut">Exonaut</option>
              <option value="lead">Mission Lead</option>
              <option value="commander">Commander</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {newRole === 'lead' && (
            <div>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--platinum)', letterSpacing: '0.1em', marginBottom: 6 }}>ASSIGN TO LEAD SLOT</div>
              <select value={leadId} onChange={e => setLeadId(e.target.value)} style={{
                background: 'var(--bg-deep)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2,
                padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer',
              }}>
                <option value="">— select track slot —</option>
                {LEADS.map(l => {
                  const t = TRACKS.find(tr => tr.code === l.track);
                  return <option key={l.id} value={l.id}>{l.name} · {t?.short || l.track}</option>;
                })}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={save} disabled={saving || (newRole === 'lead' && !leadId)} className="btn btn-primary btn-sm"
              style={{ opacity: (saving || (newRole === 'lead' && !leadId)) ? 0.5 : 1 }}>
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</> : <><i className="fa-solid fa-check" /> Confirm</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUsers() {
  const { all } = useCohort();
  const { scope } = useAdminScope();
  const registeredUsers = useRegisteredUsers();
  const [tab, setTab] = React.useState('registered');

  const commanderCount = 1;
  const leadCount = (typeof LEADS !== 'undefined') ? LEADS.length : 0;
  const scopedSeedUsers = scope === 'all' ? USERS : USERS.filter(u => getUserCohort(u.id) === scope);
  const scopeLabel = scope === 'all' ? 'All Cohorts' : (all.find(c => c.id === scope)?.name || '—');

  async function handleRoleChange(userId, role, leadId) {
    await window.__userRegistry.updateRole(userId, role, leadId);
  }

  async function handleDelete(userId) {
    await window.__userRegistry.remove(userId);
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>
            PLATFORM ADMIN · USER DIRECTORY · {scopeLabel.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>User Directory</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Manage registered users and their roles. Seed demo accounts are read-only.
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPI label="REGISTERED" value={registeredUsers.length} accent="sky" sub="SIGNED UP VIA PORTAL" />
        <KPI label="EXONAUTS" value={registeredUsers.filter(u => u.role === 'exonaut').length} accent="lime" sub="DEFAULT ROLE" />
        <KPI label="LEADS" value={registeredUsers.filter(u => u.role === 'lead').length} accent="platinum" sub="PROMOTED BY ADMIN" />
        <KPI label="COMMANDERS" value={registeredUsers.filter(u => u.role === 'commander').length + registeredUsers.filter(u => u.role === 'admin').length} accent="amber" sub="CMD + ADMIN" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--off-white-07)', marginBottom: 20 }}>
        {[['registered', `Registered Users (${registeredUsers.length})`], ['seed', `Seed / Demo (${scopedSeedUsers.length})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase',
            color: tab === t ? 'var(--sky)' : 'var(--off-white-40)',
            borderBottom: tab === t ? '2px solid var(--sky)' : '2px solid transparent',
            marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {/* Registered Users tab */}
      {tab === 'registered' && (
        <div className="card-panel" style={{ padding: 0 }}>
          {registeredUsers.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <i className="fa-solid fa-user-plus" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 12, display: 'block' }} />
              <div className="t-heading" style={{ fontSize: 15, marginBottom: 6 }}>No registered users yet</div>
              <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-40)' }}>
                Users will appear here once they sign up via the Create Account screen.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 130px 120px 120px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--off-white-07)' }}>
                {['', 'NAME / EMAIL', 'ROLE', 'JOINED', 'ACTIONS', 'STATUS'].map((h, i) => (
                  <div key={i} className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {registeredUsers.map(u => (
                <AdminUserRoleRow key={u.userId} user={u} onRoleChange={handleRoleChange} onDelete={handleDelete} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Seed / Demo tab */}
      {tab === 'seed' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', background: 'rgba(100,180,230,0.06)', border: '1px solid rgba(100,180,230,0.15)', borderRadius: 4 }}>
            <i className="fa-solid fa-lock" style={{ color: 'var(--sky)', fontSize: 11 }} />
            <span className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
              Seed accounts are read-only demo data. Credentials are in the platform brief.
            </span>
          </div>
          <div className="lb-table">
            <div className="lb-header" style={{ gridTemplateColumns: '48px 1fr 120px 140px 120px 140px 100px' }}>
              <div></div><div>NAME</div><div>ROLE</div><div>COHORT</div><div>TRACK</div><div>MANAGER</div><div>STATUS</div>
            </div>
            {scopedSeedUsers.slice(0, 40).map(u => {
              const curCohort = getUserCohort(u.id);
              const cohortObj = all.find(c => c.id === curCohort);
              const trackCode = getUserTrack(u.id);
              const track = TRACKS.find(t => t.code === trackCode);
              const lead = getUserLead(u.id);
              return (
                <div key={u.id} className="lb-row" style={{ gridTemplateColumns: '48px 1fr 120px 140px 120px 140px 100px' }}>
                  <AvatarWithRing name={u.name} size={34} tier={u.tier} />
                  <div className="lb-name">{u.name}</div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--lime)', letterSpacing: '0.08em' }}>EXONAUT</div>
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
      )}
    </div>
  );
}

// -------- Create Cohort Modal (platform admin variant) --------
function AdminCreateCohortModal({ onClose, onCreate }) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');

  const canSave = name.trim().length >= 3;

  function save() {
    if (!canSave) return;
    onCreate({ name: name.trim(), code: code.trim(), start: start.trim(), end: end.trim() });
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
            PLATFORM ADMIN · TRACK CREATION · {scopeLabel.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Track Creation</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Create tracks, assign Track Leads to cohorts, and manage rosters. {scope === 'all'
              ? `${managers.length} track lead${managers.length === 1 ? '' : 's'} on platform.`
              : `${scopedManagers.length} of ${managers.length} assigned to ${scopeLabel}.`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <i className="fa-solid fa-route" /> Create Track
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
                      const cAccent = COHORT_STATUS_COLOR[c.status] || 'var(--lavender)';
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
          <AdminLabeledInput label="FULL NAME" value={name} onChange={setName} placeholder="e.g. Dr. Nadia Oyelaran" autoFocus />
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
                const cAccent = COHORT_STATUS_COLOR[c.status] || 'var(--lavender)';
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
            padding: '9px 16px',
            background: canSave ? 'var(--sky)' : 'rgba(0,0,0,0.08)',
            border: canSave ? 'none' : '1px solid rgba(0,0,0,0.15)',
            borderRadius: 2,
            color: canSave ? '#0a0a0a' : 'rgba(0,0,0,0.3)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
            opacity: canSave ? 1 : 0.6,
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
  const registeredUsers = window.useRegisteredUsers ? window.useRegisteredUsers() : [];
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

  // Merge seed USERS + Supabase-registered users into one pool (no duplicates).
  const seedUsers = typeof USERS !== 'undefined' ? USERS : [];
  const seedIds = new Set(seedUsers.map(u => u.id));
  const regAsUsers = registeredUsers
    .filter(u => u.role === 'exonaut' && !seedIds.has(u.userId))
    .map(u => ({
      id: u.userId,
      name: u.name,
      cohort: u.cohortId || 'c2627',
      track: u.track || '',
      tier: 'entry',
    }));
  const allUsers = [...seedUsers, ...regAsUsers];

  // Exonauts currently on this manager (via lead-assignment override or reports).
  const assigned = allUsers.filter(u => getUserLead(u.id)?.id === managerId);

  // Candidates: users inside candidate cohorts, NOT already on this manager.
  const inScope = allUsers.filter(u =>
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
              const cAccent = COHORT_STATUS_COLOR[c.status] || 'var(--lavender)';
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

Object.assign(window, {
  PlatformAdminSidebar, AdminCohortFilter,
  AdminCohorts, AdminAssign, AdminUsers, AdminManagers, AdminUserRoleRow,
});
