// Mission Lead (Manager) + Mission Commander (Director) consoles
// Lead = owns one track, grades subs, manages their Exonauts
// Commander = oversees all leads, org health, escalations

function profileAsExonautRow(profile, ledger = []) {
  const seed = String(profile?.id || profile?.email || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const points = ledger
    .filter(e => e.userId === profile.id)
    .reduce((sum, e) => sum + Number(e.points || 0), 0);
  const p1 = Math.round(points * 0.42);
  const p2 = Math.round(points * 0.34);
  const p3 = Math.max(0, points - p1 - p2);
  return {
    id: profile.id,
    name: profile.fullName || profile.email || 'Exonaut',
    track: profile.trackCode || 'AIS',
    cohort: profile.cohortId || 'c2627',
    avatarUrl: profile.avatarUrl || '',
    points,
    tier: window.getTierKeyForPoints ? window.getTierKeyForPoints(points) : (points >= 300 ? 'prime' : points >= 100 ? 'builder' : 'entry'),
    change: (seed % 7) - 2,
    badges: 2 + (seed % 5),
    p1,
    p2,
    p3,
  };
}

function useSupabaseExonautRows() {
  const { profiles } = useUserProfiles();
  const { ledger } = usePoints();
  return React.useMemo(
    () => (profiles || []).filter(p => (p.role === 'lead' ? 'exonaut' : p.role) === 'exonaut').map(p => profileAsExonautRow(p, ledger)),
    [profiles, ledger]
  );
}

function missionForLeadQueue(sub) {
  return (window.__missionStore?.all?.() || []).find(m => m.id === sub.missionId);
}

function submissionMatchesLeadScope(sub, leadTrack, leadCohort, exonautRows) {
  const ex = exonautRows.find(u => u.id === sub.exonautId);
  const mission = missionForLeadQueue(sub);
  const missionTrack = mission?.track || mission?.trackCode || '';
  const sameCohort = !leadCohort || !ex || (ex.cohort || 'c2627') === leadCohort;
  const sameTrack = ex ? ex.track === leadTrack : (!missionTrack || missionTrack === leadTrack);
  return sameCohort && sameTrack;
}

function realTrackLeadFor(trackCode, crowns = [], profiles = []) {
  const crown = (crowns || []).find(c => c.trackCode === trackCode && c.status === 'active')
    || window.__crownStore?.getActiveCrownForTrack?.(trackCode);
  const profile = crown?.userId ? (profiles || []).find(p => p.id === crown.userId) : null;
  return {
    crown,
    profile,
    name: profile?.fullName || profile?.email || 'Unassigned',
    avatarUrl: profile?.avatarUrl || '',
  };
}

function latestSubmissionMsFor(userId, submissions = []) {
  return Math.max(0, ...submissions
    .filter(s => s.exonautId === userId)
    .map(s => new Date(s.gradedAt || s.submittedAtIso || s.submittedAt).getTime())
    .filter(Number.isFinite));
}

function missionForCommanderSub(sub, missions = []) {
  return missions.find(m => m.id === sub.missionId) || missionForLeadQueue(sub);
}

// ========== MISSION LEAD CONSOLE ==========
function LeadHome({ onNavigate }) {
  const { profile } = useCurrentUserProfile();
  const exonautRows = useSupabaseExonautRows();
  const [directiveOpen, setDirectiveOpen] = React.useState(false);
  const leadTrack = profile.trackCode || 'AIS';
  const track = TRACKS.find(t => t.code === leadTrack) || TRACKS[0];
  const myExonauts = exonautRows.filter(u =>
    u.track === leadTrack && (!profile.cohortId || u.cohort === profile.cohortId)
  );
  const sortedByPoints = [...myExonauts].sort((a,b) => b.points - a.points);
  const trackAvg = myExonauts.length ? Math.round(myExonauts.reduce((s,u) => s + u.points, 0) / myExonauts.length) : 0;
  const allSubs = useSubs();
  React.useEffect(() => { window.refreshSubs?.(); }, []);
  const myPending = allSubs.filter(s =>
    s.state === 'pending' && submissionMatchesLeadScope(s, leadTrack, profile.cohortId || 'c2627', exonautRows)
  );
  const myTrackSubs = allSubs.filter(s => submissionMatchesLeadScope(s, leadTrack, profile.cohortId || 'c2627', exonautRows));
  const mySubmitRate = myExonauts.length
    ? Math.round((new Set(myTrackSubs.map(s => s.exonautId)).size / myExonauts.length) * 100)
    : 0;
  const myApproved = myTrackSubs.filter(s => s.state === 'approved').length;

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>
            MISSION LEAD · {track.name.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Track Command</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Welcome, {profile.fullName || 'Mission Lead'}. {myExonauts.length} Exonauts under your command.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => onNavigate('lead-roster')}>
            <i className="fa-solid fa-users" /> ROSTER
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('lead-queue')}>
            <i className="fa-solid fa-clipboard-check" /> REVIEW QUEUE · {myPending.length}
          </button>
        </div>
      </div>

      {/* Track KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <KPI label="GRADING QUEUE" value={myPending.length} accent="amber" sub={myPending.some(s => s.isLate) ? '1 BREACHED 48h SLA' : 'WITHIN SLA'} />
        <KPI label="TRACK AVG PTS" value={trackAvg} accent="lime" sub="POINTS PER EXONAUT" />
        <KPI label="SUBMIT RATE" value={`${mySubmitRate}%`} accent="platinum" sub="TRACK SUBMITTERS" />
        <KPI label="APPROVED" value={myApproved} accent="lime" sub="TRACK TASKS GRADED" />
      </div>

      {/* Hero: review queue preview + track leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="card-panel">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15 }}>Review Queue · {track.short}</h2>
            <span className="section-meta">{myPending.length} PENDING · SLA 48H</span>
          </div>
          {myPending.map(s => {
            const ex = myExonauts.find(u => u.id === s.exonautId) || profileAsExonautRow({ id: s.exonautId, fullName: 'Exonaut' });
            return (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 14, alignItems: 'center',
                padding: '14px 0', borderTop: '1px solid var(--off-white-07)',
              }}>
                <AvatarWithRing name={ex.name} avatarUrl={ex.avatarUrl} size={36} tier={ex.tier} />
                <div>
                  <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{ex.name}</div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 2 }}>
                    {s.missionTitle.toUpperCase()} · {s.wordCount}w · {s.submittedAt}
                  </div>
                </div>
                {s.isLate && <span className="status-pill" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}>SLA BREACH</span>}
                <button className="btn btn-primary btn-sm" onClick={() => onNavigate('lead-grade:' + s.id)}>GRADE</button>
              </div>
            );
          })}
        </div>

        <div className="card-panel">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15 }}>My Exonauts</h2>
            <span className="section-meta">BY POINTS · WK 2</span>
          </div>
          {sortedByPoints.map((u, i) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '24px 30px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--off-white-07)' : 'none' }}>
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>#{i+1}</div>
              <AvatarWithRing name={u.name} avatarUrl={u.avatarUrl} size={26} tier={u.tier} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--off-white)' }}>{u.name}</div>
              <div className="t-mono" style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 700 }}>{u.points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reporting chain */}
      <div className="card-panel" style={{ marginTop: 18 }}>
        <div className="t-label" style={{ marginBottom: 14 }}>REPORTING CHAIN</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px 1fr', gap: 14, alignItems: 'center' }}>
          <ChainNode role="DIRECTOR" name="Mission Commander" sub="Mission Commander" accent="amber" />
          <i className="fa-solid fa-arrow-left" style={{ color: 'var(--off-white-40)', textAlign: 'center' }} />
          <ChainNode role="MANAGER" name={profile.fullName || 'Mission Lead'} sub={track.short + ' · You'} accent="platinum" active />
          <i className="fa-solid fa-arrow-left" style={{ color: 'var(--off-white-40)', textAlign: 'center' }} />
          <ChainNode role={`${myExonauts.length} INTERNS`} name={track.short + ' cohort'} sub="Active Exonauts" accent="lime" />
        </div>
      </div>

      <LeadDirectivesPanel onNew={() => setDirectiveOpen(true)} />
      {directiveOpen && (
        <AssignDirectiveModal
          onClose={() => setDirectiveOpen(false)}
          onIssued={() => setDirectiveOpen(false)}
        />
      )}
    </div>
  );
}

