// Shell: sidebar, topbar, app frame

function Sidebar({ current, onNavigate, onSignOut }) {
  const { profile } = useCurrentUserProfile();
  useCrownState();
  const projectState = useProjects();
  const crown = window.__crownStore.getUserCrown(profile.id);
  const isFirstOfficer = window.__projectStore.userIsFirstOfficer(profile.id);
  const hasAssignedProject = window.__projectStore.visibleProjects(profile).length > 0;
  const hasProjectTasks = window.__projectStore.firstOfficerTasks(profile.id).length || projectState.assignees.some(a => a.userId === profile.id);
  const displayName = profile.fullName || ME.name;
  const tier = ME.tier || 'entry';
  const me = [
    { id: 'profile',     label: 'My Profile',  icon: 'fa-id-badge' },
    { id: 'community',   label: 'Community',   icon: 'fa-users' },
  ];
  const links = [
    { id: 'dashboard',   label: 'Dashboard',   icon: 'fa-gauge-high' },
    { id: 'missions',    label: 'Track',       icon: 'fa-bullseye', count: 3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-ranking-star' },
    { id: 'credentials', label: 'Certificates', icon: 'fa-certificate' },
  ];
  const ops = [
    { id: 'kudos',       label: 'Kudos',        icon: 'fa-hand-sparkles' },
    { id: 'rituals',     label: 'Rituals',      icon: 'fa-calendar-check' },
    { id: 'announce',    label: 'Announcements',icon: 'fa-bullhorn' },
    { id: 'alumni',      label: 'Alumni Corps', icon: 'fa-user-astronaut' },
  ];
  const trackOps = [
    { id: 'lead-home',      label: 'Track Command', icon: 'fa-satellite-dish' },
    { id: 'lead-queue',     label: 'Review Queue',  icon: 'fa-clipboard-check' },
    { id: 'lead-roster',    label: 'Roster',        icon: 'fa-users' },
    { id: 'lead-announce',  label: 'Announcements', icon: 'fa-bullhorn' },
    { id: 'lead-removals',  label: 'Removals',      icon: 'fa-user-slash' },
    { id: 'crown-pass',     label: 'Pass Crown',    icon: 'fa-crown' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">EXOASIA</div>
        <div className="sidebar-tag">EXONAUT PORTAL · v2.0</div>
      </div>
      <div className="sidebar-user" onClick={() => onNavigate('profile')} style={{ cursor: 'pointer' }}>
        <AvatarWithRing name={displayName} avatarUrl={profile.avatarUrl} size={36} tier={tier} />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-tier" style={{ color: TIERS[tier].color }}>
            {TIERS[ME.tier].short} · #{ME_RANK}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-section">Me</div>
        {me.map(l => (
          <div key={l.id}
               className={'sidebar-link' + (current === l.id ? ' active' : '')}
               onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="sidebar-nav-section">Program</div>
        {links.map(l => (
          <div key={l.id}
               className={'sidebar-link' + (current === l.id ? ' active' : '')}
               onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
            {l.count ? <span className="badge-count">{l.count}</span> : null}
          </div>
        ))}
        <div className="sidebar-nav-section">Culture</div>
        {ops.map(l => (
          <div key={l.id}
               className={'sidebar-link' + (current === l.id ? ' active' : '')}
               onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
          </div>
        ))}
        {crown && (
          <>
            <div className="sidebar-nav-section" style={{ color: 'var(--platinum)' }}>
              Track Ops · {(TRACKS.find(t => t.code === crown.trackCode)?.short || crown.trackCode)}
            </div>
            {trackOps.map(l => (
              <div key={l.id}
                   className={'sidebar-link' + (current === l.id ? ' active' : '')}
                   onClick={() => onNavigate(l.id)}>
                <i className={'fa-solid ' + l.icon} />
                <span>{l.label}</span>
              </div>
            ))}
          </>
        )}
        {(hasAssignedProject || isFirstOfficer || hasProjectTasks) && (
          <>
            <div className="sidebar-nav-section" style={{ color: 'var(--lime)' }}>Projects</div>
            <div className={'sidebar-link' + (current === 'projects' ? ' active' : '')} onClick={() => onNavigate('projects')}>
              <i className="fa-solid fa-diagram-project" />
              <span>Projects</span>
            </div>
            {isFirstOfficer && (
              <div className={'sidebar-link' + (current === 'first-projects' ? ' active' : '')} onClick={() => onNavigate('first-projects')}>
                <i className="fa-solid fa-user-tie" />
                <span>Project Lead Board</span>
              </div>
            )}
            {(isFirstOfficer || hasProjectTasks) && (
              <div className={'sidebar-link' + (current === 'project-tasks' ? ' active' : '')} onClick={() => onNavigate('project-tasks')}>
                <i className="fa-solid fa-list-check" />
                <span>Project Tasks</span>
              </div>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button title="Notifications" onClick={() => onNavigate('notifications')}>
          <i className="fa-solid fa-bell" />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)' }} />
        </button>
        <button title="Settings" onClick={() => onNavigate('settings')}><i className="fa-solid fa-gear" /></button>
        <button title="Log out" onClick={onSignOut}><i className="fa-solid fa-right-from-bracket" /></button>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, onNavigate }) {
  const { profile } = useCurrentUserProfile();
  const cohort = window.getActiveCohort?.(profile) || COHORT;
  const weekTotal = window.getCohortWeekTotal?.(cohort) || COHORT.weekTotal;
  const [time, setTime] = React.useState('');
  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2,'0');
      const m = String(d.getMinutes()).padStart(2,'0');
      const s = String(d.getSeconds()).padStart(2,'0');
      setTime(`${h}:${m}:${s}`);
    };
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        <i className="fa-solid fa-angles-right" style={{ color: 'var(--ink)', opacity: 0.6 }} />
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
            {i < crumbs.length - 1 && <span className="sep">/</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-right">
        <span>{cohort?.code || COHORT.code}</span>
        <span style={{ color: 'var(--off-white-20)' }}>·</span>
        <span>WK {COHORT.week}/{weekTotal}</span>
        <span style={{ color: 'var(--off-white-20)' }}>·</span>
        <span>{time} SGT</span>
        <button onClick={() => onNavigate && onNavigate('notifications')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--off-white-68)', position: 'relative', padding: '0 6px' }}
                title="Notifications">
          <i className="fa-solid fa-bell" />
          <span style={{ position: 'absolute', top: -2, right: 0, width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)' }} />
        </button>
        <span className="topbar-live"><span className="pulse" /> LIVE</span>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar });
