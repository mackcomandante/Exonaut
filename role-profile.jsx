// Shared editable profile for Lead / Commander / Admin roles
// Persists to localStorage under 'exo:roleprofile:<roleKey>'
// Exposes RoleProfile({ roleKey }) + useRoleProfile(roleKey) hook

const ROLE_PROFILE_DEFAULTS = {
  lead: {
    name: 'Dr. Nadia Oyelaran',
    title: 'Mission Lead · AI Strategy & Advisory',
    bio: 'Helps Exonauts ship credible AI strategy work to real clients. Former McKinsey Digital, ex-AWS AI/ML. Based in Lagos.',
    email: 'nadia.oyelaran@exoasia.co',
    phone: '+234 802 555 0143',
    location: 'Lagos · Singapore',
    expertise: 'AI Strategy · Enterprise Advisory · Change Management',
    roleLabel: 'MANAGER · AI-STRAT',
    roleColor: 'platinum',
    linkedin: 'nadia-oyelaran',
    twitter: 'nadiao_ai',
    github: '',
    website: 'oyelaran.ai',
  },
  commander: {
    name: 'Mack Comandante',
    title: 'Mission Commander',
    bio: 'Builds the program, sets the standard, keeps the bar high. 20+ years in venture + advisory across SEA and MENA.',
    email: 'mack@exoasia.co',
    phone: '+65 8122 0077',
    location: 'Singapore',
    expertise: 'Program Leadership · Venture Strategy · Partnerships',
    roleLabel: 'MISSION COMMANDER',
    roleColor: 'amber',
    linkedin: 'mackcomandante',
    twitter: 'mack_exoasia',
    github: '',
    website: 'exoasia.co',
  },
  admin: {
    name: 'Ops Admin',
    title: 'Platform Administrator',
    bio: 'Keeps the platform humming. Manages cohorts, roles, assignments, and the guardrails that keep the program fair and traceable.',
    email: 'ops@exoasia.co',
    phone: '+65 8122 0088',
    location: 'Singapore',
    expertise: 'Platform Operations · Access Control · Data Governance',
    roleLabel: 'PLATFORM ADMIN',
    roleColor: 'sky',
    linkedin: '',
    twitter: '',
    github: 'exoasia-platform',
    website: 'exoasia.co',
  },
};

function loadRoleProfile(roleKey) {
  try {
    const raw = localStorage.getItem('exo:roleprofile:' + roleKey);
    if (raw) return { ...ROLE_PROFILE_DEFAULTS[roleKey], ...JSON.parse(raw) };
  } catch (e) {}
  return { ...ROLE_PROFILE_DEFAULTS[roleKey] };
}

function saveRoleProfile(roleKey, data) {
  try { localStorage.setItem('exo:roleprofile:' + roleKey, JSON.stringify(data)); } catch (e) {}
  window.dispatchEvent(new CustomEvent('exo:roleprofile-change', { detail: { roleKey } }));
}

function useRoleProfile(roleKey) {
  const [data, setData] = React.useState(() => loadRoleProfile(roleKey));
  React.useEffect(() => {
    const h = (e) => { if (e.detail?.roleKey === roleKey) setData(loadRoleProfile(roleKey)); };
    window.addEventListener('exo:roleprofile-change', h);
    return () => window.removeEventListener('exo:roleprofile-change', h);
  }, [roleKey]);
  return data;
}

function Field({ label, value, onChange, placeholder, multiline }) {
  const common = {
    width: '100%', background: 'var(--off-white-07)',
    border: '1px solid var(--off-white-15)', borderRadius: 2,
    padding: '10px 12px', color: 'var(--off-white)',
    fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
    transition: 'border-color 0.12s',
  };
  return (
    <label style={{ display: 'block' }}>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>
        {label}
      </div>
      {multiline ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          rows={4} style={{ ...common, resize: 'vertical', fontFamily: 'var(--font-body)' }}
          onFocus={(e) => e.target.style.borderColor = 'var(--lime)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--off-white-15)'} />
      ) : (
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={common}
          onFocus={(e) => e.target.style.borderColor = 'var(--lime)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--off-white-15)'} />
      )}
    </label>
  );
}

