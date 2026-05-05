// Supabase-backed crown rotation store - temporary Track Ops access for Exonauts.
(function () {
  const ROTATION_MS = 14 * 24 * 60 * 60 * 1000;
  const listeners = new Set();
  let state = { crowns: [], requests: [] };
  let loaded = false;

  function isoToMs(value) {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  function toCrown(row) {
    return {
      id: row.id,
      trackCode: row.track_code,
      cohortId: row.cohort_id,
      userId: row.user_id,
      status: row.status,
      startedAt: isoToMs(row.started_at),
      dueAt: isoToMs(row.due_at),
      assignedBy: row.assigned_by,
      previousUserId: row.previous_user_id,
      note: row.note || '',
      createdAt: isoToMs(row.created_at),
      updatedAt: isoToMs(row.updated_at),
    };
  }

  function toRequest(row) {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      trackCode: row.track_code,
      cohortId: row.cohort_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      requestedBy: row.requested_by,
      requestedAt: isoToMs(row.requested_at),
      reviewedBy: row.reviewed_by,
      reviewedAt: isoToMs(row.reviewed_at),
      approvedAt: isoToMs(row.approved_at),
      deniedAt: isoToMs(row.denied_at),
      note: row.note || '',
      reviewNote: row.review_note || '',
      createdAt: isoToMs(row.created_at),
      updatedAt: isoToMs(row.updated_at),
    };
  }

  function notify() {
    listeners.forEach(fn => fn());
  }

  async function currentUserId(fallback) {
    if (fallback && fallback !== 'admin' && fallback !== 'commander') return fallback;
    if (!window.__db || !window.__db.auth) return null;
    const sessionResult = await window.__db.auth.getSession();
    return sessionResult?.data?.session?.user?.id || null;
  }

  async function refresh() {
    if (!window.__db) return state;

    try {
      const [crownsResult, requestsResult] = await Promise.all([
        window.__db
          .from('crown_assignments')
          .select('*')
          .order('started_at', { ascending: false }),
        window.__db
          .from('crown_transfer_requests')
          .select('*')
          .order('requested_at', { ascending: false }),
      ]);

      if (crownsResult.error) throw crownsResult.error;
      if (requestsResult.error) throw requestsResult.error;

      state = {
        crowns: (crownsResult.data || []).map(toCrown),
        requests: (requestsResult.data || []).map(toRequest),
      };
    } catch (err) {
      console.error('crown refresh:', err);
      state = { crowns: [], requests: [] };
    } finally {
      loaded = true;
      notify();
    }
    return state;
  }

  function activeCrownForTrack(trackCode) {
    return state.crowns.find(c => c.trackCode === trackCode && c.status === 'active') || null;
  }

  function activeCrownForUser(userId) {
    return state.crowns.find(c => c.userId === userId && c.status === 'active') || null;
  }

  window.__crownStore = {
    ROTATION_MS,
    all() { return { ...state, loaded }; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getActiveCrownForTrack: activeCrownForTrack,
    userHasCrown(userId) { return !!activeCrownForUser(userId); },
    getUserCrownTrack(userId) {
      const crown = activeCrownForUser(userId);
      return crown ? crown.trackCode : null;
    },
    getUserCrown(userId) {
      return activeCrownForUser(userId);
    },
    assignInitialCrown({ trackCode, userId, cohortId, assignedBy = 'admin', note = '' }) {
      return (async () => {
        const actorId = await currentUserId(assignedBy);
        const now = new Date();
        const due = new Date(now.getTime() + ROTATION_MS);

        const active = activeCrownForTrack(trackCode);
        if (active) {
          const { error: replaceError } = await window.__db
            .from('crown_assignments')
            .update({ status: 'replaced' })
            .eq('id', active.id);
          if (replaceError) throw replaceError;
        }

        const assignment = {
          id: 'crown-' + trackCode + '-' + now.getTime(),
          track_code: trackCode,
          cohort_id: cohortId || 'c2627',
          user_id: userId,
          status: 'active',
          started_at: now.toISOString(),
          due_at: due.toISOString(),
          assigned_by: actorId,
          previous_user_id: active?.userId || null,
          note,
        };
        const { error: insertError } = await window.__db.from('crown_assignments').insert(assignment);
        if (insertError) throw insertError;

        const request = {
          id: 'audit-' + now.getTime(),
          type: 'admin-assign',
          status: 'approved',
          track_code: trackCode,
          cohort_id: cohortId || 'c2627',
          from_user_id: active?.userId || null,
          to_user_id: userId,
          requested_by: actorId,
          requested_at: now.toISOString(),
          reviewed_by: actorId,
          reviewed_at: now.toISOString(),
          approved_at: now.toISOString(),
          note,
        };
        const { error: requestError } = await window.__db.from('crown_transfer_requests').insert(request);
        if (requestError) throw requestError;
        await refresh();
      })();
    },
    requestCrownTransfer({ trackCode, fromUserId, toUserId, note = '' }) {
      return (async () => {
        const actorId = await currentUserId(fromUserId);
        const crown = activeCrownForTrack(trackCode);
        if (!crown || crown.userId !== actorId) throw new Error('Only the current crown holder can request this transfer.');
        if (actorId === toUserId) throw new Error('Choose a different Exonaut.');
        const hasPending = state.requests.some(r => r.status === 'pending' && r.trackCode === trackCode);
        if (hasPending) throw new Error('This track already has a pending crown transfer.');

        const now = new Date();
        const row = {
          id: 'crown-req-' + now.getTime(),
          type: 'transfer',
          status: 'pending',
          track_code: trackCode,
          cohort_id: crown.cohortId,
          from_user_id: actorId,
          to_user_id: toUserId,
          requested_by: actorId,
          requested_at: now.toISOString(),
          note,
          review_note: '',
        };
        const { error } = await window.__db.from('crown_transfer_requests').insert(row);
        if (error) throw error;
        await refresh();
      })();
    },
    approveCrownTransfer(requestId, commanderId = 'commander', note = '') {
      return (async () => {
        const actorId = await currentUserId(commanderId);
        const req = state.requests.find(r => r.id === requestId);
        if (!req || req.status !== 'pending') return;
        const now = new Date();
        const due = new Date(now.getTime() + ROTATION_MS);
        const active = activeCrownForTrack(req.trackCode);

        if (active) {
          const { error: replaceError } = await window.__db
            .from('crown_assignments')
            .update({ status: 'replaced' })
            .eq('id', active.id);
          if (replaceError) throw replaceError;
        }

        const assignment = {
          id: 'crown-' + req.trackCode + '-' + now.getTime(),
          track_code: req.trackCode,
          cohort_id: req.cohortId || 'c2627',
          user_id: req.toUserId,
          status: 'active',
          started_at: now.toISOString(),
          due_at: due.toISOString(),
          assigned_by: actorId,
          previous_user_id: req.fromUserId,
          note,
        };
        const { error: insertError } = await window.__db.from('crown_assignments').insert(assignment);
        if (insertError) throw insertError;

        const { error: updateError } = await window.__db
          .from('crown_transfer_requests')
          .update({
            status: 'approved',
            reviewed_by: actorId,
            reviewed_at: now.toISOString(),
            approved_at: now.toISOString(),
            review_note: note,
          })
          .eq('id', requestId);
        if (updateError) throw updateError;
        await refresh();
      })();
    },
    denyCrownTransfer(requestId, commanderId = 'commander', note = '') {
      return (async () => {
        const actorId = await currentUserId(commanderId);
        const req = state.requests.find(r => r.id === requestId);
        if (!req || req.status !== 'pending') return;
        const now = new Date();
        const { error } = await window.__db
          .from('crown_transfer_requests')
          .update({
            status: 'denied',
            reviewed_by: actorId,
            reviewed_at: now.toISOString(),
            denied_at: now.toISOString(),
            review_note: note,
          })
          .eq('id', requestId);
        if (error) throw error;
        await refresh();
      })();
    },
    revokeActiveCrown(trackCode, assignedBy = 'admin', note = '') {
      return (async () => {
        const actorId = await currentUserId(assignedBy);
        const active = activeCrownForTrack(trackCode);
        if (!active) return;
        const now = new Date();
        const { error: revokeError } = await window.__db
          .from('crown_assignments')
          .update({ status: 'revoked', note: note || active.note || 'Admin revoked crown' })
          .eq('id', active.id);
        if (revokeError) throw revokeError;

        const request = {
          id: 'audit-revoke-' + now.getTime(),
          type: 'admin-assign',
          status: 'denied',
          track_code: trackCode,
          cohort_id: active.cohortId || 'c2627',
          from_user_id: active.userId,
          to_user_id: active.userId,
          requested_by: actorId,
          requested_at: now.toISOString(),
          reviewed_by: actorId,
          reviewed_at: now.toISOString(),
          denied_at: now.toISOString(),
          note: note || 'Admin revoked crown',
        };
        const { error: auditError } = await window.__db.from('crown_transfer_requests').insert(request);
        if (auditError) throw auditError;
        await refresh();
      })();
    },
    refresh,
  };

  window.useCrownState = function useCrownState() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__crownStore.subscribe(() => setTick(t => t + 1));
      if (!loaded) window.__crownStore.refresh();
      if (!window.__db) return unsub;
      const channelName = 'crown_rotation_realtime_' + Math.random().toString(36).slice(2);
      const channel = window.__db
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crown_assignments' }, () => {
          window.__crownStore.refresh();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crown_transfer_requests' }, () => {
          window.__crownStore.refresh();
        })
        .subscribe();
      return () => {
        unsub();
        if (window.__db && channel) window.__db.removeChannel(channel);
      };
    }, []);
    return window.__crownStore.all();
  };

  window.getActiveCrownForTrack = trackCode => window.__crownStore.getActiveCrownForTrack(trackCode);
  window.userHasCrown = userId => window.__crownStore.userHasCrown(userId);
  window.getUserCrownTrack = userId => window.__crownStore.getUserCrownTrack(userId);
})();

