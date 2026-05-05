// ============================================================================
// Announce store — Lead, Commander, and Platform Admin can post announcements.
// Persists to Supabase with localStorage fallback.  Seeded from the hardcoded
// list in screens.jsx if that const exists at init.  Audience scoping:
//   { kind: 'all' }                                 → every Exonaut
//   { kind: 'cohorts', cohorts: [id, id] }          → members of these cohorts
//   { kind: 'tracks',  tracks:  [code, code] }      → members of these tracks
//   { kind: 'users',   users:   [id, id] }          → specific Exonauts
// Reactions are stored as { [announceId]: { [emoji]: count } }.
// ============================================================================

(function () {
  const STORE_KEY = 'exo:announcements:v2';

  function seedFromConst() {
    if (typeof ANNOUNCEMENTS === 'undefined' || !Array.isArray(ANNOUNCEMENTS)) return [];
    return ANNOUNCEMENTS.map((a, i) => ({
      id: 'seed-' + i,
      type: a.type || 'info',
      title: a.title,
      body: a.body,
      from: a.from || 'Mission Commander',
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
  let loadedRemote = false;

  function notify() {
    persist(state);
    listeners.forEach(fn => fn());
  }

  async function currentUserId() {
    if (!window.__db || !window.__db.auth) return null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || null;
  }

  function fromRow(row) {
    return {
      id: row.id,
      type: row.type || 'info',
      title: row.title || 'Untitled',
      body: row.body || '',
      from: row.author_name || 'Mission Commander',
      fromRole: row.author_role || 'commander',
      audience: row.audience || { kind: 'all' },
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      pinned: !!row.pinned,
      link: row.link || null,
      createdBy: row.created_by || null,
    };
  }

  function toRow(a, createdBy) {
    return {
      id: a.id,
      type: a.type || 'info',
      title: a.title || 'Untitled',
      body: a.body || '',
      author_name: a.from || 'Mission Commander',
      author_role: a.fromRole || 'commander',
      audience: a.audience || { kind: 'all' },
      pinned: !!a.pinned,
      link: a.link || null,
      created_by: a.createdBy || createdBy || null,
      created_at: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  function reactionsFromRows(rows) {
    const grouped = {};
    (rows || []).forEach(r => {
      if (!grouped[r.announcement_id]) grouped[r.announcement_id] = {};
      grouped[r.announcement_id][r.emoji] = (grouped[r.announcement_id][r.emoji] || 0) + 1;
    });
    return grouped;
  }

  async function refreshRemote() {
    if (!window.__db) return state;
    const [annRes, reactRes] = await Promise.all([
      window.__db.from('announcements').select('*').order('created_at', { ascending: false }),
      window.__db.from('announcement_reactions').select('*'),
    ]);
    if (annRes.error) {
      console.warn('Could not load announcements:', annRes.error.message || annRes.error);
      return state;
    }
    loadedRemote = true;
    if ((annRes.data || []).length === 0 && state.announcements.length) {
      const createdBy = await currentUserId();
      const { error: seedError } = await window.__db
        .from('announcements')
        .upsert(state.announcements.map(a => toRow(a, createdBy)), { onConflict: 'id' });
      if (seedError) console.warn('Could not seed announcements:', seedError.message || seedError);
      return state;
    }
    state.announcements = (annRes.data || []).map(fromRow);
    if (!reactRes.error) state.reactions = reactionsFromRows(reactRes.data || []);
    else console.warn('Could not load announcement reactions:', reactRes.error.message || reactRes.error);
    notify();
    return state;
  }

  function subscribeRemote() {
    if (!window.__db) return () => {};
    const channel = window.__db
      .channel('announcements-store-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => refreshRemote())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_reactions' }, () => refreshRemote())
      .subscribe();
    return () => {
      if (window.__db && channel) window.__db.removeChannel(channel);
    };
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
      if (window.__db) {
        currentUserId().then(createdBy => {
          a.createdBy = createdBy;
          return window.__db.from('announcements').upsert(toRow(a, createdBy), { onConflict: 'id' });
        }).then(({ error }) => {
          if (error) console.warn('Could not save announcement:', error.message || error);
          else refreshRemote();
        });
      }
      return a;
    },
    update(id, patch) {
      const a = state.announcements.find(x => x.id === id);
      if (!a) return null;
      Object.assign(a, patch);
      notify();
      if (window.__db) {
        window.__db.from('announcements').update(toRow(a)).eq('id', id).then(({ error }) => {
          if (error) console.warn('Could not update announcement:', error.message || error);
          else refreshRemote();
        });
      }
      return a;
    },
    remove(id) {
      const i = state.announcements.findIndex(x => x.id === id);
      if (i === -1) return false;
      state.announcements.splice(i, 1);
      delete state.reactions[id];
      notify();
      if (window.__db) {
        window.__db.from('announcements').delete().eq('id', id).then(({ error }) => {
          if (error) console.warn('Could not delete announcement:', error.message || error);
        });
      }
      return true;
    },
    togglePin(id) {
      const a = state.announcements.find(x => x.id === id);
      if (!a) return;
      a.pinned = !a.pinned;
      notify();
      if (window.__db) {
        window.__db.from('announcements').update({ pinned: a.pinned }).eq('id', id).then(({ error }) => {
          if (error) console.warn('Could not pin announcement:', error.message || error);
          else refreshRemote();
        });
      }
    },

    // Reactions ---------------------------------------------------------------
    react(announceId, emoji) {
      if (!state.reactions[announceId]) state.reactions[announceId] = {};
      state.reactions[announceId][emoji] = (state.reactions[announceId][emoji] || 0) + 1;
      notify();
      if (window.__db) {
        currentUserId().then(userId => window.__db.from('announcement_reactions').insert({
          id: 'ar-' + announceId + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          announcement_id: announceId,
          emoji,
          user_id: userId,
        })).then(({ error }) => {
          if (error) console.warn('Could not save announcement reaction:', error.message || error);
          else refreshRemote();
        });
      }
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
    React.useEffect(() => {
      const unsub = store.subscribe(() => setTick(t => t + 1));
      if (!loadedRemote) refreshRemote();
      const unsubRemote = subscribeRemote();
      return () => { unsub(); unsubRemote(); };
    }, []);
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