function RoleProfile({ roleKey }) {
  const current = useRoleProfile(roleKey);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(current);
  const accentVar = 'var(--' + (current.roleColor || 'lime') + ')';
  const avatarInputRef = React.useRef(null);

  React.useEffect(() => { if (!editing) setDraft(current); }, [current, editing]);
  function patch(k, v) { setDraft(d => ({ ...d, [k]: v })); }
  function save() { saveRoleProfile(roleKey, draft); setEditing(false); }
  function cancel() { setDraft(current); setEditing(false); }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => patch('avatar', ev.target.result);
    reader.readAsDataURL(file);
  }

  const displayAvatar = editing ? draft.avatar : current.avatar;

  return (
    <div className="enter">
      {/* HERO */}
      <div className="profile-hero">
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
          {displayAvatar
            ? <img src={displayAvatar} alt={current.name}
                style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '3px solid ' + accentVar }} />
            : <AvatarWithRing name={current.name} size={140} tier="corps" />
          }
          {editing && (
            <>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <button onClick={() => avatarInputRef.current.click()} style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 32, height: 32, borderRadius: '50%',
                background: accentVar, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                <i className="fa-solid fa-camera" style={{ fontSize: 13, color: 'var(--deep-black)' }} />
              </button>
            </>
          )}
        </div>
        <div>
          <div className="t-label" style={{ marginBottom: 10, color: accentVar }}>{current.roleLabel}</div>
          <h1 className="profile-name">{current.name}</h1>
          <div className="profile-meta-row">
            <span><span className="meta-k">ROLE</span>{current.title}</span>
            <span><span className="meta-k">LOCATION</span>{current.location}</span>
          </div>
          <div className="profile-bio">"{current.bio}"</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {!editing && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              <i className="fa-solid fa-pen" /> EDIT PROFILE
            </button>
          )}
          {editing && (
            <>
              <button className="btn btn-primary" onClick={save}>
                <i className="fa-solid fa-check" /> SAVE
              </button>
              <button className="btn btn-ghost btn-sm" onClick={cancel}>
                <i className="fa-solid fa-xmark" /> CANCEL
              </button>
            </>
          )}
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginTop: 8 }}>
            ROLE · {roleKey.toUpperCase()}
          </div>
        </div>
      </div>

      {!editing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>About</h2>
              <span className="section-meta">PROFILE</span>
            </div>
            <div className="card-flat" style={{ marginBottom: 14 }}>
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>EXPERTISE</div>
              <div style={{ fontSize: 13, color: 'var(--off-white)' }}>{current.expertise}</div>
            </div>
            <div className="card-flat">
              <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>BIO</div>
              <div style={{ fontSize: 13, color: 'var(--off-white-68)', lineHeight: 1.5 }}>{current.bio}</div>
            </div>
          </div>
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>Contact</h2>
              <span className="section-meta">REACH ME</span>
            </div>
            {[
              { k: 'EMAIL', v: current.email, icon: 'fa-envelope' },
              { k: 'PHONE', v: current.phone, icon: 'fa-phone' },
              { k: 'LINKEDIN', v: current.linkedin, icon: 'fa-brands fa-linkedin' },
              { k: 'TWITTER', v: current.twitter ? '@' + current.twitter : '', icon: 'fa-brands fa-x-twitter' },
              { k: 'GITHUB', v: current.github, icon: 'fa-brands fa-github' },
              { k: 'WEBSITE', v: current.website, icon: 'fa-globe' },
            ].filter(r => r.v).map(r => (
              <div key={r.k} className="card-flat" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className={r.icon.includes(' ') ? r.icon : 'fa-solid ' + r.icon} style={{ width: 18, color: accentVar, fontSize: 14 }} />
                <div style={{ flex: 1 }}>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', fontWeight: 700 }}>{r.k}</div>
                  <div style={{ fontSize: 13, color: 'var(--off-white)' }}>{r.v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>Identity</h2>
              <span className="section-meta">REQUIRED</span>
            </div>
            <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="FULL NAME" value={draft.name} onChange={(v) => patch('name', v)} />
              <Field label="TITLE" value={draft.title} onChange={(v) => patch('title', v)} />
              <Field label="EXPERTISE" value={draft.expertise} onChange={(v) => patch('expertise', v)} placeholder="Separate with · or ," />
              <Field label="LOCATION" value={draft.location} onChange={(v) => patch('location', v)} />
              <Field label="BIO" value={draft.bio} onChange={(v) => patch('bio', v)} multiline />
            </div>
          </div>
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>Contact & Socials</h2>
              <span className="section-meta">OPTIONAL</span>
            </div>
            <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="EMAIL" value={draft.email} onChange={(v) => patch('email', v)} />
              <Field label="PHONE" value={draft.phone} onChange={(v) => patch('phone', v)} />
              <Field label="LINKEDIN HANDLE" value={draft.linkedin} onChange={(v) => patch('linkedin', v)} placeholder="e.g. your-name" />
              <Field label="TWITTER / X HANDLE" value={draft.twitter} onChange={(v) => patch('twitter', v)} placeholder="without @" />
              <Field label="GITHUB" value={draft.github} onChange={(v) => patch('github', v)} />
              <Field label="WEBSITE" value={draft.website} onChange={(v) => patch('website', v)} placeholder="e.g. yourname.com" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RoleProfile, useRoleProfile, loadRoleProfile, saveRoleProfile });
