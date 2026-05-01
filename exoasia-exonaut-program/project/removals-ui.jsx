// ============================================================================
// Removal / Resignation workflow UI
//
// 4 role surfaces:
//   - ExonautResignCard       → lets exonaut submit / track resignation (Profile)
//   - LeadRemovalsPanel       → lead's inbox: exonaut resignations to endorse
//                                + history of their own initiated removals
//   - LeadEndorseModal        → modal used from LeadRoster row action
//   - CommanderRemovalsPage   → commander's approvals queue (endorsed → approved/denied)
//   - AdminRemovalsPage       → admin's execution queue (approved → executed)
// ============================================================================

// ---------- Helpers ----------
function RemovalStatusPill({ status }) {
  const meta = REMOVAL_STATUS_META[status] || { label: status, color: 'var(--off-white-68)', icon: 'fa-circle' };
  return (
    <span className="t-mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9, letterSpacing: '0.1em', fontWeight: 700,
      color: meta.color, padding: '3px 6px',
      background: 'color-mix(in oklab, currentColor 12%, transparent)',
      border: '1px solid ' + meta.color, borderRadius: 2,
    }}>
      <i className={'fa-solid ' + meta.icon} style={{ fontSize: 8 }} />
      {meta.label}
    </span>
  );
}

function relTime(ts) {
  if (!ts) return '—';
  const d = Date.now() - ts;
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return `${Math.floor(d / 60_000)}m ago`;
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RemovalRequestCard({ req, actions, accent = 'var(--amber)' }) {
  const user = USERS.find(u => u.id === req.userId);
  const lead = LEADS.find(l => l.id === req.leadId);
  const track = TRACKS.find(t => t.code === (user?.track));
  const reasonLabel = window.__removalStore.reasonLabel(req.reason);
  const sourceLabel = req.source === 'exonaut' ? 'RESIGNATION' : 'REMOVAL';

  return (
    <div className="card-panel" style={{ borderLeft: `2px solid ${accent}`, padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div className="t-mono" style={{ fontSize: 9, color: accent, letterSpacing: '0.15em', fontWeight: 700 }}>
          {sourceLabel} · {reasonLabel.toUpperCase()}
        </div>
        <RemovalStatusPill status={req.status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {user && <AvatarWithRing name={user.name} size={40} tier={user.tier} />}
        <div style={{ flex: 1 }}>
          <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0, margin: 0, color: 'var(--off-white)' }}>
            {user?.name || req.userId}
          </div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em', marginTop: 3 }}>
            {track?.short || '—'} · MGR {lead?.name || '—'} · Submitted {relTime(req.createdAt)}
          </div>
        </div>
      </div>

      {req.notes && (
        <div style={{ padding: '10px 12px', background: 'var(--off-white-07)', borderRadius: 2, marginBottom: 12 }}>
          <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 4 }}>NOTES</div>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', lineHeight: 1.5 }}>{req.notes}</div>
        </div>
      )}

      {req.endorsedAt && req.source === 'exonaut' && (
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-68)', letterSpacing: '0.06em', marginBottom: 6 }}>
          <i className="fa-solid fa-user-shield" style={{ marginRight: 6, color: 'var(--platinum)' }} />
          ENDORSED BY LEAD · {relTime(req.endorsedAt)}
          {req.endorseNote && <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--off-white-68)' }}>"{req.endorseNote}"</div>}
        </div>
      )}
      {req.reviewedAt && req.status !== 'denied' && (
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-68)', letterSpacing: '0.06em', marginBottom: 6 }}>
          <i className="fa-solid fa-tower-observation" style={{ marginRight: 6, color: 'var(--amber)' }} />
          APPROVED BY COMMANDER · {relTime(req.reviewedAt)}
          {req.reviewNote && <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--off-white-68)' }}>"{req.reviewNote}"</div>}
        </div>
      )}
      {req.status === 'denied' && (
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-68)', letterSpacing: '0.06em', marginBottom: 6 }}>
          <i className="fa-solid fa-ban" style={{ marginRight: 6, color: 'var(--red)' }} />
          DENIED · {relTime(req.reviewedAt)}
          {req.denyNote && <div style={{ marginTop: 4, fontStyle: 'italic' }}>"{req.denyNote}"</div>}
        </div>
      )}
      {req.executedAt && (
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--red)', letterSpacing: '0.06em', marginBottom: 6 }}>
          <i className="fa-solid fa-user-slash" style={{ marginRight: 6 }} />
          EXECUTED BY ADMIN · {relTime(req.executedAt)}
        </div>
      )}

      {actions && <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

// ---------- Shared modal frame ----------
function RemovalModal({ title, eyebrow, eyebrowColor = 'var(--amber)', onClose, children, primaryLabel, onPrimary, primaryDisabled, primaryColor = 'var(--red)' }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(520px, 100%)', padding: 0, borderColor: eyebrowColor, maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: eyebrowColor, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>{eyebrow}</div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>{title}</h2>
          <div onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--off-white-40)' }}>
            <i className="fa-solid fa-xmark" />
          </div>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Cancel</button>
          {onPrimary && (
            <button onClick={onPrimary} disabled={primaryDisabled} style={{
              padding: '9px 16px', background: primaryDisabled ? 'var(--off-white-15)' : primaryColor,
              border: 'none', borderRadius: 2, color: primaryDisabled ? 'var(--off-white-40)' : 'var(--deep-black)',
              cursor: primaryDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
            }}>{primaryLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================================================
// LEAD — endorse removal modal (invoked from LeadRoster row action)
// ========================================================================
function LeadEndorseModal({ user, onClose }) {
  const { profile } = useCurrentUserProfile();
  useCrownState();
  const crown = window.__crownStore.getUserCrown(profile.id);
  const leadSlot = LEADS.find(l => l.track === (crown?.trackCode || profile.trackCode)) || LEADS.find(l => l.id === 'lead-ais') || LEADS[0];
  const { endorseByLead } = useRemovals();
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const canSubmit = reason && notes.trim().length >= 20;

  function submit() {
    if (!canSubmit) return;
    endorseByLead({
      userId: user.id,
      leadId: leadSlot?.id || 'lead-ais',
      cohortId: getUserCohort(user.id),
      reason,
      notes: notes.trim(),
    });
    onClose();
  }

  return (
    <RemovalModal
      title={`Endorse Removal · ${user.name}`}
      eyebrow="LEAD · ENDORSE REMOVAL FOR CAUSE"
      eyebrowColor="var(--red)"
      primaryColor="var(--red)"
      primaryLabel="Endorse → Send to Commander"
      primaryDisabled={!canSubmit}
      onPrimary={submit}
      onClose={onClose}
    >
      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginBottom: 16, lineHeight: 1.5 }}>
        Endorsement goes to <strong style={{ color: 'var(--amber)' }}>Commander</strong> for approval. If approved, Platform Admin will execute the removal. All reasons must be documented.
      </div>

      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 8 }}>REASON *</div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
        {REMOVAL_REASONS.map(r => (
          <label key={r.id} style={{
            padding: '10px 12px', border: '1px solid ' + (reason === r.id ? 'var(--red)' : 'var(--off-white-15)'),
            borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
            background: reason === r.id ? 'rgba(230,60,60,0.08)' : 'transparent',
          }}>
            <input type="radio" name="rm-reason" checked={reason === r.id} onChange={() => setReason(r.id)} style={{ marginTop: 2, accentColor: 'var(--red)' }} />
            <div style={{ flex: 1 }}>
              <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, margin: 0, color: 'var(--off-white)' }}>{r.label}</div>
              <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', marginTop: 2 }}>{r.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
        JUSTIFICATION * <span style={{ color: notes.trim().length < 20 ? 'var(--red)' : 'var(--lime)' }}>({notes.trim().length}/20 min)</span>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
        placeholder="Document specific incidents, dates, remediation attempts, and witnesses if any…"
        style={{
          width: '100%', padding: 10, background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-display)',
          fontSize: 12, outline: 'none', resize: 'vertical',
        }} />
    </RemovalModal>
  );
}

