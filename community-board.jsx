// ============================================================================
// Community Message Board — Reddit-style UI.
// Lives inside CommunityPage as a new "Board" tab.
// Usable by Exonauts, Leads, Commanders, and Admins via the shared auth shim.
// ============================================================================

// Returns who is currently posting — reads roleView from localStorage (set by app.jsx)
// and maps to a name/avatar/id. Exonaut is ME; other roles post as themselves.
function useBoardIdentity() {
  const getId = () => {
    let auth = {};
    try { auth = JSON.parse(localStorage.getItem('exo:auth') || '{}'); } catch (e) {}
    const role = auth.role || 'exonaut';
    if (role === 'lead') {
      const lead = (typeof LEADS !== 'undefined') ? LEADS.find(l => l.id === 'lead-ais') : null;
      return { id: lead?.id || 'lead-ais', name: lead?.name || 'Mission Lead', role: 'lead', badge: 'LEAD' };
    }
    if (role === 'commander') {
      return { id: 'cmdr-mack', name: 'Mack Comandante', role: 'commander', badge: 'CMDR' };
    }
    if (role === 'admin') {
      return { id: 'admin-ops', name: 'Ops Admin', role: 'admin', badge: 'ADMIN' };
    }
    return { id: (typeof ME !== 'undefined') ? ME.id : 'u14', name: (typeof ME !== 'undefined') ? ME.name : 'You', role: 'exonaut', badge: null };
  };
  const [me, setMe] = React.useState(getId);
  React.useEffect(() => {
    const recheck = () => setMe(getId());
    window.addEventListener('storage', recheck);
    window.addEventListener('exo:role-change', recheck);
    return () => {
      window.removeEventListener('storage', recheck);
      window.removeEventListener('exo:role-change', recheck);
    };
  }, []);
  return me;
}

function roleBadgeStyle(role) {
  const map = {
    lead:      { bg: 'rgba(192,192,192,0.15)', fg: 'var(--platinum)', label: 'LEAD' },
    commander: { bg: 'rgba(244,197,66,0.15)',  fg: 'var(--amber)',    label: 'COMMANDER' },
    admin:     { bg: 'rgba(125,211,252,0.15)', fg: 'var(--sky)',      label: 'ADMIN' },
    alumni:    { bg: 'rgba(176,149,197,0.15)', fg: 'var(--lavender)', label: 'ALUMNI' },
  };
  return map[role] || null;
}

function resolveAuthor(authorId, authorName) {
  // If a name is stored on the thread/comment, trust it (covers alumni + custom cases).
  if (authorName) return { name: authorName, tier: 'gold' };
  const U = (typeof USERS !== 'undefined') ? USERS : [];
  const u = U.find(x => x.id === authorId);
  if (u) return { name: u.name, tier: u.tier || 'gold' };
  // Special system authors
  if (authorId === 'cmdr-mack') return { name: 'Mack Comandante', tier: 'corps' };
  if (authorId === 'admin-ops') return { name: 'Ops Admin', tier: 'corps' };
  if ((typeof LEADS !== 'undefined')) {
    const L = LEADS.find(l => l.id === authorId);
    if (L) return { name: L.name, tier: 'corps' };
  }
  return { name: 'Anonymous', tier: 'bronze' };
}

