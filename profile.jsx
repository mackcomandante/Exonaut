// Profile screen — public view + badges gallery + mission history

function Profile({ onOpenMission, onTriggerBadge }) {
  const [tab, setTab] = React.useState('overview');
  const [editing, setEditing]       = React.useState(false);
  const [saving,  setSaving]        = React.useState(false);
  const [editErr, setEditErr]       = React.useState('');

  const storedName      = localStorage.getItem('exo:userName')        || ME.name;
  const storedBio       = localStorage.getItem('exo:bio:'      + ME_ID) || '';
  const storedLinkedin  = localStorage.getItem('exo:linkedin:' + ME_ID) || '';
  const storedSchool    = localStorage.getItem('exo:school:'   + ME_ID) || '';
  const storedExpertise = localStorage.getItem('exo:expertise:'+ ME_ID) || '';
  const storedAvatar    = localStorage.getItem('exo:avatar:'   + ME_ID) || null;

  const [displayName,      setDisplayName]      = React.useState(storedName);
  const [displayBio,       setDisplayBio]       = React.useState(storedBio);
  const [displayLI,        setDisplayLI]        = React.useState(storedLinkedin);
  const [displaySchool,    setDisplaySchool]    = React.useState(storedSchool);
  const [displayExpertise, setDisplayExpertise] = React.useState(storedExpertise);
  const [displayAvatar,    setDisplayAvatar]    = React.useState(storedAvatar);

  const avatarFileRef = React.useRef(null);

  function splitName(full) {
    const parts = (full || '').trim().split(' ');
    return { first: parts[0] || '', last: parts.slice(1).join(' ') };
  }

  const [editFirst,     setEditFirst]     = React.useState(() => splitName(storedName).first);
  const [editLast,      setEditLast]      = React.useState(() => splitName(storedName).last);
  const [editBio,       setEditBio]       = React.useState(storedBio);
  const [editLI,        setEditLI]        = React.useState(storedLinkedin);
  const [editSchool,    setEditSchool]    = React.useState(storedSchool);
  const [editExpertise, setEditExpertise] = React.useState(storedExpertise);
  const [editAvatar,    setEditAvatar]    = React.useState(storedAvatar);

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setEditAvatar(ev.target.result);
    reader.readAsDataURL(file);
  }

  function openEdit() {
    const { first, last } = splitName(displayName);
    setEditFirst(first);
    setEditLast(last);
    setEditBio(displayBio);
    setEditLI(displayLI);
    setEditSchool(displaySchool);
    setEditExpertise(displayExpertise);
    setEditAvatar(displayAvatar);
    setEditErr('');
    setEditing(true);
  }

  async function saveEdit() {
    const fullName = (editFirst.trim() + ' ' + editLast.trim()).trim();
    if (!fullName) { setEditErr('Name cannot be blank.'); return; }
    setSaving(true);
    setEditErr('');
    try {
      const { error } = await window.__db
        .from('registered_users')
        .update({ name: fullName })
        .eq('user_id', ME_ID);
      if (error) throw error;
      localStorage.setItem('exo:userName',           fullName);
      ME.name = fullName;
      localStorage.setItem('exo:bio:'       + ME_ID, editBio.trim());
      localStorage.setItem('exo:linkedin:'  + ME_ID, editLI.trim());
      localStorage.setItem('exo:school:'    + ME_ID, editSchool.trim());
      localStorage.setItem('exo:expertise:' + ME_ID, editExpertise.trim());
      if (editAvatar) localStorage.setItem('exo:avatar:' + ME_ID, editAvatar);

      // Award +30 pts once when all 5 profile fields are filled
      const profileFull = fullName &&
        editBio.trim() &&
        editLI.trim() &&
        editSchool.trim() &&
        editExpertise.trim() &&
        (editAvatar || localStorage.getItem('exo:avatar:' + ME_ID));
      if (profileFull && window.__pointsStore && !window.__pointsStore.hasSource(ME_ID, 'profile.complete')) {
        window.__pointsStore.add(ME_ID, { source: 'profile.complete', note: 'Profile fully completed' });
      }

      setDisplayName(fullName);
      setDisplayBio(editBio.trim());
      setDisplayLI(editLI.trim());
      setDisplaySchool(editSchool.trim());
      setDisplayExpertise(editExpertise.trim());
      if (editAvatar) setDisplayAvatar(editAvatar);
      setEditing(false);
    } catch (err) {
      setEditErr(err?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const { total: livePoints, delta: liveDelta } = useComputedPoints(ME_ID);
  const liveBadges = useLiveBadges();
  const earnedBadges = liveBadges.filter(b => b.earned);

  const byCategory = (cat) => liveBadges.filter(b => b.category === cat);

  const approvedMissions = MISSIONS.filter(m => m.status === 'approved');

  return (
    <div className="enter">
      {/* EDIT MODAL */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}>
          <div className="card" style={{ width: 520, maxWidth: '94vw', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>Edit Profile</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕</button>
            </div>

            {/* Avatar upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              {editAvatar
                ? <img src={editAvatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--lime)' }} />
                : <AvatarWithRing name={displayName} size={64} tier={ME.tier || 'entry'} />
              }
              <div>
                <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <button className="btn btn-ghost btn-sm" onClick={() => avatarFileRef.current.click()}>
                  <i className="fa-solid fa-camera" /> {editAvatar ? 'CHANGE PHOTO' : 'UPLOAD PHOTO'}
                </button>
                <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 4, letterSpacing: '0.06em' }}>JPG, PNG · SHOWN ON PROFILE</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 4 }}>FIRST NAME</label>
                <input className="field" value={editFirst} onChange={e => setEditFirst(e.target.value)}
                  placeholder="First" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 4 }}>LAST NAME</label>
                <input className="field" value={editLast} onChange={e => setEditLast(e.target.value)}
                  placeholder="Last" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>

            <label className="t-label-muted" style={{ display: 'block', marginBottom: 4 }}>Bio / Quote</label>
            <textarea className="field" rows={3} value={editBio} onChange={e => setEditBio(e.target.value)}
              style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box', resize: 'vertical' }} />

            <label className="t-label-muted" style={{ display: 'block', marginBottom: 4 }}>School</label>
            <input className="field" value={editSchool} onChange={e => setEditSchool(e.target.value)}
              style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }} />

            <label className="t-label-muted" style={{ display: 'block', marginBottom: 4 }}>Expertise · e.g. AI Strategy, Product, Fintech</label>
            <input className="field" value={editExpertise} onChange={e => setEditExpertise(e.target.value)}
              placeholder="Your top skills or focus areas"
              style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }} />

            <label className="t-label-muted" style={{ display: 'block', marginBottom: 4 }}>LinkedIn URL</label>
            <input className="field" type="url" placeholder="https://linkedin.com/in/yourname"
              value={editLI} onChange={e => setEditLI(e.target.value)}
              style={{ width: '100%', marginBottom: 24, boxSizing: 'border-box' }} />

            {editErr && <div style={{ color: 'var(--red, #ff4d4d)', fontSize: 13, marginBottom: 16 }}>{editErr}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={saving}>CANCEL</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'SAVING…' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <div className="profile-hero">
        <div>
          {displayAvatar
            ? <img src={displayAvatar} alt={displayName} style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--lime)' }} />
            : <AvatarWithRing name={displayName} size={140} tier={ME.tier} />
          }
        </div>
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>EXONAUT · {TIERS[ME.tier] ? TIERS[ME.tier].short : 'ENTRY'}</div>
          <h1 className="profile-name">{displayName}</h1>
          <div className="profile-meta-row">
            {ME.track && <span><span className="meta-k">TRACK</span>{TRACKS.find(t => t.code === ME.track)?.short || ME.track}</span>}
            {displaySchool && <span><span className="meta-k">SCHOOL</span>{displaySchool}</span>}
            <span><span className="meta-k">COHORT</span>{COHORT.name}</span>
          </div>
          {displayExpertise && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 4 }}>
              {displayExpertise.split(',').map(e => e.trim()).filter(Boolean).map(e => (
                <span key={e} className="t-mono" style={{ fontSize: 10, padding: '3px 8px', border: '1px solid var(--off-white-15)', borderRadius: 2, color: 'var(--ink)', letterSpacing: '0.06em' }}>
                  {e.toUpperCase()}
                </span>
              ))}
            </div>
          )}
          {displayBio && <div className="profile-bio">{displayBio}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {displayLI
            ? <a href={displayLI} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <i className="fa-brands fa-linkedin" /> LINKEDIN
              </a>
            : <button className="btn btn-primary" onClick={openEdit}>
                <i className="fa-brands fa-linkedin" /> LINKEDIN
              </button>
          }
          <button className="btn btn-ghost btn-sm" onClick={openEdit}>
            <i className="fa-solid fa-pen" /> EDIT
          </button>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginTop: 8 }}>
            EXO-ID · {ME_ID ? ME_ID.toUpperCase().slice(0, 8) : 'PENDING'}
          </div>
        </div>
      </div>

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
              { k: 'Project', v: ME.p1, max: 400, color: 'var(--ink)', label: 'P1 · 40%' },
              { k: 'Client',  v: ME.p2, max: 350, color: 'var(--platinum)', label: 'P2 · 35%' },
              { k: 'Recruitment', v: ME.p3, max: 250, color: 'var(--lavender)', label: 'P3 · 25%' },
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
            {MISSIONS.map(m => (
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