// ========================================================================
// LEAD — inbox panel (separate page; sidebar link)
// Shows exonaut resignations awaiting lead endorsement + lead's initiated removals
// ========================================================================
function LeadRemovalsPanel() {
  const { profile } = useCurrentUserProfile();
  useCrownState();
  const crown = window.__crownStore.getUserCrown(profile.id);
  const removals = useRemovals();
  const leadSlot = LEADS.find(l => l.track === (crown?.trackCode || profile.trackCode)) || LEADS.find(l => l.id === 'lead-ais') || LEADS[0];
  const LEAD_ID = leadSlot?.id || 'lead-ais';
  const lead = LEADS.find(l => l.id === LEAD_ID);

  const myRequests = removals.all.filter(r => r.leadId === LEAD_ID);
  const awaitingMe = myRequests.filter(r => r.status === 'pending' && r.source === 'exonaut');
  const inFlight = myRequests.filter(r => r.status === 'endorsed' || r.status === 'approved');
  const terminal = myRequests.filter(r => r.status === 'denied' || r.status === 'executed');

  const [review, setReview] = React.useState(null); // { req, action: 'endorse' | 'deny' }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>MANAGER · REMOVAL ACTIONS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Removals & Resignations</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {awaitingMe.length} resignation{awaitingMe.length === 1 ? '' : 's'} awaiting your endorsement · {inFlight.length} in review pipeline
          </div>
        </div>
      </div>

      {/* Awaiting the Lead */}
      <h3 className="t-heading" style={{ fontSize: 14, margin: '0 0 10px 0', color: 'var(--amber)' }}>
        <i className="fa-solid fa-user-clock" style={{ marginRight: 8 }} />
        AWAITING YOUR ENDORSEMENT · {awaitingMe.length}
      </h3>
      {awaitingMe.length === 0 ? (
        <div className="card-panel" style={{ padding: 24, textAlign: 'center', marginBottom: 24 }}>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>Inbox empty. No exonaut resignations awaiting your review.</div>
        </div>
      ) : (
        awaitingMe.map(r => (
          <RemovalRequestCard key={r.id} req={r} accent="var(--amber)" actions={[
            <button key="endorse" className="btn btn-primary btn-sm" onClick={() => setReview({ req: r, action: 'endorse' })}>
              <i className="fa-solid fa-check" /> ENDORSE TO COMMANDER
            </button>,
            <button key="deny" className="btn btn-ghost btn-sm" onClick={() => setReview({ req: r, action: 'deny' })}>
              <i className="fa-solid fa-xmark" /> DENY
            </button>,
          ]} />
        ))
      )}

      {/* In-flight (endorsed by me or already approved) */}
      {inFlight.length > 0 && (
        <>
          <h3 className="t-heading" style={{ fontSize: 14, margin: '28px 0 10px 0', color: 'var(--lavender)' }}>
            <i className="fa-solid fa-hourglass-half" style={{ marginRight: 8 }} />
            IN REVIEW PIPELINE · {inFlight.length}
          </h3>
          {inFlight.map(r => (
            <RemovalRequestCard key={r.id} req={r} accent="var(--lavender)" />
          ))}
        </>
      )}

      {/* History */}
      {terminal.length > 0 && (
        <>
          <h3 className="t-heading" style={{ fontSize: 14, margin: '28px 0 10px 0', color: 'var(--off-white-68)' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 8 }} />
            HISTORY · {terminal.length}
          </h3>
          {terminal.map(r => (
            <RemovalRequestCard key={r.id} req={r} accent="var(--off-white-40)" />
          ))}
        </>
      )}

      {review && <LeadReviewModal req={review.req} action={review.action} onClose={() => setReview(null)} />}
    </div>
  );
}