function trackLabel(trackCode) {
  const track = TRACKS.find(t => t.code === trackCode);
  return track ? track.short : (trackCode || 'TRACK');
}

function findProfile(profiles, userId) {
  return (profiles || []).find(p => p.id === userId);
}

function sameRoster(profile, trackCode, cohortId) {
  return profile && (profile.role || 'exonaut') === 'exonaut'
    && (profile.trackCode || 'AIS') === trackCode
    && (!cohortId || (profile.cohortId || 'c2627') === cohortId);
}

function CrownStatusPill({ crown }) {
  if (!crown) return <span className="status-pill">NO CROWN</span>;
  return (
    <span className="status-pill" style={{ color: 'var(--platinum)', borderColor: 'rgba(127,227,255,0.35)' }}>
      <i className="fa-solid fa-crown" /> ACTIVE
    </span>
  );
}

function PassTheCrownPage() {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  useCrownState();
  const crown = window.__crownStore.getUserCrown(profile.id);
  const trackCode = crown?.trackCode || profile.trackCode || 'AIS';
  const track = TRACKS.find(t => t.code === trackCode);
  const [toUserId, setToUserId] = React.useState('');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState('');

  if (!crown) {
    return (
      <div className="enter">
        <div className="card-panel" style={{ padding: 36, textAlign: 'center' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 12 }} />
          <div className="t-heading" style={{ fontSize: 16 }}>Track Ops Locked</div>
          <div className="t-body" style={{ marginTop: 6, color: 'var(--off-white-68)' }}>You do not currently hold a track crown.</div>
        </div>
      </div>
    );
  }

  const roster = (profiles || []).filter(p => sameRoster(p, crown.trackCode, crown.cohortId) && p.id !== profile.id);
  const pending = window.__crownStore.all().requests.find(r => r.status === 'pending' && r.trackCode === crown.trackCode);

  async function submit() {
    setError('');
    try {
      await window.__crownStore.requestCrownTransfer({
        trackCode: crown.trackCode,
        fromUserId: profile.id,
        toUserId,
        note: note.trim(),
      });
      setToUserId('');
      setNote('');
    } catch (err) {
      setError(err.message || 'Could not request transfer.');
    }
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>TRACK OPS · PASS THE CROWN</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Pass the Crown</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {track?.name || crown.trackCode} · Commander approval required before access moves.
          </div>
        </div>
        <CrownStatusPill crown={crown} />
      </div>

      {pending && (
        <div className="card-panel" style={{ borderLeft: '2px solid var(--amber)', padding: 18, marginBottom: 18 }}>
          <div className="t-label" style={{ color: 'var(--amber)', marginBottom: 6 }}>PENDING COMMANDER CONFIRMATION</div>
          <div className="t-body" style={{ color: 'var(--off-white-68)' }}>
            Transfer requested to {(profiles || []).find(p => p.id === pending.toUserId)?.fullName || 'selected Exonaut'}.
          </div>
        </div>
      )}

      <div className="card-panel" style={{ padding: 24 }}>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 8 }}>NEW CROWN HOLDER</div>
        <select value={toUserId} onChange={e => setToUserId(e.target.value)} disabled={!!pending} style={{
          width: '100%', padding: '10px 12px', background: 'var(--deep-black)', color: 'var(--off-white)',
          border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 11,
        }}>
          <option value="">Select from {trackLabel(crown.trackCode)} roster</option>
          {roster.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
        </select>

        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', margin: '16px 0 6px' }}>HANDOFF NOTE</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} disabled={!!pending}
          placeholder="Summarize current queue status, risks, and why this handoff is ready for Commander approval."
          style={{ width: '100%', padding: 10, background: 'var(--deep-black)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2, fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none', resize: 'vertical' }} />

        {error && <div className="t-body" style={{ marginTop: 12, color: 'var(--red)' }}>{error}</div>}

        <button className="btn btn-primary" disabled={!toUserId || !!pending} onClick={submit} style={{ marginTop: 16, opacity: (!toUserId || pending) ? 0.5 : 1 }}>
          <i className="fa-solid fa-paper-plane" /> SEND TO COMMANDER
        </button>
      </div>
    </div>
  );
}

