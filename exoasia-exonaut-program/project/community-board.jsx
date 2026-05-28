// Reddit-style Community board UI.
function useBoardIdentity() {
  const { profile } = useCurrentUserProfile();
  return {
    ...profile,
    id: profile.id || ME_ID,
    fullName: profile.fullName || ME.name || 'You',
    role: profile.role || 'exonaut',
  };
}

function profileHandle(profile) {
  const source = String(profile?.fullName || profile?.email || 'member').toLowerCase();
  return source.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'member';
}

function boardMembers(profiles, me) {
  const items = [...(profiles || [])];
  if (me && !items.some(profile => profile.id === me.id)) items.unshift(me);
  return items.map(profile => ({ ...profile, handle: profileHandle(profile) }));
}

function extractMentionIds(text, members) {
  const handles = new Set((String(text || '').match(/@[a-z0-9._-]+/gi) || []).map(token => token.slice(1).toLowerCase()));
  return members.filter(member => handles.has(member.handle.toLowerCase())).map(member => member.id);
}

function authorFor(post) {
  const profile = (window.__profileDirectory || []).find(item => item.id === post.authorId);
  return {
    name: post.authorName || profile?.fullName || 'Exonaut',
    avatarUrl: profile?.avatarUrl || '',
    role: post.authorRole || profile?.role || 'exonaut',
    tier: (post.authorRole || profile?.role) === 'exonaut' ? 'gold' : 'corps',
    handle: profileHandle(profile || { fullName: post.authorName }),
  };
}

function RoleChip({ role }) {
  if (!role || role === 'exonaut') return null;
  return <span className="board-role-chip">{role.toUpperCase()}</span>;
}