function LeadReviewModal({ req, action, onClose }) {
  const { leadEndorse, leadDeny } = useRemovals();
  const [note, setNote] = React.useState('');
  const user = USERS.find(u => u.id === req.userId);
  const isEndorse = action === 'endorse';

  function submit() {
    if (isEndorse) leadEndorse(req.id, req.leadId, note.trim());
    else leadDeny(req.id, req.leadId, note.trim());
    onClose();
  }

  return (
    <RemovalModal
      title={`${isEndorse ? 'Endorse' : 'Deny'} Resignation · ${user?.name}`}
      eyebrow={isEndorse ? 'MANAGER · ENDORSE TO COMMANDER' : 'MANAGER · DENY RESIGNATION'}
      eyebrowColor={isEndorse ? 'var(--lime)' : 'var(--red)'}
      primaryColor={isEndorse ? 'var(--lime)' : 'var(--red)'}
      primaryLabel={isEndorse ? 'Endorse → Send to Commander' : 'Deny Resignation'}
      onPrimary={submit}
      onClose={onClose}
    >
      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginBottom: 12, lineHeight: 1.5 }}>
        {isEndorse
          ? 'Endorsement passes this to the Commander for approval, then to Admin for execution.'
          : 'Denying rejects the resignation. The exonaut will remain in the program; consider discussing in person first.'}
      </div>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
        {isEndorse ? 'ENDORSEMENT NOTE (OPTIONAL)' : 'DENIAL REASON'}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus
        placeholder={isEndorse ? 'Add context for the Commander…' : 'Explain why this resignation is being denied…'}
        style={{
          width: '100%', padding: 10, background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-display)',
          fontSize: 12, outline: 'none', resize: 'vertical',
        }} />
    </RemovalModal>
  );
}

