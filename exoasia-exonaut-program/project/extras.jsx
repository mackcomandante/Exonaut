// Celebrations, toasts, kudos modal, tweaks panel.

// ---- Celebration overlay (tier upgrade + badge earned) ----
function Celebration({ kind, payload, onClose }) {
  const [show, setShow] = React.useState(false);
  const activeCohort = window.getActiveCohort?.() || COHORT;
  React.useEffect(() => {
    requestAnimationFrame(() => setShow(true));
    const id = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(id);
  }, []);

  // confetti
  const confettiPieces = React.useMemo(() => {
    const colors = ['#C9F24A', '#B14CFF', '#C6B8FF', '#7FE3FF', '#F4C542', '#FF8A2B', '#3B6BFF'];
    return Array.from({ length: 80 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.6 + Math.random() * 1.6,
      color: colors[i % colors.length],
      rot: Math.random() * 360,
    }));
  }, []);

  let content;
  if (kind === 'tier') {
    const t = TIERS[payload.tier];
    content = (
      <>
        <div className="celebration-medallion">
          <svg viewBox="0 0 220 220">
            <defs>
              <radialGradient id="tier-g" cx="50%" cy="40%">
                <stop offset="0%" stopColor={t.color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={t.color} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="110" cy="110" r="100" fill="url(#tier-g)" />
            <circle cx="110" cy="110" r="80" fill="none" stroke={t.color} strokeWidth="2" />
            <circle cx="110" cy="110" r="65" fill={t.color} />
            <text x="110" y="118" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="28"
              textAnchor="middle" fill="#2D0A28" letterSpacing="0.05em">{t.short}</text>
          </svg>
        </div>
        <div className="celebration-kicker">TIER UPGRADE UNLOCKED</div>
        <h1 className="celebration-title">You are now {t.label}</h1>
        <div className="celebration-sub">The first 300 points are gone. The next 300 remember you.</div>
        <div className="celebration-meta">EXO-TIER-{t.short} · {activeCohort?.code || COHORT.code}</div>
      </>
    );
  } else if (kind === 'badge') {
    const b = payload.badge;
    content = (
      <>
        <div className="celebration-medallion">
          <BadgeMedallion badge={b} size={220} animated />
        </div>
        <div className="celebration-kicker">NEW BADGE EARNED</div>
        <h1 className="celebration-title">{b.name}</h1>
        <div className="celebration-sub">{b.subtitle}</div>
        <div className="celebration-meta">EXO-BADGE-{b.code} · {activeCohort?.code || COHORT.code}</div>
      </>
    );
  } else if (kind === 'rank') {
    content = (
      <>
        <div className="celebration-medallion">
          <svg viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="90" fill="none" stroke="var(--lime)" strokeWidth="1.5" opacity="0.3" />
            <circle cx="110" cy="110" r="70" fill="rgba(201,242,74,0.12)" />
            <text x="110" y="132" fontFamily="JetBrains Mono" fontWeight="700" fontSize="64"
              textAnchor="middle" fill="#C9F24A">#10</text>
          </svg>
        </div>
        <div className="celebration-kicker">RANK MILESTONE</div>
        <h1 className="celebration-title">Top 10 Unlocked</h1>
        <div className="celebration-sub">You just entered the Top 10. Keep building.</div>
      </>
    );
  }

  return (
    <div className={'celebration-overlay' + (show ? ' show' : '')}
         onClick={onClose}
         role="dialog">
      {show && confettiPieces.map((c, i) => (
        <div key={i} className="confetti-piece"
          style={{
            left: c.left + '%',
            background: c.color,
            animationDelay: c.delay + 's',
            animationDuration: c.duration + 's',
            transform: `rotate(${c.rot}deg)`,
          }} />
      ))}
      <div className="celebration-content">
        {content}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-primary">
            <i className="fa-brands fa-linkedin" /> SHARE TO LINKEDIN
          </button>
          <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onClose(); }}>DISMISS</button>
        </div>
      </div>
    </div>
  );
}

