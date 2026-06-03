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
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const cohortMembers = window.getUsersForCohort?.(activeCohort?.id || profile.cohortId || ME.cohort) || [];
  const { total: livePoints, delta: liveDelta } = useComputedPoints(profile.id);
  const rowsFromProfiles = useSupabaseExonautRows();
  const rankedRows = React.useMemo(
    () => window.rankExonautRows ? window.rankExonautRows(rowsFromProfiles) : [...rowsFromProfiles].sort((a,b) => b.points - a.points).map((u, i) => ({ ...u, cohortRank: i + 1 })),
    [rowsFromProfiles]
  );
  const liveRank = rankedRows.find(u => u.id === profile.id)?.cohortRank || 1;
  const tierProgress = window.getTierProgressForPoints
    ? window.getTierProgressForPoints(livePoints)
    : { tier: 'entry', current: TIERS.entry, next: TIERS.builder, pointsOver: livePoints, pointsToNext: Math.max(0, 100 - livePoints) };
  const liveBadges = useLiveBadges(profile.id);
  const missions = useMissions();
  useManualCredits();
  const { projects, tasks, assignees } = useProjects();
  const earnedCount = liveBadges.filter(b => b.earned).length;
  const badgeMilestones = Array.isArray(window.MILESTONES) ? window.MILESTONES : [];
  const earnedMilestone = [...badgeMilestones].reverse().find(m => livePoints >= m.at);
  const nextMilestone = badgeMilestones.find(m => livePoints < m.at);
  const badgeMeta = earnedMilestone
    ? `AUTO · ${earnedMilestone.name.toUpperCase()}`
    : nextMilestone
      ? `AUTO · NEXT ${nextMilestone.name.toUpperCase()}`
      : earnedCount
        ? 'AUTO · MILESTONE EARNED'
        : 'AUTO · NO BADGES YET';
  useSubs();
  const myTrack = profile.trackCode || ME.track || 'AIS';
  const myCohort = activeCohort?.id || profile.cohortId || ME.cohort || 'c2627';
  const trackMissions = missions.filter(m => (m.cohortId || 'c2627') === myCohort && (!m.track || m.track === myTrack));
  const completed = trackMissions.filter(m => window.getSubmissionForMission?.(m, profile.id, myCohort)?.state === 'approved').length;
  const activeCount = Math.max(0, trackMissions.length - completed);
  return (
    <div className="stat-grid card-hud">
      <StatCell label="TOTAL POINTS" icon="fa-bolt" value={livePoints} lime
        meta={liveDelta > 0 ? `AUTO · +${liveDelta} JUST GRADED` : 'AUTO · +85 THIS WEEK'} metaDir="up" />
      <StatCell label="RANK" icon="fa-ranking-star"
        value={`#${liveRank}`} unit={`of ${rankedRows.length || cohortMembers.length || COHORT.size}`}
        meta="+3 vs LAST WK" metaDir="up" />
      <StatCell label="TIER" icon="fa-shield-halved"
        value={tierProgress.current.short} unit={`·\u00A0${tierProgress.pointsOver} over`}
        meta={tierProgress.next ? `${tierProgress.pointsToNext} TO ${tierProgress.next.short}` : 'TOP TIER'} metaDir="flat" />
      <StatCell label="TRACK" icon="fa-bullseye"
        value={completed} unit={`of ${trackMissions.length}`}
        meta={`${activeCount} ACTIVE`} metaDir="flat" />
      <StatCell label="PROJECT" icon="fa-diagram-project"
        value={tasks.filter(t => assignees.some(a => a.taskId === t.id && a.userId === profile.id)).length}
        unit={`of ${projects.length}`}
        meta={`${tasks.filter(t => t.status !== 'approved').length} TASKS`} metaDir="flat" />
      <StatCell label="BADGES" icon="fa-medal"
        value={earnedCount} unit="of 22"
        meta={badgeMeta} metaDir={earnedMilestone ? 'up' : 'flat'} />
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

function formatPillarDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function formatDaysAgo(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.floor((today - target) / dayMs));
  if (diff === 0) return 'TODAY';
  if (diff === 1) return '1D AGO';
  return `${diff}D AGO`;
}

function fallbackClientTouchDate() {
  const date = new Date();
  date.setDate(date.getDate() - 3);
  return date;
}

