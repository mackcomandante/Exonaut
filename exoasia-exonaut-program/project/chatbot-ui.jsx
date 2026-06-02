// Exonaut AI chatbot — floating popup with dummy responses.
// Phase 2 will swap sendMessage() to call the real Edge Function.

(function () {
  const WELCOME = {
    id: 'welcome',
    role: 'assistant',
    content: "Hi! I'm EX-O. Ask me anything about the program — missions, badges, rituals, how points work, and more.",
    time: new Date().toISOString(),
  };

  const DUMMY_RESPONSES = [
    "I'm still being set up! Once the backend is live, I'll be able to answer your program questions in real time.",
    "Great question! I'll be fully operational soon — the knowledge base is being compiled.",
    "That's something I'll be able to help with once the AI backend is connected. Stay tuned!",
  ];

  const CHAT_HISTORY_KEY = 'exo:exo-chat-history:v1';
  const CHAT_HISTORY_LIMIT = 80;
  const MESSAGE_ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024;
  let dummyIdx = 0;
  const RITUAL_COMMANDS = {
    'mon-ign': ['monday ignition', 'monday', 'ignition'],
    'mid-pls': ['mid-week pulse', 'mid week pulse', 'midweek pulse', 'pulse'],
    'fri-win': ['friday win wall', 'friday win', 'win wall'],
    'teach-bk': ['teach-back', 'teach back', 'teachback'],
  };
  const CHANNEL_COMMANDS = {
    general: ['general'],
    ais: ['ai strategy', 'strategy', 'ais'],
    aid: ['ai data', 'data', 'aid'],
    venture: ['venture', 'venture building'],
    policy: ['policy'],
    content: ['content'],
    experience: ['experience'],
    leadership: ['leadership'],
    alumni: ['alumni'],
  };
  const SLASH_COMMAND_MENU = [
    { command: '/messages', icon: 'fa-envelope', hint: 'Send a direct message' },
    { command: '/kudos', icon: 'fa-hand-sparkles', hint: 'Give kudos to someone' },
    { command: '/project', icon: 'fa-diagram-project', hint: 'Add an action register item' },
    { command: '/ritual', icon: 'fa-calendar-check', hint: 'Log a weekly ritual' },
    { command: '/thread', icon: 'fa-comments', hint: 'Create a community post' },
    { command: '/clear', icon: 'fa-broom', hint: 'Clear EX-O chat history' },
  ];

  function freshWelcome() {
    return { ...WELCOME, time: new Date().toISOString() };
  }

  function plainChatMessages(items) {
    return (Array.isArray(items) ? items : [])
      .filter(msg => msg && !msg.action && (msg.role === 'user' || msg.role === 'assistant'))
      .map(msg => ({
        id: msg.id || ('chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
        role: msg.role,
        content: String(msg.content || ''),
        time: msg.time || new Date().toISOString(),
      }))
      .filter(msg => msg.content.trim())
      .slice(-CHAT_HISTORY_LIMIT);
  }

  function loadChatHistory() {
    try {
      const saved = plainChatMessages(JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]'));
      return saved.length ? saved : [freshWelcome()];
    } catch {
      return [freshWelcome()];
    }
  }

  function saveChatHistory(items) {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(plainChatMessages(items)));
    } catch {}
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  async function remoteChatUserId(profile) {
    if (!window.__db?.auth) return null;
    const sessionResult = await window.__db.auth.getSession();
    const userId = sessionResult?.data?.session?.user?.id || profile?.id || localStorage.getItem('exo:userId');
    return isUuid(userId) ? userId : null;
  }

  function toRemoteMessageRow(message, conversationId, userId) {
    return {
      id: message.id,
      conversation_id: conversationId,
      user_id: userId,
      role: message.role,
      content: message.content,
      created_at: message.time || new Date().toISOString(),
    };
  }

  async function loadRemoteChatHistory(profile) {
    const userId = await remoteChatUserId(profile);
    if (!userId) return null;
    const conversationResult = await window.__db
      .from('chatbot_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(1);
    if (conversationResult.error) throw conversationResult.error;
    const conversation = (conversationResult.data || [])[0];
    if (!conversation?.id) return null;
    const messageResult = await window.__db
      .from('chatbot_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (messageResult.error) throw messageResult.error;
    return {
      conversationId: conversation.id,
      messages: plainChatMessages((messageResult.data || []).map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        time: row.created_at,
      }))),
    };
  }

  async function syncRemoteChatHistory(conversationId, items, profile) {
    const userId = await remoteChatUserId(profile);
    const messages = plainChatMessages(items).filter(msg => msg.id !== 'welcome');
    if (!userId || !conversationId || !messages.length) return;
    const lastMessageAt = messages[messages.length - 1].time || new Date().toISOString();
    const conversationResult = await window.__db
      .from('chatbot_conversations')
      .upsert({
        id: conversationId,
        user_id: userId,
        last_message_at: lastMessageAt,
      }, { onConflict: 'id' });
    if (conversationResult.error) throw conversationResult.error;
    const messageResult = await window.__db
      .from('chatbot_messages')
      .upsert(messages.map(msg => toRemoteMessageRow(msg, conversationId, userId)), { onConflict: 'id' });
    if (messageResult.error) throw messageResult.error;
  }

  async function clearRemoteChatHistory(conversationId, profile) {
    const userId = await remoteChatUserId(profile);
    if (!userId || !conversationId) return;
    const result = await window.__db
      .from('chatbot_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);
    if (result.error) throw result.error;
  }

  async function sendMessage(message, conversationId) {
    const token = localStorage.getItem('sb-vkiikgsxhymnymacwygr-auth-token');
    if (!token) throw new Error('Not authenticated');
    const parsed = JSON.parse(token);
    const accessToken = parsed.access_token;

    const res = await fetch('https://vkiikgsxhymnymacwygr.supabase.co/functions/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversationId }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Chat API error');
    }

    return res.json();
  }

  function TypingDots() {
    return (
      <div className="chatbot-typing">
        <span /><span /><span />
      </div>
    );
  }

  function cleanText(value) {
    return String(value || '').trim().replace(/^["'“”]+|["'“”]+$/g, '').trim();
  }

  function getSlashCommandSuggestion(value) {
    const raw = String(value || '');
    const match = raw.match(/^\/([a-z-]*)(?:\s+([\s\S]*))?$/i);
    if (!match) return '';
    const command = match[1].toLowerCase();
    const body = String(match[2] || '').trim();
    const bodyWords = body ? body.split(/\s+/).filter(Boolean) : [];
    const known = ['messages', 'message', 'msg', 'kudos', 'project', 'action', 'ritual', 'thread', 'post', 'clear'];
    if (!known.some(item => item.startsWith(command))) return '';

    const normalized = command === 'message' || command === 'msg' ? 'messages'
      : command === 'action' ? 'project'
      : command === 'post' ? 'thread'
      : command === 'clear' ? 'clear'
      : command;
    if (normalized === 'clear') return '';

    if (!body) {
      if (normalized === 'messages') return ' [recipient] [message]';
      if (normalized === 'kudos') return ' [recipient] [kudos message]';
      if (normalized === 'project') return ' [project name] [action title]';
      if (normalized === 'ritual') return ' [ritual name] [description/link]';
      if (normalized === 'thread') return ' [channel] [caption]';
    }

    if (normalized === 'messages') return bodyWords.length <= 2 ? ' [message]' : '';
    if (normalized === 'kudos') return bodyWords.length <= 2 ? ' [kudos message]' : '';
    if (normalized === 'project') return bodyWords.length <= 2 ? ' [action title]' : '';
    if (normalized === 'thread') return bodyWords.length <= 1 ? ' [caption]' : '';
    if (normalized === 'ritual') {
      const ritual = findRitual(body);
      if (!ritual) return bodyWords.length <= 2 ? ' [description/link]' : '';
      const remainder = removeRitualWords(body, ritual);
      return remainder ? '' : ' [description/link]';
    }
    return '';
  }

  function profileHandle(profile) {
    return String(profile?.email || profile?.fullName || profile?.id || '')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function findMatches(items, query, labelFn) {
    const q = cleanText(query).toLowerCase().replace(/^@/, '');
    const compact = q.replace(/[^a-z0-9]+/g, '');
    if (!q) return [];
    return items.filter(item => {
      const label = String(labelFn(item) || '').toLowerCase();
      const email = String(item.email || '').toLowerCase();
      const id = String(item.id || '').toLowerCase();
      const handle = profileHandle(item);
      return label.includes(q) || email.includes(q) || id === q || handle.includes(compact) || compact.includes(handle);
    });
  }

  function resolveOne(items, query, labelFn, noun) {
    const matches = findMatches(items, query, labelFn);
    if (matches.length === 1) return { item: matches[0] };
    if (matches.length > 1) {
      return { error: `I found multiple ${noun} matches: ${matches.slice(0, 4).map(labelFn).join(', ')}. Please be more specific.` };
    }
    return { error: `I couldn't find ${noun} matching "${cleanText(query)}".` };
  }

  function mentionTokens(item, labelFn) {
    return [
      labelFn(item),
      item.email,
      String(item.email || '').split('@')[0],
      item.id,
      profileHandle(item),
    ].filter(Boolean)
      .map(value => String(value).trim())
      .filter(value => value.length >= 2);
  }

  function findMentionInText(items, text, labelFn, noun) {
    const source = String(text || '');
    const lower = source.toLowerCase();
    const compact = lower.replace(/[^a-z0-9]+/g, '');
    const matches = [];
    items.forEach(item => {
      const tokens = mentionTokens(item, labelFn);
      const token = tokens
        .sort((a, b) => b.length - a.length)
        .find(candidate => {
          const c = candidate.toLowerCase();
          const cc = c.replace(/[^a-z0-9]+/g, '');
          return lower.includes(c) || (cc.length >= 4 && compact.includes(cc));
        });
      if (token) matches.push({ item, token });
    });
    if (matches.length === 1) {
      const match = matches[0];
      const escaped = match.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const remaining = source
        .replace(new RegExp(escaped, 'i'), '')
        .replace(/\b(to|for|send|message|tell|telling|saying|that|called|under|in)\b/gi, ' ')
        .replace(/[:,-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return { item: match.item, remaining };
    }
    if (matches.length > 1) {
      return { error: `I found multiple ${noun} matches: ${matches.slice(0, 4).map(match => labelFn(match.item)).join(', ')}. Please be more specific.` };
    }
    return { error: `I couldn't find the ${noun}.` };
  }

  function extractDescription(text) {
    const descriptionMatch = text.match(/\b(?:with\s+)?description\s+(.+)$/i);
    if (descriptionMatch) return cleanText(descriptionMatch[1]);
    const captionMatch = text.match(/\b(?:with\s+)?caption\s+(.+)$/i);
    if (captionMatch) return cleanText(captionMatch[1]);
    const sayingMatch = text.match(/\b(?:saying|say)\s+(.+)$/i);
    if (sayingMatch) return cleanText(sayingMatch[1]);
    return cleanText(text.replace(/^log\s+my\s+/i, '').replace(/^log\s+/i, ''));
  }

  function linkFrom(text) {
    return (String(text || '').match(/https?:\/\/\S+/i) || [])[0] || '';
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result || '');
      reader.onerror = () => reject(new Error('Could not read the attached file.'));
      reader.readAsDataURL(file);
    });
  }

  async function fileToMessageAttachment(file) {
    if (!file) return null;
    if (file.size > MESSAGE_ATTACHMENT_MAX_BYTES) {
      throw new Error(`${file.name} is larger than 3 MB.`);
    }
    const dataUrl = await fileToDataUrl(file);
    return {
      name: file.name || 'Attachment',
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
      dataUrl,
    };
  }

  function findRitual(text) {
    const lower = String(text || '').toLowerCase();
    const id = Object.keys(RITUAL_COMMANDS).find(key => RITUAL_COMMANDS[key].some(alias => lower.includes(alias)));
    return id ? RITUALS.find(ritual => ritual.id === id) : null;
  }

  function findChannel(text) {
    const lower = String(text || '').toLowerCase();
    const id = Object.keys(CHANNEL_COMMANDS).find(key => CHANNEL_COMMANDS[key].some(alias => lower.includes(alias)));
    return id || 'general';
  }

  function removeRitualWords(text, ritual) {
    let next = String(text || '');
    (RITUAL_COMMANDS[ritual.id] || []).forEach(alias => {
      next = next.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
    });
    return next.replace(/\b(log|submit|use|my|with|description|caption|link|photo|image|video|attached|attachment)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  function commandAction(type, body, context) {
    const profiles = (context.profiles || []).filter(p => p.id !== context.profile.id);
    const projects = (window.__projectStore?.visibleProjects?.(context.profile) || []).filter(project => project.status !== 'archived');
    const text = cleanText(body);
    if (!text) return { error: `Add details after /${type}.` };

    if (type === 'message' || type === 'messages' || type === 'msg') {
      const found = findMentionInText(profiles, text, p => p.fullName || p.email || p.id, 'recipient');
      if (found.error) return { error: found.error };
      const message = cleanText(
        (text.match(/\b(?:that|saying|say|telling|tell)\s+([\s\S]+)$/i) || [])[1]
        || found.remaining
      );
      if (!message) return { error: 'What message should I send?' };
      return {
        type: 'message',
        title: 'Send Message',
        confirmLabel: 'Confirm Send',
        recipient: found.item,
        body: message,
        details: [['Recipient', found.item.fullName || found.item.email], ['Message', message]],
      };
    }

    if (type === 'kudos') {
      const found = findMentionInText(profiles, text, p => p.fullName || p.email || p.id, 'recipient');
      if (found.error) return { error: found.error };
      const reason = cleanText(
        (text.match(/\b(?:for|saying|say|telling|tell|that)\s+([\s\S]+)$/i) || [])[1]
        || found.remaining
      );
      if (!reason) return { error: 'What should the kudos say?' };
      return {
        type: 'kudos',
        title: 'Give Kudos',
        confirmLabel: 'Confirm Kudos',
        recipient: found.item,
        body: reason,
        details: [['Recipient', found.item.fullName || found.item.email], ['Reason', reason], ['Points', '+0.25 recipient, up to +0.5 giver']],
      };
    }

    if (type === 'project' || type === 'action') {
      const found = findMentionInText(projects, text, p => p.title || p.id, 'project');
      if (found.error) return { error: found.error };
      const access = window.__projectStore.projectAccess(context.profile.id, found.item.id);
      const canManage = context.profile.role === 'admin' || context.profile.role === 'commander' || access === 'first' || access === 'lead';
      if (!canManage) return { error: 'You do not have permission to create actions for that project.' };
      const actionTitle = cleanText((text.match(/\b(?:called|title|task|action)\s+([\s\S]+)$/i) || [])[1] || found.remaining);
      if (!actionTitle) return { error: 'What action should I add?' };
      return {
        type: 'project-action',
        title: 'Add Project Action',
        confirmLabel: 'Confirm Add Action',
        project: found.item,
        body: actionTitle,
        details: [['Project', found.item.title], ['Action', actionTitle]],
      };
    }

    if (type === 'ritual') {
      const ritual = findRitual(text);
      if (!ritual) return { error: 'Which ritual should I log? Try Monday Ignition, Mid-Week Pulse, Friday Win Wall, or Teach-Back.' };
      const records = window.__ritualStore?.recordsFor?.(context.profile.id) || {};
      if (records[ritual.id]?.state === 'done') return { error: `${ritual.name} is already logged for this week.` };
      const url = linkFrom(text);
      const description = cleanText(
        (text.match(/\b(?:description|caption|saying|say)\s+([\s\S]+)$/i) || [])[1]
        || removeRitualWords(text, ritual)
      );
      return {
        type: 'ritual',
        title: 'Log Ritual',
        confirmLabel: 'Confirm Log Ritual',
        ritual,
        body: description,
        url,
        file: context.attachment || null,
        details: [['Ritual', ritual.name], ['Description', description || 'No description'], ['Link', url || 'None'], ['Attachment', context.attachment?.name || 'None'], ['Points', `+${ritual.points}`]],
      };
    }

    if (type === 'thread' || type === 'post') {
      const channel = findChannel(text);
      const aliases = CHANNEL_COMMANDS[channel] || [];
      let caption = text;
      aliases.forEach(alias => {
        caption = caption.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
      });
      caption = cleanText((text.match(/\b(?:caption|saying|say)\s+([\s\S]+)$/i) || [])[1] || caption.replace(/\b(to|under|in|channel|thread|post|this|image|photo)\b/gi, ' '));
      return {
        type: 'thread-post',
        title: 'Create Thread Post',
        confirmLabel: 'Confirm Post',
        channel,
        body: caption,
        file: context.attachment || null,
        details: [['Channel', window.BOARD_CHANNELS?.find(item => item.id === channel)?.label || channel], ['Caption', caption || 'Attachment post'], ['Attachment', context.attachment?.name || 'None']],
      };
    }

    return { error: `I don't know /${type} yet. Try /kudos, /messages, /project, /ritual, or /thread.` };
  }

  function parseAgentAction(text, context) {
    const slash = String(text || '').match(/^\/([a-z-]+)\s*([\s\S]*)$/i);
    if (slash) return commandAction(slash[1].toLowerCase(), slash[2], context);
    const profiles = context.profiles || [];
    const projects = (window.__projectStore?.visibleProjects?.(context.profile) || []).filter(project => project.status !== 'archived');
    let match = text.match(/^message\s+(.+?)\s+(?:that|saying|say)\s+([\s\S]+)$/i)
      || text.match(/^send\s+(.+?)\s+(?:a\s+)?message(?:\s+(?:that|saying|say))?\s+([\s\S]+)$/i);
    if (match) {
      const found = resolveOne(profiles.filter(p => p.id !== context.profile.id), match[1], p => p.fullName || p.email || p.id, 'user');
      if (found.error) return { error: found.error };
      return {
        type: 'message',
        title: 'Send Message',
        confirmLabel: 'Confirm Send',
        recipient: found.item,
        body: cleanText(match[2]),
        details: [
          ['Recipient', found.item.fullName || found.item.email],
          ['Message', cleanText(match[2])],
        ],
      };
    }

    match = text.match(/^(?:give\s+)?kudos\s+to\s+(.+?)\s+for\s+([\s\S]+)$/i)
      || text.match(/^(?:make|create|draft)\s+(?:a\s+)?kudos(?:\s+for\s+me)?\s+to\s+send\s+(.+?)\s+(?:telling|saying|that|for)\s+([\s\S]+)$/i)
      || text.match(/^(?:make|create|draft)\s+(?:a\s+)?kudos\s+for\s+(.+?)\s+(?:telling|saying|that|for)\s+([\s\S]+)$/i);
    if (match) {
      const found = resolveOne(profiles.filter(p => p.id !== context.profile.id), match[1], p => p.fullName || p.email || p.id, 'user');
      if (found.error) return { error: found.error };
      return {
        type: 'kudos',
        title: 'Give Kudos',
        confirmLabel: 'Confirm Kudos',
        recipient: found.item,
        body: cleanText(match[2]),
        details: [
          ['Recipient', found.item.fullName || found.item.email],
          ['Reason', cleanText(match[2])],
          ['Points', '+0.25 recipient, up to +0.5 giver'],
        ],
      };
    }

    match = text.match(/^add\s+an?\s+action\s+register\s+item\s+to\s+(.+?):\s*([\s\S]+)$/i)
      || text.match(/^create\s+(?:a\s+)?project\s+action\s+for\s+(.+?)\s+called\s+([\s\S]+)$/i);
    if (match) {
      const found = resolveOne(projects, match[1], p => p.title || p.id, 'project');
      if (found.error) return { error: found.error };
      const access = window.__projectStore.projectAccess(context.profile.id, found.item.id);
      const canManage = context.profile.role === 'admin' || context.profile.role === 'commander' || access === 'first' || access === 'lead';
      if (!canManage) return { error: 'You do not have permission to create actions for that project.' };
      return {
        type: 'project-action',
        title: 'Add Project Action',
        confirmLabel: 'Confirm Add Action',
        project: found.item,
        body: cleanText(match[2]),
        details: [
          ['Project', found.item.title],
          ['Action', cleanText(match[2])],
        ],
      };
    }

    if (/\b(log|use|submit)\b/i.test(text)) {
      const ritual = findRitual(text);
      if (ritual) {
        const records = window.__ritualStore?.recordsFor?.(context.profile.id) || {};
        if (records[ritual.id]?.state === 'done') return { error: `${ritual.name} is already logged for this week.` };
        const description = extractDescription(text);
        const url = linkFrom(text);
        return {
          type: 'ritual',
          title: 'Log Ritual',
          confirmLabel: 'Confirm Log Ritual',
          ritual,
          body: description,
          url,
          file: context.attachment || null,
          details: [
            ['Ritual', ritual.name],
            ['Description', description || 'No description'],
            ['Link', url || 'None'],
            ['Attachment', context.attachment?.name || 'None'],
            ['Points', `+${ritual.points}`],
          ],
        };
      }
    }

    if (/\b(post|create)\b/i.test(text) && /\b(thread|community|caption|post)\b/i.test(text)) {
      const channel = findChannel(text);
      const caption = cleanText(
        (text.match(/\b(?:caption|saying|say)\s+([\s\S]+)$/i) || [])[1]
        || text.replace(/^post\s+(?:this\s+)?(?:image\s+)?/i, '').replace(/^create\s+a?\s*community\s+post\s+(?:saying\s+)?/i, '')
      );
      return {
        type: 'thread-post',
        title: 'Create Thread Post',
        confirmLabel: 'Confirm Post',
        channel,
        body: caption,
        file: context.attachment || null,
        details: [
          ['Channel', window.BOARD_CHANNELS?.find(item => item.id === channel)?.label || channel],
          ['Caption', caption || 'Attachment post'],
          ['Attachment', context.attachment?.name || 'None'],
        ],
      };
    }

    return null;
  }

  async function executeAgentAction(action, context) {
    if (action.type === 'message') {
      const attachment = action.file ? await fileToMessageAttachment(action.file) : null;
      await window.__messageStore.createThread({
        participantIds: [action.recipient.id],
        title: action.recipient.fullName || action.recipient.email || 'Direct message',
        body: action.body,
        attachments: attachment ? [attachment] : [],
        profile: context.profile,
      });
      return 'Message sent.';
    }
    if (action.type === 'kudos') {
      await window.__kudosStore.give({
        from: context.profile.id,
        fromName: context.profile.fullName || context.profile.email || ME.name,
        fromRole: context.profile.role || 'exonaut',
        to: action.recipient.id,
        toName: action.recipient.fullName || action.recipient.email,
        msg: action.body,
        cohortId: context.profile.cohortId || 'c2627',
      });
      return 'Kudos sent.';
    }
    if (action.type === 'project-action') {
      await window.__projectStore.saveTask({
        projectId: action.project.id,
        trackCode: action.project.trackCodes?.[0] || context.profile.trackCode || 'GENERAL',
        accountableId: action.project.firstOfficerId || context.profile.id,
        topic: 'EX-O',
        title: action.body,
        brief: action.body,
        status: 'todo',
        nextStep: '',
        blockers: '',
        displayOrder: Math.floor(Date.now() / 1000),
      });
      return 'Project action added.';
    }
    if (action.type === 'ritual') {
      const fileDataUrl = action.file ? await fileToDataUrl(action.file) : '';
      await window.__ritualStore.completeRitual(action.ritual.id, {
        title: action.ritual.name,
        description: action.body,
        link: action.url,
        fileName: action.file?.name || '',
        fileSize: action.file?.size || '',
        fileType: action.file?.type || '',
        fileDataUrl,
      }, {
        userId: context.profile.id,
        cohortId: context.profile.cohortId || 'c2627',
        profile: context.profile,
      });
      return `${action.ritual.name} logged.`;
    }
    if (action.type === 'thread-post') {
      await window.__boardStore.createPost({
        channel: action.channel || 'general',
        title: '',
        body: action.body,
        mentionIds: [],
        files: action.file ? [action.file] : [],
        profile: context.profile,
      });
      return 'Thread post created.';
    }
    throw new Error('Unsupported EX-O action.');
  }

  function AgentActionCard({ action, onConfirm, onCancel, busy }) {
    const [file, setFile] = React.useState(action.file || null);
    const [preview, setPreview] = React.useState('');
    const inputRef = React.useRef(null);
    const canAttach = action.type === 'ritual' || action.type === 'thread-post' || action.type === 'message';
    const isMessage = action.type === 'message';

    React.useEffect(() => {
      if (!file || !String(file.type || '').startsWith('image/')) {
        setPreview('');
        return undefined;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }, [file]);

    return (
      <div className="exo-action-card">
        <div className="exo-action-kicker">EX-O ACTION</div>
        <h3>{action.title}</h3>
        <div className="exo-action-details">
          {(action.details || []).filter(([label]) => label !== 'Attachment').map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        {canAttach && (
          <div className="exo-action-attachment">
            <input
              ref={inputRef}
              type="file"
              accept={isMessage ? undefined : 'image/*,video/*'}
              onChange={event => setFile(event.target.files?.[0] || null)}
            />
            {preview && <img src={preview} alt="Attachment preview" />}
            <div>
              <span>Attachment</span>
              <strong>{file?.name || 'None selected'}</strong>
            </div>
            <div className="exo-action-attachment-buttons">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                <i className={'fa-solid ' + (isMessage ? 'fa-paperclip' : 'fa-image')} /> {file ? 'Change' : (isMessage ? 'Attach file' : 'Attach')}
              </button>
              {file && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }} disabled={busy}>
                  Remove
                </button>
              )}
            </div>
          </div>
        )}
        <div className="exo-action-buttons">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onConfirm(file)} disabled={busy}>
            {busy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
            {busy ? 'Working...' : action.confirmLabel}
          </button>
        </div>
      </div>
    );
  }

  function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';
    return (
      <div className={'chatbot-msg ' + (isUser ? 'user' : 'assistant')}>
        {!isUser && (
          <div className="chatbot-msg-avatar">
            <i className="fa-solid fa-robot" />
          </div>
        )}
        <div className={'chatbot-msg-bubble' + (msg.action ? ' has-action' : '')}>
          {msg.action
            ? <AgentActionCard action={msg.action} onConfirm={msg.onConfirm} onCancel={msg.onCancel} busy={msg.busy} />
            : msg.content}
        </div>
      </div>
    );
  }

  function ChatbotPopup({ onClose }) {
    const { profile } = useCurrentUserProfile();
    const { profiles } = useUserProfiles();
    useMessages(profile);
    useKudos();
    useBoard(profile);
    useRitualState(profile.id);
    useProjects();
    const [messages, setMessages] = React.useState(loadChatHistory);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const bottomRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const conversationId = React.useRef('conv-' + Date.now());
    const remoteProfileId = React.useRef(null);
    const [remoteReady, setRemoteReady] = React.useState(!window.__db);

    React.useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    React.useEffect(() => {
      inputRef.current?.focus();
    }, []);

    React.useEffect(() => {
      let cancelled = false;
      remoteProfileId.current = null;
      if (window.__db) setRemoteReady(false);
      async function loadRemote() {
        if (!window.__db) return;
        try {
          const remote = await loadRemoteChatHistory(profile);
          if (cancelled) return;
          if (remote?.conversationId) conversationId.current = remote.conversationId;
          if (remote?.messages?.length) setMessages([freshWelcome(), ...remote.messages]);
        } catch (err) {
          console.warn('Could not load EX-O chat history:', err?.message || err);
        } finally {
          if (!cancelled) {
            remoteProfileId.current = profile?.id || null;
            setRemoteReady(true);
          }
        }
      }
      loadRemote();
      return () => { cancelled = true; };
    }, [profile?.id]);

    React.useEffect(() => {
      saveChatHistory(messages);
      if (!window.__db || !remoteReady || remoteProfileId.current !== (profile?.id || null)) return;
      syncRemoteChatHistory(conversationId.current, messages, profile).catch(err => {
        console.warn('Could not sync EX-O chat history:', err?.message || err);
      });
    }, [messages, remoteReady, profile?.id]);

    async function handleSend() {
      const text = input.trim();
      if (!text || loading) return;
      if (text.toLowerCase() === '/clear') {
        localStorage.removeItem(CHAT_HISTORY_KEY);
        if (window.__db) {
          clearRemoteChatHistory(conversationId.current, profile).catch(err => {
            console.warn('Could not clear EX-O chat history:', err?.message || err);
          });
        }
        conversationId.current = 'conv-' + Date.now();
        setMessages([freshWelcome()]);
        setInput('');
        return;
      }
      const userMsg = { id: 'u-' + Date.now(), role: 'user', content: text, time: new Date().toISOString() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      const proposed = text ? parseAgentAction(text, { profile, profiles }) : null;
      if (proposed?.error) {
        setMessages(prev => [...prev, { id: 'exo-err-' + Date.now(), role: 'assistant', content: proposed.error, time: new Date().toISOString() }]);
        return;
      }
      if (proposed) {
        const actionId = 'act-' + Date.now();
        const actionMsg = {
          id: actionId,
          role: 'assistant',
          content: '',
          action: proposed,
          busy: false,
          time: new Date().toISOString(),
        };
        actionMsg.onCancel = () => {
          setMessages(prev => prev.map(msg => msg.id === actionId ? { ...msg, action: null, content: 'Cancelled. Nothing was changed.' } : msg));
        };
        actionMsg.onConfirm = async (file) => {
          setMessages(prev => prev.map(msg => msg.id === actionId ? { ...msg, busy: true } : msg));
          try {
            const result = await executeAgentAction({ ...proposed, file: file || null }, { profile });
            setMessages(prev => prev.map(msg => msg.id === actionId ? { ...msg, action: null, busy: false, content: result } : msg));
          } catch (err) {
            setMessages(prev => prev.map(msg => msg.id === actionId ? { ...msg, busy: false, action: null, content: err?.message || 'EX-O could not complete that action.' } : msg));
          }
        };
        setMessages(prev => [...prev, actionMsg]);
        return;
      }
      setLoading(true);
      try {
        const result = await sendMessage(text, conversationId.current);
        const aiMsg = { id: 'a-' + Date.now(), role: 'assistant', content: result.content, time: new Date().toISOString() };
        setMessages(prev => [...prev, aiMsg]);
      } catch {
        const errMsg = { id: 'e-' + Date.now(), role: 'assistant', content: 'Something went wrong. Please try again.', time: new Date().toISOString() };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setLoading(false);
      }
    }

    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }

    const slashSuggestion = getSlashCommandSuggestion(input);
    const showCommandMenu = input === '/';

    return (
      <div className="chatbot-popup">
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-header-icon"><i className="fa-solid fa-robot" /></div>
            <div>
              <div className="chatbot-header-title">EX-O</div>
              <div className="chatbot-header-sub">Program Assistant</div>
            </div>
          </div>
          <button className="chatbot-close" onClick={onClose} title="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="chatbot-messages">
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {loading && (
            <div className="chatbot-msg assistant">
              <div className="chatbot-msg-avatar"><i className="fa-solid fa-robot" /></div>
              <div className="chatbot-msg-bubble"><TypingDots /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chatbot-input-area">
          {showCommandMenu && (
            <div className="chatbot-command-menu">
              {SLASH_COMMAND_MENU.map(item => (
                <button
                  type="button"
                  key={item.command}
                  onClick={() => {
                    setInput(item.command + ' ');
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                >
                  <i className={'fa-solid ' + item.icon} />
                  <strong>{item.command}</strong>
                  <span>{item.hint}</span>
                </button>
              ))}
            </div>
          )}
          <div className="chatbot-input-wrap">
            {slashSuggestion && (
              <div className="chatbot-input-ghost" aria-hidden="true">
                <span className="chatbot-input-ghost-typed">{input}</span><span>{slashSuggestion}</span>
              </div>
            )}
            <textarea
              ref={inputRef}
              className={'chatbot-input' + (input.trim().startsWith('/') ? ' command-mode' : '')}
              placeholder="Ask EX-O or use /kudos, /messages, /project, /ritual..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
          </div>
          <button
            className="chatbot-send"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="Send"
          >
            <i className="fa-solid fa-paper-plane" />
          </button>
        </div>
      </div>
    );
  }

  function Chatbot() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        {open && <ChatbotPopup onClose={() => setOpen(false)} />}
        <button
          className="floating-action floating-chatbot"
          onClick={() => setOpen(v => !v)}
          title="EX-O"
          style={{
            position: 'fixed', bottom: 20, right: 136, zIndex: 140,
            background: open ? 'var(--accent)' : 'var(--bg-darkest)',
            color: open ? 'var(--on-accent)' : 'var(--accent)',
            border: '1.5px solid var(--accent)',
            borderRadius: '50%', width: 48, height: 48,
            display: 'grid', placeItems: 'center', fontSize: 16,
            boxShadow: open ? 'var(--accent-glow)' : '0 2px 12px rgba(0,0,0,0.4)',
            cursor: 'pointer', transition: 'all 0.18s ease',
          }}
        >
          <i className={'fa-solid ' + (open ? 'fa-xmark' : 'fa-robot')} />
        </button>
      </>
    );
  }

  window.Chatbot = Chatbot;
})();
