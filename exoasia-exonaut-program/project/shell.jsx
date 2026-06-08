// Shell: sidebar, topbar, app frame

const THEME_KEY = 'exo:theme';
const themeListeners = new Set();
let activeTheme = getStoredTheme();

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  activeTheme = next;
  document.body.dataset.theme = next;
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  themeListeners.forEach(fn => fn(next));
}

function useThemeMode() {
  const [theme, setTheme] = React.useState(activeTheme);
  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  React.useEffect(() => {
    themeListeners.add(setTheme);
    return () => themeListeners.delete(setTheme);
  }, []);
  const toggleTheme = React.useCallback(() => {
    setTheme(current => current === 'dark' ? 'light' : 'dark');
  }, []);
  return { theme, isDark: theme === 'dark', toggleTheme };
}

function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useThemeMode();
  return (
    <button
      className={compact ? 'theme-toggle compact' : 'theme-toggle'}
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      <i className={'fa-solid ' + (isDark ? 'fa-sun' : 'fa-moon')} />
      {!compact && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
}

function Sidebar({ current, onNavigate, onSignOut, mobileOpen = false, onMobileClose }) {
  const { profile } = useCurrentUserProfile();
  const { unreadCount } = useNotifications(profile);
  const { unreadCount: messageUnread } = useMessages(profile);
  useCrownState();
  const crown = window.__crownStore.getUserCrown(profile.id);
  const displayName = profile.fullName || ME.name;
  const { total: livePoints } = useComputedPoints(profile.id);
  const missions = useMissions();
  useSubs();
  useManualCredits();
  const rowsFromProfiles = useSupabaseExonautRows();
  const rankedRows = React.useMemo(
    () => window.rankExonautRows ? window.rankExonautRows(rowsFromProfiles) : [...rowsFromProfiles].sort((a,b) => b.points - a.points).map((u, i) => ({ ...u, cohortRank: i + 1 })),
    [rowsFromProfiles]
  );
  const liveRank = rankedRows.find(u => u.id === profile.id)?.cohortRank || 1;
  const tier = window.getTierKeyForPoints ? window.getTierKeyForPoints(livePoints) : (livePoints >= 300 ? 'prime' : livePoints >= 100 ? 'builder' : 'entry');
  const myTrack = profile.trackCode || ME.track || 'AIS';
  const myCohort = profile.cohortId || ME.cohort || 'c2627';
  const activeTrackCount = missions.filter(m =>
    (m.cohortId || 'c2627') === myCohort &&
    (!m.track || m.track === myTrack) &&
    window.getSubmissionForMission?.(m, profile.id, myCohort)?.state !== 'approved'
  ).length;
  const me = [
    { id: 'profile',     label: 'My Profile',  icon: 'fa-id-badge' },
    { id: 'messages',    label: 'Messages',    icon: 'fa-envelope', count: messageUnread },
    { id: 'exonaut-guide', label: 'Exonaut Guide', icon: 'fa-book-open' },
  ];
  const links = [
    { id: 'dashboard',   label: 'Dashboard',   icon: 'fa-gauge-high' },
    { id: 'missions',    label: 'Track',       icon: 'fa-bullseye', count: activeTrackCount },
    { id: 'projects',    label: 'Projects',    icon: 'fa-diagram-project' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-ranking-star' },
    { id: 'credentials', label: 'Badges', icon: 'fa-medal' },
  ];
  const ops = [
    { id: 'community',   label: 'Community',    icon: 'fa-users' },
    { id: 'kudos',       label: 'Kudos',        icon: 'fa-hand-sparkles' },
    { id: 'rituals',     label: 'Rituals',      icon: 'fa-calendar-check' },
    { id: 'announce',    label: 'Announcements',icon: 'fa-bullhorn' },
    { id: 'alumni',      label: 'Alumni Corps', icon: 'fa-user-astronaut' },
  ];
  const trackOps = [
    { id: 'lead-home',      label: 'Track Command', icon: 'fa-satellite-dish' },
    { id: 'lead-queue',     label: 'Review Queue',  icon: 'fa-clipboard-check' },
    { id: 'lead-roster',    label: 'Roster',        icon: 'fa-users' },
    { id: 'lead-manual-credit', label: 'Manual Credit', icon: 'fa-clipboard-check' },
    { id: 'lead-announce',  label: 'Announce', icon: 'fa-bullhorn' },
    { id: 'crown-pass',     label: 'Pass Crown',    icon: 'fa-crown' },
  ];

  return (
    <aside id="application-navigation" className={'sidebar' + (mobileOpen ? ' mobile-open' : '')} aria-label="Application navigation">
      <button type="button" className="sidebar-mobile-close" onClick={onMobileClose} aria-label="Close navigation menu">
        <i className="fa-solid fa-xmark" />
      </button>
      <div className="sidebar-brand">
        <div className="sidebar-logo">EXOASIA</div>
        <div className="sidebar-tag">EXONAUT PORTAL · v2.0</div>
      </div>
      <button type="button" className="sidebar-user" onClick={() => onNavigate('profile')} style={{ cursor: 'pointer' }}>
        <AvatarWithRing name={displayName} avatarUrl={profile.avatarUrl} size={36} tier={tier} />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-tier" style={{ color: TIERS[tier].color }}>
            {TIERS[tier].short} · #{liveRank}
          </div>
        </div>
      </button>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-section">Me</div>
        {me.map(l => (
          <button type="button" key={l.id}
               className={'sidebar-link' + (current === l.id ? ' active' : '')}
               onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
            {l.count ? <span className="badge-count">{l.count}</span> : null}
          </button>
        ))}
        <div className="sidebar-nav-section">Program</div>
        {links.map(l => (
          <button type="button" key={l.id}
               className={'sidebar-link' + (current === l.id || (l.id === 'projects' && ['first-projects', 'project-tasks'].includes(current)) ? ' active' : '')}
               onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
            {l.count ? <span className="badge-count">{l.count}</span> : null}
          </button>
        ))}
        <div className="sidebar-nav-section">Culture</div>
        {ops.map(l => (
          <button type="button" key={l.id}
               className={'sidebar-link' + (current === l.id ? ' active' : '')}
               onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
          </button>
        ))}
        <div className="sidebar-nav-section">Resources</div>
        <button type="button" className={'sidebar-link' + (current === 'knowledge-base' ? ' active' : '')} onClick={() => onNavigate('knowledge-base')}>
          <i className="fa-solid fa-book-open" />
          <span>Knowledge Base</span>
        </button>
        <button type="button" className={'sidebar-link' + (current === 'launchpad' ? ' active' : '')} onClick={() => onNavigate('launchpad')}>
          <i className="fa-solid fa-rocket" />
          <span>Launchpad</span>
        </button>
        {crown && (
          <>
            <div className="sidebar-nav-section" style={{ color: 'var(--platinum)' }}>
              Track Ops · {(TRACKS.find(t => t.code === crown.trackCode)?.short || crown.trackCode)}
            </div>
            {trackOps.map(l => (
              <button type="button" key={l.id}
                   className={'sidebar-link' + (current === l.id ? ' active' : '')}
                   onClick={() => onNavigate(l.id)}>
                <i className={'fa-solid ' + l.icon} />
                <span>{l.label}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button title="Notifications" onClick={() => onNavigate('notifications')}>
          <i className="fa-solid fa-bell" />
          {unreadCount > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
        </button>
        <ThemeToggle compact />
        <button title="Settings" onClick={() => onNavigate('settings')}><i className="fa-solid fa-gear" /></button>
        <button title="Log out" onClick={onSignOut}><i className="fa-solid fa-right-from-bracket" /></button>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, onNavigate, onMenuOpen, menuOpen = false }) {
  const { profile } = useCurrentUserProfile();
  useCohort();
  const { unreadCount } = useNotifications(profile);
  const cohort = window.getActiveCohort?.(profile) || COHORT;
  const timeline = window.getCohortTimeline?.(cohort);
  const week = timeline?.valid ? timeline.currentWeek : COHORT.week;
  const weekTotal = timeline?.valid ? timeline.totalWeeks : (window.getCohortWeekTotal?.(cohort) || COHORT.weekTotal);
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
      <button type="button" className="topbar-menu-btn" onClick={onMenuOpen} aria-label="Open navigation menu" aria-controls="application-navigation" aria-expanded={menuOpen}>
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
        <span>{cohort?.code || COHORT.code}</span>
        <span style={{ color: 'var(--off-white-20)' }}>·</span>
        <span>WK {week}/{weekTotal}</span>
        <span style={{ color: 'var(--off-white-20)' }}>·</span>
        <span>{time} SGT</span>
        <button onClick={() => onNavigate && onNavigate('notifications')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--off-white-68)', position: 'relative', padding: '0 6px' }}
                title="Notifications">
          <i className="fa-solid fa-bell" />
          {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: 0, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
        </button>
        <ThemeToggle compact />
        <span className="topbar-live"><span className="pulse" /> LIVE</span>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, ThemeToggle, useThemeMode, applyTheme });
