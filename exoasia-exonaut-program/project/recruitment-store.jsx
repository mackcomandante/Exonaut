// Recruitment referral pipeline. Exonauts submit candidates; admins/commanders
// validate progress and award recruitment pillar points through point_ledger.
(function () {
  if (window.__recruitmentStore) return;

  const STORAGE_KEY = 'exo:recruitment-referrals:v1';
  const listeners = new Set();
  const STATUS_STAGES = [
    { id: 'submitted', label: 'Submitted', points: 0 },
    { id: 'under_review', label: 'Under Review', points: 10 },
    { id: 'contacted', label: 'Contacted', points: 25 },
    { id: 'interview_scheduled', label: 'Interview Scheduled', points: 50 },
    { id: 'accepted', label: 'Accepted', points: 125 },
    { id: 'joined_program', label: 'Joined Program', points: 250 },
    { id: 'rejected', label: 'Rejected', points: 0 },
  ];
  const ACTIVE_STATUSES = new Set(['submitted', 'under_review', 'contacted', 'interview_scheduled', 'accepted']);
  let state = { referrals: [], loaded: false, error: '' };

  function notify() {
    listeners.forEach(fn => fn());
  }

  function activeUserId() {
    return localStorage.getItem('exo:userId') || ME_ID;
  }

  function statusInfo(status) {
    return STATUS_STAGES.find(item => item.id === status) || STATUS_STAGES[0];
  }

  function fromRow(row) {
    const metadata = row.metadata || {};
    return {
      id: row.id,
      referrerId: row.referrer_id,
      candidateName: row.candidate_name || '',
      candidateEmail: row.candidate_email || '',
      candidateLinkedin: row.candidate_linkedin || '',
      trackFit: row.track_fit || '',
      relationship: row.relationship || '',
      reason: row.reason || '',
      status: row.status || 'submitted',
      adminNotes: row.admin_notes || '',
      pointsAwarded: Number(row.points_awarded || 0),
      reviewedBy: row.reviewed_by || '',
      reviewedAt: row.reviewed_at || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      metadata,
    };
  }

  function toRow(item) {
    return {
      id: item.id,
      referrer_id: item.referrerId,
      candidate_name: item.candidateName,
      candidate_email: item.candidateEmail,
      candidate_linkedin: item.candidateLinkedin || null,
      track_fit: item.trackFit || null,
      relationship: item.relationship || null,
      reason: item.reason || '',
      status: item.status || 'submitted',
      admin_notes: item.adminNotes || '',
      points_awarded: Number(item.pointsAwarded || 0),
      reviewed_by: item.reviewedBy || null,
      reviewed_at: item.reviewedAt || null,
      metadata: item.metadata || {},
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map(fromRow);
    } catch {
      return [];
    }
  }

  function saveLocal(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(toRow)));
    } catch {}
  }

  async function refresh() {
    if (!window.__db) {
      state = { ...state, referrals: loadLocal(), loaded: true, error: '' };
      notify();
      return state;
    }
    const { data, error } = await window.__db
      .from('recruitment_referrals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Could not load recruitment referrals:', error.message || error);
      state = { ...state, referrals: loadLocal(), loaded: true, error: error.message || 'Could not load referrals.' };
      notify();
      return state;
    }
    state = { ...state, referrals: (data || []).map(fromRow), loaded: true, error: '' };
    saveLocal(state.referrals);
    notify();
    return state;
  }

  async function currentActorId() {
    if (!window.__db?.auth) return activeUserId();
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || activeUserId();
  }

  async function submit(draft, profile) {
    const now = new Date().toISOString();
    const cleanName = String(draft.candidateName || '').trim();
    const cleanEmail = String(draft.candidateEmail || '').trim();
    if (!cleanName) throw new Error('Candidate name is required.');
    if (!cleanEmail && !String(draft.candidateLinkedin || '').trim()) throw new Error('Add an email or LinkedIn URL.');
    const referral = {
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      referrerId: profile?.id || activeUserId(),
      candidateName: cleanName,
      candidateEmail: cleanEmail,
      candidateLinkedin: String(draft.candidateLinkedin || '').trim(),
      trackFit: String(draft.trackFit || '').trim(),
      relationship: String(draft.relationship || '').trim(),
      reason: String(draft.reason || '').trim(),
      status: 'submitted',
      adminNotes: '',
      pointsAwarded: 0,
      createdAt: now,
      updatedAt: now,
      metadata: { referrerName: profile?.fullName || ME.name || '' },
    };
    state = { ...state, referrals: [referral, ...state.referrals.filter(item => item.id !== referral.id)] };
    saveLocal(state.referrals);
    notify();
    if (window.__db) {
      const { error } = await window.__db.from('recruitment_referrals').insert(toRow(referral));
      if (error) throw error;
      await refresh();
    }
    return referral;
  }

  async function updateStatus(id, status, notes = '') {
    const current = state.referrals.find(item => item.id === id);
    if (!current) throw new Error('Referral not found.');
    const nextStage = statusInfo(status);
    const now = new Date().toISOString();
    const actorId = await currentActorId();
    const nextAwarded = nextStage.points;
    const existingLedgerPoints = window.__pointsStore
      ? window.__pointsStore.entriesForUser(current.referrerId)
        .filter(entry => entry.sourceType === 'recruitment' && String(entry.sourceId || '').startsWith(id + ':'))
        .reduce((sum, entry) => sum + Number(entry.points || 0), 0)
      : Number(current.pointsAwarded || 0);
    const delta = Math.max(0, nextAwarded - existingLedgerPoints);
    const updated = {
      ...current,
      status: nextStage.id,
      adminNotes: notes,
      pointsAwarded: Math.max(Number(current.pointsAwarded || 0), nextAwarded),
      reviewedBy: actorId,
      reviewedAt: now,
      updatedAt: now,
    };
    state = { ...state, referrals: state.referrals.map(item => item.id === id ? updated : item) };
    saveLocal(state.referrals);
    notify();

    if (window.__db) {
      const { error } = await window.__db
        .from('recruitment_referrals')
        .update(toRow(updated))
        .eq('id', id);
      if (error) throw error;
    }
    if (delta > 0 && window.__pointsStore) {
      await window.__pointsStore.award({
        id: 'pts-recruit-' + id + '-' + nextStage.id,
        userId: updated.referrerId,
        sourceType: 'recruitment',
        sourceId: id + ':' + nextStage.id,
        cohortId: 'c2627',
        trackCode: updated.trackFit || null,
        pillar: 'recruitment',
        points: delta,
        note: `Recruitment: ${updated.candidateName} moved to ${nextStage.label}`,
        awardedBy: actorId,
      });
    }
    await refresh();
    return updated;
  }

  function referralsForUser(userId = activeUserId()) {
    return state.referrals.filter(item => item.referrerId === userId);
  }

  function summaryForUser(userId = activeUserId()) {
    const referrals = referralsForUser(userId);
    const active = referrals.filter(item => ACTIVE_STATUSES.has(item.status)).length;
    const joined = referrals.filter(item => item.status === 'joined_program').length;
    const byStatus = referrals.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    const latest = referrals.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null;
    return { referrals, active, joined, byStatus, latest, submitted: referrals.length };
  }

  window.__recruitmentStore = {
    STATUS_STAGES,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state; },
    refresh,
    submit,
    updateStatus,
    referralsForUser,
    summaryForUser,
  };

  window.useRecruitment = function useRecruitment() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__recruitmentStore.subscribe(() => setTick(t => t + 1));
      if (!state.loaded) window.__recruitmentStore.refresh();
      return unsub;
    }, []);
    return window.__recruitmentStore.all();
  };

  function RecruitmentReviewPage() {
    const { profile } = useCurrentUserProfile();
    const { profiles } = useUserProfiles();
    const { referrals, loaded, error } = window.useRecruitment();
    usePoints();
    const [filter, setFilter] = React.useState('active');
    const [notes, setNotes] = React.useState({});
    const [busy, setBusy] = React.useState('');
    const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unknown referrer';
    const visible = referrals.filter(item => {
      if (filter === 'active') return ACTIVE_STATUSES.has(item.status);
      if (filter === 'complete') return ['joined_program', 'rejected'].includes(item.status);
      return item.status === filter;
    });
    async function move(item, status) {
      setBusy(item.id + status);
      try {
        await window.__recruitmentStore.updateStatus(item.id, status, notes[item.id] || item.adminNotes || '');
      } catch (err) {
        alert(err?.message || 'Could not update referral.');
      } finally {
        setBusy('');
      }
    }
    return (
      <div className="enter">
        <div className="section-head">
          <div>
            <h1>Recruitment Pipeline</h1>
            <span className="section-meta">{visible.length} referrals · {profile.role === 'admin' ? 'Platform Admin' : 'Commander'} review</span>
          </div>
          <select className="select" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 230 }}>
            <option value="active">Active Pipeline</option>
            {STATUS_STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            <option value="complete">Complete / Closed</option>
          </select>
        </div>
        {error && <div className="card-panel" style={{ padding: 14, marginBottom: 12, color: 'var(--coral)' }}>{error}</div>}
        {!loaded && <div className="card-panel" style={{ padding: 24 }}>Loading referrals...</div>}
        {loaded && visible.length === 0 && <div className="card-panel" style={{ padding: 28, textAlign: 'center' }}>No referrals in this view.</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          {visible.map(item => {
            const stage = statusInfo(item.status);
            return (
              <div key={item.id} className="card-panel" style={{ padding: 18, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div className="t-mono" style={{ color: 'var(--ink-muted)', fontSize: 10 }}>REFERRED BY · {nameOf(item.referrerId)}</div>
                    <h3 style={{ margin: '4px 0 3px' }}>{item.candidateName}</h3>
                    <div className="t-body" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                      {[item.candidateEmail, item.candidateLinkedin, item.trackFit, item.relationship].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span className="status-pill status-submitted">{stage.label} · {item.pointsAwarded}/250 pts</span>
                </div>
                {item.reason && <p className="t-body" style={{ margin: 0 }}>{item.reason}</p>}
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Reviewer notes"
                  value={Object.prototype.hasOwnProperty.call(notes, item.id) ? notes[item.id] : (item.adminNotes || '')}
                  onChange={e => setNotes(value => ({ ...value, [item.id]: e.target.value }))}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATUS_STAGES.filter(stageItem => stageItem.id !== 'submitted').map(stageItem => (
                    <button
                      key={stageItem.id}
                      className={(stageItem.id === item.status ? 'btn btn-primary' : 'btn btn-ghost') + ' btn-sm'}
                      disabled={!!busy}
                      onClick={() => move(item, stageItem.id)}
                    >
                      {busy === item.id + stageItem.id
                        ? 'Saving...'
                        : `${stageItem.id === item.status ? 'Sync ' : ''}${stageItem.label}${stageItem.points ? ` · ${stageItem.points} pts` : ''}`}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  window.RecruitmentReviewPage = RecruitmentReviewPage;
  window.__recruitmentStore.refresh();
})();