function LeadRoster() {
  const { profile } = useCurrentUserProfile();
  const exonautRows = useSupabaseExonautRows();
  const leadTrack = profile.trackCode || 'AIS';
  const myExonauts = exonautRows.filter(u =>
    u.track === leadTrack && (!profile.cohortId || u.cohort === profile.cohortId)
  ).sort((a,b) => b.points - a.points);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>AI STRATEGY TRACK · {myExonauts.length} EXONAUTS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Roster</h1>
        </div>
      </div>

      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '48px 48px 1fr 100px 100px 100px 120px' }}>
          <div>#</div><div></div><div>EXONAUT</div><div>PTS</div><div>P1/P2/P3</div><div>BADGES</div><div>ACTIONS</div>
        </div>
        {myExonauts.map((u, i) => {
          const isAtRisk = u.points < 200;
          return (
            <div key={u.id} className={'lb-row' + (isAtRisk ? '' : '')} style={{ gridTemplateColumns: '48px 48px 1fr 100px 100px 100px 120px' }}>
              <div className="lb-rank">#{i+1}</div>
              <AvatarWithRing name={u.name} avatarUrl={u.avatarUrl} size={34} tier={u.tier} />
              <div className="lb-name">
                {u.name}<TierCrest tier={u.tier} />
                {isAtRisk && <span style={{ marginLeft: 10, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--red)', letterSpacing: '0.1em' }}>⚠ AT RISK</span>}
              </div>
              <div className="lb-points">{u.points}</div>
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-68)' }}>{u.p1}/{u.p2}/{u.p3}</div>
              <div className="lb-badges">{u.badges}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" title="Award pts"><i className="fa-solid fa-bolt" /></button>
                <button className="btn btn-ghost btn-sm" title="Kudos"><i className="fa-solid fa-hand-sparkles" /></button>
                <button className="btn btn-ghost btn-sm" title="Profile"><i className="fa-solid fa-eye" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadQueue({ onNavigate }) {
  const { profile } = useCurrentUserProfile();
  const exonautRows = useSupabaseExonautRows();
  const leadTrack = profile.trackCode || 'AIS';
  const allSubs = useSubs();
  React.useEffect(() => { window.refreshSubs?.(); }, []);
  const scopedSubs = allSubs.filter(s =>
    submissionMatchesLeadScope(s, leadTrack, profile.cohortId || 'c2627', exonautRows)
  );
  const myPending = scopedSubs.filter(s => s.state === 'pending');
  const myGraded = scopedSubs.filter(s => s.state !== 'pending');
  const [tab, setTab] = React.useState('pending');

  const list = tab === 'pending' ? myPending : myGraded;
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>
            REVIEW QUEUE · SLA 48H
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Grade Submissions</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {myPending.length} awaiting your review · {myGraded.length} graded this week
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--off-white-07)' }}>
        {[
          { id: 'pending', label: 'PENDING', count: myPending.length },
          { id: 'graded', label: 'GRADED', count: myGraded.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="btn btn-ghost" style={{
            borderRadius: 0, borderBottom: tab === t.id ? '2px solid var(--lime)' : '2px solid transparent',
            color: tab === t.id ? 'var(--lime)' : 'var(--off-white-68)', marginBottom: -1,
          }}>
            {t.label} · {t.count}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 10 }} />
          <div className="t-body" style={{ color: 'var(--off-white-40)' }}>Nothing to review right now.</div>
        </div>
      )}

      {list.map(s => {
        const ex = exonautRows.find(u => u.id === s.exonautId) || profileAsExonautRow({ id: s.exonautId, fullName: 'Exonaut' });
        const gradeColor = { 'good': 'var(--lime)', 'excellent': 'var(--gold)', 'needs-revision': 'var(--amber)' }[s.grade];
        return (
          <div key={s.id} className="card-panel" style={{ padding: 16, marginBottom: 10, display: 'grid', gridTemplateColumns: '42px 1fr auto auto auto', gap: 14, alignItems: 'center' }}>
            <AvatarWithRing name={ex.name} avatarUrl={ex.avatarUrl} size={38} tier={ex.tier} />
            <div>
              <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{ex.name}</div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 2 }}>
                {s.missionTitle.toUpperCase()} · {s.wordCount}w · {s.submittedAt}
              </div>
            </div>
            {s.isLate && <span className="status-pill" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}>SLA BREACH</span>}
            {s.grade && <span className="t-mono" style={{ fontSize: 11, color: gradeColor, letterSpacing: '0.1em', fontWeight: 700 }}>{s.grade.toUpperCase().replace('-', ' ')}</span>}
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('lead-grade:' + s.id)}>
              {tab === 'pending' ? 'GRADE' : 'VIEW'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LeadGrade({ onBack, subId }) {
  const allSubs = useSubs();
  const { profiles } = useUserProfiles();
  const sub = (subId && allSubs.find(s => s.id === subId)) || allSubs.find(s => s.state === 'pending') || allSubs[0];
  const profile = sub ? (profiles || []).find(p => p.id === sub.exonautId) : null;
  const ex = sub ? (USERS.find(u => u.id === sub.exonautId) || profileAsExonautRow(profile || { id: sub.exonautId, fullName: 'Exonaut' })) : null;
  const [grade, setGrade] = React.useState(sub?.grade || null);
  const [feedback, setFeedback] = React.useState(sub?.feedback || '');
  const [submitted, setSubmitted] = React.useState(sub ? sub.state !== 'pending' : false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState('');

  if (!sub) {
    return (
      <div className="enter" style={{ textAlign: 'center', padding: 60 }}>
        <i className="fa-solid fa-inbox" style={{ fontSize: 42, color: 'var(--off-white-40)', marginBottom: 18 }} />
        <h2 className="t-title" style={{ fontSize: 28 }}>No submission selected.</h2>
        <div className="t-body" style={{ maxWidth: 440, margin: '12px auto 24px' }}>
          Exonaut submissions will appear here after they submit deliverables.
        </div>
        <button className="btn btn-primary" onClick={onBack}>BACK TO QUEUE</button>
      </div>
    );
  }

  const handleSubmit = () => {
    gradeSubmission({ subId: sub.id, grade, feedback });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="enter" style={{ textAlign: 'center', padding: 60 }}>
        <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: 'var(--lime)', marginBottom: 20 }} />
        <h2 className="t-title" style={{ fontSize: 28 }}>Graded.</h2>
        <div className="t-body" style={{ maxWidth: 440, margin: '12px auto 24px' }}>
          Points awarded automatically. Exonaut has been notified. {ex.name} now sees your feedback.
        </div>
        <button className="btn btn-primary" onClick={onBack}>BACK TO QUEUE</button>
      </div>
    );
  }

  return (
    <div className="enter">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}><i className="fa-solid fa-arrow-left" /> QUEUE</button>
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>{sub.missionId}</div>
          <h1 className="t-title" style={{ fontSize: 32, margin: 0 }}>{sub.missionTitle}</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--off-white-07)' }}>
            <AvatarWithRing name={ex.name} avatarUrl={ex.avatarUrl} size={44} tier={ex.tier} />
            <div>
              <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0 }}>{ex.name}</div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 2 }}>
                SUBMITTED {sub.submittedAt.toUpperCase()} · {sub.wordCount} WORDS · DOCUMENT
              </div>
            </div>
          </div>
          <div className="t-label" style={{ marginBottom: 10 }}>SUBMISSION PREVIEW</div>
          <div style={{ background: 'var(--bg-darkest)', padding: 20, fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.65, color: 'var(--off-white)', maxHeight: 320, overflow: 'auto', borderRadius: 4 }}>
            <strong style={{ color: 'var(--lime)' }}>{sub.missionTitle} · Submission</strong><br/><br/>
            {sub.note && (
              <div style={{ padding: 12, background: 'rgba(139,232,255,0.06)', borderLeft: '2px solid var(--platinum)', marginBottom: 14, fontSize: 13 }}>
                <div className="t-label" style={{ marginBottom: 4 }}>NOTE TO REVIEWER</div>
                <div style={{ fontFamily: 'var(--font-serif)' }}>{sub.note}</div>
              </div>
            )}
            {sub.fileName && (
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-68)', marginBottom: 14 }}>
                <i className="fa-solid fa-paperclip" /> {sub.fileName}
              </div>
            )}
            Kestrel enters a Southeast Asian medical-AI market dominated by three entrenched players (HealthLens, MediCore, and Sanjeevani) — each with regional regulatory headstarts but increasing model-debt.<br/><br/>
            <em>Three direct competitors (positioning, pricing, moat):</em><br/>
            1. <strong>HealthLens</strong> — hospital-network partnerships, premium pricing, moat = accreditation.<br/>
            2. <strong>MediCore</strong> — physician-facing tooling, mid-market pricing, moat = workflow lock-in.<br/>
            3. <strong>Sanjeevani</strong> — direct-to-clinic, aggressive pricing, moat = distribution.<br/><br/>
            <em style={{ color: 'var(--lavender)' }}>[continued — {sub.wordCount} words]</em>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
            onClick={async () => {
              const url = await getSubmissionFileUrl(sub);
              if (!url) {
                alert('This submission has no saved file preview. Ask the Exonaut to re-submit the PDF.');
                return;
              }
              setPreviewUrl(url);
              setPreviewOpen(true);
            }}>
            <i className="fa-solid fa-arrow-up-right-from-square" /> OPEN FULL
          </button>
        </div>

        <div className="card-panel">
          <div className="t-label" style={{ marginBottom: 12 }}>GRADE</div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
            {[
              { v: 'rejected',       label: 'Rejected',       sub: '0 pts - comment required', color: 'var(--red)' },
              { v: 'needs-revision', label: 'Needs Revision', sub: '0 pts · one resubmit allowed', color: 'var(--amber)' },
              { v: 'good',           label: 'Good',           sub: 'task points awarded', color: 'var(--lime)' },
              { v: 'excellent',      label: 'Excellent',      sub: 'task points awarded · badge recheck', color: 'var(--gold)' },
            ].map(g => (
              <div key={g.v} onClick={() => setGrade(g.v)}
                   style={{
                     padding: 14, border: '1px solid ' + (grade === g.v ? g.color : 'var(--off-white-07)'),
                     background: grade === g.v ? 'rgba(201,229,0,0.04)' : 'transparent',
                     cursor: 'pointer', borderRadius: 4,
                   }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: grade === g.v ? g.color : 'var(--off-white)' }}>{g.label}</div>
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>{g.sub}</div>
              </div>
            ))}
          </div>
          <div className="t-label" style={{ marginBottom: 8 }}>FEEDBACK · VISIBLE TO EXONAUT</div>
          <textarea className="textarea" rows={5} value={feedback} onChange={e => setFeedback(e.target.value)}
                    placeholder="Specific, actionable, kind. They'll remember this." />

          <button className="btn btn-primary" disabled={!grade || feedback.length < 10}
                  onClick={handleSubmit}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 14, opacity: (!grade || feedback.length < 10) ? 0.4 : 1 }}>
            <i className="fa-solid fa-gavel" /> SUBMIT GRADE
          </button>
        </div>
      </div>

      {previewOpen && (
        <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(1100px, 96vw)', maxWidth: '1100px', height: '88vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--off-white-07)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t-label" style={{ marginBottom: 4 }}>SUBMISSION FILE</div>
                <div className="t-heading" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.fileName || 'deliverable.pdf'}
                </div>
              </div>
              <a className="btn btn-ghost btn-sm" href={previewUrl} target="_blank" rel="noreferrer">
                <i className="fa-solid fa-up-right-from-square" /> NEW TAB
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, background: 'var(--bg-darkest)' }}>
              {(sub.fileType || '').includes('pdf') || (sub.fileName || '').toLowerCase().endsWith('.pdf') ? (
                <iframe title={sub.fileName || 'Submission PDF'} src={previewUrl} style={{ width: '100%', height: '100%', border: 0 }} />
              ) : (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
                  <div>
                    <i className="fa-solid fa-file-lines" style={{ fontSize: 38, color: 'var(--off-white-40)', marginBottom: 14 }} />
                    <div className="t-heading" style={{ fontSize: 16, marginBottom: 8 }}>Preview unavailable for this file type.</div>
                    <a className="btn btn-primary" href={previewUrl} target="_blank" rel="noreferrer">
                      <i className="fa-solid fa-download" /> OPEN FILE
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== MISSION COMMANDER (DIRECTOR) CONSOLE ==========
function CommanderHome({ onNavigate }) {
  useCohort();   // re-render when Commander switches cohort
  const activeCohort = window.__cohortStore.getSelected();
  const exonautRows = useSupabaseExonautRows();
  const allSubs = useSubs();
  const missions = useMissions();
  const { crowns } = useCrownState();
  const { profiles } = useUserProfiles();
  const escalations = useEscalations();
  const cohortUsers = exonautRows.filter(u => !activeCohort?.id || u.cohort === activeCohort.id);
  const cohortIds = new Set(cohortUsers.map(u => u.id));
  const cohortSubs = allSubs.filter(s => cohortIds.has(s.exonautId));
  const totalExonauts = cohortUsers.length;
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;
  const atRisk = cohortUsers.filter(u => {
    const latestMs = latestSubmissionMsFor(u.id, cohortSubs);
    return u.points <= 0 || !latestMs || Date.now() - latestMs > staleAfterMs;
  }).length;
  const avgPoints = cohortUsers.length
    ? Math.round(cohortUsers.reduce((s,u) => s + u.points, 0) / cohortUsers.length)
    : 0;
  const totalQueue = cohortSubs.filter(s => s.state === 'pending').length;
  const totalReviewed = cohortSubs.filter(s => ['approved', 'needs-revision', 'rejected'].includes(s.state)).length;
  const totalApproved = cohortSubs.filter(s => s.state === 'approved').length;
  const approvalRate = totalReviewed ? Math.round((totalApproved / totalReviewed) * 100) : 0;
  const realLeadCount = TRACKS.filter(t => realTrackLeadFor(t.code, crowns, profiles).crown).length;
  const trackCount = TRACKS.length;
  const trackMetrics = TRACKS.map(track => {
    const roster = cohortUsers.filter(u => u.track === track.code);
    const rosterIds = new Set(roster.map(u => u.id));
    const trackSubs = cohortSubs.filter(s => {
      if (rosterIds.has(s.exonautId)) return true;
      const mission = missionForCommanderSub(s, missions);
      return (mission?.track || mission?.trackCode) === track.code;
    });
    const pending = trackSubs.filter(s => s.state === 'pending').length;
    const approved = trackSubs.filter(s => s.state === 'approved').length;
    const submittedUsers = new Set(trackSubs.map(s => s.exonautId));
    const submitRate = roster.length ? Math.round((submittedUsers.size / roster.length) * 100) : 0;
    const avg = roster.length ? Math.round(roster.reduce((s,u) => s + u.points, 0) / roster.length) : 0;
    return { track, roster, pending, approved, submitRate, avg, lead: realTrackLeadFor(track.code, crowns, profiles) };
  });

  // Empty-cohort state (newly created batch with no members yet)
  if (cohortUsers.length === 0) {
    return (
      <div className="enter">
        <div className="section-head">
          <div>
            <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>
              MISSION COMMANDER · FOUNDER
            </div>
            <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{activeCohort?.name || 'Command Bridge'}</h1>
            <div className="t-body" style={{ marginTop: 6 }}>
              {activeCohort?.code || ''} · {(activeCohort?.status || '').toUpperCase()} · No Exonauts assigned yet.
            </div>
          </div>
        </div>
        <div className="card-panel" style={{ textAlign: 'center', padding: 64 }}>
          <i className="fa-solid fa-user-group" style={{ fontSize: 36, color: 'var(--off-white-40)', marginBottom: 14 }} />
          <h2 className="t-heading" style={{ fontSize: 16, margin: '0 0 8px 0' }}>Empty Cohort</h2>
          <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)', maxWidth: 420, margin: '0 auto 20px' }}>
            This cohort has no assigned Exonauts yet. Assign interns from the roster, or pick a different batch in the sidebar.
          </div>
          <button className="btn btn-primary"><i className="fa-solid fa-user-plus" /> ASSIGN EXONAUTS</button>
        </div>
      </div>
    );
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>
            MISSION COMMANDER · FOUNDER · {(activeCohort?.name || '').toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Command Bridge</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {activeCohort?.code || COHORT.code} · Week {COHORT.week}/{window.getCohortWeekTotal?.(activeCohort) || COHORT.weekTotal} · {totalExonauts} Exonauts across {trackCount} tracks
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => onNavigate('cmdr-health')}><i className="fa-solid fa-heart-pulse" /> HEALTH</button>
          <button className="btn btn-primary" onClick={() => onNavigate('cmdr-esc')}>
            <i className="fa-solid fa-triangle-exclamation" /> ESCALATIONS · {escalations.length}
          </button>
        </div>
      </div>

      {/* Org KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
        <KPI label="ACTIVE EXONAUTS" value={totalExonauts} accent="lime" sub={`${Math.max(0, totalExonauts - atRisk)} ON TRACK`} />
        <KPI label="AT-RISK" value={atRisk} accent="red" sub="NO SUB 7+ DAYS" />
        <KPI label="COHORT AVG" value={avgPoints} accent="platinum" sub="POINTS PER EXONAUT" />
        <KPI label="GRADING LOAD" value={totalQueue} accent="amber" sub={`ACROSS ${realLeadCount || trackCount} LEADS`} />
        <KPI label="APPROVAL RATE" value={`${approvalRate}%`} accent="lime" sub={`${totalApproved} APPROVED SUBMISSIONS`} />
      </div>

      {/* Track Matrix */}
      <div className="section-head">
        <h2 style={{ fontSize: 16 }}>Track Performance Matrix</h2>
        <span className="section-meta">{`ALL ${trackCount} TRACKS - LIVE`}</span>
      </div>
      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '1fr 1fr 70px 80px 80px 90px 100px' }}>
          <div>TRACK</div><div>TRACK LEAD</div><div>EXONAUTS</div><div>AVG PTS</div><div>SUBMIT%</div><div>APPROVED</div><div>QUEUE</div>
        </div>
        {trackMetrics.map(row => {
          const { track, lead } = row;
          const overload = row.pending >= 5;
          const underperf = row.submitRate < 80 && row.roster.length > 0;
          return (
            <div key={track.code} className="lb-row" style={{ gridTemplateColumns: '1fr 1fr 70px 80px 80px 90px 100px', cursor: 'pointer' }}
                 onClick={() => onNavigate('cmdr-leads')}>
              <div>
                <div className="t-heading" style={{ fontSize: 12, letterSpacing: 0, textTransform: 'none' }}>{track.name}</div>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 2 }}>{track.short}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AvatarWithRing name={lead.name} avatarUrl={lead.avatarUrl} size={26} tier="corps" />
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)' }}>{lead.name}</div>
              </div>
              <div className="t-mono" style={{ fontSize: 13 }}>{row.roster.length}</div>
              <div className="lb-points" style={{ fontSize: 14 }}>{row.avg}</div>
              <div className="t-mono" style={{ fontSize: 12, color: underperf ? 'var(--red)' : 'var(--off-white-68)' }}>
                {row.submitRate}%
              </div>
              <div className="t-mono" style={{ fontSize: 12, color: row.approved ? 'var(--lime)' : 'var(--off-white-40)' }}>
                {row.approved}
              </div>
              <div>
                <span className="status-pill" style={{
                  background: overload ? 'rgba(239,68,68,0.15)' : 'rgba(201,229,0,0.08)',
                  color: overload ? 'var(--red)' : 'var(--lime)',
                  borderColor: overload ? 'rgba(239,68,68,0.3)' : 'var(--lime-border)',
                }}>{row.pending} {overload ? 'HOT' : 'OK'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Escalations preview */}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        <div>
          <div className="section-head">
            <h2 style={{ fontSize: 16 }}>Active Escalations</h2>
            <span className="section-meta">{escalations.length} OPEN</span>
          </div>
          {escalations.slice(0, 3).map(esc => {
            const lead = LEADS.find(l => l.id === esc.leadId) || LEADS[0];
            const track = TRACKS.find(t => t.code === lead?.track) || TRACKS[0];
            const sev = { high: 'var(--red)', med: 'var(--amber)', low: 'var(--platinum)' }[esc.severity];
            return (
              <div key={esc.id} className="card-panel" style={{ borderLeft: `2px solid ${sev}`, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="t-mono" style={{ fontSize: 10, color: sev, letterSpacing: '0.15em' }}>
                    {esc.severity.toUpperCase()} · {esc.type.toUpperCase()} · {track.short}
                  </span>
                  <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{esc.time}</span>
                </div>
                <div className="t-body" style={{ fontSize: 14, color: 'var(--off-white)' }}>{esc.body}</div>
              </div>
            );
          })}
        </div>

        <div className="card-panel">
          <div className="t-label" style={{ marginBottom: 14 }}>WEEKLY CADENCE · COHORT</div>
          {RITUALS.map(r => {
            const pct = r.state === 'done' ? 100 : 0;
            return (
              <div key={r.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="t-heading" style={{ fontSize: 11 }}>{r.name}</span>
                  <span className="t-mono" style={{ fontSize: 11, color: pct > 80 ? 'var(--lime)' : pct > 50 ? 'var(--amber)' : 'var(--off-white-40)' }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--off-white-07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: pct > 80 ? 'var(--lime)' : pct > 50 ? 'var(--amber)' : 'var(--red)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LegacyCommanderLeads() {
  useCohort();
  const activeCohort = window.__cohortStore.getSelected();
  const exonautRows = useSupabaseExonautRows();
  const cohortUsers = exonautRows.filter(u => !activeCohort?.id || u.cohort === activeCohort.id);
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>DIRECT REPORTS · 7 MANAGERS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Mission Leads</h1>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {LEADS.map(lead => {
          const track = TRACKS.find(t => t.code === lead.track);
          const trackExos = cohortUsers.filter(u => u.track === lead.track);
          return (
            <div key={lead.id} className="card-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <AvatarWithRing name={lead.name} size={44} tier="corps" />
                <div>
                  <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{lead.name}</div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--platinum)', marginTop: 2, letterSpacing: '0.1em' }}>
                    {track.name.toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '12px 0', borderTop: '1px solid var(--off-white-07)', borderBottom: '1px solid var(--off-white-07)' }}>
                <div><div className="t-label-muted">INTERNS</div><div className="t-mono" style={{ fontSize: 18, color: 'var(--off-white)', fontWeight: 700 }}>{trackExos.length}</div></div>
                <div><div className="t-label-muted">QUEUE</div><div className="t-mono" style={{ fontSize: 18, color: lead.reviewQueue >= 5 ? 'var(--red)' : 'var(--lime)', fontWeight: 700 }}>{lead.reviewQueue}</div></div>
                <div><div className="t-label-muted">APPROVED</div><div className="t-mono" style={{ fontSize: 18, color: 'var(--lime)', fontWeight: 700 }}>0</div></div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}><i className="fa-solid fa-message" /> DM</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}><i className="fa-solid fa-chart-line" /> REVIEW</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== COMMANDER · EXONAUTS VIEW ==========
// Filter all exonauts by: All (platform-wide) · Cohort (selected cohort) · Manager (by Lead)
function CommanderLeads() {
  useCohort();
  const activeCohort = window.__cohortStore.getSelected();
  const exonautRows = useSupabaseExonautRows();
  const allSubs = useSubs();
  const missions = useMissions();
  const { ledger } = usePoints();
  const { crowns } = useCrownState();
  const { profiles } = useUserProfiles();
  const [selectedTrack, setSelectedTrack] = React.useState(null);
  const cohortUsers = exonautRows.filter(u => !activeCohort?.id || u.cohort === activeCohort.id);
  const currentWeek = COHORT.week || 1;
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  const statusClass = status => status === 'At Risk' ? 'status-overdue' : status === 'Needs Attention' ? 'status-submitted' : 'status-approved';
  const trackRows = TRACKS.map(track => {
    const roster = cohortUsers.filter(u => u.track === track.code);
    const rosterIds = new Set(roster.map(u => u.id));
    const weekMissions = missions.filter(m => (!m.track || m.track === track.code) && Number(m.week || 0) === currentWeek);
    const subs = allSubs.filter(s => rosterIds.has(s.exonautId));
    const weekSubs = subs.filter(s => weekMissions.some(m => m.id === s.missionId));
    const pending = subs.filter(s => s.state === 'pending').length;
    const completed = weekSubs.filter(s => s.state === 'approved').length;
    const bad = subs.filter(s => ['rejected', 'needs-revision'].includes(s.state)).length;
    const totalPoints = ledger.filter(e => rosterIds.has(e.userId)).reduce((sum, e) => sum + Number(e.points || 0), 0);
    const crown = crowns.find(c => c.trackCode === track.code && c.status === 'active');
    const possible = Math.max(1, weekMissions.length * Math.max(1, roster.length));
    const atRisk = roster.filter(u => u.points < 100 || subs.some(s => s.exonautId === u.id && ['rejected', 'needs-revision'].includes(s.state))).length;
    const status = atRisk ? 'At Risk' : pending || bad ? 'Needs Attention' : completed ? 'On Track' : 'Needs Attention';
    const lastActivityMs = Math.max(0, ...subs.map(s => new Date(s.gradedAt || s.submittedAtIso || s.submittedAt).getTime()).filter(Boolean));
    return { track, roster, subs, weekSubs, weekMissions, pending, completed, bad, totalPoints, atRisk, crown, status,
      leadName: crown ? nameOf(crown.userId) : 'Unassigned',
      avgPoints: roster.length ? Math.round(totalPoints / roster.length) : 0,
      progress: Math.round((completed / possible) * 100),
      lastActivity: lastActivityMs ? new Date(lastActivityMs).toLocaleDateString() : '-' };
  });
  const selected = selectedTrack ? trackRows.find(r => r.track.code === selectedTrack) : null;

  if (selected) {
    return (
      <div className="enter">
        <div className="section-head">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTrack(null)}><i className="fa-solid fa-arrow-left" /> BACK</button>
            <div className="t-label" style={{ marginTop: 12, marginBottom: 8, color: 'var(--amber)' }}>COMMANDER - TRACK DETAIL</div>
            <h1 className="t-title" style={{ fontSize: 38, margin: 0 }}>{selected.track.name}</h1>
          </div>
          <span className={'status-pill ' + statusClass(selected.status)}>{selected.status}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
          <KPI label="TRACK LEAD" value={selected.leadName} accent="amber" sub={selected.crown ? 'ACTIVE CROWN' : 'NO CROWN'} />
          <KPI label="ROSTER" value={selected.roster.length} accent="lime" sub="EXONAUTS" />
          <KPI label="PENDING REVIEW" value={selected.pending} accent="amber" sub="LEAD LOAD" />
          <KPI label="APPROVED WK" value={selected.completed} accent="lime" sub={`${selected.bad} REV/REJ`} />
          <KPI label="LAST ACTIVITY" value={selected.lastActivity} accent="platinum" sub={selected.crown?.dueAt ? `CROWN DUE ${new Date(selected.crown.dueAt).toLocaleDateString()}` : 'NO CROWN DUE'} />
        </div>
        <div className="lb-table">
          <div className="lb-header" style={{ gridTemplateColumns: '1.3fr 80px 80px 80px 80px 80px 80px 105px 120px' }}>
            <div>EXONAUT</div><div>WK DONE</div><div>TOTAL</div><div>PENDING</div><div>REV/REJ</div><div>POINTS</div><div>BADGES</div><div>LAST SUB</div><div>STATUS</div>
          </div>
          {selected.roster.map(u => {
            const userSubs = selected.subs.filter(s => s.exonautId === u.id);
            const weekDone = selected.weekSubs.filter(s => s.exonautId === u.id && s.state === 'approved').length;
            const done = userSubs.filter(s => s.state === 'approved').length;
            const pending = userSubs.filter(s => s.state === 'pending').length;
            const bad = userSubs.filter(s => ['rejected', 'needs-revision'].includes(s.state)).length;
            const points = ledger.filter(e => e.userId === u.id).reduce((sum, e) => sum + Number(e.points || 0), 0);
            const lastSubMs = Math.max(0, ...userSubs.map(s => new Date(s.submittedAtIso || s.submittedAt).getTime()).filter(Boolean));
            const status = bad ? 'At Risk' : pending ? 'Needs Attention' : done ? 'On Track' : 'Needs Attention';
            return (
              <div key={u.id} className="lb-row" style={{ gridTemplateColumns: '1.3fr 80px 80px 80px 80px 80px 80px 105px 120px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><AvatarWithRing name={u.name} avatarUrl={u.avatarUrl} size={28} tier={u.tier} /><span>{u.name}</span></div>
                <div>{weekDone}/{selected.weekMissions.length}</div><div>{done}</div><div>{pending}</div><div>{bad}</div><div className="lb-points">{points}</div><div>{u.badges || 0}</div><div>{lastSubMs ? new Date(lastSubMs).toLocaleDateString() : '-'}</div>
                <span className={'status-pill ' + statusClass(status)}>{status}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>COMMANDER - EXECUTION OVERSIGHT</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Track Progress</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Week {currentWeek}/{window.getCohortWeekTotal?.(activeCohort) || COHORT.weekTotal} - {cohortUsers.length} Exonauts - {activeCohort?.name || COHORT.code}</div>
        </div>
      </div>
      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '1.25fr 1.1fr 65px 85px 85px 85px 85px 85px 105px 110px' }}>
          <div>TRACK</div><div>LEAD</div><div>ROSTER</div><div>WK PROG</div><div>SUBMIT</div><div>PENDING</div><div>REV/REJ</div><div>AVG PTS</div><div>LAST ACTIVE</div><div>STATUS</div>
        </div>
        {trackRows.map(row => (
          <div key={row.track.code} className="lb-row" style={{ gridTemplateColumns: '1.25fr 1.1fr 65px 85px 85px 85px 85px 85px 105px 110px', cursor: 'pointer' }} onClick={() => setSelectedTrack(row.track.code)}>
            <div><div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>{row.track.name}</div><div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>{row.track.short}</div></div>
            <div>{row.leadName}</div><div>{row.roster.length}</div><div>{row.progress}%</div><div>{row.weekSubs.length}</div><div>{row.pending}</div><div>{row.bad}</div><div className="lb-points">{row.avgPoints}</div><div>{row.lastActivity}</div>
            <span className={'status-pill ' + statusClass(row.status)}>{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommanderProjectProgress() {
  const { projects, tasks, assignees } = useProjects();
  const { profiles } = useUserProfiles();
  const { ledger } = usePoints();
  const [selectedProject, setSelectedProject] = React.useState(null);
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  const visibleProjects = projects.filter(p => p.status !== 'archived');
  const taskRows = project => tasks.filter(t => t.projectId === project.id);
  const participantCount = project => {
    const taskIds = new Set(taskRows(project).map(t => t.id));
    return new Set(assignees.filter(a => taskIds.has(a.taskId)).map(a => a.userId)).size;
  };
  const secondOfficers = project => {
    const ids = [...new Set(taskRows(project).map(t => t.secondOfficerId).filter(Boolean))];
    return ids.length ? ids.map(nameOf).join(', ') : 'Unassigned';
  };
  const pointsForProject = project => {
    const taskIds = new Set(taskRows(project).map(t => t.id));
    return ledger.filter(e => e.sourceType === 'project' && taskIds.has(e.sourceId)).reduce((sum, e) => sum + Number(e.points || 0), 0);
  };
  const selected = selectedProject ? visibleProjects.find(p => p.id === selectedProject) : null;

  if (selected) {
    const projectTasks = taskRows(selected);
    return (
      <div className="enter">
        <div className="section-head">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProject(null)}><i className="fa-solid fa-arrow-left" /> BACK</button>
            <div className="t-label" style={{ marginTop: 12, marginBottom: 8, color: 'var(--amber)' }}>COMMANDER - PROJECT DETAIL</div>
            <h1 className="t-title" style={{ fontSize: 38, margin: 0 }}>{selected.title}</h1>
          </div>
          <span className="status-pill status-submitted">{selected.status.toUpperCase()}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
          <KPI label="FIRST OFFICER" value={nameOf(selected.firstOfficerId)} accent="platinum" sub="PROJECT LEAD" />
          <KPI label="TRACKS" value={(selected.trackCodes || []).length} accent="platinum" sub={(selected.trackCodes || []).map(c => TRACKS.find(t => t.code === c)?.short || c).join(' / ') || '-'} />
          <KPI label="TASKS" value={`${projectTasks.filter(t => t.status === 'approved').length}/${projectTasks.length}`} accent="lime" sub="COMPLETED" />
          <KPI label="PENDING" value={projectTasks.filter(t => t.status === 'submitted').length} accent="amber" sub="AWAITING APPROVAL" />
          <KPI label="PARTICIPANTS" value={participantCount(selected)} accent="lime" sub={`${pointsForProject(selected)} POINTS`} />
        </div>
        <div className="card-panel" style={{ marginBottom: 18 }}>
          <div className="t-label-muted">SECOND OFFICERS / TRACK LEADS</div>
          <div className="t-heading" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, marginTop: 8 }}>{secondOfficers(selected)}</div>
        </div>
        <div className="lb-table">
          <div className="lb-header" style={{ gridTemplateColumns: '1.5fr 100px 1fr 100px 90px 90px' }}>
            <div>TASK</div><div>TRACK</div><div>SECOND OFFICER</div><div>TEAM</div><div>POINTS</div><div>STATUS</div>
          </div>
          {projectTasks.map(task => {
            const team = assignees.filter(a => a.taskId === task.id);
            return (
              <div key={task.id} className="lb-row" style={{ gridTemplateColumns: '1.5fr 100px 1fr 100px 90px 90px' }}>
                <div>{task.title}</div><div>{TRACKS.find(t => t.code === task.trackCode)?.short || task.trackCode}</div><div>{nameOf(task.secondOfficerId)}</div><div>{team.length}</div><div>{task.points}</div>
                <span className={'status-pill ' + (task.status === 'approved' ? 'status-approved' : task.status === 'submitted' ? 'status-submitted' : 'status-not-started')}>{task.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="enter">
      <div className="section-head"><div><div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>COMMANDER - PROJECT OVERSIGHT</div><h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Project Progress</h1></div></div>
      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '1.35fr .9fr 1fr 1fr 85px 85px 85px 95px' }}>
          <div>PROJECT</div><div>TRACKS</div><div>FIRST OFFICER</div><div>SECOND OFFICERS</div><div>TASKS</div><div>PENDING</div><div>TEAM</div><div>STATUS</div>
        </div>
        {visibleProjects.map(project => {
          const projectTasks = taskRows(project);
          const approved = projectTasks.filter(t => t.status === 'approved').length;
          const pending = projectTasks.filter(t => t.status === 'submitted').length;
          return (
            <div key={project.id} className="lb-row" style={{ gridTemplateColumns: '1.35fr .9fr 1fr 1fr 85px 85px 85px 95px', cursor: 'pointer' }} onClick={() => setSelectedProject(project.id)}>
              <div><div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>{project.title}</div><div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>DUE {project.dueDate || '-'}</div></div>
              <div>{project.trackCodes.map(c => TRACKS.find(t => t.code === c)?.short || c).join(' / ')}</div><div>{nameOf(project.firstOfficerId)}</div><div>{secondOfficers(project)}</div><div>{approved}/{projectTasks.length}</div><div>{pending}</div><div className="lb-points">{participantCount(project)}</div>
              <span className={'status-pill ' + (project.status === 'completed' ? 'status-approved' : 'status-submitted')}>{project.status}</span>
            </div>
          );
        })}
        {visibleProjects.length === 0 && <div className="card-panel" style={{ padding: 32, textAlign: 'center' }}>No active projects yet.</div>}
      </div>
    </div>
  );
}

function CommanderExonauts() {
  useCohort();
  const activeCohort = window.__cohortStore.getSelected();
  const exonautRows = useSupabaseExonautRows();
  const [scope, setScope] = React.useState('cohort'); // 'all' | 'cohort' | 'manager'
  const [leadFilter, setLeadFilter] = React.useState(LEADS[0]?.id || '');
  const [trackFilter, setTrackFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('points'); // 'points' | 'name' | 'missions'

  // Build base set by scope
  let base;
  if (scope === 'all') {
    base = exonautRows;
  } else if (scope === 'cohort') {
    base = exonautRows.filter(u => !activeCohort?.id || u.cohort === activeCohort.id);
  } else { // manager
    const lead = LEADS.find(l => l.id === leadFilter);
    base = exonautRows.filter(u => u.track === lead?.track);
  }

  // Apply track + search
  let rows = base.filter(u => {
    if (trackFilter !== 'all' && u.track !== trackFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Sort
  if (sort === 'points') rows = [...rows].sort((a, b) => b.points - a.points);
  else if (sort === 'name') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'missions') rows = [...rows].sort((a, b) => (b.badges || 0) - (a.badges || 0));

  const atRiskCount = rows.filter(u => u.points < 200).length;
  const avgPts = rows.length ? Math.round(rows.reduce((s, u) => s + u.points, 0) / rows.length) : 0;

  // Helper — find the lead managing a given exonaut
  function leadForUser(userId) {
    return LEADS.find(l => l.reports.includes(userId));
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>COMMANDER · EXONAUT DIRECTORY</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Exonauts</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {rows.length} Exonaut{rows.length === 1 ? '' : 's'} · Avg {avgPts} pts · {atRiskCount} at-risk
          </div>
        </div>
      </div>

      {/* Scope picker — the primary view toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { id: 'all',     label: 'All Exonauts', sub: `${exonautRows.length} platform-wide`, icon: 'fa-globe' },
          { id: 'cohort',  label: 'By Cohort',    sub: activeCohort?.name || '—',        icon: 'fa-layer-group' },
          { id: 'manager', label: 'By Manager',   sub: `${LEADS.length} mission leads`,  icon: 'fa-user-shield' },
        ].map(opt => {
          const active = scope === opt.id;
          return (
            <button key={opt.id} onClick={() => setScope(opt.id)} style={{
              padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
              background: active ? 'rgba(250,194,77,0.08)' : 'var(--off-white-07)',
              border: '1px solid ' + (active ? 'var(--amber)' : 'var(--off-white-15)'),
              borderRadius: 2, display: 'flex', alignItems: 'center', gap: 12,
              transition: 'all 0.12s',
            }}>
              <i className={'fa-solid ' + opt.icon} style={{ fontSize: 18, color: active ? 'var(--amber)' : 'var(--off-white-40)' }} />
              <div>
                <div className="t-heading" style={{ fontSize: 13, color: active ? 'var(--amber)' : 'var(--off-white)', textTransform: 'none', letterSpacing: 0, margin: 0 }}>
                  {opt.label}
                </div>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em', marginTop: 2 }}>
                  {opt.sub.toUpperCase()}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-filter rail — changes based on scope */}
      <div className="card-panel" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Manager picker (only when scope=manager) */}
        {scope === 'manager' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginRight: 4 }}>LEAD</span>
            <select value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)}
              style={{
                padding: '7px 10px', background: 'var(--deep-black)', color: 'var(--off-white)',
                border: '1px solid var(--off-white-15)', borderRadius: 2,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
                cursor: 'pointer', outline: 'none',
              }}>
              {LEADS.map(l => {
                const tr = TRACKS.find(t => t.code === l.track);
                return <option key={l.id} value={l.id}>{l.name} — {tr?.short}</option>;
              })}
            </select>
          </div>
        )}

        {/* Track filter (always visible) */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginRight: 4 }}>TRACK</span>
          <button onClick={() => setTrackFilter('all')}
            className={'lb-filter' + (trackFilter === 'all' ? ' active' : '')}
            style={{ cursor: 'pointer' }}>ALL</button>
          {TRACKS.map(t => (
            <button key={t.code} onClick={() => setTrackFilter(t.code)}
              className={'lb-filter' + (trackFilter === t.code ? ' active' : '')}
              style={{ cursor: 'pointer' }}>{t.short}</button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Exonaut…"
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none',
            }} />
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginRight: 4 }}>SORT</span>
          {[{ id: 'points', label: 'PTS' }, { id: 'name', label: 'NAME' }, { id: 'missions', label: 'BADGES' }].map(s => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={'lb-filter' + (sort === s.id ? ' active' : '')}
              style={{ cursor: 'pointer' }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="IN VIEW" value={rows.length} accent="platinum" sub={scope === 'all' ? 'ALL COHORTS' : scope === 'cohort' ? (activeCohort?.code || '—').toUpperCase() : (LEADS.find(l => l.id === leadFilter)?.name || '').toUpperCase()} />
        <KPI label="AT-RISK" value={atRiskCount} accent={atRiskCount ? 'red' : 'lime'} sub="NO SUB 7+D" />
        <KPI label="AVG POINTS" value={avgPts} accent="amber" sub="IN FILTER" />
        <KPI label="TOP SCORE" value={rows[0]?.points || 0} accent="lime" sub={(rows[0]?.name || '—').toUpperCase()} />
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: 64 }}>
          <i className="fa-solid fa-user-slash" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
          <div className="t-heading" style={{ fontSize: 14, margin: '0 0 6px 0' }}>No Exonauts match</div>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
            Try a different scope or clear filters.
          </div>
        </div>
      ) : (
        <div className="lb-table">
          <div className="lb-header" style={{ gridTemplateColumns: '40px 48px 1fr 110px 140px 90px 80px 80px 80px' }}>
            <div>#</div><div></div><div>EXONAUT</div><div>TRACK</div><div>MANAGER</div><div>POINTS</div><div>BADGES</div><div>TIER</div><div>COHORT</div>
          </div>
          {rows.slice(0, 80).map((u, i) => {
            const track = TRACKS.find(t => t.code === u.track) || { short: 'N/A' };
            const lead = leadForUser(u.id);
            const uCohort = getUserCohort(u.id);
            const cohortObj = window.__cohortStore.getAll().find(c => c.id === uCohort);
            const risk = u.points < 200;
            return (
              <div key={u.id} className="lb-row" style={{ gridTemplateColumns: '40px 48px 1fr 110px 140px 90px 80px 80px 80px' }}>
                <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>{String(i + 1).padStart(2, '0')}</div>
                <AvatarWithRing name={u.name} avatarUrl={u.avatarUrl} size={34} tier={u.tier} />
                <div className="lb-name">
                  {u.name}
                  {risk && <span style={{ marginLeft: 6, fontSize: 8, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>● AT-RISK</span>}
                </div>
                <div className="lb-track">{track?.short || u.track}</div>
                <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)' }}>
                  {lead?.name || <span style={{ color: 'var(--off-white-40)' }}>—</span>}
                </div>
                <div className="lb-points">{u.points}</div>
                <div className="lb-badges">{u.badges || 0}</div>
                <div><TierCrest tier={u.tier} /></div>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.06em' }}>
                  {(cohortObj?.name || '').replace('Batch ', '') || '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommanderEscalations() {
  const escalations = useEscalations();
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--red)' }}>REQUIRE COMMANDER ATTENTION</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Escalations</h1>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        {escalations.length === 0 && (
          <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 34, color: 'var(--lime)', marginBottom: 12 }} />
            <div className="t-heading" style={{ fontSize: 14, marginBottom: 6 }}>No open escalations</div>
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>Commander escalation rows are loaded from Supabase.</div>
          </div>
        )}
        {escalations.map(esc => {
          const lead = LEADS.find(l => l.id === esc.leadId) || LEADS[0];
          const track = TRACKS.find(t => t.code === lead?.track) || TRACKS[0];
          const sev = { high: 'var(--red)', med: 'var(--amber)', low: 'var(--platinum)' }[esc.severity];
          return (
            <div key={esc.id} className="card-panel" style={{ borderLeft: `3px solid ${sev}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="t-mono" style={{ fontSize: 10, color: sev, letterSpacing: '0.15em', fontWeight: 700 }}>
                  {esc.severity.toUpperCase()} SEVERITY · {esc.type.toUpperCase()} · {track.short}
                </span>
                <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>FLAGGED {esc.time.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5, color: 'var(--off-white)', marginBottom: 16 }}>
                {esc.body}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--off-white-07)' }}>
                <AvatarWithRing name={lead.name} size={28} tier="corps" />
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', flex: 1 }}>
                  Reporting: <span style={{ color: 'var(--off-white)' }}>{lead.name}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => window.__escalationStore.updateStatus(esc.id, 'dismissed')}>DISMISS</button>
                <button className="btn btn-ghost btn-sm"><i className="fa-solid fa-message" /> DM LEAD</button>
                <button className="btn btn-primary btn-sm" onClick={() => window.__escalationStore.updateStatus(esc.id, 'resolved')}>RESOLVE</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommanderHealth() {
  useCohort();
  const activeCohort = window.__cohortStore.getSelected();
  const exonautRows = useSupabaseExonautRows();
  const allSubs = useSubs();
  const { ledger } = usePoints();
  const cohortUsers = exonautRows.filter(u => !activeCohort?.id || u.cohort === activeCohort.id);
  const cohortIds = new Set(cohortUsers.map(u => u.id));
  const cohortLedger = ledger.filter(e => cohortIds.has(e.userId));
  const cohortSubs = allSubs.filter(s => cohortIds.has(s.exonautId));
  const totalPoints = cohortLedger.reduce((sum, e) => sum + Number(e.points || 0), 0);
  const pillarPoints = [
    { name: 'MISSIONS', value: cohortLedger.filter(e => ['missions', 'project', 'mission'].includes(e.pillar) || e.sourceType === 'mission').reduce((sum, e) => sum + Number(e.points || 0), 0), color: 'var(--lime)' },
    { name: 'CLIENT', value: cohortLedger.filter(e => e.pillar === 'client').reduce((sum, e) => sum + Number(e.points || 0), 0), color: 'var(--platinum)' },
    { name: 'RECRUIT', value: cohortLedger.filter(e => ['recruitment', 'recruit'].includes(e.pillar)).reduce((sum, e) => sum + Number(e.points || 0), 0), color: 'var(--lavender)' },
    { name: 'CULTURE', value: cohortLedger.filter(e => ['culture', 'ritual'].includes(e.pillar) || ['kudos', 'ritual'].includes(e.sourceType)).reduce((sum, e) => sum + Number(e.points || 0), 0), color: 'var(--amber)' },
  ].map(p => ({ ...p, pct: totalPoints ? Math.round((p.value / totalPoints) * 100) : 0 }));
  const atRiskUsers = cohortUsers.filter(u => {
    const latestMs = latestSubmissionMsFor(u.id, cohortSubs);
    return u.points <= 0 || !latestMs || Date.now() - latestMs > 7 * 24 * 60 * 60 * 1000;
  });
  const total = cohortUsers.length || 1;
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>ORG HEALTH DASHBOARD</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Cohort Health</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card-flat">
          <div className="t-label-muted" style={{ marginBottom: 8 }}>TIER DISTRIBUTION</div>
          {Object.keys(TIERS).filter(k => k !== 'corps').map(tk => {
            const count = cohortUsers.filter(u => u.tier === tk).length;
            const pct = (count / total) * 100;
            return (
              <div key={tk} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="t-heading" style={{ fontSize: 10 }}>{TIERS[tk].short}</span>
                  <span className="t-mono" style={{ fontSize: 10, color: TIERS[tk].color }}>{count}</span>
                </div>
                <div style={{ height: 4, background: 'var(--off-white-07)' }}>
                  <div style={{ height: '100%', width: pct + '%', background: TIERS[tk].color }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-flat">
          <div className="t-label-muted" style={{ marginBottom: 8 }}>PILLAR BALANCE · COHORT</div>
          {pillarPoints.map(p => (
            <div key={p.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="t-heading" style={{ fontSize: 10 }}>{p.name}</span>
                <span className="t-mono" style={{ fontSize: 10, color: p.color }}>{p.pct}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--off-white-07)' }}>
                <div style={{ height: '100%', width: p.pct + '%', background: p.color }} />
              </div>
            </div>
          ))}
          <div className="t-body" style={{ fontSize: 12, marginTop: 14, color: 'var(--amber)' }}>{totalPoints ? 'Balance is based on approved point ledger entries.' : 'No approved point ledger entries yet.'}</div>
        </div>

        <div className="card-flat">
          <div className="t-label-muted" style={{ marginBottom: 8 }}>AT-RISK WATCHLIST</div>
          {atRiskUsers.map(u => {
            const track = TRACKS.find(t => t.code === u.track) || { short: 'N/A' };
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--off-white-07)' }}>
                <AvatarWithRing name={u.name} avatarUrl={u.avatarUrl} size={28} tier={u.tier} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-heading" style={{ fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>{u.name}</div>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>{track.short} · {u.points} pts</div>
                </div>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--red)', fontSize: 12 }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-panel">
        <div className="t-label" style={{ marginBottom: 14 }}>{`PROGRAM TRAJECTORY - ${window.getCohortWeekTotal?.(activeCohort) || COHORT.weekTotal} WEEKS`}</div>
        <TrajectoryChart ledger={cohortLedger} />
      </div>
    </div>
  );
}

// ========== SHARED PRIMITIVES ==========
function KPI({ label, value, sub, accent }) {
  const colorMap = { lime: 'var(--lime)', amber: 'var(--amber)', red: 'var(--red)', platinum: 'var(--platinum)' };
  return (
    <div className="card-flat" style={{ padding: 18 }}>
      <div className="t-label-muted">{label}</div>
      <div className="t-mono" style={{ fontSize: 32, color: colorMap[accent] || 'var(--off-white)', fontWeight: 700, marginTop: 8, lineHeight: 1 }}>{value}</div>
      <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 6, letterSpacing: '0.08em' }}>{sub}</div>
    </div>
  );
}

function ChainNode({ role, name, sub, accent, active }) {
  const colorMap = { lime: 'var(--lime)', amber: 'var(--amber)', platinum: 'var(--platinum)' };
  return (
    <div style={{
      padding: 14, border: '1px solid ' + (active ? colorMap[accent] : 'var(--off-white-07)'),
      background: active ? 'rgba(139, 232, 255, 0.04)' : 'transparent',
      borderRadius: 4, textAlign: 'center',
    }}>
      <div className="t-mono" style={{ fontSize: 9, color: colorMap[accent] || 'var(--off-white-40)', letterSpacing: '0.15em', marginBottom: 4 }}>{role}</div>
      <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>{name}</div>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function TrajectoryChart({ ledger = [] }) {
  // Cohort point trajectory from approved point ledger entries.
  const activeCohort = window.getActiveCohort?.() || COHORT;
  const totalWeeks = window.getCohortWeekTotal?.(activeCohort) || COHORT.weekTotal;
  const data = Array.from({ length: totalWeeks }, () => 0);
  ledger.forEach(entry => {
    const awarded = new Date(entry.awardedAt || Date.now());
    let weekIndex = -1;
    for (let i = 0; i < totalWeeks; i++) {
      const win = window.EOW?.weekWindow?.(activeCohort, i + 1);
      if (win && awarded >= win.startFri && awarded <= win.endThu) {
        weekIndex = i;
        break;
      }
    }
    if (weekIndex < 0) {
      const fallbackWeek = Math.min(totalWeeks, Math.max(1, COHORT.week || 1));
      weekIndex = fallbackWeek - 1;
    }
    data[weekIndex] += Number(entry.points || 0);
  });
  for (let i = 1; i < data.length; i++) data[i] += data[i - 1];
  const currentWeek = COHORT.week;
  const max = Math.max(1, ...data);
  return (
    <div style={{ position: 'relative', height: 140 }}>
      <svg viewBox="0 0 600 140" style={{ width: '100%', height: '100%' }}>
        {data.map((v, i) => {
          const x = data.length === 1 ? 300 : (i / (data.length - 1)) * 580 + 10;
          const y = 130 - (v / max) * 110;
          const isCurrent = i === currentWeek - 1;
          const isPast = i < currentWeek;
          return (
            <g key={i}>
              {i > 0 && (
                <line
                  x1={data.length === 1 ? 300 : ((i-1) / (data.length - 1)) * 580 + 10}
                  y1={130 - (data[i-1] / max) * 110}
                  x2={x} y2={y}
                  stroke={isPast ? '#C9E500' : 'rgba(245,240,248,0.15)'}
                  strokeWidth="1.5" strokeDasharray={isPast ? '0' : '3 3'}
                />
              )}
              <circle cx={x} cy={y} r={isCurrent ? 5 : 3}
                      fill={isCurrent ? '#C9E500' : isPast ? '#C9E500' : 'rgba(245,240,248,0.3)'} />
              <text x={x} y={130 - (v / max) * 110 - 12}
                    textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono"
                    fill={isPast ? '#C9E500' : 'rgba(245,240,248,0.4)'}>
                {v}
              </text>
              <text x={x} y="138" textAnchor="middle" fontSize="8"
                    fontFamily="Montserrat" fontWeight="700" letterSpacing="0.1em"
                    fill="rgba(245,240,248,0.4)">W{String(i+1).padStart(2,'0')}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ========== ROLE SWITCHER ==========
function RoleSwitcher({ current, onChange }) {
  return null;
  /*
  const roles = [
    { id: 'exonaut',   label: 'Exonaut',  sub: 'Intern',    icon: 'fa-user-astronaut', accent: 'var(--lime)' },
    { id: 'lead',      label: 'Lead',     sub: 'Manager',   icon: 'fa-user-shield',    accent: 'var(--platinum)' },
    { id: 'commander', label: 'Commander',sub: 'Director',  icon: 'fa-star',           accent: 'var(--amber)' },
    { id: 'admin',     label: 'Admin',    sub: 'Platform',  icon: 'fa-shield-halved',  accent: 'var(--sky)' },
  ];
  return (
    <div style={{
      position: 'fixed', top: 12, left: 232, zIndex: 120,
      display: 'flex', gap: 4, padding: 4,
      background: 'var(--bg-darkest)',
      border: '1px solid var(--off-white-07)',
      borderRadius: 4,
    }}>
      {roles.map(r => (
        <button key={r.id} onClick={() => onChange(r.id)}
                style={{
                  padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
                  background: current === r.id ? 'rgba(201,229,0,0.08)' : 'transparent',
                  border: '1px solid ' + (current === r.id ? r.accent : 'transparent'),
                  color: current === r.id ? r.accent : 'var(--off-white-68)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', borderRadius: 2,
                }}>
          <i className={'fa-solid ' + r.icon} style={{ fontSize: 10 }} />
          {r.label}
          <span style={{ color: 'var(--off-white-40)', fontSize: 8 }}>· {r.sub}</span>
        </button>
      ))}
    </div>
  );
  */
}

Object.assign(window, {
  LeadHome, LeadRoster, LeadGrade, LeadQueue,
  CommanderHome, CommanderLeads, CommanderProjectProgress, CommanderExonauts, CommanderEscalations, CommanderHealth,
  RoleSwitcher, KPI,
});
