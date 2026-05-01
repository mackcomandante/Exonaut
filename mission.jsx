// Mission detail screen with submit flow

function MissionDetail({ missionId, onBack, onSubmitted }) {
  const mission = MISSIONS.find(m => m.id === missionId) || MISSIONS[0];
  const subs = useSubs(); // reactive
  const mySub = getMySubmission(mission.id);
  const [file, setFile] = React.useState(null);
  const [note, setNote] = React.useState('');
  const [submitted, setSubmitted] = React.useState(
    !!mySub || mission.status === 'approved' || mission.status === 'submitted'
  );
  const [showSubmit, setShowSubmit] = React.useState(false);
  const fileInputRef = React.useRef();

  // keep submitted flag in sync if store updates (e.g. lead grades it)
  React.useEffect(() => { if (mySub) setSubmitted(true); }, [subs]);

  const track = mission.track ? TRACKS.find(t => t.code === mission.track) : null;
  const statusMap = {
    'not-started': { cls: 'status-not-started', label: 'NOT STARTED' },
    'in-progress': { cls: 'status-in-progress', label: 'IN PROGRESS' },
    'submitted':   { cls: 'status-submitted',   label: 'SUBMITTED · AWAITING REVIEW' },
    'approved':    { cls: 'status-approved',    label: 'APPROVED' },
  };
  const currentStatus = submitted ? statusMap.submitted : statusMap[mission.status];
  const st = mission.status === 'approved' ? statusMap.approved : currentStatus;

  const handleFile = (f) => { if (f) setFile({ name: f.name, size: (f.size / 1024).toFixed(1) + ' KB' }); };

  const handleSubmit = () => {
    submitDeliverable({
      missionId: mission.id,
      missionTitle: mission.title,
      fileName: file?.name || 'deliverable.pdf',
      note,
    });
    setSubmitted(true);
    setShowSubmit(false);
    onSubmitted?.(mission);
  };

  // Show Lead's grade/feedback if present
  const effectiveFeedback = mySub?.feedback || mission.feedback;
  const effectiveGrade = mySub?.grade || mission.grade;
  const effectiveStatus = mySub?.state === 'needs-revision'
    ? { cls: 'status-in-progress', label: 'NEEDS REVISION · RESUBMIT ONCE' }
    : mySub?.state === 'approved'
      ? statusMap.approved
      : st;

  return (
    <div className="enter" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
      <div>
        {/* Hero */}
        <div className="mission-hero card-hud">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}>
              <i className="fa-solid fa-arrow-left" /> BACK
            </button>
            <span className={'status-pill ' + effectiveStatus.cls}>{effectiveStatus.label}</span>
          </div>
          <div className="mission-id-big">{mission.id}</div>
          <h1 className="mission-title-big">{mission.title}</h1>
          <div className="mission-meta-strip">
            <span><span className="k">TRACK</span><span className="v-lime">{track?.short || 'ALL-COHORT'}</span></span>
            <span><span className="k">PILLAR</span><span className="v-lime">{mission.pillar.toUpperCase()}</span></span>
            <span><span className="k">POINTS</span><span className="v-lime">+{mission.points}</span></span>
            <span><span className="k">DUE</span>{mission.dueDate} · {mission.dueTime || '23:59 SGT'}</span>
            <span><span className="k">DELIVERABLE</span>{mission.deliverable?.toUpperCase()}</span>
          </div>
        </div>

        {/* Brief */}
        <div className="brief-body" style={{ marginBottom: 20 }}>
          <strong>Mission Brief</strong>
          {(mission.description || 'Full brief will be attached by your Mission Lead.').split('\n').map((p, i) =>
            p.startsWith('•')
              ? <div key={i} style={{ paddingLeft: 16, marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: p }} />
              : <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
          )}
          {mission.criteria && (
            <>
              <strong>Grading Criteria</strong>
              <ul>{mission.criteria.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </>
          )}
        </div>

        {/* Prospect grid — only for the 10-concept-papers mission */}
        {mission.id === 'EXO-MSN-ALL-2026-010' && <ProspectGrid />}

        {/* Feedback (if approved or needs-revision) */}
        {effectiveFeedback && (
          <div className="card-panel" style={{
            borderColor: mySub?.state === 'needs-revision' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)',
            background: mySub?.state === 'needs-revision' ? 'rgba(245,158,11,0.04)' : 'rgba(34,197,94,0.04)',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <i className="fa-solid fa-comment-dots" style={{ color: mySub?.state === 'needs-revision' ? 'var(--amber)' : 'var(--green)' }} />
              <span className="t-label" style={{ color: mySub?.state === 'needs-revision' ? 'var(--amber)' : 'var(--green)' }}>MISSION LEAD FEEDBACK</span>
              <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginLeft: 'auto' }}>GRADE · {effectiveGrade?.toUpperCase().replace('-', ' ')}</span>
            </div>
            <div className="t-body" style={{ color: 'var(--off-white)' }}>{effectiveFeedback}</div>
            {mySub?.pointsAwarded != null && (
              <div className="t-mono" style={{ marginTop: 12, fontSize: 11, color: 'var(--ink)', letterSpacing: '0.1em' }}>
                +{mySub.pointsAwarded} BONUS PTS AWARDED
              </div>
            )}
          </div>
        )}

        {/* Submit zone */}
        {!effectiveFeedback && (
          <div className="card-panel">
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>{submitted ? 'Your Submission' : 'Submit Deliverable'}</h2>
              <span className="section-meta">{mission.deliverable?.toUpperCase()} · MAX 1 REVISION</span>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <i className="fa-solid fa-check-to-slot" style={{ fontSize: 32, color: 'var(--platinum)', marginBottom: 12 }} />
                <div className="t-heading" style={{ fontSize: 16, marginBottom: 4 }}>Submission Received</div>
                <div className="t-body" style={{ fontSize: 14, marginBottom: 16 }}>
                  Your Mission Lead has <span style={{ color: 'var(--ink)' }}>48 hours</span> to review. You'll get a notification the moment it's graded.
                </div>
                <div className="file-attached" style={{ maxWidth: 420, margin: '0 auto' }}>
                  <i className="fa-solid fa-file-lines f-icon" />
                  <div className="f-name">{file?.name || mySub?.fileName || 'kestrel-competitive-landscape.pdf'}</div>
                  <div className="f-size">{file?.size || '412 KB'}</div>
                </div>
                <div className="t-mono" style={{ marginTop: 14, fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>
                  VISIBLE TO · DR. NADIA OYELARAN · MISSION LEAD · AI-STRAT
                </div>
              </div>
            ) : (
              <>
                {file ? (
                  <div className="file-attached">
                    <i className="fa-solid fa-file-lines f-icon" />
                    <div className="f-name">{file.name}</div>
                    <div className="f-size">{file.size}</div>
                    <i className="fa-solid fa-xmark f-remove" onClick={() => setFile(null)} />
                  </div>
                ) : (
                  <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
                    <div className="dz-icon"><i className="fa-solid fa-cloud-arrow-up" /></div>
                    <div className="dz-title">Drop file or click to upload</div>
                    <div className="dz-sub">PDF · DOCX · MD · MAX 25MB</div>
                    <input ref={fileInputRef} type="file" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <label className="t-label-muted" style={{ display: 'block', marginBottom: 8 }}>NOTE TO REVIEWER (OPTIONAL)</label>
                  <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything your Mission Lead should know?" />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost">SAVE DRAFT</button>
                  <button className="btn btn-primary" disabled={!file}
                    style={{ opacity: file ? 1 : 0.4, cursor: file ? 'pointer' : 'not-allowed' }}
                    onClick={handleSubmit}>
                    <i className="fa-solid fa-paper-plane" /> SUBMIT DELIVERABLE
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right column */}
      <div>
        <div className="card-panel" style={{ marginBottom: 16 }}>
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 14 }}>Point Potential</h2>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { k: 'On-time submission', v: mission.points, active: true },
              { k: 'Approved · Good', v: 10, active: false },
              { k: 'Approved · Excellent', v: 20, active: false },
              { k: 'Revision bonus', v: 5, active: false },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--off-white-07)' }}>
                <span style={{ fontSize: 11, color: row.active ? 'var(--off-white)' : 'var(--off-white-40)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{row.k}</span>
                <span style={{ fontSize: 12, color: row.active ? 'var(--lime)' : 'var(--off-white-40)', fontWeight: 700 }}>+{row.v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
              <span className="t-label">MAX POSSIBLE</span>
              <span style={{ fontSize: 18, color: 'var(--ink)', fontWeight: 700 }}>+{mission.points + 20}</span>
            </div>
          </div>
        </div>

        <div className="card-panel">
          <div className="t-label" style={{ marginBottom: 12 }}>MISSION LEAD</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AvatarWithRing name="Mack Comandante" size={40} tier="corps" />
            <div>
              <div className="t-heading" style={{ fontSize: 13 }}>Mack Comandante</div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em' }}>FOUNDER · AI STRATEGY LEAD</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}>
            <i className="fa-solid fa-message" /> MESSAGE LEAD
          </button>
        </div>

        {/* XO Intelligence AI copilot */}
        <XOCopilot mission={mission} />
      </div>
    </div>
  );
}

Object.assign(window, { MissionDetail });

// ============================================================================
// Inline Submit Card — reusable deliverable uploader (used in MissionsList)
// ============================================================================
function InlineSubmitCard({ missionId, compact = false }) {
  const mission = MISSIONS.find(m => m.id === missionId);
  if (!mission) return null;
  const subs = useSubs();
  const mySub = getMySubmission(mission.id);
  const [file, setFile] = React.useState(null);
  const [note, setNote] = React.useState('');
  const [submitted, setSubmitted] = React.useState(!!mySub || mission.status === 'approved' || mission.status === 'submitted');
  const fileInputRef = React.useRef();

  React.useEffect(() => { if (mySub) setSubmitted(true); }, [subs]);

  const handleFile = (f) => { if (f) setFile({ name: f.name, size: (f.size / 1024).toFixed(1) + ' KB' }); };
  const handleSubmit = () => {
    submitDeliverable({
      missionId: mission.id,
      missionTitle: mission.title,
      fileName: file?.name || 'deliverable.pdf',
      note,
    });
    setSubmitted(true);
  };

  const effectiveFeedback = mySub?.feedback || mission.feedback;
  const effectiveGrade = mySub?.grade || mission.grade;

  // If already graded, show compact graded state
  if (effectiveFeedback) {
    return (
      <div className="submit-inline-card graded">
        <div className="section-head" style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, margin: 0 }}>
            <i className="fa-solid fa-circle-check" style={{ color: 'var(--lime)', marginRight: 8 }} />
            Graded · +{effectiveGrade || mission.points} pts
          </h3>
          <span className="section-meta">{mission.deliverable?.toUpperCase()}</span>
        </div>
        <div className="t-body" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>
          {effectiveFeedback}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="submit-inline-card submitted">
        <div className="section-head" style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, margin: 0 }}>
            <i className="fa-solid fa-paper-plane" style={{ color: 'var(--sky)', marginRight: 8 }} />
            Submitted · Awaiting Review
          </h3>
          <span className="section-meta">48H WINDOW</span>
        </div>
        <div className="file-attached" style={{ maxWidth: '100%', margin: 0 }}>
          <i className="fa-solid fa-file-lines f-icon" />
          <div className="f-name">{file?.name || mySub?.fileName || 'deliverable.pdf'}</div>
          <div className="f-size">{file?.size || '—'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="submit-inline-card">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Submit Deliverable</h3>
        <span className="section-meta">{mission.deliverable?.toUpperCase()} · MAX 1 REVISION</span>
      </div>

      {file ? (
        <div className="file-attached">
          <i className="fa-solid fa-file-lines f-icon" />
          <div className="f-name">{file.name}</div>
          <div className="f-size">{file.size}</div>
          <i className="fa-solid fa-xmark f-remove" onClick={() => setFile(null)} />
        </div>
      ) : (
        <div className="dropzone" onClick={() => fileInputRef.current?.click()} style={{ padding: compact ? 20 : 28 }}>
          <div className="dz-icon" style={{ fontSize: compact ? 22 : 28 }}><i className="fa-solid fa-cloud-arrow-up" /></div>
          <div className="dz-title" style={{ fontSize: compact ? 13 : 14 }}>Drop file or click to upload</div>
          <div className="dz-sub">PDF · DOCX · MD · MAX 25MB</div>
          <input ref={fileInputRef} type="file" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label className="t-label-muted" style={{ display: 'block', marginBottom: 6 }}>NOTE TO REVIEWER (OPTIONAL)</label>
        <textarea className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Anything your Mission Lead should know?" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm">SAVE DRAFT</button>
        <button className="btn btn-primary btn-sm" disabled={!file}
          style={{ opacity: file ? 1 : 0.4, cursor: file ? 'pointer' : 'not-allowed' }}
          onClick={handleSubmit}>
          <i className="fa-solid fa-paper-plane" /> SUBMIT DELIVERABLE
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { InlineSubmitCard });

// ============================================================================
// Prospect Grid — 10 prospect cards for the Concept Papers mission
// ============================================================================

function ProspectGrid() {
  const [openId, setOpenId] = React.useState(null);
  const drafted = PROSPECTS.filter(p => p.status === 'paper-drafted').length;
  const pending = PROSPECTS.length - drafted;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="t-label" style={{ color: 'var(--ink)', marginBottom: 4 }}>YOUR 10 PROSPECTS · 1 CONCEPT PAPER EACH</div>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-40)' }}>
            Click a card to edit contact info, pains, deliverable, and notes.
          </div>
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-68)', letterSpacing: '0.08em' }}>
          <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{drafted}</span> DRAFTED · <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{pending}</span> TO GO
        </div>
      </div>

      {/* progress bar */}
      <div style={{ height: 4, background: 'var(--off-white-07)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: (drafted / PROSPECTS.length * 100) + '%', background: 'var(--lime)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {PROSPECTS.map((p, i) => (
          <ProspectCard key={p.id} p={p} idx={i} open={openId === p.id}
            onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
        ))}
        <AddProspectCard idx={PROSPECTS.length} />
      </div>
    </div>
  );
}

function AddProspectCard({ idx }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card-panel"
      style={{
        padding: 0,
        borderStyle: 'dashed',
        borderColor: hovered ? 'var(--lime)' : 'var(--off-white-15)',
        background: hovered ? 'rgba(201,229,0,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
        minHeight: 74,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'center', width: '100%', padding: '14px 16px' }}>
        <div className="t-mono" style={{
          fontSize: 11, fontWeight: 700,
          color: hovered ? 'var(--ink)' : 'var(--off-white-40)',
          width: 30, height: 30, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px dashed ' + (hovered ? 'var(--lime)' : 'var(--off-white-15)'),
          background: hovered ? 'rgba(201,229,0,0.1)' : 'transparent',
        }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0, margin: 0, color: hovered ? 'var(--off-white)' : 'var(--off-white-68)' }}>Add new prospect</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 3, letterSpacing: '0.04em' }}>
            SLOT {String(idx + 1).padStart(2, '0')} · CONTACT · INDUSTRY · 3 PAINS
          </div>
        </div>
        <span className="t-mono" style={{ fontSize: 9, color: hovered ? 'var(--ink)' : 'var(--off-white-40)', letterSpacing: '0.08em', fontWeight: 700 }}>
          + PROSPECT
        </span>
      </div>
    </div>
  );
}

