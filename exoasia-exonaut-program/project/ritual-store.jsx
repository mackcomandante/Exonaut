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

  function currentCohortWeek() {
    const active = window.getActiveCohort?.() || null;
    const timeline = active ? window.getCohortTimeline?.(active) : null;
    return timeline?.valid ? timeline.currentWeek : COHORT.week;
  }

  function effectiveWeek(log) {
    const liveWeek = currentCohortWeek();
    const storedWeek = Number(log?.week) || liveWeek;
    return storedWeek === Number(COHORT.week) && liveWeek !== Number(COHORT.week)
      ? liveWeek
      : storedWeek;
  }

  function weekKey(week = currentCohortWeek()) {
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
      week: Number(row.week) || currentCohortWeek(),
      points: Number(row.points) || 0,
      proof: row.proof || {},
      loggedAt: row.logged_at || row.created_at || new Date().toISOString(),
    };
  }

  function recordsFor(userId = activeUserId(), week = currentCohortWeek()) {
    return state.logs
      .filter(log => log.userId === userId && Number(effectiveWeek(log)) === Number(week))
      .reduce((acc, log) => {
        acc[log.ritualId] = logToRecord(log);
        return acc;
      }, {});
  }

  function historyFor(userId = activeUserId()) {
    return state.logs
      .filter(log => log.userId === userId)
      .reduce((acc, log) => {
        const key = weekKey(effectiveWeek(log));
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

  function dataUrlToFile(dataUrl, name, type) {
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return null;
    try {
      return new File([blob], name || 'ritual-media', { type: type || blob.type || 'application/octet-stream' });
    } catch (e) {
      blob.name = name || 'ritual-media';
      return blob;
    }
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

  const THREAD_HASHTAGS = {
    'mon-ign': '#MondayIgnition',
    'mid-pls': '#MidWeekPulse',
    iotw: '#InternOfWeek',
    'teach-bk': '#TeachBack',
  };

  function threadBodyFor(log) {
    const hashtag = THREAD_HASHTAGS[log.ritualId];
    if (!hashtag) return '';
    const description = String(log.proof?.description || '').trim();
    const link = String(log.proof?.link || '').trim();
    const fileName = String(log.proof?.fileName || '').trim();
    const parts = [
      log.ritualId === 'teach-bk'
        ? 'New Teach-Back submitted.'
        : `Completed ${log.ritualName}.`,
    ];
    if (description) parts.push(description);
    if (link) parts.push(link);
    if (fileName && !String(log.proof?.fileType || '').startsWith('image/') && !String(log.proof?.fileType || '').startsWith('video/')) {
      parts.push(`Attachment submitted: ${fileName}`);
    }
    parts.push(hashtag);
    return parts.join('\n\n');
  }

  async function createThreadPostForRitual(log, proof, profile) {
    if (!window.__boardStore || log.ritualId === 'fri-win' || !THREAD_HASHTAGS[log.ritualId]) return;
    const mediaFiles = [];
    const fileType = String(proof?.fileType || '');
    if ((fileType.startsWith('image/') || fileType.startsWith('video/')) && proof?.fileDataUrl) {
      const file = dataUrlToFile(proof.fileDataUrl, proof.fileName, fileType);
      if (file) mediaFiles.push(file);
    }
    try {
      await window.__boardStore.createPost({
        id: `post-${log.id}`,
        channel: profile?.trackCode ? String(profile.trackCode).toLowerCase() : 'general',
        title: proof?.title || log.proof?.title || log.ritualName,
        body: threadBodyFor(log),
        mentionIds: [],
        files: mediaFiles,
        profile,
        sourceType: 'ritual',
        sourceId: log.id,
      });
    } catch (err) {
      console.warn('Could not create ritual Thread post:', err?.message || err);
    }
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
    const week = options.week || currentCohortWeek();
    if (!ritual) return null;
    const existing = state.logs.find(log => log.userId === userId && log.ritualId === ritualId && Number(log.week) === Number(week));
    if (existing) return logToRecord(existing);
    if (ritualId === 'iotw' && options.source !== 'auto-intern-of-week') {
      console.warn('Intern of Week is awarded automatically by the weekly points job.');
      return null;
    }

    const filePath = await uploadProof(userId, ritualId, proof);
    const cleanProof = {
      title: proof.title || '',
      description: proof.description || (typeof proof === 'string' ? proof : ''),
      link: proof.link || '',
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
    await createThreadPostForRitual(log, proof, options.profile);
    return logToRecord(log);
  }

  async function deleteLog(logId, options = {}) {
    const log = state.logs.find(item => item.id === logId);
    if (!log) return null;
    const previous = state.logs;
    state.logs = state.logs.filter(item => item.id !== logId);
    notify();

    try {
      if (window.__db) {
        const { error } = await window.__db.from('ritual_logs').delete().eq('id', logId);
        if (error) throw error;
      }

      if (window.__pointsStore) {
        const pointId = 'pts-ritual-' + weekKey(log.week) + '-' + log.ritualId + '-' + log.userId;
        if (window.__db && typeof window.__pointsStore.refresh === 'function') {
          await window.__pointsStore.refresh();
        } else if (typeof window.__pointsStore.remove === 'function') {
          await window.__pointsStore.remove(pointId);
        } else if (typeof window.__pointsStore.removeWhere === 'function') {
          await window.__pointsStore.removeWhere(entry =>
            entry.userId === log.userId &&
            entry.sourceType === 'ritual' &&
            entry.sourceId === weekKey(log.week) + ':' + log.ritualId
          );
        }
      }
      return log;
    } catch (err) {
      state.logs = previous;
      notify();
      throw err;
    }
  }

  async function deleteLogForThreadPost(post) {
    if (!post || post.sourceType !== 'ritual' || !post.sourceId) return null;
    return deleteLog(post.sourceId);
  }

  window.__ritualStore = {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    logs() { return state.logs; },
    all() { return historyFor(); },
    recordsFor,
    historyFor,
    completeRitual,
    deleteLog,
    deleteLogForThreadPost,
    refreshRemote,
    weekKey,
  };

  window.useRitualState = function useRitualState(userId, week) {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__ritualStore.subscribe(() => setTick(t => t + 1));
      window.__ritualStore.refreshRemote();
      return unsub;
    }, []);
    const id = userId || activeUserId();
    return {
      records: recordsFor(id, week || currentCohortWeek()),
      history: historyFor(id),
      completeRitual,
    };
  };

  refreshRemote();
})();
