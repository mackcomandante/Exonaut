// Resignation Protocol UI.
// Uses the existing removal_requests store/table, but the user-facing workflow is:
// Exonaut starts protocol -> Sir Mack call -> turnover plan -> Sir Mack final signal.

const RESIGNATION_BOOKING_URL = 'https://link.gamechangerfunnel.com/widget/booking/L6l6siGhUd4ras8fMWHd';

function relTime(ts) {
  if (!ts) return 'just now';
  const diff = Date.now() - Number(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function resignationStatusMeta(status) {
  return (window.REMOVAL_STATUS_META || {})[status] || { label: status, color: 'var(--off-white-68)', icon: 'fa-circle' };
}

function parseTurnoverPlan(req) {
  try {
    const parsed = JSON.parse(req?.endorseNote || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function profileNameFor(userId, profiles = []) {
  const p = (profiles || []).find(item => item.id === userId);
  const u = (typeof USERS !== 'undefined' ? USERS : []).find(item => item.id === userId);
  return p?.fullName || p?.email || u?.name || userId || 'Exonaut';
}

function ResignationStatusPill({ status }) {
  const meta = resignationStatusMeta(status);
  return (
    <span className="t-mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9, letterSpacing: '0.1em', fontWeight: 800,
      color: meta.color, padding: '4px 7px',
      background: 'color-mix(in srgb, currentColor 12%, transparent)',
      border: '1px solid ' + meta.color, borderRadius: 4,
      textTransform: 'uppercase',
    }}>
      <i className={'fa-solid ' + meta.icon} style={{ fontSize: 8 }} />
      {meta.label}
    </span>
  );
}

function ResignationProtocolSteps({ current }) {
  const steps = [
    { id: 'pending', label: 'Book call' },
    { id: 'endorsed', label: 'Turnover plan' },
    { id: 'approved', label: 'Final signal' },
    { id: 'executed', label: 'Exit approved' },
  ];
  const order = { pending: 0, endorsed: 1, approved: 2, executed: 3, denied: -1 };
  const idx = order[current] ?? 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, margin: '14px 0' }}>
      {steps.map((step, i) => (
        <div key={step.id} className="card-flat" style={{
          padding: '9px 10px',
          borderColor: current === 'denied' ? 'var(--off-white-15)' : (i <= idx ? 'var(--accent)' : 'var(--off-white-15)'),
          opacity: current === 'denied' && i > 0 ? 0.45 : 1,
        }}>
          <div className="t-mono" style={{ fontSize: 8, color: i <= idx && current !== 'denied' ? 'var(--accent)' : 'var(--off-white-40)', letterSpacing: '0.08em' }}>
            STEP {i + 1}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: 'var(--off-white)', marginTop: 3 }}>
            {step.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProtocolNotice() {
  return (
    <div className="card-flat" style={{ padding: 14, marginBottom: 14, borderColor: 'var(--lavender)' }}>
      <div className="t-heading" style={{ fontSize: 13, color: 'var(--lavender)', margin: '0 0 6px' }}>
        <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
        This starts the protocol. It does not finalize your resignation.
      </div>
      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.55 }}>
        The official first step is booking a call with Sir Mack to discuss your reasons and concerns. If Sir Mack confirms the reason is valid, you will submit an updated resignation email and turnover proposal before waiting for his final signal.
      </div>
    </div>
  );
}

function ExonautResignCard() {
  const { profile } = useCurrentUserProfile();
  const removals = useRemovals();
  const [showForm, setShowForm] = React.useState(false);
  const myId = profile.id || ME_ID;
  const existing = removals.activeForUser(myId);

  if (existing) return <ExonautResignationTracker req={existing} profile={profile} />;

  return (
    <>
      <div className="card-panel" style={{ padding: 18, marginBottom: 16, borderLeft: '2px solid var(--lavender)' }}>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--lavender)', letterSpacing: '0.15em', fontWeight: 800, marginBottom: 8 }}>
          PROGRAM EXIT
        </div>
        <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0, margin: '0 0 6px' }}>
          Considering resignation?
        </div>
        <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.55, marginBottom: 12 }}>
          Start the official resignation protocol here. The first required step is booking a call with Sir Mack.
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}>
          <i className="fa-solid fa-door-open" /> START RESIGNATION PROTOCOL
        </button>
      </div>
      {showForm && <ExonautResignModal onClose={() => setShowForm(false)} />}
    </>
  );
}

