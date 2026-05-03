// Remaining screens: Missions list, Kudos feed, Rituals history, Announcements,
// Notifications, Admin panel, Alumni portal, Settings

// ========== MISSIONS LIST ==========
function MissionBriefsView() {
  const me = ME;
  const [selectedTrack, setSelectedTrack] = React.useState(me.track);
  const [expanded, setExpanded] = React.useState({ u1: true, u2: true });
  const currentWeek = COHORT.week;
  const track = TRACKS.find(t => t.code === selectedTrack);
  const trackWeeks = TRACK_BRIEFS[selectedTrack] || [];

  const toggle = (k) => setExpanded(e => ({ ...e, [k]: !e[k] }));

  const CORE_RITUALS = ['Monday Ignition', 'Mid-week Pulse', 'Friday Win Wall'];
  const WeekCard = ({ id, week, title, ptsRange, badgeEligible, missions, rituals: ritualsIn, universal, isCurrent }) => {
    const extras = (ritualsIn || []).filter(r => !CORE_RITUALS.some(c => r.toLowerCase().includes(c.toLowerCase())));
    const rituals = [...CORE_RITUALS, ...extras];
    const open = !!expanded[id];
    return (
      <div className={'card-panel' + (isCurrent ? ' week-current' : '')} style={{
        padding: 0, marginBottom: 10, overflow: 'hidden',
        borderColor: isCurrent ? 'var(--lime)' : universal ? 'rgba(176,149,197,0.28)' : undefined,
      }}>
        <div onClick={() => toggle(id)} style={{
          display: 'grid', gridTemplateColumns: '90px 1fr auto auto', gap: 16, alignItems: 'center',
          padding: '16px 22px', cursor: 'pointer',
          background: isCurrent ? 'rgba(201,229,0,0.04)' : universal ? 'rgba(176,149,197,0.04)' : 'transparent',
        }}>
          <div className="t-mono" style={{ fontSize: 11, color: universal ? 'var(--lavender)' : isCurrent ? 'var(--ink)' : 'var(--off-white-68)', letterSpacing: '0.12em', fontWeight: 700 }}>
            WEEK {String(week).padStart(2,'0')}
          </div>
          <div>
            <div className="t-heading" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, margin: 0 }}>{title}</div>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 3, letterSpacing: '0.05em' }}>
              {universal ? 'UNIVERSAL · ALL TRACKS' : track?.short} · {missions.length} MISSION{missions.length === 1 ? '' : 'S'}
              {badgeEligible && ' · ' + badgeEligible.toUpperCase()}
            </div>
          </div>
          <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 700 }}>{ptsRange} pts</div>
          <i className={'fa-solid ' + (open ? 'fa-chevron-up' : 'fa-chevron-down')} style={{ color: 'var(--off-white-40)', fontSize: 11 }} />
        </div>
        {open && (
          <div style={{ padding: '18px 22px 22px', borderTop: '1px solid var(--off-white-07)' }}>
            <div className="t-label-muted" style={{ marginBottom: 10 }}>MISSIONS</div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              {missions.map((m, i) => {
                const isObj = typeof m === 'object';
                const text = isObj ? m.text : m;
                const pts = isObj && m.pts !== '—' ? m.pts : null;
                const num = isObj ? m.n : i + 1;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '10px 0', borderBottom: i < missions.length - 1 ? '1px solid var(--off-white-07)' : 'none' }}>
                    <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)', fontWeight: 700 }}>{String(num).padStart(2,'0')}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, lineHeight: 1.55, color: 'var(--off-white)' }}>{text}</div>
                    {pts && <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 700, whiteSpace: 'nowrap' }}>+{pts}</div>}
                  </div>
                );
              })}
            </div>
            <div className="t-label-muted" style={{ marginBottom: 10 }}>RITUALS THIS WEEK</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {rituals.map((r, i) => {
                const isCore = CORE_RITUALS.some(c => r.toLowerCase().includes(c.toLowerCase()));
                return (
                  <span key={i} className="t-mono" style={{ fontSize: 10, padding: '5px 10px', border: '1px solid ' + (isCore ? 'rgba(201,229,0,0.35)' : 'var(--off-white-15)'), borderRadius: 2, color: isCore ? 'var(--ink)' : 'var(--off-white-68)', background: isCore ? 'rgba(201,229,0,0.06)' : 'transparent', letterSpacing: '0.04em', fontWeight: isCore ? 700 : 400 }}>
                    {r.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Track selector */}
      <div className="card-panel" style={{ padding: 18, marginBottom: 18 }}>
        <div className="t-label-muted" style={{ marginBottom: 10 }}>VIEWING TRACK · {selectedTrack === me.track ? 'YOUR TRACK' : 'OTHER'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TRACKS.map(t => (
            <button key={t.code} onClick={() => setSelectedTrack(t.code)}
              className={'lb-filter' + (selectedTrack === t.code ? ' active' : '')}
              style={{ fontSize: 11, padding: '6px 12px' }}>
              {t.emoji} {t.short}{t.code === me.track ? ' · you' : ''}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--off-white-07)' }}>
          <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0, margin: '0 0 6px 0' }}>
            {track?.emoji} Track {track?.code === 'AIS' ? '01' : track?.code === 'VB' ? '02' : track?.code === 'LD' ? '03' : track?.code === 'XM' ? '04' : track?.code === 'AID' ? '05' : track?.code === 'POL' ? '06' : '07'} — {track?.name}
          </div>
          <div className="t-body" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--off-white-68)' }}>{track?.objective}</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 10, letterSpacing: '0.05em' }}>
            MISSION LEAD · {track?.leadTitle?.toUpperCase()} &nbsp;·&nbsp; CLIENT · {track?.clientType?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Discovery Tier Callout */}
      <div className="card-panel" style={{ padding: 18, marginBottom: 18, borderColor: 'rgba(201,229,0,0.28)', background: 'rgba(201,229,0,0.03)' }}>
        <div className="t-label" style={{ marginBottom: 4, color: 'var(--ink)' }}>WEEK 2 · DISCOVERY OUTCOME TIERS</div>
        <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)', marginBottom: 14 }}>
          You send 10 concept papers. Your score is driven by how many discovery meetings you convert.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {DISCOVERY_TIERS.map(t => (
            <div key={t.tier} style={{ padding: 14, border: '1px solid ' + t.color + '66', borderRadius: 2, background: t.color + '10' }}>
              <div className="t-mono" style={{ fontSize: 11, color: t.color, fontWeight: 700, letterSpacing: '0.12em' }}>{t.tier}</div>
              <div className="t-heading" style={{ fontSize: 20, margin: '4px 0', textTransform: 'none', letterSpacing: 0 }}>
                {t.maxMeetings ? t.minMeetings + (t.minMeetings === t.maxMeetings ? '' : '–' + t.maxMeetings) : t.minMeetings + '+'} meetings
              </div>
              <div className="t-mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, marginBottom: 6 }}>+{t.pts} pts</div>
              <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-40)', lineHeight: 1.5 }}>{t.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Universal Wks 1-2 */}
      <div className="t-label" style={{ marginBottom: 10, color: 'var(--lavender)' }}>PHASE 1 · UNIVERSAL · ALL TRACKS</div>
      {UNIVERSAL_WEEKS.map((w, i) => (
        <WeekCard key={'u' + w.week} id={'u' + w.week}
          week={w.week} title={w.title} ptsRange={w.ptsRange}
          badgeEligible={w.badgeEligible} missions={w.missions} rituals={w.rituals}
          universal isCurrent={w.week === currentWeek} />
      ))}

      {/* Track-specific Wks 3-12 */}
      <div className="t-label" style={{ margin: '26px 0 10px', color: 'var(--ink)' }}>PHASE 2 · {track?.short} TRACK · WEEKS 3–12</div>
      {trackWeeks.map(w => (
        <WeekCard key={'t' + w.week} id={'t' + selectedTrack + w.week}
          week={w.week} title={w.title} ptsRange={w.ptsRange}
          badgeEligible={w.badgeEligible} missions={w.missions} rituals={w.rituals}
          isCurrent={w.week === currentWeek} />
      ))}
    </div>
  );
}

function PointsRubricView() {
  const groups = [...new Set(POINTS_RUBRIC.map(r => r.group))];
  return (
    <div>
      <div className="card-panel" style={{ padding: 22, marginBottom: 18, background: 'rgba(201,229,0,0.03)', borderColor: 'rgba(201,229,0,0.2)' }}>
        <div className="t-label" style={{ marginBottom: 8, color: 'var(--ink)' }}>TIER MILESTONES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { name: 'Bronze Builder',    pts: 100, color: '#CD7F32' },
            { name: 'Silver Strategist', pts: 300, color: '#A8B4BE' },
            { name: 'Gold Innovator',    pts: 600, color: '#C9A000' },
            { name: 'Platinum Disruptor',pts: 900, color: '#7FE3FF' },
          ].map(t => (
            <div key={t.name} style={{ padding: 14, border: '1px solid ' + t.color + '55', borderRadius: 2, background: t.color + '0D' }}>
              <div className="t-mono" style={{ fontSize: 18, color: t.color, fontWeight: 700 }}>{t.pts}</div>
              <div className="t-heading" style={{ fontSize: 11, marginTop: 4, textTransform: 'none', letterSpacing: 0 }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      {groups.map(g => (
        <div key={g} style={{ marginBottom: 22 }}>
          <div className="section-head" style={{ marginBottom: 10 }}>
            <h2 style={{ fontSize: 14 }}>{g}</h2>
          </div>
          <div className="card-panel" style={{ padding: 0 }}>
            {POINTS_RUBRIC.filter(r => r.group === g).map((r, i, arr) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 180px', gap: 16, padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--off-white-07)' : 'none', alignItems: 'center' }}>
                <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white)' }}>{r.label}</div>
                <div className="t-mono" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.pts}</div>
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.04em', textAlign: 'right' }}>{r.note.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LegacyMissionsList({ onOpenMission }) {
  const missions = useMissions();
  const subs = useSubs();
  const { profile } = useCurrentUserProfile();
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const cohortName = activeCohort?.name || COHORT.name;
  const cohortWeekTotal = window.getCohortWeekTotal?.(activeCohort) || COHORT.weekTotal;
  const myTrack = profile.trackCode || ME.track || 'AIS';
  const myCohort = profile.cohortId || ME.cohort || 'c2627';
  const [view, setView] = React.useState('queue'); // queue | briefs | rubric
  const [filter, setFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [expandedId, setExpandedId] = React.useState(null);
  const filtered = missions.filter(m => {
    const mySub = subs.find(s => s.exonautId === profile.id && s.missionId === m.id);
    const liveStatus = mySub?.state || m.status;
    if ((m.cohortId || 'c2627') !== myCohort) return false;
    if (filter === 'my' && m.track !== myTrack) return false;
    if (filter === 'cohort' && m.track !== null) return false;
    if (statusFilter === 'active' && liveStatus === 'approved') return false;
    if (statusFilter === 'done' && liveStatus !== 'approved') return false;
    return true;
  });

  const statusMap = {
    'not-started': { cls: 'status-not-started', label: 'NOT STARTED', cta: 'START' },
    'in-progress': { cls: 'status-in-progress', label: 'IN PROGRESS', cta: 'CONTINUE' },
    'submitted':   { cls: 'status-submitted', label: 'SUBMITTED', cta: 'VIEW' },
    'approved':    { cls: 'status-approved', label: 'APPROVED', cta: 'REVIEW' },
    'pending':     { cls: 'status-submitted', label: 'SUBMITTED', cta: 'VIEW' },
    'needs-revision': { cls: 'status-in-progress', label: 'NEEDS REVISION', cta: 'REVISE' },
    'rejected':    { cls: 'status-overdue', label: 'REJECTED', cta: 'VIEW' },
  };

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>YOUR MISSION QUEUE · {cohortName.toUpperCase()}</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Track</h1>
        </div>
        <div className="t-mono" style={{ color: 'var(--off-white-40)', fontSize: 11 }}>
          WEEK {COHORT.week} OF {cohortWeekTotal} · DEMO DAY {window.getCohortDemoDay?.(activeCohort) || COHORT.demoDay}
        </div>
      </div>

      {/* Top view switcher */}
      <div className="leaderboard-tabs" style={{ marginBottom: 18 }}>
        <div className={'lb-tab' + (view === 'queue' ? ' active' : '')} onClick={() => setView('queue')}>
          <i className="fa-solid fa-bullseye" style={{ marginRight: 6 }} /> Active Queue
        </div>
        <div className={'lb-tab' + (view === 'briefs' ? ' active' : '')} onClick={() => setView('briefs')}>
          <i className="fa-solid fa-book-open" style={{ marginRight: 6 }} /> Track Briefs · All 12 Weeks
        </div>
        <div className={'lb-tab' + (view === 'rubric' ? ' active' : '')} onClick={() => setView('rubric')}>
          <i className="fa-solid fa-scale-balanced" style={{ marginRight: 6 }} /> Points Rubric
        </div>
      </div>

      {view === 'briefs' && <MissionBriefsView />}
      {view === 'rubric' && <PointsRubricView />}

      {view === 'queue' && (
        <>
          <div className="lb-filters">
            <div className={'lb-filter' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>All</div>
            <div className={'lb-filter' + (filter === 'my' ? ' active' : '')} onClick={() => setFilter('my')}>My Track</div>
            <div className={'lb-filter' + (filter === 'cohort' ? ' active' : '')} onClick={() => setFilter('cohort')}>All-Cohort</div>
          </div>
          <div className="lb-filters">
            <div className={'lb-filter' + (statusFilter === 'all' ? ' active' : '')} onClick={() => setStatusFilter('all')}>All Status</div>
            <div className={'lb-filter' + (statusFilter === 'active' ? ' active' : '')} onClick={() => setStatusFilter('active')}>Active</div>
            <div className={'lb-filter' + (statusFilter === 'done' ? ' active' : '')} onClick={() => setStatusFilter('done')}>Completed</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {filtered.length === 0 && (
              <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
                <div className="t-heading" style={{ fontSize: 14, margin: '0 0 6px 0' }}>No track tasks yet</div>
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
                  Track tasks will appear here once they are created for your cohort or track.
                </div>
              </div>
            )}
            {filtered.map(m => {
              const mySub = subs.find(s => s.exonautId === profile.id && s.missionId === m.id);
              const liveStatus = mySub?.state || m.status;
              const track = m.track ? TRACKS.find(t => t.code === m.track) : null;
              const isOverdue = m.dueIn < 0 && liveStatus !== 'approved';
              const s = statusMap[liveStatus] || statusMap['not-started'];
              const isExpanded = expandedId === m.id;
              const canSubmit = liveStatus !== 'approved' && liveStatus !== 'pending';
              return (
                <div key={m.id} style={{ marginBottom: 10 }}>
                  <div className="mission-row" onClick={() => onOpenMission(m.id)}>
                    <div className="mission-meta">
                      <div className="mission-id">{m.id}{m.week ? ' · WK ' + String(m.week).padStart(2,'0') : ''}</div>
                      <div className="mission-title">{m.title}</div>
                      <div className="mission-sub">
                        {track?.short || 'ALL-COHORT'} · {m.pillar.toUpperCase()} · DUE {m.dueDate}
                        {isOverdue && <span style={{ color: 'var(--red)' }}> · OVERDUE</span>}
                      </div>
                    </div>
                    <div className="mission-points">
                      <span className="plus">+</span>{m.pointsAwarded || m.points}
                    </div>
                    <span className={'status-pill ' + s.cls}>{s.label}</span>
                    {canSubmit && (
                      <button className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : m.id); }}
                        style={{ borderColor: isExpanded ? 'var(--lime)' : undefined, color: isExpanded ? 'var(--ink)' : undefined }}>
                        <i className={'fa-solid ' + (isExpanded ? 'fa-chevron-up' : 'fa-cloud-arrow-up')} /> {isExpanded ? 'HIDE' : 'SUBMIT'}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOpenMission(m.id); }}>{s.cta}</button>
                  </div>
                  {isExpanded && canSubmit && (
                    <div style={{ marginTop: 4, marginBottom: 10 }}>
                      <InlineSubmitCard missionId={m.id} compact />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function WeeklyMissionsList({ onOpenMission }) {
  const missions = useMissions();
  const subs = useSubs();
  const { profile } = useCurrentUserProfile();
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const cohortName = activeCohort?.name || COHORT.name;
  const cohortWeekTotal = window.getCohortWeekTotal?.(activeCohort) || COHORT.weekTotal;
  const myTrack = profile.trackCode || ME.track || 'AIS';
  const myCohort = profile.cohortId || ME.cohort || 'c2627';
  const [view, setView] = React.useState('queue');
  const [filter, setFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [expandedWeek, setExpandedWeek] = React.useState(() => String(COHORT.week || 1).padStart(2, '0'));

  const statusMap = {
    'not-started': { cls: 'status-not-started', label: 'NOT STARTED' },
    'in-progress': { cls: 'status-in-progress', label: 'IN PROGRESS' },
    submitted: { cls: 'status-submitted', label: 'SUBMITTED' },
    approved: { cls: 'status-approved', label: 'COMPLETED' },
    'needs-revision': { cls: 'status-in-progress', label: 'NEEDS REVISION' },
    rejected: { cls: 'status-overdue', label: 'REJECTED' },
  };

  const submissionFor = (missionId) => subs.find(s => s.exonautId === profile.id && s.missionId === missionId);

  const taskStatus = (mission) => {
    const sub = submissionFor(mission.id);
    if (!sub) return 'not-started';
    if (sub.state === 'pending') return 'submitted';
    if (sub.state === 'approved') return 'approved';
    if (sub.state === 'needs-revision') return 'needs-revision';
    if (sub.state === 'rejected') return 'rejected';
    return 'not-started';
  };

  const deriveWeekStatus = (tasks) => {
    const statuses = tasks.map(taskStatus);
    if (statuses.length && statuses.every(s => s === 'approved')) return 'approved';
    if (statuses.includes('rejected')) return 'rejected';
    if (statuses.includes('needs-revision')) return 'needs-revision';
    if (statuses.length && statuses.every(s => s === 'submitted' || s === 'approved') && statuses.includes('submitted')) return 'submitted';
    if (statuses.some(s => s !== 'not-started')) return 'in-progress';
    return 'not-started';
  };

  const weekTitle = (week, tasks) => {
    const universal = {
      1: 'Prospecting & Onboarding',
      2: 'Concept Papers & Discovery',
    };
    if (universal[week]) return universal[week];
    const title = tasks[0]?.title || `Week ${week}`;
    return title.replace(/^Week\s+\d+\s+Track Mission\s+-\s+/i, '');
  };

  const scopedMissions = missions
    .filter(m => (m.cohortId || 'c2627') === myCohort)
    .filter(m => !m.track || m.track === myTrack)
    .filter(m => {
      if (filter === 'my') return m.track === myTrack;
      if (filter === 'cohort') return !m.track;
      return true;
    });

  const weekGroups = React.useMemo(() => {
    const byWeek = new Map();
    scopedMissions.forEach(m => {
      const week = Number(m.week || 0) || 0;
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week).push(m);
    });

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, tasks]) => {
        const sortedTasks = [...tasks].sort((a, b) => String(a.id).localeCompare(String(b.id)));
        const status = deriveWeekStatus(sortedTasks);
        const completed = sortedTasks.filter(m => taskStatus(m) === 'approved').length;
        const possiblePoints = sortedTasks.reduce((sum, m) => sum + Number(m.points || 0), 0);
        const trackCodes = Array.from(new Set(sortedTasks.map(m => m.track).filter(Boolean)));
        const scope = trackCodes.length
          ? trackCodes.map(code => TRACKS.find(t => t.code === code)?.short || code).join(' · ')
          : 'UNIVERSAL · ALL TRACKS';
        return { week, tasks: sortedTasks, status, completed, possiblePoints, scope, title: weekTitle(week, sortedTasks) };
      })
      .filter(group => {
        if (statusFilter === 'done') return group.status === 'approved';
        if (statusFilter === 'active') return group.status !== 'approved';
        return true;
      });
  }, [scopedMissions, subs, filter, statusFilter, profile.id]);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>YOUR MISSION QUEUE · {cohortName.toUpperCase()}</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Track</h1>
        </div>
        <div className="t-mono" style={{ color: 'var(--off-white-40)', fontSize: 11 }}>
          WEEK {COHORT.week} OF {cohortWeekTotal} · DEMO DAY {window.getCohortDemoDay?.(activeCohort) || COHORT.demoDay}
        </div>
      </div>

      <div className="leaderboard-tabs" style={{ marginBottom: 18 }}>
        <div className={'lb-tab' + (view === 'queue' ? ' active' : '')} onClick={() => setView('queue')}>
          <i className="fa-solid fa-calendar-week" style={{ marginRight: 6 }} /> Weekly Queue
        </div>
        <div className={'lb-tab' + (view === 'briefs' ? ' active' : '')} onClick={() => setView('briefs')}>
          <i className="fa-solid fa-book-open" style={{ marginRight: 6 }} /> Track Briefs · All 12 Weeks
        </div>
        <div className={'lb-tab' + (view === 'rubric' ? ' active' : '')} onClick={() => setView('rubric')}>
          <i className="fa-solid fa-scale-balanced" style={{ marginRight: 6 }} /> Points Rubric
        </div>
      </div>

      {view === 'briefs' && <MissionBriefsView />}
      {view === 'rubric' && <PointsRubricView />}

      {view === 'queue' && (
        <>
          <div className="lb-filters">
            <div className={'lb-filter' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>All</div>
            <div className={'lb-filter' + (filter === 'my' ? ' active' : '')} onClick={() => setFilter('my')}>My Track</div>
            <div className={'lb-filter' + (filter === 'cohort' ? ' active' : '')} onClick={() => setFilter('cohort')}>All-Cohort</div>
          </div>
          <div className="lb-filters">
            <div className={'lb-filter' + (statusFilter === 'all' ? ' active' : '')} onClick={() => setStatusFilter('all')}>All Status</div>
            <div className={'lb-filter' + (statusFilter === 'active' ? ' active' : '')} onClick={() => setStatusFilter('active')}>Active</div>
            <div className={'lb-filter' + (statusFilter === 'done' ? ' active' : '')} onClick={() => setStatusFilter('done')}>Completed</div>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 14 }}>
            {weekGroups.length === 0 && (
              <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
                <div className="t-heading" style={{ fontSize: 14, margin: '0 0 6px 0' }}>No track weeks yet</div>
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
                  Weekly track tasks will appear here once they exist for your cohort or track.
                </div>
              </div>
            )}

            {weekGroups.map(group => {
              const weekKey = String(group.week).padStart(2, '0');
              const isWeekOpen = expandedWeek === weekKey;
              const weekStatus = statusMap[group.status] || statusMap['not-started'];
              return (
                <div key={weekKey} className="card-panel" style={{ padding: 0, overflow: 'hidden', background: 'var(--card-base)' }}>
                  <div
                    onClick={() => setExpandedWeek(isWeekOpen ? null : weekKey)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px minmax(0, 1fr) auto auto auto',
                      gap: 14,
                      alignItems: 'center',
                      padding: '18px 24px',
                      cursor: 'pointer',
                      borderBottom: isWeekOpen ? '1px solid var(--hairline)' : 'none',
                    }}
                  >
                    <div className="t-mono" style={{ color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.12em', fontWeight: 700 }}>
                      WEEK {weekKey}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="t-heading" style={{ fontSize: 16, margin: 0, textTransform: 'none', letterSpacing: 0, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {group.title}
                      </div>
                      <div className="t-mono" style={{ fontSize: 9, color: 'var(--ink-muted)', letterSpacing: '0.1em', marginTop: 4 }}>
                        {group.scope} · {group.completed}/{group.tasks.length} TASKS COMPLETE
                      </div>
                    </div>
                    <div className="t-mono" style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 800 }}>+{group.possiblePoints}</div>
                    <span className={'status-pill ' + weekStatus.cls}>{weekStatus.label}</span>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setExpandedWeek(isWeekOpen ? null : weekKey); }}>
                      <i className={'fa-solid ' + (isWeekOpen ? 'fa-chevron-up' : 'fa-chevron-down')} />
                    </button>
                  </div>

                  {isWeekOpen && (
                    <div style={{ padding: '16px 24px 22px' }}>
                      <div className="t-label-muted" style={{ marginBottom: 10 }}>TASKS THIS WEEK</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {group.tasks.map((m, idx) => {
                          const sub = submissionFor(m.id);
                          const liveStatus = taskStatus(m);
                          const status = statusMap[liveStatus] || statusMap['not-started'];
                          const track = m.track ? TRACKS.find(t => t.code === m.track) : null;
                          return (
                            <div
                              key={m.id}
                              className="mission-row"
                              onClick={() => onOpenMission(m.id)}
                              style={{ display: 'block', padding: 0, marginBottom: 0, background: 'var(--card-base)', borderColor: 'var(--hairline)', transform: 'none', cursor: 'pointer' }}
                            >
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                                gap: 18,
                                alignItems: 'center',
                                padding: '18px 24px',
                              }}>
                                <div style={{ minWidth: 0 }}>
                                  <div className="mission-id">{m.id}</div>
                                  <div className="mission-title">{m.title}</div>
                                  <div className="mission-sub">
                                    {(track?.short || 'ALL-COHORT')} - {(m.pillar || 'PROJECT').toUpperCase()} - DUE {m.dueDate || '-'}
                                  </div>
                                  {(liveStatus === 'rejected' || liveStatus === 'needs-revision') && sub?.feedback && (
                                    <div className="t-body" style={{ fontSize: 12, color: liveStatus === 'rejected' ? 'var(--red)' : 'var(--amber)', marginTop: 8 }}>
                                      <i className="fa-solid fa-comment-dots" style={{ marginRight: 6 }} />{sub.feedback}
                                    </div>
                                  )}
                                  {liveStatus === 'approved' && sub?.pointsAwarded != null && (
                                    <div className="t-mono" style={{ fontSize: 9, color: 'var(--lime)', letterSpacing: '0.08em', marginTop: 8 }}>
                                      +{sub.pointsAwarded} AWARDED
                                    </div>
                                  )}
                                </div>
                                <div className="mission-points"><span className="plus">+</span>{m.points}</div>
                                <span className={'status-pill ' + status.cls}>{status.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ========== KUDOS FEED ==========
const KUDOS_FEED = [];

function KudosFeed({ onGive }) {
  const [filter, setFilter] = React.useState('all');
  const kudos = useKudos();
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const meId = profile.id || ME_ID;
  const myCohort = profile.cohortId || ME.cohort || 'c2627';
  const feed = filter === 'all'
    ? kudos.all.filter(k => (k.cohortId || 'c2627') === myCohort)
    : kudos.all.filter(k => k.to === meId || k.from === meId);

  function resolveKudosPerson(userId, storedName) {
    const p = (profiles || []).find(x => x.id === userId);
    if (p) return { name: storedName || p.fullName || p.email || 'Exonaut', tier: p.role === 'exonaut' ? 'gold' : 'corps', avatarUrl: p.avatarUrl || '' };
    if (storedName) return { name: storedName, tier: 'gold', avatarUrl: '' };
    return resolveAuthor(userId, null);
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>LIFT BEFORE YOU CLIMB</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Kudos</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="t-mono" style={{ color: 'var(--off-white-40)', fontSize: 11 }}>WK {COHORT.week}</span>
          <button className="btn btn-primary" onClick={onGive}>
            <i className="fa-solid fa-hand-sparkles" /> GIVE KUDOS
          </button>
        </div>
      </div>

      <div className="lb-filters">
        <div className={'lb-filter' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>Cohort Feed</div>
        <div className={'lb-filter' + (filter === 'mine' ? ' active' : '')} onClick={() => setFilter('mine')}>Involving Me</div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {feed.length === 0 && (
          <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
            <i className="fa-solid fa-hand-sparkles" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
            <div className="t-heading" style={{ fontSize: 14, margin: '0 0 6px 0' }}>No kudos yet</div>
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
              Kudos will appear here after users send them.
            </div>
          </div>
        )}
        {feed.map((k, i) => {
          const fromInfo = resolveKudosPerson(k.from, k.fromName);
          const toInfo   = resolveKudosPerson(k.to, k.toName);
          const fromRoleStyle = roleBadgeStyle(k.fromRole);
          return (
            <div key={k.id || i} className="card-panel" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <AvatarWithRing name={fromInfo.name} avatarUrl={fromInfo.avatarUrl} size={36} tier={fromInfo.tier} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--off-white)' }}>{fromInfo.name}</span>
                    {fromRoleStyle && (
                      <span style={{ padding: '1px 5px', background: fromRoleStyle.bg, color: fromRoleStyle.fg, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700, borderRadius: 2 }}>
                        {fromRoleStyle.label}
                      </span>
                    )}
                    <span style={{ color: 'var(--off-white-40)' }}>→</span>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{toInfo.name}</span>
                  </div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginTop: 2 }}>
                    {kudos.timeAgo(k.createdAt)} · TAGGED {(k.pillar || 'culture').toUpperCase()} · +{Number(k.receiverPoints || 0.25)} RECEIVED{k.giverPoints ? ` · +${Number(k.giverPoints)} GIVEN` : ''}
                  </div>
                </div>
                <AvatarWithRing name={toInfo.name} avatarUrl={toInfo.avatarUrl} size={36} tier={toInfo.tier} />
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--off-white)', lineHeight: 1.5, paddingLeft: 48 }}>
                "{k.msg}"
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== RITUALS HISTORY ==========
function RitualsPage() {
  const { profile } = useCurrentUserProfile();
  const rowsFromProfiles = useSupabaseExonautRows();
  const { records, history, completeRitual } = useRitualState(profile.id);
  const [proofRitual, setProofRitual] = React.useState(null);
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const cohortWeekTotal = window.getCohortWeekTotal?.(activeCohort) || COHORT.weekTotal;
  const weekLabel = window.getCohortWeekWindowLabel?.(activeCohort, COHORT.week) || '';
  const weeks = Object.keys(history).length
    ? Object.keys(history).map(k => Number(k.replace('w', ''))).filter(Boolean)
    : [];

  React.useEffect(() => {
    const manilaDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Manila' }).format(new Date());
    if (manilaDay !== 'Fri') return;
    const sorted = [...rowsFromProfiles].sort((a, b) => b.points - a.points);
    if (sorted[0]?.id === profile.id) completeRitual('iotw', { description: 'Auto logged from Friday leaderboard rank' }, { userId: profile.id, cohortId: profile.cohortId || 'c2627', source: 'intern-of-week' });
  }, [rowsFromProfiles, profile.id]);

  function submitProof(ritual) {
    if (ritual.id === 'iotw') return;
    setProofRitual(ritual);
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>WEEKLY CADENCE</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Rituals</h1>
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>WEEK {COHORT.week}/{cohortWeekTotal}</div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="section-head" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 16 }}>This Week</h2>
          <span className="section-meta">{weekLabel}</span>
        </div>
        <div className="ritual-row">
          {RITUALS.map(r => {
            const state = records[r.id]?.state || 'not-started';
            const iconCls = state === 'done' ? 'fa-circle-check' : state === 'missed' ? 'fa-circle-xmark' : 'fa-circle-dot';
            const cCls = state === 'done' ? 'done-c' : state === 'missed' ? 'miss-c' : 'pend-c';
            return (
              <div key={r.id} className={'ritual-cell ' + state} onClick={() => submitProof(r)} style={{ cursor: r.id === 'iotw' ? 'default' : 'pointer' }}>
                <div className="ritual-head">
                  <div className="ritual-name">{r.name}</div>
                  <i className={'fa-solid ' + iconCls + ' ritual-icon ' + cCls} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)' }}>
                  {state === 'done' ? 'LOGGED' : state === 'missed' ? 'MISSED' : 'PENDING'}
                </div>
                <div className="ritual-points">+{r.points} PTS</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-head" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16 }}>Ritual History · All Weeks</h2>
        <span className="section-meta">{weeks.length} WEEKS LOGGED</span>
      </div>

      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '80px repeat(5, 1fr) 80px' }}>
          <div>WEEK</div>
          {RITUALS.map(r => <div key={r.id}>{r.name.split(' ').slice(-1)[0].toUpperCase()}</div>)}
          <div>PTS</div>
        </div>
        {weeks.slice().reverse().map(w => {
          const weekRecords = history[window.__ritualStore.weekKey(w)] || {};
          const weekStates = RITUALS.map(r => weekRecords[r.id]?.state || 'not-started');
          const pts = weekStates.reduce((s, st, i) => s + (st === 'done' ? RITUALS[i].points : 0), 0);
          return (
            <div key={w} className="lb-row" style={{ gridTemplateColumns: '80px repeat(5, 1fr) 80px' }}>
              <div className="lb-rank">W{String(w).padStart(2, '0')}</div>
              {weekStates.map((st, i) => (
                <div key={i} style={{ fontSize: 14 }}>
                  {st === 'done' ? <i className="fa-solid fa-circle-check" style={{ color: 'var(--green)' }} />
                   : st === 'missed' ? <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--red)', opacity: 0.6 }} />
                   : <i className="fa-solid fa-circle-dot" style={{ color: 'var(--ink)' }} />}
                </div>
              ))}
              <div className="lb-points" style={{ fontSize: 14 }}>{pts}</div>
            </div>
          );
        })}
      </div>
      {proofRitual && (
        <RitualProofModal
          ritual={proofRitual}
          onClose={() => setProofRitual(null)}
          onSubmit={async (proof) => {
            await completeRitual(proofRitual.id, proof, { userId: profile.id, cohortId: profile.cohortId || 'c2627' });
            setProofRitual(null);
          }}
        />
      )}
    </div>
  );
}

function RitualProofModal({ ritual, onClose, onSubmit }) {
  const [description, setDescription] = React.useState('');
  const [file, setFile] = React.useState(null);
  const [fileDataUrl, setFileDataUrl] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  function attachFile(nextFile) {
    setFile(nextFile || null);
    setFileDataUrl('');
    if (!nextFile) return;
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result || '');
    reader.readAsDataURL(nextFile);
  }

  async function submit() {
    if (!file || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        description: description.trim(),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileDataUrl,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ritual-proof-modal card-panel" onClick={e => e.stopPropagation()}>
        <div className="task-modal-head">
          <div>
            <div className="t-label" style={{ color: 'var(--lime)', marginBottom: 6 }}>RITUAL PROOF</div>
            <h2 className="t-title">{ritual.name}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="task-section">
          <label className="t-label-muted">UPLOAD PROOF</label>
          <input className="input" type="file" onChange={e => attachFile(e.target.files && e.target.files[0])} />
          {file && <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 8 }}>{file.name}</div>}
        </div>
        <div className="task-section">
          <label className="t-label-muted">DESCRIPTION OPTIONAL</label>
          <textarea className="textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add context, links, notes, or what you completed." />
        </div>
        <div className="task-composer-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!file || saving} onClick={submit}>
            <i className="fa-solid fa-upload" /> {saving ? 'Submitting...' : 'Submit Proof'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== ANNOUNCEMENTS ==========
const ANNOUNCEMENTS = [];

function AnnouncementsPage() {
  const typeMap = {
    info: { color: 'var(--platinum)', icon: 'fa-circle-info', label: 'INFO' },
    action: { color: 'var(--amber)', icon: 'fa-triangle-exclamation', label: 'ACTION REQUIRED' },
    celebration: { color: 'var(--ink)', icon: 'fa-star', label: 'CELEBRATION' },
    urgent: { color: 'var(--red)', icon: 'fa-bolt', label: 'URGENT' },
  };
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>FROM YOUR PROGRAM DIRECTORS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Announcements</h1>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        {ANNOUNCEMENTS.length === 0 && (
          <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
            <i className="fa-solid fa-bullhorn" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
            <div className="t-heading" style={{ fontSize: 14, margin: '0 0 6px 0' }}>No announcements yet</div>
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
              Announcements will appear here once a Lead, Commander, or Admin posts one.
            </div>
          </div>
        )}
        {ANNOUNCEMENTS.map((a, i) => {
          const t = typeMap[a.type];
          return (
            <div key={i} className="card-panel" style={{ borderLeft: `2px solid ${t.color}`, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: t.color }}>
                  <i className={'fa-solid ' + t.icon} style={{ marginRight: 6 }} />{t.label}
                </span>
                <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{a.time} · {a.from.toUpperCase()}</span>
              </div>
              <h3 className="t-heading" style={{ fontSize: 18, margin: '0 0 8px 0', textTransform: 'none', letterSpacing: 0 }}>{a.title}</h3>
              <div className="t-body">{a.body}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--off-white-07)' }}>
                {['fa-fire','fa-bolt','fa-rocket','fa-lightbulb'].map(icon => (
                  <button key={icon} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }}>
                    <i className={'fa-solid ' + icon} /> {Math.floor(Math.random() * 8) + 1}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== NOTIFICATIONS ==========
const NOTIFICATIONS = [
  { type: 'badge', title: 'You earned Silver Strategist', sub: '300-point milestone · +0 pts (badge-only)', time: '2h ago', icon: 'fa-medal', unread: true,
    share: { kind: 'badge', payload: { code: 'MIL-SLV', name: 'Silver Strategist', subtitle: '300 points milestone', category: 'milestone', color: '#A8B4BE' } } },
  { type: 'kudos', title: 'Priya sent you kudos', sub: '"Your Kestrel brief was absurdly clean…"', time: '4h ago', icon: 'fa-hand-sparkles', unread: true },
  { type: 'rank', title: 'Rank update: #17 → #14', sub: 'You moved up 3 positions this week', time: '8h ago', icon: 'fa-arrow-trend-up', unread: true },
  { type: 'points', title: '+40 points awarded', sub: 'Track Orientation · graded EXCELLENT', time: 'Yesterday', icon: 'fa-bolt', unread: false,
    share: { kind: 'citation', payload: { id: 'CIT-TRK-ORI', title: 'Track Orientation', grade: 'Excellent', pointsAwarded: 40, color: '#C9F24A', feedback: 'Strong grasp of the full track arc. Reading of the 12-week rhythm and pillar weighting is unusually clear for week 1.' } } },
  { type: 'mission', title: 'New mission assigned', sub: 'Competitive Landscape Analysis · due in 2 days', time: 'Yesterday', icon: 'fa-bullseye', unread: false },
  { type: 'award', title: 'You were named Intern of the Week', sub: 'Week 2 · +25 pts · Community vote', time: '3d ago', icon: 'fa-trophy', unread: false,
    share: { kind: 'award', payload: { code: 'SPL-IOW', name: 'Intern of the Week', subtitle: 'Week 2 · community-voted', color: '#FFB020' } } },
  { type: 'announce', title: 'Mack posted an announcement', sub: 'Midpoint Fire Check scheduled · OCT 28', time: '2d ago', icon: 'fa-bullhorn', unread: false },
];

function NotificationsPage() {
  const { profile } = useCurrentUserProfile();
  const { tasks, assignees } = useProjects();
  const projectNotifications = tasks
    .filter(t => assignees.some(a => a.taskId === t.id && a.userId === profile.id) || t.consultedId === profile.id)
    .slice(0, 6)
    .map(t => ({
      type: 'project',
      title: t.taskClass === 'critical' ? 'Critical project task' : 'Project task update',
      sub: `${t.title} · ${window.__projectStore.deadlineState(t)} · +${t.points} pts`,
      time: t.dueDate || 'Project Feed',
      icon: t.taskClass === 'critical' ? 'fa-bolt' : 'fa-list-check',
      unread: t.taskClass === 'critical' && t.status === 'assigned',
    }));
  const notifications = [...projectNotifications, ...NOTIFICATIONS];
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>REAL-TIME · 3 UNREAD</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Notifications</h1>
        </div>
        <button className="btn btn-ghost">MARK ALL READ</button>
      </div>

      <div className="card-panel" style={{ padding: 0 }}>
        {notifications.map((n, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 16,
            padding: '18px 24px', borderBottom: i < notifications.length - 1 ? '1px solid var(--off-white-07)' : 'none',
            background: n.unread ? 'rgba(201,229,0,0.03)' : 'transparent',
            alignItems: 'center', cursor: 'pointer', transition: 'background 150ms',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-dark)', border: '1px solid var(--off-white-07)', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
              <i className={'fa-solid ' + n.icon} />
            </div>
            <div>
              <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>
                {n.title} {n.unread && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', marginLeft: 6, verticalAlign: 'middle' }} />}
              </div>
              <div className="t-body" style={{ fontSize: 13, marginTop: 2 }}>{n.sub}</div>
            </div>
            <div>
              {n.share && (
                <ShareButton
                  kind={n.share.kind}
                  payload={n.share.payload}
                  label={n.share.kind === 'citation' ? 'SHARE CITATION' : n.share.kind === 'award' ? 'SHARE AWARD' : 'SHARE BADGE'}
                  icon={n.share.kind === 'citation' ? 'fa-stamp' : n.share.kind === 'award' ? 'fa-trophy' : 'fa-medal'}
                />
              )}
            </div>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== ADMIN PANEL ==========
function AdminPanel() {
  const missions = useMissions();
  const { profile } = useCurrentUserProfile();
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const cohortUsers = window.getUsersForCohort?.(activeCohort?.id || profile.cohortId || ME.cohort) || [];
  const [tab, setTab] = React.useState('users');

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>SUPER ADMIN · MACK COMANDANTE</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Admin Console</h1>
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>
          {cohortUsers.length || COHORT.size} EXONAUTS · 7 MISSION LEADS · {activeCohort?.code || COHORT.code}
        </div>
      </div>

      <div className="leaderboard-tabs">
        {['users','missions','points','badges','rituals','reports','announce'].map(t => (
          <div key={t} className={'lb-tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {tab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card-flat"><div className="t-label-muted">AVG POINTS</div><div className="t-mono" style={{ fontSize: 28, color: 'var(--ink)', fontWeight: 700, marginTop: 8 }}>298</div><div className="t-mono" style={{ fontSize: 10, color: 'var(--green)', marginTop: 4 }}>▲ 42 vs LAST WK</div></div>
          <div className="card-flat"><div className="t-label-muted">SUBMISSION RATE</div><div className="t-mono" style={{ fontSize: 28, color: 'var(--off-white)', fontWeight: 700, marginTop: 8 }}>87%</div><div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>ON TIME</div></div>
          <div className="card-flat"><div className="t-label-muted">RITUAL ATTEND</div><div className="t-mono" style={{ fontSize: 28, color: 'var(--off-white)', fontWeight: 700, marginTop: 8 }}>93%</div><div className="t-mono" style={{ fontSize: 10, color: 'var(--green)', marginTop: 4 }}>▲ 5% vs LAST WK</div></div>
          <div className="card-flat" style={{ borderColor: 'rgba(239,68,68,0.3)' }}><div className="t-label-muted" style={{ color: 'var(--red)' }}>AT-RISK</div><div className="t-mono" style={{ fontSize: 28, color: 'var(--red)', fontWeight: 700, marginTop: 8 }}>2</div><div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>NO SUB IN 7+D</div></div>
        </div>
      )}

      {(tab === 'users' || tab === 'points' || tab === 'reports') && (
        <div className="lb-table">
          <div className="lb-header" style={{ gridTemplateColumns: '48px 1fr 140px 100px 100px 80px 120px' }}>
            <div></div><div>EXONAUT</div><div>TRACK</div><div>POINTS</div><div>MISSIONS</div><div>BADGES</div><div>ACTIONS</div>
          </div>
          {USERS.slice(0, 10).map(u => {
            const track = TRACKS.find(t => t.code === u.track);
            return (
              <div key={u.id} className="lb-row" style={{ gridTemplateColumns: '48px 1fr 140px 100px 100px 80px 120px' }}>
                <AvatarWithRing name={u.name} size={34} tier={u.tier} />
                <div className="lb-name">{u.name}<TierCrest tier={u.tier} /></div>
                <div className="lb-track">{track?.short}</div>
                <div className="lb-points">{u.points}</div>
                <div className="t-mono" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>3 / 7</div>
                <div className="lb-badges">{u.badges}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}><i className="fa-solid fa-bolt" /></button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}><i className="fa-solid fa-pen" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'missions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>
              REVIEW QUEUE · 4 AWAITING GRADE
            </div>
            <span className="section-meta">CREATE MISSIONS IN PLATFORM ADMIN · MISSION BUILDER</span>
          </div>
          {missions.map(m => (
            <div key={m.id} className="mission-row">
              <div className="mission-meta">
                <div className="mission-id">{m.id}</div>
                <div className="mission-title">{m.title}</div>
                <div className="mission-sub">CREATED BY MACK · {m.status.toUpperCase()} · {Math.floor(Math.random() * 20) + 5} ASSIGNED</div>
              </div>
              <div className="mission-points"><span className="plus">+</span>{m.points}</div>
              <button className="btn btn-ghost btn-sm">REVIEW</button>
              <button className="btn btn-ghost btn-sm"><i className="fa-solid fa-pen" /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'announce' && (
        <div>
          <div className="card-panel" style={{ marginBottom: 16 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>COMPOSE ANNOUNCEMENT</div>
            <input className="input" placeholder="Title…" style={{ marginBottom: 12 }} />
            <textarea className="textarea" rows={4} placeholder="Body — rich text supported" style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['info','action','celebration','urgent'].map(t => (
                  <div key={t} className="lb-filter">{t.toUpperCase()}</div>
                ))}
              </div>
              <button className="btn btn-primary"><i className="fa-solid fa-paper-plane" /> PUBLISH</button>
            </div>
          </div>
          <AnnouncementsPage />
        </div>
      )}

      {tab === 'badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {BADGES.map(b => (
            <div key={b.code} className="card-flat" style={{ textAlign: 'center', padding: 20 }}>
              <BadgeMedallion badge={b} size={50} />
              <div style={{ marginTop: 10 }} className="t-heading" >{b.name}</div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 6 }}>
                {Math.floor(Math.random() * 8)} / 30 AWARDED
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
                AWARD MANUALLY
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'rituals' && (
        <div className="ritual-row">
          {RITUALS.map(r => (
            <div key={r.id} className="ritual-cell pending" style={{ cursor: 'pointer' }}>
              <div className="ritual-head">
                <div className="ritual-name">{r.name}</div>
                <i className="fa-solid fa-gavel ritual-icon pend-c" />
              </div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>AWAITING MARK</div>
              <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}>BULK MARK</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== ALUMNI PORTAL ==========
function AlumniPage() {
  const { profile } = useCurrentUserProfile();
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const demoDay = window.getCohortDemoDay?.(activeCohort) || COHORT.demoDay;
  const demoDate = new Date(demoDay || '');
  const daysToDemo = isNaN(demoDate.getTime()) ? 0 : Math.max(0, Math.ceil((demoDate.getTime() - Date.now()) / 86400000));
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--lavender)' }}>EXONAUT CORPS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Alumni Portal</h1>
        </div>
      </div>
      <div className="card-panel" style={{ padding: 48, textAlign: 'center', background: 'rgba(176,149,197,0.06)', borderColor: 'rgba(176,149,197,0.2)' }}>
        <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 48, color: 'var(--lavender)', marginBottom: 20 }} />
        <h2 className="t-title" style={{ fontSize: 28, margin: '0 0 12px 0' }}>Your Corps Membership Activates on Launch Day</h2>
        <div className="t-body" style={{ maxWidth: 540, margin: '0 auto 24px', fontSize: 17 }}>
          On <span style={{ color: 'var(--ink)' }}>{demoDay}</span>, your profile, badges, and mission history become permanent. You'll gain access to the alumni directory, Hall of Exonauts, and Corps-only opportunities.
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)', letterSpacing: '0.15em' }}>
          T-MINUS {daysToDemo} DAYS TO CORPS INDUCTION
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="section-head">
          <h2 style={{ fontSize: 16 }}>Hall of Exonauts · Preview</h2>
          <span className="section-meta">PUBLIC · ALL-TIME</span>
        </div>
        <div className="lb-table">
          {[...USERS].sort((a,b) => b.points - a.points).slice(0, 5).map((u, i) => {
            const track = TRACKS.find(t => t.code === u.track);
            return (
              <div key={u.id} className="lb-row top-1" style={{ gridTemplateColumns: '56px 48px 1fr 1fr 120px 80px' }}>
                <div className="lb-rank">
                  {i === 0 && <i className="fa-solid fa-crown" style={{ color: 'var(--gold)' }} />}
                  #{i + 1}
                </div>
                <AvatarWithRing name={u.name} size={34} tier="corps" />
                <div className="lb-name">{u.name}<TierCrest tier="corps" /></div>
                <div className="lb-track">{track?.short} · 2026</div>
                <div className="lb-points">{u.points}</div>
                <div className="lb-badges">{u.badges}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== SETTINGS ==========
function SettingsPage() {
  const [prefs, setPrefs] = React.useState({ emailMissions: true, emailWeekly: true, inApp: true, privacy: 'cohort' });
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>ACCOUNT · PREFERENCES</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Settings</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card-panel">
          <div className="t-label" style={{ marginBottom: 14 }}>NOTIFICATIONS</div>
          {[
            { k: 'emailMissions', label: 'New mission email' },
            { k: 'emailWeekly', label: 'Weekly summary (Sunday)' },
            { k: 'inApp', label: 'In-app real-time' },
          ].map(x => (
            <label key={x.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--off-white-07)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--off-white)' }}>{x.label}</span>
              <div onClick={() => setPrefs(p => ({ ...p, [x.k]: !p[x.k] }))}
                   style={{ width: 40, height: 22, borderRadius: 11, background: prefs[x.k] ? 'var(--lime)' : 'var(--off-white-15)', cursor: 'pointer', position: 'relative', transition: 'background 200ms' }}>
                <div style={{ position: 'absolute', top: 2, left: prefs[x.k] ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-deep)', transition: 'left 200ms' }} />
              </div>
            </label>
          ))}
        </div>

        <div className="card-panel">
          <div className="t-label" style={{ marginBottom: 14 }}>PROFILE VISIBILITY</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { v: 'public', l: 'Public', d: 'Anyone with the link' },
              { v: 'cohort', l: 'Cohort only', d: 'Batch 2026 Exonauts + admins' },
              { v: 'private', l: 'Private', d: 'Admins only' },
            ].map(x => (
              <div key={x.v} onClick={() => setPrefs(p => ({ ...p, privacy: x.v }))}
                   style={{ padding: 14, border: '1px solid ' + (prefs.privacy === x.v ? 'var(--lime)' : 'var(--off-white-07)'), borderRadius: 4, cursor: 'pointer', background: prefs.privacy === x.v ? 'rgba(201,229,0,0.04)' : 'transparent' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: prefs.privacy === x.v ? 'var(--lime)' : 'var(--off-white)' }}>{x.l}</div>
                <div className="t-body" style={{ fontSize: 12, marginTop: 2 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-panel" style={{ marginTop: 20 }}>
        <div className="t-label" style={{ marginBottom: 14 }}>ACCOUNT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <button className="btn btn-ghost" style={{ justifyContent: 'center' }}><i className="fa-solid fa-key" /> CHANGE PASSWORD</button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center' }}><i className="fa-solid fa-download" /> EXPORT MY DATA</button>
          <button className="btn btn-danger" style={{ justifyContent: 'center' }}><i className="fa-solid fa-right-from-bracket" /> SIGN OUT</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Community — all current + alumni Exonauts, browsable directory
// ============================================================================

// Derive deterministic "credentials" and "project" per user so cards stay rich.
const COMMUNITY_CREDENTIALS = {
  AIS: ['AI Strategy', 'Python', 'ML Ops', 'Azure AI', 'Prompt Design', 'GenAI', 'Stakeholder Dx', 'Data Gov'],
  VB:  ['Venture Design', 'TRL Assessment', 'Pitch Dev', 'Market Sizing', 'Pre-Seed', 'Fin Modeling', 'Product-Market Fit', 'EBELI'],
  POL: ['Policy Analysis', 'Legislative Research', 'Stakeholder Mapping', 'Regulatory', 'Memo Writing', 'Econ Modeling', 'Gov Relations'],
  XM:  ['UX Research', 'Journey Mapping', 'Service Design', 'Prototyping', 'User Interviews', 'CX Analytics', 'Service Blueprint'],
  AID: ['Data Pipelines', 'SQL', 'Analytics Eng', 'Tableau', 'PowerBI', 'Python', 'dbt', 'Causal Inference'],
  LP:  ['Leadership', 'Team Coaching', 'OKRs', 'Strategy Ops', 'Change Mgmt', 'Exec Comms', 'Culture Design'],
  CC:  ['Brand Voice', 'Copywriting', 'Social Strategy', 'AI Content', 'Campaigns', 'Community Mgmt', 'Brand Audit'],
};

const COMMUNITY_PROJECTS_BY_TRACK = {
  AIS: [
    { title: 'AI Readiness Assessment · Kestrel Biotics',       output: '6-dim readiness scorecard, data-integration roadmap, board-ready 24-page report.', outcome: 'Client signed Phase-2 MOU; CTO briefed board on AI roadmap using deliverable verbatim.' },
    { title: 'GenAI Customer-Support POC · Nuvo Genomics',      output: 'Working Claude-based agent on 600 support tickets, eval harness, ops playbook.',     outcome: '41% reduction in avg handle-time; POC greenlit to production (Q2 launch).' },
    { title: 'Enterprise AI Roadmap · Paragon Retail',          output: '3-horizon AI roadmap, 14 use-case shortlist, 2 scoped GenAI POCs.',                  outcome: 'CEO mandate "ship 2 GenAI wins by EOY" structured around the roadmap.' },
    { title: 'LLM Governance Framework · Meridian Finance',     output: 'Risk-tiered governance framework aligned to MAS TRM guidelines + 22 controls.',     outcome: 'Framework adopted by Compliance; cleared blocker for vendor-AI onboarding.' },
    { title: 'Predictive Maintenance Pilot · Luzon Power',      output: 'Anomaly-detection pilot spec, labelled dataset (9K events), vendor shortlist.',     outcome: 'Pilot funded for 2026 capex cycle; internal DS team onboarded on approach.' },
  ],
  VB: [
    { title: 'TRL-6 Pitch Deck · Verde AgriTech',               output: '14-slide investor deck, financial model, TRL assessment, demo video.',              outcome: '$500K pre-seed raised within 9 weeks of Demo Day.' },
    { title: 'Investor-Ready Deck · Nomad Logistics',           output: 'Market-sizing analysis, ICP doc, 12-slide deck, 3 validated revenue channels.',     outcome: 'Founder closed 2 anchor customers; pre-seed round in active discussion.' },
    { title: 'Market Validation Report · Huro Health',          output: '48 user interviews, validated pains, LOI pipeline, pricing experiment results.',    outcome: 'Product pivoted from B2C to B2B-SaaS; initial 3 LOIs secured.' },
    { title: 'Pre-Seed Thesis · Cascade Payments',              output: 'Investment thesis, regulatory memo, founder market-fit scorecard.',                  outcome: 'Founder accepted to Antler cohort; $150K convertible-note closed.' },
  ],
  POL: [
    { title: 'Data Protection Policy Brief · ASEAN',            output: '38-page cross-jurisdictional analysis, gap matrix, 12 policy recommendations.',     outcome: 'Cited in ASEAN Digital Ministers\' Meeting working paper; adopted 3 recs.' },
    { title: 'Digital Transformation White Paper · DICT',       output: 'White paper on AI in govt services, 18-month roadmap, budget model.',                outcome: 'Used as reference doc in DICT 2026 strategy cycle; cited in Senate hearing.' },
    { title: 'AI Ethics Framework · PH Senate Committee',       output: 'Risk-based AI ethics framework + legislative draft section + comparative case studies.', outcome: 'Incorporated into committee report; pending endorsement for 2026 session.' },
    { title: 'Regulatory Sandbox Memo · MAS SG',                output: 'Sandbox criteria memo, participant eligibility model, 3 scenario walkthroughs.',   outcome: 'Memo referenced in MAS public consultation; author retained as analyst.' },
  ],
  XM: [
    { title: 'Patient Journey Redesign · Sereno Labs',          output: 'End-to-end journey map, 11 pain points, 4 prototyped touchpoint redesigns.',      outcome: 'Dropoff at matching step cut 18% → 7%; redesign shipped to production.' },
    { title: 'Omnichannel Service Blueprint · Paragon Retail',  output: 'Service blueprint across 5 channels, 23 moments-of-truth, fix backlog.',           outcome: 'NPS improved 14 pts over 6 mo; blueprint now reference doc for ops team.' },
    { title: 'Onboarding UX Audit · Cascade Payments',          output: 'Heuristic + user-test audit, prioritized findings, redesign specs for top 5.',    outcome: 'Activation rate improved 22%; audit methodology became internal standard.' },
    { title: 'Experience Mapping · Arc Mobility',               output: 'Driver + dispatcher journey maps, friction-heatmap, op-model recommendation.',    outcome: 'Dispatcher tool redesign funded; empty-miles KPI improved 9 pts.' },
  ],
  AID: [
    { title: 'Unified Analytics Warehouse · Delta Logistics',   output: 'dbt models, ELT pipelines, data contracts, Looker semantic layer.',                outcome: 'Time-to-insight from 5 days → 3 hours; warehouse powers 4 downstream apps.' },
    { title: 'Customer 360 Pipeline · Nuvo Genomics',           output: 'Reverse-ETL pipeline, identity resolution, 12 segments, Hightouch sync.',          outcome: 'Marketing CAC fell 19%; segments now drive automated campaigns.' },
    { title: 'Dashboard Suite · Ortus Insurance',               output: 'Claims, fraud, and NPS dashboards; 40+ metrics; executive one-pager.',             outcome: 'CEO weekly review runs off these dashboards; 2 FTEs reallocated from reporting.' },
    { title: 'Causal Analysis · Luzon Power',                   output: 'Difference-in-differences study on outage-response intervention + memo.',          outcome: 'Intervention rolled out network-wide; $1.4M annualized savings projected.' },
  ],
  LP: [
    { title: 'Leadership OS · Exoasia Internal',                output: 'Operating cadence, OKR system, decision-rights matrix, comms rhythm.',             outcome: 'Adopted as Exoasia leadership-team OS; replicated in 2 portfolio companies.' },
    { title: 'OKR Rollout Playbook · Paragon Retail',           output: 'Playbook, training deck, 90-day rollout plan, coaching schedule.',                 outcome: '92% team adoption in Q1; leadership Net Pulse score +11 pts.' },
    { title: 'Executive Comms Program · Nexa Health',           output: '6-week comms program for CMO + founder; storytelling, board-prep, media training.', outcome: 'Founder keynote at HIMSS APAC; CMO landed 2 tier-1 media features.' },
  ],
  CC: [
    { title: '90-Day Social Playbook · Huro Health',            output: 'Brand voice guide, content calendar, 24 published posts, measurement dashboard.',  outcome: 'Follower growth +38%; engagement-rate +24%; 1 viral post (340K reach).' },
    { title: 'Brand Voice Guide · Sereno Labs',                 output: '32-page voice + tone guide, do/don\'t examples, 8 template formats.',             outcome: 'Guide adopted by marketing + customer-success; tone consistency +31%.' },
    { title: 'AI Content Workflow · Verde AgriTech',            output: 'End-to-end AI-assisted content pipeline + prompts library + QA rubric.',           outcome: 'Content output 2.4×; cost-per-post down 62%; workflow replicated for 2 clients.' },
    { title: 'Campaign Launch · Cascade Payments',              output: 'Multi-channel campaign brief, 5 creative assets, influencer deck, results memo.', outcome: 'Campaign drove 1,200 signups in 3 weeks; CPL 42% under benchmark.' },
  ],
};

const COMMUNITY_COHORT_YEARS = ['2024', '2025', '2026', '2027'];

// Deterministic social-handle generator based on name — gives each member
// plausible @handles and URLs so profile cards feel real.
function makeSocials(name, id) {
  const slug = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
  const first = slug[0] || 'user';
  const last = slug[slug.length - 1] || '';
  const h = (id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // Vary handle styles so they don't all look identical
  const styles = [
    `${first}.${last}`,
    `${first}${last}`,
    `${first}_${last}`,
    `${first[0]}${last}`,
    `${first}${(h % 90) + 10}`,
  ];
  const ig   = styles[h % styles.length];
  const fb   = styles[(h + 1) % styles.length];
  const li   = `${first}-${last}-${(h % 900) + 100}`;
  const gh   = styles[(h + 2) % styles.length];
  return {
    linkedin: { handle: li,  url: `https://linkedin.com/in/${li}` },
    instagram:{ handle: ig,  url: `https://instagram.com/${ig}` },
    facebook: { handle: fb,  url: `https://facebook.com/${fb}` },
    github:   { handle: gh,  url: `https://github.com/${gh}` },
  };
}

function getCommunityMembers(profiles, ledger = [], subs = [], projectState = {}) {
  // Active = Supabase user_profiles across roles. Alumni can be added later.
  const activeTierFor = (u) => u.points >= 900 ? 'platinum' : u.points >= 600 ? 'gold' : u.points >= 300 ? 'silver' : 'bronze';
  const roleLabel = (role) => {
    if (role === 'lead') return 'Mission Lead';
    if (role === 'commander') return 'Mission Commander';
    if (role === 'admin') return 'Platform Admin';
    return 'Exonaut';
  };
  const projects = projectState.projects || [];
  const tasks = projectState.tasks || [];
  const assignees = projectState.assignees || [];
  const projectRosterFor = window.__projectStore?.projectRoster || (() => []);

  function liveBadgesFor(points) {
    return BADGES.map(b => {
      const milestone = (window.MILESTONES || []).find(m => m.code === b.code);
      return { ...b, earned: milestone ? points >= milestone.at : !!b.earned };
    }).filter(b => b.earned);
  }

  function projectsForUser(userId) {
    return projects.filter(project => {
      if (project.status === 'archived') return false;
      if (project.firstOfficerId === userId) return true;
      if ((project.trackCodes || []).some(code => window.__crownStore?.getActiveCrownForTrack(code)?.userId === userId)) return true;
      if (projectRosterFor(project.id).includes(userId)) return true;
      return tasks.some(task => task.projectId === project.id && (
        task.trackLeadId === userId ||
        task.secondOfficerId === userId ||
        assignees.some(a => a.taskId === task.id && a.userId === userId)
      ));
    });
  }

  const active = (profiles || []).map(p => {
    const trackCode = p.trackCode || 'AIS';
    const points = ledger
      .filter(e => e.userId === p.id)
      .reduce((sum, e) => sum + Number(e.points || 0), 0);
    const earnedBadges = liveBadgesFor(points);
    const userSubs = subs.filter(s => s.exonautId === p.id);
    const approvedSubs = userSubs.filter(s => s.state === 'approved');
    const pendingSubs = userSubs.filter(s => s.state === 'pending');
    const userProjects = projectsForUser(p.id);
    const approvedProjectTasks = tasks.filter(t =>
      t.status === 'approved' &&
      (t.trackLeadId === p.id || t.secondOfficerId === p.id || assignees.some(a => a.taskId === t.id && a.userId === p.id))
    );
    const cohort = COHORTS.find(c => c.id === (p.cohortId || 'c2627'));
    const credentials = [
      p.expertise,
      p.school,
      TRACKS.find(t => t.code === trackCode)?.short,
      roleLabel(p.role),
    ].filter(Boolean);
    const primaryProject = userProjects[0];
    return {
      id: p.id,
      name: p.fullName || p.email || roleLabel(p.role),
      email: p.email,
      avatarUrl: p.avatarUrl || '',
      roleKey: p.role || 'exonaut',
      role: roleLabel(p.role),
      track: trackCode,
      points,
      tier: p.role === 'exonaut' ? (points >= 300 ? 'prime' : 'builder') : 'corps',
      badges: earnedBadges.length,
      earnedBadges,
      status: 'active',
      cohort: (cohort?.name || 'Batch 2026-27').replace('Batch ', ''),
      tierBadge: p.role === 'exonaut' ? activeTierFor({ points }) : 'corps',
      credentials,
      project: primaryProject ? {
        title: primaryProject.title,
        output: primaryProject.description || 'Assigned project',
        outcome: `${tasks.filter(t => t.projectId === primaryProject.id && t.status === 'approved').length}/${tasks.filter(t => t.projectId === primaryProject.id).length} tasks approved`,
      } : null,
      projectsAll: userProjects.map(project => ({
        title: project.title,
        output: project.description || 'Assigned project',
        outcome: `${tasks.filter(t => t.projectId === project.id && t.status === 'approved').length}/${tasks.filter(t => t.projectId === project.id).length} tasks approved`,
      })),
      progress: {
        trackTasksApproved: approvedSubs.length,
        pendingReviews: pendingSubs.length,
        projectTasksApproved: approvedProjectTasks.length,
        projectsAssigned: userProjects.length,
      },
      recentApprovals: approvedSubs
        .slice()
        .sort((a, b) => new Date(b.gradedAt || b.submittedAtIso || 0) - new Date(a.gradedAt || a.submittedAtIso || 0))
        .slice(0, 5),
      socials: p.linkedinUrl ? {
        linkedin: { handle: p.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, ''), url: p.linkedinUrl },
      } : null,
    };
  });

  const alumniSeed = [];
  const alumni = alumniSeed.map(u => {
    const creds = COMMUNITY_CREDENTIALS[u.track] || [];
    const projects = COMMUNITY_PROJECTS_BY_TRACK[u.track] || [];
    const hash = u.id.charCodeAt(1) + u.id.charCodeAt(2);
    return {
      ...u,
      status: 'alumni',
      tierBadge: activeTierFor(u),
      credentials: creds.slice(hash % 3, hash % 3 + 5),
      project: projects[hash % projects.length],
      projectsAll: projects,
      socials: makeSocials(u.name, u.id),
    };
  });

  return [...active, ...alumni];
}

function CommunityPage() {
  const { profiles, loading } = useUserProfiles();
  const { ledger } = usePoints();
  const subs = useSubs();
  const projectState = useProjects();
  const [tab, setTab] = React.useState(() => localStorage.getItem('exo:community:tab') || 'directory');
  React.useEffect(() => { localStorage.setItem('exo:community:tab', tab); }, [tab]);
  const [filter, setFilter] = React.useState('all');     // all | active | alumni
  const [trackFilter, setTrackFilter] = React.useState('all');
  const [batchFilter, setBatchFilter] = React.useState('all');   // alumni cohort year
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const members = React.useMemo(() => getCommunityMembers(profiles, ledger, subs, projectState), [profiles, ledger, subs, projectState]);

  // Unique batches (cohort years) across all members, sorted newest → oldest
  const allBatches = React.useMemo(() => {
    return Array.from(new Set(members.map(m => m.cohort))).sort((a, b) => b.localeCompare(a));
  }, [members]);

  const filtered = members.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (trackFilter !== 'all' && m.track !== trackFilter) return false;
    if (batchFilter !== 'all' && m.cohort !== batchFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const projectText = (m.project && m.project.title) || '';
      const emailText = m.email || '';
      if (!(m.name.toLowerCase().includes(q) || emailText.toLowerCase().includes(q) || projectText.toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const counts = {
    all: members.length,
    active: members.filter(m => m.status === 'active').length,
    alumni: members.filter(m => m.status === 'alumni').length,
  };

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--lavender)' }}>CULTURE · COMMUNITY</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Community</h1>
          <div className="t-body" style={{ marginTop: 6, color: 'var(--off-white-68)' }}>
            {tab === 'directory'
              ? 'Every Exonaut — active and alumni. Browse profiles to see badges, credentials, and projects.'
              : 'Message board for the cohort. Post, vote, and comment.'}
          </div>
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-68)', letterSpacing: '0.08em' }}>
          <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{counts.active}</span> ACTIVE · <span style={{ color: 'var(--off-white)', fontWeight: 700 }}>{counts.alumni}</span> ALUMNI
        </div>
      </div>

      {/* Top-level tab switcher */}
      <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--off-white-07)', borderRadius: 2, marginBottom: 20, width: 'fit-content' }}>
        {[
          { id: 'directory', label: 'Directory', icon: 'fa-id-card' },
          { id: 'board',     label: 'Message Board', icon: 'fa-comments' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', background: tab === t.id ? 'var(--ink)' : 'transparent',
            color: tab === t.id ? 'var(--deep-black)' : 'var(--off-white-68)',
            border: 'none', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 10,
            fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><i className={'fa-solid ' + t.icon} />{t.label}</button>
        ))}
      </div>

      {tab === 'board' ? <CommunityBoard /> : (
        <React.Fragment>
      {loading && (
        <div className="card-panel" style={{ padding: 18, marginBottom: 16 }}>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>Loading community profiles...</div>
        </div>
      )}
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--off-white-07)', borderRadius: 2 }}>
          {[
            { id: 'all',    label: 'All · ' + counts.all },
            { id: 'active', label: 'Active · ' + counts.active },
            { id: 'alumni', label: 'Alumni · ' + counts.alumni },
          ].map(opt => (
            <button key={opt.id} onClick={() => setFilter(opt.id)} style={{
              padding: '7px 14px', background: filter === opt.id ? 'var(--ink)' : 'transparent',
              color: filter === opt.id ? 'var(--deep-black)' : 'var(--off-white-68)',
              border: 'none', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 10,
              fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase',
            }}>{opt.label}</button>
          ))}
        </div>

        <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} style={{
          padding: '7px 10px', background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer',
        }}>
          <option value="all">ALL TRACKS</option>
          {TRACKS.map(t => <option key={t.code} value={t.code}>{t.short}</option>)}
        </select>

        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{
          padding: '7px 10px', background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer',
        }}>
          <option value="all">ALL BATCHES</option>
          {allBatches.map(b => <option key={b} value={b}>BATCH {b}</option>)}
        </select>

        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 11 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names, projects, companies…"
            style={{
              width: '100%', padding: '7px 12px 7px 30px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none',
            }} />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: 48 }}>
          <i className="fa-solid fa-user-slash" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 12 }} />
          <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No members match your filters.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {filtered.map(m => (
            <CommunityCard key={m.id} m={m} onOpen={() => setSelected(m)} />
          ))}
        </div>
      )}

      {selected && <CommunityProfileSheet m={selected} onClose={() => setSelected(null)} />}
        </React.Fragment>
      )}
    </div>
  );
}

function CommunityCard({ m, onOpen }) {
  const track = TRACKS.find(t => t.code === m.track);
  const isAlumni = m.status === 'alumni';
  const roleStyle = !isAlumni && m.roleKey !== 'exonaut' ? roleBadgeStyle(m.roleKey) : null;
  return (
    <div onClick={onOpen} className="card-panel" style={{
      padding: 16, cursor: 'pointer', transition: 'all 0.15s',
      borderColor: 'var(--off-white-15)',
      background: 'transparent',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.background = 'rgba(201,229,0,0.03)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--off-white-15)'; e.currentTarget.style.background = 'transparent'; }}>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <AvatarWithRing name={m.name} avatarUrl={m.avatarUrl} size={44} tier={m.tierBadge} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {m.name}
            </div>
            {isAlumni && (
              <span className="t-mono" style={{
                fontSize: 8, padding: '2px 6px', borderRadius: 2, flexShrink: 0,
                border: '1px solid var(--lavender)', color: 'var(--lavender)',
                letterSpacing: '0.08em', fontWeight: 700, background: 'rgba(176,149,197,0.08)',
              }}>
                <i className="fa-solid fa-graduation-cap" style={{ fontSize: 7, marginRight: 3 }} />ALUMNI
              </span>
            )}
            {roleStyle && (
              <span className="t-mono" style={{
                fontSize: 8, padding: '2px 6px', borderRadius: 2, flexShrink: 0,
                color: roleStyle.fg, background: roleStyle.bg,
                letterSpacing: '0.08em', fontWeight: 700,
              }}>
                {roleStyle.label}
              </span>
            )}
          </div>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 3, letterSpacing: '0.06em' }}>
            BATCH {m.cohort} · {track?.short}
          </div>
        </div>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--ink)', fontWeight: 700, letterSpacing: '0.04em', textAlign: 'right', whiteSpace: 'nowrap' }}>
          {m.badges} <i className="fa-solid fa-medal" style={{ fontSize: 9 }} />
        </div>
      </div>

      {/* Role / project */}
      <div className="t-body" style={{
        fontSize: 11, color: 'var(--off-white-68)', lineHeight: 1.45, marginBottom: 10,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {m.role || (m.project && m.project.title)}
      </div>

      {/* Credentials as tiny chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {m.credentials.slice(0, 3).map(c => (
          <span key={c} className="t-mono" style={{
            fontSize: 8, padding: '2px 6px', border: '1px solid var(--off-white-15)', borderRadius: 2,
            color: 'var(--off-white-68)', letterSpacing: '0.04em',
          }}>{c.toUpperCase()}</span>
        ))}
        {m.credentials.length > 3 && (
          <span className="t-mono" style={{ fontSize: 8, padding: '2px 6px', color: 'var(--off-white-40)', letterSpacing: '0.04em' }}>
            +{m.credentials.length - 3}
          </span>
        )}
      </div>

      {/* Socials mini row */}
      {m.socials?.linkedin && (
        <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid var(--off-white-07)' }}>
          {[
            { k: 'linkedin',  icon: 'fa-brands fa-linkedin-in', color: '#0A66C2' },
          ].filter(s => m.socials?.[s.k]).map(s => (
            <a key={s.k} href={m.socials[s.k].url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={'@' + m.socials[s.k].handle}
              style={{
                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--off-white-15)', borderRadius: 2, color: 'var(--off-white-68)',
                textDecoration: 'none', transition: 'all 0.15s', background: 'var(--off-white-07)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = s.color; e.currentTarget.style.borderColor = s.color; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--off-white-68)'; e.currentTarget.style.borderColor = 'var(--off-white-15)'; }}>
              <i className={s.icon} style={{ fontSize: 9 }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityProfileSheet({ m, onClose }) {
  const track = TRACKS.find(t => t.code === m.track);
  const isAlumni = m.status === 'alumni';
  const displayBadges = m.earnedBadges || [];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(720px, 100%)', maxHeight: '85vh', overflowY: 'auto', padding: 0,
        borderColor: 'var(--lime)',
      }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <AvatarWithRing name={m.name} avatarUrl={m.avatarUrl} size={72} tier={m.tierBadge} />
            <div style={{ flex: 1 }}>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
                BATCH {m.cohort}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 6px 0' }}>
                <h2 className="t-title" style={{ fontSize: 26, margin: 0 }}>{m.name}</h2>
                {isAlumni && (
                  <span className="t-mono" style={{
                    fontSize: 9, padding: '4px 8px', borderRadius: 2,
                    border: '1px solid var(--lavender)', color: 'var(--lavender)',
                    letterSpacing: '0.1em', fontWeight: 700, background: 'rgba(176,149,197,0.1)',
                  }}>
                    <i className="fa-solid fa-graduation-cap" style={{ fontSize: 9, marginRight: 5 }} />ALUMNI
                  </span>
                )}
              </div>
              <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)' }}>
                {track?.emoji} {track?.name} · {track?.short}
              </div>
              {m.role && (
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', marginTop: 6 }}>
                  <i className="fa-solid fa-briefcase" style={{ color: 'var(--off-white-40)', fontSize: 10, marginRight: 6 }} />
                  {m.role}
                </div>
              )}
            </div>
          </div>

          {/* stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 20, padding: '12px 0', borderTop: '1px solid var(--off-white-07)' }}>
            {[
              { k: 'POINTS', v: m.points },
              { k: 'BADGES', v: m.badges },
              { k: 'TRACK APPROVED', v: m.progress?.trackTasksApproved || 0 },
              { k: 'PROJECTS', v: m.progress?.projectsAssigned || 0 },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: i === 0 ? 'left' : 'center', borderLeft: i === 0 ? 'none' : '1px solid var(--off-white-07)' }}>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>{s.k}</div>
                <div className="t-heading" style={{ fontSize: 16, marginTop: 3, color: 'var(--ink)', fontWeight: 700 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--off-white-07)' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>BADGES · {m.badges} EARNED</div>
          {displayBadges.length === 0 ? (
            <div className="empty-line">No badges earned yet.</div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {displayBadges.map((b, i) => (
              <div key={i} title={b.name} style={{
                aspectRatio: '1', border: '1px solid ' + (b.color || 'var(--off-white-15)'),
                background: (b.color || '#888') + '15', borderRadius: 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 6, textAlign: 'center',
              }}>
                <i className="fa-solid fa-medal" style={{ color: b.color || 'var(--off-white-68)', fontSize: 16, marginBottom: 4 }} />
                <div className="t-mono" style={{ fontSize: 7, color: 'var(--off-white-68)', letterSpacing: '0.04em', lineHeight: 1.2, textAlign: 'center' }}>
                  {b.name.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Credentials */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--off-white-07)' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>CREDENTIALS & SKILLS</div>
          {m.credentials.length === 0 ? (
            <div className="empty-line">No profile skills added yet.</div>
          ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {m.credentials.map(c => (
              <span key={c} className="t-mono" style={{
                fontSize: 10, padding: '5px 10px', border: '1px solid var(--off-white-15)', borderRadius: 2,
                color: 'var(--off-white)', letterSpacing: '0.04em', background: 'var(--off-white-07)',
              }}>{c.toUpperCase()}</span>
            ))}
          </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--off-white-07)' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>LIVE PROGRESS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { k: 'TRACK APPROVED', v: m.progress?.trackTasksApproved || 0 },
              { k: 'PENDING REVIEW', v: m.progress?.pendingReviews || 0 },
              { k: 'PROJECT TASKS', v: m.progress?.projectTasksApproved || 0 },
              { k: 'PROJECTS', v: m.progress?.projectsAssigned || 0 },
            ].map(item => (
              <div key={item.k} className="card-flat" style={{ padding: 12 }}>
                <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>{item.k}</div>
                <div className="t-heading" style={{ fontSize: 18, marginTop: 5, color: 'var(--ink)' }}>{item.v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {(m.recentApprovals || []).length === 0 ? (
              <div className="empty-line">No approved track tasks yet.</div>
            ) : (m.recentApprovals || []).map(a => (
              <div key={a.id} className="card-flat" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>{a.missionTitle}</div>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 3 }}>{a.grade ? String(a.grade).toUpperCase() : 'APPROVED'}</div>
                </div>
                <div className="mission-points"><span className="plus">+</span>{a.pointsAwarded || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Socials */}
        {m.socials?.linkedin && (
          <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--off-white-07)' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>CONNECT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { k: 'linkedin',  icon: 'fa-brands fa-linkedin-in', color: '#0A66C2', label: 'LinkedIn' },
              ].filter(s => m.socials?.[s.k]).map(s => (
                <a key={s.k} href={m.socials[s.k].url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', border: '1px solid var(--off-white-15)', borderRadius: 2,
                    background: 'var(--off-white-07)', color: 'var(--off-white)', textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--off-white-15)'; e.currentTarget.style.background = 'var(--off-white-07)'; }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 2, background: s.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className={s.icon} style={{ color: s.color, fontSize: 13 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</div>
                    <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{m.socials[s.k].handle}
                    </div>
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: 'var(--off-white-40)', fontSize: 10 }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        <div style={{ padding: '20px 32px' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>PROJECTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Current / capstone project — full detail */}
            {!m.project && <div className="empty-line">No assigned projects yet.</div>}
            {m.project && (
              <div style={{
                padding: '14px 16px',
                border: '1px solid rgba(201,229,0,0.25)',
                borderRadius: 2,
                background: 'rgba(201,229,0,0.03)',
              }}>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--ink)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                  {isAlumni ? 'CAPSTONE PROJECT' : 'CURRENT PROJECT'}
                </div>
                <div className="t-heading" style={{ fontSize: 14, color: 'var(--off-white)', textTransform: 'none', letterSpacing: 0, margin: '0 0 10px 0' }}>
                  {m.project.title}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  <div>
                    <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 3 }}>↳ OUTPUT</div>
                    <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', lineHeight: 1.5 }}>{m.project.output}</div>
                  </div>
                  <div>
                    <div className="t-mono" style={{ fontSize: 8, color: 'var(--ink)', letterSpacing: '0.1em', marginBottom: 3, fontWeight: 700 }}>↳ OUTCOME</div>
                    <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', lineHeight: 1.5 }}>{m.project.outcome}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Earlier projects for alumni — compact */}
            {(m.projectsAll || []).filter(p => p.title !== m.project?.title).slice(0, 4).map((p, i) => (
              <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--off-white-15)', borderRadius: 2 }}>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
                  ASSIGNED PROJECT
                </div>
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', marginBottom: 6, fontWeight: 500 }}>{p.title}</div>
                <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--off-white-40)' }}>Outcome: </span>{p.outcome}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MissionsList: WeeklyMissionsList, KudosFeed, RitualsPage, AnnouncementsPage, NotificationsPage, AdminPanel, AlumniPage, SettingsPage, CommunityPage });