// ========================================================================
// COMMANDER — approvals page
// Shows endorsed requests; commander approves or denies.
// ========================================================================
function CommanderRemovalsPage() {
  const removals = useRemovals();
  const [tab, setTab] = React.useState('endorsed');
  const [review, setReview] = React.useState(null); // { req, action }

  const awaiting = removals.endorsed;
  const approved = removals.approved;
  const denied = removals.denied;
  const executed = removals.executed;

  const list = tab === 'endorsed' ? awaiting
             : tab === 'approved' ? approved
             : tab === 'denied' ? denied : executed;

  const tabs = [
    { id: 'endorsed', label: 'Awaiting You',  count: awaiting.length, color: 'var(--amber)' },
    { id: 'approved', label: 'Approved',      count: approved.length, color: 'var(--lime)' },
    { id: 'denied',   label: 'Denied',        count: denied.length,   color: 'var(--off-white-40)' },
    { id: 'executed', label: 'Executed',      count: executed.length, color: 'var(--red)' },
  ];

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--red)' }}>COMMANDER · REMOVAL APPROVALS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Removals Queue</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {awaiting.length} endorsement{awaiting.length === 1 ? '' : 's'} awaiting your review. Approve to route to Platform Admin for execution.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--off-white-07)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 14px', background: 'transparent',
            border: 'none', borderBottom: '2px solid ' + (tab === t.id ? t.color : 'transparent'),
            color: tab === t.id ? t.color : 'var(--off-white-68)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 700,
            cursor: 'pointer',
          }}>{t.label.toUpperCase()} <span style={{ marginLeft: 6, opacity: 0.6 }}>{t.count}</span></button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card-panel" style={{ padding: 48, textAlign: 'center' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 10 }} />
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>No requests in this queue.</div>
        </div>
      ) : list.map(r => (
        <RemovalRequestCard key={r.id} req={r}
          accent={tab === 'endorsed' ? 'var(--amber)' : tab === 'approved' ? 'var(--lime)' : tab === 'executed' ? 'var(--red)' : 'var(--off-white-40)'}
          actions={tab === 'endorsed' ? [
            <button key="approve" className="btn btn-primary btn-sm" onClick={() => setReview({ req: r, action: 'approve' })}>
              <i className="fa-solid fa-check" /> APPROVE → ADMIN
            </button>,
            <button key="deny" className="btn btn-ghost btn-sm" onClick={() => setReview({ req: r, action: 'deny' })}>
              <i className="fa-solid fa-xmark" /> DENY
            </button>,
          ] : null}
        />
      ))}

      {review && <CommanderReviewModal req={review.req} action={review.action} onClose={() => setReview(null)} />}
    </div>
  );
}

