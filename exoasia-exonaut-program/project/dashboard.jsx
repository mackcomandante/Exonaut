// Dashboard screen — hero stats, pillars, rituals, missions, activity

function StatCell({ label, icon, value, unit, meta, metaDir, lime }) {
  return (
    <div className="stat-cell">
      <div className="stat-label"><i className={'fa-solid ' + icon} />{label}</div>
      <div className={'stat-value' + (lime ? ' lime' : '')}>
        <span>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {meta && (
        <div className="stat-meta">
          <span className={metaDir === 'up' ? 'up' : metaDir === 'down' ? 'down' : ''}>
            {metaDir === 'up' && <i className="fa-solid fa-caret-up" />}
            {metaDir === 'down' && <i className="fa-solid fa-caret-down" />}
            {' '}{meta}
          </span>
        </div>
      )}
    </div>
  );
}

function HeroStats() {
  const { profile } = useCurrentUserProfile();
  const { total: livePoints, delta: liveDelta } = useComputedPoints(profile.id);
  const liveBadges = useLiveBadges(profile.id);
  const missions = useMissions();
  const earnedCount = liveBadges.filter(b => b.earned).length;
  const subs = useSubs();
  const completed = subs.filter(s => s.exonautId === profile.id && s.state === 'approved').length;
  return (
    <div className="stat-grid card-hud">
      <StatCell label="TOTAL POINTS" icon="fa-bolt" value={livePoints} lime
        meta={liveDelta > 0 ? `AUTO · +${liveDelta} JUST GRADED` : 'AUTO · +85 THIS WEEK'} metaDir="up" />
      <StatCell label="RANK" icon="fa-ranking-star"
        value={`#${ME_RANK}`} unit={`of ${COHORT.size}`}
        meta="+3 vs LAST WK" metaDir="up" />
      <StatCell label="TIER" icon="fa-shield-halved"
        value="PRIME" unit={`·\u00A0${livePoints - TIERS.prime.min} over`}
        meta={`${Math.max(0, 600 - livePoints)} TO ELITE`} metaDir="flat" />
      <StatCell label="MISSIONS" icon="fa-bullseye"
        value={completed} unit={`of ${missions.length}`}
        meta={`${missions.filter(m => m.status !== 'approved').length} ACTIVE`} metaDir="flat" />
      <StatCell label="BADGES" icon="fa-medal"
        value={earnedCount} unit="of 22"
        meta="AUTO · SILVER STRATEGIST" metaDir="up" />
    </div>
  );
}

function PillarCard({ idx, klass, title, weight, current, max, caption, children }) {
  return (
    <div className={'pillar-card ' + klass}>
      <div className="pillar-head">
        <span className="pillar-idx">PILLAR {idx} · {weight}% WEIGHTED</span>
        <span className="pillar-weight">{caption}</span>
      </div>
      <h3 className="pillar-title">{title}</h3>
      <div className="pillar-score">
        <span className="num">{current}</span>
        <span className="max">/ {max} PTS</span>
      </div>
      <div className="pillar-bar"><div className="fill" style={{ width: `${(current / max) * 100}%` }} /></div>
      {children}
    </div>
  );
}

function PillarGrid() {
  const { profile } = useCurrentUserProfile();
  const { breakdown } = useUserPoints(profile.id);
  const missions = useMissions();
  const projectMissions = missions.filter(m => m.pillar === 'project').slice(0, 3);
  return (
    <div className="pillar-grid">
      <PillarCard idx="01" klass="p1" title="Project" weight={40}
        current={breakdown.project || 0} max={400} caption="40% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>RECENT SUBMISSIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {projectMissions.length === 0 && (
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-40)' }}>No project missions yet.</div>
          )}
          {projectMissions.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', gap: 8 }}>
              <span style={{ color: 'var(--off-white-68)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
              <span className={'status-pill status-' + (m.status === 'approved' ? 'approved' : m.status === 'in-progress' ? 'in-progress' : 'not-started')}>
                {m.status === 'approved' ? 'APPR' : m.status === 'in-progress' ? 'WIP' : 'NEW'}
              </span>
            </div>
          ))}
        </div>
      </PillarCard>

      <PillarCard idx="02" klass="p2" title="Client" weight={35}
        current={breakdown.client || 0} max={350} caption="35% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>CLIENT · KESTREL BIOTICS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1,2,3,4,5].map(i => (
              <i key={i} className={'fa-solid fa-star'} style={{ fontSize: 14, color: i <= 4 ? 'var(--platinum)' : 'var(--off-white-15)' }} />
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--off-white-68)' }}>4.0 / 5.0</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em' }}>
          LAST TOUCH · OCT 17 · 3D AGO
        </div>
      </PillarCard>

      <PillarCard idx="03" klass="p3" title="Recruitment" weight={25}
        current={breakdown.recruitment || 0} max={250} caption="25% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>PIPELINE STATUS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--lavender)', fontWeight: 700 }}>1</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--off-white-68)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CANDIDATE SUBMITTED</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => window.__openKudos?.()}>
          <i className="fa-solid fa-user-plus" /> ADD A RECRUIT
        </button>
      </PillarCard>
    </div>
  );
}

