// points-store.jsx — logs all point events per user; feeds into auto-score
(function () {
  const STORE_KEY = 'exo:points:v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
  }

  // Source catalogue — canonical point sources mapped from POINTS_RUBRIC
  const POINT_SOURCES = {
    'onboarding.pledge':          { label: 'Pledge Signed',                  pts: 50,  oneTime: true  },
    'onboarding.linkedin':        { label: 'LinkedIn Post Published',         pts: 20,  oneTime: true  },
    'profile.complete':           { label: 'Profile Fully Completed',         pts: 30,  oneTime: true  },
    'mission.submit':             { label: 'Mission Submitted On Time',       pts: null               }, // variable
    'mission.good':               { label: 'Mission Graded Good',             pts: 10                 },
    'mission.excellent':          { label: 'Mission Graded Excellent',        pts: 20                 },
    'client.pipeline':            { label: 'Prospect Pipeline (10 qualified)',pts: 20,  oneTime: true  },
    'client.concept_paper':       { label: 'Concept Paper Submitted',         pts: 30                 },
    'client.discovery':           { label: 'Discovery Meeting Completed',     pts: 25                 },
    'client.discovery_good':      { label: 'Discovery Tier: GOOD',            pts: 75,  oneTime: true  },
    'client.discovery_great':     { label: 'Discovery Tier: GREAT',           pts: 150, oneTime: true  },
    'client.discovery_awesome':   { label: 'Discovery Tier: AWESOME',         pts: 250, oneTime: true  },
    'client.mou':                 { label: 'Client Signed Engagement / MOU',  pts: 50                 },
    'client.touchpoint':          { label: 'Client Touchpoint Logged',        pts: 15                 },
    'client.sat_4star':           { label: 'Client 4-Star Satisfaction',      pts: 20                 },
    'client.sat_5star':           { label: 'Client 5-Star Satisfaction',      pts: 35                 },
    'client.deliverable':         { label: 'Client Deliverable Accepted',     pts: 25                 },
    'recruit.submit':             { label: 'Recruit Candidate Submitted',     pts: 30                 },
    'recruit.placed':             { label: 'Recruit Accepts Offer',           pts: 50                 },
    'ritual.mon_ign':             { label: 'Monday Ignition Posted',          pts: 5                  },
    'ritual.mid_pls':             { label: 'Mid-Week Pulse Posted',           pts: 3                  },
    'ritual.fri_win':             { label: 'Friday Win Wall Posted',          pts: 5                  },
    'culture.kudos_given':        { label: 'Peer Kudos Given',               pts: 2                  },
    'culture.kudos_received':     { label: 'Peer Kudos Received',            pts: 3                  },
    'culture.teach_back':         { label: 'Teach-Back Conducted',           pts: 15                 },
    'milestone.iotw':             { label: 'Intern of the Week',             pts: 25                 },
    'milestone.fire_check':       { label: 'Midpoint Fire Check Completed',  pts: 10, oneTime: true   },
    'milestone.demo_day':         { label: 'Demo Day Presentation',          pts: 50, oneTime: true   },
  };

  const __pointsStore = {
    POINT_SOURCES,

    add(userId, { source, pts, note, weekNum, ref } = {}) {
      if (!userId) return null;
      const data = load();
      if (!data[userId]) data[userId] = [];
      const def = POINT_SOURCES[source] || {};
      const actualPts = (pts !== undefined && pts !== null) ? pts : (def.pts || 0);
      const entry = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2),
        source: source || 'manual',
        pts: actualPts,
        note: note || def.label || source || 'Manual adjustment',
        weekNum: weekNum !== undefined ? weekNum : (typeof COHORT !== 'undefined' ? COHORT.week : 0),
        ref: ref || null,
        ts: Date.now(),
      };
      data[userId].push(entry);
      save(data);
      return entry;
    },

    getAll(userId) {
      return load()[userId] || [];
    },

    getTotal(userId) {
      return (load()[userId] || []).reduce((s, e) => s + (Number(e.pts) || 0), 0);
    },

    hasSource(userId, source) {
      return (load()[userId] || []).some(e => e.source === source);
    },

    countSource(userId, source) {
      return (load()[userId] || []).filter(e => e.source === source).length;
    },

    countSourceThisWeek(userId, source, weekNum) {
      const wk = weekNum !== undefined ? weekNum : (typeof COHORT !== 'undefined' ? COHORT.week : 0);
      return (load()[userId] || []).filter(e => e.source === source && e.weekNum === wk).length;
    },

    // Grouped summary for the Points Breakdown view
    getSummary(userId) {
      const events = load()[userId] || [];
      const groups = {};
      events.forEach(e => {
        const def = POINT_SOURCES[e.source] || {};
        const group = (e.source.split('.')[0]) || 'other';
        if (!groups[group]) groups[group] = { label: group.charAt(0).toUpperCase() + group.slice(1), total: 0, events: [] };
        groups[group].total += Number(e.pts) || 0;
        groups[group].events.push(e);
      });
      return groups;
    },

    // Wipe a user's ledger (dev/reset only)
    clear(userId) {
      const data = load();
      delete data[userId];
      save(data);
    },
  };

  // Tier helper (shared between store and auto-score)
  function getTierFromPts(pts) {
    if (pts >= 900) return 'apex';
    if (pts >= 600) return 'elite';
    if (pts >= 300) return 'prime';
    if (pts >= 100) return 'builder';
    return 'entry';
  }

  // React hook: live point totals + tier from this store
  function usePointsLedger(userId) {
    const [tick, setTick] = React.useState(0);
    const refresh = React.useCallback(() => setTick(t => t + 1), []);

    const events  = __pointsStore.getAll(userId);
    const total   = events.reduce((s, e) => s + (Number(e.pts) || 0), 0);
    const tier    = getTierFromPts(total);
    const summary = __pointsStore.getSummary(userId);

    return { events, total, tier, summary, refresh };
  }

  Object.assign(window, { __pointsStore, getTierFromPts, usePointsLedger });
})();