function ExonautResignationTracker({ req, profile }) {
  const removals = useRemovals();
  const meta = resignationStatusMeta(req.status);
  const turnover = parseTurnoverPlan(req);
  return (
    <div className="card-panel" style={{ borderLeft: `2px solid ${meta.color}`, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div className="t-mono" style={{ fontSize: 9, color: meta.color, letterSpacing: '0.15em', fontWeight: 800 }}>
          <i className={'fa-solid ' + meta.icon} style={{ marginRight: 6 }} />
          RESIGNATION PROTOCOL
        </div>
        <ResignationStatusPill status={req.status} />
      </div>

      <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0, margin: '0 0 6px' }}>
        {req.status === 'pending' && 'Awaiting your call with Sir Mack'}
        {req.status === 'endorsed' && 'Turnover plan required'}
        {req.status === 'approved' && 'Awaiting Sir Mack final signal'}
        {req.status === 'denied' && 'Closed - continuing program'}
        {req.status === 'executed' && 'Final exit approved'}
      </div>
      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.55 }}>
        Reason: <strong>{window.__removalStore.reasonLabel(req.reason)}</strong> · Started {relTime(req.createdAt)}
      </div>
      <ResignationProtocolSteps current={req.status} />

      {req.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn-primary btn-sm" href={RESIGNATION_BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <i className="fa-solid fa-calendar-check" /> BOOK CALL WITH SIR MACK
          </a>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            if (!confirm('Withdraw your resignation protocol request?')) return;
            try { await removals.withdrawByExonaut(req.id, profile.id || ME_ID); }
            catch (err) { alert(err?.message || 'Could not withdraw request.'); }
          }}>
            <i className="fa-solid fa-rotate-left" /> WITHDRAW
          </button>
        </div>
      )}

      {req.status === 'endorsed' && <TurnoverPlanForm req={req} profile={profile} />}

      {req.status === 'approved' && (
        <div className="card-flat" style={{ padding: 14, marginTop: 12 }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--sky)', letterSpacing: '0.1em', fontWeight: 800, marginBottom: 6 }}>
            TURNOVER PLAN SUBMITTED
          </div>
          <TurnoverPlanSummary plan={turnover} />
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 10 }}>
            Wait for Sir Mack's final signal before fully leaving the company/program.
          </div>
        </div>
      )}

      {req.status === 'denied' && req.denyNote && (
        <div className="card-flat" style={{ padding: 12, marginTop: 12 }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>SIR MACK NOTE</div>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>{req.denyNote}</div>
        </div>
      )}
    </div>
  );
}

function TurnoverPlanForm({ req, profile }) {
  const removals = useRemovals();
  const { profiles } = useUserProfiles();
  const rows = typeof useSupabaseExonautRows === 'function' ? useSupabaseExonautRows() : [];
  const candidates = rows
    .filter(u => u.id !== (profile.id || ME_ID))
    .sort((a, b) => a.name.localeCompare(b.name));
  const [emailSent, setEmailSent] = React.useState(false);
  const [handoffUserId, setHandoffUserId] = React.useState('');
  const [turnoverNotes, setTurnoverNotes] = React.useState('');
  const [finalWorkingDate, setFinalWorkingDate] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const selected = candidates.find(u => u.id === handoffUserId);
  const canSubmit = emailSent && handoffUserId && turnoverNotes.trim().length >= 20;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      await removals.submitTurnoverPlan(req.id, profile.id || ME_ID, {
        emailSent,
        handoffUserId,
        handoffName: selected?.name || profileNameFor(handoffUserId, profiles),
        turnoverNotes: turnoverNotes.trim(),
        finalWorkingDate,
      });
    } catch (err) {
      alert(err?.message || 'Could not submit turnover plan.');
      setBusy(false);
    }
  }

  return (
    <div className="card-flat" style={{ padding: 14, marginTop: 12, borderColor: 'var(--lavender)' }}>
      {req.denyNote && (
        <div style={{ padding: 10, border: '1px solid var(--amber)', background: 'rgba(244,197,66,0.08)', borderRadius: 4, marginBottom: 12 }}>
          <div className="t-mono" style={{ fontSize: 8, color: 'var(--amber)', letterSpacing: '0.1em', marginBottom: 4 }}>CHANGES REQUESTED</div>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)' }}>{req.denyNote}</div>
        </div>
      )}
      <div className="t-heading" style={{ fontSize: 14, margin: '0 0 10px' }}>Submit turnover plan</div>
      <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={emailSent} onChange={event => setEmailSent(event.target.checked)} style={{ marginTop: 2, accentColor: 'var(--lavender)' }} />
        <span className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>
          I have sent my updated resignation email to Sir Mack.
        </span>
      </label>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>PROPOSED HANDOFF EXONAUT</div>
      <select className="input" value={handoffUserId} onChange={event => setHandoffUserId(event.target.value)} style={{ marginBottom: 12 }}>
        <option value="">Select Exonaut</option>
        {candidates.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
        PROJECTS / TASKS TURNOVER NOTES <span style={{ color: turnoverNotes.trim().length < 20 ? 'var(--red)' : 'var(--lime)' }}>({turnoverNotes.trim().length}/20 min)</span>
      </div>
      <textarea className="textarea" rows={4} value={turnoverNotes} onChange={event => setTurnoverNotes(event.target.value)}
        placeholder="List current projects, open tasks, links, context, and what the handoff Exonaut needs to continue." style={{ marginBottom: 12 }} />
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>FINAL WORKING DATE (OPTIONAL)</div>
      <input className="input" type="date" value={finalWorkingDate} onChange={event => setFinalWorkingDate(event.target.value)} style={{ marginBottom: 12 }} />
      <button className="btn btn-primary btn-sm" disabled={!canSubmit || busy} onClick={submit}>
        <i className={'fa-solid ' + (busy ? 'fa-spinner fa-spin' : 'fa-paper-plane')} /> SUBMIT TURNOVER PLAN
      </button>
    </div>
  );
}