// ---- Toast stack ----
function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <div className="t-icon"><i className={'fa-solid ' + (t.icon || 'fa-bolt')} /></div>
          <div style={{ flex: 1 }}>
            <div className="t-title">{t.title}</div>
            {t.sub && <div className="t-sub">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Kudos modal ----
function LegacyKudosModal({ onClose, onSent }) {
  const [recipient, setRecipient] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [pillar, setPillar] = React.useState('project');
  const [search, setSearch] = React.useState('');

  const kudos = useKudos();
  const { profile } = useCurrentUserProfile();

  // Identify who's posting — varies by role.
  const me = React.useMemo(() => {
    const role = profile.role || 'exonaut';
    return {
      id: profile.id || ME_ID,
      name: profile.fullName || ME.name || 'You',
      role,
      badge: role === 'admin' ? 'Exonaut credential' : (role === 'exonaut' ? null : role.toUpperCase()),
    };
  }, [profile.id, profile.fullName, profile.role]);

  // Recipient pool = whole community (active + alumni), minus self.
  const pool = React.useMemo(() => {
    const members = (typeof getCommunityMembers === 'function') ? getCommunityMembers() : USERS.map(u => ({ ...u, status: 'active' }));
    return members.filter(m => m.id !== me.id);
  }, [me.id]);

  const filteredPool = React.useMemo(() => {
    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter(m => m.name.toLowerCase().includes(q) || (m.track || '').toLowerCase().includes(q));
  }, [pool, search]);

  const roleTagStyle = {
    lead:      { bg: 'rgba(192,192,192,0.15)', fg: 'var(--platinum)' },
    commander: { bg: 'rgba(244,197,66,0.15)',  fg: 'var(--amber)' },
    admin:     { bg: 'rgba(125,211,252,0.15)', fg: 'var(--sky)' },
  }[me.role];

  const handleSend = () => {
    if (!recipient || !message) return;
    kudos.give({
      from: me.id, fromName: me.role === 'exonaut' ? null : me.name, fromRole: me.role,
      to: recipient, msg: message, pillar,
    });
    onSent?.({ recipient, message, pillar });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></div>
        <div className="t-label" style={{ marginBottom: 8 }}>
          RECOGNIZE SOMEONE IN THE COMMUNITY
          {me.badge && (
            <span style={{ marginLeft: 8, padding: '1px 6px', background: roleTagStyle?.bg, color: roleTagStyle?.fg, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700, borderRadius: 2 }}>
              GIVING AS {me.badge}
            </span>
          )}
        </div>
        <h2 className="t-title" style={{ fontSize: 28, margin: '0 0 8px 0' }}>Give Kudos</h2>
        <div className="t-body" style={{ marginBottom: 20 }}>
          Lift before you climb. {me.role === 'exonaut' ? <>+2 pts to you · +3 pts to them. <span style={{ color: 'var(--off-white-40)', fontSize: 12 }}>(2 of 3 remaining this week)</span></> : 'From leadership, kudos count double toward recipient recognition.'}
        </div>

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>RECIPIENT</label>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search anyone in the community (active or alumni)…"
          style={{
            width: '100%', padding: '9px 12px', marginBottom: 8,
            background: 'var(--deep-black)', color: 'var(--off-white)',
            border: '1px solid var(--off-white-15)', borderRadius: 2,
            fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none',
          }} />
        <select className="select" value={recipient} onChange={(e) => setRecipient(e.target.value)} style={{ marginBottom: 14 }} size={filteredPool.length > 0 ? Math.min(6, filteredPool.length + 1) : 1}>
          <option value="">Select a community member…</option>
          {filteredPool.map(u => {
            return <option key={u.id} value={u.id}>{u.name}</option>;
          })}
        </select>

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>MESSAGE</label>
        <textarea className="textarea" rows={3} maxLength={200}
          placeholder="Why this person, right now?"
          value={message} onChange={(e) => setMessage(e.target.value)}
          style={{ marginBottom: 6 }} />
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', textAlign: 'right', marginBottom: 16 }}>
          {message.length} / 200
        </div>

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>TAG A PILLAR</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['project','client','recruitment'].map(p => (
            <div key={p} className={'lb-filter' + (pillar === p ? ' active' : '')} onClick={() => setPillar(p)}>
              {p}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSend}
            disabled={!recipient || !message}
            style={{ opacity: (!recipient || !message) ? 0.4 : 1 }}>
            <i className="fa-solid fa-hand-sparkles" /> GIVE KUDOS
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Tweaks panel ----
function TweaksPanel({ open, onClose, tweaks, setTweak, onCelebrate }) {
  if (!open) return null;
  const row = (label, key, options) => (
    <div className="tweak-group">
      <label>{label}</label>
      <div className="tweak-options">
        {options.map(o => (
          <div key={o.v} className={'tweak-option' + (tweaks[key] === o.v ? ' active' : '')}
            onClick={() => setTweak(key, o.v)}>
            {o.l}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="tweaks-panel open">
      <div className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></div>
      <h4><i className="fa-solid fa-sliders" /> TWEAKS</h4>
      {row('Density', 'density', [
        { v: 'compact', l: 'Compact' },
        { v: 'default', l: 'Default' },
        { v: 'comfy',   l: 'Comfy'   },
      ])}
      {row('Accent hue', 'accent', [
        { v: 'lime',     l: 'Lime'     },
        { v: 'platinum', l: 'Platinum' },
        { v: 'lavender', l: 'Lavender' },
      ])}
      {row('Dashboard', 'dashVariant', [
        { v: 'default',  l: 'HUD'      },
        { v: 'editorial',l: 'Editorial' },
      ])}
      {row('Ritual style', 'ritualStyle', [
        { v: 'cards',   l: 'Cards' },
        { v: 'compact', l: 'Bar'   },
      ])}
      {row('Badge shape', 'badgeShape', [
        { v: 'geom',    l: 'Geom'   },
        { v: 'classic', l: 'Round'  },
      ])}
      <div className="tweaks-demo-btns">
        <div className="t-label-muted" style={{ marginBottom: 6 }}>TRIGGER CELEBRATIONS</div>
        <button className="btn btn-ghost btn-sm" onClick={() => onCelebrate('tier', { tier: 'elite' })}>
          <i className="fa-solid fa-arrow-up-right-dots" /> TIER UPGRADE · ELITE
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onCelebrate('badge', { badge: BADGES.find(b => b.code === 'MIL-GLD') })}>
          <i className="fa-solid fa-medal" /> BADGE EARNED · GOLD
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onCelebrate('rank')}>
          <i className="fa-solid fa-trophy" /> RANK MILESTONE · TOP 10
        </button>
      </div>
    </div>
  );
}

// ---- Tweaks Toggle FAB ----
function TweaksFab({ onClick }) {
  return (
    <button onClick={onClick}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 140,
        background: 'var(--bg-deep)', border: '1px solid var(--lime-border)',
        borderRadius: '50%', width: 48, height: 48,
        display: 'grid', placeItems: 'center',
        color: 'var(--ink)', fontSize: 16,
        boxShadow: 'var(--lime-glow)',
        cursor: 'pointer',
      }} title="Tweaks">
      <i className="fa-solid fa-sliders" />
    </button>
  );
}

// Cohort-scoped Kudos modal. This declaration intentionally overrides the
// legacy community-wide modal above while keeping the rest of extras.jsx intact.
function KudosModal({ onClose, onSent }) {
  const [recipient, setRecipient] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [pillar, setPillar] = React.useState('culture');
  const [search, setSearch] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState('');

  const kudos = useKudos();
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();

  const me = React.useMemo(() => {
    const role = profile.role || 'exonaut';
    return {
      id: profile.id || ME_ID,
      name: profile.fullName || ME.name || 'You',
      role,
      badge: role === 'admin' ? 'Exonaut credential' : (role === 'exonaut' ? null : role.toUpperCase()),
    };
  }, [profile.id, profile.fullName, profile.role]);

  const myCohort = profile.cohortId || ME.cohort || 'c2627';
  const currentWeek = React.useMemo(() => {
    const cohort = window.__cohortStore?.getAll?.().find(c => c.id === myCohort);
    return window.EOW?.currentWeek ? window.EOW.currentWeek(cohort) : ((typeof COHORT !== 'undefined' ? COHORT.week : 1) || 1);
  }, [myCohort]);
  const weeklyUsed = kudos.weeklyUsage(me.id, myCohort, currentWeek);

  const pool = React.useMemo(() => {
    const fromProfiles = (profiles || []).map(p => ({
      id: p.id,
      name: p.fullName || 'Exonaut',
      email: p.email || '',
      track: p.trackCode || '',
      cohort: p.cohortId || 'c2627',
      role: p.role || 'exonaut',
    }));
    const fallback = (typeof USERS !== 'undefined' ? USERS : []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email || '',
      track: window.getUserTrack?.(u.id) || u.track || '',
      cohort: window.getUserCohort?.(u.id) || u.cohort || 'c2627',
      role: 'exonaut',
    }));
    const byId = new Map();
    fallback.forEach(m => byId.set(m.id, m));
    fromProfiles.forEach(m => byId.set(m.id, { ...(byId.get(m.id) || {}), ...m }));
    return Array.from(byId.values()).filter(m => m.id !== me.id && (m.cohort || 'c2627') === myCohort);
  }, [profiles, me.id, myCohort]);

  const filteredPool = React.useMemo(() => {
    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.track || '').toLowerCase().includes(q)
    );
  }, [pool, search]);
  const selectedRecipient = pool.find(u => u.id === recipient);

  const roleTagStyle = {
    lead: { bg: 'rgba(192,192,192,0.15)', fg: 'var(--platinum)' },
    commander: { bg: 'rgba(244,197,66,0.15)', fg: 'var(--amber)' },
    admin: { bg: 'rgba(125,211,252,0.15)', fg: 'var(--sky)' },
  }[me.role];

  const handleSend = async () => {
    if (!recipient || !message) return;
    setSending(true);
    setSendError('');
    try {
      const k = await kudos.give({
        from: me.id,
        fromName: me.name,
        fromRole: me.role,
        to: recipient,
        toName: selectedRecipient?.name,
        msg: message,
        pillar,
        cohortId: myCohort,
        week: currentWeek,
      });
      onSent?.({ ...k, recipient, recipientName: selectedRecipient?.name });
      onClose();
    } catch (err) {
      setSendError((err && err.message) || 'Could not send kudos.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></div>
        <div className="t-label" style={{ marginBottom: 8 }}>
          RECOGNIZE SOMEONE IN YOUR COHORT
          {me.badge && (
            <span style={{ marginLeft: 8, padding: '1px 6px', background: roleTagStyle?.bg, color: roleTagStyle?.fg, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700, borderRadius: 2 }}>
              GIVING AS {me.badge}
            </span>
          )}
        </div>
        <h2 className="t-title" style={{ fontSize: 28, margin: '0 0 8px 0' }}>Give Kudos</h2>
        <div className="t-body" style={{ marginBottom: 20 }}>
          Lift before you climb. +0.5 pts to you for the first 4 kudos/week. +0.25 pts to them.
          <span style={{ color: 'var(--off-white-40)', fontSize: 12 }}> ({weeklyUsed}/4 weekly giver points used)</span>
        </div>

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>RECIPIENT</label>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cohort members by name..."
          style={{
            width: '100%', padding: '9px 12px', marginBottom: 8,
            background: 'var(--deep-black)', color: 'var(--off-white)',
            border: '1px solid var(--off-white-15)', borderRadius: 2,
            fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none',
          }} />
        <select className="select" value={recipient} onChange={(e) => setRecipient(e.target.value)} style={{ marginBottom: 14 }} size={filteredPool.length > 0 ? Math.min(6, filteredPool.length + 1) : 1}>
          <option value="">{pool.length ? 'Select a cohort member...' : 'No cohort members available'}</option>
          {filteredPool.map(u => {
            return <option key={u.id} value={u.id}>{u.name}</option>;
          })}
        </select>
        {sendError && (
          <div className="t-body" style={{ margin: '-4px 0 12px', color: 'var(--danger)', fontSize: 12 }}>
            {sendError}
          </div>
        )}

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>MESSAGE</label>
        <textarea className="textarea" rows={3} maxLength={200}
          placeholder="Why this person, right now?"
          value={message} onChange={(e) => setMessage(e.target.value)}
          style={{ marginBottom: 6 }} />
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', textAlign: 'right', marginBottom: 16 }}>
          {message.length} / 200
        </div>

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>TAG A PILLAR</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['culture','client','recruitment'].map(p => (
            <div key={p} className={'lb-filter' + (pillar === p ? ' active' : '')} onClick={() => setPillar(p)}>
              {p}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSend}
            disabled={!recipient || !message || sending}
            style={{ opacity: (!recipient || !message || sending) ? 0.4 : 1 }}>
            <i className="fa-solid fa-hand-sparkles" /> {sending ? 'SENDING...' : 'GIVE KUDOS'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Celebration, ToastStack, KudosModal, TweaksPanel, TweaksFab });
