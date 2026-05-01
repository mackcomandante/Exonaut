// Login + Onboarding — first-time Exonaut flow

function LoginScreen({ onSignIn }) {
  const [email, setEmail] = React.useState('maya.chen@exoasia.hub');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignIn(); }, 650);
  };

  return (
    <div className="hud-bg" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 2, width: 'min(440px, 100%)' }} className="enter">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, letterSpacing: '0.1em', color: 'var(--ink)', lineHeight: 1 }}>EXOASIA</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 6, letterSpacing: '0.3em' }}>INNOVATION HUB</div>
        </div>

        <div className="card-hud" style={{ background: 'var(--bg-darkest)', border: '1px solid var(--off-white-07)', borderRadius: 6, padding: 36 }}>
          <div className="t-label" style={{ marginBottom: 10 }}>SECURE ACCESS</div>
          <h1 className="t-title" style={{ fontSize: 36, margin: '0 0 10px 0' }}>Exonaut Portal</h1>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--lavender)', marginBottom: 32 }}>
            "We don't wait for the map. We build it."
          </div>

          <form onSubmit={handleSubmit}>
            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   style={{ marginBottom: 16 }} placeholder="name@exoasia.hub" autoFocus />

            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <input className="input" type={showPw ? 'text' : 'password'} value={password}
                     onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                               color: 'var(--off-white-40)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
                <i className={'fa-solid ' + (showPw ? 'fa-eye-slash' : 'fa-eye')} />
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginBottom: 14 }}>
              {loading ? <><i className="fa-solid fa-circle-notch fa-spin" /> AUTHENTICATING…</> : <><i className="fa-solid fa-arrow-right-to-bracket" /> SIGN IN</>}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              FORGOT PASSWORD?
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--off-white-07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>OR</span>
            <button className="btn btn-ghost btn-sm"><i className="fa-brands fa-google" /> GOOGLE OAUTH</button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.15em' }}>
            EXOASIA INNOVATION HUB · COHORT 2026–2027
          </div>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-20)', letterSpacing: '0.1em', marginTop: 4 }}>
            EXO-AUTH-v2.0 · {new Date().toISOString().slice(0,10).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Onboarding Wizard ----
function Onboarding({ onComplete }) {
  const { profile } = useCurrentUserProfile();
  const displayName = profile.fullName || ME.name;
  const [step, setStep] = React.useState(1);
  const [pledgeAccepted, setPledgeAccepted] = React.useState(false);
  const [bio, setBio] = React.useState('');
  const [photo, setPhoto] = React.useState(true);
  const [tourSlide, setTourSlide] = React.useState(0);
  const [liPosted, setLiPosted] = React.useState(false);

  const canAdvance = {
    1: pledgeAccepted,
    2: bio.length > 0,
    3: true,
    4: liPosted,
  }[step];

  const next = () => step < 4 ? setStep(step + 1) : onComplete();

  return (
    <div className="hud-bg" style={{ minHeight: '100vh', padding: '48px 24px', position: 'relative' }}>
      {/* Progress strip */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, letterSpacing: '0.08em', color: 'var(--ink)' }}>EXOASIA</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.15em' }}>
            ONBOARDING · STEP {step} OF 4
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 48 }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{ flex: 1, height: 3, background: n <= step ? 'var(--lime)' : 'var(--off-white-07)', transition: 'background 300ms' }} />
          ))}
        </div>

        {step === 1 && (
          <div className="enter">
            <div className="t-label" style={{ marginBottom: 12 }}>STEP 01 · THE PLEDGE</div>
            <h1 className="t-title" style={{ fontSize: 52, margin: '0 0 12px 0' }}>Welcome, {displayName.split(' ')[0]}.</h1>
            <div className="t-body" style={{ marginBottom: 40, fontSize: 18, maxWidth: 540 }}>
              Before your dashboard opens, read the Exonaut Pledge and sign it. This is the one part of the program that isn't gamified.
            </div>

            <div className="card-panel" style={{ background: 'var(--bg-darkest)', padding: 36, borderLeft: '2px solid var(--lime)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>COHORT</div><div className="t-heading" style={{ fontSize: 16 }}>Batch 2026–2027</div></div>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>TRACK</div><div className="t-heading" style={{ fontSize: 16 }}>AI Strategy & Advisory</div></div>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>CLIENT</div><div className="t-heading" style={{ fontSize: 16 }}>Kestrel Biotics</div></div>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>EXO-ID</div><div className="t-heading" style={{ fontSize: 16, fontFamily: 'var(--font-mono)' }}>{ME_ID.toUpperCase().slice(0, 8)}-2026</div></div>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.7, color: 'var(--off-white)', fontStyle: 'italic', paddingTop: 24, borderTop: '1px solid var(--off-white-07)' }}>
                "I show up before I'm asked. I lift before I climb. I ship before I'm ready.<br/>
                I build the map for the next Exonaut, and I carry the ones I meet.<br/>
                I am not here to wait. I am here to build."
              </div>
              <div style={{ marginTop: 24, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>
                — SIGNED MACK COMANDANTE · FOUNDER
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, cursor: 'pointer' }}>
              <input type="checkbox" checked={pledgeAccepted} onChange={(e) => setPledgeAccepted(e.target.checked)}
                     style={{ width: 18, height: 18, accentColor: 'var(--lime)' }} />
              <span className="t-heading" style={{ fontSize: 13 }}>I accept the Exonaut Pledge</span>
              <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink)', marginLeft: 8, letterSpacing: '0.1em' }}>+50 PTS</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="enter">
            <div className="t-label" style={{ marginBottom: 12 }}>STEP 02 · PROFILE</div>
            <h1 className="t-title" style={{ fontSize: 52, margin: '0 0 12px 0' }}>Claim your profile.</h1>
            <div className="t-body" style={{ marginBottom: 40, fontSize: 18, maxWidth: 540 }}>
              Your profile is public to the cohort. One line about you, one photo, one link — that's it.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 32 }}>
              <div>
                <div className="t-label-muted" style={{ marginBottom: 10 }}>AVATAR</div>
                <div style={{ position: 'relative' }}>
                  <AvatarWithRing name={displayName} size={140} tier={ME.tier || 'entry'} />
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                  <i className="fa-solid fa-camera" /> UPLOAD
                </button>
              </div>
              <div>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>ONE-LINE BIO · MAX 160</label>
                <textarea className="textarea" rows={2} value={bio} maxLength={160}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What would a friend say about you in one sentence?" />
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', textAlign: 'right', marginTop: 4 }}>
                  {bio.length} / 160
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 20 }}>
                  <div>
                    <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>TRACK · ASSIGNED</label>
                    <div className="input" style={{ color: 'var(--ink)', background: 'var(--bg-footer)', cursor: 'not-allowed' }}>AI Strategy & Advisory</div>
                  </div>
                  <div>
                    <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>CLIENT · ASSIGNED</label>
                    <div className="input" style={{ color: 'var(--ink)', background: 'var(--bg-footer)', cursor: 'not-allowed' }}>Kestrel Biotics</div>
                  </div>
                </div>

                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6, marginTop: 20 }}>LINKEDIN URL · OPTIONAL</label>
                <input className="input" placeholder="linkedin.com/in/mayachen" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="enter">
            <div className="t-label" style={{ marginBottom: 12 }}>STEP 03 · PLATFORM TOUR</div>
            <h1 className="t-title" style={{ fontSize: 52, margin: '0 0 12px 0' }}>Know your instrument.</h1>
            <div className="t-body" style={{ marginBottom: 32, fontSize: 18, maxWidth: 540 }}>
              Five screens you'll live in. Click through, or skip if you'd rather learn by doing.
            </div>

            <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
              {[
                { t: 'Dashboard', d: 'Your daily cockpit. Points, rank, missions, rituals — all in one view.', icon: 'fa-gauge-high' },
                { t: 'Leaderboard', d: 'Real-time cohort ranking. Your row is always highlighted, even at #28.', icon: 'fa-ranking-star' },
                { t: 'Badges', d: '22 possible badges per cohort. Most Exonauts earn 4–10. All 22 is legend.', icon: 'fa-medal' },
                { t: 'Missions', d: 'Submit, get graded within 48h, earn bonus for Excellent work.', icon: 'fa-bullseye' },
                { t: 'Kudos', d: 'Lift before you climb. 3 kudos/week given. Unlimited received.', icon: 'fa-hand-sparkles' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '24px 28px',
                  borderBottom: i < 4 ? '1px solid var(--off-white-07)' : 'none',
                  background: tourSlide === i ? 'rgba(201,229,0,0.04)' : 'transparent',
                  display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 20, alignItems: 'center',
                  cursor: 'pointer',
                }} onClick={() => setTourSlide(i)}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-dark)', border: '1px solid ' + (tourSlide === i ? 'var(--lime)' : 'var(--off-white-07)'), display: 'grid', placeItems: 'center' }}>
                    <i className={'fa-solid ' + s.icon} style={{ color: tourSlide === i ? 'var(--lime)' : 'var(--off-white-40)' }} />
                  </div>
                  <div>
                    <div className="t-heading" style={{ fontSize: 14 }}>{s.t}</div>
                    <div className="t-body" style={{ fontSize: 14, marginTop: 4 }}>{s.d}</div>
                  </div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>0{i+1}/05</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="enter">
            <div className="t-label" style={{ marginBottom: 12 }}>STEP 04 · ANNOUNCE IT</div>
            <h1 className="t-title" style={{ fontSize: 52, margin: '0 0 12px 0' }}>Plant your flag.</h1>
            <div className="t-body" style={{ marginBottom: 32, fontSize: 18, maxWidth: 540 }}>
              Post your Exonaut announcement on LinkedIn. The dashboard unlocks once it's live. This is how the map gets bigger.
            </div>

            <div className="card-panel" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="t-label">LINKEDIN POST · PRE-FILLED</span>
                <button className="btn btn-ghost btn-sm"><i className="fa-solid fa-copy" /> COPY</button>
              </div>
              <div style={{ background: 'var(--bg-darkest)', padding: 24, borderRadius: 4, fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.65, color: 'var(--off-white)' }}>
                I'm joining <strong style={{ color: 'var(--ink)' }}>Exoasia Innovation Hub</strong> as an Exonaut in the <strong>AI Strategy & Advisory</strong> track, Batch 2026–2027.<br/><br/>
                For the next 12 weeks, I'll be shipping real client work, competing with 29 of the sharpest people I've met, and learning from founders who'd rather build than talk about it.<br/><br/>
                <em style={{ color: 'var(--lavender)' }}>We don't wait for the map. We build it.</em><br/><br/>
                <span style={{ color: 'var(--off-white-40)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>#ExoasiaExonaut #Batch2026 #AIStrategy</span>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, cursor: 'pointer' }}>
              <input type="checkbox" checked={liPosted} onChange={(e) => setLiPosted(e.target.checked)}
                     style={{ width: 18, height: 18, accentColor: 'var(--lime)' }} />
              <span className="t-heading" style={{ fontSize: 13 }}>I've posted my LinkedIn announcement</span>
              <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink)', marginLeft: 8, letterSpacing: '0.1em' }}>+20 PTS</span>
            </label>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--off-white-07)' }}>
          <button className="btn btn-ghost" onClick={() => step > 1 ? setStep(step - 1) : null} disabled={step === 1} style={{ opacity: step === 1 ? 0.3 : 1 }}>
            <i className="fa-solid fa-arrow-left" /> BACK
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step === 3 && <button className="btn btn-ghost" onClick={next}>SKIP TOUR</button>}
            <button className="btn btn-primary" onClick={next} disabled={!canAdvance} style={{ opacity: canAdvance ? 1 : 0.4 }}>
              {step === 4 ? 'ENTER DASHBOARD' : 'CONTINUE'} <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleAuthScreen({ onAuthComplete }) {
  const ROLE_OPTIONS = [
    { id: 'exonaut', label: 'Exonaut', sub: 'Intern', icon: 'fa-user-astronaut', accent: 'var(--lime)' },
    { id: 'commander', label: 'Commander', sub: 'Director', icon: 'fa-star', accent: 'var(--amber)' },
    { id: 'admin', label: 'Admin', sub: 'Platform', icon: 'fa-shield-halved', accent: 'var(--sky)' },
  ];
  const TEST_ACCOUNTS = [
    {
      role: 'exonaut',
      label: 'Exonaut',
      name: 'Test Exonaut',
      email: 'exonaut.test@exoasia.hub',
      password: 'ExonautTest123!',
    },
    {
      role: 'commander',
      label: 'Commander',
      name: 'Test Mission Commander',
      email: 'commander.test@exoasia.hub',
      password: 'ExonautTest123!',
    },
    {
      role: 'admin',
      label: 'Admin',
      name: 'Test Platform Admin',
      email: 'admin.test@exoasia.hub',
      password: 'ExonautTest123!',
    },
  ];

  const [selectedRole, setSelectedRole] = React.useState('exonaut');
  const [mode, setMode] = React.useState('signin');
  const [email, setEmail] = React.useState('maya.chen@exoasia.hub');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState('');

  const selected = ROLE_OPTIONS.find(r => r.id === selectedRole) || ROLE_OPTIONS[0];
  const isSignup = mode === 'signup';

  function selectRole(role) {
    setSelectedRole(role);
  }

  function useTestAccount(account, nextMode) {
    setSelectedRole(account.role);
    setMode(nextMode || mode);
    setFullName(account.name);
    setEmail(account.email);
    setPassword(account.password);
    setAuthError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password || (isSignup && !fullName.trim())) return;
    setAuthError('');
    setLoading(true);

    try {
      if (!window.__db || !window.__db.auth) {
        throw new Error('Supabase is not loaded. Open the app through the local server and check your internet connection.');
      }

      const result = isSignup
        ? await window.__db.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName.trim(), name: fullName.trim(), role: selectedRole } },
          })
        : await window.__db.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      const user = result.data && result.data.user;
      if (!user) throw new Error('Supabase did not return a user session.');
      if (isSignup && !result.data.session) {
        setLoading(false);
        setAuthError('Account created. Check your email to confirm before signing in.');
        return;
      }

      const profileResult = await window.__db
        .from('user_profiles')
        .select('role, full_name, cohort_id, track_code')
        .eq('id', user.id)
        .single();

      if (profileResult.error) throw profileResult.error;

      const profile = profileResult.data || {};
      const authRole = profile.role ||
                       (user.user_metadata && user.user_metadata.role) ||
                       (user.app_metadata && user.app_metadata.role);

      setLoading(false);
      if (onAuthComplete) {
        onAuthComplete({
          role: authRole || selectedRole,
          isNewExonaut: isSignup && (authRole || selectedRole) === 'exonaut',
          user: user,
          profile: profile,
        });
      }
    } catch (err) {
      setLoading(false);
      setAuthError((err && err.message) || 'Authentication failed. Check your credentials.');
    }
  }

  return (
    <div className="hud-bg" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 2, width: 'min(520px, 100%)' }} className="enter">
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, letterSpacing: '0.1em', color: 'var(--ink)', lineHeight: 1 }}>EXOASIA</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 6, letterSpacing: '0.3em' }}>INNOVATION HUB</div>
        </div>

        <div className="card-hud" style={{ background: 'var(--bg-darkest)', border: '1px solid var(--off-white-07)', borderRadius: 6, padding: 32 }}>
          <div className="t-label" style={{ marginBottom: 10, color: selected.accent }}>SECURE ACCESS</div>
          <h1 className="t-title" style={{ fontSize: 34, margin: '0 0 10px 0' }}>{selected.label} Portal</h1>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--lavender)', marginBottom: 26 }}>
            "We don't wait for the map. We build it."
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 22 }}>
            {ROLE_OPTIONS.map(role => (
              <button key={role.id} type="button" onClick={() => selectRole(role.id)}
                style={{
                  padding: '12px 10px',
                  background: selectedRole === role.id ? 'rgba(201,242,74,0.12)' : 'var(--off-white-07)',
                  border: '1px solid ' + (selectedRole === role.id ? role.accent : 'var(--off-white-15)'),
                  borderRadius: 4,
                  color: selectedRole === role.id ? role.accent : 'var(--off-white-68)',
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr',
                  gap: 8,
                  alignItems: 'center',
                  textAlign: 'left',
                }}>
                <i className={'fa-solid ' + role.icon} />
                <span>
                  <span className="t-heading" style={{ display: 'block', fontSize: 12, color: selectedRole === role.id ? role.accent : 'var(--off-white)' }}>{role.label}</span>
                  <span className="t-mono" style={{ display: 'block', fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.12em' }}>{role.sub.toUpperCase()}</span>
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            <button type="button" onClick={() => setMode('signin')}
              className={mode === 'signin' ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ justifyContent: 'center' }}>
              SIGN IN
            </button>
            <button type="button" onClick={() => setMode('signup')}
              className={isSignup ? 'btn btn-primary' : 'btn btn-ghost'}
              title={'Create a ' + selected.label + ' account'}
              style={{ justifyContent: 'center' }}>
              CREATE ACCOUNT
            </button>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: 'var(--off-white-07)', border: '1px solid var(--off-white-15)', borderRadius: 4 }}>
            <div className="t-label-muted" style={{ marginBottom: 10 }}>TEST STAFF ACCOUNTS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {TEST_ACCOUNTS.map(account => {
                const roleMeta = ROLE_OPTIONS.find(r => r.id === account.role) || ROLE_OPTIONS[0];
                return (
                  <button key={account.role} type="button" onClick={() => useTestAccount(account, isSignup ? 'signup' : 'signin')}
                    style={{
                      padding: '10px 8px',
                      background: selectedRole === account.role ? 'rgba(201,242,74,0.12)' : 'var(--bg-darkest)',
                      border: '1px solid ' + (selectedRole === account.role ? roleMeta.accent : 'var(--off-white-15)'),
                      borderRadius: 3,
                      color: selectedRole === account.role ? roleMeta.accent : 'var(--off-white-68)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}>
                    <span className="t-heading" style={{ display: 'block', fontSize: 11, color: selectedRole === account.role ? roleMeta.accent : 'var(--off-white)' }}>{account.label}</span>
                    <span className="t-mono" style={{ display: 'block', fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.06em', marginTop: 3 }}>{account.email}</span>
                  </button>
                );
              })}
            </div>
            <div className="t-body" style={{ marginTop: 10, fontSize: 11, color: 'var(--off-white-40)', lineHeight: 1.4 }}>
              Password for all test staff accounts: <span className="t-mono" style={{ color: 'var(--off-white-68)' }}>ExonautTest123!</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>FULL NAME</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)}
                       style={{ marginBottom: 16 }} placeholder="Your name" />
              </>
            )}

            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   style={{ marginBottom: 16 }} placeholder="name@exoasia.hub" autoFocus />

            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <input className="input" type={showPw ? 'text' : 'password'} value={password}
                     onChange={(e) => setPassword(e.target.value)} placeholder="password" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                               color: 'var(--off-white-40)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
                <i className={'fa-solid ' + (showPw ? 'fa-eye-slash' : 'fa-eye')} />
              </button>
            </div>

            {authError && (
              <div className="t-body" style={{ marginBottom: 14, padding: '10px 12px', border: '1px solid var(--red)', borderRadius: 4, color: 'var(--red)', fontSize: 12 }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginBottom: 14 }}>
              {loading
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> AUTHENTICATING...</>
                : isSignup
                  ? <><i className="fa-solid fa-user-plus" /> CREATE {selected.label.toUpperCase()} ACCOUNT</>
                  : <><i className="fa-solid fa-arrow-right-to-bracket" /> SIGN IN</>}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              FORGOT PASSWORD?
            </button>
          </form>

          <div className="t-body" style={{ marginTop: 16, fontSize: 12, color: 'var(--off-white-40)', lineHeight: 1.45 }}>
            {isSignup
              ? 'New accounts start from the selected role. Admin can later change the role without changing email or password.'
              : 'Sign-in uses the role assigned to this account. If Admin promotes an Exonaut to Lead, the same email and password opens the Lead console.'}
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--off-white-07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>OR</span>
            <button className="btn btn-ghost btn-sm"><i className="fa-brands fa-google" /> GOOGLE OAUTH</button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.15em' }}>
            EXOASIA INNOVATION HUB - COHORT 2026-2027
          </div>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-20)', letterSpacing: '0.1em', marginTop: 4 }}>
            EXO-AUTH-v2.0 - {new Date().toISOString().slice(0,10).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen: RoleAuthScreen, Onboarding });
