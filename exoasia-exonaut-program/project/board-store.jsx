// Community message board data store. Supabase is primary; localStorage is a
// compact offline fallback so the static prototype still remains usable.
(function () {
  if (window.__boardStore) return;

  const STORE_KEY = 'exo:community-board:v3';
  const listeners = new Set();
  const state = { posts: [], loaded: false, loading: false, error: '' };

  function genId(prefix) {
    return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function currentUserId(profile) {
    return profile?.id || localStorage.getItem('exo:userId') || ME_ID || 'anonymous';
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  async function authUserId(profile) {
    const id = currentUserId(profile);
    if (!window.__db || isUuid(id)) return id;
    const result = await window.__db.auth.getSession();
    return result?.data?.session?.user?.id || id;
  }

  function missingSchema(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return error?.code === '42P01' || error?.code === 'PGRST204' ||
      message.includes('does not exist') || message.includes('schema cache');
  }

  function readLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return Array.isArray(parsed.posts) ? parsed.posts.map(normalizePost) : [];
    } catch (e) {
      return [];
    }
  }

  function persistLocal() {
    if (window.__db) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ posts: state.posts })); } catch (e) {}
  }

  function notify() {
    persistLocal();
    listeners.forEach(fn => fn());
  }

  function profileFor(id) {
    return (window.__profileDirectory || []).find(p => p.id === id) || null;
  }

  function normalizeMedia(media) {
    return {
      id: media.id || genId('media-'),
      type: media.type === 'video' ? 'video' : 'image',
      url: media.url || '',
      storagePath: media.storagePath || '',
      name: media.name || 'Attachment',
      mimeType: media.mimeType || '',
    };
  }

  function normalizeComment(comment) {
    return {
      id: comment.id || genId('comment-'),
      postId: comment.postId || '',
      parentCommentId: comment.parentCommentId || null,
      authorId: comment.authorId || '',
      authorName: comment.authorName || profileFor(comment.authorId)?.fullName || 'Exonaut',
      authorRole: comment.authorRole || profileFor(comment.authorId)?.role || 'exonaut',
      body: String(comment.body || '').trim(),
      mentionIds: Array.isArray(comment.mentionIds) ? comment.mentionIds : [],
      createdAt: comment.createdAt || nowIso(),
      updatedAt: comment.updatedAt || comment.createdAt || nowIso(),
      replies: Array.isArray(comment.replies) ? comment.replies.map(normalizeComment) : [],
    };
  }

  function normalizePost(post) {
    return {
      id: post.id || genId('post-'),
      channel: post.channel || 'general',
      title: String(post.title || '').trim(),
      body: String(post.body || '').trim(),
      authorId: post.authorId || '',
      authorName: post.authorName || profileFor(post.authorId)?.fullName || 'Exonaut',
      authorRole: post.authorRole || profileFor(post.authorId)?.role || 'exonaut',
      mentionIds: Array.isArray(post.mentionIds) ? post.mentionIds : [],
      createdAt: post.createdAt || nowIso(),
      updatedAt: post.updatedAt || post.createdAt || nowIso(),
      media: Array.isArray(post.media) ? post.media.map(normalizeMedia) : [],
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments) ? post.comments.map(normalizeComment) : [],
    };
  }

  function threadComments(rows, postId) {
    const byId = {};
    const roots = [];
    rows.filter(row => row.post_id === postId).forEach(row => {
      byId[row.id] = normalizeComment({
        id: row.id,
        postId: row.post_id,
        parentCommentId: row.parent_comment_id,
        authorId: row.author_id,
        authorName: row.author_name,
        authorRole: row.author_role,
        body: row.body,
        mentionIds: row.mention_ids || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    });
    Object.values(byId).forEach(comment => {
      if (comment.parentCommentId && byId[comment.parentCommentId]) byId[comment.parentCommentId].replies.push(comment);
      else roots.push(comment);
    });
    return roots.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  function fromRows(posts, media, likes, comments) {
    return (posts || []).map(row => normalizePost({
      id: row.id,
      channel: row.channel,
      title: row.title,
      body: row.body,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      mentionIds: row.mention_ids || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      media: (media || []).filter(item => item.post_id === row.id).map(item => ({
        id: item.id,
        type: item.media_type,
        url: item.public_url,
        storagePath: item.storage_path,
        name: item.file_name,
        mimeType: item.mime_type,
      })),
      likes: (likes || []).filter(like => like.post_id === row.id).map(like => like.user_id),
      comments: threadComments(comments || [], row.id),
    }));
  }

  function countComments(post) {
    let count = 0;
    const walk = comments => (comments || []).forEach(comment => {
      count += 1;
      walk(comment.replies);
    });
    walk(post.comments);
    return count;
  }

  function discussionMetrics(post) {
    const metrics = {
      comments: 0,
      replies: 0,
      latestActivityAt: new Date(post.createdAt || Date.now()).getTime(),
    };
    const walk = (comments, depth) => (comments || []).forEach(comment => {
      if (depth === 0) metrics.comments += 1;
      else metrics.replies += 1;
      metrics.latestActivityAt = Math.max(
        metrics.latestActivityAt,
        new Date(comment.createdAt || post.createdAt || Date.now()).getTime()
      );
      walk(comment.replies, depth + 1);
    });
    walk(post.comments, 0);
    return metrics;
  }

  function engagementScore(post) {
    const metrics = discussionMetrics(post);
    return (post.likes || []).length * 2 + metrics.comments * 3 + metrics.replies * 2;
  }

  function timeAgo(value) {
    const delta = Math.max(0, Date.now() - new Date(value || Date.now()).getTime());
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return Math.floor(days / 7) + 'w ago';
  }

  function hotScore(post) {
    const metrics = discussionMetrics(post);
    const ageHours = Math.max(0, (Date.now() - metrics.latestActivityAt) / 3600000);
    const freshnessBoost = ageHours < 6 ? 15 : ageHours < 24 ? 10 : ageHours < 72 ? 5 : 0;
    return engagementScore(post) + freshnessBoost;
  }

  function newestFirst(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  }

  function latestActivityFirst(a, b) {
    return discussionMetrics(b).latestActivityAt - discussionMetrics(a).latestActivityAt || newestFirst(a, b);
  }

  async function refresh(profile) {
    if (!window.__db) {
      state.posts = readLocal();
      state.loaded = true;
      state.loading = false;
      notify();
      return state.posts;
    }
    state.loading = true;
    state.error = '';
    notify();
    const [postsResult, mediaResult, likesResult, commentsResult] = await Promise.all([
      window.__db.from('community_posts').select('*').order('created_at', { ascending: false }),
      window.__db.from('community_post_media').select('*'),
      window.__db.from('community_post_likes').select('post_id, user_id'),
      window.__db.from('community_comments').select('*').order('created_at', { ascending: true }),
    ]);
    const error = postsResult.error || mediaResult.error || likesResult.error || commentsResult.error;
    if (error) {
      state.loaded = true;
      state.loading = false;
      state.error = missingSchema(error)
        ? 'Community storage is not installed yet. Run migrations/create_community_board_tables.sql in Supabase.'
        : (error.message || 'Could not load community posts.');
      notify();
      return state.posts;
    }
    state.posts = fromRows(postsResult.data, mediaResult.data, likesResult.data, commentsResult.data);
    state.loaded = true;
    state.loading = false;
    notify();
    return state.posts;
  }

  function subscribeRemote(profile) {
    if (!window.__db) return () => {};
    const channel = window.__db
      .channel('community-board-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => refresh(profile))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_post_media' }, () => refresh(profile))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_post_likes' }, () => refresh(profile))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, () => refresh(profile))
      .subscribe();
    return () => window.__db.removeChannel(channel);
  }

  function fileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadFiles(files, postId, profile) {
    const attachments = Array.from(files || []);
    if (attachments.length > 6) throw new Error('Attach up to 6 images or videos per post.');
    const userId = await authUserId(profile);
    return Promise.all(attachments.map(async file => {
      const isImage = String(file.type || '').startsWith('image/');
      const isVideo = String(file.type || '').startsWith('video/');
      if (!isImage && !isVideo) throw new Error('Only images and videos can be attached.');
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) throw new Error(isVideo ? 'Videos must be 100MB or smaller.' : 'Images must be 10MB or smaller.');
      if (!window.__db) {
        return normalizeMedia({
          type: isVideo ? 'video' : 'image',
          url: await fileAsDataUrl(file),
          name: file.name,
          mimeType: file.type,
        });
      }
      if (!isUuid(userId)) throw new Error('You must be signed in to upload media.');
      const ext = String(file.name || 'upload').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || (isVideo ? 'mp4' : 'jpg');
      const path = `${userId}/${postId}/${genId('asset-')}.${ext}`;
      const upload = await window.__db.storage.from('community-media').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const publicUrl = window.__db.storage.from('community-media').getPublicUrl(path).data?.publicUrl || '';
      return normalizeMedia({
        id: genId('media-'),
        type: isVideo ? 'video' : 'image',
        url: publicUrl,
        storagePath: path,
        name: file.name,
        mimeType: file.type,
      });
    }));
  }

  const store = {
    list({ channel = 'all', sort = 'hot', search = '' } = {}) {
      const q = String(search || '').trim().toLowerCase();
      const filtered = state.posts.filter(post => {
        if (channel !== 'all' && post.channel !== channel) return false;
        if (!q) return true;
        return [post.title, post.body, post.authorName, post.channel]
          .some(value => String(value || '').toLowerCase().includes(q));
      });
      if (sort === 'new') return filtered.sort(newestFirst);
      if (sort === 'top') return filtered.sort((a, b) => engagementScore(b) - engagementScore(a) || newestFirst(a, b));
      return filtered.sort((a, b) => hotScore(b) - hotScore(a) || latestActivityFirst(a, b));
    },
    countComments,
    timeAgo,
    refresh,
    async createPost({ channel, title, body, mentionIds, files, profile }) {
      const authorId = await authUserId(profile);
      if (window.__db && !isUuid(authorId)) throw new Error('You must be signed in to create a post.');
      if (!String(title || '').trim() && !String(body || '').trim() && !(files || []).length) {
        throw new Error('Add text, an image, or a video before posting.');
      }
      const post = normalizePost({
        id: genId('post-'),
        channel,
        title,
        body,
        authorId,
        authorName: profile?.fullName || ME.name,
        authorRole: profile?.role || 'exonaut',
        mentionIds,
        createdAt: nowIso(),
      });
      post.media = await uploadFiles(files, post.id, profile);
      state.posts.unshift(post);
      notify();
      if (!window.__db) return post;
      const postRow = {
        id: post.id,
        channel: post.channel,
        title: post.title,
        body: post.body,
        author_id: authorId,
        author_name: post.authorName,
        author_role: post.authorRole,
        mention_ids: post.mentionIds,
      };
      const insertPost = await window.__db.from('community_posts').insert(postRow);
      if (insertPost.error) {
        state.posts = state.posts.filter(item => item.id !== post.id);
        notify();
        throw insertPost.error;
      }
      if (post.media.length) {
        const insertMedia = await window.__db.from('community_post_media').insert(post.media.map(item => ({
          id: item.id,
          post_id: post.id,
          media_type: item.type,
          public_url: item.url,
          storage_path: item.storagePath,
          file_name: item.name,
          mime_type: item.mimeType,
        })));
        if (insertMedia.error) throw insertMedia.error;
      }
      await refresh(profile);
      return post;
    },
    async deletePost(postId, profile) {
      const previous = state.posts;
      state.posts = state.posts.filter(post => post.id !== postId);
      notify();
      if (!window.__db) return;
      const result = await window.__db.from('community_posts').delete().eq('id', postId);
      if (result.error) {
        state.posts = previous;
        notify();
        throw result.error;
      }
      await refresh(profile);
    },
    async toggleLike(postId, profile) {
      const userId = await authUserId(profile);
      if (window.__db && !isUuid(userId)) throw new Error('You must be signed in to like a post.');
      const post = state.posts.find(item => item.id === postId);
      if (!post) return;
      const liked = post.likes.includes(userId);
      post.likes = liked ? post.likes.filter(id => id !== userId) : [...post.likes, userId];
      notify();
      if (!window.__db) return;
      const result = liked
        ? await window.__db.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', userId)
        : await window.__db.from('community_post_likes').insert({ post_id: postId, user_id: userId });
      if (result.error) {
        post.likes = liked ? [...post.likes, userId] : post.likes.filter(id => id !== userId);
        notify();
        throw result.error;
      }
    },
    async addComment({ postId, parentCommentId, body, mentionIds, profile }) {
      const authorId = await authUserId(profile);
      const text = String(body || '').trim();
      if (!text) throw new Error('Comment cannot be empty.');
      if (window.__db && !isUuid(authorId)) throw new Error('You must be signed in to comment.');
      const comment = normalizeComment({
        id: genId('comment-'),
        postId,
        parentCommentId,
        body: text,
        authorId,
        authorName: profile?.fullName || ME.name,
        authorRole: profile?.role || 'exonaut',
        mentionIds,
      });
      const post = state.posts.find(item => item.id === postId);
      if (!post) throw new Error('That post no longer exists.');
      if (parentCommentId) {
        const addReply = comments => {
          for (const candidate of comments) {
            if (candidate.id === parentCommentId) {
              candidate.replies.push(comment);
              return true;
            }
            if (addReply(candidate.replies)) return true;
          }
          return false;
        };
        if (!addReply(post.comments)) throw new Error('That comment no longer exists.');
      } else {
        post.comments.push(comment);
      }
      notify();
      if (!window.__db) return comment;
      const result = await window.__db.from('community_comments').insert({
        id: comment.id,
        post_id: postId,
        parent_comment_id: parentCommentId || null,
        author_id: authorId,
        author_name: comment.authorName,
        author_role: comment.authorRole,
        body: text,
        mention_ids: comment.mentionIds,
      });
      if (result.error) {
        await refresh(profile);
        throw result.error;
      }
      return comment;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  window.BOARD_CHANNELS = [
    { id: 'all', label: 'All', icon: 'fa-layer-group', color: 'var(--off-white)' },
    { id: 'general', label: 'General', icon: 'fa-comments', color: 'var(--lavender)' },
    { id: 'ais', label: 'AI Strategy', icon: 'fa-brain', color: 'var(--lime)' },
    { id: 'aid', label: 'AI Data', icon: 'fa-database', color: 'var(--sky)' },
    { id: 'vb', label: 'Venture', icon: 'fa-rocket', color: 'var(--amber)' },
    { id: 'pol', label: 'Policy', icon: 'fa-scale-balanced', color: 'var(--lavender)' },
    { id: 'cc', label: 'Content', icon: 'fa-pen-nib', color: 'var(--platinum)' },
    { id: 'xm', label: 'Experience', icon: 'fa-palette', color: 'var(--peach)' },
    { id: 'lp', label: 'Leadership', icon: 'fa-compass', color: 'var(--ink)' },
    { id: 'alumni', label: 'Alumni', icon: 'fa-user-astronaut', color: 'var(--lavender)' },
  ];

  state.posts = window.__db ? [] : readLocal();
  state.loaded = !window.__db;
  window.__boardStore = store;

  window.useBoard = function useBoard(profile) {
    const [, rerender] = React.useState(0);
    React.useEffect(() => {
      const unsub = store.subscribe(() => rerender(value => value + 1));
      store.refresh(profile);
      const unsubRemote = subscribeRemote(profile);
      return () => { unsub(); unsubRemote(); };
    }, [profile?.id]);
    return {
      posts: state.posts,
      loaded: state.loaded,
      loading: state.loading,
      error: state.error,
      list: store.list,
      countComments,
      timeAgo,
      createPost: data => store.createPost({ ...data, profile }),
      deletePost: postId => store.deletePost(postId, profile),
      toggleLike: postId => store.toggleLike(postId, profile),
      addComment: data => store.addComment({ ...data, profile }),
      refresh: () => store.refresh(profile),
    };
  };
})();
