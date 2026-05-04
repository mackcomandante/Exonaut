// Mission Lead (Manager) + Mission Commander (Director) consoles
// Lead = owns one track, grades subs, manages their Exonauts
// Commander = oversees all leads, org health, escalations

// ========== MISSION LEAD CONSOLE ==========
function getMyLead() {
  const myId = localStorage.getItem('exo:userId') || 'lead-ais';
  return LEADS.find(l => l.id === myId) || LEADS[0];
}

// Ritual id → points-store source key + pts (mirrors POINTS_RUBRIC)
const RITUAL_SOURCE = {
  'mon-ign': { source: 'ritual.mon_ign', pts: 5 },
  'mid-pls': { source: 'ritual.mid_pls', pts: 3 },
  'fri-win': { source: 'ritual.fri_win', pts: 5 },
};

// React hook — merges Supabase-registered exonauts with seed USERS.
// Optionally scoped to a specific cohortId. Always call at component top-level.
function useMergedUsers(cohortId) {
  const registeredUsers = window.useRegisteredUsers ? window.useRegisteredUsers() : [];
  const seedUsers = typeof USERS !== 'undefined' ? USERS : [];
  const seedIds = new Set(seedUsers.map(u => u.id));
  const regNormalized = registeredUsers
    .filter(u => u.role === 'exonaut' && !seedIds.has(u.userId))
    .filter(u => {
      if (!cohortId) return true;
      const assignedCohort = window.getUserCohort ? window.getUserCohort(u.userId) : (u.cohortId || 'c2627');
      return assignedCohort === cohortId;
    })
    .map(u => ({
      id: u.userId,
      name: u.name,
      track: window.getUserTrack ? window.getUserTrack(u.userId) : (u.track || ''),
      points: window.__pointsStore ? window.__pointsStore.getTotal(u.userId) : 0,
      badges: 0,
      tier: u.tier || 'entry',
      cohort: window.getUserCohort ? window.getUserCohort(u.userId) : (u.cohortId || 'c2627'),
    }));
  const filtered = cohortId
    ? seedUsers.filter(u => (window.getUserCohort ? window.getUserCohort(u.id) : (u.cohort || 'c2627')) === cohortId)
    : seedUsers;
  return [...filtered, ...regNormalized];
}

