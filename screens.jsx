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

function MissionsList({ onOpenMission }) {
  const [view, setView] = React.useState('queue'); // queue | briefs | rubric
  const [filter, setFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [expandedId, setExpandedId] = React.useState(null);
  const filtered = MISSIONS.filter(m => {
    if (filter === 'my' && m.track !== 'AIS') return false;
    if (filter === 'cohort' && m.track !== null) return false;
    if (statusFilter === 'active' && m.status === 'approved') return false;
    if (statusFilter === 'done' && m.status !== 'approved') return false;
    return true;
  });

  const statusMap = {
    'not-started': { cls: 'status-not-started', label: 'NOT STARTED', cta: 'START' },
    'in-progress': { cls: 'status-in-progress', label: 'IN PROGRESS', cta: 'CONTINUE' },
    'submitted':   { cls: 'status-submitted', label: 'SUBMITTED', cta: 'VIEW' },
    'approved':    { cls: 'status-approved', label: 'APPROVED', cta: 'REVIEW' },
  };

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>YOUR MISSION QUEUE · BATCH 2026–2027</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Missions</h1>
        </div>
        <div className="t-mono" style={{ color: 'var(--off-white-40)', fontSize: 11 }}>
          WEEK {COHORT.week} OF {COHORT.weekTotal} · DEMO DAY {COHORT.demoDay}
        </div>
      </div>

      {/* Top view switcher */}
      <div className="leaderboard-tabs" style={{ marginBottom: 18 }}>
        <div className={'lb-tab' + (view === 'queue' ? ' active' : '')} onClick={() => setView('queue')}>
          <i className="fa-solid fa-bullseye" style={{ marginRight: 6 }} /> Active Queue
        </div>
        <div className={'lb-tab' + (view === 'briefs' ? ' active' : '')} onClick={() => setView('briefs')}>
          <i className="fa-solid fa-book-open" style={{ marginRight: 6 }} /> Mission Briefs · All 12 Weeks
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
            {filtered.map(m => {
              const track = m.track ? TRACKS.find(t => t.code === m.track) : null;
              const isOverdue = m.dueIn < 0 && m.status !== 'approved';
              const s = statusMap[m.status];
              const isExpanded = expandedId === m.id;
              const canSubmit = m.status !== 'approved';
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

// ========== KUDOS FEED ==========
const KUDOS_FEED = [];

function KudosFeed({ onGive }) {
  const [filter, setFilter] = React.useState('all');
  const kudos = useKudos();
  // Identify "me" for the "Involving Me" filter based on current role.
  const meId = React.useMemo(() => {
    let auth = {};
    try { auth = JSON.parse(localStorage.getItem('exo:auth') || '{}'); } catch (e) {}
    if (auth.role === 'lead') return 'lead-ais';
    if (auth.role === 'commander') return 'cmdr-mack';
    if (auth.role === 'admin') return 'admin-ops';
    return (typeof ME_ID !== 'undefined') ? ME_ID : 'u14';
  }, []);
  const feed = filter === 'all' ? kudos.all : kudos.all.filter(k => k.to === meId || k.from === meId);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>LIFT BEFORE YOU CLIMB</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Kudos</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="t-mono" style={{ color: 'var(--off-white-40)', fontSize: 11 }}>2 OF 3 REMAINING · WK {COHORT.week}</span>
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
        {feed.map((k, i) => {
          const fromInfo = resolveAuthor(k.from, k.fromName);
          const toInfo   = resolveAuthor(k.to, k.toName);
          const fromRoleStyle = roleBadgeStyle(k.fromRole);
          return (
            <div key={k.id || i} className="card-panel" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <AvatarWithRing name={fromInfo.name} size={36} tier={fromInfo.tier} />
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
                    {kudos.timeAgo(k.createdAt)} · TAGGED {(k.pillar || 'project').toUpperCase()}
                  </div>
                </div>
                <AvatarWithRing name={toInfo.name} size={36} tier={toInfo.tier} />
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

// ========== RITUALS ==========
function ritualWeekRange(weekNum) {
  const start = new Date('2026-10-06');
  const ws = new Date(start); ws.setDate(start.getDate() + (weekNum - 1) * 7);
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  return `${fmt(ws)} — ${fmt(we)}`;
}

function RitualComposer({ ritual, weekNum, onClose, onDone }) {
  const [body, setBody] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  function handlePost() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const fullBody = trimmed + '\n\n' + ritual.hashtag;
    const title = `${ritual.name} · Week ${weekNum}`;
    let postId = null;
    if (window.__boardStore) {
      const thread = window.__boardStore.createThread({
        title,
        body: fullBody,
        channel: 'general',
        authorId: ME_ID,
        authorName: ME.name,
      });
      postId = thread?.id || null;
    }
    if (window.__ritualStore) {
      window.__ritualStore.submit(ME_ID, ritual.id, weekNum, postId);
    }
    onDone();
  }

  return (
    <div className="modal-scrim" onClick={onClose} style={{ alignItems: 'center' }}>
      <div className="modal-body" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <div className="t-label" style={{ marginBottom: 4 }}>RITUAL POST · {ritual.hashtag}</div>
            <div className="t-heading" style={{ fontSize: 20, textTransform: 'none', letterSpacing: 0, margin: 0 }}>{ritual.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--off-white-68)', fontSize: 18 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="t-body" style={{ color: 'var(--off-white-68)', marginBottom: 16, fontSize: 13 }}>
          Share your update. This will post to Message Board — General with {ritual.hashtag}. Points awarded once your Mission Lead confirms.
        </div>
        <textarea
          autoFocus
          rows={5}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={`What's your ${ritual.name} update this week?`}
          style={{ width: '100%', background: 'var(--bg-dark)', border: '1px solid var(--off-white-15)', borderRadius: 4, padding: '12px 14px', color: 'var(--off-white)', fontFamily: 'var(--font-body)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handlePost} disabled={!body.trim() || submitting}>
            <i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />POST {ritual.hashtag}
          </button>
        </div>
      </div>
    </div>
  );
}

function RitualsPage() {
  const userId = ME_ID;
  const weekNum = COHORT.week;
  const [composing, setComposing] = React.useState(null);
  const { weekData, refresh } = window.useRituals ? window.useRituals(userId, weekNum) : { weekData: {}, refresh: () => {} };
  const allHistory = window.__ritualStore ? window.__ritualStore.getAll(userId) : {};
  const pastWeeks = Object.keys(allHistory).map(Number).filter(w => w < weekNum).sort((a, b) => b - a);

  function handleDone() {
    setComposing(null);
    refresh();
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>WEEKLY CADENCE</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Rituals</h1>
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>WEEK {weekNum}/{COHORT.weekTotal}</div>
      </div>

      {weekNum === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: 48 }}>
          <i className="fa-solid fa-calendar-days" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 12 }} />
          <div className="t-body" style={{ color: 'var(--off-white-68)' }}>Cohort starts OCT 06 2026. Rituals will unlock then.</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>This Week</h2>
              <span className="section-meta">{ritualWeekRange(weekNum)}</span>
            </div>
            <div className="ritual-row">
              {RITUALS.map(r => {
                const state = weekData[r.id]?.state || 'not-started';
                const isDone = state === 'confirmed';
                const isSubmitted = state === 'submitted';
                const iconCls = isDone ? 'fa-circle-check' : isSubmitted ? 'fa-circle-half-stroke' : 'fa-circle-dot';
                const cCls = (isDone || isSubmitted) ? 'done-c' : 'pend-c';
                return (
                  <div key={r.id} className={'ritual-cell ' + (isDone || isSubmitted ? 'done' : 'not-started')}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="ritual-head">
                      <div className="ritual-name">{r.name}</div>
                      <i className={'fa-solid ' + iconCls + ' ritual-icon ' + cCls} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em' }}>
                      {isDone ? 'CONFIRMED' : isSubmitted ? 'SUBMITTED · PENDING LEAD' : 'PENDING'}
                    </div>
                    <div className="ritual-points">+{r.points} PTS</div>
                    {!isDone && !isSubmitted && (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 4, fontSize: 11 }} onClick={() => setComposing(r)}>
                        <i className="fa-solid fa-pen-to-square" style={{ marginRight: 5 }} />POST
                      </button>
                    )}
                    {isSubmitted && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink)', letterSpacing: '0.05em', marginTop: 4 }}>
                        <i className="fa-solid fa-check" style={{ marginRight: 4 }} />POSTED TO BOARD
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16 }}>Ritual History · All Weeks</h2>
            <span className="section-meta">TRACKED FROM WEEK 1</span>
          </div>

          {pastWeeks.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: 40 }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 24, color: 'var(--off-white-40)', marginBottom: 12 }} />
              <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No ritual history yet. Completed weeks will appear here.</div>
            </div>
          ) : pastWeeks.map(w => {
            const wData = allHistory[w] || {};
            return (
              <div key={w} className="card-panel" style={{ marginBottom: 10, padding: '16px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="t-mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>WEEK {w}</div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{ritualWeekRange(w)}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {RITUALS.map(r => {
                    const st = wData[r.id]?.state || 'not-started';
                    const color = st === 'confirmed' ? 'var(--ink)' : st === 'submitted' ? 'var(--amber)' : 'var(--off-white-40)';
                    const icon = st === 'confirmed' ? 'fa-circle-check' : st === 'submitted' ? 'fa-circle-half-stroke' : 'fa-circle-xmark';
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--off-white-68)' }}>
                        <i className={'fa-solid ' + icon} style={{ color, fontSize: 13 }} />
                        {r.name}
                        {st !== 'not-started' && <span style={{ color, fontSize: 10 }}>· {st.toUpperCase()}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {composing && (
        <RitualComposer ritual={composing} weekNum={weekNum} onClose={() => setComposing(null)} onDone={handleDone} />
      )}
    </div>
  );
}

// ========== ANNOUNCEMENT STORE (localStorage) ==========
const __annStore = (() => {
  const KEY = 'exo:announcements:v1';
  const listeners = new Set();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
  function notify() { listeners.forEach(fn => fn()); }
  return {
    getAll() { return load(); },
    add(ann) {
      const data = load();
      data.unshift({ ...ann, id: Date.now(), ts: Date.now() });
      save(data); notify();
    },
    remove(id) {
      const data = load().filter(a => a.id !== id);
      save(data); notify();
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();

function useAnnouncements() {
  const [list, setList] = React.useState(() => __annStore.getAll());
  React.useEffect(() => __annStore.subscribe(() => setList(__annStore.getAll())), []);
  return list;
}

// ========== MISSION STORE (localStorage) ==========
const __missionStore = (() => {
  const KEY = 'exo:missions:v1';
  const listeners = new Set();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
  function notify() { listeners.forEach(fn => fn()); }
  return {
    getAll() { return load(); },
    add(m) {
      const data = load();
      const id = 'M' + String(data.length + 1).padStart(2, '0');
      data.push({ ...m, id, status: 'active', createdAt: Date.now() });
      save(data); notify();
      return id;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();

function useMissions() {
  const [list, setList] = React.useState(() => __missionStore.getAll());
  React.useEffect(() => __missionStore.subscribe(() => setList(__missionStore.getAll())), []);
  return list;
}

// ========== BADGE AWARD STORE (localStorage) ==========
const __badgeStore = (() => {
  const KEY = 'exo:badge-awards:v1';
  const listeners = new Set();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
  function notify() { listeners.forEach(fn => fn()); }
  return {
    getAwardees(badgeCode) { return load()[badgeCode] || []; },
    award(badgeCode, userId) {
      const data = load();
      if (!data[badgeCode]) data[badgeCode] = [];
      if (!data[badgeCode].includes(userId)) data[badgeCode].push(userId);
      save(data); notify();
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();

// ========== ANNOUNCEMENTS PAGE ==========
function AnnouncementsPage() {
  const announcements = useAnnouncements();
  const typeMap = {
    info:        { color: 'var(--platinum)', icon: 'fa-circle-info',        label: 'INFO' },
    action:      { color: 'var(--amber)',    icon: 'fa-triangle-exclamation',label: 'ACTION REQUIRED' },
    celebration: { color: 'var(--ink)',      icon: 'fa-star',               label: 'CELEBRATION' },
    urgent:      { color: 'var(--red)',      icon: 'fa-bolt',               label: 'URGENT' },
  };
  function timeAgo(ts) {
    const d = Date.now() - ts, m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(d / 3600000);
    if (h < 24) return h + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
  }
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>FROM YOUR LEADS, COMMANDERS, AND ADMINS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Announcements</h1>
        </div>
      </div>
      {announcements.length === 0 ? (
        <div className="card-panel" style={{ padding: 48, textAlign: 'center' }}>
          <i className="fa-solid fa-bullhorn" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12, display: 'block' }} />
          <div className="t-mono" style={{ fontSize: 12, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>NO ANNOUNCEMENTS YET</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {announcements.map(a => {
            const t = typeMap[a.type] || typeMap.info;
            return (
              <div key={a.id} className="card-panel" style={{ borderLeft: `2px solid ${t.color}`, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: t.color }}>
                    <i className={'fa-solid ' + t.icon} style={{ marginRight: 6 }} />{t.label}
                  </span>
                  <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{timeAgo(a.ts)} · {(a.from || 'ADMIN').toUpperCase()}</span>
                </div>
                <h3 className="t-heading" style={{ fontSize: 18, margin: '0 0 8px 0', textTransform: 'none', letterSpacing: 0 }}>{a.title}</h3>
                <div className="t-body">{a.body}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========== NOTIFICATIONS ==========
function NotificationsPage() {
  const userId = (typeof ME_ID !== 'undefined') ? ME_ID : 'u14';
  const notifs = window.useNotifications ? window.useNotifications(userId) : { list: [], hasUnread: false, markAllRead: () => {} };
  const unreadCount = notifs.list.filter(n => n.unread).length;
  const timeAgo = window.__notifStore?.timeAgo || (() => '');

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>
            {unreadCount > 0 ? `${unreadCount} UNREAD` : 'ALL CAUGHT UP'}
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost" onClick={notifs.markAllRead}>MARK ALL READ</button>
        )}
      </div>

      <div className="card-panel" style={{ padding: 0 }}>
        {notifs.list.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="fa-solid fa-bell-slash" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 12 }} />
            <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No notifications yet. Kudos and updates will appear here.</div>
          </div>
        ) : notifs.list.map((n, i) => (
          <div key={n.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 16,
            padding: '18px 24px', borderBottom: i < notifs.list.length - 1 ? '1px solid var(--off-white-07)' : 'none',
            background: n.unread ? 'rgba(201,229,0,0.03)' : 'transparent',
            alignItems: 'center', cursor: 'pointer', transition: 'background 150ms',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-dark)', border: '1px solid var(--off-white-07)', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
              <i className={'fa-solid ' + n.icon} />
            </div>
            <div>
              <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>
                {n.title}
                {n.unread && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ef4444', marginLeft: 6, verticalAlign: 'middle' }} />}
              </div>
              <div className="t-body" style={{ fontSize: 13, marginTop: 2 }}>{n.sub}</div>
            </div>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{timeAgo(n.ts)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== ADMIN PANEL ==========
function AdminPanel() {
  const [tab, setTab] = React.useState('users');
  const registeredUsers = window.useRegisteredUsers ? window.useRegisteredUsers() : [];
  const missions = useMissions();
  const announcements = useAnnouncements();

  // Live stats
  const exonauts = registeredUsers.filter(u => u.role === 'exonaut');
  const leads    = registeredUsers.filter(u => u.role === 'lead' || u.role === 'commander' || u.role === 'admin');
  const userPoints = exonauts.map(u => window.__pointsStore ? window.__pointsStore.getTotal(u.userId) : 0);
  const avgPoints  = exonauts.length ? Math.round(userPoints.reduce((s,p) => s+p, 0) / exonauts.length) : 0;
  const atRisk     = exonauts.filter(u => window.__pointsStore ? window.__pointsStore.getTotal(u.userId) === 0 : false).length;

  // Modal state
  const [newMissionOpen, setNewMissionOpen]   = React.useState(false);
  const [awardBadge, setAwardBadge]           = React.useState(null); // badge object
  const [bulkRitual, setBulkRitual]           = React.useState(null); // ritual object
  const [announceTitle, setAnnounceTitle]     = React.useState('');
  const [announceBody, setAnnounceBody]       = React.useState('');
  const [announceType, setAnnounceType]       = React.useState('info');
  const [announceSuccess, setAnnounceSuccess] = React.useState(false);

  function publish() {
    if (!announceTitle.trim() || !announceBody.trim()) return;
    __annStore.add({ title: announceTitle.trim(), body: announceBody.trim(), type: announceType, from: 'Admin' });
    setAnnounceTitle(''); setAnnounceBody(''); setAnnounceType('info');
    setAnnounceSuccess(true); setTimeout(() => setAnnounceSuccess(false), 3000);
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>SUPER ADMIN · MACK COMANDANTE</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Admin Console</h1>
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>
          {exonauts.length} EXONAUTS · {leads.length} LEADS/ADMINS · {COHORT.code}
        </div>
      </div>

      <div className="leaderboard-tabs">
        {['users','missions','points','badges','rituals','reports','announce'].map(t => (
          <div key={t} className={'lb-tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {/* ── REPORTS ── */}
      {tab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card-flat">
            <div className="t-label-muted">AVG POINTS</div>
            <div className="t-mono" style={{ fontSize: 28, color: 'var(--ink)', fontWeight: 700, marginTop: 8 }}>{exonauts.length ? avgPoints : '—'}</div>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>{exonauts.length} EXONAUTS TRACKED</div>
          </div>
          <div className="card-flat">
            <div className="t-label-muted">MISSIONS LIVE</div>
            <div className="t-mono" style={{ fontSize: 28, color: 'var(--off-white)', fontWeight: 700, marginTop: 8 }}>{missions.length}</div>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>CONFIGURED</div>
          </div>
          <div className="card-flat">
            <div className="t-label-muted">ANNOUNCEMENTS</div>
            <div className="t-mono" style={{ fontSize: 28, color: 'var(--off-white)', fontWeight: 700, marginTop: 8 }}>{announcements.length}</div>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>PUBLISHED</div>
          </div>
          <div className="card-flat" style={{ borderColor: atRisk > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
            <div className="t-label-muted" style={{ color: atRisk > 0 ? 'var(--red)' : undefined }}>AT-RISK</div>
            <div className="t-mono" style={{ fontSize: 28, color: atRisk > 0 ? 'var(--red)' : 'var(--off-white)', fontWeight: 700, marginTop: 8 }}>{exonauts.length ? atRisk : '—'}</div>
            <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>0 PTS · NO ACTIVITY</div>
          </div>
        </div>
      )}

      {/* ── USERS / POINTS ── */}
      {(tab === 'users' || tab === 'points' || tab === 'reports') && (
        exonauts.length === 0 ? (
          <div className="card-panel" style={{ padding: 48, textAlign: 'center', color: 'var(--off-white-40)' }}>
            <i className="fa-solid fa-users" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
            <div className="t-mono" style={{ fontSize: 12, letterSpacing: '0.08em' }}>NO EXONAUTS ENROLLED YET</div>
            <div className="t-body" style={{ fontSize: 12, marginTop: 6 }}>Registered users will appear here once they sign up.</div>
          </div>
        ) : (
          <div className="lb-table">
            <div className="lb-header" style={{ gridTemplateColumns: '48px 1fr 180px 90px 80px 100px' }}>
              <div /><div>EXONAUT</div><div>EMAIL</div><div>POINTS</div><div>TIER</div><div>ACTIONS</div>
            </div>
            {[...exonauts].sort((a,b) => (window.__pointsStore?.getTotal(b.userId)||0) - (window.__pointsStore?.getTotal(a.userId)||0)).map(u => {
              const pts  = window.__pointsStore ? window.__pointsStore.getTotal(u.userId) : 0;
              const tier = window.getTierFromPts ? window.getTierFromPts(pts) : 'entry';
              return (
                <div key={u.userId} className="lb-row" style={{ gridTemplateColumns: '48px 1fr 180px 90px 80px 100px' }}>
                  <AvatarWithRing name={u.name} size={34} tier={tier} />
                  <div className="lb-name">{u.name}<TierCrest tier={tier} /></div>
                  <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-68)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  <div className="lb-points">{pts}</div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-68)', textTransform: 'uppercase' }}>{tier}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Award points"
                      onClick={() => {
                        const pts = prompt(`Award manual points to ${u.name}?\nEnter points amount:`);
                        const n = parseInt(pts);
                        if (!isNaN(n) && n !== 0 && window.__pointsStore) {
                          window.__pointsStore.add(u.userId, { source: 'manual', pts: n, note: 'Manual award by Admin' });
                        }
                      }}>
                      <i className="fa-solid fa-bolt" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── MISSIONS ── */}
      {tab === 'missions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>
              {missions.length} MISSION{missions.length !== 1 ? 'S' : ''} CONFIGURED
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setNewMissionOpen(true)}>
              <i className="fa-solid fa-plus" /> NEW MISSION
            </button>
          </div>
          {missions.length === 0 ? (
            <div className="card-panel" style={{ padding: 48, textAlign: 'center', color: 'var(--off-white-40)' }}>
              <i className="fa-solid fa-rocket" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
              <div className="t-mono" style={{ fontSize: 12, letterSpacing: '0.08em' }}>NO MISSIONS YET</div>
              <div className="t-body" style={{ fontSize: 12, marginTop: 6 }}>Click NEW MISSION to create the first mission for your cohort.</div>
            </div>
          ) : missions.map(m => (
            <div key={m.id} className="mission-row">
              <div className="mission-meta">
                <div className="mission-id">{m.id}</div>
                <div className="mission-title">{m.title}</div>
                <div className="mission-sub">{(m.track || 'ALL TRACKS').toUpperCase()} · {(m.status || 'ACTIVE').toUpperCase()}</div>
              </div>
              <div className="mission-points"><span className="plus">+</span>{m.points}</div>
              <button className="btn btn-ghost btn-sm">REVIEW</button>
            </div>
          ))}
        </div>
      )}

      {/* ── BADGES ── */}
      {tab === 'badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {BADGES.map(b => {
            const awardees = __badgeStore.getAwardees(b.code);
            return (
              <div key={b.code} className="card-flat" style={{ textAlign: 'center', padding: 20 }}>
                <BadgeMedallion badge={b} size={50} />
                <div style={{ marginTop: 10 }} className="t-heading">{b.name}</div>
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 6 }}>
                  {awardees.length > 0 ? `${awardees.length} AWARDED` : 'NOT YET AWARDED'}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  onClick={() => setAwardBadge(b)}>
                  AWARD MANUALLY
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RITUALS ── */}
      {tab === 'rituals' && (
        <div className="ritual-row">
          {RITUALS.map(r => (
            <div key={r.id} className="ritual-cell pending" style={{ cursor: 'default' }}>
              <div className="ritual-head">
                <div className="ritual-name">{r.name}</div>
                <i className="fa-solid fa-gavel ritual-icon pend-c" />
              </div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>
                {exonauts.length > 0 ? `${exonauts.length} EXONAUTS` : 'NO EXONAUTS YET'}
              </div>
              <button className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                disabled={exonauts.length === 0}
                onClick={() => setBulkRitual(r)}>
                BULK MARK
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── ANNOUNCE ── */}
      {tab === 'announce' && (
        <div>
          <div className="card-panel" style={{ marginBottom: 24 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>COMPOSE ANNOUNCEMENT</div>
            <input className="input" placeholder="Title…" style={{ marginBottom: 12 }}
              value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)} />
            <textarea className="textarea" rows={4} placeholder="Body — share updates, wins, reminders…" style={{ marginBottom: 12 }}
              value={announceBody} onChange={e => setAnnounceBody(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['info','action','celebration','urgent'].map(t => (
                  <button key={t} onClick={() => setAnnounceType(t)} style={{
                    padding: '5px 12px', borderRadius: 20, border: '1px solid',
                    borderColor: announceType === t ? 'var(--lime)' : 'var(--off-white-15)',
                    background: announceType === t ? 'var(--lime)' : 'transparent',
                    color: announceType === t ? 'var(--deep-black)' : 'var(--off-white-68)',
                    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  }}>{t.toUpperCase()}</button>
                ))}
              </div>
              {announceSuccess && <span className="t-mono" style={{ fontSize: 10, color: 'var(--lime)' }}>✓ PUBLISHED</span>}
              <button className="btn btn-primary"
                disabled={!announceTitle.trim() || !announceBody.trim()}
                onClick={publish}
                style={{ opacity: (!announceTitle.trim() || !announceBody.trim()) ? 0.5 : 1 }}>
                <i className="fa-solid fa-paper-plane" /> PUBLISH
              </button>
            </div>
          </div>
          <AnnouncementsPage />
        </div>
      )}

      {/* ── NEW MISSION MODAL ── */}
      {newMissionOpen && <NewMissionModal exonauts={exonauts} onClose={() => setNewMissionOpen(false)} />}

      {/* ── AWARD BADGE MODAL ── */}
      {awardBadge && <AwardBadgeModal badge={awardBadge} exonauts={exonauts} onClose={() => setAwardBadge(null)} />}

      {/* ── BULK MARK RITUAL MODAL ── */}
      {bulkRitual && <BulkMarkModal ritual={bulkRitual} exonauts={exonauts} onClose={() => setBulkRitual(null)} />}
    </div>
  );
}

function NewMissionModal({ exonauts, onClose }) {
  const [title, setTitle]   = React.useState('');
  const [points, setPoints] = React.useState('');
  const [track, setTrack]   = React.useState('all');
  const [week, setWeek]     = React.useState('');
  const [saved, setSaved]   = React.useState(false);
  function save() {
    if (!title.trim() || !points) return;
    __missionStore.add({ title: title.trim(), points: parseInt(points), track: track === 'all' ? '' : track, week: parseInt(week) || 0 });
    setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 1000);
  }
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div onClick={e => e.stopPropagation()} className="card-panel" style={{ width:'min(480px,100%)',padding:0,borderColor:'var(--lime)' }}>
        <div style={{ padding:'18px 24px 14px',borderBottom:'1px solid var(--off-white-07)',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div>
            <div className="t-mono" style={{ fontSize:9,color:'var(--lime)',letterSpacing:'0.12em',fontWeight:700,marginBottom:4 }}>NEW MISSION</div>
            <h2 className="t-title" style={{ fontSize:22,margin:0 }}>Create Mission</h2>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--off-white-40)',cursor:'pointer',fontSize:16 }}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <label style={{ display:'block' }}>
            <div className="t-mono" style={{ fontSize:9,color:'var(--off-white-40)',letterSpacing:'0.1em',marginBottom:6,fontWeight:700 }}>MISSION TITLE</div>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AI Landscape Report" style={{ width:'100%' }} />
          </label>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <label style={{ display:'block' }}>
              <div className="t-mono" style={{ fontSize:9,color:'var(--off-white-40)',letterSpacing:'0.1em',marginBottom:6,fontWeight:700 }}>POINTS</div>
              <input className="input" type="number" value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. 35" />
            </label>
            <label style={{ display:'block' }}>
              <div className="t-mono" style={{ fontSize:9,color:'var(--off-white-40)',letterSpacing:'0.1em',marginBottom:6,fontWeight:700 }}>WEEK #</div>
              <input className="input" type="number" value={week} onChange={e => setWeek(e.target.value)} placeholder="e.g. 3" />
            </label>
          </div>
          <label style={{ display:'block' }}>
            <div className="t-mono" style={{ fontSize:9,color:'var(--off-white-40)',letterSpacing:'0.1em',marginBottom:6,fontWeight:700 }}>TRACK</div>
            <select className="input" value={track} onChange={e => setTrack(e.target.value)} style={{ width:'100%' }}>
              <option value="all">All Tracks</option>
              {(typeof TRACKS !== 'undefined' ? TRACKS : []).map(t => (
                <option key={t.code} value={t.code}>{t.short || t.code}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ padding:'12px 24px 20px',display:'flex',justifyContent:'flex-end',gap:8,borderTop:'1px solid var(--off-white-07)' }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">CANCEL</button>
          <button onClick={save} disabled={!title.trim() || !points}
            className="btn btn-primary btn-sm"
            style={{ opacity:(!title.trim()||!points)?0.5:1 }}>
            {saved ? '✓ SAVED' : <><i className="fa-solid fa-check" /> CREATE MISSION</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function AwardBadgeModal({ badge, exonauts, onClose }) {
  const [search, setSearch] = React.useState('');
  const [awarded, setAwarded] = React.useState([]);
  const awardees = __badgeStore.getAwardees(badge.code);
  function award(userId, name) {
    __badgeStore.award(badge.code, userId);
    if (window.__pointsStore) window.__pointsStore.add(userId, { source: 'manual', pts: 10, note: `Badge awarded: ${badge.name}` });
    setAwarded(a => [...a, userId]);
  }
  const filtered = exonauts.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div onClick={e => e.stopPropagation()} className="card-panel" style={{ width:'min(440px,100%)',padding:0,borderColor:'var(--amber)',maxHeight:'80vh',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'18px 24px 14px',borderBottom:'1px solid var(--off-white-07)' }}>
          <div className="t-mono" style={{ fontSize:9,color:'var(--amber)',letterSpacing:'0.12em',fontWeight:700,marginBottom:8 }}>AWARD BADGE MANUALLY</div>
          <div style={{ display:'flex',gap:12,alignItems:'center' }}>
            <BadgeMedallion badge={badge} size={40} />
            <div>
              <div className="t-heading" style={{ fontSize:16,textTransform:'none',letterSpacing:0 }}>{badge.name}</div>
              <div className="t-mono" style={{ fontSize:10,color:'var(--off-white-40)' }}>{awardees.length} ALREADY AWARDED</div>
            </div>
          </div>
          <input className="input" placeholder="Search exonauts…" value={search} onChange={e => setSearch(e.target.value)} style={{ width:'100%',marginTop:12 }} />
        </div>
        <div style={{ overflow:'auto',flex:1,padding:'8px 12px 12px' }}>
          {filtered.length === 0 && <div className="t-body" style={{ padding:24,textAlign:'center',color:'var(--off-white-40)',fontSize:12 }}>No exonauts found.</div>}
          {filtered.map(u => {
            const alreadyHas = awardees.includes(u.userId) || awarded.includes(u.userId);
            return (
              <div key={u.userId} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 8px',borderRadius:2 }}>
                <AvatarWithRing name={u.name} size={30} tier="entry" />
                <div style={{ flex:1 }} className="t-body" style={{ fontSize:12 }}>{u.name}</div>
                {alreadyHas
                  ? <span className="t-mono" style={{ fontSize:9,color:'var(--lime)' }}>✓ AWARDED</span>
                  : <button className="btn btn-ghost btn-sm" style={{ padding:'4px 10px' }} onClick={() => award(u.userId, u.name)}>AWARD</button>
                }
              </div>
            );
          })}
        </div>
        <div style={{ padding:'12px 24px',borderTop:'1px solid var(--off-white-07)',display:'flex',justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary btn-sm">DONE</button>
        </div>
      </div>
    </div>
  );
}

function BulkMarkModal({ ritual, exonauts, onClose }) {
  const [done, setDone] = React.useState(false);
  const sourceMap = { 'Monday Ignition':'ritual.mon_ign', 'Mid-Week Pulse':'ritual.mid_pls', 'Friday Win Wall':'ritual.fri_win' };
  const ptsMap    = { 'ritual.mon_ign': 5, 'ritual.mid_pls': 3, 'ritual.fri_win': 5 };
  const source    = sourceMap[ritual.name] || 'ritual.mon_ign';
  const pts       = ptsMap[source] || 5;
  function bulkMark() {
    exonauts.forEach(u => {
      if (window.__pointsStore) window.__pointsStore.add(u.userId, { source, pts, note: `${ritual.name} — bulk marked by Admin` });
    });
    setDone(true); setTimeout(onClose, 1500);
  }
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div onClick={e => e.stopPropagation()} className="card-panel" style={{ width:'min(400px,100%)',padding:24,borderColor:'var(--lime)',textAlign:'center' }}>
        <i className="fa-solid fa-gavel" style={{ fontSize:32,color:'var(--lime)',marginBottom:12,display:'block' }} />
        <h2 className="t-title" style={{ fontSize:20,margin:'0 0 8px 0' }}>{ritual.name}</h2>
        <div className="t-body" style={{ color:'var(--off-white-68)',fontSize:13,marginBottom:20 }}>
          Award <strong>+{pts} pts</strong> to all <strong>{exonauts.length} Exonauts</strong> for this ritual?
        </div>
        {done
          ? <div className="t-mono" style={{ color:'var(--lime)',fontSize:12 }}>✓ AWARDED TO {exonauts.length} EXONAUTS</div>
          : <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
              <button onClick={onClose} className="btn btn-ghost btn-sm">CANCEL</button>
              <button onClick={bulkMark} className="btn btn-primary">
                <i className="fa-solid fa-check" /> CONFIRM BULK MARK
              </button>
            </div>
        }
      </div>
    </div>
  );
}

// ========== ALUMNI PORTAL ==========
function AlumniPage() {
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
          On <span style={{ color: 'var(--ink)' }}>JAN 29 2027</span>, your profile, badges, and mission history become permanent. You'll gain access to the alumni directory, Hall of Exonauts, and Corps-only opportunities.
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)', letterSpacing: '0.15em' }}>
          T-MINUS 73 DAYS TO CORPS INDUCTION
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

function getCommunityMembers() {
  // Active = current USERS (2026-27). Alumni = synthesized previous-cohort graduates.
  const activeTierFor = (u) => u.points >= 900 ? 'platinum' : u.points >= 600 ? 'gold' : u.points >= 300 ? 'silver' : 'bronze';
  const active = USERS.map(u => {
    const creds = COMMUNITY_CREDENTIALS[u.track] || [];
    const projects = COMMUNITY_PROJECTS_BY_TRACK[u.track] || [];
    const hash = u.id.charCodeAt(1) + u.id.charCodeAt(2);
    return {
      ...u,
      status: 'active',
      cohort: '2026-27',
      tierBadge: activeTierFor(u),
      credentials: creds.slice(hash % 3, hash % 3 + 4),
      project: projects[hash % projects.length],
      socials: makeSocials(u.name, u.id),
    };
  });

  return [...active];
}

function CommunityPage() {
  const [filter, setFilter] = React.useState('all');     // all | active | alumni
  const [trackFilter, setTrackFilter] = React.useState('all');
  const [batchFilter, setBatchFilter] = React.useState('all');   // alumni cohort year
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const registeredUsers = window.useRegisteredUsers ? window.useRegisteredUsers() : [];
  const { all: allCohorts } = window.useCohort ? window.useCohort() : { all: [] };

  const members = React.useMemo(() =>
    registeredUsers.map(u => {
      // Resolve actual cohort name from assignment store
      const cohortId = u.cohortId
        || (window.getUserCohort ? window.getUserCohort(u.userId) : null);
      const cohortObj = allCohorts.find(c => c.id === cohortId);
      const cohortLabel = cohortObj
        ? (cohortObj.name || cohortObj.code || cohortId)
        : (cohortId || '—');
      const pts  = window.__pointsStore ? window.__pointsStore.getTotal(u.userId) : 0;
      const tier = window.getTierFromPts ? window.getTierFromPts(pts) : 'entry';
      return {
        id: u.userId,
        name: u.name,
        status: 'active',
        cohort: cohortLabel,
        track: window.getUserTrack ? window.getUserTrack(u.userId) : null,
        tier,
        tierBadge: tier,
        points: pts,
        badges: 0,
        credentials: [],
        project: null,
        role: u.role === 'admin' ? 'Platform Admin'
            : u.role === 'lead' ? 'Mission Lead'
            : u.role === 'commander' ? 'Commander'
            : null,
        socials: null,
      };
    }), [registeredUsers, allCohorts]);

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
      if (!(m.name.toLowerCase().includes(q) || projectText.toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q))) return false;
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
            Every Exonaut — active and alumni. Browse profiles to see badges, credentials, and projects.
          </div>
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-68)', letterSpacing: '0.08em' }}>
          <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{counts.active}</span> ACTIVE · <span style={{ color: 'var(--off-white)', fontWeight: 700 }}>{counts.alumni}</span> ALUMNI
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--off-white-07)', borderRadius: 2 }}>
          {[
            { id: 'all',    label: 'All · ' + counts.all },
            { id: 'active', label: 'Active · ' + counts.active },
            { id: 'alumni', label: 'Alumni · ' + counts.alumni },
          ].map(opt => (
            <button key={opt.id} onClick={() => setFilter(opt.id)} style={{
              padding: '7px 14px', background: filter === opt.id ? 'var(--lime)' : 'transparent',
              color: filter === opt.id ? 'var(--ink)' : 'var(--off-white-68)',
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
        <div className="community-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {filtered.map(m => (
            <CommunityCard key={m.id} m={m} onOpen={() => setSelected(m)} />
          ))}
        </div>
      )}

      {selected && <CommunityProfileSheet m={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CommunityCard({ m, onOpen }) {
  const track = TRACKS.find(t => t.code === m.track);
  const isAlumni = m.status === 'alumni';
  return (
    <div onClick={onOpen} className="card-panel" style={{
      padding: 16, cursor: 'pointer', transition: 'all 0.15s',
      borderColor: 'var(--off-white-15)',
      background: 'transparent',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.background = 'rgba(201,229,0,0.03)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--off-white-15)'; e.currentTarget.style.background = 'transparent'; }}>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <AvatarWithRing name={m.name} size={44} tier={m.tierBadge}
          photoUrl={localStorage.getItem('exo:avatar:' + m.id) || undefined} />
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
      {m.socials && (
        <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid var(--off-white-07)' }}>
          {[
            { k: 'linkedin',  icon: 'fa-brands fa-linkedin-in', color: '#0A66C2' },
            { k: 'instagram', icon: 'fa-brands fa-instagram',   color: '#E4405F' },
            { k: 'facebook',  icon: 'fa-brands fa-facebook-f',  color: '#1877F2' },
            { k: 'github',    icon: 'fa-brands fa-github',      color: 'var(--off-white)' },
          ].map(s => (
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
  // Pick a deterministic set of badges for display
  const displayBadges = React.useMemo(() => {
    const hash = m.id.charCodeAt(1) + m.id.charCodeAt(2);
    return BADGES.slice(hash % Math.max(1, BADGES.length - 6), hash % Math.max(1, BADGES.length - 6) + Math.min(6, m.badges));
  }, [m.id, m.badges]);

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
            <AvatarWithRing name={m.name} size={72} tier={m.tierBadge}
              photoUrl={localStorage.getItem('exo:avatar:' + m.id) || undefined} />
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
              { k: 'TIER',   v: (m.tierBadge || 'bronze').toUpperCase() },
              { k: 'STATUS', v: isAlumni ? 'ALUMNI' : 'ACTIVE' },
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
        </div>

        {/* Credentials */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--off-white-07)' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>CREDENTIALS & SKILLS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {m.credentials.map(c => (
              <span key={c} className="t-mono" style={{
                fontSize: 10, padding: '5px 10px', border: '1px solid var(--off-white-15)', borderRadius: 2,
                color: 'var(--off-white)', letterSpacing: '0.04em', background: 'var(--off-white-07)',
              }}>{c.toUpperCase()}</span>
            ))}
          </div>
        </div>

        {/* Socials */}
        {m.socials && (
          <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--off-white-07)' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>CONNECT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { k: 'linkedin',  icon: 'fa-brands fa-linkedin-in', color: '#0A66C2', label: 'LinkedIn' },
                { k: 'github',    icon: 'fa-brands fa-github',      color: 'var(--off-white)', label: 'GitHub' },
                { k: 'instagram', icon: 'fa-brands fa-instagram',   color: '#E4405F', label: 'Instagram' },
                { k: 'facebook',  icon: 'fa-brands fa-facebook-f',  color: '#1877F2', label: 'Facebook' },
              ].map(s => (
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
          <div className="t-label" style={{ marginBottom: 14 }}>PROJECT TITLES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Current / capstone project — full detail */}
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
            {isAlumni && (m.projectsAll || []).filter(p => p.title !== m.project?.title).slice(0, 2).map((p, i) => (
              <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--off-white-15)', borderRadius: 2 }}>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
                  EARLIER PROJECT
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

// ========== CERTIFICATES & BADGES ==========
const TIER_ORDER = ['entry', 'builder', 'prime', 'elite', 'apex'];

function TierCard({ tierKey, tierData, earned, currentPts, isCurrentTier }) {
  const remaining = tierData.min != null ? Math.max(0, tierData.min - currentPts) : 0;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https://exoasia.hub&title=${encodeURIComponent(`I earned the ${tierData.label} tier on the Exoasia Exonaut Portal!`)}`;

  return (
    <div style={{
      padding: '20px 24px',
      border: `1px solid ${earned ? tierData.color + '60' : 'var(--off-white-15)'}`,
      borderRadius: 6,
      background: earned ? `${tierData.color}08` : 'transparent',
      display: 'flex', flexDirection: 'column', gap: 10,
      filter: earned ? 'none' : 'grayscale(1)',
      opacity: earned ? 1 : 0.6,
      position: 'relative',
      transition: 'all 0.2s',
    }}>
      {isCurrentTier && (
        <div style={{ position: 'absolute', top: 10, right: 12, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink)', letterSpacing: '0.12em', fontWeight: 700 }}>
          ◆ CURRENT
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 4, background: tierData.color + '20', border: `1.5px solid ${tierData.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-shield-halved" style={{ color: tierData.color, fontSize: 18 }} />
        </div>
        <div>
          <div className="t-mono" style={{ fontSize: 10, color: earned ? tierData.color : 'var(--off-white-40)', letterSpacing: '0.12em', fontWeight: 700 }}>{tierData.short}</div>
          <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0, margin: 0 }}>{tierData.label}</div>
        </div>
      </div>
      {earned ? (
        <div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginBottom: 8 }}>
            {tierData.min != null ? `UNLOCKED AT ${tierData.min} PTS` : 'ALUMNI ONLY'}
          </div>
          <a href={linkedInUrl} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#0A66C2', borderRadius: 3, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em' }}>
            <i className="fa-brands fa-linkedin" />SHARE ON LINKEDIN
          </a>
        </div>
      ) : (
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>
          {tierData.min != null ? `${remaining} PTS REMAINING TO UNLOCK` : 'AWARDED BY COMMANDER ONLY'}
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge, earned, currentPts, cohortName }) {
  const ptsNeeded = (() => {
    if (badge.code.startsWith('MIL-')) {
      const map = { 'MIL-BRZ': 100, 'MIL-SLV': 300, 'MIL-GLD': 600, 'MIL-PLT': 900 };
      return map[badge.code];
    }
    return null;
  })();
  const remaining = ptsNeeded != null ? Math.max(0, ptsNeeded - currentPts) : null;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https://exoasia.hub&title=${encodeURIComponent(`I earned the "${badge.name}" badge on the Exoasia Exonaut Portal!`)}`;
  const [showCert, setShowCert] = React.useState(false);

  return (
    <div style={{
      padding: '14px 16px',
      border: `1px solid ${earned ? badge.color + '50' : 'var(--off-white-15)'}`,
      borderRadius: 6,
      background: earned ? `${badge.color}06` : 'transparent',
      display: 'flex', alignItems: 'center', gap: 16,
      transition: 'all 0.2s',
    }}>
      {/* Badge SVG thumbnail */}
      <div style={{ width: 72, flexShrink: 0 }}>
        {window.BadgeSVG
          ? <window.BadgeSVG badge={badge} earned={earned}/>
          : <i className="fa-solid fa-medal" style={{ color: badge.color, fontSize: 22 }}/>}
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-mono" style={{ fontSize: 9, color: earned ? badge.color : 'var(--off-white-40)', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>
          {badge.category?.toUpperCase()}
        </div>
        <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0, margin: '0 0 4px 0', opacity: earned ? 1 : 0.55 }}>
          {badge.name}
        </div>
        <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>
          {earned
            ? (badge.date ? `Earned ${badge.date}` : badge.subtitle)
            : (remaining != null ? `${remaining} pts to go · ${badge.subtitle}` : badge.subtitle)}
        </div>
        {earned && (
          <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
            <button onClick={() => setShowCert(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px',
                       background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)',
                       borderRadius:3, color:'rgba(255,255,255,0.8)', fontFamily:'var(--font-mono)',
                       fontSize:9, fontWeight:700, cursor:'pointer', letterSpacing:'0.06em' }}>
              <i className="fa-solid fa-certificate"/>VIEW CERT
            </button>
            <a href={linkedInUrl} target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:5,
                       padding:'4px 10px', background:'#0A66C2', borderRadius:3,
                       color:'#fff', fontFamily:'var(--font-mono)', fontSize:9,
                       fontWeight:700, textDecoration:'none', letterSpacing:'0.06em' }}>
              <i className="fa-brands fa-linkedin"/>SHARE
            </a>
          </div>
        )}
      </div>

      {/* ── Full badge certificate modal ── */}
      {showCert && earned && (
        <div onClick={e => { if (e.target===e.currentTarget) setShowCert(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
                   display:'flex', alignItems:'center', justifyContent:'center',
                   zIndex:9999, padding:20 }}>
          <div style={{ width:'100%', maxWidth:760, position:'relative' }}>
            <button onClick={() => setShowCert(false)}
              style={{ position:'absolute', top:-36, right:0, background:'none', border:'none',
                       color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:22 }}>✕</button>
            {window.BadgeCertificate
              ? <window.BadgeCertificate badge={badge} name={typeof ME !== 'undefined' ? ME?.name : undefined}
                  cohortName={cohortName} issueDate={badge.date}/>
              : <div style={{ color:'#fff', padding:20 }}>Certificate component not loaded.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CertsBadgesPage() {
  const liveBadges   = window.useLiveBadges ? window.useLiveBadges() : BADGES;
  const { total: currentPts } = window.useComputedPoints ? window.useComputedPoints(ME_ID) : { total: 0 };
  const tierKey      = window.getTierFromPts ? window.getTierFromPts(currentPts) : 'entry';
  const [certView, setCertView] = React.useState(tierKey);

  // Pull the Exonaut's DB record so we get their Admin-assigned batch + persisted tier
  const allUsers  = window.useRegisteredUsers ? window.useRegisteredUsers() : [];
  const myRecord  = allUsers.find(u => u.userId === ME_ID);
  // Cohort: DB record first → cohort-store localStorage override → default
  const myCohortId   = myRecord?.cohortId
    || (window.getUserCohort ? window.getUserCohort(ME_ID) : null)
    || 'c2627';
  const allCohorts   = (typeof COHORTS !== 'undefined') ? COHORTS : [];
  const myCohort     = allCohorts.find(c => c.id === myCohortId) || allCohorts[0] || { code: COHORT.code, name: COHORT.name }; // which cert is shown full-size

  const badgeCategories = [
    { key: 'milestone', label: 'Milestone Badges', icon: 'fa-star',        desc: 'Earned by hitting point thresholds' },
    { key: 'track',     label: 'Track Badges',     icon: 'fa-route',       desc: 'Awarded for completing your track' },
    { key: 'pillar',    label: 'Pillar Badges',    icon: 'fa-layer-group', desc: 'Maxing out individual pillars' },
    { key: 'special',   label: 'Special Awards',   icon: 'fa-trophy',      desc: 'Rare achievements and program awards' },
  ];

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>YOUR ACHIEVEMENTS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Certs & Badges</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="t-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{currentPts} PTS</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>{TIERS[tierKey]?.short} TIER</div>
        </div>
      </div>

      {/* ── Tier Certifications ── */}
      <div className="section-head" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16 }}>Tier Certifications</h2>
        <span className="section-meta">5 TIERS · POINTS-BASED PROGRESSION</span>
      </div>

      {/* Tier selector pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TIER_ORDER.map(tk => {
          const td = TIERS[tk];
          const earned = td.min != null ? currentPts >= td.min : false;
          const isCurrent = tk === tierKey;
          return (
            <button key={tk} onClick={() => setCertView(tk)} style={{
              padding: '6px 14px', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em',
              background: certView === tk ? td.color + '20' : 'transparent',
              border: `1px solid ${certView === tk ? td.color : 'var(--off-white-15)'}`,
              color: certView === tk ? td.color : 'var(--off-white-40)',
              filter: earned ? 'none' : 'grayscale(0.7)',
              opacity: earned || certView === tk ? 1 : 0.6,
              transition: 'all 0.15s',
            }}>
              {td.short}{isCurrent ? ' ◆' : ''}
            </button>
          );
        })}
      </div>

      {/* Full cert display */}
      <div style={{ marginBottom: 40 }}>
        {(() => {
          const td = TIERS[certView];
          const earned = td.min != null ? currentPts >= td.min : false;
          return window.TierCertificate
            ? <TierCertificate
                tierKey={certView} tierData={td} earned={earned}
                name={ME.name}
                cohort={myCohort.code}
                cohortName={myCohort.name}
              />
            : <TierCard tierKey={certView} tierData={td} earned={earned} currentPts={currentPts} isCurrentTier={certView === tierKey} />;
        })()}
      </div>

      {/* Badge categories */}
      {badgeCategories.map(cat => {
        const catBadges = liveBadges.filter(b => b.category === cat.key);
        if (!catBadges.length) return null;
        const earnedCount = catBadges.filter(b => b.earned).length;
        return (
          <div key={cat.key} style={{ marginBottom: 32 }}>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16 }}><i className={'fa-solid ' + cat.icon} style={{ marginRight: 8, color: 'var(--ink)' }} />{cat.label}</h2>
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 2 }}>{cat.desc}</div>
              </div>
              <span className="section-meta">{earnedCount}/{catBadges.length} EARNED</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {catBadges.map(b => (
                <BadgeCard key={b.code} badge={b} earned={b.earned} currentPts={currentPts} cohortName={myCohort?.name} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Points Breakdown */}
      <div className="section-head" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16 }}>Points Ledger</h2>
        <span className="section-meta">ALL SOURCES</span>
      </div>
      <PointsLedger userId={ME_ID} />
    </div>
  );
}

function PointsLedger({ userId }) {
  const { total: liveTotal } = window.useComputedPoints ? window.useComputedPoints(userId) : { total: 0 };
  const events = window.__pointsStore ? window.__pointsStore.getAll(userId) : [];
  const [expanded, setExpanded] = React.useState({});

  // Group by source group prefix
  const groups = React.useMemo(() => {
    const g = {};
    events.forEach(e => {
      const grp = (e.source || '').split('.')[0] || 'other';
      if (!g[grp]) g[grp] = { total: 0, items: [] };
      g[grp].total += Number(e.pts) || 0;
      g[grp].items.push(e);
    });
    return g;
  }, [events]);

  const groupMeta = {
    onboarding: { label: 'Onboarding', icon: 'fa-flag-checkered' },
    mission:    { label: 'Missions',   icon: 'fa-bullseye' },
    client:     { label: 'Client',     icon: 'fa-handshake' },
    recruit:    { label: 'Recruitment',icon: 'fa-user-plus' },
    ritual:     { label: 'Rituals',    icon: 'fa-calendar-check' },
    culture:    { label: 'Culture',    icon: 'fa-hand-sparkles' },
    milestone:  { label: 'Milestones', icon: 'fa-trophy' },
    other:      { label: 'Other',      icon: 'fa-circle-dot' },
  };

  if (events.length === 0) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: 40 }}>
        <i className="fa-solid fa-bolt" style={{ fontSize: 24, color: 'var(--off-white-40)', marginBottom: 12 }} />
        <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No points logged yet. Give kudos, complete rituals, and submit missions to earn points.</div>
      </div>
    );
  }

  return (
    <div className="card-panel" style={{ padding: 0 }}>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--off-white-07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>{events.length} EVENTS · RUNNING TOTAL</div>
        <div className="t-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>+{liveTotal} PTS</div>
      </div>
      {Object.entries(groups).map(([grp, { total, items }]) => {
        const meta = groupMeta[grp] || groupMeta.other;
        const open = !!expanded[grp];
        return (
          <div key={grp} style={{ borderBottom: '1px solid var(--off-white-07)' }}>
            <div onClick={() => setExpanded(e => ({ ...e, [grp]: !e[grp] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', cursor: 'pointer', userSelect: 'none' }}>
              <i className={'fa-solid ' + meta.icon} style={{ color: 'var(--off-white-40)', width: 16, textAlign: 'center' }} />
              <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0, flex: 1 }}>{meta.label}</div>
              <div className="t-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>+{total}</div>
              <i className={'fa-solid ' + (open ? 'fa-chevron-up' : 'fa-chevron-down')} style={{ color: 'var(--off-white-40)', fontSize: 11 }} />
            </div>
            {open && (
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0 22px 12px 50px' }}>
                {items.sort((a, b) => b.ts - a.ts).map((e, i) => (
                  <div key={e.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--off-white-07)' : 'none' }}>
                    <div>
                      <div className="t-body" style={{ fontSize: 12 }}>{e.note}</div>
                      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 2 }}>
                        WK {e.weekNum} · {new Date(e.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="t-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>+{e.pts}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Expose mission store globally so roles.jsx ProgramManagement can access it
window.__missionStore = __missionStore;

Object.assign(window, { MissionsList, KudosFeed, RitualsPage, AnnouncementsPage, NotificationsPage, AdminPanel, AlumniPage, SettingsPage, CommunityPage, CertsBadgesPage });