function ProspectCard({ p, idx, open, onToggle }) {
  const drafted = p.status === 'paper-drafted';
  const meetingBadge = {
    completed: { label: 'MEETING DONE', color: 'var(--green)' },
    booked:    { label: 'MEETING BOOKED', color: 'var(--ink)' },
    pending:   { label: 'AWAITING REPLY', color: 'var(--amber)' },
    none:      { label: 'NOT CONTACTED', color: 'var(--off-white-40)' },
  }[p.meetingStatus] || { label: '—', color: 'var(--off-white-40)' };

  return (
    <div className="card-panel" style={{
      padding: 0,
      borderColor: drafted ? 'rgba(201,229,0,0.2)' : 'var(--off-white-15)',
      background: drafted ? 'rgba(201,229,0,0.02)' : 'transparent',
      gridColumn: open ? 'span 2' : 'span 1',
      transition: 'grid-column 0.2s',
    }}>
      {/* header (clickable) */}
      <div onClick={onToggle} style={{ padding: '14px 16px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'center' }}>
        <div className="t-mono" style={{
          fontSize: 11, fontWeight: 700, color: drafted ? 'var(--ink)' : 'var(--off-white-40)',
          width: 30, height: 30, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid ' + (drafted ? 'var(--lime)' : 'var(--off-white-15)'),
          background: drafted ? 'rgba(201,229,0,0.1)' : 'transparent',
        }}>
          {drafted ? <i className="fa-solid fa-check" style={{ fontSize: 11 }} /> : String(idx + 1).padStart(2, '0')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.company}</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 3, letterSpacing: '0.04em' }}>
            {p.contact.toUpperCase()} · {p.industry.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className="t-mono" style={{ fontSize: 9, color: meetingBadge.color, letterSpacing: '0.08em', fontWeight: 700 }}>{meetingBadge.label}</span>
          {drafted && <span className="t-mono" style={{ fontSize: 9, color: 'var(--ink)', letterSpacing: '0.08em', fontWeight: 700 }}>PAPER · {p.paperStatus.toUpperCase()}</span>}
          {!drafted && <span className="t-mono" style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: '0.08em', fontWeight: 700 }}>PAPER PENDING</span>}
        </div>
      </div>

      {/* expanded body */}
      {open && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--off-white-07)' }}>
          {/* contact info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--off-white-07)' }}>
            <ProspectField label="CONTACT" value={p.contact + ' · ' + p.position} />
            <ProspectField label="INDUSTRY" value={p.industry} />
            <ProspectField label="EMAIL" value={p.email} icon="fa-envelope" mono />
            <ProspectField label="MOBILE" value={p.mobile} icon="fa-phone" mono />
            <ProspectField label="LINKEDIN" value={p.linkedin} icon="fa-brands fa-linkedin" mono link />
            <ProspectField label="INVESTMENT RANGE" value={p.investmentRange} mono />
          </div>

          {/* pain points */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--off-white-07)' }}>
            <div className="t-label-muted" style={{ marginBottom: 10, fontSize: 10 }}>3 PAIN POINTS</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {p.pains.map((pain, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 8, alignItems: 'flex-start' }}>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, marginTop: 3 }}>P{i + 1}</div>
                  <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', lineHeight: 1.5 }}>{pain}</div>
                </div>
              ))}
            </div>
          </div>

          {/* deliverable + next step */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--off-white-07)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="t-label-muted" style={{ marginBottom: 6, fontSize: 10 }}>PROPOSED DELIVERABLE</div>
              <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', lineHeight: 1.5 }}>{p.deliverable}</div>
            </div>
            <div>
              <div className="t-label-muted" style={{ marginBottom: 6, fontSize: 10 }}>NEXT STEP</div>
              <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', lineHeight: 1.5 }}>{p.nextStep}</div>
            </div>
          </div>

          {/* notes */}
          <div style={{ padding: '14px 0 4px' }}>
            <div className="t-label-muted" style={{ marginBottom: 6, fontSize: 10 }}>NOTES</div>
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', lineHeight: 1.5, fontStyle: 'italic' }}>{p.notes}</div>
          </div>

          {/* actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <i className="fa-solid fa-pen-to-square" /> EDIT PROSPECT
            </button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <i className="fa-solid fa-file-lines" /> {drafted ? 'OPEN PAPER' : 'START PAPER'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProspectField({ label, value, icon, mono, link }) {
  return (
    <div>
      <div className="t-label-muted" style={{ marginBottom: 4, fontSize: 9 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--off-white)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', textDecoration: link ? 'underline' : 'none', textDecorationColor: 'var(--off-white-15)' }}>
        {icon && <i className={'fa-solid ' + icon} style={{ color: 'var(--off-white-40)', fontSize: 10 }} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      </div>
    </div>
  );
}

Object.assign(window, { ProspectGrid });

// ============================================================================
// XO Intelligence — AI copilot for concept paper drafting + OSINT
// ============================================================================

const XO_QUICK_ACTIONS = [
  { id: 'draft',   icon: 'fa-file-pen',        label: 'Draft concept paper',  hint: 'Pick a prospect, XO drafts the 7-section paper.' },
  { id: 'osint',   icon: 'fa-magnifying-glass',label: 'OSINT scan',           hint: 'Recent news, hiring, product launches, press.' },
  { id: 'touch',   icon: 'fa-paper-plane',     label: 'Touchpoint idea',      hint: 'Article / insight to keep the relationship warm.' },
  { id: 'followup',icon: 'fa-reply',           label: 'Follow-up email',      hint: 'Post-meeting or paper-sent follow-up draft.' },
  { id: 'pain',    icon: 'fa-bullseye',        label: 'Sharpen pain points',  hint: 'Tighten 3 pain statements with business impact.' },
];

function XOCopilot({ mission }) {
  const [messages, setMessages] = React.useState([
    {
      role: 'xo',
      text: 'XO Intelligence online. I can draft concept papers, run OSINT on your 10 prospects, suggest warm touchpoints, or sharpen pain statements. Pick a quick action or ask me anything.',
    },
  ]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [selectedProspect, setSelectedProspect] = React.useState(PROSPECTS[0].id);
  const scrollRef = React.useRef();

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const prospect = PROSPECTS.find(p => p.id === selectedProspect);

  const callXO = async (userText, systemContext, label) => {
    setMessages(m => [...m, { role: 'user', text: userText }]);
    setBusy(true);
    try {
      const reply = await window.claude.complete({
        messages: [
          {
            role: 'user',
            content:
              'You are XO Intelligence, the in-app AI copilot for Exoasia interns. Tone: concise, senior, consultant-grade. No fluff. Use markdown headings and bullets. Max 300 words unless asked otherwise.\n\n' +
              'CITATIONS ARE MANDATORY. Every factual claim, statistic, framework reference, news item, or external insight MUST end with an inline citation in the format [^N]. After the main body, include a "### Sources" section listing each citation as:\n' +
              '[^N]: Publication / Org name — "Title of piece" — URL — (Month Year) — relevance note\n\n' +
              'RULES:\n' +
              '• If you do NOT have a verified source, say so explicitly: "No verified source — suggest: [where to check]"\n' +
              '• Never fabricate URLs. If uncertain, cite the outlet / domain only (e.g. "Reuters, ~Aug 2025") and flag it as "needs verification."\n' +
              '• Prefer primary sources (company press, SEC/MAS/BSP filings, founder interviews, official stats) over aggregators.\n' +
              '• Concept paper drafts do NOT need citations for the scope / timeline / investment sections — only for problem-statement claims and benchmarks.\n\n' +
              'CONTEXT:\n' + systemContext + '\n\nUSER REQUEST:\n' + userText,
          },
        ],
      });
      setMessages(m => [...m, { role: 'xo', text: reply, label: label || 'Response' }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'xo', text: '_(XO link dropped — try again)_' }]);
    }
    setBusy(false);
  };

  const runAction = (actionId) => {
    const ctx = [
      'Prospect: ' + prospect.company + ' (' + prospect.industry + ')',
      'Contact: ' + prospect.contact + ', ' + prospect.position,
      'Pain points: ' + prospect.pains.join(' | '),
      'Proposed deliverable: ' + prospect.deliverable,
      'Investment range: ' + prospect.investmentRange,
      'Meeting status: ' + prospect.meetingStatus,
      'Notes: ' + prospect.notes,
    ].join('\n');

    const prompts = {
      draft: 'Draft a 1–2 page concept paper for this prospect. Include the 7 required sections: Executive Summary, Problem Statement, Proposed Solution, Scope, Timeline, Expected Outcomes, Investment Range. Keep it client-centric and specific to their pains.',
      osint: 'Run an OSINT scan on ' + prospect.company + '. Return (a) recent public news / press in the last 6 months, (b) hiring signals indicating AI or data investment, (c) product or partnership announcements, (d) leadership moves. Flag any fresh hook we can use to re-engage ' + prospect.contact + '. If you don\'t have verified info, say so and suggest where to check.',
      touch: 'Suggest 3 warm touchpoint ideas to send ' + prospect.contact + ' this week — a relevant article, a benchmark/data point, or a useful framework — each tied to one of their pain points. Format: one-line subject + one-line body + why it lands.',
      followup: 'Draft a short follow-up email to ' + prospect.contact + ' at ' + prospect.company + '. Reference our last interaction and the concept paper. Keep under 120 words. Warm but direct. End with a specific next step.',
      pain: 'The three pain points below are close but could be sharper. Rewrite each to make the business impact quantifiable and the urgency obvious. Keep each under 18 words.\n\n' + prospect.pains.map((p, i) => (i + 1) + '. ' + p).join('\n'),
    };

    const labels = {
      draft: 'Draft concept paper for ' + prospect.company,
      osint: 'OSINT scan: ' + prospect.company,
      touch: 'Touchpoint ideas for ' + prospect.contact,
      followup: 'Follow-up email for ' + prospect.contact,
      pain: 'Sharpen pain points for ' + prospect.company,
    };

    callXO(labels[actionId], ctx + '\n\nTASK TYPE: ' + actionId + '\nINSTRUCTION: ' + prompts[actionId], labels[actionId]);
  };

  const onSend = () => {
    if (!input.trim() || busy) return;
    const q = input.trim();
    setInput('');
    const ctx = 'Current mission: ' + mission.title + '\nActive prospect in context: ' + prospect.company + ' (' + prospect.contact + ', ' + prospect.industry + ')';
    callXO(q, ctx, 'Q: ' + q.slice(0, 40));
  };

  return (
    <div className="card-panel" style={{
      marginTop: 16, padding: 0,
      borderColor: 'rgba(201,229,0,0.28)',
      background: 'linear-gradient(180deg, rgba(201,229,0,0.04) 0%, transparent 60%)',
    }}>
      {/* header */}
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--off-white-07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 2,
            background: 'var(--ink)', color: 'var(--deep-black)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11, letterSpacing: '0.02em',
          }}>XO</div>
          <div style={{ flex: 1 }}>
            <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0, margin: 0 }}>XO Intelligence</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
              <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-68)', letterSpacing: '0.08em' }}>
                ONLINE · CONCEPT PAPER + OSINT COPILOT
              </span>
            </div>
          </div>
        </div>

        {/* prospect selector */}
        <div>
          <div className="t-label-muted" style={{ marginBottom: 6, fontSize: 9 }}>CONTEXT PROSPECT</div>
          <select
            value={selectedProspect}
            onChange={(e) => setSelectedProspect(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.02em',
              cursor: 'pointer',
            }}
          >
            {PROSPECTS.map(p => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.company} — {p.contact}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* quick actions */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--off-white-07)' }}>
        <div className="t-label-muted" style={{ marginBottom: 8, fontSize: 9 }}>QUICK ACTIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {XO_QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              onClick={() => runAction(a.id)}
              disabled={busy}
              title={a.hint}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 10px',
                background: 'transparent',
                border: '1px solid var(--off-white-15)', borderRadius: 2,
                color: 'var(--off-white)',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
                fontWeight: 600, textTransform: 'uppercase',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.4 : 1,
                textAlign: 'left',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => !busy && (e.currentTarget.style.borderColor = 'var(--lime)', e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--off-white-15)', e.currentTarget.style.color = 'var(--off-white)')}
            >
              <i className={'fa-solid ' + a.icon} style={{ fontSize: 11 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* chat */}
      <div ref={scrollRef} style={{
        padding: '14px 18px', maxHeight: 340, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map((m, i) => <XOMessage key={i} msg={m} />)}
        {busy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ width: 18, height: 18, borderRadius: 2, background: 'var(--ink)', color: 'var(--deep-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 8 }}>XO</span>
            <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.06em' }}>
              ANALYZING<span className="xo-dots">...</span>
            </span>
          </div>
        )}
      </div>

      {/* input */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--off-white-07)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Ask XO… e.g. What pains are common in Southeast Asian biotech ops?"
            style={{
              flex: 1,
              padding: '9px 12px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 12, lineHeight: 1.4,
              resize: 'none', outline: 'none', minHeight: 36, maxHeight: 110,
            }}
          />
          <button
            onClick={onSend}
            disabled={busy || !input.trim()}
            className="btn btn-primary btn-sm"
            style={{ opacity: busy || !input.trim() ? 0.4 : 1, cursor: busy || !input.trim() ? 'not-allowed' : 'pointer' }}
          >
            <i className="fa-solid fa-arrow-up" />
          </button>
        </div>
        <div className="t-mono" style={{ marginTop: 6, fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.06em', textAlign: 'right' }}>
          ENTER TO SEND · SHIFT+ENTER FOR NEWLINE
        </div>
      </div>
    </div>
  );
}

function XOMessage({ msg }) {
  const isXO = msg.role === 'xo';
  const [copied, setCopied] = React.useState(false);

  const filenameBase = (msg.label || 'XO-Intelligence')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'XO-Intelligence';

  // Strip markdown for plain-text export
  const toPlain = (md) => md
    .replace(/^#{1,6} /gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  const openInGoogleDocs = () => {
    // Google Docs quick-create via mailto-style URL: opens a blank doc; we copy content to clipboard first
    navigator.clipboard?.writeText(toPlain(msg.text));
    window.open('https://docs.google.com/document/create', '_blank');
  };

  const downloadDocx = () => {
    // Minimal Word-compatible HTML (.doc) — opens natively in Word / Docs / Pages
    const bodyHtml = renderXOMarkdown(msg.text);
    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>' + filenameBase + '</title>' +
      '<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#111;max-width:720px;}' +
      'h1,h2,h3{font-family:Calibri,Arial,sans-serif;}' +
      'sup{color:#5b6cff;font-weight:700;}</style></head>' +
      '<body>' +
      '<h2 style="border-bottom:2px solid #c9e500;padding-bottom:6px;">XO Intelligence — ' + (msg.label || 'Response') + '</h2>' +
      '<p style="color:#888;font-size:9pt;">Generated ' + new Date().toLocaleString() + '</p>' +
      bodyHtml +
      '</body></html>';
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filenameBase + '.doc';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyText = () => {
    navigator.clipboard?.writeText(toPlain(msg.text));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{
        width: 20, height: 20, borderRadius: 2, flexShrink: 0,
        background: isXO ? 'var(--ink)' : 'var(--off-white-15)',
        color: isXO ? 'var(--deep-black)' : 'var(--off-white)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 8, letterSpacing: '0.02em',
      }}>{isXO ? 'XO' : 'ME'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-body" style={{
          fontSize: 12, lineHeight: 1.55,
          color: isXO ? 'var(--off-white)' : 'var(--off-white-68)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }} dangerouslySetInnerHTML={{ __html: renderXOMarkdown(msg.text) }} />

        {isXO && msg.text && msg.text.length > 80 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <XOExportBtn icon="fa-brands fa-google-drive" label={copied ? 'COPIED · OPENING…' : 'OPEN IN GOOGLE DOCS'} onClick={openInGoogleDocs} />
            <XOExportBtn icon="fa-file-word" label="DOWNLOAD .DOC" onClick={downloadDocx} />
            <XOExportBtn icon={copied ? 'fa-check' : 'fa-copy'} label={copied ? 'COPIED' : 'COPY'} onClick={copyText} />
          </div>
        )}
      </div>
    </div>
  );
}

function XOExportBtn({ icon, label, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 9px',
        background: hover ? 'rgba(201,229,0,0.08)' : 'transparent',
        border: '1px solid ' + (hover ? 'var(--lime)' : 'var(--off-white-15)'),
        borderRadius: 2,
        color: hover ? 'var(--ink)' : 'var(--off-white-68)',
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        cursor: 'pointer',
      }}
    >
      <i className={'fa-solid ' + icon} style={{ fontSize: 10 }} />
      {label}
    </button>
  );
}

