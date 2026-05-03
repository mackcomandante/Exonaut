(function () {
  if (window.__ritualStore) return;

  const KEY = 'exo:ritual-history:v2';
  const listeners = new Set();
  let state = { logs: loadLocal(), loaded: false };

  function activeUserId() {
    return localStorage.getItem('exo:userId') || ME_ID;
  }

  function activeCohortId() {
    return (window.ME && ME.cohort) || 'c2627';
  }

  function weekKey(week = COHORT.week) {
    return 'w' + String(week).padStart(2, '0');
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persistLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(state.logs)); } catch {}
  }

  function notify() {
    persistLocal();
    listeners.forEach(fn => fn());
  }

  function logToRecord(log) {
    return {
      id: log.ritualId,
      name: log.ritualName,
      points: log.points,
      proof: log.proof || {},
      state: 'done',
      loggedAt: log.loggedAt,
    };
  }

  function fromRemote(row) {
    return {
      id: row.id,
      userId: row.user_id,
      cohortId: row.cohort_id || 'c2627',
      ritualId: row.ritual_id,
      ritualName: row.ritual_name,
      week: Number(row.week) || COHORT.week,
      points: Number(row.points) || 0,
      proof: row.proof || {},
      loggedAt: row.logged_at || row.created_at || new Date().toISOString(),
    };
  }

  function recordsFor(userId = activeUserId(), week = COHORT.week) {
    return state.logs
      .filter(log => log.userId === userId && Number(log.week) === Number(week))
      .reduce((acc, log) => {
        acc[log.ritualId] = logToRecord(log);
        return acc;
      }, {});
  }

  function historyFor(userId = activeUserId()) {
    return state.logs
      .filter(log => log.userId === userId)
      .reduce((acc, log) => {
        const key = weekKey(log.week);
        acc[key] = acc[key] || {};
        acc[key][log.ritualId] = logToRecord(log);
        return acc;
      }, {});
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl || '').split(',');
    if (parts.length < 2) return null;
    const contentType = (parts[0].match(/data:(.*?);base64/) || [])[1] || 'application/octet-stream';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType });
  }

  async function uploadProof(userId, ritualId, proof) {
    if (!window.__db || !proof?.fileDataUrl) return '';
    const blob = dataUrlToBlob(proof.fileDataUrl);
    if (!blob) return '';
    const cleanName = (proof.fileName || 'ritual-proof').replace(/[^\w.\-]+/g, '_');
    const path = `${userId}/${weekKey()}/${ritualId}/${Date.now()}-${cleanName}`;
    const { error } = await window.__db.storage
      .from('ritual-proofs')
      .upload(path, blob, { upsert: true, contentType: proof.fileType || blob.type || 'application/octet-stream' });
    if (error) {
      console.warn('Could not upload ritual proof:', error.message || error);
      return '';
    }
    return path;
  }

  async function refreshRemote() {
    if (!window.__db) return state.logs;
    const { data, error } = await window.__db
      .from('ritual_logs')
      .select('*')
      .order('logged_at', { ascending: false });
    if (error) {
      console.warn('Could not load ritual logs:', error.message || error);
      return state.logs;
    }
    state = { logs: (data || []).map(fromRemote), loaded: true };
    notify();
    return state.logs;
  }

  async function completeRitual(ritualId, proof = {}, options = {}) {
    const userId = options.userId || activeUserId();
    const ritual = RITUALS.find(r => r.id === ritualId);
    const week = options.week || COHORT.week;
    if (!ritual) return null;
    const existing = state.logs.find(log => log.userId === userId && log.ritualId === ritualId && Number(log.week) === Number(week));
    if (existing) return logToRecord(existing);

    const filePath = await uploadProof(userId, ritualId, proof);
    const cleanProof = {
      description: proof.description || (typeof proof === 'string' ? proof : ''),
      fileName: proof.fileName || '',
      fileSize: proof.fileSize || '',
      fileType: proof.fileType || '',
      filePath,
      source: options.source || 'proof',
    };
    const log = {
      id: `ritual-${weekKey(week)}-${ritualId}-${userId}`,
      userId,
      cohortId: options.cohortId || activeCohortId(),
      ritualId,
      ritualName: ritual.name,
      week,
      points: ritual.points,
      proof: cleanProof,
      loggedAt: new Date().toISOString(),
    };
    state.logs = [log, ...state.logs];
    notify();

    if (window.__db) {
      const row = {
        id: log.id,
        user_id: log.userId,
        cohort_id: log.cohortId,
        ritual_id: log.ritualId,
        ritual_name: log.ritualName,
        week: log.week,
        points: log.points,
        state: 'done',
        proof: log.proof,
        logged_at: log.loggedAt,
      };
      const { error } = await window.__db.from('ritual_logs').insert(row);
      if (error) console.warn('Could not save ritual log:', error.message || error);
    }

    if (window.__pointsStore) {
      await window.__pointsStore.award({
        id: 'pts-ritual-' + weekKey(week) + '-' + ritualId + '-' + userId,
        userId,
        sourceType: 'ritual',
        sourceId: weekKey(week) + ':' + ritualId,
        cohortId: log.cohortId,
        pillar: 'ritual',
        points: ritual.points,
        note: ritual.name,
      });
    }
    return logToRecord(log);
  }

  window.__ritualStore = {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return historyFor(); },
    recordsFor,
    historyFor,
    completeRitual,
    refreshRemote,
    weekKey,
  };

  window.useRitualState = function useRitualState(userId) {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__ritualStore.subscribe(() => setTick(t => t + 1));
      window.__ritualStore.refreshRemote();
      return unsub;
    }, []);
    const id = userId || activeUserId();
    return {
      records: recordsFor(id),
      history: historyFor(id),
      completeRitual,
    };
  };

  refreshRemote();
})();