// ============================================================================
// BoardList — left column with channels, sort, search, thread list.
// ============================================================================
function CommunityBoard() {
  const me = useBoardIdentity();
  const board = useBoard();

  const [channel, setChannel] = React.useState('all');
  const [sort, setSort] = React.useState('hot');
  const [search, setSearch] = React.useState('');
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [openThreadId, setOpenThreadId] = React.useState(null);

  const threads = board.list({ channel, sort, search });

  if (openThreadId) {
    return (
      <ThreadView
        threadId={openThreadId}
        me={me}
        onBack={() => setOpenThreadId(null)}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 18 }}>

      {/* Channels sidebar */}
      <div>
        <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 10, paddingLeft: 4 }}>
          CHANNELS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {BOARD_CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', textAlign: 'left',
              background: channel === ch.id ? 'var(--off-white-07)' : 'transparent',
              border: '1px solid ' + (channel === ch.id ? 'var(--off-white-15)' : 'transparent'),
              borderRadius: 2, cursor: 'pointer',
              color: channel === ch.id ? 'var(--off-white)' : 'var(--off-white-68)',
              fontFamily: 'var(--font-display)', fontWeight: channel === ch.id ? 700 : 500, fontSize: 12,
              transition: 'all 0.12s',
            }}>
              <i className={'fa-solid ' + ch.icon} style={{ fontSize: 11, color: channel === ch.id ? ch.color : 'var(--off-white-40)', width: 14 }} />
              <span>{ch.label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: 12, background: 'var(--off-white-07)', borderRadius: 2, border: '1px solid var(--off-white-15)' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
            POSTING AS
          </div>
          <div className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
            {me.name}
          </div>
          {me.badge && (
            <div style={{ marginTop: 4, display: 'inline-block', padding: '2px 6px', background: roleBadgeStyle(me.role)?.bg, color: roleBadgeStyle(me.role)?.fg, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700, borderRadius: 2 }}>
              {me.badge}
            </div>
          )}
        </div>
      </div>

      {/* Thread list */}
      <div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Sort toggle */}
          <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--off-white-07)', borderRadius: 2 }}>
            {['hot', 'new', 'top'].map(s => (
              <button key={s} onClick={() => setSort(s)} style={{
                padding: '6px 12px',
                background: sort === s ? 'var(--ink)' : 'transparent',
                color: sort === s ? 'var(--deep-black)' : 'var(--off-white-68)',
                border: 'none', borderRadius: 2,
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                cursor: 'pointer', textTransform: 'uppercase',
              }}>{s}</button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--off-white-40)', fontSize: 11 }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search threads…" style={{
              width: '100%', padding: '7px 12px 7px 30px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none',
            }} />
          </div>

          <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
            <i className="fa-solid fa-pen-to-square" /> NEW POST
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {threads.length === 0 && (
            <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
              <i className="fa-solid fa-comments" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 10 }} />
              <div className="t-body" style={{ color: 'var(--off-white-68)' }}>No posts here yet. Be first.</div>
            </div>
          )}
          {threads.map(t => (
            <ThreadRow key={t.id} thread={t} me={me} onOpen={() => setOpenThreadId(t.id)} />
          ))}
        </div>
      </div>

      {composeOpen && (
        <ThreadCompose
          open
          onClose={() => setComposeOpen(false)}
          defaultChannel={channel === 'all' ? 'general' : channel}
          me={me}
        />
      )}
    </div>
  );
}

