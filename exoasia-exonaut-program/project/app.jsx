// Main App — routing, state, tweaks, celebrations, auth, multi-role

function App() {
  const { profile: currentProfile } = useCurrentUserProfile();
  const crownState = useCrownState();
  const currentCrown = window.__crownStore.getUserCrown(currentProfile.id);
  const hasTrackOps = !!currentCrown;
  const crownsLoaded = crownState.loaded;
  const normalizeRole = (role) => role === 'lead' ? 'exonaut' : (role || 'exonaut');
  const currentProfileName = currentProfile.fullName || ME.name;
  const [authStage, setAuthStage] = React.useState(() => localStorage.getItem('exo:auth') || 'login');
  const [roleView, setRoleView] = React.useState(() => normalizeRole(currentProfile.role));
  const [route, setRoute] = React.useState(() => localStorage.getItem('exo:route') || 'dashboard');
  const [missionId, setMissionId] = React.useState(() => localStorage.getItem('exo:mission') || null);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [celebration, setCelebration] = React.useState(null);
  const [kudosOpen, setKudosOpen] = React.useState(false);
  const [toasts, setToasts] = React.useState([]);
  const [tweaks, setTweaks] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('exo:tweaks')) || {}; } catch { return {}; }
  });
  const ExtrasCelebration = window.Celebration || (() => null);
  const ExtrasKudosModal = window.KudosModal || (() => null);
  const ExtrasToastStack = window.ToastStack || (() => null);
  const ExtrasTweaksFab = window.TweaksFab || (() => null);
  const ExtrasTweaksPanel = window.TweaksPanel || (() => null);

  const mergedTweaks = {
    density: 'default', accent: 'lime', dashVariant: 'default',
    ritualStyle: 'cards', badgeShape: 'geom', ...tweaks,
  };

  React.useEffect(() => {
    document.body.dataset.density = mergedTweaks.density;
    document.body.dataset.accent = mergedTweaks.accent;
    const accentMap = { lime: '#C9F24A', platinum: '#7FE3FF', lavender: '#C6B8FF' };
    document.documentElement.style.setProperty('--lime', accentMap[mergedTweaks.accent]);
  }, [mergedTweaks.density, mergedTweaks.accent]);

  React.useEffect(() => { localStorage.setItem('exo:route', route); }, [route]);
  React.useEffect(() => { if (missionId) localStorage.setItem('exo:mission', missionId); }, [missionId]);
  React.useEffect(() => { localStorage.setItem('exo:tweaks', JSON.stringify(tweaks)); }, [tweaks]);
  React.useEffect(() => { localStorage.setItem('exo:auth', authStage); }, [authStage]);

  React.useEffect(() => {
    let active = true;
    async function restoreSupabaseSession() {
      if (!window.__db || !window.__db.auth) return;
      if (localStorage.getItem('exo:auth') === 'onboarding') return;
      const sessionResult = await window.__db.auth.getSession();
      const session = sessionResult && sessionResult.data && sessionResult.data.session;
      const user = session && session.user;
      if (!active) return;
      if (!user) {
        setAuthStage('login');
        return;
      }

      const profileResult = await window.__db
        .from('user_profiles')
        .select('role, full_name, cohort_id, track_code')
        .eq('id', user.id)
        .single();

      if (!active || profileResult.error || !profileResult.data || !profileResult.data.role) return;

      const profile = profileResult.data;
      const restoredRole = normalizeRole(profile.role);
      const needsReload = localStorage.getItem('exo:userId') !== user.id;
      localStorage.setItem('exo:userId', user.id);
      localStorage.setItem('exo:route', homeForRole(restoredRole));
      localStorage.setItem('exo:auth', 'app');
      if (needsReload) {
        location.reload();
        return;
      }
      setRoleView(restoredRole);
      setRoute(homeForRole(restoredRole));
      setAuthStage('app');
    }

    restoreSupabaseSession();
    return () => { active = false; };
  }, []);

  const navigate = (id) => {
    setRoute(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMission = (id) => {
    setMissionId(id);
    setRoute('mission');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pushToast = (t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4200);
  };

  const onCelebrate = (kind, payload = {}) => setCelebration({ kind, payload });

  // Auto-issue milestone badges when the Exonaut's total crosses thresholds.
  useAutoBadgeFire(onCelebrate);

  React.useEffect(() => { window.__openKudos = () => setKudosOpen(true); }, []);

  const homeForRole = (role) => {
    if (role === 'lead') return 'lead-home';
    if (role === 'commander') return 'cmdr-home';
    if (role === 'admin') return 'pa-cohorts';
    return 'dashboard';
  };

  const routeAllowedForRole = (role, routeId) => {
    const exonautRoutes = ['dashboard', 'leaderboard', 'profile', 'mission', 'missions', 'credentials', 'projects', 'first-projects', 'project-tasks', 'community', 'kudos', 'rituals', 'announce', 'notifications', 'alumni', 'settings'];
    const trackOpsRoutes = ['lead-home', 'lead-roster', 'lead-queue', 'lead-grade', 'lead-announce', 'lead-removals', 'crown-pass'];
    const leadRoutes = ['lead-home', 'lead-roster', 'lead-queue', 'lead-grade', 'lead-announce', 'lead-removals', 'lead-projects', 'lead-project-tasks', 'lead-profile', 'community', 'kudos', 'notifications', 'settings'];
    const commanderRoutes = ['cmdr-home', 'cmdr-profile', 'cmdr-leads', 'cmdr-projects', 'cmdr-exonauts', 'cmdr-esc', 'cmdr-health', 'cmdr-eow', 'cmdr-crowns', 'cmdr-removals', 'cmdr-announce', 'community', 'kudos', 'notifications', 'settings'];
    const adminRoutes = ['pa-cohorts', 'pa-missions', 'pa-projects', 'pa-managers', 'pa-assign', 'pa-users', 'pa-console', 'pa-removals', 'pa-announce', 'pa-profile', 'community', 'kudos', 'notifications', 'settings'];
    const routeBase = (routeId || '').split(':')[0];
    if (role === 'lead') return leadRoutes.includes(routeBase);
    if (role === 'commander') return commanderRoutes.includes(routeBase);
    if (role === 'admin') return adminRoutes.includes(routeBase);
    return exonautRoutes.includes(routeBase) || ((hasTrackOps || !crownsLoaded) && trackOpsRoutes.includes(routeBase));
  };

  React.useEffect(() => {
    const supabaseRole = normalizeRole(currentProfile.role);
    if (authStage !== 'app') return;
    if (roleView !== supabaseRole) {
      setRoleView(supabaseRole);
      return;
    }
    if (supabaseRole === 'admin' && route === 'pa-crowns') {
      setRoute('pa-managers');
      return;
    }
    if (!routeAllowedForRole(supabaseRole, route)) {
      setRoute(homeForRole(supabaseRole));
    }
  }, [authStage, currentProfile.role, roleView, route, hasTrackOps, crownsLoaded]);

  const handleAuthenticated = ({ role, isNewExonaut, user, profile }) => {
    const nextRole = normalizeRole(role);
    const nextRoute = homeForRole(nextRole);
    const nextAuth = isNewExonaut ? 'onboarding' : 'app';
    if (user && user.id) localStorage.setItem('exo:userId', user.id);
    localStorage.setItem('exo:route', nextRoute);
    localStorage.setItem('exo:auth', nextAuth);
    location.reload();
  };

  const signOut = () => {
    if (window.__db && window.__db.auth && window.__db.auth.signOut) window.__db.auth.signOut();
    setAuthStage('login');
    setRoleView('exonaut');
    setRoute('dashboard');
    localStorage.removeItem('exo:auth');
    localStorage.removeItem('exo:route');
    localStorage.removeItem('exo:userId');
  };

  if (authStage === 'login') {
    return <LoginScreen onAuthComplete={handleAuthenticated} />;
  }
  if (authStage === 'onboarding') {
    return <Onboarding onComplete={() => { setRoleView('exonaut'); setAuthStage('app'); setRoute('dashboard'); }} />;
  }

  // ======= ROLE-SPECIFIC CRUMBS =======
  const crumbMap = {
    // Exonaut
    dashboard:   ['EXONAUT', 'Dashboard'],
    leaderboard: ['EXONAUT', 'Leaderboard'],
    profile:     ['EXONAUT', 'Profile', currentProfileName],
    mission:     ['EXONAUT', 'Track', missionId || ''],
    missions:    ['EXONAUT', 'Track'],
    credentials: ['EXONAUT', 'Certificates & Badges'],
    projects: ['PROJECTS', 'Assigned Projects'],
    'first-projects': ['PROJECTS', 'Project Lead Board'],
    'project-tasks': ['PROJECTS', 'Project Tasks'],
    community:   ['EXONAUT', 'Community'],
    kudos:       ['EXONAUT', 'Kudos'],
    rituals:     ['EXONAUT', 'Rituals'],
    announce:    ['EXONAUT', 'Announcements'],
    notifications: ['EXONAUT', 'Notifications'],
    alumni:      ['EXONAUT', 'Alumni Corps'],
    settings:    ['EXONAUT', 'Settings'],
    // Lead
    'lead-home':   ['LEAD', 'Track Command', 'AI Strategy'],
    'lead-roster': ['LEAD', 'Roster'],
    'lead-queue':  ['LEAD', 'Review Queue'],
    'lead-grade':  ['LEAD', 'Grade Submission'],
    'lead-announce': ['LEAD', 'Announcements'],
    'lead-projects': ['LEAD', 'Projects'],
    'lead-project-tasks': ['LEAD', 'Project Tasks'],
    'lead-removals': ['TRACK OPS', 'Removals'],
    'crown-pass': ['TRACK OPS', 'Pass the Crown'],
    'lead-profile': ['LEAD', 'Profile'],
    // Commander
    'cmdr-home':   ['COMMANDER', 'Command Bridge'],
    'cmdr-profile': ['COMMANDER', 'Profile'],
    'cmdr-leads':  ['COMMANDER', 'Track Progress'],
    'cmdr-projects': ['COMMANDER', 'Project Progress'],
    'cmdr-exonauts': ['COMMANDER', 'Exonauts'],
    'cmdr-esc':    ['COMMANDER', 'Escalations'],
    'cmdr-health': ['COMMANDER', 'Cohort Health'],
    'cmdr-eow':    ['COMMANDER', 'Exonaut of the Week'],
    'cmdr-crowns': ['COMMANDER', 'Crown Transfers'],
    'cmdr-removals': ['COMMANDER', 'Removal Approvals'],
    'cmdr-announce': ['COMMANDER', 'Announcements'],
    // Platform Admin
    'pa-cohorts':  ['PLATFORM ADMIN', 'Cohort Management'],
    'pa-missions': ['PLATFORM ADMIN', 'Track Creation'],
    'pa-projects': ['PLATFORM ADMIN', 'Project Builder'],
    'pa-managers': ['PLATFORM ADMIN', 'Track Management'],
    'pa-assign':   ['PLATFORM ADMIN', 'Exonaut Assignment'],
    'pa-users':    ['PLATFORM ADMIN', 'User Directory'],
    'pa-console':  ['PLATFORM ADMIN', 'System Console'],
    'pa-removals': ['PLATFORM ADMIN', 'Removal Execution'],
    'pa-announce': ['PLATFORM ADMIN', 'Announcements'],
    'pa-profile':  ['PLATFORM ADMIN', 'Profile'],
  };

  let page, sidebar;

  if (roleView === 'exonaut') {
    const gradeMatch = route.startsWith('lead-grade');
    const subId = gradeMatch && route.includes(':') ? route.split(':')[1] : null;
    sidebar = <Sidebar current={route} onNavigate={navigate} onSignOut={signOut} />;
    if (route === 'dashboard')        page = <Dashboard onNavigate={navigate} onOpenMission={openMission} />;
    else if (route === 'leaderboard') page = <Leaderboard onBack={() => navigate('dashboard')} />;
    else if (route === 'profile')     page = <Profile onOpenMission={openMission} onTriggerBadge={(b) => onCelebrate('badge', { badge: b })} />;
    else if (route === 'mission')     page = <MissionDetail missionId={missionId} onBack={() => navigate('missions')} onSubmitted={() => pushToast({ title: 'SUBMISSION RECEIVED', sub: 'Track Lead has 48h to review', icon: 'fa-paper-plane' })} />;
    else if (route === 'missions') {
      const MissionsComponent = window.MissionsList;
      page = MissionsComponent
        ? <MissionsComponent onOpenMission={openMission} />
        : <div className="enter"><div className="card-panel" style={{ padding: 32 }}>Loading track tasks...</div></div>;
    }
    else if (route === 'credentials') page = <CertificatesBadgesPage />;
    else if (route === 'projects') page = <ProjectsPage />;
    else if (route === 'first-projects') page = <FirstOfficerProjectsPage />;
    else if (route === 'project-tasks') page = <ProjectTasksPage />;
    else if (route === 'community')   page = <CommunityPage />;
    else if (route === 'kudos')       page = <KudosFeed onGive={() => setKudosOpen(true)} />;
    else if (route === 'rituals')     page = <RitualsPage />;
    else if (route === 'announce')    page = <AnnouncementsPage />;
    else if (route === 'notifications') page = <NotificationsPage />;
    else if (route === 'alumni')      page = <AlumniPage />;
    else if (route === 'settings')    page = <SettingsPage />;
    else if (hasTrackOps && route === 'lead-home') page = <LeadHome onNavigate={navigate} />;
    else if (hasTrackOps && route === 'lead-roster') page = <LeadRoster />;
    else if (hasTrackOps && route === 'lead-queue') page = <LeadQueue onNavigate={navigate} />;
    else if (hasTrackOps && route === 'lead-announce') page = <LeadAnnounce />;
    else if (hasTrackOps && route === 'lead-removals') page = <LeadRemovalsPanel />;
    else if (hasTrackOps && route === 'crown-pass') page = <PassTheCrownPage />;
    else if (hasTrackOps && gradeMatch) page = <LeadGrade subId={subId} onBack={() => navigate('lead-queue')} />;
    else                              page = <Dashboard onNavigate={navigate} onOpenMission={openMission} />;
  } else if (roleView === 'lead') {
    const gradeMatch = route.startsWith('lead-grade');
    const subId = gradeMatch && route.includes(':') ? route.split(':')[1] : null;
    const _r = gradeMatch ? 'lead-grade' : route;
    sidebar = <LeadSidebar current={_r} onNavigate={navigate} onSignOut={signOut} />;
    if (route === 'lead-home')        page = <LeadHome onNavigate={navigate} />;
    else if (route === 'lead-roster') page = <LeadRoster />;
    else if (route === 'lead-queue')  page = <LeadQueue onNavigate={navigate} />;
    else if (route === 'lead-announce') page = <LeadAnnounce />;
    else if (route === 'lead-removals') page = <LeadRemovalsPanel />;
    else if (route === 'lead-projects') page = <ProjectsPage />;
    else if (route === 'lead-project-tasks') page = <ProjectTasksPage />;
    else if (route === 'lead-profile') page = <RoleProfile roleKey="lead" />;
    else if (route === 'community')   page = <CommunityPage />;
    else if (route === 'kudos')       page = <KudosFeed onGive={() => setKudosOpen(true)} />;
    else if (route === 'notifications') page = <NotificationsPage />;
    else if (route === 'settings')    page = <SettingsPage />;
    else if (gradeMatch)              page = <LeadGrade subId={subId} onBack={() => navigate('lead-queue')} />;
    else                              page = <LeadHome onNavigate={navigate} />;
  } else if (roleView === 'commander') {
    sidebar = <CommanderSidebar current={route} onNavigate={navigate} onSignOut={signOut} />;
    if (route === 'cmdr-home')        page = <CommanderHome onNavigate={navigate} />;
    else if (route === 'cmdr-leads')  page = <CommanderLeads />;
    else if (route === 'cmdr-projects') page = <CommanderProjectProgress />;
    else if (route === 'cmdr-exonauts') page = <CommanderExonauts />;
    else if (route === 'cmdr-esc')    page = <CommanderEscalations />;
    else if (route === 'cmdr-health') page = <CommanderHealth />;
    else if (route === 'cmdr-eow')    page = <CommanderEOW />;
    else if (route === 'cmdr-crowns') page = <CommanderCrownTransfers />;
    else if (route === 'cmdr-removals') page = <CommanderRemovalsPage />;
    else if (route === 'cmdr-announce') page = <CommanderAnnounce />;
    else if (route === 'cmdr-profile') page = <RoleProfile roleKey="commander" />;
    else if (route === 'community')   page = <CommunityPage />;
    else if (route === 'kudos')       page = <KudosFeed onGive={() => setKudosOpen(true)} />;
    else if (route === 'notifications') page = <NotificationsPage />;
    else if (route === 'settings')    page = <SettingsPage />;
    else                              page = <CommanderHome onNavigate={navigate} />;
  } else if (roleView === 'admin') {
    sidebar = <PlatformAdminSidebar current={route} onNavigate={navigate} onSignOut={signOut} />;
    if (route === 'pa-cohorts')      page = <AdminCohorts />;
    else if (route === 'pa-missions') page = <AdminMissionBuilder />;
    else if (route === 'pa-projects') page = <ProjectBuilderPage />;
    else if (route === 'pa-managers') page = <AdminTrackControl />;
    else if (route === 'pa-assign')  page = <AdminAssign />;
    else if (route === 'pa-users')   page = <AdminUsers />;
    else if (route === 'pa-console') page = <AdminPanel />;
    else if (route === 'pa-removals') page = <AdminRemovalsPage />;
    else if (route === 'pa-announce') page = <AdminAnnounce />;
    else if (route === 'pa-profile') page = <RoleProfile roleKey="admin" />;
    else if (route === 'community')  page = <CommunityPage />;
    else if (route === 'kudos')      page = <KudosFeed onGive={() => setKudosOpen(true)} />;
    else if (route === 'notifications') page = <NotificationsPage />;
    else if (route === 'settings')   page = <SettingsPage />;
    else                             page = <AdminCohorts />;
  }

  return (
    <div className="app-shell hud-bg">
      {sidebar}
      <main className="main">
        <Topbar crumbs={crumbMap[route] || ['EXONAUT']} onNavigate={navigate} />
        <div className="content" style={{ paddingTop: 48 }}>{page}</div>
      </main>

      {celebration && <ExtrasCelebration kind={celebration.kind} payload={celebration.payload} onClose={() => setCelebration(null)} />}
      {kudosOpen && <ExtrasKudosModal onClose={() => setKudosOpen(false)}
                                onSent={(k) => { pushToast({ title: 'KUDOS SENT', sub: `+${Number(k.giverPoints || 0)} to you · +${Number(k.receiverPoints || 0.25)} to ${k.recipientName || 'recipient'}`, icon: 'fa-hand-sparkles' }); }} />}
      <ExtrasToastStack toasts={toasts} />

      <ExtrasTweaksFab onClick={() => setTweaksOpen(v => !v)} />
      <ExtrasTweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)}
                   tweaks={mergedTweaks}
                   setTweak={(k, v) => setTweaks(t => ({ ...t, [k]: v }))}
                   onCelebrate={onCelebrate} />

      {roleView !== 'login' && (
        <button onClick={() => setKudosOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 80, zIndex: 140,
            background: 'var(--lime)', color: 'var(--bg-deep)',
            border: 'none', borderRadius: '50%', width: 48, height: 48,
            display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700,
            boxShadow: 'var(--lime-glow)', cursor: 'pointer',
          }} title="Give Kudos">
          <i className="fa-solid fa-hand-sparkles" />
        </button>
      )}
    </div>
  );
}

