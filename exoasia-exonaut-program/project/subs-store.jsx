// Shared submissions store - Supabase-backed with local fallback.

if (!window.__subStore) {
  const storedSubs = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('exo:submissions:v2') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  })();
  window.__subStore = {
    subs: storedSubs.length
      ? storedSubs
      : PENDING_SUBS.map(s => ({ ...s, state: 'pending', grade: null, feedback: null, pointsAwarded: null, note: null })),
    listeners: new Set(),
    loadedFromSupabase: false,
  };
}

const subStore = window.__subStore;
const SUBMISSION_BUCKET = 'mission-submissions';
const getActiveUserId = () => localStorage.getItem('exo:userId') || ME_ID;

const persistSubs = () => {
  try { localStorage.setItem('exo:submissions:v2', JSON.stringify(subStore.subs)); } catch (e) {}
};
const notifySubs = () => {
  persistSubs();
  subStore.listeners.forEach(fn => fn(Math.random()));
};

function relSubmittedAt(value) {
  if (!value) return 'just now';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return 'just now';
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.round(hrs / 24) + 'd ago';
}

function submissionFromRow(row) {
  return {
    id: row.id,
    missionId: row.mission_id,
    missionTitle: row.mission_title,
    exonautId: row.exonaut_id,
    submittedAt: relSubmittedAt(row.submitted_at),
    submittedAtIso: row.submitted_at,
    deliverable: row.deliverable || 'document',
    wordCount: row.word_count || 0,
    isLate: !!row.is_late,
    fileName: row.file_name || '',
    fileSize: row.file_size || '',
    fileType: row.file_type || '',
    filePath: row.file_path || '',
    note: row.note || '',
    state: row.state || 'pending',
    grade: row.grade,
    feedback: row.feedback,
    pointsAwarded: row.points_awarded,
    gradedBy: row.graded_by,
    gradedAt: row.graded_at,
  };
}

function submissionToRow(sub) {
  return {
    id: sub.id,
    mission_id: sub.missionId,
    exonaut_id: sub.exonautId,
    mission_title: sub.missionTitle,
    deliverable: sub.deliverable || 'document',
    word_count: sub.wordCount || 0,
    is_late: !!sub.isLate,
    file_name: sub.fileName || '',
    file_size: sub.fileSize || '',
    file_type: sub.fileType || '',
    file_path: sub.filePath || null,
    note: sub.note || '',
    state: sub.state || 'pending',
    grade: sub.grade || null,
    feedback: sub.feedback || null,
    points_awarded: sub.pointsAwarded ?? null,
  };
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl || '').split(',');
  if (parts.length < 2) return null;
  const meta = parts[0];
  const contentType = (meta.match(/data:(.*?);base64/) || [])[1] || 'application/octet-stream';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

async function uploadSubmissionFile(sub, fileDataUrl) {
  if (!window.__db || !fileDataUrl) return '';
  const blob = dataUrlToBlob(fileDataUrl);
  if (!blob) return '';
  const cleanName = (sub.fileName || 'deliverable.pdf').replace(/[^\w.\-]+/g, '_');
  const path = `${sub.exonautId}/${sub.id}/${cleanName}`;
  const { error } = await window.__db.storage
    .from(SUBMISSION_BUCKET)
    .upload(path, blob, { upsert: true, contentType: sub.fileType || blob.type || 'application/octet-stream' });
  if (error) {
    console.warn('Could not upload submission file:', error.message || error);
    return '';
  }
  return path;
}

async function refreshSubs() {
  if (!window.__db) return subStore.subs;
  const { data, error } = await window.__db
    .from('mission_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) {
    console.warn('Could not load submissions:', error.message || error);
    return subStore.subs;
  }
  subStore.loadedFromSupabase = true;
  subStore.subs = (data || []).map(submissionFromRow);
  notifySubs();
  return subStore.subs;
}

const useSubs = () => {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const fn = (v) => force(v);
    subStore.listeners.add(fn);
    if (!subStore.loadedFromSupabase) refreshSubs();
    return () => subStore.listeners.delete(fn);
  }, []);
  return subStore.subs;
};