// Markdown: **bold**, *italic*, `code`, headings, bullets, [^N] citations.
function renderXOMarkdown(text) {
  if (!text) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = esc(text);
  // Sources section: render [^N]: ... as styled citation rows
  html = html.replace(/^\[\^(\d+)\]:\s*(.+)$/gm,
    '<div style="display:grid;grid-template-columns:22px 1fr;gap:6px;padding:4px 0;border-top:1px solid var(--off-white-07);font-size:11px;line-height:1.45;">' +
    '<span style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:var(--lavender);letter-spacing:0.04em;padding-top:2px;">[$1]</span>' +
    '<span style="color:var(--off-white-68);">$2</span></div>');
  // Inline citations: [^N] → superscript lavender tag
  html = html.replace(/\[\^(\d+)\]/g, '<sup style="color:var(--lavender);font-weight:700;font-family:var(--font-mono);font-size:9px;letter-spacing:0.04em;padding:0 1px;">[$1]</sup>');
  html = html.replace(/^### (.+)$/gm, '<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:var(--ink);font-weight:700;margin:10px 0 4px;text-transform:uppercase;">$1</div>');
  html = html.replace(/^## (.+)$/gm, '<div style="font-family:var(--font-display);font-weight:600;font-size:13px;margin:12px 0 6px;color:var(--off-white);">$1</div>');
  html = html.replace(/^# (.+)$/gm, '<div style="font-family:var(--font-display);font-weight:700;font-size:14px;margin:12px 0 6px;color:var(--off-white);">$1</div>');
  html = html.replace(/^\s*[-*] (.+)$/gm, '<div style="padding-left:14px;position:relative;margin:3px 0;"><span style="position:absolute;left:2px;color:var(--lime);">•</span>$1</div>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--ink);font-weight:700;">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:11px;background:var(--off-white-07);padding:1px 5px;border-radius:2px;">$1</code>');
  return html;
}

Object.assign(window, { XOCopilot });