function CommanderReviewModal({ req, action, onClose }) {
  const { approve, deny } = useRemovals();
  const [note, setNote] = React.useState('');
  const user = USERS.find(u => u.id === req.userId);
  const isApprove = action === 'approve';

  function submit() {
    if (isApprove) approve(req.id, 'commander', note.trim());
    else deny(req.id, 'commander', note.trim());
    onClose();
  }

  return (
    <RemovalModal
      title={`${isApprove ? 'Approve' : 'Deny'} · ${user?.name}`}
      eyebrow={isApprove ? 'COMMANDER · APPROVE → ROUTE TO ADMIN' : 'COMMANDER · DENY REQUEST'}
      eyebrowColor={isApprove ? 'var(--lime)' : 'var(--red)'}
      primaryColor={isApprove ? 'var(--lime)' : 'var(--red)'}
      primaryLabel={isApprove ? 'Approve → Send to Admin' : 'Deny Request'}
      onPrimary={submit}
      onClose={onClose}
    >
      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginBottom: 12, lineHeight: 1.5 }}>
        {isApprove
          ? 'Approval routes this to Platform Admin for execution. The exonaut remains active until Admin executes.'
          : 'Denying terminates this request. The exonaut remains in the program.'}
      </div>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
        {isApprove ? 'APPROVAL NOTE (OPTIONAL)' : 'DENIAL REASON'}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus
        placeholder={isApprove ? 'Note for Admin & audit trail…' : 'Reason for denial…'}
        style={{
          width: '100%', padding: 10, background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-display)',
          fontSize: 12, outline: 'none', resize: 'vertical',
        }} />
    </RemovalModal>
  );
}

// ========================================================================
// ADMIN — execution page
// Shows approved requests; admin runs final execution.
// ========================================================================
function AdminRemovalsPage() {
  const removals = useRemovals();
  const [tab, setTab] = React.useState('approved');
  const [confirming, setConfirming] = React.useState(null);

  const approved = removals.approved;
  const executed = removals.executed;
  const denied = removals.denied;
  const pipeline = [...removals.pending, ...removals.endorsed];

  const list = tab === 'approved' ? approved
             : tab === 'executed' ? executed
             : tab === 'denied' ? denied : pipeline;

  const tabs = [
    { id: 'approved', label: 'Ready to Execute', count: approved.length, color: 'var(--sky)' },
    { id: 'pipeline', label: 'In Pipeline',      count: pipeline.length, color: 'var(--lavender)' },
    { id: 'executed', label: 'Executed',         count: executed.length, color: 'var(--red)' },
    { id: 'denied',   label: 'Denied',           count: denied.length,   color: 'var(--off-white-40)' },
  ];

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>PLATFORM ADMIN · EXECUTE REMOVALS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Removals Execution</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {approved.length} commander-approved removal{approved.length === 1 ? '' : 's'} awaiting execution. Executing detaches the exonaut from their cohort across all views.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--off-white-07)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 14px', background: 'transparent',
            border: 'none', borderBottom: '2px solid ' + (tab === t.id ? t.color : 'transparent'),
            color: tab === t.id ? t.color : 'var(--off-white-68)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 700,
            cursor: 'pointer',
          }}>{t.label.toUpperCase()} <span style={{ marginLeft: 6, opacity: 0.6 }}>{t.count}</span></button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card-panel" style={{ padding: 48, textAlign: 'center' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 10 }} />
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)' }}>No requests in this queue.</div>
        </div>
      ) : list.map(r => (
        <RemovalRequestCard key={r.id} req={r}
          accent={r.status === 'approved' ? 'var(--sky)' : r.status === 'executed' ? 'var(--red)' : r.status === 'denied' ? 'var(--off-white-40)' : 'var(--lavender)'}
          actions={r.status === 'approved' ? [
            <button key="exec" className="btn btn-primary btn-sm" style={{ background: 'var(--red)', color: 'var(--deep-black)' }}
              onClick={() => setConfirming(r)}>
              <i className="fa-solid fa-user-slash" /> EXECUTE REMOVAL
            </button>,
          ] : null}
        />
      ))}

      {confirming && <AdminExecuteConfirm req={confirming} onClose={() => setConfirming(null)} />}
    </div>
  );
}

function AdminExecuteConfirm({ req, onClose }) {
  const { execute } = useRemovals();
  const user = USERS.find(u => u.id === req.userId);
  const [confirm, setConfirm] = React.useState('');
  const expected = (user?.name || '').trim();
  const canExecute = confirm.trim().toLowerCase() === expected.toLowerCase();

  return (
    <RemovalModal
      title="Execute Removal"
      eyebrow="PLATFORM ADMIN · FINAL ACTION · IRREVERSIBLE"
      eyebrowColor="var(--red)"
      primaryColor="var(--red)"
      primaryLabel="Execute Removal"
      primaryDisabled={!canExecute}
      onPrimary={() => { execute(req.id, 'admin'); onClose(); }}
      onClose={onClose}
    >
      <div style={{ padding: 14, background: 'rgba(230,60,60,0.08)', border: '1px solid var(--red)', borderRadius: 2, marginBottom: 14 }}>
        <div className="t-heading" style={{ fontSize: 13, color: 'var(--red)', margin: 0, letterSpacing: '0.04em' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} /> This action removes the exonaut from the cohort.
        </div>
        <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', marginTop: 6, lineHeight: 1.5 }}>
          <strong>{user?.name}</strong> will be detached from <strong>{(window.__cohortStore.getAll().find(c => c.id === req.cohortId) || {}).name}</strong>.
          They will no longer appear in rosters, cohort views, or leaderboards. The audit trail is preserved in the Executed tab.
        </div>
      </div>

      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
        TYPE THE EXONAUT'S NAME TO CONFIRM: <span style={{ color: 'var(--off-white)' }}>{expected}</span>
      </div>
      <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus
        placeholder={expected}
        style={{
          width: '100%', padding: 10, background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid ' + (canExecute ? 'var(--red)' : 'var(--off-white-15)'),
          borderRadius: 2, fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none',
        }} />
    </RemovalModal>
  );
}

// ========================================================================
// EXONAUT — resignation submission card (embed in Profile or Settings)
// ========================================================================
function ExonautResignCard() {
  const removals = useRemovals();
  const [showForm, setShowForm] = React.useState(false);
  const myId = (typeof ME !== 'undefined') ? ME.id : 'u1';
  const existing = removals.activeForUser(myId);

  // If there's an open request, show status instead of form
  if (existing) {
    const meta = REMOVAL_STATUS_META[existing.status];
    return (
      <div className="card-panel" style={{ borderLeft: `2px solid ${meta.color}`, padding: 18, marginBottom: 16 }}>
        <div className="t-mono" style={{ fontSize: 9, color: meta.color, letterSpacing: '0.15em', fontWeight: 700, marginBottom: 10 }}>
          <i className={'fa-solid ' + meta.icon} style={{ marginRight: 6 }} />
          RESIGNATION SUBMITTED · {meta.label}
        </div>
        <div className="t-heading" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, margin: '0 0 6px 0' }}>
          {existing.source === 'exonaut' ? 'Your resignation is in review' : 'A removal action is open for your account'}
        </div>
        <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.5, marginBottom: 10 }}>
          Reason: <strong>{window.__removalStore.reasonLabel(existing.reason)}</strong> · Submitted {relTime(existing.createdAt)}
        </div>
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-68)', letterSpacing: '0.08em', marginBottom: 12 }}>
          {existing.status === 'pending' && 'WAITING ON: MANAGER (LEAD)'}
          {existing.status === 'endorsed' && 'WAITING ON: COMMANDER'}
          {existing.status === 'approved' && 'WAITING ON: PLATFORM ADMIN (FINAL)'}
        </div>
        {existing.status === 'pending' && existing.source === 'exonaut' && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            if (confirm('Withdraw your resignation? You will remain in the program.')) {
              removals.withdrawByExonaut(existing.id, myId);
            }
          }}>
            <i className="fa-solid fa-rotate-left" /> WITHDRAW RESIGNATION
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="card-panel" style={{ padding: 18, marginBottom: 16, borderLeft: '2px solid var(--off-white-40)' }}>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 8 }}>
          PROGRAM EXIT
        </div>
        <div className="t-heading" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, margin: '0 0 6px 0' }}>
          Need to resign from the program?
        </div>
        <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.5, marginBottom: 12 }}>
          Submit a resignation to your Track Manager. They will endorse it to the Commander, and Platform Admin will finalize. You may withdraw while it is still pending.
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}>
          <i className="fa-solid fa-door-open" /> RESIGN FROM PROGRAM
        </button>
      </div>

      {showForm && <ExonautResignModal onClose={() => setShowForm(false)} />}
    </>
  );
}