function TurnoverPlanSummary({ plan }) {
  return (
    <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.55 }}>
      <div>Email sent: <strong>{plan.emailSent ? 'Yes' : 'No'}</strong></div>
      <div>Handoff Exonaut: <strong>{plan.handoffName || plan.handoffUserId || 'Not specified'}</strong></div>
      {plan.finalWorkingDate && <div>Final working date: <strong>{plan.finalWorkingDate}</strong></div>}
      {plan.turnoverNotes && (
        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{plan.turnoverNotes}</div>
      )}
    </div>
  );
}

function ExonautResignModal({ onClose }) {
  const { profile } = useCurrentUserProfile();
  const { submitByExonaut } = useRemovals();
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [callBooked, setCallBooked] = React.useState(false);
  const [callDate, setCallDate] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const canSubmit = reason && callBooked && notes.trim().length >= 20 && confirmed;

  async function submit() {
    if (!canSubmit) return;
    try {
      const context = [
        callDate ? `Booked call: ${callDate}` : 'Booked call: confirmed',
        '',
        notes.trim(),
      ].join('\n');
      await submitByExonaut({
        userId: profile.id || ME_ID,
        cohortId: profile.cohortId || getUserCohort(profile.id || ME_ID),
        leadId: 'cmdr-mack',
        reason,
        notes: context,
      });
      onClose();
    } catch (err) {
      alert(err?.message || 'Could not start resignation protocol.');
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-body" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Start resignation protocol">
        <button className="modal-close" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
        <div className="t-label" style={{ color: 'var(--lavender)', marginBottom: 8 }}>EXONAUT · RESIGNATION PROTOCOL</div>
        <h2 className="t-title" style={{ fontSize: 28, margin: '0 0 12px' }}>Start Resignation Protocol</h2>
        <ProtocolNotice />
        <a className="btn btn-primary" href={RESIGNATION_BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', width: '100%', justifyContent: 'center', marginBottom: 12 }}>
          <i className="fa-solid fa-calendar-check" /> BOOK CALL WITH SIR MACK
        </a>
        <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={callBooked} onChange={event => setCallBooked(event.target.checked)} style={{ marginTop: 2, accentColor: 'var(--lavender)' }} />
          <span className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>I have booked a call with Sir Mack.</span>
        </label>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>CALL DATE / TIME (OPTIONAL)</div>
        <input className="input" value={callDate} onChange={event => setCallDate(event.target.value)} placeholder="Example: July 2, 2026, 3:00 PM" style={{ marginBottom: 12 }} />
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 8 }}>REASON *</div>
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          {(window.RESIGN_REASONS || []).map(r => (
            <label key={r.id} style={{
              padding: '10px 12px',
              border: '1px solid ' + (reason === r.id ? 'var(--lavender)' : 'var(--off-white-15)'),
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: reason === r.id ? 'rgba(180,160,230,0.08)' : 'transparent',
            }}>
              <input type="radio" name="resign-reason" checked={reason === r.id} onChange={() => setReason(r.id)} style={{ marginTop: 2, accentColor: 'var(--lavender)' }} />
              <div style={{ flex: 1 }}>
                <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, margin: 0 }}>{r.label}</div>
                <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', marginTop: 2 }}>{r.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
          CONTEXT FOR SIR MACK * <span style={{ color: notes.trim().length < 20 ? 'var(--red)' : 'var(--lime)' }}>({notes.trim().length}/20 min)</span>
        </div>
        <textarea className="textarea" value={notes} onChange={event => setNotes(event.target.value)} rows={4}
          placeholder="Briefly share your reasons and concerns so Sir Mack has context before the call." style={{ marginBottom: 12 }} />
        <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 14, cursor: 'pointer', padding: 10, background: 'var(--off-white-07)', borderRadius: 4 }}>
          <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} style={{ marginTop: 2, accentColor: 'var(--lavender)' }} />
          <span className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', lineHeight: 1.45 }}>
            I understand this only starts the protocol. I must wait for Sir Mack's final signal before fully leaving.
          </span>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>Start Protocol</button>
        </div>
      </div>
    </div>
  );
}

