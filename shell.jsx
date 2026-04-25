// Shell: sidebar, topbar, app frame

function Sidebar({ current, onNavigate, onSignOut, mobileOpen, onMobileClose }) {
  const userId = typeof ME_ID !== 'undefined' ? ME_ID : null;
  const notifs = userId && window.useNotifications ? window.useNotifications(userId) : { hasUnread: false };
  const me = [
    { id: 'profile',       label: 'My Profile',       icon: 'fa-id-badge' },
    { id: 'certs',         label: 'Certs & Badges',   icon: 'fa-medal' },
    { id: 'community',     label: 'Community',         icon: 'fa-users' },
    { id: 'message-board', label: 'Message Board',     icon: 'fa-comments' },
  ];
  const links = [
    { id: 'dashboard',   label: 'Dashboard',   icon: 'fa-gauge-high' },
    { id: 'missions',    label: 'Missions',    icon: 'fa-bullseye', count: 3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-ranking-star' },
  ];
  const ops = [
    { id: 'kudos',       label: 'Kudos',        icon: 'fa-hand-sparkles' },
    { id: 'rituals',     label: 'Rituals',      icon: 'fa-calendar-check' },
    { id: 'announce',    label: 'Announcements',icon: 'fa-bullhorn' },
    { id: 'alumni',      label: 'Alumni Corps', icon: 'fa-user-astronaut' },
  ];

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}
    <aside className={'sidebar' + (mobileOpen ? ' sidebar-mobile-open' : '')}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">EXOASIA</div>
        <div className="sidebar-tag">EXONAUT PORTAL · v2.0</div>
      </div>
      <div className="sidebar-user" onClick={() => onNavigate('profile')} style={{ cursor: 'pointer' }}>
        <AvatarWithRing name={ME.name} size={36} tier={ME.tier}
          photoUrl={localStorage.getItem('exo:avatar:' + ME_ID) || undefined} />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{ME.name}</div>
          <div className="sidebar-user-tier" style={{ color: TIERS[ME.tier].color }}>
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
      </nav>

      <div className="sidebar-footer">
        <button title="Notifications" onClick={() => onNavigate('notifications')}>
          <i className="fa-solid fa-bell" />
          {notifs.hasUnread && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
        </button>
        <button title="Settings" onClick={() => onNavigate('settings')}><i className="fa-solid fa-gear" /></button>
        <button title="Log out" onClick={onSignOut}><i className="fa-solid fa-right-from-bracket" /></button>
      </div>
    </aside>
    </>
  );
}

function Topbar({ crumbs, onNavigate, onMenuToggle }) {
  const userId = typeof ME_ID !== 'undefined' ? ME_ID : null;
  const notifs = userId && window.useNotifications ? window.useNotifications(userId) : { hasUnread: false };
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
      <button className="hamburger-btn" onClick={onMenuToggle} title="Menu">
        <i className="fa-solid fa-bars" />
      </button>
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
        <span>{COHORT.code}</span>
        <span style={{ color: 'var(--off-white-20)' }}>·</span>
        <span>WK {COHORT.week}/{COHORT.weekTotal}</span>
        <span style={{ color: 'var(--off-white-20)' }}>·</span>
        <span>{time} SGT</span>
        <button onClick={() => onNavigate && onNavigate('notifications')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--off-white-68)', position: 'relative', padding: '0 6px' }}
                title="Notifications">
          <i className="fa-solid fa-bell" />
          {notifs.hasUnread && <span style={{ position: 'absolute', top: -2, right: 0, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
        </button>
        <span className="topbar-live"><span className="pulse" /> LIVE</span>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar });
