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
            <h1 className="t-title" style={{ fontSize: 52, margin: '0 0 12px 0' }}>Welcome, Maya.</h1>
            <div className="t-body" style={{ marginBottom: 40, fontSize: 18, maxWidth: 540 }}>
              Before your dashboard opens, read the Exonaut Pledge and sign it. This is the one part of the program that isn't gamified.
            </div>

            <div className="card-panel" style={{ background: 'var(--bg-darkest)', padding: 36, borderLeft: '2px solid var(--lime)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>COHORT</div><div className="t-heading" style={{ fontSize: 16 }}>Batch 2026–2027</div></div>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>TRACK</div><div className="t-heading" style={{ fontSize: 16 }}>AI Strategy & Advisory</div></div>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>CLIENT</div><div className="t-heading" style={{ fontSize: 16 }}>Kestrel Biotics</div></div>
                <div><div className="t-label-muted" style={{ marginBottom: 4 }}>EXO-ID</div><div className="t-heading" style={{ fontSize: 16, fontFamily: 'var(--font-mono)' }}>U14-2026</div></div>
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
                  <AvatarWithRing name="Maya Chen" size={140} tier="prime" />
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

Object.assign(window, { LoginScreen, Onboarding });
