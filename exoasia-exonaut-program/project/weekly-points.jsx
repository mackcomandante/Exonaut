// ============================================================================
// Weekly points synthesizer — deterministic per-user daily point deltas.
// Powers Commander's "Exonaut of the Week" view.
//
// A "week" for awards purposes = Friday 00:00 → Thursday 23:59 SGT.
// The Friday-of-previous-week → Thursday-of-current-week window closes on
// Thursday night; awards are computed Friday morning for the week just closed.
//
// Anchored to cohort start date so week-1 always begins on a Friday. We
// synthesize daily deltas by hashing (userId, dayIndex) so the same week
// always yields the same ranking regardless of reload or session.
// ============================================================================

(function () {
  // -------- small, seeded RNG -----------------------------------------------
  // Mulberry32 — good enough spread, stable across browsers.
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function strHash(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // -------- date helpers (SGT-ish; we're not bothering with TZ math) --------
  const DAY_MS = 86400000;

  // Parse "OCT 06 2026" → Date
  function parseCohortDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Shift a date to the NEAREST Friday at 00:00 (on or before).
  function snapToFriday(d) {
    const nd = new Date(d.getTime());
    nd.setHours(0, 0, 0, 0);
    const dow = nd.getDay();        // 0 Sun … 5 Fri … 6 Sat
    const diff = (dow - 5 + 7) % 7; // days after Friday
    nd.setTime(nd.getTime() - diff * DAY_MS);
    return nd;
  }

  // Compute the start-of-week-1 Friday for a cohort.
  // If cohort start is known, snap to the nearest prior Friday; otherwise
  // snap today to the nearest prior Friday.
  function weekOneStart(cohort) {
    const c = cohort || (typeof COHORTS !== 'undefined' ? COHORTS.find(x => x.status === 'active') : null);
    const start = c ? parseCohortDate(c.start) : null;
    const d = start || new Date();
    return snapToFriday(d);
  }

  // -------- core API --------------------------------------------------------
  // Weekly window for a cohort + week number. Week 1 = first Fri→Thu period.
  // Returns { weekNumber, startFri, endThu, label }.
  function weekWindow(cohort, weekNumber) {
    const w1 = weekOneStart(cohort);
    const startFri = new Date(w1.getTime() + (weekNumber - 1) * 7 * DAY_MS);
    const endThu   = new Date(startFri.getTime() + 7 * DAY_MS - 1);
    return { weekNumber, startFri, endThu, label: formatWindow(startFri, endThu) };
  }

  // Given a cohort, which week are we "currently" voting on?
  // Convention: on Thu/Fri/Sat/Sun/Mon we look at the week that just closed;
  // this keeps the UI stable for several days after the Thursday cutoff.
  // Simpler implementation: return the week that contains "now", clamped
  // into the cohort's declared total if provided.
  function currentWeek(cohort) {
    const w1 = weekOneStart(cohort);
    const diffDays = Math.floor((Date.now() - w1.getTime()) / DAY_MS);
    let wk = Math.floor(diffDays / 7) + 1;
    if (wk < 1) wk = 1;
    const start = cohort ? parseCohortDate(cohort.start || cohort.startDate) : null;
    const end = cohort ? parseCohortDate(cohort.end || cohort.demoDay) : null;
    const total = start && end && end > start
      ? Math.max(1, Math.ceil((end.getTime() - start.getTime() + 1) / DAY_MS / 7))
      : ((typeof COHORT !== 'undefined' ? COHORT.weekTotal : null) || 12);
    if (wk > total) wk = total;
    return wk;
  }

  function formatMMMDD(d) {
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return MONTHS[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0');
  }
  function formatWindow(a, b) {
    return formatMMMDD(a) + ' → ' + formatMMMDD(b);
  }

  // Daily delta for (user, dayIndex).  dayIndex = days since weekOneStart.
  // Baked around the user's overall tier so "top performers stay top" but
  // each week produces genuine churn.
  function dailyPoints(user, dayIndex) {
    const rng = mulberry32(strHash(user.id + ':' + dayIndex));
    // Base rate scales with total points (a mid-pack prime ~50pts / day avg).
    const base = Math.max(4, Math.round((user.points || 100) / 7));
    // Per-day variance: -40% … +80%
    const v = -0.4 + rng() * 1.2;
    const raw = Math.round(base * (1 + v));
    // Occasional "big wins" (≈8% of days) — discovery meetings, excellents, etc.
    if (rng() < 0.08) return raw + 30 + Math.floor(rng() * 40);
    // Occasional zero-days (off / weekend / ritual miss) (≈10%).
    if (rng() < 0.10) return 0;
    return Math.max(0, raw);
  }

  // Points earned by a user inside a given week window (inclusive).
  function weeklyPoints(user, weekNumber) {
    // dayIndex 0 = first Friday of week 1.
    const base = (weekNumber - 1) * 7;
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += dailyPoints(user, base + i);
    return sum;
  }

  // Per-day breakdown for a given week — useful for sparkline visuals.
  function weeklyBreakdown(user, weekNumber) {
    const base = (weekNumber - 1) * 7;
    const DAYS = ['FRI','SAT','SUN','MON','TUE','WED','THU'];
    return DAYS.map((label, i) => ({ day: label, points: dailyPoints(user, base + i) }));
  }

  // Top N per cohort for a given week. Returns array of
  // [{ user, cohortId, weekPoints, breakdown, rank, standoutDay }] sorted desc.
  function topOfWeek(cohortId, weekNumber, n = 3) {
    if (typeof USERS === 'undefined') return [];
    const users = (typeof getCohortUsers === 'function')
      ? getCohortUsers(cohortId)
      : USERS.filter(u => (u.cohort || 'c2627') === cohortId);

    const scored = users.map(u => {
      const weekPoints = weeklyPoints(u, weekNumber);
      const breakdown = weeklyBreakdown(u, weekNumber);
      const standoutDay = breakdown.reduce((best, d) => d.points > best.points ? d : best, breakdown[0]);
      return { user: u, cohortId, weekNumber, weekPoints, breakdown, standoutDay };
    });

    scored.sort((a, b) => b.weekPoints - a.weekPoints);
    return scored.slice(0, n).map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // All cohorts, top 3 each, for a given week.
  function allCohortsTop(weekNumber, n = 3) {
    const cohorts = (typeof COHORTS !== 'undefined') ? COHORTS : [];
    const customCohorts = (window.__cohortStore?.getAll() || []).filter(c => c.custom);
    const all = [...cohorts, ...customCohorts];
    return all.map(c => ({
      cohort: c,
      winners: topOfWeek(c.id, weekNumber, n),
    }));
  }

  window.EOW = {
    DAY_MS,
    weekOneStart,
    weekWindow,
    currentWeek,
    weeklyPoints,
    weeklyBreakdown,
    dailyPoints,
    topOfWeek,
    allCohortsTop,
    formatMMMDD,
    formatWindow,
  };
})();