function RecruitReferralModal({ profile, onClose }) {
  const [draft, setDraft] = React.useState({
    candidateName: '',
    candidateEmail: '',
    candidateLinkedin: '',
    trackFit: profile.trackCode || 'AIS',
    relationship: '',
    reason: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const setField = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const canSubmit = draft.candidateName.trim() && (draft.candidateEmail.trim() || draft.candidateLinkedin.trim());

  async function submit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');
    try {
      await window.__recruitmentStore.submit(draft, profile);
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not submit recruit.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card-panel" onClick={event => event.stopPropagation()} style={{ width: 'min(560px, calc(100vw - 32px))', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="t-mono" style={{ color: 'var(--ink-muted)', fontSize: 10 }}>RECRUITMENT PIPELINE</div>
            <h2 style={{ margin: '4px 0 0' }}>Add a Recruit</h2>
          </div>
          <button className="chatbot-close" onClick={onClose} title="Close"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 12 }}>
          {error && <div style={{ color: 'var(--coral)', fontSize: 12, fontWeight: 700 }}>{error}</div>}
          <label className="admin-assignment-field">
            <span className="admin-assignment-field-label">Candidate Name</span>
            <input className="input" value={draft.candidateName} onChange={e => setField('candidateName', e.target.value)} placeholder="Full name" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="admin-assignment-field">
              <span className="admin-assignment-field-label">Email</span>
              <input className="input" value={draft.candidateEmail} onChange={e => setField('candidateEmail', e.target.value)} placeholder="name@email.com" />
            </label>
            <label className="admin-assignment-field">
              <span className="admin-assignment-field-label">LinkedIn / Portfolio</span>
              <input className="input" value={draft.candidateLinkedin} onChange={e => setField('candidateLinkedin', e.target.value)} placeholder="https://..." />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="admin-assignment-field">
              <span className="admin-assignment-field-label">Track Fit</span>
              <select className="select" value={draft.trackFit} onChange={e => setField('trackFit', e.target.value)}>
                {TRACKS.map(track => <option key={track.code} value={track.code}>{track.short || track.code}</option>)}
              </select>
            </label>
            <label className="admin-assignment-field">
              <span className="admin-assignment-field-label">Relationship</span>
              <input className="input" value={draft.relationship} onChange={e => setField('relationship', e.target.value)} placeholder="Classmate, colleague, friend..." />
            </label>
          </div>
          <label className="admin-assignment-field">
            <span className="admin-assignment-field-label">Why are they a fit?</span>
            <textarea className="textarea" rows={4} value={draft.reason} onChange={e => setField('reason', e.target.value)} placeholder="Short context for the reviewer." />
          </label>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!canSubmit || saving} style={{ opacity: canSubmit && !saving ? 1 : 0.45 }} onClick={submit}>
            <i className="fa-solid fa-user-plus" /> {saving ? 'Submitting...' : 'Submit Recruit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PillarGrid() {
  const { profile } = useCurrentUserProfile();
  const { breakdown, entries } = useUserPoints(profile.id);
  const recruitmentState = window.useRecruitment();
  const [recruitOpen, setRecruitOpen] = React.useState(false);
  const missions = useMissions();
  useManualCredits();
  const projectMissions = missions.filter(m => m.pillar === 'project' || m.pillar === 'missions').slice(0, 3);
  const missionPoints = (breakdown.missions || 0) + (breakdown.project || 0);
  const lastClientTouch = React.useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const clientDates = (entries || [])
      .filter(e => e.pillar === 'client' && (e.awardedAt || e.createdAt || e.creditedAt))
      .map(e => new Date(e.awardedAt || e.createdAt || e.creditedAt))
      .filter(date => !Number.isNaN(date.getTime()) && date <= endOfToday)
      .sort((a, b) => b - a);
    return clientDates[0] || fallbackClientTouchDate();
  }, [entries]);
  const lastClientTouchLabel = `${formatPillarDate(lastClientTouch)} · ${formatDaysAgo(lastClientTouch)}`;
  const recruitSummary = React.useMemo(
    () => window.__recruitmentStore.summaryForUser(profile.id),
    [recruitmentState.referrals, profile.id]
  );
  const latestStage = recruitSummary.latest ? window.__recruitmentStore.STATUS_STAGES.find(stage => stage.id === recruitSummary.latest.status) : null;
  return (
    <div className="pillar-grid">
      <PillarCard idx="01" klass="p1" title="Missions" weight={40}
        current={missionPoints} max={400} caption="40% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>RECENT SUBMISSIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {projectMissions.length === 0 && (
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-40)' }}>No track tasks yet.</div>
          )}
          {projectMissions.map(m => {
            const liveStatus = window.getSubmissionForMission?.(m, profile.id, profile.cohortId || ME.cohort)?.state || m.status;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', gap: 8 }}>
                <span style={{ color: 'var(--off-white-68)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                <span className={'status-pill status-' + (liveStatus === 'approved' ? 'approved' : liveStatus === 'in-progress' ? 'in-progress' : liveStatus === 'pending' ? 'submitted' : 'not-started')}>
                  {liveStatus === 'approved' ? 'APPR' : liveStatus === 'in-progress' ? 'WIP' : liveStatus === 'pending' ? 'SUB' : 'NEW'}
                </span>
              </div>
            );
          })}
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
          LAST TOUCH · {lastClientTouchLabel}
        </div>
      </PillarCard>

      <PillarCard idx="03" klass="p3" title="Recruitment" weight={25}
        current={breakdown.recruitment || 0} max={250} caption="25% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>PIPELINE STATUS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--lavender)', fontWeight: 700 }}>{recruitSummary.submitted}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--off-white-68)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {recruitSummary.submitted === 1 ? 'CANDIDATE SUBMITTED' : 'CANDIDATES SUBMITTED'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 14 }}>
          ACTIVE · {recruitSummary.active} · JOINED · {recruitSummary.joined}
          {latestStage && ` · LATEST · ${latestStage.label.toUpperCase()}`}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setRecruitOpen(true)}>
          <i className="fa-solid fa-user-plus" /> ADD A RECRUIT
        </button>
        {recruitOpen && <RecruitReferralModal profile={profile} onClose={() => setRecruitOpen(false)} />}
      </PillarCard>
    </div>
  );
}