// ============================================================================
// Thread list row
// ============================================================================
function ThreadRow({ thread, me, onOpen }) {
  const board = useBoard();
  const author = resolveAuthor(thread.authorId, thread.authorName);
  const score = board.voteScore(thread.votes);
  const myVote = thread.votes?.[me.id] || 0;
  const commentCount = board.countComments(thread);
  const channel = BOARD_CHANNELS.find(c => c.id === thread.channel);
  const roleStyle = roleBadgeStyle(thread.authorRole);

  const vote = (e, dir) => {
    e.stopPropagation();
    board.voteThread(thread.id, me.id, dir);
  };

  return (
    <div onClick={onOpen} className="card-panel" style={{
      display: 'grid', gridTemplateColumns: '44px 1fr', gap: 12, padding: 14,
      cursor: 'pointer', transition: 'all 0.12s',
      borderColor: thread.pinned ? 'var(--lime)' : 'var(--off-white-15)',
      background: thread.pinned ? 'rgba(201,229,74,0.03)' : 'transparent',
    }}
    onMouseEnter={(e) => { if (!thread.pinned) e.currentTarget.style.borderColor = 'var(--off-white-40)'; }}
    onMouseLeave={(e) => { if (!thread.pinned) e.currentTarget.style.borderColor = 'var(--off-white-15)'; }}>

      {/* Vote column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <button onClick={(e) => vote(e, 1)} title="Upvote" style={voteBtnStyle(myVote === 1, 'up')}>
          <i className="fa-solid fa-caret-up" />
        </button>
        <div className="t-mono" style={{
          fontSize: 12, fontWeight: 700,
          color: myVote === 1 ? 'var(--lime)' : myVote === -1 ? 'var(--red)' : 'var(--off-white)',
        }}>{score}</div>
        <button onClick={(e) => vote(e, -1)} title="Downvote" style={voteBtnStyle(myVote === -1, 'down')}>
          <i className="fa-solid fa-caret-down" />
        </button>
      </div>

      {/* Body */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          {thread.pinned && (
            <span style={{ padding: '1px 6px', background: 'var(--lime)', color: 'var(--deep-black)', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', fontWeight: 700, borderRadius: 2 }}>
              <i className="fa-solid fa-thumbtack" style={{ marginRight: 4 }} />PINNED
            </span>
          )}
          {channel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: channel.color, letterSpacing: '0.1em', fontWeight: 700 }}>
              <i className={'fa-solid ' + channel.icon} style={{ fontSize: 9 }} />#{channel.id}
            </span>
          )}
          <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>
            · posted by <strong style={{ color: 'var(--off-white-68)' }}>{author.name}</strong>
          </span>
          {roleStyle && (
            <span style={{ padding: '1px 5px', background: roleStyle.bg, color: roleStyle.fg, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700, borderRadius: 2 }}>
              {roleStyle.label}
            </span>
          )}
          <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>
            · {board.timeAgo(thread.ts)} ago
          </span>
        </div>
        <h3 className="t-heading" style={{ fontSize: 16, margin: '0 0 4px 0', textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
          {thread.title}
        </h3>
        {thread.body && (
          <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)', marginTop: 6,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {thread.body}
          </div>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 14 }}>
          <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>
            <i className="fa-solid fa-comment" style={{ marginRight: 5 }} />{commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </span>
          <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>
            <i className="fa-solid fa-arrow-trend-up" style={{ marginRight: 5 }} />{score} score
          </span>
        </div>
      </div>
    </div>
  );
}

function voteBtnStyle(active, dir) {
  return {
    width: 28, height: 22,
    background: active ? (dir === 'up' ? 'rgba(201,229,74,0.15)' : 'rgba(239,68,68,0.15)') : 'transparent',
    border: '1px solid ' + (active ? (dir === 'up' ? 'var(--lime)' : 'var(--red)') : 'var(--off-white-15)'),
    borderRadius: 2, cursor: 'pointer',
    color: active ? (dir === 'up' ? 'var(--lime)' : 'var(--red)') : 'var(--off-white-68)',
    fontSize: 14, display: 'grid', placeItems: 'center',
  };
}

// ============================================================================
// Thread view (single-thread page inside the Board)
// ============================================================================
function ThreadView({ threadId, me, onBack }) {
  const board = useBoard();
  const thread = board.get(threadId);

  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');

  if (!thread) {
    return (
      <div className="card-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div className="t-body" style={{ color: 'var(--off-white-68)' }}>Thread not found.</div>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onBack}>← Back to board</button>
      </div>
    );
  }

  const author = resolveAuthor(thread.authorId, thread.authorName);
  const roleStyle = roleBadgeStyle(thread.authorRole);
  const score = board.voteScore(thread.votes);
  const myVote = thread.votes?.[me.id] || 0;
  const channel = BOARD_CHANNELS.find(c => c.id === thread.channel);
  const canDelete = thread.authorId === me.id || me.role === 'admin' || me.role === 'commander';

  function submitReply() {
    if (replyText.trim().length < 2) return;
    board.addComment(thread.id, {
      body: replyText.trim(),
      authorId: me.id, authorName: me.name, authorRole: me.role,
    });
    setReplyText('');
    setReplyOpen(false);
  }

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', color: 'var(--off-white-68)',
        cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
        marginBottom: 16, padding: 0,
      }}>
        <i className="fa-solid fa-arrow-left" /> BACK TO BOARD
      </button>

      <div className="card-panel" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {channel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: channel.color, letterSpacing: '0.1em', fontWeight: 700 }}>
              <i className={'fa-solid ' + channel.icon} style={{ fontSize: 10 }} />#{channel.id}
            </span>
          )}
          <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>
            · posted by <strong style={{ color: 'var(--off-white-68)' }}>{author.name}</strong>
          </span>
          {roleStyle && (
            <span style={{ padding: '1px 5px', background: roleStyle.bg, color: roleStyle.fg, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700, borderRadius: 2 }}>
              {roleStyle.label}
            </span>
          )}
          <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>· {board.timeAgo(thread.ts)} ago</span>
          {canDelete && (
            <button onClick={() => { if (confirm('Delete this thread and all comments?')) { board.deleteThread(thread.id); onBack(); } }} style={{
              marginLeft: 'auto', background: 'transparent', border: '1px solid var(--off-white-15)',
              borderRadius: 2, padding: '3px 8px', color: 'var(--off-white-68)',
              cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
            }}><i className="fa-solid fa-trash" style={{ marginRight: 4 }} />DELETE</button>
          )}
        </div>

        <h1 className="t-heading" style={{ fontSize: 22, margin: '0 0 14px 0', textTransform: 'none', letterSpacing: 0 }}>
          {thread.title}
        </h1>

        {thread.body && (
          <div className="t-body" style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55 }}>{thread.body}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={() => board.voteThread(thread.id, me.id, 1)} style={voteBtnStyle(myVote === 1, 'up')}>
            <i className="fa-solid fa-caret-up" />
          </button>
          <div className="t-mono" style={{
            fontSize: 14, fontWeight: 700,
            color: myVote === 1 ? 'var(--lime)' : myVote === -1 ? 'var(--red)' : 'var(--off-white)',
          }}>{score}</div>
          <button onClick={() => board.voteThread(thread.id, me.id, -1)} style={voteBtnStyle(myVote === -1, 'down')}>
            <i className="fa-solid fa-caret-down" />
          </button>
          <button onClick={() => setReplyOpen(o => !o)} style={{
            marginLeft: 10, background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, padding: '6px 14px', color: 'var(--off-white)',
            cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
          }}>
            <i className="fa-solid fa-comment" style={{ marginRight: 6 }} />REPLY
          </button>
        </div>

        {replyOpen && (
          <div style={{ marginTop: 14 }}>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder={`Reply as ${me.name}…`} style={{
              width: '100%', padding: '10px 12px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none', resize: 'vertical',
            }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
              <button onClick={() => { setReplyOpen(false); setReplyText(''); }} style={{
                padding: '6px 12px', background: 'transparent', border: '1px solid var(--off-white-15)',
                borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
              }}>Cancel</button>
              <button onClick={submitReply} disabled={replyText.trim().length < 2} style={{
                padding: '6px 12px', background: replyText.trim().length >= 2 ? 'var(--lime)' : 'var(--off-white-15)',
                color: replyText.trim().length >= 2 ? 'var(--deep-black)' : 'var(--off-white-40)',
                border: 'none', borderRadius: 2, cursor: replyText.trim().length >= 2 ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
              }}>Post Reply</button>
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div style={{ marginTop: 20 }}>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 12 }}>
          {board.countComments(thread)} COMMENT{board.countComments(thread) === 1 ? '' : 'S'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(thread.comments || []).map(c => (
            <CommentNode key={c.id} threadId={thread.id} comment={c} me={me} depth={0} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CommentNode — recursive for nested replies (capped at 4 levels visually).
// ============================================================================
function CommentNode({ threadId, comment, me, depth }) {
  const board = useBoard();
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');

  const author = resolveAuthor(comment.authorId, comment.authorName);
  const roleStyle = roleBadgeStyle(comment.authorRole);
  const score = board.voteScore(comment.votes);
  const myVote = comment.votes?.[me.id] || 0;
  const canReply = depth < 4;

  function submit() {
    if (replyText.trim().length < 2) return;
    board.addComment(threadId, {
      parentId: comment.id,
      body: replyText.trim(),
      authorId: me.id, authorName: me.name, authorRole: me.role,
    });
    setReplyText('');
    setReplyOpen(false);
  }

  return (
    <div style={{
      padding: '10px 12px', background: 'var(--off-white-07)',
      borderLeft: '2px solid ' + (depth === 0 ? 'var(--off-white-15)' : 'var(--ink)'),
      borderRadius: 2, marginLeft: depth * 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <AvatarWithRing name={author.name} size={22} tier={author.tier} />
        <span className="t-heading" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
          {author.name}
        </span>
        {roleStyle && (
          <span style={{ padding: '1px 5px', background: roleStyle.bg, color: roleStyle.fg, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700, borderRadius: 2 }}>
            {roleStyle.label}
          </span>
        )}
        <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)' }}>· {board.timeAgo(comment.ts)} ago</span>
      </div>

      <div className="t-body" style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{comment.body}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <button onClick={() => board.voteComment(threadId, comment.id, me.id, 1)} style={{
          ...voteBtnStyle(myVote === 1, 'up'), width: 22, height: 18, fontSize: 11,
        }}><i className="fa-solid fa-caret-up" /></button>
        <span className="t-mono" style={{
          fontSize: 11, fontWeight: 700,
          color: myVote === 1 ? 'var(--lime)' : myVote === -1 ? 'var(--red)' : 'var(--off-white)',
        }}>{score}</span>
        <button onClick={() => board.voteComment(threadId, comment.id, me.id, -1)} style={{
          ...voteBtnStyle(myVote === -1, 'down'), width: 22, height: 18, fontSize: 11,
        }}><i className="fa-solid fa-caret-down" /></button>
        {canReply && (
          <button onClick={() => setReplyOpen(o => !o)} style={{
            marginLeft: 8, background: 'transparent', border: 'none',
            color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
          }}><i className="fa-solid fa-reply" style={{ marginRight: 5 }} />REPLY</button>
        )}
      </div>

      {replyOpen && (
        <div style={{ marginTop: 8 }}>
          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder={`Reply as ${me.name}…`} style={{
            width: '100%', padding: '8px 10px',
            background: 'var(--deep-black)', color: 'var(--off-white)',
            border: '1px solid var(--off-white-15)', borderRadius: 2,
            fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none', resize: 'vertical',
          }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 5 }}>
            <button onClick={() => { setReplyOpen(false); setReplyText(''); }} style={{
              padding: '5px 10px', background: 'transparent', border: '1px solid var(--off-white-15)',
              borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
            }}>Cancel</button>
            <button onClick={submit} disabled={replyText.trim().length < 2} style={{
              padding: '5px 10px', background: replyText.trim().length >= 2 ? 'var(--lime)' : 'var(--off-white-15)',
              color: replyText.trim().length >= 2 ? 'var(--deep-black)' : 'var(--off-white-40)',
              border: 'none', borderRadius: 2, cursor: replyText.trim().length >= 2 ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
            }}>Reply</button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {comment.replies.map(r => (
            <CommentNode key={r.id} threadId={threadId} comment={r} me={me} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Thread compose modal
// ============================================================================
function ThreadCompose({ open, onClose, defaultChannel, me }) {
  const board = useBoard();
  const [channel, setChannel] = React.useState(defaultChannel || 'general');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');

  if (!open) return null;
  const canPost = title.trim().length >= 2;

  function submit() {
    if (!canPost) return;
    board.createThread({
      channel, title: title.trim(), body: body.trim(),
      authorId: me.id, authorName: me.role === 'exonaut' ? null : me.name, authorRole: me.role,
    });
    onClose?.();
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(600px, 100%)', padding: 0, maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 4 }}>
            NEW POST · POSTING AS {me.name.toUpperCase()}
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>Start a thread</h2>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>CHANNEL</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {BOARD_CHANNELS.filter(c => c.id !== 'all').map(c => (
                <button key={c.id} onClick={() => setChannel(c.id)} style={{
                  padding: '6px 10px',
                  background: channel === c.id ? c.color + '20' : 'var(--off-white-07)',
                  border: '1px solid ' + (channel === c.id ? c.color : 'var(--off-white-15)'),
                  borderRadius: 2, color: channel === c.id ? c.color : 'var(--off-white-68)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}><i className={'fa-solid ' + c.icon} />#{c.id}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>TITLE</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Get to the point in one line"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--deep-black)', color: 'var(--off-white)',
                border: '1px solid var(--off-white-15)', borderRadius: 2,
                fontFamily: 'var(--font-display)', fontSize: 15, outline: 'none',
              }} />
          </div>

          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>BODY <span style={{ opacity: 0.5 }}>· OPTIONAL</span></div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Context, details, what you need from the cohort."
              style={{
                width: '100%', padding: '10px 12px', resize: 'vertical',
                background: 'var(--deep-black)', color: 'var(--off-white)',
                border: '1px solid var(--off-white-15)', borderRadius: 2,
                fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none', lineHeight: 1.5,
              }} />
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--off-white-07)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Cancel</button>
          <button onClick={submit} disabled={!canPost} style={{
            padding: '9px 16px', background: canPost ? 'var(--lime)' : 'var(--off-white-15)',
            color: canPost ? 'var(--deep-black)' : 'var(--off-white-40)',
            border: 'none', borderRadius: 2, cursor: canPost ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />Post Thread</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  CommunityBoard, ThreadView, ThreadRow, ThreadCompose, CommentNode,
  useBoardIdentity, resolveAuthor, roleBadgeStyle,
});