// Exonaut-facing: submit a deliverable.
const submitDeliverable = ({ missionId, missionTitle, fileName, fileSize, fileType, fileDataUrl, note }) => {
  const exonautId = getActiveUserId();
  const existing = subStore.subs.find(s => s.exonautId === exonautId && s.missionId === missionId);
  const newSub = {
    id: existing?.id || ('sub-' + Math.random().toString(36).slice(2, 10)),
    missionId,
    missionTitle,
    exonautId,
    submittedAt: 'just now',
    deliverable: 'document',
    wordCount: 0,
    isLate: false,
    fileName,
    fileSize,
    fileType,
    fileDataUrl,
    filePath: existing?.filePath || '',
    note,
    state: 'pending',
    grade: null,
    feedback: null,
    pointsAwarded: null,
  };

  subStore.subs = existing
    ? subStore.subs.map(s => s.id === existing.id ? newSub : s)
    : [newSub, ...subStore.subs];
  notifySubs();

  (async () => {
    if (!window.__db) return;
    const filePath = await uploadSubmissionFile(newSub, fileDataUrl);
    const row = submissionToRow({ ...newSub, filePath });
    const { error } = await window.__db
      .from('mission_submissions')
      .upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Could not save submission:', error.message || error);
      return;
    }
    refreshSubs();
  })();

  return newSub;
};

function missionForSubmission(sub) {
  return (window.__missionStore?.all() || []).find(m => m.id === sub.missionId);
}

async function currentGraderId() {
  if (!window.__db?.auth) return localStorage.getItem('exo:userId') || null;
  const session = await window.__db.auth.getSession();
  return session?.data?.session?.user?.id || localStorage.getItem('exo:userId') || null;
}

async function upsertManualApprovedSubmission({ id, missionId, missionTitle, exonautId, grade = 'approved', feedback = '', pointsAwarded = 0, gradedBy = null, gradedAt = null }) {
  if (!missionId || !exonautId) return null;
  const existing = subStore.subs.find(s => s.exonautId === exonautId && s.missionId === missionId);
  const now = gradedAt || new Date().toISOString();
  const next = {
    ...(existing || {}),
    id: existing?.id || id || ('manual-sub-' + missionId + '-' + exonautId),
    missionId,
    missionTitle: missionTitle || existing?.missionTitle || missionId,
    exonautId,
    submittedAt: existing?.submittedAt || 'manual credit',
    submittedAtIso: existing?.submittedAtIso || now,
    deliverable: existing?.deliverable || 'manual-credit',
    wordCount: existing?.wordCount || 0,
    isLate: !!existing?.isLate,
    fileName: existing?.fileName || '',
    fileSize: existing?.fileSize || '',
    fileType: existing?.fileType || '',
    filePath: existing?.filePath || '',
    note: existing?.note || 'Credited manually from pre-platform evidence.',
    state: 'approved',
    grade,
    feedback,
    pointsAwarded: Number(pointsAwarded) || 0,
    gradedBy,
    gradedAt: now,
  };

  subStore.subs = existing
    ? subStore.subs.map(s => s.id === existing.id ? next : s)
    : [next, ...subStore.subs];
  notifySubs();

  if (window.__db) {
    const row = submissionToRow(next);
    row.submitted_at = next.submittedAtIso;
    row.graded_by = gradedBy;
    row.graded_at = now;
    const { error } = await window.__db.from('mission_submissions').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Could not save manual approved submission:', error.message || error);
      throw error;
    }
    refreshSubs();
  }
  return next;
}

