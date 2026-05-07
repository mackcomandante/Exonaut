function ManualActivityCreditPage() {
  const { profile } = useCurrentUserProfile();
  useCrownState();
  const { profiles } = useUserProfiles();
  const credits = useManualCredits();
  const missions = useMissions();
  const projectsState = useProjects();
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [duplicate, setDuplicate] = React.useState(null);
  const crown = window.__crownStore?.getUserCrown(profile.id);
  const canCreditAllTracks = ['commander', 'admin'].includes(profile.role);
  const scopeTrack = canCreditAllTracks ? '' : (crown?.trackCode || profile.trackCode || '');
  const scopeCohort = canCreditAllTracks ? '' : (crown?.cohortId || profile.cohortId || 'c2627');
  const exonauts = profiles
    .filter(p => p.role === 'exonaut')
    .filter(p => !scopeTrack || (p.trackCode || 'AIS') === scopeTrack)
    .filter(p => !scopeCohort || (p.cohortId || 'c2627') === scopeCohort);
  const defaultUser = exonauts[0];
  const [draft, setDraft] = React.useState(() => ({
    userId: defaultUser?.id || '',
    cohortId: defaultUser?.cohortId || scopeCohort || profile.cohortId || 'c2627',
    trackCode: scopeTrack || defaultUser?.trackCode || profile.trackCode || '',
    activityType: 'track_task',
    relatedId: '',
    grade: 'approved',
    points: '',
    evidenceNote: '',
    proofUrl: '',
    allowDuplicate: false,
  }));

  React.useEffect(() => {
    if (defaultUser && (!draft.userId || !exonauts.some(u => u.id === draft.userId))) {
      setDraft(d => ({ ...d, userId: defaultUser.id, cohortId: defaultUser.cohortId || scopeCohort || 'c2627', trackCode: scopeTrack || defaultUser.trackCode || '' }));
    } else if (!defaultUser && draft.userId) {
      setDraft(d => ({ ...d, userId: '', cohortId: scopeCohort || d.cohortId, trackCode: scopeTrack || d.trackCode }));
    }
  }, [defaultUser?.id, scopeTrack, scopeCohort, exonauts.length]);

  const selectedUser = exonauts.find(p => p.id === draft.userId);
  const scopedTrackLabel = scopeTrack ? (TRACKS.find(t => t.code === scopeTrack)?.short || scopeTrack) : '';
  const relatedOptions = React.useMemo(() => {
    if (draft.activityType === 'track_task') {
      return missions
        .filter(m => !selectedUser || (m.cohortId || 'c2627') === (draft.cohortId || selectedUser.cohortId || 'c2627'))
        .filter(m => !m.track || !draft.trackCode || m.track === draft.trackCode)
        .filter(m => !scopeTrack || !m.track || m.track === scopeTrack)
        .map(m => ({ id: m.id, label: m.title || m.id, points: m.points || '' }));
    }
    if (draft.activityType === 'ritual') {
      return (typeof RITUALS !== 'undefined' ? RITUALS : []).map(r => ({ id: r.id, label: r.name, points: r.points || '' }));
    }
    if (draft.activityType === 'project') {
      return (projectsState.tasks || []).map(t => ({ id: t.id, label: t.title, points: t.points || '' }));
    }
    return [];
  }, [draft.activityType, draft.cohortId, draft.trackCode, selectedUser?.id, missions, projectsState.tasks, scopeTrack]);

  const related = relatedOptions.find(o => o.id === draft.relatedId);
  const pillarForType = {
    track_task: 'missions',
    ritual: 'ritual',
    kudos: 'culture',
    client: 'client',
    recruitment: 'recruitment',
    project: 'project',
    manual: 'missions',
  }[draft.activityType] || 'missions';

  React.useEffect(() => {
    const probe = {
      userId: draft.userId,
      cohortId: draft.cohortId,
      activityType: draft.activityType,
      relatedId: draft.relatedId,
      evidenceNote: draft.evidenceNote,
    };
    setDuplicate(draft.userId && draft.evidenceNote ? credits.duplicateOf(probe) : null);
  }, [draft.userId, draft.cohortId, draft.activityType, draft.relatedId, draft.evidenceNote, credits.credits.length]);

  function updateUser(userId) {
    const user = exonauts.find(p => p.id === userId);
    setDraft(d => ({
      ...d,
      userId,
      cohortId: user?.cohortId || d.cohortId,
      trackCode: scopeTrack || user?.trackCode || d.trackCode,
    }));
  }

  function updateRelated(relatedId) {
    const next = relatedOptions.find(o => o.id === relatedId);
    setDraft(d => ({
      ...d,
      relatedId,
      points: next?.points ? String(next.points) : d.points,
    }));
  }

  async function submit() {
    setSaving(true);
    setMessage('');
    try {
      if (scopeTrack && (!selectedUser || (selectedUser.trackCode || 'AIS') !== scopeTrack)) {
        throw new Error('Track Ops can only grant manual credit inside ' + scopedTrackLabel + '.');
      }
      await credits.create({
        userId: draft.userId,
        cohortId: draft.cohortId,
        trackCode: draft.trackCode,
        activityType: draft.activityType,
        relatedId: draft.relatedId,
        relatedLabel: related?.label || '',
        grade: draft.grade,
        points: Number(draft.points),
        pillar: pillarForType,
        evidenceNote: draft.evidenceNote,
        proofUrl: draft.proofUrl,
        actorRole: profile.role,
        actorTrackCode: scopeTrack || profile.trackCode || '',
        metadata: { creditedFromRole: profile.role },
      }, { allowDuplicate: draft.allowDuplicate });
      setMessage('Manual credit saved and Exonaut notified.');
      setDuplicate(null);
      setDraft(d => ({ ...d, relatedId: '', points: '', evidenceNote: '', proofUrl: '', allowDuplicate: false }));
    } catch (err) {
      if (err.duplicate) setDuplicate(err.duplicate);
      setMessage(err.message || 'Could not save manual credit.');
    } finally {
      setSaving(false);
    }
  }

  const recent = credits.credits.slice(0, 8);
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || id;

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>LEADER WORKFLOW - BACKFILL POINTS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Manual Activity Credit</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Credit work completed before platform submissions existed{scopeTrack ? ` - scoped to ${scopedTrackLabel}.` : '.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <div className="card-panel" style={{ padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label className="t-label-muted">EXONAUT</label>
              <select className="select" value={draft.userId} onChange={e => updateUser(e.target.value)}>
                <option value="">Choose Exonaut</option>
                {exonauts.map(u => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
              </select>
              {scopeTrack && exonauts.length === 0 && <div className="t-body" style={{ fontSize: 12, color: 'var(--amber)', marginTop: 6 }}>No Exonauts found in {scopedTrackLabel}.</div>}
            </div>
            <div>
              <label className="t-label-muted">COHORT</label>
              <input className="input" value={draft.cohortId} onChange={e => setDraft(d => ({ ...d, cohortId: e.target.value }))} />
            </div>
            <div>
              <label className="t-label-muted">TRACK</label>
              <select className="select" value={draft.trackCode} disabled={!!scopeTrack} onChange={e => setDraft(d => ({ ...d, trackCode: e.target.value }))}>
                <option value="">No track</option>
                {TRACKS.map(t => <option key={t.code} value={t.code}>{t.short}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label-muted">ACTIVITY TYPE</label>
              <select className="select" value={draft.activityType} onChange={e => setDraft(d => ({ ...d, activityType: e.target.value, relatedId: '', points: '' }))}>
                <option value="track_task">Track Task</option>
                <option value="ritual">Ritual</option>
                <option value="kudos">Kudos</option>
                <option value="client">Client</option>
                <option value="recruitment">Recruitment</option>
                <option value="project">Project</option>
                <option value="manual">Manual / Other</option>
              </select>
            </div>
            <div>
              <label className="t-label-muted">RELATED ITEM</label>
              {relatedOptions.length ? (
                <select className="select" value={draft.relatedId} onChange={e => updateRelated(e.target.value)}>
                  <option value="">No related item</option>
                  {relatedOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : (
                <input className="input" value={draft.relatedId} onChange={e => setDraft(d => ({ ...d, relatedId: e.target.value }))} placeholder="Message thread, activity name, or reference ID" />
              )}
            </div>
            <div>
              <label className="t-label-muted">GRADE / STATUS</label>
              <select className="select" value={draft.grade} onChange={e => setDraft(d => ({ ...d, grade: e.target.value }))}>
                <option value="approved">Approved</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="completed">Completed</option>
                <option value="needs_note">Needs Note</option>
                <option value="manual_override">Manual Override</option>
              </select>
            </div>
            <div>
              <label className="t-label-muted">POINTS AWARDED</label>
              <input className="input" type="number" min="0" step="0.25" value={draft.points} onChange={e => setDraft(d => ({ ...d, points: e.target.value }))} />
            </div>
            <div>
              <label className="t-label-muted">PROOF LINK OPTIONAL</label>
              <input className="input" value={draft.proofUrl} onChange={e => setDraft(d => ({ ...d, proofUrl: e.target.value }))} placeholder="Messenger link, Drive URL, or doc reference" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="t-label-muted">EVIDENCE / SOURCE NOTE</label>
            <textarea className="textarea" rows={4} value={draft.evidenceNote} onChange={e => setDraft(d => ({ ...d, evidenceNote: e.target.value }))} placeholder="Example: submitted in Messenger before platform launch; verified by Track Lead." />
          </div>
          {duplicate && (
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
              <input type="checkbox" checked={draft.allowDuplicate} onChange={e => setDraft(d => ({ ...d, allowDuplicate: e.target.checked }))} />
              <span className="t-body" style={{ fontSize: 12, color: 'var(--amber)' }}>Possible duplicate found. Check this only if this is a separate activity.</span>
            </label>
          )}
          {message && <div className="t-body" style={{ marginTop: 12, color: message.includes('saved') ? 'var(--green)' : 'var(--amber)' }}>{message}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary" disabled={saving || !draft.userId || (scopeTrack && !selectedUser) || !draft.points || !draft.evidenceNote || (!!duplicate && !draft.allowDuplicate)} onClick={submit}>
              <i className="fa-solid fa-clipboard-check" /> {saving ? 'Saving...' : 'Grant Manual Credit'}
            </button>
          </div>
        </div>

        <div className="card-panel" style={{ padding: 22 }}>
          <div className="t-label" style={{ marginBottom: 14 }}>RECENT MANUAL CREDITS</div>
          {recent.length === 0 && <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No manual credits yet.</div>}
          {recent.map(c => (
            <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--off-white-07)' }}>
              <div className="t-heading" style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>{nameOf(c.userId)} - +{c.points}</div>
              <div className="t-body" style={{ fontSize: 12 }}>{c.relatedLabel || c.activityType} - {c.grade}</div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 4 }}>{c.evidenceNote}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ManualActivityCreditPage });