function RichText({ text, members }) {
  if (!text) return null;
  const parts = String(text).split(/(https?:\/\/[^\s<>"')]+|@[a-z0-9._-]+)/gi);
  return (
    <React.Fragment>
      {parts.map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
          const href = part.replace(/[.,;:!?]+$/, '');
          const trailing = part.slice(href.length);
          return (
            <React.Fragment key={index}>
              <a className="board-inline-link" href={href} target="_blank" rel="noopener noreferrer">{href}</a>
              {trailing}
            </React.Fragment>
          );
        }
        if (!part.startsWith('@')) return <React.Fragment key={index}>{part}</React.Fragment>;
        const exists = members.some(member => '@' + member.handle.toLowerCase() === part.toLowerCase());
        return exists
          ? <span className="board-mention" key={index}>{part}</span>
          : <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

function MentionTextarea({ value, onChange, members, rows = 4, placeholder, className = 'board-textarea' }) {
  const [query, setQuery] = React.useState(null);
  const inputRef = React.useRef(null);
  const matches = query === null ? [] : members
    .filter(member => member.handle.toLowerCase().includes(query.toLowerCase()) || String(member.fullName || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  function change(event) {
    const next = event.target.value;
    const beforeCursor = next.slice(0, event.target.selectionStart);
    const match = beforeCursor.match(/(?:^|\s)@([a-z0-9._-]*)$/i);
    onChange(next);
    setQuery(match ? match[1] : null);
  }

  function selectMember(member) {
    const textarea = inputRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const atIndex = before.lastIndexOf('@');
    const inserted = before.slice(0, atIndex) + '@' + member.handle + ' ' + after;
    onChange(inserted);
    setQuery(null);
    setTimeout(() => textarea?.focus(), 0);
  }

  return (
    <div className="board-mention-editor">
      <textarea ref={inputRef} className={className} value={value} onChange={change} rows={rows} placeholder={placeholder} />
      {matches.length > 0 && (
        <div className="board-mention-list" role="listbox" aria-label="Mention a member">
          {matches.map(member => (
            <button type="button" key={member.id} className="board-mention-option" onClick={() => selectMember(member)}>
              <AvatarWithRing name={member.fullName || member.email} avatarUrl={member.avatarUrl} size={25} tier="gold" />
              <span>{member.fullName || member.email}</span>
              <small>@{member.handle}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaGrid({ media }) {
  if (!media?.length) return null;
  return (
    <div className={'board-media-grid count-' + Math.min(media.length, 3)}>
      {media.map(item => item.type === 'video'
        ? <video key={item.id} src={item.url} controls preload="metadata" aria-label={item.name} />
        : <img key={item.id} src={item.url} alt={item.name || 'Post attachment'} loading="lazy" />)}
    </div>
  );
}

function CommunityBoard({ channel, onChannelChange, sort, search, composerOpen, onComposeClose }) {
  const me = useBoardIdentity();
  const { profiles } = useUserProfiles();
  const members = React.useMemo(() => boardMembers(profiles, me), [profiles, me.id, me.fullName]);
  const board = useBoard(me);
  const posts = board.list({ channel, sort, search });

  return (
    <div className="board-layout">
      <aside className="board-sidebar">
        <div className="board-eyebrow">CHANNELS</div>
        <nav className="board-channel-list" aria-label="Thread channels">
          {BOARD_CHANNELS.map(item => (
            <button className={'board-channel ' + (channel === item.id ? 'active' : '')} key={item.id} onClick={() => onChannelChange(item.id)}>
              <i className={'fa-solid ' + item.icon} style={{ color: channel === item.id ? item.color : undefined }} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="board-current-user">
          <div className="board-eyebrow">POSTING AS</div>
          <div className="board-current-row">
            <AvatarWithRing name={me.fullName} avatarUrl={me.avatarUrl} size={29} tier={me.role === 'exonaut' ? 'gold' : 'corps'} />
            <div>
              <strong>{me.fullName}</strong>
              <span>@{profileHandle(me)}</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="board-feed">
        {board.error && <div className="board-alert"><i className="fa-solid fa-circle-exclamation" />{board.error}</div>}
        {board.loading && !board.loaded && <div className="board-empty">Loading posts...</div>}
        {!board.loading && posts.length === 0 && (
          <div className="card-panel board-empty">
            <i className="fa-regular fa-comments" />
            <div>No posts here yet. Be first.</div>
          </div>
        )}
        <div className="board-posts">
          {posts.map(post => <PostCard key={post.id} post={post} board={board} me={me} members={members} />)}
        </div>
      </section>

      {composerOpen && <PostComposer board={board} me={me} members={members} defaultChannel={channel === 'all' ? 'general' : channel} onClose={onComposeClose} />}
    </div>
  );
}

function PostCard({ post, board, me, members }) {
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const author = authorFor(post);
  const channel = BOARD_CHANNELS.find(item => item.id === post.channel);
  const liked = post.likes.includes(me.id);
  const canDelete = post.authorId === me.id;

  async function like() {
    setError('');
    try { await board.toggleLike(post.id); } catch (err) { setError(err.message || 'Could not update like.'); }
  }

  async function comment() {
    if (!commentText.trim()) return;
    setBusy(true);
    setError('');
    try {
      await board.addComment({ postId: post.id, body: commentText, mentionIds: extractMentionIds(commentText, members) });
      setCommentText('');
      setCommentsOpen(true);
    } catch (err) {
      setError(err.message || 'Could not post comment.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this post and its comments?')) return;
    setBusy(true);
    try { await board.deletePost(post.id); } catch (err) { setError(err.message || 'Could not delete post.'); setBusy(false); }
  }

  return (
    <article className="card-panel board-post">
      <header className="board-post-head">
        <AvatarWithRing name={author.name} avatarUrl={author.avatarUrl} size={37} tier={author.tier} />
        <div className="board-post-author">
          <strong>{author.name}</strong>
          <span>@{author.handle}</span>
          <RoleChip role={author.role} />
          <time>{board.timeAgo(post.createdAt)}</time>
        </div>
        {channel && <span className="board-channel-chip"><i className={'fa-solid ' + channel.icon} />{channel.label}</span>}
        {canDelete && <button className="board-icon-btn" disabled={busy} aria-label="Delete post" onClick={remove}><i className="fa-solid fa-trash" /></button>}
      </header>
      {post.title && <h3 className="board-post-title">{post.title}</h3>}
      {post.body && <p className="board-post-body"><RichText text={post.body} members={members} /></p>}
      <MediaGrid media={post.media} />
      <footer className="board-post-actions">
        <button className={liked ? 'liked' : ''} onClick={like} aria-pressed={liked}>
          <i className={liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} /> {post.likes.length}
        </button>
        <button onClick={() => setCommentsOpen(open => !open)}>
          <i className="fa-regular fa-comment" /> {board.countComments(post)}
        </button>
      </footer>
      {error && <div className="board-inline-error">{error}</div>}
      {commentsOpen && (
        <div className="board-comments">
          <div className="board-comment-compose">
            <MentionTextarea value={commentText} onChange={setCommentText} members={members} rows={2} placeholder="Write a comment. Use @ to mention someone." />
            <button className="btn btn-primary btn-sm" disabled={!commentText.trim() || busy} onClick={comment}>Comment</button>
          </div>
          {post.comments.length === 0 && <div className="board-no-comments">No comments yet.</div>}
          {post.comments.map(item => <CommentCard key={item.id} comment={item} postId={post.id} board={board} me={me} members={members} depth={0} />)}
        </div>
      )}
    </article>
  );
}

function CommentCard({ comment, postId, board, me, members, depth }) {
  const [replying, setReplying] = React.useState(false);
  const [reply, setReply] = React.useState('');
  const [error, setError] = React.useState('');
  const author = authorFor(comment);

  async function submitReply() {
    if (!reply.trim()) return;
    setError('');
    try {
      await board.addComment({ postId, parentCommentId: comment.id, body: reply, mentionIds: extractMentionIds(reply, members) });
      setReply('');
      setReplying(false);
    } catch (err) {
      setError(err.message || 'Could not post reply.');
    }
  }

  return (
    <div className="board-comment" style={{ marginLeft: Math.min(depth, 4) * 18 }}>
      <div className="board-comment-head">
        <AvatarWithRing name={author.name} avatarUrl={author.avatarUrl} size={25} tier={author.tier} />
        <strong>{author.name}</strong>
        <RoleChip role={author.role} />
        <time>{board.timeAgo(comment.createdAt)}</time>
      </div>
      <p><RichText text={comment.body} members={members} /></p>
      <button className="board-reply-button" onClick={() => setReplying(value => !value)}>
        <i className="fa-solid fa-reply" /> Reply
      </button>
      {replying && (
        <div className="board-reply-editor">
          <div className="board-replying">Replying to @{author.handle}</div>
          <MentionTextarea value={reply} onChange={setReply} members={members} rows={2} placeholder={'Reply to @' + author.handle} />
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setReplying(false); setReply(''); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!reply.trim()} onClick={submitReply}>Reply</button>
          </div>
        </div>
      )}
      {error && <div className="board-inline-error">{error}</div>}
      {comment.replies.map(child => <CommentCard key={child.id} comment={child} postId={postId} board={board} me={me} members={members} depth={depth + 1} />)}
    </div>
  );
}

function PostComposer({ board, me, members, defaultChannel, onClose }) {
  const [channel, setChannel] = React.useState(defaultChannel);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [files, setFiles] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const uploadRef = React.useRef(null);
  const previews = React.useMemo(() => files.map(file => ({ file, url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' })), [files]);
  React.useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)), [previews]);
  const valid = Boolean(title.trim() || body.trim() || files.length);

  function selectFiles(event) {
    const selected = Array.from(event.target.files || []);
    const next = [...files, ...selected].slice(0, 6);
    setFiles(next);
    setError(selected.some(file => !file.type.startsWith('image/') && !file.type.startsWith('video/')) ? 'Only images and videos can be attached.' : '');
    event.target.value = '';
  }

  async function submit() {
    if (!valid) { setError('Add text, an image, or a video before posting.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await board.createPost({ channel, title, body, files, mentionIds: extractMentionIds(body, members) });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not publish post.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-scrim board-composer-scrim" onClick={onClose}>
      <div className="modal-body board-composer" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="New post">
        <button className="modal-close" aria-label="Close composer" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        <div className="board-eyebrow">NEW POST / POSTING AS {me.fullName.toUpperCase()}</div>
        <h2>Share with the cohort</h2>
        <label className="board-field">
          <span>Channel</span>
          <select className="input" value={channel} onChange={event => setChannel(event.target.value)}>
            {BOARD_CHANNELS.filter(item => item.id !== 'all').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="board-field">
          <span>Title <small>optional</small></span>
          <input className="input" value={title} onChange={event => setTitle(event.target.value)} placeholder="What is this about?" />
        </label>
        <div className="board-field">
          <span>Caption <small>type @ to mention someone</small></span>
          <MentionTextarea value={body} onChange={setBody} members={members} rows={5} placeholder="Share a thought, update, request, or resource." className="textarea board-textarea" />
        </div>
        <div className="board-field">
          <span>Media <small>images or videos, up to 6</small></span>
          <button className="board-upload" type="button" onClick={() => uploadRef.current?.click()}>
            <i className="fa-solid fa-photo-film" /> Add images or videos
          </button>
          <input ref={uploadRef} hidden type="file" accept="image/*,video/*" multiple onChange={selectFiles} />
        </div>
        {previews.length > 0 && (
          <div className="board-preview-grid">
            {previews.map((item, index) => (
              <div className="board-preview" key={item.url}>
                {item.type === 'video' ? <video src={item.url} controls /> : <img src={item.url} alt={item.file.name} />}
                <button aria-label="Remove attachment" onClick={() => setFiles(files.filter((file, fileIndex) => fileIndex !== index))}><i className="fa-solid fa-xmark" /></button>
              </div>
            ))}
          </div>
        )}
        {error && <div className="board-inline-error">{error}</div>}
        <div className="board-composer-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!valid || submitting}>
            {submitting ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
            {submitting ? 'Publishing' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommunityBoard, useBoardIdentity });