// Lead-facing: grade a sub.
const gradeSubmission = ({ subId, grade, feedback }) => {
  const sub = subStore.subs.find(s => s.id === subId);
  const mission = sub ? missionForSubmission(sub) : null;
  const basePoints = Number(mission?.points || 0);
  const state = grade === 'rejected' ? 'rejected' : grade === 'needs-revision' ? 'needs-revision' : 'approved';
  const pointsAwarded = state === 'approved' ? basePoints : 0;
  subStore.subs = subStore.subs.map(s =>
    s.id === subId ? { ...s, state, grade, feedback, pointsAwarded } : s
  );
  notifySubs();

  (async () => {
    if (!window.__db) return;
    const session = await window.__db.auth.getSession();
    const user = session?.data?.session?.user;
    const gradedAt = new Date().toISOString();
    const { error } = await window.__db
      .from('mission_submissions')
      .update({
        state,
        grade,
        feedback,
        points_awarded: pointsAwarded,
        graded_by: user?.id || null,
        graded_at: gradedAt,
      })
      .eq('id', subId);
    if (error) {
      console.warn('Could not grade submission:', error.message || error);
      return;
    }
    if (state === 'approved' && sub && window.__pointsStore) {
      await window.__pointsStore.award({
        id: 'pts-mission-' + subId,
        userId: sub.exonautId,
        sourceType: 'mission',
        sourceId: subId,
        cohortId: mission?.cohortId || 'c2627',
        trackCode: mission?.track || '',
        pillar: mission?.pillar === 'project' ? 'missions' : (mission?.pillar || 'missions'),
        points: pointsAwarded,
        note: mission?.title || sub.missionTitle,
        awardedBy: user?.id || null,
        awardedAt: gradedAt,
      });
    }
    if (sub && window.__notifStore) {
      const missionTitle = mission?.title || sub.missionTitle || 'Track task';
      window.__notifStore.add({
        toUserId: sub.exonautId,
        type: state === 'approved' ? 'mission-graded' : 'mission-review',
        title: state === 'approved' ? `${missionTitle} approved` : `${missionTitle} reviewed`,
        sub: state === 'approved'
          ? `${grade} - +${pointsAwarded} pts`
          : `${grade} - ${feedback || 'Review available'}`,
        icon: state === 'approved' ? 'fa-circle-check' : 'fa-comment-dots',
        share: state === 'approved' ? {
          kind: 'citation',
          payload: {
            id: 'CIT-' + subId,
            title: missionTitle,
            grade,
            pointsAwarded,
            color: '#C9F24A',
            feedback: feedback || 'Approved by Track Lead.',
          },
        } : null,
        metadata: { submissionId: subId, missionId: sub.missionId, state, grade },
      });
    }
    refreshSubs();
  })();
};

const getSubmissionFileUrl = async (sub) => {
  if (!sub) return '';
  if (sub.fileDataUrl) return sub.fileDataUrl;
  if (!sub.filePath || !window.__db) return '';
  const { data, error } = await window.__db.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrl(sub.filePath, 60 * 10);
  if (error) {
    console.warn('Could not create signed submission URL:', error.message || error);
    return '';
  }
  return data?.signedUrl || '';
};

function normalizeManualCreditLabel(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const getMySubmission = (missionId) => {
  const userId = getActiveUserId();
  const direct = subStore.subs.find(s => s.exonautId === userId && s.missionId === missionId);
  if (direct) return direct;
  const mission = (window.__missionStore?.all?.() || []).find(m => m.id === missionId);
  const credit = window.__manualCreditStore?.all?.().find(c => {
    if (c.userId !== userId || c.activityType !== 'track_task') return false;
    if (c.relatedId && c.relatedId === missionId) return true;
    return mission && normalizeManualCreditLabel(c.relatedLabel) === normalizeManualCreditLabel(mission.title);
  });
  if (!credit) return null;
  return {
    id: 'manual-credit-' + credit.id,
    missionId,
    missionTitle: mission?.title || credit.relatedLabel || missionId,
    exonautId: userId,
    submittedAt: 'manual credit',
    submittedAtIso: credit.creditedAt,
    deliverable: 'manual-credit',
    wordCount: 0,
    isLate: false,
    fileName: '',
    fileSize: '',
    fileType: '',
    filePath: '',
    note: 'Credited manually from pre-platform evidence.',
    state: 'approved',
    grade: credit.grade || 'approved',
    feedback: credit.evidenceNote || '',
    pointsAwarded: Number(credit.points) || Number(mission?.points) || 0,
    gradedBy: credit.creditedBy,
    gradedAt: credit.creditedAt,
    manualCredit: true,
  };
};

Object.assign(window, {
  useSubs,
  submitDeliverable,
  gradeSubmission,
  upsertManualApprovedSubmission,
  getMySubmission,
  getSubmissionFileUrl,
  refreshSubs,
});