// ========== Role-specific sidebars ==========
function LeadSidebar({ current, onNavigate, onSignOut }) {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  useProjects();
  const isFirstOfficer = window.__projectStore.userIsFirstOfficer(profile.id);
  const hasProjectTasks = window.__projectStore.firstOfficerTasks(profile.id).length > 0;
  const displayName = profile.fullName || 'Mission Lead';
  const allSubs = useSubs();
  React.useEffect(() => { window.refreshSubs?.(); }, []);
  const lead = LEADS.find(l => l.track === profile.trackCode) || LEADS.find(l => l.id === 'lead-ais') || LEADS[0];
  const leadTrack = profile.trackCode || 'AIS';
  const myExonautIds = new Set((profiles || [])
    .filter(p => p.role === 'exonaut' && (p.trackCode || 'AIS') === leadTrack && (!profile.cohortId || (p.cohortId || 'c2627') === profile.cohortId))
    .map(p => p.id));
  const pendingCount = allSubs.filter(s => {
    if (s.state !== 'pending') return false;
    if (myExonautIds.has(s.exonautId)) return true;
    const mission = window.__missionStore?.all?.().find(m => m.id === s.missionId);
    const missionTrack = mission?.track || mission?.trackCode || '';
    return !missionTrack || missionTrack === leadTrack;
  }).length;
  const me = [
    { id: 'lead-profile', label: 'My Profile', icon: 'fa-id-badge' },
    { id: 'community',   label: 'Community',     icon: 'fa-users-rectangle' },
  ];
  const links = [
    { id: 'lead-home',   label: 'Track Command', icon: 'fa-satellite-dish' },
    { id: 'lead-queue',  label: 'Review Queue',  icon: 'fa-clipboard-check', count: pendingCount },
    { id: 'lead-roster', label: 'Roster',        icon: 'fa-users' },
    { id: 'lead-projects', label: 'Projects',    icon: 'fa-diagram-project' },
    ...(isFirstOfficer || hasProjectTasks ? [{ id: 'lead-project-tasks', label: 'Project Tasks', icon: 'fa-list-check' }] : []),
    { id: 'lead-announce', label: 'Announcements', icon: 'fa-bullhorn' },
    { id: 'kudos',       label: 'Kudos',         icon: 'fa-hand-sparkles' },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">EXOASIA</div>
        <div className="sidebar-tag" style={{ color: 'var(--platinum)' }}>LEAD CONSOLE · v2.0</div>
      </div>
      <div className="sidebar-user" style={{ cursor: 'pointer' }} onClick={() => onNavigate('lead-profile')} title="Open my profile">
        <AvatarWithRing name={displayName} avatarUrl={profile.avatarUrl} size={36} tier="corps" />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-tier" style={{ color: 'var(--platinum)' }}>MANAGER · AI-STRAT</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-nav-section">Me</div>
        {me.map(l => (
          <div key={l.id} className={'sidebar-link' + (current === l.id ? ' active' : '')} onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="sidebar-nav-section">Track Ops</div>
        {links.map(l => (
          <div key={l.id} className={'sidebar-link' + (current === l.id ? ' active' : '')} onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
            {l.count ? <span className="badge-count">{l.count}</span> : null}
          </div>
        ))}
        <div className="sidebar-nav-section">Oversight</div>
        <div className="sidebar-link" style={{ opacity: 0.55, cursor: 'not-allowed' }}>
          <i className="fa-solid fa-arrow-up" style={{ color: 'var(--amber)' }} />
          <span>Reports to Commander</span>
        </div>
      </nav>
      <div className="sidebar-footer">
        <button title="Notifications" onClick={() => onNavigate('notifications')}><i className="fa-solid fa-bell" /><span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--platinum)' }} /></button>
        <button title="Settings" onClick={() => onNavigate('settings')}><i className="fa-solid fa-gear" /></button>
        <button title="Log out" onClick={onSignOut}><i className="fa-solid fa-right-from-bracket" /></button>
      </div>
    </aside>
  );
}

function CommanderSidebar({ current, onNavigate, onSignOut }) {
  const { profile } = useCurrentUserProfile();
  const escalations = useEscalations();
  const displayName = profile.fullName || 'Mission Commander';
  const me = [
    { id: 'cmdr-profile', label: 'My Profile', icon: 'fa-id-badge' },
    { id: 'community',     label: 'Community',      icon: 'fa-users-rectangle' },
  ];
  const links = [
    { id: 'cmdr-home',     label: 'Command Bridge', icon: 'fa-tower-observation' },
    { id: 'cmdr-leads',    label: 'Track Progress', icon: 'fa-chart-line' },
    { id: 'cmdr-projects', label: 'Project Progress', icon: 'fa-diagram-project' },
    { id: 'cmdr-exonauts', label: 'Exonauts',       icon: 'fa-user-astronaut' },
    { id: 'cmdr-esc',      label: 'Escalations',    icon: 'fa-triangle-exclamation', count: escalations.length },
    { id: 'cmdr-health',   label: 'Cohort Health',  icon: 'fa-heart-pulse' },
    { id: 'cmdr-eow',      label: 'Exonaut of Week', icon: 'fa-trophy' },
    { id: 'cmdr-crowns',   label: 'Crown Transfers', icon: 'fa-crown' },
    { id: 'cmdr-removals', label: 'Removals',        icon: 'fa-user-slash' },
    { id: 'cmdr-announce', label: 'Announcements', icon: 'fa-bullhorn' },
    { id: 'kudos',         label: 'Kudos',          icon: 'fa-hand-sparkles' },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">EXOASIA</div>
        <div className="sidebar-tag" style={{ color: 'var(--amber)' }}>COMMAND · v2.0</div>
      </div>
      <div className="sidebar-user" style={{ cursor: 'pointer' }} onClick={() => onNavigate('cmdr-profile')} title="Open my profile">
        <AvatarWithRing name={displayName} avatarUrl={profile.avatarUrl} size={36} tier="corps" />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-tier" style={{ color: 'var(--amber)' }}>DIRECTOR · FOUNDER</div>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="sidebar-nav-section">Me</div>
        {me.map(l => (
          <div key={l.id} className={'sidebar-link' + (current === l.id ? ' active' : '')} onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} />
            <span>{l.label}</span>
          </div>
        ))}
      </nav>

      <CohortSwitcher />

      <nav className="sidebar-nav">
        <div className="sidebar-nav-section">Org View</div>
        {links.map(l => (
          <div key={l.id} className={'sidebar-link' + (current === l.id ? ' active' : '')} onClick={() => onNavigate(l.id)}>
            <i className={'fa-solid ' + l.icon} style={{ color: l.id === 'cmdr-esc' ? 'var(--red)' : undefined }} />
            <span>{l.label}</span>
            {l.count ? <span className="badge-count" style={{ background: 'var(--red)', color: 'white' }}>{l.count}</span> : null}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button title="Notifications" onClick={() => onNavigate('notifications')}><i className="fa-solid fa-bell" /><span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} /></button>
        <button title="Settings" onClick={() => onNavigate('settings')}><i className="fa-solid fa-gear" /></button>
        <button title="Log out" onClick={onSignOut}><i className="fa-solid fa-right-from-bracket" /></button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// CohortSwitcher — scopes every Commander view to a single cohort.
// Commander can pick from existing cohorts or spin up a new one.
// ---------------------------------------------------------------------------
function CohortSwitcher() {
  const { cohort, cohortId, all, setSelected } = useCohort();
  const [open, setOpen] = React.useState(false);

  const cohortUsers = USERS.filter(u => (u.cohort || 'c2627') === cohortId);
  const accent = cohort?.status === 'active' ? 'var(--lime)' : 'var(--lavender)';

  return (
    <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--off-white-07)' }}>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 8 }}>
        COHORT FILTER
      </div>

      {/* Current cohort button */}
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
            {cohort?.name || 'No cohort'}
          </div>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.06em', marginTop: 2 }}>
            {cohortUsers.length} EXONAUT{cohortUsers.length === 1 ? '' : 'S'} · {(cohort?.status || '').toUpperCase()}
          </div>
        </div>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--off-white-40)', fontSize: 10 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          marginTop: 6, padding: 4,
          background: 'var(--deep-black)', border: '1px solid var(--off-white-15)', borderRadius: 2,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {all.map(c => {
            const count = USERS.filter(u => (u.cohort || 'c2627') === c.id).length;
            const isActive = c.id === cohortId;
            const cAccent = c.status === 'active' ? 'var(--lime)' : c.status === 'upcoming' ? 'var(--sky)' : 'var(--lavender)';
            return (
              <div key={c.id}
                onClick={() => { setSelected(c.id); setOpen(false); }}
                style={{
                  padding: '8px 10px', borderRadius: 2, cursor: 'pointer',
                  background: isActive ? 'var(--off-white-07)' : 'transparent',
                  border: '1px solid ' + (isActive ? cAccent : 'transparent'),
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--off-white-07)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
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

          <div style={{ padding: '6px 10px 2px' }}>
            <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.08em', lineHeight: 1.4 }}>
              <i className="fa-solid fa-lock" style={{ marginRight: 4 }} />
              Cohort creation is managed by Platform Admin.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateCohortModal({ onClose, onCreate }) {
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
        width: 'min(440px, 100%)', padding: 0, borderColor: 'var(--ink)',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--ink)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            CREATE COHORT
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>New Batch</h2>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 4 }}>
            Spin up a cohort shell. Assign Exonauts from the roster later.
          </div>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <LabeledInput label="NAME" value={name} onChange={setName} placeholder="e.g. Batch 2027–2028" autoFocus />
          <LabeledInput label="CODE (OPTIONAL)" value={code} onChange={setCode} placeholder="e.g. EXO-B-2728" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <LabeledInput label="START" value={start} onChange={setStart} placeholder="OCT 05 2027" />
            <LabeledInput label="END" value={end} onChange={setEnd} placeholder="JAN 28 2028" />
          </div>
        </div>

        <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Cancel</button>
          <button onClick={save} disabled={!canSave} style={{
            padding: '9px 16px', background: canSave ? 'var(--ink)' : 'var(--off-white-15)',
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

function LabeledInput({ label, value, onChange, placeholder, autoFocus }) {
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

Object.assign(window, { LeadSidebar, CommanderSidebar });

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
