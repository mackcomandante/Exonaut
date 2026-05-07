// Real-time notifications backed by Supabase with localStorage fallback.
(function () {
  if (window.__notifStore) return;

  const STORE_KEY = 'exo:notifications:v1';
  const listeners = new Set();
  const state = { notifications: [], loaded: false, error: '' };

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persistLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.notifications)); } catch {}
  }

  function currentUserId() {
    return localStorage.getItem('exo:userId') || ME_ID || 'anonymous';
  }

  function localReadKey() {
    return STORE_KEY + ':read:' + currentUserId();
  }

  function localReadIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(localReadKey()) || '[]');
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  function saveLocalReadIds(ids) {
    try { localStorage.setItem(localReadKey(), JSON.stringify([...ids])); } catch {}
  }

  function notify() {
    persistLocal();
    listeners.forEach(fn => fn());
  }

  function genId() {
    return 'notif-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function timeAgo(value) {
    const ts = typeof value === 'number' ? value : new Date(value || Date.now()).getTime();
    const delta = Math.max(0, Date.now() - ts);
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + 'd ago';
    return Math.floor(days / 7) + 'w ago';
  }

  function audienceFits(audience, profile) {
    if (!audience || audience.kind === 'all') return true;
    if (!profile) return false;
    if (audience.kind === 'users') return (audience.users || []).includes(profile.id);
    if (audience.kind === 'tracks') return (audience.tracks || []).includes(profile.trackCode || profile.track || ME.track);
    if (audience.kind === 'cohorts') return (audience.cohorts || []).includes(profile.cohortId || profile.cohort || ME.cohort);
    return false;
  }

  function normalize(n) {
    return {
      id: n.id || genId(),
      toUserId: n.toUserId || null,
      audience: n.audience || null,
      type: n.type || 'system',
      title: String(n.title || 'Notification').trim(),
      sub: String(n.sub || n.body || '').trim(),
      icon: n.icon || 'fa-bell',
      read: !!n.read || localReadIds().has(n.id),
      share: n.share || null,
      linkRoute: n.linkRoute || null,
      metadata: n.metadata || {},
      createdAt: n.createdAt || new Date().toISOString(),
    };
  }

  function fromRow(row) {
    return normalize({
      id: row.id,
      toUserId: row.to_user_id,
      audience: row.audience,
      type: row.type,
      title: row.title,
      sub: row.body,
      icon: row.icon,
      read: row.read,
      share: row.share,
      linkRoute: row.link_route,
      metadata: row.metadata,
      createdAt: row.created_at,
    });
  }

  function toRow(n) {
    return {
      id: n.id,
      to_user_id: n.toUserId || null,
      audience: n.audience || null,
      type: n.type || 'system',
      title: n.title || 'Notification',
      body: n.sub || '',
      icon: n.icon || 'fa-bell',
      read: !!n.read,
      share: n.share || null,
      link_route: n.linkRoute || null,
      metadata: n.metadata || {},
      created_at: n.createdAt || new Date().toISOString(),
    };
  }

  function replaceAll(items) {
    state.notifications = (items || []).map(normalize).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    state.loaded = true;
    state.error = '';
    notify();
  }

  async function refresh() {
    if (!window.__db) {
      state.loaded = true;
      notify();
      return state.notifications;
    }
    const { data, error } = await window.__db
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Could not load notifications:', error.message || error);
      state.loaded = true;
      state.error = error.message || 'Could not load notifications.';
      notify();
      return state.notifications;
    }
    replaceAll((data || []).map(fromRow));
    return state.notifications;
  }

  function subscribeRemote() {
    if (!window.__db) return () => {};
    const channel = window.__db
      .channel('notifications-store-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refresh)
      .subscribe();
    return () => {
      if (window.__db && channel) window.__db.removeChannel(channel);
    };
  }

  const store = {
    all() { return state.notifications; },
    visibleTo(profile) {
      const userId = profile?.id || localStorage.getItem('exo:userId') || ME_ID;
      return state.notifications.filter(n => {
        if (n.toUserId) return n.toUserId === userId;
        return audienceFits(n.audience, profile);
      });
    },
    unreadCount(profile) {
      return store.visibleTo(profile).filter(n => !n.read).length;
    },
    async add(data) {
      const item = normalize(data);
      state.notifications.unshift(item);
      notify();
      if (window.__db) {
        const { error } = await window.__db.from('notifications').upsert(toRow(item), { onConflict: 'id' });
        if (error) console.warn('Could not save notification:', error.message || error);
        else refresh();
      }
      return item;
    },
    async markRead(id) {
      const item = state.notifications.find(n => n.id === id);
      if (!item) return;
      item.read = true;
      notify();
      if (!item.toUserId) {
        const ids = localReadIds();
        ids.add(id);
        saveLocalReadIds(ids);
        return;
      }
      if (window.__db) {
        const { error } = await window.__db.from('notifications').update({ read: true }).eq('id', id);
        if (error) console.warn('Could not mark notification read:', error.message || error);
      }
    },
    async markAllRead(profile) {
      const visible = store.visibleTo(profile).filter(n => !n.read);
      if (!visible.length) return;
      visible.forEach(n => { n.read = true; });
      notify();
      const broadcastIds = visible.filter(n => !n.toUserId).map(n => n.id);
      if (broadcastIds.length) {
        const ids = localReadIds();
        broadcastIds.forEach(id => ids.add(id));
        saveLocalReadIds(ids);
      }
      if (window.__db) {
        const directIds = visible.filter(n => n.toUserId).map(n => n.id);
        if (directIds.length) {
          const { error } = await window.__db.from('notifications').update({ read: true }).in('id', directIds);
          if (error) console.warn('Could not mark notifications read:', error.message || error);
        }
      }
    },
    timeAgo,
    refresh,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  state.notifications = loadLocal().map(normalize).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  window.__notifStore = store;

  window.useNotifications = function useNotifications(profile) {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = store.subscribe(() => setTick(t => t + 1));
      if (!state.loaded) refresh();
      const unsubRemote = subscribeRemote();
      return () => { unsub(); unsubRemote(); };
    }, []);
    const list = store.visibleTo(profile);
    return {
      notifications: list,
      unreadCount: list.filter(n => !n.read).length,
      markRead: store.markRead,
      markAllRead: () => store.markAllRead(profile),
      timeAgo,
      error: state.error,
      loaded: state.loaded,
    };
  };
})();
