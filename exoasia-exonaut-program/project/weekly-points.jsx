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
    const cohortStart = parseCohortDate(cohort?.start || cohort?.startDate);
    if (cohortStart && cohortStart.getTime() > Date.now()) {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      now.setHours(0, 0, 0, 0);
      const day = now.getDay() || 7;
      const currentMonday = new Date(now);
      currentMonday.setDate(now.getDate() - day + 1);
      const currentWeek = (typeof COHORT !== 'undefined' ? COHORT.week : 1) || 1;
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() + (weekNumber - currentWeek) * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { weekNumber, startFri: monday, endThu: sunday, label: formatWindow(monday, sunday) };
    }
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
    const c = cohort || (typeof COHORTS !== 'undefined' ? COHORTS.find(x => x.status === 'active') : null);
    const cohortStart = c ? parseCohortDate(c.start || c.startDate) : null;
    if (cohortStart && cohortStart.getTime() > Date.now()) {
      return Math.max(1, (typeof COHORT !== 'undefined' ? COHORT.week : 1) || 1);
    }
    const w1 = weekOneStart(c);
    const diffDays = Math.floor((Date.now() - w1.getTime()) / DAY_MS);
    let wk = Math.floor(diffDays / 7) + 1;
    if (wk < 1) wk = 1;
    const start = c ? parseCohortDate(c.start || c.startDate) : null;
    const end = c ? parseCohortDate(c.end || c.demoDay) : null;
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

  function cohortById(cohortId) {
    return window.__cohortStore?.getById?.(cohortId)
      || (typeof COHORTS !== 'undefined' ? COHORTS.find(c => c.id === cohortId) : null)
      || null;
  }

  // Daily delta for (user, dayIndex).  dayIndex = days since weekOneStart.
  // Baked around the user's overall tier so "top performers stay top" but
  // each week produces genuine churn.
  function dailyPoints(user, dayIndex) {
    const rng = mulberry32(strHash(user.id + ':' + dayIndex));
    // Base rate scales with total points (a mid-pack prime ~50pts / day avg).
    const base = Math.max(0, Math.round((user.points || 0) / 7));
    if (base <= 0) return 0;
    // Per-day variance: -40% … +80%
    const v = -0.4 + rng() * 1.2;
    const raw = Math.round(base * (1 + v));
    // Occasional "big wins" (≈8% of days) — discovery meetings, excellents, etc.
    if (rng() < 0.08) return raw + 30 + Math.floor(rng() * 40);
    // Occasional zero-days (off / weekend / ritual miss) (≈10%).
    if (rng() < 0.10) return 0;
    return Math.max(0, raw);
  }

  function pointEntryTime(entry) {
    const raw = entry?.awardedAt || entry?.creditedAt || entry?.createdAt;
    const ms = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(ms) ? ms : 0;
  }

  function weeklyEntriesForUser(user, weekNumber, cohort) {
    const win = weekWindow(cohort, weekNumber);
    const startMs = win.startFri.getTime();
    const endMs = win.endThu.getTime();
    const entries = ledgerEntries();
    const ledgerRows = entries.filter(e => {
      const ms = pointEntryTime(e);
      return e.userId === user.id && ms >= startMs && ms <= endMs;
    });
    const unsyncedManualRows = manualCredits()
      .filter(c => c.userId === user.id)
      .filter(c => !entries.some(e => e.id === c.pointLedgerId || (e.sourceType === 'manual' && e.sourceId === c.id)))
      .filter(c => {
        const ms = pointEntryTime(c);
        return ms >= startMs && ms <= endMs;
      });
    return [...ledgerRows, ...unsyncedManualRows];
  }

  // Points earned by a user inside the displayed week window.
  function weeklyPoints(user, weekNumber, cohort = cohortById(user?.cohort)) {
    return weeklyEntriesForUser(user, weekNumber, cohort)
      .reduce((sum, e) => sum + Number(e.points || 0), 0);
  }

  // Per-day breakdown for a given week — useful for sparkline visuals.
  function weeklyBreakdown(user, weekNumber, cohort = cohortById(user?.cohort)) {
    const win = weekWindow(cohort, weekNumber);
    const labels = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(win.startFri.getTime() + i * DAY_MS);
      labels.push({
        date: day,
        day: ['SUN','MON','TUE','WED','THU','FRI','SAT'][day.getDay()],
        points: 0,
      });
    }
    weeklyEntriesForUser(user, weekNumber, cohort).forEach(entry => {
      const ms = pointEntryTime(entry);
      const idx = Math.floor((ms - win.startFri.getTime()) / DAY_MS);
      if (idx >= 0 && idx < labels.length) labels[idx].points += Number(entry.points || 0);
    });
    return labels;
  }

  function ledgerEntries() {
    return window.__pointsStore?.all?.().ledger || [];
  }

  function manualCredits() {
    return window.__manualCreditStore?.all?.() || [];
  }

  function pointsForUser(userId) {
    const entries = ledgerEntries();
    const ledgerTotal = entries
      .filter(e => e.userId === userId)
      .reduce((sum, e) => sum + Number(e.points || 0), 0);
    const unsyncedManualTotal = manualCredits()
      .filter(c => c.userId === userId)
      .filter(c => !entries.some(e => e.id === c.pointLedgerId || (e.sourceType === 'manual' && e.sourceId === c.id)))
      .reduce((sum, c) => sum + Number(c.points || 0), 0);
    return ledgerTotal + unsyncedManualTotal;
  }

  function liveExonautRows(cohortId) {
    const profiles = Array.isArray(window.__profileDirectory) ? window.__profileDirectory : [];
    if (!profiles.length) {
      return (typeof getCohortUsers === 'function'
        ? getCohortUsers(cohortId)
        : USERS.filter(u => (u.cohort || 'c2627') === cohortId)
      ).filter(u => !u.role || u.role === 'exonaut');
    }
    return profiles
      .filter(p => (p.role || 'exonaut') === 'exonaut')
      .filter(p => (p.cohortId || 'c2627') === cohortId)
      .map(p => {
        const points = pointsForUser(p.id);
        return {
          id: p.id,
          name: p.fullName || p.email || 'Exonaut',
          role: p.role || 'exonaut',
          cohort: p.cohortId || 'c2627',
          track: p.trackCode || 'AIS',
          avatarUrl: p.avatarUrl || '',
          points,
          tier: window.getTierKeyForPoints ? window.getTierKeyForPoints(points) : (points >= 300 ? 'prime' : points >= 100 ? 'builder' : 'entry'),
        };
      });
  }

  // Top N per cohort for a given week. Returns array of
  // [{ user, cohortId, weekPoints, breakdown, rank, standoutDay }] sorted desc.
  function topOfWeek(cohortId, weekNumber, n = 3) {
    const cohort = cohortById(cohortId);
    const users = liveExonautRows(cohortId);

    const scored = users.map(u => {
      const weekPoints = weeklyPoints(u, weekNumber, cohort);
      const breakdown = weeklyBreakdown(u, weekNumber, cohort);
      const standoutDay = breakdown.reduce((best, d) => d.points > best.points ? d : best, breakdown[0]);
      return { user: u, cohortId, weekNumber, weekPoints, breakdown, standoutDay };
    });

    scored.sort((a, b) => b.weekPoints - a.weekPoints || b.user.points - a.user.points);
    return scored.filter(r => r.weekPoints > 0).slice(0, n).map((r, i) => ({ ...r, rank: i + 1 }));
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
    pointsForUser,
    liveExonautRows,
    formatMMMDD,
    formatWindow,
  };
})();
