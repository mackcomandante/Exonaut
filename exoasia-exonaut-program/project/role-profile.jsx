// Shared Supabase-backed profile for Lead / Commander / Admin roles.

function roleProfileMeta(profile) {
  const track = TRACKS.find(t => t.code === profile.trackCode) || TRACKS[0];
  if (profile.role === 'lead') {
    return {
      roleLabel: 'MANAGER · ' + track.short,
      title: 'Mission Lead · ' + track.name,
      accent: 'platinum',
    };
  }
  if (profile.role === 'commander') {
    return {
      roleLabel: 'MISSION COMMANDER',
      title: 'Mission Commander',
      accent: 'amber',
    };
  }
  if (profile.role === 'admin') {
    return {
      roleLabel: 'PLATFORM ADMIN',
      title: 'Platform Administrator',
      accent: 'sky',
    };
  }
  return {
    roleLabel: 'EXONAUT',
    title: 'Exonaut',
    accent: 'lime',
  };
}

function RoleProfile({ roleKey }) {
  const { profile, save } = useCurrentUserProfile();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({
    fullName: profile.fullName || '',
    bio: profile.bio || '',
    linkedinUrl: profile.linkedinUrl || '',
    school: profile.school || '',
    expertise: profile.expertise || '',
    avatarUrl: profile.avatarUrl || '',
    avatarFile: null,
    avatarPreview: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const meta = roleProfileMeta(profile);
  const accentVar = 'var(--' + meta.accent + ')';
  const activeCohort = window.getActiveCohort?.(profile);

  React.useEffect(() => {
    if (!editing) {
      setDraft({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        linkedinUrl: profile.linkedinUrl || '',
        school: profile.school || '',
        expertise: profile.expertise || '',
        avatarUrl: profile.avatarUrl || '',
        avatarFile: null,
        avatarPreview: '',
      });
    }
  }, [profile, editing]);

  async function saveProfile() {
    const fullName = draft.fullName.trim();
    if (!fullName) {
      setError('Name cannot be blank.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const avatarUrl = draft.avatarFile
        ? await uploadProfileAvatar(draft.avatarFile)
        : draft.avatarUrl.trim();
      await save({
        fullName,
        bio: draft.bio.trim(),
        linkedinUrl: draft.linkedinUrl.trim(),
        school: draft.school.trim(),
        expertise: draft.expertise.trim(),
        avatarUrl,
      });
      setEditing(false);
    } catch (err) {
      setError((err && err.message) || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile.fullName || 'Signed-in User';

  return (
    <div className="enter">
      <div className="profile-hero">
        <div>
          <AvatarWithRing name={displayName} avatarUrl={profile.avatarUrl} size={140} tier="corps" />
        </div>
        <div>
          <div className="t-label" style={{ marginBottom: 10, color: accentVar }}>{meta.roleLabel}</div>
          <h1 className="profile-name">{displayName}</h1>
          <div className="profile-meta-row">
            <span><span className="meta-k">ROLE</span>{meta.title}</span>
            <span><span className="meta-k">EMAIL</span>{profile.email || '—'}</span>
            {profile.role === 'lead' && <span><span className="meta-k">TRACK</span>{profile.trackCode || '—'}</span>}
            <span><span className="meta-k">COHORT</span>{activeCohort?.name || profile.cohortId || '—'}</span>
            {profile.school && <span><span className="meta-k">SCHOOL</span>{profile.school}</span>}
            {profile.expertise && <span><span className="meta-k">EXPERTISE</span>{profile.expertise}</span>}
          </div>
          <div className="profile-bio">
            {profile.bio || 'No bio yet.'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {profile.linkedinUrl && (
            <button className="btn btn-ghost btn-sm" onClick={() => window.open(profile.linkedinUrl, '_blank', 'noopener,noreferrer')}>
              <i className="fa-brands fa-linkedin" /> LINKEDIN
            </button>
          )}
          {!editing && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              <i className="fa-solid fa-pen" /> EDIT PROFILE
            </button>
          )}
          {editing && (
            <>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                <i className="fa-solid fa-check" /> {saving ? 'SAVING...' : 'SAVE'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={saving}>
                <i className="fa-solid fa-xmark" /> CANCEL
              </button>
            </>
          )}
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginTop: 8 }}>
            ROLE · {(profile.role || roleKey || 'user').toUpperCase()}
          </div>
        </div>
      </div>

      {editing && (
        <div className="card-panel" style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'block' }}>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>
              FULL NAME
            </div>
            <input
              className="input"
              value={draft.fullName}
              onChange={(e) => setDraft(d => ({ ...d, fullName: e.target.value }))}
              placeholder="Your full name"
            />
          </label>
          <label style={{ display: 'block' }}>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>BIO</div>
            <textarea className="textarea" rows={4} value={draft.bio} onChange={(e) => setDraft(d => ({ ...d, bio: e.target.value }))} />
          </label>
          <label style={{ display: 'block' }}>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>LINKEDIN URL</div>
            <input className="input" value={draft.linkedinUrl} onChange={(e) => setDraft(d => ({ ...d, linkedinUrl: e.target.value }))} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'block' }}>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>SCHOOL</div>
              <input className="input" value={draft.school} onChange={(e) => setDraft(d => ({ ...d, school: e.target.value }))} />
            </label>
            <label style={{ display: 'block' }}>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>EXPERTISE</div>
              <input className="input" value={draft.expertise} onChange={(e) => setDraft(d => ({ ...d, expertise: e.target.value }))} />
            </label>
          </div>
          <label style={{ display: 'block' }}>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>PROFILE PHOTO</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AvatarWithRing name={draft.fullName || displayName} avatarUrl={draft.avatarPreview || draft.avatarUrl} size={58} tier="corps" />
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setDraft(d => ({
                    ...d,
                    avatarFile: file,
                    avatarPreview: file ? URL.createObjectURL(file) : '',
                  }));
                }}
              />
            </div>
            {draft.avatarUrl && !draft.avatarFile && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setDraft(d => ({ ...d, avatarUrl: '', avatarFile: null, avatarPreview: '' }))}>
                Remove current photo
              </button>
            )}
          </label>
          {error && <div className="t-body" style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}

function useRoleProfile() {
  return useCurrentUserProfile().profile;
}

Object.assign(window, { RoleProfile, useRoleProfile });
