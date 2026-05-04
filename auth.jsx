// Login + Sign-up + Onboarding — first-time Exonaut flow

function LoginScreen({ onSignIn }) {
  // 'login' | 'signup' | 'forgotpw' | 'resetpw'
  const [mode, setMode] = React.useState(() =>
    location.hash.includes('type=recovery') ? 'resetpw' : 'login'
  );

  // ── Login state ──────────────────────────────────────────────────────────
  const [email, setEmail]       = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw]     = React.useState(false);

  // ── Sign-up state ─────────────────────────────────────────────────────────
  const [suFirst, setSuFirst]       = React.useState('');
  const [suLast, setSuLast]         = React.useState('');
  const [suEmail, setSuEmail]       = React.useState('');
  const [suPass, setSuPass]         = React.useState('');
  const [suConfirm, setSuConfirm]   = React.useState('');
  const [showSuPw, setShowSuPw]     = React.useState(false);

  // ── Forgot / Reset password state ────────────────────────────────────────
  const [fpEmail, setFpEmail]       = React.useState('');
  const [fpSent, setFpSent]         = React.useState(false);
  const [rpPass, setRpPass]         = React.useState('');
  const [rpConfirm, setRpConfirm]   = React.useState('');
  const [rpDone, setRpDone]         = React.useState(false);
  const [showRpPw, setShowRpPw]     = React.useState(false);

  // ── Shared ────────────────────────────────────────────────────────────────
  const [loading, setLoading]               = React.useState(false);
  const [error, setError]                   = React.useState('');
  const [verificationSent, setVerificationSent] = React.useState(false);

  const switchMode = (m) => { setMode(m); setError(''); setVerificationSent(false); setFpSent(false); };

  // ── Auto-login ONLY when returning from email verification link ──────────
  // Guard: skip for password-reset redirects (type=recovery) — those stay on resetpw mode.
  React.useEffect(() => {
    const hash = location.hash;
    if (hash.includes('type=recovery')) return; // handled by resetpw mode
    const isVerificationRedirect =
      hash.includes('access_token') || location.search.includes('code=');
    if (!isVerificationRedirect) return;

    async function checkVerifiedSession() {
      const { data: { session } } = await window.__db.auth.getSession();
      if (!session) return;
      const reg = await window.__userRegistry.find(session.user.email);
      if (!reg) return;
      const loginId = reg.role === 'lead' && reg.leadId ? reg.leadId : reg.userId;
      const firstTime = reg.role === 'exonaut' && !localStorage.getItem('exo:onboarded:' + reg.userId);
      localStorage.setItem('exo:userName', reg.name);
      localStorage.setItem('exo:userTrack', reg.track || 'AIS');
      applySession(loginId, reg.role, reg.homeRoute, firstTime);
    }
    checkVerifiedSession();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function applySession(userId, role, homeRoute, isFirstTimeExonaut) {
    localStorage.setItem('exo:userId',    userId);
    localStorage.setItem('exo:role',      role);
    localStorage.setItem('exo:authRole',  role);
    localStorage.setItem('exo:route',     homeRoute);
    localStorage.setItem('exo:auth',      isFirstTimeExonaut ? 'onboarding' : 'app');
    location.reload();
  }

  // ── Login submit ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      // 1. Check seed credentials
      const seed = CREDENTIALS[email.trim().toLowerCase()];
      if (seed && seed.password === password) {
        const firstTime = seed.role === 'exonaut' && !localStorage.getItem('exo:onboarded:' + seed.userId);
        applySession(seed.userId, seed.role, seed.homeRoute, firstTime);
        return;
      }
      // 2. Try Supabase Auth for registered users
      const { data: authData, error: authError } = await window.__db.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) {
        const msg = (authError.message || '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          setError('Email not verified yet — check your inbox and click the confirmation link.');
        } else {
          setError('Invalid email or password.');
        }
        return;
      }
      if (authData?.user) {
        const reg = await window.__userRegistry.find(email);
        if (reg) {
          const loginId = reg.role === 'lead' && reg.leadId ? reg.leadId : reg.userId;
          const firstTime = reg.role === 'exonaut' && !localStorage.getItem('exo:onboarded:' + reg.userId);
          localStorage.setItem('exo:userName', reg.name);
          localStorage.setItem('exo:userTrack', reg.track || 'AIS');
          applySession(loginId, reg.role, reg.homeRoute, firstTime);
          return;
        }
      }
      setError('Invalid email or password.');
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign-up submit ────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    const suName = (suFirst.trim() + ' ' + suLast.trim()).trim();
    if (!suFirst.trim() || !suLast.trim() || !suEmail || !suPass || !suConfirm) {
      setError('All fields are required.');
      return;
    }
    if (suPass.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (suPass !== suConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const taken = await window.__userRegistry.emailTaken(suEmail);
      if (taken) {
        setError('An account with this email already exists.');
        return;
      }
      await window.__userRegistry.register({ name: suName, email: suEmail, password: suPass });
      setVerificationSent(true);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else {
        setError('Registration failed: ' + (err?.message || 'please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password submit ────────────────────────────────────────────────
  const handleForgotPw = async (e) => {
    e.preventDefault();
    if (!fpEmail.trim()) { setError('Please enter your email.'); return; }
    setError(''); setLoading(true);
    try {
      const { error: fpErr } = await window.__db.auth.resetPasswordForEmail(
        fpEmail.trim().toLowerCase(),
        { redirectTo: 'https://exonaut.exoasia.org' }
      );
      if (fpErr) throw fpErr;
      setFpSent(true);
    } catch (err) {
      setError(err?.message || 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset password submit (user returned from link) ───────────────────────
  const handleResetPw = async (e) => {
    e.preventDefault();
    if (rpPass.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (rpPass !== rpConfirm) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      const { error: rpErr } = await window.__db.auth.updateUser({ password: rpPass });
      if (rpErr) throw rpErr;
      setRpDone(true);
      // Clear the recovery hash from URL
      history.replaceState(null, '', location.pathname);
    } catch (err) {
      setError(err?.message || 'Failed to update password. The reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared error / action bar ─────────────────────────────────────────────
  const ErrorBanner = () => error ? (
    <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 4, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em' }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />{error}
    </div>
  ) : null;

  const PwToggle = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle}
      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
      <i className={'fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye')} />
    </button>
  );

  return (
    <div className="hud-bg" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 2, width: 'min(460px, 100%)' }} className="enter">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, letterSpacing: '0.1em', color: 'var(--ink)', lineHeight: 1 }}>EXOASIA</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 6, letterSpacing: '0.3em' }}>INNOVATION HUB</div>
        </div>

        <div className="card-hud" style={{ background: 'var(--bg-darkest)', border: '1px solid var(--off-white-07)', borderRadius: 6, padding: 36 }}>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--off-white-07)' }}>
            {[['login','Sign In'], ['signup','Create Account']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => switchMode(m)} style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', fontWeight: 700,
                textTransform: 'uppercase',
                color: mode === m ? 'var(--ink)' : 'var(--off-white-40)',
                borderBottom: mode === m ? '2px solid var(--lime)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}>{label}</button>
            ))}
          </div>

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <>
              <div className="t-label" style={{ marginBottom: 10 }}>SECURE ACCESS</div>
              <h1 className="t-title" style={{ fontSize: 32, margin: '0 0 8px 0' }}>Exonaut Portal</h1>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--lavender)', marginBottom: 28 }}>
                "We don't wait for the map. We build it."
              </div>

              <form onSubmit={handleLogin}>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ marginBottom: 16 }} placeholder="name@exoasia.hub" autoFocus />

                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>PASSWORD</label>
                <div style={{ position: 'relative', marginBottom: 22 }}>
                  <input className="input" type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                  <PwToggle show={showPw} onToggle={() => setShowPw(v => !v)} />
                </div>

                <ErrorBanner />

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginBottom: 12 }}>
                  {loading
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> AUTHENTICATING…</>
                    : <><i className="fa-solid fa-arrow-right-to-bracket" /> SIGN IN</>}
                </button>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <button type="button" onClick={() => switchMode('forgotpw')} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--lavender)',
                    letterSpacing: '0.08em', textDecoration: 'underline',
                  }}>Forgot your password?</button>
                </div>
              </form>
            </>
          )}

          {/* ── SIGN-UP FORM ── */}
          {mode === 'signup' && verificationSent && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: 40, color: 'var(--lime)', marginBottom: 20, display: 'block' }} />
              <div className="t-label" style={{ marginBottom: 8 }}>VERIFY YOUR EMAIL</div>
              <h2 className="t-title" style={{ fontSize: 26, margin: '0 0 12px 0' }}>Check your inbox</h2>
              <div className="t-body" style={{ color: 'var(--off-white-60)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                We sent a confirmation link to <strong style={{ color: 'var(--off-white)' }}>{suEmail}</strong>.<br />
                Click it to activate your account, then come back here to sign in.
              </div>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => switchMode('login')}>
                <i className="fa-solid fa-arrow-right-to-bracket" /> BACK TO SIGN IN
              </button>
            </div>
          )}

          {mode === 'signup' && !verificationSent && (
            <>
              <div className="t-label" style={{ marginBottom: 10 }}>NEW ACCOUNT</div>
              <h1 className="t-title" style={{ fontSize: 32, margin: '0 0 8px 0' }}>Join the Program</h1>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--lavender)', marginBottom: 28 }}>
                You'll start as an Exonaut. Your Mission Lead will assign your track.
              </div>

              <form onSubmit={handleSignUp}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>FIRST NAME</label>
                    <input className="input" type="text" value={suFirst} onChange={e => setSuFirst(e.target.value)}
                      placeholder="First" autoFocus />
                  </div>
                  <div>
                    <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>LAST NAME</label>
                    <input className="input" type="text" value={suLast} onChange={e => setSuLast(e.target.value)}
                      placeholder="Last" />
                  </div>
                </div>

                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input className="input" type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)}
                  style={{ marginBottom: 16 }} placeholder="you@exoasia.hub" />

                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>PASSWORD · MIN 8 CHARS</label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input className="input" type={showSuPw ? 'text' : 'password'} value={suPass}
                    onChange={e => setSuPass(e.target.value)} placeholder="••••••••" />
                  <PwToggle show={showSuPw} onToggle={() => setShowSuPw(v => !v)} />
                </div>

                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>CONFIRM PASSWORD</label>
                <div style={{ position: 'relative', marginBottom: 22 }}>
                  <input className="input" type={showSuPw ? 'text' : 'password'} value={suConfirm}
                    onChange={e => setSuConfirm(e.target.value)} placeholder="••••••••" />
                </div>

                <ErrorBanner />

                {/* Default role badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', background: 'rgba(201,242,74,0.06)', border: '1px solid var(--off-white-07)', borderRadius: 4 }}>
                  <i className="fa-solid fa-user-astronaut" style={{ color: 'var(--lime)', fontSize: 13 }} />
                  <div>
                    <div className="t-mono" style={{ fontSize: 10, color: 'var(--lime)', letterSpacing: '0.1em' }}>DEFAULT ROLE · EXONAUT</div>
                    <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-40)', marginTop: 2 }}>Admins can promote your role after you join.</div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                  {loading
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> CREATING ACCOUNT…</>
                    : <><i className="fa-solid fa-rocket" /> CREATE ACCOUNT</>}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgotpw' && !fpSent && (
            <>
              <button type="button" onClick={() => switchMode('login')} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px 0',
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)',
                letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6,
              }}><i className="fa-solid fa-arrow-left" /> BACK TO SIGN IN</button>

              <div className="t-label" style={{ marginBottom: 10 }}>ACCOUNT RECOVERY</div>
              <h1 className="t-title" style={{ fontSize: 28, margin: '0 0 8px 0' }}>Reset your password</h1>
              <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-60)', marginBottom: 24, lineHeight: 1.6 }}>
                Enter the email you registered with. We'll send you a link to set a new password.
              </div>

              <form onSubmit={handleForgotPw}>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input className="input" type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                  placeholder="you@exoasia.hub" autoFocus style={{ marginBottom: 20 }} />
                <ErrorBanner />
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                  {loading
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> SENDING…</>
                    : <><i className="fa-solid fa-paper-plane" /> SEND RESET LINK</>}
                </button>
              </form>
            </>
          )}

          {mode === 'forgotpw' && fpSent && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: 40, color: 'var(--lime)', marginBottom: 20, display: 'block' }} />
              <div className="t-label" style={{ marginBottom: 8 }}>CHECK YOUR INBOX</div>
              <h2 className="t-title" style={{ fontSize: 24, margin: '0 0 12px 0' }}>Reset link sent</h2>
              <div className="t-body" style={{ color: 'var(--off-white-60)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                We sent a password reset link to <strong style={{ color: 'var(--off-white)' }}>{fpEmail}</strong>.<br />
                Click the link in the email to set a new password.
              </div>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => switchMode('login')}>
                <i className="fa-solid fa-arrow-right-to-bracket" /> BACK TO SIGN IN
              </button>
            </div>
          )}

          {/* ── RESET PASSWORD (returned from email link) ── */}
          {mode === 'resetpw' && !rpDone && (
            <>
              <div className="t-label" style={{ marginBottom: 10 }}>SET NEW PASSWORD</div>
              <h1 className="t-title" style={{ fontSize: 28, margin: '0 0 8px 0' }}>Choose a new password</h1>
              <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-60)', marginBottom: 24, lineHeight: 1.6 }}>
                Pick something strong — at least 8 characters.
              </div>
              <form onSubmit={handleResetPw}>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>NEW PASSWORD</label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input className="input" type={showRpPw ? 'text' : 'password'} value={rpPass}
                    onChange={e => setRpPass(e.target.value)} placeholder="••••••••" autoFocus />
                  <PwToggle show={showRpPw} onToggle={() => setShowRpPw(v => !v)} />
                </div>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>CONFIRM PASSWORD</label>
                <div style={{ position: 'relative', marginBottom: 22 }}>
                  <input className="input" type={showRpPw ? 'text' : 'password'} value={rpConfirm}
                    onChange={e => setRpConfirm(e.target.value)} placeholder="••••••••" />
                </div>
                <ErrorBanner />
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                  {loading
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> UPDATING…</>
                    : <><i className="fa-solid fa-lock" /> SET NEW PASSWORD</>}
                </button>
              </form>
            </>
          )}

          {mode === 'resetpw' && rpDone && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: 40, color: 'var(--lime)', marginBottom: 20, display: 'block' }} />
              <div className="t-label" style={{ marginBottom: 8 }}>PASSWORD UPDATED</div>
              <h2 className="t-title" style={{ fontSize: 24, margin: '0 0 12px 0' }}>You're all set</h2>
              <div className="t-body" style={{ color: 'var(--off-white-60)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Your password has been changed. Sign in with your new password.
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                onClick={() => switchMode('login')}>
                <i className="fa-solid fa-arrow-right-to-bracket" /> SIGN IN
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
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

// ── Onboarding Wizard ──────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = React.useState(1);
  const [pledgeAccepted, setPledgeAccepted] = React.useState(false);
  const [bio, setBio] = React.useState('');
  const [liUrl, setLiUrl] = React.useState('');
  const [tourSlide, setTourSlide] = React.useState(0);
  const [liPosted, setLiPosted] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const canAdvance = { 1: pledgeAccepted, 2: bio.length > 0, 3: true, 4: liPosted }[step];
  const next = () => {
    const uid = localStorage.getItem('exo:userId') || ME_ID;
    // Step 1 → 2: pledge signed → +50 pts (one-time)
    if (step === 1 && window.__pointsStore && uid) {
      window.__pointsStore.add(uid, { source: 'onboarding.pledge', note: 'Exonaut Pledge signed at onboarding' });
    }
    if (step === 2) {
      if (avatarUrl) localStorage.setItem('exo:avatar:' + uid, avatarUrl);
      if (bio.trim()) localStorage.setItem('exo:bio:' + uid, bio.trim());
      if (liUrl.trim()) localStorage.setItem('exo:linkedin:' + uid, liUrl.trim());
    }
    // Step 4 → complete: LinkedIn post confirmed → +20 pts (one-time)
    if (step === 4 && window.__pointsStore && uid && liPosted) {
      window.__pointsStore.add(uid, { source: 'onboarding.linkedin', note: 'LinkedIn post published at onboarding' });
    }
    step < 4 ? setStep(step + 1) : onComplete();
  };

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  // Resolve the track name for this user (ME may be a registered user with no track)
  const userTrack = ME.track ? (TRACKS.find(t => t.code === ME.track) || TRACKS[0]) : TRACKS[0];

  return (
    <div className="hud-bg" style={{ minHeight: '100vh', padding: '48px 24px', position: 'relative' }}>
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
            <h1 className="t-title" style={{ fontSize: 52, margin: '0 0 12px 0' }}>Welcome, {ME.name.split(' ')[0]}.</h1>
            <div className="t-body" style={{ marginBottom: 40, fontSize: 18, maxWidth: 540 }}>
              Before your dashboard opens, read the Exonaut Pledge and sign it. This is the one part of the program that isn't gamified.
            </div>

            <div className="card-panel" style={{ background: 'var(--bg-darkest)', padding: 36, borderLeft: '2px solid var(--lime)' }}>
              <div style={{ marginBottom: 28 }}>
                <div className="t-label-muted" style={{ marginBottom: 4 }}>EXO-ID</div>
                <div className="t-heading" style={{ fontSize: 16, fontFamily: 'var(--font-mono)' }}>{(ME_ID || 'PENDING').toUpperCase().slice(0,8)}-2026</div>
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 6, letterSpacing: '0.08em' }}>Track and cohort will be assigned by your Admin.</div>
              </div>

              <div style={{ paddingTop: 24, borderTop: '1px solid var(--off-white-07)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--lime)', letterSpacing: '0.04em', marginBottom: 24 }}>
                  I am an Exonaut.
                </div>

                {[
                  'I did not come here to pass time. I came here to build something real — solving real problems, for real clients, real communities, and a real future.',
                  'I pledge to show up fully — not just in presence, but in ownership. Every mission I take on, I own completely. I do not wait to be told twice. I do not ship halfway. I do not leave my team behind.',
                  'I pledge to grow without ego — to ask when I don\'t know, to teach what I learn, and to take feedback as fuel. I am not here to prove I\'m already great. I am here to become greater.',
                  'I pledge to serve my client with integrity — to show up with the professionalism of someone who has been trusted with something that matters. Because they have.',
                  'I pledge to find the next Exonaut — to pay forward the opportunity given to me, to actively seek, recruit, and champion someone who deserves this seat as much as I did.',
                  'I pledge to protect this culture — to call out mediocrity, celebrate excellence, and never let cynicism replace ambition in this room.',
                  'I understand that when this cohort ends, I do not leave. I launch. I become Exonaut Corps — a permanent part of the ecosystem I helped build.',
                ].map((para, i) => (
                  <p key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.8, color: 'var(--off-white)', margin: '0 0 18px 0' }}>
                    {para}
                  </p>
                ))}

                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--off-white-07)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--off-white)', letterSpacing: '0.02em', lineHeight: 1.5 }}>
                  We don't wait for the map.<br />
                  We build it.
                </div>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, cursor: 'pointer' }}>
              <input type="checkbox" checked={pledgeAccepted} onChange={e => setPledgeAccepted(e.target.checked)}
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
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--lime)' }} />
                  : <AvatarWithRing name={ME.name} size={140} tier={ME.tier || 'entry'} />
                }
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                  onClick={() => fileInputRef.current.click()}>
                  <i className="fa-solid fa-camera" /> {avatarUrl ? 'CHANGE PHOTO' : 'UPLOAD'}
                </button>
              </div>
              <div>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>ONE-LINE BIO · MAX 160</label>
                <textarea className="textarea" rows={2} value={bio} maxLength={160}
                  onChange={e => setBio(e.target.value)}
                  placeholder="What would a friend say about you in one sentence?" />
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', textAlign: 'right', marginTop: 4 }}>
                  {bio.length} / 160
                </div>

                <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(201,242,74,0.05)', border: '1px solid var(--off-white-07)', borderRadius: 4 }}>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>Track and cohort will be assigned by your Admin after enrollment.</div>
                </div>

                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6, marginTop: 20 }}>LINKEDIN URL · OPTIONAL</label>
                <input className="input" placeholder="linkedin.com/in/yourname" value={liUrl} onChange={e => setLiUrl(e.target.value)} />
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
                { t: 'Dashboard',   d: 'Your daily cockpit. Points, rank, missions, rituals — all in one view.', icon: 'fa-gauge-high' },
                { t: 'Leaderboard', d: 'Real-time cohort ranking. Your row is always highlighted, even at #28.',  icon: 'fa-ranking-star' },
                { t: 'Badges',      d: '22 possible badges per cohort. Most Exonauts earn 4–10. All 22 is legend.', icon: 'fa-medal' },
                { t: 'Missions',    d: 'Submit, get graded within 48h, earn bonus for Excellent work.',             icon: 'fa-bullseye' },
                { t: 'Kudos',       d: 'Lift before you climb. 3 kudos/week given. Unlimited received.',           icon: 'fa-hand-sparkles' },
              ].map((s, i) => (
                <div key={i} onClick={() => setTourSlide(i)} style={{
                  padding: '24px 28px', cursor: 'pointer',
                  borderBottom: i < 4 ? '1px solid var(--off-white-07)' : 'none',
                  background: tourSlide === i ? 'rgba(201,229,0,0.04)' : 'transparent',
                  display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 20, alignItems: 'center',
                }}>
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
                I'm joining <strong style={{ color: 'var(--ink)' }}>Exoasia Innovation Hub</strong> as an Exonaut in the <strong>{userTrack.name}</strong> track, Batch 2026–2027.<br/><br/>
                For the next 12 weeks, I'll be shipping real client work, competing with 29 of the sharpest people I've met, and learning from founders who'd rather build than talk about it.<br/><br/>
                <em style={{ color: 'var(--lavender)' }}>We don't wait for the map. We build it.</em><br/><br/>
                <span style={{ color: 'var(--off-white-40)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>#ExoasiaExonaut #Batch2026 #{userTrack.code}</span>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, cursor: 'pointer' }}>
              <input type="checkbox" checked={liPosted} onChange={e => setLiPosted(e.target.checked)}
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

Object.assign(window, { LoginScreen, Onboarding });