function ExonautResignModal({ onClose }) {
  const { submitByExonaut } = useRemovals();
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const canSubmit = reason && notes.trim().length >= 20 && confirmed;
  const myId = (typeof ME !== 'undefined') ? ME.id : 'u1';
  const me = USERS.find(u => u.id === myId) || { track: 'ais', cohort: 'c2627' };
  const myLead = LEADS.find(l => l.track === me.track) || LEADS[0];

  function submit() {
    if (!canSubmit) return;
    submitByExonaut({
      userId: myId, cohortId: getUserCohort(myId), leadId: myLead?.id,
      reason, notes: notes.trim(),
    });
    onClose();
  }

  return (
    <RemovalModal
      title="Submit Resignation"
      eyebrow="EXONAUT · PROGRAM EXIT REQUEST"
      eyebrowColor="var(--lavender)"
      primaryColor="var(--lavender)"
      primaryLabel="Submit to Manager"
      primaryDisabled={!canSubmit}
      onPrimary={submit}
      onClose={onClose}
    >
      <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginBottom: 14, lineHeight: 1.5 }}>
        Your resignation goes to <strong style={{ color: 'var(--platinum)' }}>{myLead?.name}</strong> (your Track Manager) for endorsement, then Commander, then Admin for final execution.
      </div>

      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 8 }}>REASON *</div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
        {RESIGN_REASONS.map(r => (
          <label key={r.id} style={{
            padding: '10px 12px', border: '1px solid ' + (reason === r.id ? 'var(--lavender)' : 'var(--off-white-15)'),
            borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
            background: reason === r.id ? 'rgba(180,160,230,0.08)' : 'transparent',
          }}>
            <input type="radio" name="resign-reason" checked={reason === r.id} onChange={() => setReason(r.id)} style={{ marginTop: 2, accentColor: 'var(--lavender)' }} />
            <div style={{ flex: 1 }}>
              <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, margin: 0, color: 'var(--off-white)' }}>{r.label}</div>
              <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', marginTop: 2 }}>{r.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
        MESSAGE TO MANAGER * <span style={{ color: notes.trim().length < 20 ? 'var(--red)' : 'var(--lime)' }}>({notes.trim().length}/20 min)</span>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
        placeholder="Share context so your Manager understands your decision…"
        style={{
          width: '100%', padding: 10, background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-display)',
          fontSize: 12, outline: 'none', resize: 'vertical', marginBottom: 12,
        }} />

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: 10, background: 'var(--off-white-07)', borderRadius: 2 }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--lavender)' }} />
        <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-68)', lineHeight: 1.45 }}>
          I understand that once executed by Admin, I will lose access to cohort resources, my leaderboard standing, and all in-program benefits. I can withdraw while my request is still pending.
        </div>
      </label>
    </RemovalModal>
  );
}

Object.assign(window, {
  RemovalStatusPill, RemovalRequestCard, RemovalModal,
  LeadEndorseModal, LeadRemovalsPanel, LeadReviewModal,
  CommanderRemovalsPage, CommanderReviewModal,
  AdminRemovalsPage, AdminExecuteConfirm,
  ExonautResignCard, ExonautResignModal,
});
