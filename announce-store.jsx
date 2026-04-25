// ============================================================================
// Announce store — Lead, Commander, and Platform Admin can post announcements.
// Persists to localStorage.  Seeded from the hardcoded list in screens.jsx if
// that const exists at init.  Audience scoping:
//   { kind: 'all' }                                 → every Exonaut
//   { kind: 'cohorts', cohorts: [id, id] }          → members of these cohorts
//   { kind: 'tracks',  tracks:  [code, code] }      → members of these tracks
//   { kind: 'users',   users:   [id, id] }          → specific Exonauts
// Reactions are stored as { [announceId]: { [emoji]: count } }.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:announcements:v1';

  function seedFromConst() {
    if (typeof ANNOUNCEMENTS === 'undefined' || !Array.isArray(ANNOUNCEMENTS)) return [];
    return ANNOUNCEMENTS.map((a, i) => ({
      id: 'seed-' + i,
      type: a.type || 'info',
      title: a.title,
      body: a.body,
      from: a.from || 'Mack Comandante',
      fromRole: a.fromRole || 'commander',
      audience: a.audience || { kind: 'all' },
      createdAt: Date.now() - (i + 1) * 3600 * 1000 * 8,   // staggered fake times
      pinned: !!a.pinned,
      link: a.link || null,
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.announcements)) {
          return {
            announcements: parsed.announcements,
            reactions: parsed.reactions || {},
          };
        }
      }
    } catch (e) { /* ignore */ }
    return { announcements: seedFromConst(), reactions: {} };
  }

  function persist(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  const listeners = new Set();
  const state = loadState();

  function notify() {
    persist(state);
    listeners.forEach(fn => fn());
  }

  function timeAgo(ts) {
    const delta = Date.now() - ts;
    const h = Math.floor(delta / 3600000);
    if (h < 1) {
      const m = Math.floor(delta / 60000);
      return m <= 1 ? 'just now' : m + 'm ago';
    }
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d === 1) return 'Yesterday';
    if (d < 7)  return d + 'd ago';
    const w = Math.floor(d / 7);
    if (w < 5)  return w + 'w ago';
    return Math.floor(d / 30) + 'mo ago';
  }

  function audienceFits(audience, userId) {
    if (!audience || audience.kind === 'all') return true;
    const u = (typeof USERS !== 'undefined') ? USERS.find(x => x.id === userId) : null;
    if (!u) return false;
    if (audience.kind === 'users')   return (audience.users   || []).includes(userId);
    if (audience.kind === 'tracks')  {
      const track = (typeof window.getUserTrack === 'function') ? window.getUserTrack(userId) : u.track;
      return (audience.tracks  || []).includes(track);
    }
    if (audience.kind === 'cohorts') {
      const cohort = (typeof window.getUserCohort === 'function') ? window.getUserCohort(userId) : u.cohort;
      return (audience.cohorts || []).includes(cohort);
    }
    return false;
  }

  function audienceLabel(audience) {
    if (!audience || audience.kind === 'all') return 'ALL EXONAUTS';
    if (audience.kind === 'cohorts') {
      const names = (audience.cohorts || []).map(id => {
        const all = [
          ...(typeof COHORTS !== 'undefined' ? COHORTS : []),
          ...((window.__cohortStore?.getAll() || []).filter(c => c.custom)),
        ];
        const c = all.find(x => x.id === id);
        return c ? (c.code || c.name) : id;
      });
      if (names.length === 0) return 'NO COHORTS';
      if (names.length === 1) return 'COHORT · ' + names[0];
      return names.length + ' COHORTS';
    }
    if (audience.kind === 'tracks') {
      const names = (audience.tracks || []).map(code => {
        const t = (typeof TRACKS !== 'undefined') ? TRACKS.find(x => x.code === code) : null;
        return t ? t.short : code;
      });
      if (names.length === 0) return 'NO TRACKS';
      if (names.length === 1) return 'TRACK · ' + names[0];
      return names.length + ' TRACKS';
    }
    if (audience.kind === 'users') {
      const n = (audience.users || []).length;
      if (n === 1) {
        const u = (typeof USERS !== 'undefined') ? USERS.find(x => x.id === audience.users[0]) : null;
        return 'DIRECT · ' + (u ? u.name.toUpperCase() : audience.users[0]);
      }
      return n + ' EXONAUTS · DIRECT';
    }
    return 'UNKNOWN';
  }

  function genId() {
    return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const store = {
    all() {
      // Newest first, pinned first.
      const list = [...state.announcements];
      list.sort((a, b) => {
        if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      return list;
    },
    visibleTo(userId) {
      return store.all().filter(a => audienceFits(a.audience, userId));
    },
    // Announcements authored by a given person (for their own management list).
    byAuthor(role, name) {
      return store.all().filter(a => a.fromRole === role || a.from === name);
    },
    create(data) {
      const a = {
        id: genId(),
        type: data.type || 'info',
        title: String(data.title || '').trim() || 'Untitled',
        body: String(data.body || '').trim(),
        from: data.from || '—',
        fromRole: data.fromRole || 'admin',
        audience: data.audience || { kind: 'all' },
        pinned: !!data.pinned,
        link: data.link || null,
        createdAt: Date.now(),
      };
      state.announcements.unshift(a);
      notify();
      return a;
    },
    update(id, patch) {
      const a = state.announcements.find(x => x.id === id);
      if (!a) return null;
      Object.assign(a, patch);
      notify();
      return a;
    },
    remove(id) {
      const i = state.announcements.findIndex(x => x.id === id);
      if (i === -1) return false;
      state.announcements.splice(i, 1);
      delete state.reactions[id];
      notify();
      return true;
    },
    togglePin(id) {
      const a = state.announcements.find(x => x.id === id);
      if (!a) return;
      a.pinned = !a.pinned;
      notify();
    },

    // Reactions ---------------------------------------------------------------
    react(announceId, emoji) {
      if (!state.reactions[announceId]) state.reactions[announceId] = {};
      state.reactions[announceId][emoji] = (state.reactions[announceId][emoji] || 0) + 1;
      notify();
    },
    reactionsFor(announceId) { return state.reactions[announceId] || {}; },

    // Helpers -----------------------------------------------------------------
    timeAgo,
    audienceFits,
    audienceLabel,

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.__announceStore = store;

  window.useAnnouncements = function useAnnouncements() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
    return {
      all: store.all(),
      visibleTo: store.visibleTo,
      byAuthor: store.byAuthor,
      create: store.create,
      update: store.update,
      remove: store.remove,
      togglePin: store.togglePin,
      react: store.react,
      reactionsFor: store.reactionsFor,
      timeAgo,
      audienceLabel,
    };
  };
})();
