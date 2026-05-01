// Mission Directive flow — Lead assigns, Exonaut accepts or requests clarification
// Stateful on window.__directiveState so both roles see updates live.

if (!window.__directiveState) {
  const storedDirectives = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('exo:directives:v1') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  })();
  window.__directiveState = {
    directives: storedDirectives.length ? storedDirectives : [...DIRECTIVES],
    listeners: new Set(),
  };
}
const dirStore = window.__directiveState;
const activeDirectiveUserId = () => localStorage.getItem('exo:userId') || ME_ID;
const persistDirectives = () => {
  try { localStorage.setItem('exo:directives:v1', JSON.stringify(dirStore.directives)); } catch (e) {}
};
const notifyDir = () => {
  persistDirectives();
  dirStore.listeners.forEach(fn => fn(Math.random()));
};

function relDirectiveTime(value) {
  if (!value) return 'Just now';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return 'Just now';
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.round(hrs / 24) + 'd ago';
}

function directiveFromRow(row) {
  return {
    id: row.id,
    from: row.from_lead_id,
    fromUserId: row.from_user_id,
    to: row.to_user_id,
    title: row.title,
    brief: row.brief,
    pillar: row.pillar,
    points: row.points,
    dueDate: row.due_date,
    dueTime: row.due_time,
    deliverable: row.deliverable,
    issuedAt: relDirectiveTime(row.issued_at),
    issuedAtIso: row.issued_at,
    status: row.status,
    clarificationNote: row.clarification_note || '',
  };
}

function directiveToRow(d) {
  return {
    id: d.id,
    from_lead_id: d.from,
    from_user_id: d.fromUserId || null,
    to_user_id: d.to,
    title: d.title,
    brief: d.brief,
    pillar: d.pillar,
    points: Number(d.points) || 0,
    due_date: d.dueDate,
    due_time: d.dueTime || '23:59 SGT',
    deliverable: d.deliverable || 'document',
    status: d.status || 'pending',
    clarification_note: d.clarificationNote || null,
  };
}

async function refreshDirectives() {
  if (!window.__db) return dirStore.directives;
  const { data, error } = await window.__db
    .from('directives')
    .select('*')
    .order('issued_at', { ascending: false });
  if (error) {
    console.warn('Could not load directives:', error.message || error);
    return dirStore.directives;
  }
  dirStore.loadedFromSupabase = true;
  dirStore.directives = (data || []).map(directiveFromRow);
  notifyDir();
  return dirStore.directives;
}

const useDirectives = () => {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const fn = (v) => force(v);
    dirStore.listeners.add(fn);
    if (!dirStore.loadedFromSupabase) refreshDirectives();
    return () => dirStore.listeners.delete(fn);
  }, []);
  return dirStore.directives;
};

async function saveDirective(directive) {
  if (!window.__db) return;
  const { error } = await window.__db
    .from('directives')
    .upsert(directiveToRow(directive), { onConflict: 'id' });
  if (error) console.warn('Could not save directive:', error.message || error);
  else refreshDirectives();
}

function updateDirective(directive, patch) {
  const next = { ...directive, ...patch };
  dirStore.directives = dirStore.directives.map(d => d.id === directive.id ? next : d);
  notifyDir();
  if (window.__db) {
    window.__db
      .from('directives')
      .update(directiveToRow(next))
      .eq('id', directive.id)
      .then(({ error }) => {
        if (error) console.warn('Could not update directive:', error.message || error);
        else refreshDirectives();
      });
  }
}