function RitualTracker() {
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-head">
        <h2>Weekly Ritual Tracker</h2>
        <span className="section-meta">WEEK {COHORT.week} · OCT 19 — OCT 25</span>
      </div>
      <div className="ritual-row">
        {RITUALS.map(r => {
          const iconCls =
            r.state === 'done' ? 'fa-circle-check' :
            r.state === 'missed' ? 'fa-circle-xmark' :
            'fa-circle-dot';
          const cCls = r.state === 'done' ? 'done-c' : r.state === 'missed' ? 'miss-c' : 'pend-c';
          return (
            <div key={r.id} className={'ritual-cell ' + r.state}>
              <div className="ritual-head">
                <div className="ritual-name">{r.name}</div>
                <i className={'fa-solid ' + iconCls + ' ritual-icon ' + cCls} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em' }}>
                {r.state === 'done' ? 'LOGGED' : r.state === 'missed' ? 'MISSED' : 'PENDING'}
              </div>
              <div className="ritual-points">+{r.points} PTS</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MissionFeed({ onOpenMission }) {
  const subs = useSubs();
  const { profile } = useCurrentUserProfile();
  const missions = useMissions();
  const myTrack = profile.trackCode || ME.track || 'AIS';
  const myCohort = profile.cohortId || ME.cohort || 'c2627';
  const [selectedWeek, setSelectedWeek] = React.useState(COHORT.week || 1);
  const scopedMissions = missions
    .filter(m => (m.cohortId || 'c2627') === myCohort && (!m.track || m.track === myTrack));
  const weekOptions = Array.from(new Set(scopedMissions.map(m => Number(m.week || 0)).filter(Boolean)))
    .sort((a, b) => a - b);
  const activeWeek = weekOptions.includes(selectedWeek)
    ? selectedWeek
    : (weekOptions.includes(COHORT.week) ? COHORT.week : weekOptions[0]);
  const upcoming = scopedMissions
    .filter(m => Number(m.week || 0) === activeWeek)
    .sort((a,b) => a.dueIn - b.dueIn);
  return (
    <div>
      <div className="section-head">
        <h2>Mission Feed</h2>
        <span className="section-meta">WEEK {String(activeWeek || COHORT.week).padStart(2, '0')} - {upcoming.length} MISSIONS</span>
      </div>
      {weekOptions.length > 0 && (
        <div className="lb-filters" style={{ marginBottom: 14 }}>
          {weekOptions.map(week => (
            <div
              key={week}
              className={'lb-filter' + (activeWeek === week ? ' active' : '')}
              onClick={() => setSelectedWeek(week)}
            >
              Week {String(week).padStart(2, '0')}
            </div>
          ))}
        </div>
      )}
      <div>
        {upcoming.length === 0 && (
          <div className="card-panel" style={{ padding: 32, textAlign: 'center' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 10 }} />
            <div className="t-heading" style={{ fontSize: 14, marginBottom: 6 }}>No missions for this week</div>
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
              Pick another week or wait for Platform Admin to publish this week's missions.
            </div>
          </div>
        )}
        {upcoming.map(m => {
          const mySub = subs.find(s => s.exonautId === profile.id && s.missionId === m.id);
          const liveStatus = mySub?.state === 'pending'
            ? 'submitted'
            : mySub?.state === 'approved'
              ? 'approved'
              : mySub?.state === 'needs-revision'
                ? 'needs-revision'
                : mySub?.state === 'rejected'
                  ? 'rejected'
                  : 'not-started';
          const isOverdue = m.dueIn < 0 && liveStatus !== 'approved';
          const statusMap = {
            'not-started': { cls: 'status-not-started', label: 'NOT STARTED', cta: 'START' },
            'in-progress': { cls: 'status-in-progress', label: 'IN PROGRESS', cta: 'CONTINUE' },
            'submitted':   { cls: 'status-submitted', label: 'SUBMITTED', cta: 'VIEW' },
            'needs-revision': { cls: 'status-needs-revision', label: 'NEEDS REVISION', cta: 'REVISE' },
            'rejected':    { cls: 'status-overdue', label: 'REJECTED', cta: 'REVISE' },
            'approved':    { cls: 'status-approved', label: 'COMPLETED', cta: 'VIEW' },
            'overdue':     { cls: 'status-overdue', label: 'OVERDUE', cta: 'SUBMIT NOW' },
          };
          const s = isOverdue ? statusMap.overdue : statusMap[liveStatus];
          const track = m.track ? TRACKS.find(t => t.code === m.track) : null;
          return (
            <div key={m.id} className="mission-row" onClick={() => onOpenMission(m.id)}>
              <div className="mission-meta">
                <div className="mission-id">{m.id}</div>
                <div className="mission-title">{m.title}</div>
                <div className="mission-sub">
                  {track ? track.short : 'ALL-COHORT'} · {m.pillar.toUpperCase()} · DUE {m.dueDate}
                  {isOverdue && <span style={{ color: 'var(--red)' }}> · OVERDUE {Math.abs(m.dueIn)}d</span>}
                </div>
              </div>
              <div className="mission-points"><span className="plus">+</span>{m.points}</div>
              <span className={'status-pill ' + s.cls}>{s.label}</span>
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOpenMission(m.id); }}>
                {s.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="card-panel">
      <div className="section-head" style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 16 }}>Activity</h2>
        <span className="section-meta">LAST 48H</span>
      </div>
      {ACTIVITY.map((a, i) => (
        <div key={i} className="activity-item">
          <div className={'activity-icon type-' + a.type}><i className={'fa-solid ' + a.icon} /></div>
          <div className="activity-body">
            <div dangerouslySetInnerHTML={{ __html: a.body }} />
            {a.sub && <div className="muted" style={{ marginTop: 2 }}>{a.sub}</div>}
          </div>
          <div className="activity-time">{a.time}</div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardSnapshot({ onView }) {
  const { profile } = useCurrentUserProfile();
  const rowsFromProfiles = useSupabaseExonautRows();
  const sorted = [...rowsFromProfiles].sort((a,b) => b.points - a.points);
  const meIdx = sorted.findIndex(u => u.id === profile.id);
  const rows = [
    ...sorted.slice(0, 3),
    ...(meIdx > 3 ? [sorted[meIdx - 1]] : []),
    ...(meIdx > 2 ? [sorted[meIdx]] : []),
  ];

  return (
    <div style={{ marginTop: 32 }}>
      <div className="section-head">
        <h2>Leaderboard Snapshot</h2>
        <button className="btn btn-ghost btn-sm" onClick={onView}>
          VIEW FULL <i className="fa-solid fa-arrow-right" style={{ marginLeft: 2 }} />
        </button>
      </div>
      <div className="lb-table">
        {rows.map((u, i) => {
          const rank = sorted.findIndex(x => x.id === u.id) + 1;
          const top = rank <= 3 ? ` top-${rank}` : '';
          const track = TRACKS.find(t => t.code === u.track);
          return (
            <div key={u.id} className={'lb-row' + (u.id === profile.id ? ' me' : '') + top}>
              <div className="lb-rank">
                {rank <= 3 && <i className="fa-solid fa-crown" />}
                #{rank}
              </div>
              <AvatarWithRing name={u.name} size={34} tier={u.tier} />
              <div className="lb-name">
                {u.name}
                <TierCrest tier={u.tier} />
              </div>
              <div className="lb-track col-track">{track?.short}</div>
              <div className="col-bars">
                <div className="lb-bars">
                  <div className="seg p1" style={{ width: `${u.points ? (u.p1 / u.points) * 100 : 0}%` }} />
                  <div className="seg p2" style={{ width: `${u.points ? (u.p2 / u.points) * 100 : 0}%` }} />
                  <div className="seg p3" style={{ width: `${u.points ? (u.p3 / u.points) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="lb-points">{u.points}</div>
              <div className="col-change"><ChangeArrow n={u.change} /></div>
              <div className="lb-badges">{u.badges}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ onNavigate, onOpenMission }) {
  const { profile } = useCurrentUserProfile();
  const displayName = profile.fullName || ME.name;

  return (
    <div>
      <div className="section-head enter">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>Welcome back, Exonaut</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{displayName}</h1>
          <div className="t-body" style={{ marginTop: 8, color: 'var(--lavender)', fontStyle: 'italic' }}>
            "We don't wait for the map. We build it."
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="t-label-muted">DAY</div>
          <div className="t-mono" style={{ fontSize: 40, color: 'var(--off-white)', fontWeight: 700, lineHeight: 1 }}>
            11<span style={{ color: 'var(--off-white-40)', fontSize: 22 }}>/84</span>
          </div>
          <div className="t-micro" style={{ marginTop: 6 }}>{COHORT.weekTotal * 7 - 11} DAYS TO DEMO DAY</div>
        </div>
      </div>

      <div className="enter enter-d1"><HeroStats /></div>
      <DirectiveInbox onAccepted={(d) => onNavigate('missions')} />
      <div className="enter enter-d2"><PillarGrid /></div>
      <div className="enter enter-d3"><RitualTracker /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }} className="dash-split">
        <div className="enter enter-d4"><MissionFeed onOpenMission={onOpenMission} /></div>
        <div className="enter enter-d4"><ActivityFeed /></div>
      </div>

      <div className="enter enter-d5"><LeaderboardSnapshot onView={() => onNavigate('leaderboard')} /></div>
    </div>
  );
}

Object.assign(window, { Dashboard });