function CommanderRemovalsPage() {
  const removals = useRemovals();
  const [review, setReview] = React.useState(null);
  const active = [...removals.pending, ...removals.endorsed, ...removals.approved];
  const history = [...removals.denied, ...removals.executed];

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--lavender)' }}>COMMANDER · SIR MACK</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Resignation Protocol</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {active.length} active request{active.length === 1 ? '' : 's'} awaiting call review, turnover, or final signal.
          </div>
        </div>
      </div>

      <h3 className="t-heading" style={{ fontSize: 14, margin: '0 0 10px', color: 'var(--lavender)' }}>
        ACTIVE REQUESTS · {active.length}
      </h3>
      {active.length === 0 ? (
        <div className="card-panel" style={{ padding: 42, textAlign: 'center', marginBottom: 24 }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 10 }} />
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>No active resignation protocol requests.</div>
        </div>
      ) : active.map(req => (
        <CommanderResignationCard key={req.id} req={req} onAction={setReview} />
      ))}

      {history.length > 0 && (
        <>
          <h3 className="t-heading" style={{ fontSize: 14, margin: '28px 0 10px', color: 'var(--off-white-68)' }}>
            HISTORY · {history.length}
          </h3>
          {history.map(req => <CommanderResignationCard key={req.id} req={req} />)}
        </>
      )}

      {review && <CommanderProtocolModal data={review} onClose={() => setReview(null)} />}
    </div>
  );
}

