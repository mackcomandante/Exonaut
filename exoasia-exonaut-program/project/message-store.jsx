// Direct and group messages store - Supabase-backed. localStorage is only a no-Supabase dev fallback.
(function () {
  if (window.__messageStore) return;

  const STORE_KEY = 'exo:messages:v1';
  const MESSAGE_PAYLOAD_PREFIX = '__exo_message_payload_v1__:';
  const listeners = new Set();
  const state = { threads: [], messages: [], loaded: false, error: '' };

  function currentUserId(profile) {
    return profile?.id || localStorage.getItem('exo:userId') || ME_ID || 'anonymous';
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  async function remoteUserId(profile) {
    const userId = currentUserId(profile);
    if (isUuid(userId)) return userId;
    if (!window.__db || !window.__db.auth) return userId;
    const sessionResult = await window.__db.auth.getSession();
    const user = sessionResult?.data?.session?.user;
    if (user?.id) {
      localStorage.setItem('exo:userId', user.id);
      return user.id;
    }
    return userId;
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return {
        threads: Array.isArray(parsed.threads) ? parsed.threads : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      };
    } catch {
      return { threads: [], messages: [] };
    }
  }

  function persistLocal() {
    if (window.__db) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ threads: state.threads, messages: state.messages })); } catch {}
  }

  function notify() {
    persistLocal();
    listeners.forEach(fn => fn());
  }

  function genId(prefix) {
    return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
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

  function isMissingRemote(error) {
    const msg = String(error?.message || error || '').toLowerCase();
    return error?.code === '42P01'
      || error?.code === '42703'
      || error?.code === 'PGRST204'
      || msg.includes('does not exist')
      || msg.includes('schema cache');
  }

  function profileName(userId) {
    const p = (window.__profileDirectory || []).find(x => x.id === userId);
    if (p) return p.fullName || p.email || 'Exonaut';
    if (userId === currentUserId()) return ME.name || 'You';
    return 'Exonaut';
  }

  function profileAvatar(userId) {
    return ((window.__profileDirectory || []).find(x => x.id === userId) || {}).avatarUrl || '';
  }

  function profileRole(userId) {
    return ((window.__profileDirectory || []).find(x => x.id === userId) || {}).role || 'exonaut';
  }

  function normalizeParticipant(p = {}) {
    return {
      userId: p.userId || p.user_id || '',
      memberRole: p.memberRole || p.member_role || 'member',
      removedAt: p.removedAt || p.removed_at || null,
      createdAt: p.createdAt || p.created_at || null,
    };
  }

  function activeParticipantIds(t) {
    const meta = Array.isArray(t.participants) ? t.participants : [];
    if (meta.length) return meta.filter(p => !p.removedAt).map(p => p.userId).filter(Boolean);
    return (t.participantIds || []).filter(Boolean);
  }

  function normalizeThread(t) {
    const participantIds = Array.isArray(t.participantIds) ? t.participantIds : [];
    const participants = Array.isArray(t.participants) && t.participants.length
      ? t.participants.map(normalizeParticipant).filter(p => p.userId)
      : participantIds.map(id => normalizeParticipant({ userId: id }));
    return {
      id: t.id || genId('thread-'),
      title: String(t.title || '').trim(),
      participantIds,
      participants,
      threadType: t.threadType || t.thread_type || 'direct',
      cohortId: t.cohortId || t.cohort_id || '',
      trackCode: t.trackCode || t.track_code || '',
      createdBy: t.createdBy || currentUserId(),
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
      lastReadAt: t.lastReadAt || null,
    };
  }

  function normalizeMessage(m) {
    const parsed = parseMessagePayload(m.body, m.attachments);
    return {
      id: m.id || genId('msg-'),
      threadId: m.threadId,
      senderId: m.senderId || currentUserId(),
      body: parsed.body,
      attachments: parsed.attachments,
      createdAt: m.createdAt || new Date().toISOString(),
    };
  }

  function normalizeAttachment(file) {
    if (!file || !file.dataUrl) return null;
    return {
      id: file.id || genId('att-'),
      name: String(file.name || 'Attachment').trim() || 'Attachment',
      type: String(file.type || 'application/octet-stream'),
      size: Number(file.size || 0),
      dataUrl: String(file.dataUrl || ''),
    };
  }

  function parseMessagePayload(body, attachments) {
    const fallbackAttachments = Array.isArray(attachments)
      ? attachments.map(normalizeAttachment).filter(Boolean)
      : [];
    const raw = String(body || '');
    if (!raw.startsWith(MESSAGE_PAYLOAD_PREFIX)) {
      return { body: raw.trim(), attachments: fallbackAttachments };
    }
    try {
      const payload = JSON.parse(raw.slice(MESSAGE_PAYLOAD_PREFIX.length));
      return {
        body: String(payload.body || '').trim(),
        attachments: Array.isArray(payload.attachments)
          ? payload.attachments.map(normalizeAttachment).filter(Boolean)
          : fallbackAttachments,
      };
    } catch {
      return { body: raw.trim(), attachments: fallbackAttachments };
    }
  }

  function serializeMessagePayload(message) {
    const attachments = Array.isArray(message.attachments)
      ? message.attachments.map(normalizeAttachment).filter(Boolean)
      : [];
    const body = String(message.body || '').trim();
    if (!attachments.length) return body;
    return MESSAGE_PAYLOAD_PREFIX + JSON.stringify({ body, attachments });
  }

  function fromThreadRow(row, participantRows) {
    const participants = (participantRows || []).filter(p => p.thread_id === row.id);
    const activeParticipants = participants.filter(p => !p.removed_at);
    const myParticipant = participants.find(p => p.user_id === currentUserId() && !p.removed_at);
    return normalizeThread({
      id: row.id,
      title: row.title || '',
      participantIds: activeParticipants.map(p => p.user_id),
      participants,
      threadType: row.thread_type || 'direct',
      cohortId: row.cohort_id || '',
      trackCode: row.track_code || '',
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastReadAt: myParticipant?.last_read_at || null,
    });
  }

  function toThreadRow(t) {
    return {
      id: t.id,
      title: t.title || '',
      thread_type: t.threadType || 'direct',
      cohort_id: t.cohortId || null,
      track_code: t.trackCode || null,
      created_by: t.createdBy || currentUserId(),
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: t.updatedAt || new Date().toISOString(),
    };
  }

  function fromMessageRow(row) {
    return normalizeMessage({
      id: row.id,
      threadId: row.thread_id,
      senderId: row.sender_id,
      body: row.body,
      attachments: row.attachments || [],
      createdAt: row.created_at,
    });
  }

  function toMessageRow(m) {
    return {
      id: m.id,
      thread_id: m.threadId,
      sender_id: m.senderId || currentUserId(),
      body: String(m.body || '').trim(),
      attachments: Array.isArray(m.attachments) ? m.attachments.map(normalizeAttachment).filter(Boolean) : [],
      created_at: m.createdAt || new Date().toISOString(),
    };
  }

  function visibleThreads(profile) {
    const userId = profile?.id || currentUserId();
    const seen = new Set();
    return state.threads
      .filter(t => activeParticipantIds(t).includes(userId))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .filter(t => {
        if (t.threadType !== 'direct') return true;
        const key = participantKey(t.participantIds);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(t => enrichThread(t, userId))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function participantKey(ids) {
    return Array.from(new Set(ids || [])).sort().join('|');
  }

  function sameParticipantSet(a, b) {
    const left = Array.from(new Set(a || [])).sort();
    const right = Array.from(new Set(b || [])).sort();
    return left.length === right.length && left.every((id, i) => id === right[i]);
  }

  function findExistingThread(participantIds) {
    return state.threads
      .filter(t => (t.threadType || 'direct') === 'direct')
      .filter(t => sameParticipantSet(activeParticipantIds(t), participantIds || []))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null;
  }

  function messagesForThread(threadId) {
    const thread = state.threads.find(t => t.id === threadId);
    const relatedIds = thread && thread.threadType === 'direct'
      ? state.threads
        .filter(t => (t.threadType || 'direct') === 'direct')
        .filter(t => sameParticipantSet(activeParticipantIds(t), activeParticipantIds(thread)))
        .map(t => t.id)
      : [threadId];
    return state.messages
      .filter(m => relatedIds.includes(m.threadId))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  function enrichThread(thread, userId) {
    const messages = messagesForThread(thread.id);
    const last = messages[messages.length - 1] || null;
    const participantIds = activeParticipantIds(thread);
    const others = participantIds.filter(id => id !== userId);
    const fallbackTitle = others.length
      ? others.map(profileName).join(', ')
      : 'Saved notes';
    const displayTitle = thread.threadType === 'direct'
      ? fallbackTitle
      : (thread.title || fallbackTitle);
    const unreadCount = messages.filter(m =>
      m.senderId !== userId &&
      (!thread.lastReadAt || new Date(m.createdAt) > new Date(thread.lastReadAt))
    ).length;
    return {
      ...thread,
      participantIds,
      title: displayTitle,
      participantNames: participantIds.map(profileName),
      participantAvatars: participantIds.map(profileAvatar),
      otherParticipantIds: others,
      otherParticipantNames: others.map(profileName),
      otherParticipantAvatars: others.map(profileAvatar),
      otherParticipantRoles: others.map(profileRole),
      isGroup: thread.threadType === 'group' || thread.threadType === 'track_group' || participantIds.length > 2,
      lastMessage: last,
      preview: last ? messagePreview(last) : 'No messages yet.',
      unreadCount,
    };
  }

  function messagePreview(message) {
    const text = String(message?.body || '').trim();
    if (text) return text;
    const count = (message?.attachments || []).length;
    if (!count) return 'No messages yet.';
    return count === 1
      ? 'Attachment: ' + ((message.attachments[0] || {}).name || 'file')
      : count + ' attachments';
  }

  function replaceRemote(threads, messages) {
    state.threads = threads.map(normalizeThread);
    state.messages = messages.map(normalizeMessage);
    state.loaded = true;
    state.error = '';
    notify();
  }

  async function refresh(profile) {
    if (!window.__db) {
      state.loaded = true;
      notify();
      return state.threads;
    }
    const userId = await remoteUserId(profile);
    if (!isUuid(userId)) {
      state.loaded = true;
      state.error = 'Sign in with Supabase to load messages.';
      notify();
      return state.threads;
    }
    const participantResult = await window.__db
      .from('message_participants')
      .select('thread_id, user_id, last_read_at, member_role, removed_at, created_at')
      .eq('user_id', userId)
      .is('removed_at', null);
    if (participantResult.error) {
      if (isMissingRemote(participantResult.error)) {
        state.loaded = true;
        state.error = 'Supabase message tables are not installed yet. Run migrations/create_messages_tables.sql.';
        notify();
        return state.threads;
      }
      console.warn('Could not load message participants:', participantResult.error.message || participantResult.error);
      state.loaded = true;
      state.error = participantResult.error.message || 'Could not load messages.';
      notify();
      return state.threads;
    }
    const threadIds = (participantResult.data || []).map(p => p.thread_id);
    if (!threadIds.length) {
      replaceRemote([], []);
      return [];
    }
    const [threadResult, allParticipantsResult, messageResult] = await Promise.all([
      window.__db.from('message_threads').select('*').in('id', threadIds).order('updated_at', { ascending: false }),
      window.__db.from('message_participants').select('thread_id, user_id, last_read_at, member_role, removed_at, created_at').in('thread_id', threadIds),
      window.__db.from('messages').select('*').in('thread_id', threadIds).order('created_at', { ascending: true }),
    ]);
    const error = threadResult.error || allParticipantsResult.error || messageResult.error;
    if (error) {
      if (isMissingRemote(error)) {
        state.loaded = true;
        state.error = 'Supabase message tables are not installed yet. Run migrations/create_messages_tables.sql.';
        notify();
        return state.threads;
      }
      console.warn('Could not load messages:', error.message || error);
      state.loaded = true;
      state.error = error.message || 'Could not load messages.';
      notify();
      return state.threads;
    }
    replaceRemote(
      (threadResult.data || []).map(row => fromThreadRow(row, allParticipantsResult.data || [])),
      (messageResult.data || []).map(fromMessageRow)
    );
    return state.threads;
  }

  function subscribeRemote(profile) {
    if (!window.__db) return () => {};
    const channel = window.__db
      .channel('messages-store-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_threads' }, () => refresh(profile))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_participants' }, () => refresh(profile))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refresh(profile))
      .subscribe();
    return () => {
      if (window.__db && channel) window.__db.removeChannel(channel);
    };
  }

  const store = {
    activeParticipantIds,
    threadsFor: visibleThreads,
    messagesForThread,
    unreadCount(profile) {
      return visibleThreads(profile).reduce((sum, t) => sum + t.unreadCount, 0);
    },
    async createThread({ participantIds, title, body, attachments, profile, threadType = 'direct', cohortId = '', trackCode = '', id = '' }) {
      const userId = window.__db ? await remoteUserId(profile) : (profile?.id || currentUserId());
      if (window.__db && !isUuid(userId)) throw new Error('Sign in with Supabase to send messages.');
      const ids = Array.from(new Set([userId, ...(participantIds || [])].filter(Boolean)));
      if (ids.length < 2) throw new Error('Choose at least one recipient.');
      const normalizedType = threadType || (ids.length > 2 ? 'group' : 'direct');
      if (normalizedType !== 'direct' && ids.length < 3) throw new Error('Choose at least two other members for a group.');
      const existingThread = normalizedType === 'direct' ? findExistingThread(ids) : null;
      if (existingThread) {
        const message = await store.sendMessage({ threadId: existingThread.id, body, attachments, profile });
        return {
          ...existingThread,
          lastMessage: message || messagesForThread(existingThread.id).slice(-1)[0] || null,
          preview: message ? messagePreview(message) : existingThread.preview || 'No messages yet.',
        };
      }
      const now = new Date().toISOString();
      const thread = normalizeThread({
        id: id || genId(normalizedType === 'track_group' ? 'track-group-' : 'thread-'),
        title,
        threadType: normalizedType,
        cohortId,
        trackCode,
        participantIds: ids,
        participants: ids.map(id => normalizeParticipant({ userId: id, memberRole: id === userId ? 'creator' : 'member', createdAt: now })),
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        lastReadAt: now,
      });
      const firstBody = String(body || '').trim();
      const firstAttachments = Array.isArray(attachments) ? attachments.map(normalizeAttachment).filter(Boolean) : [];
      const firstMessage = (firstBody || firstAttachments.length) ? normalizeMessage({
        id: genId('msg-'),
        threadId: thread.id,
        senderId: userId,
        body: firstBody,
        attachments: firstAttachments,
        createdAt: now,
      }) : null;
      state.threads.unshift(thread);
      if (firstMessage) state.messages.push(firstMessage);
      notify();
      if (window.__db) {
        try {
          const { error: threadError } = await window.__db.from('message_threads').insert(toThreadRow(thread));
          if (threadError) throw threadError;
          const participantRows = ids.map(id => ({
            thread_id: thread.id,
            user_id: id,
            member_role: id === userId ? 'creator' : 'member',
            last_read_at: id === userId ? now : null,
            removed_at: null,
          }));
          const { error: participantError } = await window.__db.from('message_participants').upsert(participantRows, { onConflict: 'thread_id,user_id' });
          if (participantError) throw participantError;
          if (firstMessage) {
            const { error: messageError } = await window.__db.from('messages').insert(toMessageRow(firstMessage));
            if (messageError) throw messageError;
          }
          refresh(profile);
        } catch (err) {
          state.threads = state.threads.filter(t => t.id !== thread.id);
          if (firstMessage) state.messages = state.messages.filter(m => m.id !== firstMessage.id);
          state.error = isMissingRemote(err)
            ? 'Supabase message tables are not installed yet. Run migrations/create_messages_tables.sql.'
            : ((err && err.message) || 'Could not save message to Supabase.');
          notify();
          throw err;
        }
      }
      return thread;
    },
    async ensureTrackGroups({ profile, profiles = [] }) {
      const userId = window.__db ? await remoteUserId(profile) : (profile?.id || currentUserId());
      const cohortId = profile?.cohortId || ME.cohort || 'c2627';
      const trackCode = profile?.trackCode || ME.track || 'AIS';
      if (!cohortId || !trackCode) return null;
      const track = (typeof TRACKS !== 'undefined' ? TRACKS : []).find(item => item.code === trackCode);
      const cohort = (typeof COHORTS !== 'undefined' ? COHORTS : []).find(item => item.id === cohortId);
      const roster = (profiles || [])
        .filter(p => p.id && (p.cohortId || 'c2627') === cohortId && (p.trackCode || 'AIS') === trackCode)
        .filter(p => (p.role || 'exonaut') === 'exonaut' || p.id === userId);
      const leadId = window.__crownStore?.getActiveCrownForTrack?.(trackCode)?.userId;
      const ids = Array.from(new Set([userId, leadId, ...roster.map(p => p.id)].filter(Boolean)));
      if (!ids.length) return null;
      const threadId = `track-group-${cohortId}-${trackCode}`;
      const existing = state.threads.find(t => t.id === threadId);
      const title = `${track?.short || trackCode} Track - ${cohort?.code || cohortId}`;
      const now = new Date().toISOString();
      if (!existing) {
        const thread = normalizeThread({
          id: threadId,
          title,
          threadType: 'track_group',
          cohortId,
          trackCode,
          participantIds: ids,
          participants: ids.map(id => normalizeParticipant({ userId: id, memberRole: id === leadId ? 'track_lead' : 'member', createdAt: now })),
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          lastReadAt: now,
        });
        state.threads.unshift(thread);
        notify();
        if (window.__db) {
          const { error: threadError } = await window.__db.from('message_threads').insert(toThreadRow(thread));
          if (threadError && threadError.code !== '23505') throw threadError;
          const { error: participantError } = await window.__db.from('message_participants').upsert(ids.map(id => ({
            thread_id: threadId,
            user_id: id,
            member_role: id === leadId ? 'track_lead' : 'member',
            last_read_at: id === userId ? now : null,
            removed_at: null,
          })), { onConflict: 'thread_id,user_id' });
          if (participantError) throw participantError;
          refresh(profile);
        }
        return thread;
      }
      const existingIds = activeParticipantIds(existing);
      const profileById = new Map((profiles || []).filter(p => p.id).map(p => [p.id, p]));
      const shouldKeepTrackGroupParticipant = (id) => {
        if (ids.includes(id)) return true;
        const participantProfile = profileById.get(id);
        if (!participantProfile) return false;
        return ['admin', 'commander', 'lead'].includes(participantProfile.role || 'exonaut');
      };
      const missingIds = ids.filter(id => !existingIds.includes(id));
      const staleIds = existingIds.filter(id => !shouldKeepTrackGroupParticipant(id));
      if (missingIds.length || staleIds.length) {
        existing.participantIds = Array.from(new Set([...existingIds.filter(id => !staleIds.includes(id)), ...missingIds]));
        existing.participants = [
          ...(existing.participants || [])
            .map(p => staleIds.includes(p.userId) ? { ...p, removedAt: now } : p)
            .filter(p => !missingIds.includes(p.userId)),
          ...missingIds.map(id => normalizeParticipant({ userId: id, memberRole: id === leadId ? 'track_lead' : 'member', createdAt: now })),
        ];
        existing.updatedAt = now;
        notify();
        if (window.__db) {
          if (missingIds.length) {
            const { error } = await window.__db.from('message_participants').upsert(missingIds.map(id => ({
              thread_id: threadId,
              user_id: id,
              member_role: id === leadId ? 'track_lead' : 'member',
              removed_at: null,
            })), { onConflict: 'thread_id,user_id' });
            if (error) throw error;
          }
          if (staleIds.length) {
            const { error } = await window.__db
              .from('message_participants')
              .update({ removed_at: now })
              .eq('thread_id', threadId)
              .in('user_id', staleIds);
            if (error) throw error;
          }
          refresh(profile);
        }
      }
      return existing;
    },
    async createGroup({ title, participantIds, profile }) {
      const cleanTitle = String(title || '').trim();
      if (cleanTitle.length < 3 || cleanTitle.length > 60) throw new Error('Group name must be 3-60 characters.');
      const cohortId = profile?.cohortId || ME.cohort || 'c2627';
      return store.createThread({ participantIds, title: cleanTitle, body: '', attachments: [], profile, threadType: 'group', cohortId });
    },
    async renameThread({ threadId, title, profile }) {
      const cleanTitle = String(title || '').trim();
      if (cleanTitle.length < 3 || cleanTitle.length > 60) throw new Error('Group name must be 3-60 characters.');
      const userId = window.__db ? await remoteUserId(profile) : (profile?.id || currentUserId());
      const thread = state.threads.find(t => t.id === threadId);
      if (!thread || !activeParticipantIds(thread).includes(userId)) throw new Error('You are not a participant in this group.');
      if (thread.threadType === 'track_group') throw new Error('Default track groups cannot be renamed.');
      const oldTitle = thread.title;
      thread.title = cleanTitle;
      thread.updatedAt = new Date().toISOString();
      notify();
      if (window.__db) {
        const { error } = await window.__db.from('message_threads').update({ title: cleanTitle, updated_at: thread.updatedAt }).eq('id', threadId);
        if (error) throw error;
      }
      if (oldTitle !== cleanTitle) {
        await store.sendMessage({ threadId, body: `${profileName(userId)} renamed the group to ${cleanTitle}.`, attachments: [], profile, system: true });
      }
      return thread;
    },
    async removeParticipant({ threadId, userId: removeUserId, profile }) {
      const actor = window.__db ? await remoteUserId(profile) : (profile?.id || currentUserId());
      const thread = state.threads.find(t => t.id === threadId);
      if (!thread || !activeParticipantIds(thread).includes(actor)) throw new Error('You are not a participant in this group.');
      if (actor === removeUserId) throw new Error('You cannot remove yourself here.');
      const now = new Date().toISOString();
      thread.participantIds = activeParticipantIds(thread).filter(id => id !== removeUserId);
      thread.participants = (thread.participants || []).map(p => p.userId === removeUserId ? { ...p, removedAt: now } : p);
      thread.updatedAt = now;
      notify();
      if (window.__db) {
        const { error } = await window.__db
          .from('message_participants')
          .update({ removed_at: now })
          .eq('thread_id', threadId)
          .eq('user_id', removeUserId);
        if (error) throw error;
      }
      await store.sendMessage({ threadId, body: `${profileName(removeUserId)} was removed from the group.`, attachments: [], profile, system: true });
    },
    async addParticipants({ threadId, userIds = [], profile }) {
      const actor = window.__db ? await remoteUserId(profile) : (profile?.id || currentUserId());
      const thread = state.threads.find(t => t.id === threadId);
      if (!thread || !activeParticipantIds(thread).includes(actor)) throw new Error('You are not a participant in this group.');
      if (!thread.isGroup && !['group', 'track_group'].includes(thread.threadType)) throw new Error('Members can only be added to group chats.');
      const now = new Date().toISOString();
      const existingIds = activeParticipantIds(thread);
      const addIds = Array.from(new Set((userIds || []).filter(id => id && !existingIds.includes(id))));
      if (!addIds.length) return thread;
      thread.participantIds = Array.from(new Set([...existingIds, ...addIds]));
      thread.participants = [
        ...(thread.participants || []).filter(p => !addIds.includes(p.userId)),
        ...addIds.map(id => normalizeParticipant({ userId: id, memberRole: 'member', createdAt: now })),
      ];
      thread.updatedAt = now;
      notify();
      if (window.__db) {
        const { error } = await window.__db.from('message_participants').upsert(addIds.map(id => ({
          thread_id: threadId,
          user_id: id,
          member_role: 'member',
          last_read_at: null,
          removed_at: null,
        })), { onConflict: 'thread_id,user_id' });
        if (error) throw error;
      }
      const names = addIds.map(profileName).join(', ');
      await store.sendMessage({ threadId, body: `${profileName(actor)} added ${names} to the group.`, attachments: [], profile, system: true });
      return thread;
    },
    async sendMessage({ threadId, body, attachments, profile }) {
      const text = String(body || '').trim();
      const files = Array.isArray(attachments) ? attachments.map(normalizeAttachment).filter(Boolean) : [];
      if (!text && !files.length) return null;
      const userId = window.__db ? await remoteUserId(profile) : (profile?.id || currentUserId());
      if (window.__db && !isUuid(userId)) throw new Error('Sign in with Supabase to send messages.');
      const now = new Date().toISOString();
      const thread = state.threads.find(t => t.id === threadId);
      if (thread) {
        if (!activeParticipantIds(thread).includes(userId)) throw new Error('You are no longer a participant in this conversation.');
      } else {
        throw new Error('Conversation not found.');
      }
      const message = normalizeMessage({ threadId, senderId: userId, body: text, attachments: files, createdAt: now });
      state.messages.push(message);
      if (thread) {
        thread.updatedAt = now;
        if (activeParticipantIds(thread).includes(userId)) thread.lastReadAt = now;
      }
      notify();
      if (window.__db) {
        try {
          const { error: messageError } = await window.__db.from('messages').insert(toMessageRow(message));
          if (messageError) throw messageError;
          await window.__db.from('message_threads').update({ updated_at: now }).eq('id', threadId);
          await window.__db.from('message_participants').update({ last_read_at: now }).eq('thread_id', threadId).eq('user_id', userId);
          refresh(profile);
        } catch (err) {
          state.messages = state.messages.filter(m => m.id !== message.id);
          if (thread) thread.updatedAt = messagesForThread(threadId).slice(-1)[0]?.createdAt || thread.updatedAt;
          state.error = isMissingRemote(err)
            ? 'Supabase message tables are not installed yet. Run migrations/create_messages_tables.sql.'
            : ((err && err.message) || 'Could not save message to Supabase.');
          notify();
          throw err;
        }
      }
      return message;
    },
    async markThreadRead(threadId, profile) {
      const userId = window.__db ? await remoteUserId(profile) : (profile?.id || currentUserId());
      if (window.__db && !isUuid(userId)) return;
      const now = new Date().toISOString();
      const thread = state.threads.find(t => t.id === threadId);
      if (!thread || !activeParticipantIds(thread).includes(userId)) return;
      thread.lastReadAt = now;
      notify();
      if (window.__db) {
        const { error } = await window.__db
          .from('message_participants')
          .update({ last_read_at: now })
          .eq('thread_id', threadId)
          .eq('user_id', userId);
        if (error) console.warn('Could not mark thread read:', error.message || error);
      }
    },
    timeAgo,
    refresh,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  const local = window.__db ? { threads: [], messages: [] } : loadLocal();
  state.threads = local.threads.map(normalizeThread);
  state.messages = local.messages.map(normalizeMessage);
  window.__messageStore = store;

  window.useMessages = function useMessages(profile) {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = store.subscribe(() => setTick(t => t + 1));
      if (!state.loaded) refresh(profile);
      const unsubRemote = subscribeRemote(profile);
      return () => { unsub(); unsubRemote(); };
    }, [profile?.id]);
    const threads = store.threadsFor(profile);
    return {
      threads,
      messagesForThread: store.messagesForThread,
      unreadCount: threads.reduce((sum, t) => sum + t.unreadCount, 0),
      createThread: (data) => store.createThread({ ...data, profile }),
      createGroup: (data) => store.createGroup({ ...data, profile }),
      renameThread: (data) => store.renameThread({ ...data, profile }),
      removeParticipant: (data) => store.removeParticipant({ ...data, profile }),
      addParticipants: (data) => store.addParticipants({ ...data, profile }),
      ensureTrackGroups: (profiles) => store.ensureTrackGroups({ profile, profiles }),
      sendMessage: (data) => store.sendMessage({ ...data, profile }),
      markThreadRead: (threadId) => store.markThreadRead(threadId, profile),
      timeAgo,
      loaded: state.loaded,
      error: state.error,
      refresh: () => refresh(profile),
    };
  };
})();