function CommanderCrownTransfers() {
  const { profiles } = useUserProfiles();
  const { requests } = useCrownState();
  const [reviewing, setReviewing] = React.useState(null);
  const pending = requests.filter(r => r.status === 'pending');
  const history = requests.filter(r => r.status !== 'pending');
  const nameOf = id => findProfile(profiles, id)?.fullName || findProfile(profiles, id)?.email || 'Unknown';

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber)' }}>COMMANDER · CROWN TRANSFERS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Crown Transfers</h1>
          <div className="t-body" style={{ marginTop: 6 }}>{pending.length} transfer{pending.length === 1 ? '' : 's'} awaiting approval.</div>
        </div>
      </div>

      {pending.length === 0 && <div className="card-panel" style={{ padding: 32, textAlign: 'center', marginBottom: 18 }}>No crown transfers awaiting Commander confirmation.</div>}
      {pending.map(req => (
        <div key={req.id} className="card-panel" style={{ padding: 20, borderLeft: '2px solid var(--amber)', marginBottom: 12 }}>
          <div className="t-label" style={{ color: 'var(--amber)', marginBottom: 8 }}>{trackLabel(req.trackCode)} · PASS THE CROWN</div>
          <div className="t-heading" style={{ fontSize: 16, textTransform: 'none', letterSpacing: 0 }}>
            {nameOf(req.fromUserId)} → {nameOf(req.toUserId)}
          </div>
          {req.note && <div className="t-body" style={{ marginTop: 10, color: 'var(--off-white-68)' }}>{req.note}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setReviewing({ req, action: 'approve' })}><i className="fa-solid fa-check" /> APPROVE</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setReviewing({ req, action: 'deny' })}><i className="fa-solid fa-xmark" /> DENY</button>
          </div>
        </div>
      ))}

      {history.length > 0 && <h3 className="t-heading" style={{ fontSize: 14, margin: '28px 0 10px', color: 'var(--off-white-68)' }}>HISTORY</h3>}
      {history.map(req => (
        <div key={req.id} className="card-panel" style={{ padding: 16, marginBottom: 8, opacity: 0.82 }}>
          <div className="t-mono" style={{ fontSize: 9, color: req.status === 'approved' ? 'var(--lime)' : 'var(--red)', letterSpacing: '0.1em', fontWeight: 700 }}>{req.status.toUpperCase()} · {trackLabel(req.trackCode)}</div>
          <div className="t-body" style={{ marginTop: 5 }}>{req.fromUserId ? nameOf(req.fromUserId) + ' → ' : ''}{nameOf(req.toUserId)}</div>
        </div>
      ))}

      {reviewing && <CrownReviewModal reviewing={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}

function CrownReviewModal({ reviewing, onClose }) {
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const isApprove = reviewing.action === 'approve';
  async function submit() {
    setError('');
    setSaving(true);
    try {
      if (isApprove) await window.__crownStore.approveCrownTransfer(reviewing.req.id, 'commander', note.trim());
      else await window.__crownStore.denyCrownTransfer(reviewing.req.id, 'commander', note.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Could not update crown transfer.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 420, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="card-panel" style={{ width: 'min(520px, 100%)', padding: 24, borderColor: isApprove ? 'var(--lime)' : 'var(--red)' }}>
        <div className="t-label" style={{ color: isApprove ? 'var(--lime)' : 'var(--red)', marginBottom: 8 }}>{isApprove ? 'APPROVE TRANSFER' : 'DENY TRANSFER'}</div>
        <h2 className="t-title" style={{ fontSize: 24, margin: 0 }}>Commander Confirmation</h2>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} autoFocus placeholder="Optional note"
          style={{ width: '100%', marginTop: 18, padding: 10, background: 'var(--deep-black)', color: 'var(--off-white)', border: '1px solid var(--off-white-15)', borderRadius: 2 }} />
        {error && <div className="t-body" style={{ marginTop: 10, color: 'var(--red)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={submit}>{saving ? 'Saving...' : (isApprove ? 'Approve' : 'Deny')}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PassTheCrownPage,
  CommanderCrownTransfers,
  CrownStatusPill,
});
