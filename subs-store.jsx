// Shared submissions store — Exonaut submits → Lead grades → feedback returns
// Global reactive store so submit-on-exonaut-side appears instantly in lead queue,
// and grade-on-lead-side surfaces back on exonaut's mission page.

if (!window.__subStore) {
  window.__subStore = {
    // seeded pending subs (other cohort members) + a slot for ME's submissions keyed by mission id
    subs: PENDING_SUBS.map(s => ({ ...s, state: 'pending', grade: null, feedback: null, pointsAwarded: null, note: null })),
    listeners: new Set(),
  };
}

const subStore = window.__subStore;
const notifySubs = () => subStore.listeners.forEach(fn => fn(Math.random()));

const useSubs = () => {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const fn = (v) => force(v);
    subStore.listeners.add(fn);
    return () => subStore.listeners.delete(fn);
  }, []);
  return subStore.subs;
};

// Exonaut-facing: submit a deliverable
const submitDeliverable = ({ missionId, missionTitle, fileName, note }) => {
  const newSub = {
    id: 'sub-me-' + Math.random().toString(36).slice(2, 7),
    missionId, missionTitle,
    exonautId: ME_ID,
    submittedAt: 'just now',
    deliverable: 'document',
    wordCount: 2140,
    isLate: false,
    fileName,
    note,
    state: 'pending',
    grade: null, feedback: null, pointsAwarded: null,
  };
  subStore.subs = [newSub, ...subStore.subs];
  notifySubs();
  return newSub;
};

// Lead-facing: grade a sub
const gradeSubmission = ({ subId, grade, feedback }) => {
  const pointsByGrade = { 'needs-revision': 5, 'good': 10, 'excellent': 20 };
  subStore.subs = subStore.subs.map(s =>
    s.id === subId
      ? { ...s, state: grade === 'needs-revision' ? 'needs-revision' : 'approved',
          grade, feedback, pointsAwarded: pointsByGrade[grade] }
      : s
  );
  notifySubs();
};

// Helper: find my submission for a given mission
const getMySubmission = (missionId) =>
  subStore.subs.find(s => s.exonautId === ME_ID && s.missionId === missionId);

Object.assign(window, { useSubs, submitDeliverable, gradeSubmission, getMySubmission });