function RitualTracker() {
  const { profile } = useCurrentUserProfile();
  useCohort();
  const { records } = useRitualState(profile.id);
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const timeline = window.getCohortTimeline?.(activeCohort);
  const currentWeek = timeline?.valid ? timeline.currentWeek : COHORT.week;
  const weekLabel = window.getCohortWeekWindowLabel?.(activeCohort, currentWeek) || '';
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-head">
        <h2>Weekly Ritual Tracker</h2>
        <span className="section-meta">WEEK {currentWeek} · {weekLabel}</span>
      </div>
      <div className="ritual-row">
        {RITUALS.map(r => {
          const state = records[r.id]?.state || 'not-started';
          const iconCls =
            state === 'done' ? 'fa-circle-check' :
            state === 'missed' ? 'fa-circle-xmark' :
            'fa-circle-dot';
          const cCls = state === 'done' ? 'done-c' : state === 'missed' ? 'miss-c' : 'pend-c';
          return (
            <div key={r.id} className={'ritual-cell ' + state} title={r.id === 'iotw' ? 'Auto-logged from leaderboard' : 'Open Rituals page to submit proof'}>
              <div className="ritual-head">
                <div className="ritual-name">{r.name}</div>
                <i className={'fa-solid ' + iconCls + ' ritual-icon ' + cCls} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em' }}>
                {state === 'done' ? 'LOGGED' : state === 'missed' ? 'MISSED' : 'PENDING'}
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
  useManualCredits();
  const { profile } = useCurrentUserProfile();
  useCohort();
  const missions = useMissions();
  const myTrack = profile.trackCode || ME.track || 'AIS';
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const myCohort = activeCohort?.id || profile.cohortId || ME.cohort || 'c2627';
  const timeline = window.getCohortTimeline?.(activeCohort);
  const currentWeek = timeline?.valid ? timeline.currentWeek : (COHORT.week || 1);
  const [selectedWeek, setSelectedWeek] = React.useState(currentWeek);
  const scopedMissions = missions
    .filter(m => (m.cohortId || 'c2627') === myCohort && (!m.track || m.track === myTrack));
  const weekOptions = Array.from(new Set(scopedMissions.map(m => Number(m.week || 0)).filter(Boolean)))
    .sort((a, b) => a - b);
  const activeWeek = weekOptions.includes(selectedWeek)
    ? selectedWeek
    : (weekOptions.includes(currentWeek) ? currentWeek : weekOptions[0]);
  const upcoming = scopedMissions
    .filter(m => Number(m.week || 0) === activeWeek)
    .sort((a,b) => a.dueIn - b.dueIn);
  return (
    <div>
      <div className="section-head">
        <h2>Track Feed</h2>
        <span className="section-meta">WEEK {String(activeWeek || currentWeek).padStart(2, '0')} - {upcoming.length} TRACK TASKS</span>
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
            <div className="t-heading" style={{ fontSize: 14, marginBottom: 6 }}>No track tasks for this week</div>
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
              Pick another week or wait for Platform Admin to publish this week's track tasks.
            </div>
          </div>
        )}
        {upcoming.map(m => {
          const mySub = window.getSubmissionForMission?.(m, profile.id, myCohort)
            || subs.find(s => s.exonautId === profile.id && s.missionId === m.id);
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
          const awardedPoints = liveStatus === 'approved' && mySub?.pointsAwarded != null
            ? Number(mySub.pointsAwarded)
            : Number(m.points || 0);
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
              <div className="mission-points"><span className="plus">+</span>{awardedPoints}</div>
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

function ProjectFeed() {
  const { profile } = useCurrentUserProfile();
  const { tasks, assignees, activity } = useProjects();
  const myTaskIds = new Set([
    ...assignees.filter(a => a.userId === profile.id).map(a => a.taskId),
    ...tasks.filter(t => t.consultedId === profile.id || t.trackLeadId === profile.id || t.secondOfficerId === profile.id).map(t => t.id),
  ]);
  const rows = activity
    .filter(a => myTaskIds.has(a.taskId))
    .slice(0, 6)
    .map(a => {
      const task = tasks.find(t => t.id === a.taskId);
      return {
        type: window.__projectStore.deadlineState(task).toLowerCase().replace(' ', '-'),
        icon: task?.taskClass === 'critical' ? 'fa-bolt' : 'fa-list-check',
        body: `<strong>${task?.title || 'Project task'}</strong> ${a.action.replaceAll('_', ' ')}`,
        sub: task ? `${window.__projectStore.deadlineState(task)} · ${task.status}` : '',
        time: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '',
      };
    });
  const fallback = rows.length ? rows : ACTIVITY;
  return (
    <div className="card-panel">
      <div className="section-head" style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 16 }}>Project Feed</h2>
        <span className="section-meta">LAST 48H</span>
      </div>
      {fallback.map((a, i) => (
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
  const sorted = React.useMemo(
    () => window.rankExonautRows ? window.rankExonautRows(rowsFromProfiles) : [...rowsFromProfiles].sort((a,b) => b.points - a.points).map((u, i) => ({ ...u, cohortRank: i + 1 })),
    [rowsFromProfiles]
  );
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
              <AvatarWithRing name={u.name} avatarUrl={u.avatarUrl} size={34} tier={u.tier} />
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
  useCohort();
  const displayName = profile.fullName || ME.name;
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const timeline = window.getCohortTimeline?.(activeCohort);
  const currentDay = timeline?.valid ? timeline.currentDay : '--';
  const totalDays = timeline?.valid ? timeline.totalDays : '--';
  const countdownLabel = timeline?.countdownLabel || 'SCHEDULE PENDING';

  return (
    <div>
      <div className="section-head enter">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>Welcome back, Exonaut</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{displayName}</h1>
          <div className="t-body" style={{ marginTop: 8, color: 'var(--accent)', fontStyle: 'italic' }}>
            "We don't wait for the map. We build it."
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="t-label-muted">DAY</div>
          <div className="t-mono" style={{ fontSize: 40, color: 'var(--off-white)', fontWeight: 700, lineHeight: 1 }}>
            {currentDay}<span style={{ color: 'var(--off-white-40)', fontSize: 22 }}>/{totalDays}</span>
          </div>
          <div className="t-micro" style={{ marginTop: 6 }}>{countdownLabel}</div>
        </div>
      </div>

      <div className="enter enter-d1"><HeroStats /></div>
      <DirectiveInbox onAccepted={(d) => onNavigate('missions')} />
      <div className="enter enter-d2"><PillarGrid /></div>
      <div className="enter enter-d3"><RitualTracker /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }} className="dash-split">
        <div className="enter enter-d4"><MissionFeed onOpenMission={onOpenMission} /></div>
        <div className="enter enter-d4"><ProjectFeed /></div>
      </div>

      <div className="enter enter-d5"><LeaderboardSnapshot onView={() => onNavigate('leaderboard')} /></div>
    </div>
  );
}

Object.assign(window, { Dashboard });
