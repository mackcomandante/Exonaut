// Profile screen — public view + badges gallery + mission history

function Profile({ onOpenMission, onTriggerBadge }) {
  const [tab, setTab] = React.useState('overview');
  const { profile, save } = useCurrentUserProfile();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({
    fullName: '',
    bio: '',
    linkedinUrl: '',
    school: '',
    expertise: '',
    avatarUrl: '',
  });
  const [saveError, setSaveError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const displayName = profile.fullName || ME.name;
  const track = TRACKS.find(t => t.code === (profile.trackCode || ME.track)) || TRACKS[0];
  const cohort = COHORTS.find(c => c.id === (profile.cohortId || ME.cohort)) || COHORT;
  const tier = ME.tier || 'entry';
  const missions = useMissions();

  const { total: livePoints, delta: liveDelta } = useComputedPoints(profile.id);
  const { breakdown } = useUserPoints(profile.id);
  const liveBadges = useLiveBadges(profile.id);
  const earnedBadges = liveBadges.filter(b => b.earned);
  const subs = useSubs();

  const byCategory = (cat) => liveBadges.filter(b => b.category === cat);

  const approvedSubs = subs.filter(s => s.exonautId === profile.id && s.state === 'approved');
  const approvedMissions = approvedSubs.map(s => ({ ...(missions.find(m => m.id === s.missionId) || {}), ...s, id: s.missionId, title: s.missionTitle }));

  function openEdit() {
    setDraft({
      fullName: displayName,
      bio: profile.bio || '',
      linkedinUrl: profile.linkedinUrl || '',
      school: profile.school || '',
      expertise: profile.expertise || '',
      avatarUrl: profile.avatarUrl || '',
    });
    setSaveError('');
    setEditing(true);
  }

  async function saveEdit() {
    const fullName = draft.fullName.trim();
    if (!fullName) {
      setSaveError('Name cannot be blank.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await save({
        fullName,
        bio: draft.bio.trim(),
        linkedinUrl: draft.linkedinUrl.trim(),
        school: draft.school.trim(),
        expertise: draft.expertise.trim(),
        avatarUrl: draft.avatarUrl.trim(),
      });
      setEditing(false);
    } catch (err) {
      setSaveError((err && err.message) || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="enter">
      {/* HERO */}
      <div className="profile-hero">
        <div>
          <AvatarWithRing name={displayName} avatarUrl={profile.avatarUrl} size={140} tier={tier} />
        </div>
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>EXONAUT · #14 / 30 · {TIERS[ME.tier].short}</div>
          <h1 className="profile-name">{displayName}</h1>
          <div className="profile-meta-row">
            <span><span className="meta-k">TRACK</span>{track.name}</span>
            <span><span className="meta-k">COHORT</span>{cohort.name}</span>
            {profile.school && <span><span className="meta-k">SCHOOL</span>{profile.school}</span>}
            {profile.expertise && <span><span className="meta-k">EXPERTISE</span>{profile.expertise}</span>}
          </div>
          <div className="profile-bio">
            {profile.bio || 'No bio yet.'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <button className="btn btn-primary" disabled={!profile.linkedinUrl} onClick={() => profile.linkedinUrl && window.open(profile.linkedinUrl, '_blank', 'noopener,noreferrer')}>
            <i className="fa-brands fa-linkedin" /> LINKEDIN
          </button>
          <button className="btn btn-ghost btn-sm" onClick={openEdit}>
            <i className="fa-solid fa-pen" /> EDIT
          </button>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginTop: 8 }}>
            EXO-ID · {ME_ID.toUpperCase().slice(0, 8)}
          </div>
        </div>
      </div>

      {editing && (
        <div className="card-panel" style={{ maxWidth: 620, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>FULL NAME</div>
            <input className="input" value={draft.fullName} onChange={(e) => setDraft(d => ({ ...d, fullName: e.target.value }))} />
          </label>
          <label>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>BIO</div>
            <textarea className="textarea" rows={4} value={draft.bio} onChange={(e) => setDraft(d => ({ ...d, bio: e.target.value }))} />
          </label>
          <label>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>LINKEDIN URL</div>
            <input className="input" value={draft.linkedinUrl} onChange={(e) => setDraft(d => ({ ...d, linkedinUrl: e.target.value }))} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>SCHOOL</div>
              <input className="input" value={draft.school} onChange={(e) => setDraft(d => ({ ...d, school: e.target.value }))} />
            </label>
            <label>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>EXPERTISE</div>
              <input className="input" value={draft.expertise} onChange={(e) => setDraft(d => ({ ...d, expertise: e.target.value }))} />
            </label>
          </div>
          <label>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>AVATAR URL</div>
            <input className="input" value={draft.avatarUrl} onChange={(e) => setDraft(d => ({ ...d, avatarUrl: e.target.value }))} />
          </label>
          {saveError && <div className="t-body" style={{ color: 'var(--red)', fontSize: 12 }}>{saveError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              <i className="fa-solid fa-check" /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={saving}>
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* STATS STRIP */}
      <div className="profile-stats-strip">
        <div className="profile-stat">
          <div className="k">
            Total Points
            <span className="auto-chip" title="Total is computed automatically from every approved submission + ritual. Updates the moment your Lead grades.">
              <i className="fa-solid fa-bolt" /> AUTO
            </span>
          </div>
          <div className="v lime">
            {livePoints}
            {liveDelta > 0 && (
              <span className="auto-delta" title={`+${liveDelta} pts from newly-graded submissions`}>
                +{liveDelta}
              </span>
            )}
          </div>
        </div>
        <div className="profile-stat">
          <div className="k">Rank in Cohort</div>
          <div className="v">#{ME_RANK}<span style={{ color: 'var(--off-white-40)', fontSize: 14, marginLeft: 4 }}>/ 30</span></div>
        </div>
        <div className="profile-stat">
          <div className="k">
            Badges Earned
            <span className="auto-chip" title="Milestone badges are issued automatically when you cross the points threshold — 100, 300, 600, 900."><i className="fa-solid fa-bolt" /> AUTO</span>
          </div>
          <div className="v">{earnedBadges.length}<span style={{ color: 'var(--off-white-40)', fontSize: 14, marginLeft: 4 }}>/ 22</span></div>
        </div>
        <div className="profile-stat">
          <div className="k">Missions Approved</div>
          <div className="v">{approvedMissions.length}<span style={{ color: 'var(--off-white-40)', fontSize: 14, marginLeft: 4 }}>/ 7</span></div>
        </div>
        <div className="profile-stat">
          <div className="k">Recruits Placed</div>
          <div className="v">0<span style={{ color: 'var(--off-white-40)', fontSize: 14, marginLeft: 4 }}>/ 3</span></div>
        </div>
      </div>

      {/* TABS */}
      <div className="leaderboard-tabs">
        <div className={'lb-tab' + (tab === 'overview' ? ' active' : '')} onClick={() => setTab('overview')}>Overview</div>
        <div className={'lb-tab' + (tab === 'badges' ? ' active' : '')} onClick={() => setTab('badges')}>
          Badges <span style={{ opacity: 0.5, marginLeft: 6 }}>{earnedBadges.length}/22</span>
        </div>
        <div className={'lb-tab' + (tab === 'missions' ? ' active' : '')} onClick={() => setTab('missions')}>Mission History</div>
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }}>
          {/* Pillar breakdown */}
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>Pillar Breakdown</h2>
              <span className="section-meta">WEIGHTED · PROGRAM TO DATE</span>
            </div>
            {[
              { k: 'Project', v: breakdown.project || 0, max: 400, color: 'var(--ink)', label: 'P1 · 40%' },
              { k: 'Client',  v: breakdown.client || 0, max: 350, color: 'var(--platinum)', label: 'P2 · 35%' },
              { k: 'Recruitment', v: breakdown.recruitment || 0, max: 250, color: 'var(--lavender)', label: 'P3 · 25%' },
            ].map(p => (
              <div key={p.k} className="card-flat" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="t-heading" style={{ fontSize: 14 }}>{p.k}</span>
                  <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>{p.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span className="t-mono" style={{ fontSize: 22, color: p.color, fontWeight: 700 }}>{p.v}</span>
                  <span className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)' }}>/ {p.max} PTS</span>
                </div>
                <div style={{ height: 4, background: 'var(--off-white-07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: p.color, width: `${(p.v / p.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {/* Recent Missions */}
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>Recent Approvals</h2>
              <span className="section-meta">LAST 3</span>
            </div>
            {approvedMissions.slice(0, 3).map(m => (
              <div key={m.id} className="card-flat" style={{ marginBottom: 10, cursor: 'pointer' }}
                onClick={() => onOpenMission(m.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{m.id}</span>
                  <span className="status-pill status-approved">{(m.grade || 'APPROVED').toUpperCase()}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--off-white)' }}>
                  {m.title}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink)', marginTop: 6, letterSpacing: '0.05em' }}>
                  +{m.pointsAwarded} PTS · {m.dueDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'badges' && (
        <div>
          {['milestone','track','pillar','special'].map(cat => {
            const badges = byCategory(cat);
            const earned = badges.filter(b => b.earned).length;
            const labels = { milestone: 'Milestone Tiers', track: 'Track Completion', pillar: 'Pillar Badges', special: 'Special Awards' };
            return (
              <div key={cat}>
                <div className="badge-section-head">
                  <h3>{labels[cat]}</h3>
                  <span className="sub">{earned} / {badges.length} EARNED</span>
                </div>
                <div className="badge-grid">
                  {badges.map(b => (
                    <div key={b.code} className={'badge' + (!b.earned ? ' locked' : '')}
                         onClick={() => b.earned && onTriggerBadge?.(b)}>
                      <div className="badge-medallion"><BadgeMedallion badge={b} size={60} /></div>
                      <div className="badge-name">{b.name}</div>
                      {b.earned
                        ? <div className="badge-date">{b.date}</div>
                        : <div className="badge-locked-label"><i className="fa-solid fa-lock" style={{ fontSize: 8, marginRight: 4 }} />LOCKED</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'missions' && (
        <div>
          <div className="section-head">
            <h2 style={{ fontSize: 16 }}>Mission History · Chronological</h2>
            <span className="section-meta">{approvedMissions.length} COMPLETED</span>
          </div>
          <div>
            {missions.map(m => (
              <div key={m.id} className="mission-row" onClick={() => onOpenMission(m.id)}>
                <div className="mission-meta">
                  <div className="mission-id">{m.id}</div>
                  <div className="mission-title">{m.title}</div>
                  <div className="mission-sub">
                    {(m.track ? TRACKS.find(t => t.code === m.track)?.short : 'ALL-COHORT')} · DUE {m.dueDate}
                  </div>
                </div>
                <div className="mission-points">
                  {m.pointsAwarded ? <><span className="plus">+</span>{m.pointsAwarded}</> : <><span className="plus">+</span>{m.points}</>}
                </div>
                <span className={'status-pill status-' + (m.status === 'approved' ? 'approved' : m.status === 'in-progress' ? 'in-progress' : 'not-started')}>
                  {m.status === 'approved' ? (m.grade || 'APPR').toUpperCase() : m.status.replace('-', ' ').toUpperCase()}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOpenMission(m.id); }}>
                  VIEW
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Profile });