function CommanderResignationCard({ req, onAction }) {
  const { profiles } = useUserProfiles();
  const name = profileNameFor(req.userId, profiles);
  const meta = resignationStatusMeta(req.status);
  const turnover = parseTurnoverPlan(req);
  return (
    <div className="card-panel" style={{ padding: 18, marginBottom: 12, borderLeft: '2px solid ' + meta.color }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <div className="t-heading" style={{ fontSize: 15, margin: 0, textTransform: 'none', letterSpacing: 0 }}>{name}</div>
            <ResignationStatusPill status={req.status} />
          </div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.07em', marginBottom: 10 }}>
            {window.__removalStore.reasonLabel(req.reason)} · Started {relTime(req.createdAt)}
          </div>
          {req.notes && (
            <div className="card-flat" style={{ padding: 12, marginBottom: 10 }}>
              <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>EXONAUT CONTEXT</div>
              <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{req.notes}</div>
            </div>
          )}
          {req.status === 'approved' && (
            <div className="card-flat" style={{ padding: 12, marginBottom: 10 }}>
              <div className="t-mono" style={{ fontSize: 8, color: 'var(--sky)', letterSpacing: '0.1em', marginBottom: 5 }}>TURNOVER PLAN</div>
              <TurnoverPlanSummary plan={turnover} />
            </div>
          )}
          {req.denyNote && req.status === 'endorsed' && (
            <div className="t-body" style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 10 }}>
              Changes requested: {req.denyNote}
            </div>
          )}
        </div>
        {onAction && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {req.status === 'pending' && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => onAction({ req, action: 'turnover' })}>
                  <i className="fa-solid fa-clipboard-list" /> REQUEST TURNOVER
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => onAction({ req, action: 'continue' })}>
                  <i className="fa-solid fa-circle-check" /> CLOSE - CONTINUE
                </button>
              </>
            )}
            {req.status === 'approved' && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => onAction({ req, action: 'final' })}>
                  <i className="fa-solid fa-check-double" /> APPROVE FINAL EXIT
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => onAction({ req, action: 'changes' })}>
                  <i className="fa-solid fa-pen" /> REQUEST CHANGES
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CommanderProtocolModal({ data, onClose }) {
  const { profile } = useCurrentUserProfile();
  const removals = useRemovals();
  const { profiles } = useUserProfiles();
  const [note, setNote] = React.useState('');
  const name = profileNameFor(data.req.userId, profiles);
  const copy = {
    turnover: {
      title: 'Request Turnover Plan',
      eyebrow: 'SIR MACK · VALID REASON',
      body: 'This confirms the reason can proceed. The Exonaut will be asked to send the resignation email and submit a turnover proposal.',
      button: 'Request Turnover Plan',
      color: 'var(--lavender)',
    },
    continue: {
      title: 'Close - Continue Program',
      eyebrow: 'SIR MACK · CALL OUTCOME',
      body: 'Close this request because the Exonaut will continue in the program.',
      button: 'Close Request',
      color: 'var(--off-white-68)',
    },
    final: {
      title: 'Approve Final Exit',
      eyebrow: 'SIR MACK · FINAL SIGNAL',
      body: 'This is the final signal. The Exonaut will be removed from active cohort views.',
      button: 'Approve Final Exit',
      color: 'var(--red)',
    },
    changes: {
      title: 'Request Turnover Changes',
      eyebrow: 'SIR MACK · TURNOVER REVIEW',
      body: 'Send the turnover plan back to the Exonaut for changes.',
      button: 'Request Changes',
      color: 'var(--amber)',
    },
  }[data.action];

  async function submit() {
    try {
      if (data.action === 'turnover') await removals.requestTurnoverPlan(data.req.id, profile.id, note.trim());
      if (data.action === 'continue') await removals.closeContinuing(data.req.id, profile.id, note.trim());
      if (data.action === 'final') await removals.approveFinalExit(data.req.id, profile.id, note.trim());
      if (data.action === 'changes') await removals.requestTurnoverChanges(data.req.id, profile.id, note.trim());
      onClose();
    } catch (err) {
      alert(err?.message || 'Could not update resignation request.');
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-body" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
        <div className="t-label" style={{ color: copy.color, marginBottom: 8 }}>{copy.eyebrow}</div>
        <h2 className="t-title" style={{ fontSize: 28, margin: '0 0 8px' }}>{copy.title}</h2>
        <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.55, marginBottom: 12 }}>
          {copy.body} Request for <strong>{name}</strong>.
        </div>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>NOTE</div>
        <textarea className="textarea" value={note} onChange={event => setNote(event.target.value)} rows={4}
          placeholder="Optional note for the audit trail and Exonaut." style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: copy.color }} onClick={submit}>{copy.button}</button>
        </div>
      </div>
    </div>
  );
}

function LeadRemovalsPanel() {
  return (
    <div className="enter">
      <div className="card-panel" style={{ padding: 32 }}>
        <div className="t-label" style={{ marginBottom: 8 }}>RESIGNATION PROTOCOL</div>
        <h1 className="t-title" style={{ fontSize: 34, margin: '0 0 10px' }}>Commander-only workflow</h1>
        <div className="t-body" style={{ color: 'var(--off-white-68)' }}>
          Resignations are handled directly by Sir Mack through the Commander queue.
        </div>
      </div>
    </div>
  );
}

function AdminRemovalsPage() {
  return <CommanderRemovalsPage />;
}

function RemovalStatusPill(props) { return <ResignationStatusPill {...props} />; }
function RemovalRequestCard() { return null; }
function RemovalModal() { return null; }
function LeadEndorseModal() { return null; }
function LeadReviewModal() { return null; }
function CommanderReviewModal() { return null; }
function AdminExecuteConfirm() { return null; }

Object.assign(window, {
  RemovalStatusPill, RemovalRequestCard, RemovalModal,
  LeadEndorseModal, LeadRemovalsPanel, LeadReviewModal,
  CommanderRemovalsPage, CommanderReviewModal,
  AdminRemovalsPage, AdminExecuteConfirm,
  ExonautResignCard, ExonautResignModal,
});