function LeadHome({ onNavigate }) {
  const lead = getMyLead();
  const track = TRACKS.find(t => t.code === lead.track);
  const allUsers = useMergedUsers(null);
  const myExonauts = allUsers.filter(u =>
    lead.reports.includes(u.id) || window.getUserLead?.(u.id)?.id === lead.id
  );
  const sortedByPoints = [...myExonauts].sort((a,b) => b.points - a.points);
  const [ritualTick, setRitualTick] = React.useState(0);
  const trackAvg = Math.round(myExonauts.reduce((s,u) => s + u.points, 0) / myExonauts.length);
  const allSubs = useSubs();
  const myPending = allSubs.filter(s => s.state === 'pending' && lead.reports.includes(s.exonautId));

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>
            MISSION LEAD · {track.name.toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Track Command</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Welcome, {lead.name.replace(/^Dr\. /, '')}. {myExonauts.length} Exonauts under your command.</div>
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
        <KPI label="TRACK AVG PTS" value={trackAvg} accent="lime" sub="▲ +38 vs last wk" />
        <KPI label="SUBMIT RATE" value={lead.avgSubmitRate + '%'} accent="platinum" sub="ON-TIME · WEEK 2" />
        <KPI label="CLIENT SAT" value={lead.satisfaction.toFixed(1)} accent="lime" sub="AVG ACROSS TRACK · 5 MAX" />
      </div>

      {/* Hero: review queue preview + track leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="card-panel">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15 }}>Review Queue · {track.short}</h2>
            <span className="section-meta">{myPending.length} PENDING · SLA 48H</span>
          </div>
          {myPending.map(s => {
            const ex = allUsers.find(u => u.id === s.exonautId) || { name: 'Unknown', tier: 'entry' };
            return (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 14, alignItems: 'center',
                padding: '14px 0', borderTop: '1px solid var(--off-white-07)',
              }}>
                <AvatarWithRing name={ex.name} size={36} tier={ex.tier} />
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
              <AvatarWithRing name={u.name} size={26} tier={u.tier} />
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
          <ChainNode role="DIRECTOR" name="Mack Comandante" sub="Mission Commander" accent="amber" />
          <i className="fa-solid fa-arrow-left" style={{ color: 'var(--off-white-40)', textAlign: 'center' }} />
          <ChainNode role="MANAGER" name={lead.name} sub={track.short + ' · You'} accent="platinum" active />
          <i className="fa-solid fa-arrow-left" style={{ color: 'var(--off-white-40)', textAlign: 'center' }} />
          <ChainNode role={`${myExonauts.length} INTERNS`} name={track.short + ' cohort'} sub="Active Exonauts" accent="lime" />
        </div>
      </div>

      {/* ── Ritual Confirmation Panel ── */}
      {(() => {
        if (!window.__ritualStore) return null;
        const myExonautIds = new Set(myExonauts.map(u => u.id));
        const pending = (window.__ritualStore.getAllSubmitted() || [])
          .filter(r => myExonautIds.has(r.userId));

        function confirmRitual(entry) {
          window.__ritualStore.confirm(entry.userId, entry.ritualId, entry.weekNum);
          // Award points to the Exonaut
          const cfg = RITUAL_SOURCE[entry.ritualId];
          if (cfg && window.__pointsStore) {
            const ritual = RITUALS.find(r => r.id === entry.ritualId);
            window.__pointsStore.add(entry.userId, {
              source: cfg.source,
              note: `${ritual?.name || entry.ritualId} · Week ${entry.weekNum} — confirmed by Lead`,
            });
          }
          setRitualTick(t => t + 1);
        }

        return (
          <div className="card-panel" style={{ marginTop: 18 }}>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 15 }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: 8, color: 'var(--lime)' }}/>
                Ritual Confirmations
              </h2>
              <span className="section-meta">{pending.length} AWAITING CONFIRM</span>
            </div>

            {pending.length === 0 ? (
              <div className="t-body" style={{ color: 'var(--off-white-40)', padding: '10px 0' }}>
                No pending ritual submissions from your Exonauts.
              </div>
            ) : pending.map((entry, i) => {
              const exonaut = myExonauts.find(u => u.id === entry.userId);
              const ritual  = RITUALS.find(r => r.id === entry.ritualId);
              const cfg     = RITUAL_SOURCE[entry.ritualId];
              const timeAgo = entry.ts ? new Date(entry.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14,
                  alignItems: 'center', padding: '12px 0',
                  borderTop: '1px solid var(--off-white-07)',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--off-white)' }}>
                      {exonaut?.name || entry.userId}
                    </div>
                    <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 3 }}>
                      {ritual?.name?.toUpperCase() || entry.ritualId}  ·  WK {entry.weekNum}  ·  {timeAgo}
                    </div>
                  </div>
                  <span className="t-mono" style={{ fontSize: 11, color: 'var(--lime)', fontWeight: 700 }}>
                    +{cfg?.pts || '?'} PTS
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={() => confirmRitual(entry)}>
                    <i className="fa-solid fa-check" style={{ marginRight: 5 }}/>CONFIRM
                  </button>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function LeadRoster() {
  const lead = getMyLead();
  const leadTrackObj = TRACKS.find(t => t.code === lead.track) || TRACKS[0];
  const myExonauts = USERS.filter(u => lead.reports.includes(u.id)).sort((a,b) => b.points - a.points);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>{leadTrackObj.name.toUpperCase()} · {myExonauts.length} EXONAUTS</div>
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
              <AvatarWithRing name={u.name} size={34} tier={u.tier} />
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
  const lead = getMyLead();
  const allSubs = useSubs();
  const myPending = allSubs.filter(s => s.state === 'pending' && lead.reports.includes(s.exonautId));
  const myGraded = allSubs.filter(s => s.state !== 'pending' && lead.reports.includes(s.exonautId));
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
        const ex = USERS.find(u => u.id === s.exonautId);
        const gradeColor = { 'good': 'var(--lime)', 'excellent': 'var(--gold)', 'needs-revision': 'var(--amber)' }[s.grade];
        return (
          <div key={s.id} className="card-panel" style={{ padding: 16, marginBottom: 10, display: 'grid', gridTemplateColumns: '42px 1fr auto auto auto', gap: 14, alignItems: 'center' }}>
            <AvatarWithRing name={ex.name} size={38} tier={ex.tier} />
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
  const sub = (subId && allSubs.find(s => s.id === subId)) || allSubs.find(s => s.state === 'pending') || allSubs[0];
  const ex = USERS.find(u => u.id === sub.exonautId);
  const [grade, setGrade] = React.useState(sub.grade || null);
  const [feedback, setFeedback] = React.useState(sub.feedback || '');
  const [submitted, setSubmitted] = React.useState(sub.state !== 'pending');

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
            <AvatarWithRing name={ex.name} size={44} tier={ex.tier} />
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
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
            <i className="fa-solid fa-arrow-up-right-from-square" /> OPEN FULL
          </button>
        </div>

        <div className="card-panel">
          <div className="t-label" style={{ marginBottom: 12 }}>GRADE</div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
            {[
              { v: 'needs-revision', label: 'Needs Revision', sub: '+5 pts · one resubmit allowed', color: 'var(--amber)' },
              { v: 'good',           label: 'Good',           sub: 'base + 10 pts', color: 'var(--lime)' },
              { v: 'excellent',      label: 'Excellent',      sub: 'base + 20 pts · badge recheck', color: 'var(--gold)' },
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
    </div>
  );
}

// ========== MISSION COMMANDER (DIRECTOR) CONSOLE ==========
function CommanderHome({ onNavigate }) {
  useCohort();   // re-render when Commander switches cohort
  const activeCohort = window.__cohortStore.getSelected();
  const cohortUsers = useMergedUsers(activeCohort?.id);
  const totalExonauts = cohortUsers.length;
  const atRisk = cohortUsers.filter(u => u.points < 200).length;
  const avgPoints = cohortUsers.length
    ? Math.round(cohortUsers.reduce((s,u) => s + u.points, 0) / cohortUsers.length)
    : 0;
  const totalQueue = LEADS.reduce((s,l) => s + l.reviewQueue, 0);
  const avgLeadSat = (LEADS.reduce((s,l) => s + l.satisfaction, 0) / LEADS.length).toFixed(1);

  // Empty-cohort state (newly created batch with no members yet)
  if (cohortUsers.length === 0) {
    return (
      <div className="enter">
        <div className="section-head">
          <div>
            <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>
              MISSION COMMANDER
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
            MISSION COMMANDER · {(activeCohort?.name || '').toUpperCase()}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Command Bridge</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {activeCohort?.code || COHORT.code} · Week {COHORT.week}/{COHORT.weekTotal} · {totalExonauts} Exonauts across {LEADS.length} tracks
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => onNavigate('cmdr-health')}><i className="fa-solid fa-heart-pulse" /> HEALTH</button>
          <button className="btn btn-primary" onClick={() => onNavigate('cmdr-esc')}>
            <i className="fa-solid fa-triangle-exclamation" /> ESCALATIONS · {ESCALATIONS.length}
          </button>
        </div>
      </div>

      {/* Org KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
        <KPI label="ACTIVE EXONAUTS" value={totalExonauts} accent="lime" sub={`${Math.max(0, totalExonauts - atRisk)} ON TRACK`} />
        <KPI label="AT-RISK" value={atRisk} accent="red" sub="NO SUB 7+ DAYS" />
        <KPI label="COHORT AVG" value={avgPoints} accent="platinum" sub="▲ +32 VS WK 1" />
        <KPI label="GRADING LOAD" value={totalQueue} accent="amber" sub="ACROSS 7 LEADS" />
        <KPI label="LEAD SAT AVG" value={avgLeadSat} accent="lime" sub="OUT OF 5.0" />
      </div>

      {/* Track Matrix */}
      <div className="section-head">
        <h2 style={{ fontSize: 16 }}>Track Performance Matrix</h2>
        <span className="section-meta">ALL 7 TRACKS · LIVE</span>
      </div>
      <div className="lb-table">
        <div className="lb-header" style={{ gridTemplateColumns: '1fr 1fr 70px 80px 80px 90px 100px' }}>
          <div>TRACK</div><div>MISSION LEAD</div><div>INTERNS</div><div>AVG PTS</div><div>SUBMIT%</div><div>CLIENT SAT</div><div>QUEUE</div>
        </div>
        {LEADS.map(lead => {
          const track = TRACKS.find(t => t.code === lead.track);
          const trackExos = cohortUsers.filter(u => lead.reports.includes(u.id));
          const avg = trackExos.length ? Math.round(trackExos.reduce((s,u) => s + u.points, 0) / trackExos.length) : 0;
          const overload = lead.reviewQueue >= 5;
          const underperf = lead.avgSubmitRate < 80;
          return (
            <div key={lead.id} className="lb-row" style={{ gridTemplateColumns: '1fr 1fr 70px 80px 80px 90px 100px', cursor: 'pointer' }}
                 onClick={() => onNavigate('cmdr-leads')}>
              <div>
                <div className="t-heading" style={{ fontSize: 12, letterSpacing: 0, textTransform: 'none' }}>{track.name}</div>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 2 }}>{track.short}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AvatarWithRing name={lead.name} size={26} tier="corps" />
                <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)' }}>{lead.name}</div>
              </div>
              <div className="t-mono" style={{ fontSize: 13 }}>{trackExos.length}</div>
              <div className="lb-points" style={{ fontSize: 14 }}>{avg}</div>
              <div className="t-mono" style={{ fontSize: 12, color: underperf ? 'var(--red)' : 'var(--off-white-68)' }}>
                {lead.avgSubmitRate}%
              </div>
              <div className="t-mono" style={{ fontSize: 12, color: lead.satisfaction >= 4.5 ? 'var(--lime)' : 'var(--off-white-68)' }}>
                ★ {lead.satisfaction.toFixed(1)}
              </div>
              <div>
                <span className="status-pill" style={{
                  background: overload ? 'rgba(239,68,68,0.15)' : 'rgba(201,229,0,0.08)',
                  color: overload ? 'var(--red)' : 'var(--lime)',
                  borderColor: overload ? 'rgba(239,68,68,0.3)' : 'var(--lime-border)',
                }}>{lead.reviewQueue} {overload ? 'HOT' : 'OK'}</span>
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
            <span className="section-meta">{ESCALATIONS.length} OPEN</span>
          </div>
          {ESCALATIONS.slice(0, 3).map(esc => {
            const lead = LEADS.find(l => l.id === esc.leadId);
            const track = TRACKS.find(t => t.code === lead.track);
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
            const pct = r.state === 'done' ? 93 : r.state === 'missed' ? 0 : 61;
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

function CommanderLeads() {
  useCohort();
  const activeCohort = window.__cohortStore.getSelected();
  const cohortUsers = useMergedUsers(activeCohort?.id);
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
          const trackExos = cohortUsers.filter(u =>
            lead.reports.includes(u.id) || window.getUserLead?.(u.id)?.id === lead.id
          );
          const avg = trackExos.length ? Math.round(trackExos.reduce((s,u) => s + u.points, 0) / trackExos.length) : 0;
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
                <div><div className="t-label-muted">SAT</div><div className="t-mono" style={{ fontSize: 18, color: 'var(--lime)', fontWeight: 700 }}>{lead.satisfaction.toFixed(1)}</div></div>
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
function CommanderExonauts() {
  useCohort();
  const activeCohort = window.__cohortStore.getSelected();
  const [scope, setScope] = React.useState('cohort'); // 'all' | 'cohort' | 'manager'
  const [leadFilter, setLeadFilter] = React.useState(LEADS[0]?.id || '');
  const [trackFilter, setTrackFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('points'); // 'points' | 'name' | 'missions'

  // Build base set by scope — uses merged seed+registered pool
  const allMergedUsers = useMergedUsers(null);
  const cohortMergedUsers = useMergedUsers(activeCohort?.id);
  let base;
  if (scope === 'all') {
    base = allMergedUsers;
  } else if (scope === 'cohort') {
    base = cohortMergedUsers;
  } else { // manager
    const lead = LEADS.find(l => l.id === leadFilter);
    base = allMergedUsers.filter(u =>
      lead?.reports.includes(u.id) || window.getUserLead?.(u.id)?.id === lead?.id
    );
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
    const byLead = window.getUserLead ? window.getUserLead(userId) : null;
    if (byLead) return byLead;
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
          { id: 'all',     label: 'All Exonauts', sub: `${allMergedUsers.length} platform-wide`, icon: 'fa-globe' },
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
            const track = TRACKS.find(t => t.code === u.track);
            const lead = leadForUser(u.id);
            const uCohort = getUserCohort(u.id);
            const cohortObj = window.__cohortStore.getAll().find(c => c.id === uCohort);
            const risk = u.points < 200;
            return (
              <div key={u.id} className="lb-row" style={{ gridTemplateColumns: '40px 48px 1fr 110px 140px 90px 80px 80px 80px' }}>
                <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>{String(i + 1).padStart(2, '0')}</div>
                <AvatarWithRing name={u.name} size={34} tier={u.tier} />
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
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--red)' }}>REQUIRE COMMANDER ATTENTION</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Escalations</h1>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        {ESCALATIONS.map(esc => {
          const lead = LEADS.find(l => l.id === esc.leadId);
          const track = TRACKS.find(t => t.code === lead.track);
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
                <button className="btn btn-ghost btn-sm">DISMISS</button>
                <button className="btn btn-ghost btn-sm"><i className="fa-solid fa-message" /> DM LEAD</button>
                <button className="btn btn-primary btn-sm">RESOLVE</button>
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
  const cohortUsers = getCohortUsers();
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
          {[
            { name: 'PROJECT', pct: 78, color: 'var(--lime)' },
            { name: 'CLIENT',  pct: 64, color: 'var(--platinum)' },
            { name: 'RECRUIT', pct: 42, color: 'var(--lavender)' },
          ].map(p => (
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
          <div className="t-body" style={{ fontSize: 12, marginTop: 14, color: 'var(--amber)' }}>
            ⚠ Recruit pillar lagging — push for referrals by Wk 6.
          </div>
        </div>

        <div className="card-flat">
          <div className="t-label-muted" style={{ marginBottom: 8 }}>AT-RISK WATCHLIST</div>
          {cohortUsers.filter(u => u.points < 200).map(u => {
            const track = TRACKS.find(t => t.code === u.track);
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--off-white-07)' }}>
                <AvatarWithRing name={u.name} size={28} tier={u.tier} />
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
        <div className="t-label" style={{ marginBottom: 14 }}>PROGRAM TRAJECTORY · 12 WEEKS</div>
        <TrajectoryChart />
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

function TrajectoryChart() {
  // Simple sparkline for cohort avg points across weeks
  const data = [45, 98, 162, 240, 298, 360, 420, 488, 540, 610, 680, 750];
  const currentWeek = COHORT.week;
  const max = Math.max(...data);
  return (
    <div style={{ position: 'relative', height: 140 }}>
      <svg viewBox="0 0 600 140" style={{ width: '100%', height: '100%' }}>
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * 580 + 10;
          const y = 130 - (v / max) * 110;
          const isCurrent = i === currentWeek - 1;
          const isPast = i < currentWeek;
          return (
            <g key={i}>
              {i > 0 && (
                <line
                  x1={((i-1) / (data.length - 1)) * 580 + 10}
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
function RoleSwitcher({ current, onChange, userRole }) {
  const allRoles = [
    { id: 'exonaut',   label: 'Exonaut',  sub: 'Intern',    icon: 'fa-user-astronaut', accent: 'var(--lime)' },
    { id: 'lead',      label: 'Lead',     sub: 'Manager',   icon: 'fa-user-shield',    accent: 'var(--platinum)' },
    { id: 'commander', label: 'Commander',sub: 'Director',  icon: 'fa-star',           accent: 'var(--amber)' },
    { id: 'admin',     label: 'Admin',    sub: 'Platform',  icon: 'fa-shield-halved',  accent: 'var(--sky)' },
  ];
  // Only show the role(s) this user is credentialed for.
  const roles = allRoles.filter(r => r.id === (userRole || 'exonaut'));
  if (roles.length <= 1) return null;
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
}

// =========================================================================
// PROGRAM MANAGEMENT — Mission assignment for Commander + Lead
// =========================================================================
const __missionAssignStore = (() => {
  const KEY = 'exo:mission-assign:v1';
  const listeners = new Set();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }
  function notify() { listeners.forEach(fn => fn()); }
  return {
    getAssigned(missionId) { return load()[missionId] || []; },
    assign(missionId, userId) {
      const d = load();
      if (!d[missionId]) d[missionId] = [];
      if (!d[missionId].includes(userId)) d[missionId].push(userId);
      save(d); notify();
    },
    unassign(missionId, userId) {
      const d = load();
      if (d[missionId]) d[missionId] = d[missionId].filter(id => id !== userId);
      save(d); notify();
    },
    getAll() { return load(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
window.__missionAssignStore = __missionAssignStore;

function useMissionAssign() {
  const [data, setData] = React.useState(() => __missionAssignStore.getAll());
  React.useEffect(() => __missionAssignStore.subscribe(() => setData(__missionAssignStore.getAll())), []);
  return data;
}

function ProgramManagement({ roleScope }) {
  // roleScope: 'commander' (all exonauts) or 'lead' (own exonauts only)
  const missions = window.__missionStore ? window.__missionStore.getAll() : [];
  const [missionList, setMissionList] = React.useState(missions);
  React.useEffect(() => {
    if (!window.__missionStore) return;
    return window.__missionStore.subscribe(() => setMissionList(window.__missionStore.getAll()));
  }, []);

  const assignData = useMissionAssign();
  const allMerged = useMergedUsers(null);

  // Scope: lead sees only their own exonauts
  const myLead = roleScope === 'lead' ? getMyLead() : null;
  const exonautPool = React.useMemo(() => {
    if (roleScope === 'lead' && myLead) {
      return allMerged.filter(u =>
        myLead.reports.includes(u.id) || window.getUserLead?.(u.id)?.id === myLead.id
      );
    }
    return allMerged;
  }, [allMerged, myLead, roleScope]);

  const [expandedId, setExpandedId] = React.useState(null);
  const [search, setSearch] = React.useState('');

  const accentColor = roleScope === 'lead' ? 'var(--platinum)' : 'var(--amber)';
  const roleLabel   = roleScope === 'lead' ? 'MISSION LEAD' : 'MISSION COMMANDER';

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: accentColor }}>{roleLabel} · PROGRAM MANAGEMENT</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Program Management</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Assign missions to Exonauts. {missionList.length} mission{missionList.length !== 1 ? 's' : ''} available.
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card-panel" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 11 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search missions…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', background: 'var(--deep-black)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      {missionList.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: 64 }}>
          <i className="fa-solid fa-rocket" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
          <div className="t-heading" style={{ fontSize: 15, margin: '0 0 6px 0' }}>No missions yet</div>
          <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)' }}>Platform Admin creates missions. Once created they'll appear here for assignment.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {missionList
            .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()))
            .map(m => {
              const assigned = assignData[m.id] || [];
              const isOpen = expandedId === m.id;
              return (
                <div key={m.id} className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Mission header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}
                       onClick={() => setExpandedId(isOpen ? null : m.id)}>
                    <div style={{ width: 36, height: 36, borderRadius: 2, background: accentColor + '18', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-rocket" style={{ color: accentColor, fontSize: 14 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{m.title}</div>
                      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 3, letterSpacing: '0.08em' }}>
                        {m.id} · {m.points || 0} PTS · WK {m.week || '—'} · {assigned.length} ASSIGNED
                      </div>
                    </div>
                    <span className="status-pill" style={{ background: accentColor + '18', color: accentColor, borderColor: accentColor + '40' }}>
                      {assigned.length}/{exonautPool.length} ASSIGNED
                    </span>
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: 'var(--off-white-40)', fontSize: 11 }} />
                  </div>

                  {/* Expanded assignment panel */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--off-white-07)', padding: '16px 20px' }}>
                      {exonautPool.length === 0 ? (
                        <div className="t-body" style={{ color: 'var(--off-white-40)', fontSize: 13 }}>
                          No Exonauts in scope yet.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {/* Assign all / clear all */}
                          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              exonautPool.forEach(u => __missionAssignStore.assign(m.id, u.id));
                            }}>ASSIGN ALL</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              exonautPool.forEach(u => __missionAssignStore.unassign(m.id, u.id));
                            }}>CLEAR ALL</button>
                          </div>
                          {exonautPool.map(u => {
                            const isAssigned = assigned.includes(u.id);
                            return (
                              <div key={u.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px',
                                background: isAssigned ? accentColor + '08' : 'var(--off-white-07)',
                                border: '1px solid ' + (isAssigned ? accentColor + '40' : 'transparent'),
                                borderRadius: 2, transition: 'all 0.12s',
                              }}>
                                <AvatarWithRing name={u.name} size={28} tier={u.tier || 'entry'} />
                                <div style={{ flex: 1 }}>
                                  <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>{u.name}</div>
                                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 2 }}>
                                    {u.track || '—'} · {u.points || 0} PTS
                                  </div>
                                </div>
                                <button
                                  className={'btn btn-sm ' + (isAssigned ? 'btn-ghost' : 'btn-primary')}
                                  style={{ minWidth: 90, justifyContent: 'center', borderColor: isAssigned ? accentColor : undefined, color: isAssigned ? accentColor : undefined }}
                                  onClick={() => isAssigned
                                    ? __missionAssignStore.unassign(m.id, u.id)
                                    : __missionAssignStore.assign(m.id, u.id)
                                  }>
                                  {isAssigned ? <><i className="fa-solid fa-check" /> ASSIGNED</> : 'ASSIGN'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  LeadHome, LeadRoster, LeadGrade, LeadQueue,
  CommanderHome, CommanderLeads, CommanderExonauts, CommanderEscalations, CommanderHealth,
  ProgramManagement,
  RoleSwitcher, KPI,
});