// -------- Lead: Assign Directive Modal --------
function AssignDirectiveModal({ defaultExonautId, onClose, onIssued }) {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const leadTrack = profile.trackCode || 'AIS';
  const lead = LEADS.find(l => l.track === leadTrack) || LEADS.find(l => l.id === 'lead-ais') || LEADS[0];
  const myExonauts = (profiles || [])
    .filter(p => p.role === 'exonaut' && (p.trackCode || 'AIS') === leadTrack && (!profile.cohortId || (p.cohortId || 'c2627') === profile.cohortId))
    .map(p => ({
      id: p.id,
      name: p.fullName || p.email || 'Exonaut',
      points: p.points || 0,
      tier: 'entry',
    }));
  const fallbackRecipient = defaultExonautId || myExonauts[0]?.id || '';
  const [recipientId, setRecipientId] = React.useState(fallbackRecipient);
  const [title, setTitle] = React.useState('');
  const [brief, setBrief] = React.useState('');
  const [points, setPoints] = React.useState(25);
  const [due, setDue] = React.useState('OCT 26');
  const [pillar, setPillar] = React.useState('project');
  const [deliverable, setDeliverable] = React.useState('document');

  React.useEffect(() => {
    if (!recipientId && fallbackRecipient) setRecipientId(fallbackRecipient);
  }, [recipientId, fallbackRecipient]);

  const canIssue = !!recipientId && title.length > 4 && brief.length > 20;

  const issue = async () => {
    const rec = myExonauts.find(u => u.id === recipientId);
    const session = window.__db ? await window.__db.auth.getSession() : null;
    const user = session?.data?.session?.user;
    const newDir = {
      id: 'DIR-' + leadTrack + '-2026-' + String(Math.floor(Math.random() * 900) + 100),
      from: lead?.id || 'lead-ais', fromUserId: user?.id || null, to: recipientId,
      title, brief, pillar, points, dueDate: due, dueTime: '23:59 SGT',
      deliverable, issuedAt: 'Just now', status: 'pending',
    };
    dirStore.directives = [newDir, ...dirStore.directives];
    notifyDir();
    saveDirective(newDir);
    onIssued && onIssued({ rec, directive: newDir });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div className="t-label" style={{ color: 'var(--platinum)' }}>NEW MISSION DIRECTIVE</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <h2 className="t-title" style={{ fontSize: 26, margin: '6px 0 6px 0' }}>Issue Directive</h2>
        <div className="t-body" style={{ fontSize: 13, marginBottom: 20 }}>
          Once issued, the Exonaut must <span style={{ color: 'var(--ink)' }}>accept</span> or <span style={{ color: 'var(--amber)' }}>request clarification</span> before the timer starts.
        </div>

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>ASSIGN TO</label>
        <select className="input" value={recipientId} onChange={e => setRecipientId(e.target.value)} style={{ marginBottom: 14 }}>
          {myExonauts.map(u => <option key={u.id} value={u.id}>{u.name} - {u.points} pts</option>)}
        </select>
        {myExonauts.length === 0 && (
          <div className="t-body" style={{ marginBottom: 14, color: 'var(--amber)', fontSize: 12 }}>
            No Exonaut profile is assigned to your track yet. Create or update an Exonaut user with track_code AIS.
          </div>
        )}

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>DIRECTIVE TITLE</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)}
               placeholder="e.g. Kestrel Series A Pitch Memo" style={{ marginBottom: 14 }} />

        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>BRIEF · WHAT, WHY, DEFINITION OF DONE</label>
        <textarea className="textarea" rows={5} value={brief} onChange={e => setBrief(e.target.value)}
                  placeholder="Specific, outcome-driven, unambiguous. The Exonaut should know exactly what 'done' looks like." style={{ marginBottom: 14 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div>
            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>PILLAR</label>
            <select className="input" value={pillar} onChange={e => setPillar(e.target.value)}>
              <option value="project">PROJECT</option>
              <option value="client">CLIENT</option>
              <option value="recruitment">RECRUIT</option>
            </select>
          </div>
          <div>
            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>DELIVERABLE</label>
            <select className="input" value={deliverable} onChange={e => setDeliverable(e.target.value)}>
              <option value="document">DOCUMENT</option>
              <option value="presentation">PRESENTATION</option>
              <option value="video">VIDEO</option>
              <option value="link">LINK</option>
              <option value="code">CODE</option>
            </select>
          </div>
          <div>
            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>DUE</label>
            <input className="input" value={due} onChange={e => setDue(e.target.value)} />
          </div>
          <div>
            <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>POINTS</label>
            <input className="input" type="number" value={points} onChange={e => setPoints(+e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)', paddingTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={issue} disabled={!canIssue} style={{ opacity: canIssue ? 1 : 0.4 }}>
            <i className="fa-solid fa-satellite-dish" /> ISSUE DIRECTIVE
          </button>
        </div>
      </div>
    </div>
  );
}

// -------- Lead: Issued Directives Panel (for LeadHome) --------
function LeadDirectivesPanel({ onNew }) {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const leadTrack = profile.trackCode || 'AIS';
  const lead = LEADS.find(l => l.track === leadTrack) || LEADS.find(l => l.id === 'lead-ais') || LEADS[0];
  const dirs = useDirectives().filter(d => d.from === (lead?.id || 'lead-ais'));
  return (
    <div className="card-panel" style={{ marginTop: 18 }}>
      <div className="section-head" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 15 }}>Directives Issued</h2>
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          <i className="fa-solid fa-plus" /> NEW DIRECTIVE
        </button>
      </div>
      {dirs.length === 0 && (
        <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-40)', padding: '20px 0' }}>
          No directives issued. Use NEW DIRECTIVE to assign an Exonaut an off-mission task.
        </div>
      )}
      {dirs.map(d => {
        const toProfile = (profiles || []).find(p => p.id === d.to);
        const to = USERS.find(u => u.id === d.to) || {
          name: toProfile?.fullName || toProfile?.email || 'Exonaut',
          tier: 'entry',
        };
        const statusColor = { pending: 'var(--amber)', accepted: 'var(--lime)', clarification: 'var(--platinum)' }[d.status];
        const statusLabel = { pending: 'AWAITING ACCEPT', accepted: 'ACCEPTED', clarification: 'CLARIFICATION ASKED' }[d.status];
        return (
          <div key={d.id} style={{ padding: '14px 0', borderTop: '1px solid var(--off-white-07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{d.id} · {d.issuedAt.toUpperCase()}</span>
              <span className="t-mono" style={{ fontSize: 10, color: statusColor, letterSpacing: '0.1em', fontWeight: 700 }}>
                <i className={'fa-solid ' + (d.status === 'pending' ? 'fa-hourglass' : d.status === 'accepted' ? 'fa-circle-check' : 'fa-comment-dots')} style={{ marginRight: 4 }} />
                {statusLabel}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 12, alignItems: 'center' }}>
              <AvatarWithRing name={to.name} size={30} tier={to.tier} />
              <div>
                <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{d.title}</div>
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 2 }}>
                  TO {to.name.toUpperCase()} · DUE {d.dueDate} · +{d.points} PTS
                </div>
              </div>
              <div className="t-mono" style={{ fontSize: 18, color: 'var(--ink)', fontWeight: 700 }}>+{d.points}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -------- Exonaut: Pending Directive Banner (top of Dashboard) --------
function DirectiveInbox({ onAccepted }) {
  const myPending = useDirectives().filter(d => d.to === activeDirectiveUserId() && d.status === 'pending');
  const [clarifyId, setClarifyId] = React.useState(null);
  const [clarifyText, setClarifyText] = React.useState('');

  if (myPending.length === 0) return null;

  const accept = (d) => {
    updateDirective(d, { status: 'accepted' });
    onAccepted && onAccepted(d);
  };
  const clarify = (d) => {
    updateDirective(d, { status: 'clarification', clarificationNote: clarifyText });
    setClarifyId(null);
    setClarifyText('');
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {myPending.map(d => {
        const from = LEADS.find(l => l.id === d.from) || { name: 'Mission Lead' };
        return (
          <div key={d.id} className="card-panel enter" style={{
            borderLeft: '3px solid var(--platinum)',
            background: 'linear-gradient(90deg, rgba(139,232,255,0.06), var(--card-base) 40%)',
            padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="t-mono" style={{ fontSize: 10, color: 'var(--platinum)', letterSpacing: '0.2em', fontWeight: 700 }}>
                <i className="fa-solid fa-satellite-dish" style={{ marginRight: 8 }} />
                INCOMING DIRECTIVE · AWAITING YOUR ACKNOWLEDGEMENT
              </span>
              <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>{d.id} · {d.issuedAt}</span>
            </div>

            <h3 className="t-heading" style={{ fontSize: 22, margin: '0 0 8px 0', textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
              {d.title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AvatarWithRing name={from.name} size={26} tier="corps" />
              <span className="t-body" style={{ fontSize: 13 }}>
                From <span style={{ color: 'var(--off-white)' }}>{from.name}</span> · Mission Lead, AI-Strat
              </span>
            </div>

            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--off-white)', padding: 16, background: 'var(--bg-darkest)', borderRadius: 4, marginBottom: 16 }}>
              {d.brief}
            </div>

            <div style={{ display: 'flex', gap: 18, marginBottom: 20, flexWrap: 'wrap' }}>
              <div><div className="t-label-muted">PILLAR</div><div className="t-heading" style={{ fontSize: 12 }}>{d.pillar.toUpperCase()}</div></div>
              <div><div className="t-label-muted">DELIVERABLE</div><div className="t-heading" style={{ fontSize: 12 }}>{d.deliverable.toUpperCase()}</div></div>
              <div><div className="t-label-muted">DUE</div><div className="t-heading" style={{ fontSize: 12 }}>{d.dueDate} · {d.dueTime}</div></div>
              <div><div className="t-label-muted">POINTS</div><div className="t-heading" style={{ fontSize: 12, color: 'var(--ink)' }}>+{d.points}</div></div>
            </div>

            {clarifyId === d.id ? (
              <div>
                <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>YOUR CLARIFICATION REQUEST</label>
                <textarea className="textarea" rows={3} value={clarifyText}
                          onChange={e => setClarifyText(e.target.value)}
                          placeholder="Be specific — what's ambiguous? What's your read, and where does it break down?" />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setClarifyId(null)}>CANCEL</button>
                  <button className="btn btn-primary" disabled={clarifyText.length < 10}
                          style={{ opacity: clarifyText.length < 10 ? 0.4 : 1 }}
                          onClick={() => clarify(d)}>
                    <i className="fa-solid fa-paper-plane" /> SEND TO {from.name.split(' ')[0].toUpperCase()}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid var(--off-white-07)' }}>
                <button className="btn btn-ghost" onClick={() => setClarifyId(d.id)}>
                  <i className="fa-solid fa-comment-dots" /> REQUEST CLARIFICATION
                </button>
                <div style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={() => accept(d)}>
                  <i className="fa-solid fa-circle-check" /> ACCEPT DIRECTIVE
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { AssignDirectiveModal, LeadDirectivesPanel, DirectiveInbox });
