// ============================================================================
// Announce UI — compose modal + refactored feed + per-role management views.
// Used by Exonaut (read-only feed), Lead, Commander, and Platform Admin.
// ============================================================================

// -------- Shared constants --------
const ANNOUNCE_TYPES = {
  info:        { color: 'var(--platinum)', icon: 'fa-circle-info',         label: 'INFO' },
  action:      { color: 'var(--amber)',    icon: 'fa-triangle-exclamation', label: 'ACTION REQUIRED' },
  celebration: { color: 'var(--lime)',     icon: 'fa-star',                 label: 'CELEBRATION' },
  urgent:      { color: 'var(--red)',      icon: 'fa-bolt',                 label: 'URGENT' },
};

const REACTION_EMOJIS = [
  { emoji: '🔥', label: 'Fire'  },
  { emoji: '⚡', label: 'Bolt'  },
  { emoji: '🚀', label: 'Rocket'},
  { emoji: '💡', label: 'Idea'  },
];

// What audience scopes each role can target.
// Admin → everything; Commander → all + cohorts + tracks + users; Lead → track-level + users in their reports only.
function roleCanTarget(role, kind) {
  if (role === 'admin')     return true;
  if (role === 'commander') return true;
  if (role === 'lead')      return kind === 'tracks' || kind === 'users';
  return kind === 'all';
}

// ============================================================================
// Announce compose — used by Lead, Commander, Admin.
// ============================================================================
function AnnounceCompose({ open, onClose, initial, authorRole, authorName, restrictToTrack, restrictToReports }) {
  const { create, update } = useAnnouncements();
  const { all: allCohorts } = useCohort();

  const [type, setType]   = React.useState(initial?.type   || 'info');
  const [title, setTitle] = React.useState(initial?.title  || '');
  const [body, setBody]   = React.useState(initial?.body   || '');
  const [pinned, setPinned] = React.useState(!!initial?.pinned);
  const [audKind, setAudKind] = React.useState(initial?.audience?.kind || (authorRole === 'lead' ? 'tracks' : 'all'));
  const [pickedCohorts, setPickedCohorts] = React.useState(initial?.audience?.cohorts || []);
  const [pickedTracks, setPickedTracks]   = React.useState(initial?.audience?.tracks  || (restrictToTrack ? [restrictToTrack] : []));
  const [pickedUsers, setPickedUsers]     = React.useState(initial?.audience?.users   || []);

  React.useEffect(() => {
    if (!open) return;
    setType(initial?.type   || 'info');
    setTitle(initial?.title  || '');
    setBody(initial?.body   || '');
    setPinned(!!initial?.pinned);
    setAudKind(initial?.audience?.kind || (authorRole === 'lead' ? 'tracks' : 'all'));
    setPickedCohorts(initial?.audience?.cohorts || []);
    setPickedTracks(initial?.audience?.tracks  || (restrictToTrack ? [restrictToTrack] : []));
    setPickedUsers(initial?.audience?.users   || []);
  }, [open, initial?.id]);

  if (!open) return null;

  const availableKinds = ['all','cohorts','tracks','users'].filter(k => roleCanTarget(authorRole, k));

  function buildAudience() {
    if (audKind === 'all')     return { kind: 'all' };
    if (audKind === 'cohorts') return { kind: 'cohorts', cohorts: pickedCohorts };
    if (audKind === 'tracks')  return { kind: 'tracks',  tracks: pickedTracks };
    if (audKind === 'users')   return { kind: 'users',   users: pickedUsers };
    return { kind: 'all' };
  }

  function audienceValid() {
    if (audKind === 'all') return true;
    if (audKind === 'cohorts') return pickedCohorts.length > 0;
    if (audKind === 'tracks')  return pickedTracks.length  > 0;
    if (audKind === 'users')   return pickedUsers.length   > 0;
    return false;
  }

  const canSave = title.trim().length >= 2 && body.trim().length >= 4 && audienceValid();

  function submit() {
    if (!canSave) return;
    const payload = {
      type, title: title.trim(), body: body.trim(), pinned,
      audience: buildAudience(),
      from: authorName,
      fromRole: authorRole,
    };
    if (initial?.id) update(initial.id, payload);
    else             create(payload);
    onClose?.();
  }

  // Candidate users for the "users" audience — if lead, only their reports.
  const userCandidates = (typeof USERS !== 'undefined')
    ? (restrictToReports ? USERS.filter(u => restrictToReports.includes(u.id)) : USERS)
    : [];

  const roleLabel = authorRole === 'lead' ? 'MISSION LEAD'
                  : authorRole === 'commander' ? 'COMMANDER'
                  : 'PLATFORM ADMIN';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(640px, 100%)', padding: 0, borderColor: ANNOUNCE_TYPES[type].color,
        display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: ANNOUNCE_TYPES[type].color, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            {roleLabel} · {initial?.id ? 'EDIT' : 'NEW'} ANNOUNCEMENT
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>
            {initial?.id ? 'Edit Announcement' : 'Post Announcement'}
          </h2>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 4 }}>
            Posted as <strong style={{ color: 'var(--off-white)' }}>{authorName}</strong> · Exonauts in the selected audience will see it at the top of their feed.
          </div>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Type picker */}
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>TYPE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Object.entries(ANNOUNCE_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => setType(k)} style={{
                  padding: '9px 8px',
                  background: type === k ? v.color + '20' : 'var(--off-white-07)',
                  border: '1px solid ' + (type === k ? v.color : 'var(--off-white-15)'),
                  borderRadius: 2, color: type === k ? v.color : 'var(--off-white-68)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <i className={'fa-solid ' + v.icon} style={{ fontSize: 14 }} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>TITLE</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, clear, actionable"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--deep-black)', color: 'var(--off-white)',
                border: '1px solid var(--off-white-15)', borderRadius: 2,
                fontFamily: 'var(--font-display)', fontSize: 14, outline: 'none',
              }} />
          </div>

          {/* Body */}
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 5 }}>BODY</div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Full message…"
              style={{
                width: '100%', padding: '10px 12px', resize: 'vertical',
                background: 'var(--deep-black)', color: 'var(--off-white)',
                border: '1px solid var(--off-white-15)', borderRadius: 2,
                fontFamily: 'var(--font-display)', fontSize: 13, outline: 'none', lineHeight: 1.5,
              }} />
          </div>

          {/* Audience kind */}
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>AUDIENCE</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availableKinds.map(k => {
                const label = k === 'all' ? 'All Exonauts'
                            : k === 'cohorts' ? 'Cohort(s)'
                            : k === 'tracks'  ? 'Track(s)'
                            : 'Specific Exonauts';
                return (
                  <button key={k} onClick={() => setAudKind(k)} style={{
                    padding: '6px 12px',
                    background: audKind === k ? 'var(--lime)' : 'var(--off-white-07)',
                    border: '1px solid ' + (audKind === k ? 'var(--lime)' : 'var(--off-white-15)'),
                    borderRadius: 2, color: audKind === k ? 'var(--deep-black)' : 'var(--off-white-68)',
                    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700,
                  }}>{label.toUpperCase()}</button>
                );
              })}
            </div>
          </div>

          {/* Audience detail */}
          {audKind === 'cohorts' && (
            <AudienceChipPicker
              label="COHORTS"
              items={allCohorts.map(c => ({ id: c.id, label: c.name, sub: c.code }))}
              selected={pickedCohorts}
              onToggle={(id) => setPickedCohorts(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])}
            />
          )}
          {audKind === 'tracks' && (
            <AudienceChipPicker
              label="TRACKS"
              items={(typeof TRACKS !== 'undefined' ? TRACKS : [])
                .filter(t => !restrictToTrack || t.code === restrictToTrack)
                .map(t => ({ id: t.code, label: t.short, sub: t.name }))}
              selected={pickedTracks}
              onToggle={(id) => setPickedTracks(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])}
            />
          )}
          {audKind === 'users' && (
            <AudienceUserPicker
              label={restrictToReports ? 'MY REPORTS' : 'EXONAUTS'}
              users={userCandidates}
              selected={pickedUsers}
              onToggle={(id) => setPickedUsers(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])}
            />
          )}

          {/* Pin */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: 'var(--off-white-07)', borderRadius: 2 }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}
                   style={{ width: 14, height: 14, accentColor: 'var(--lime)' }} />
            <span className="t-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--off-white)' }}>
              PIN TO TOP OF FEED
            </span>
          </label>
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--off-white-07)' }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', background: 'transparent', border: '1px solid var(--off-white-15)',
            borderRadius: 2, color: 'var(--off-white-68)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>Cancel</button>
          <button onClick={submit} disabled={!canSave} style={{
            padding: '9px 16px', background: canSave ? ANNOUNCE_TYPES[type].color : 'var(--off-white-15)',
            border: 'none', borderRadius: 2,
            color: canSave ? 'var(--deep-black)' : 'var(--off-white-40)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>
            <i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />
            {initial?.id ? 'Save Changes' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------- Audience pickers --------
function AudienceChipPicker({ label, items, selected, onToggle }) {
  return (
    <div>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {items.map(it => {
          const on = selected.includes(it.id);
          return (
            <button key={it.id} onClick={() => onToggle(it.id)} style={{
              padding: '6px 10px',
              background: on ? 'var(--sky)' + '20' : 'var(--off-white-07)',
              border: '1px solid ' + (on ? 'var(--sky)' : 'var(--off-white-15)'),
              borderRadius: 2, color: on ? 'var(--sky)' : 'var(--off-white-68)',
              cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', fontWeight: 700,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
            }}>
              <span>{it.label}</span>
              {it.sub && <span style={{ fontSize: 8, opacity: 0.7 }}>{it.sub}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AudienceUserPicker({ label, users, selected, onToggle }) {
  const [search, setSearch] = React.useState('');
  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label} · {selected.length} SELECTED</span>
        {selected.length > 0 && (
          <button onClick={() => selected.forEach(id => onToggle(id))} style={{
            background: 'transparent', border: 'none', color: 'var(--off-white-40)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700,
          }}>CLEAR</button>
        )}
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" style={{
        width: '100%', padding: '6px 10px', marginBottom: 6,
        background: 'var(--deep-black)', color: 'var(--off-white)',
        border: '1px solid var(--off-white-15)', borderRadius: 2,
        fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none',
      }} />
      <div style={{ maxHeight: 180, overflowY: 'auto', background: 'var(--off-white-07)', borderRadius: 2, padding: 6 }}>
        {filtered.slice(0, 50).map(u => {
          const on = selected.includes(u.id);
          return (
            <label key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer',
              background: on ? 'rgba(201,229,74,0.08)' : 'transparent', borderRadius: 2,
            }}>
              <input type="checkbox" checked={on} onChange={() => onToggle(u.id)}
                     style={{ width: 12, height: 12, accentColor: 'var(--lime)' }} />
              <span className="t-body" style={{ fontSize: 12, color: 'var(--off-white)', flex: 1 }}>{u.name}</span>
              <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.06em' }}>
                {(typeof TRACKS !== 'undefined' ? TRACKS.find(t => t.code === u.track)?.short : u.track) || ''}
              </span>
            </label>
          );
        })}
        {filtered.length === 0 && (
          <div className="t-body" style={{ fontSize: 11, color: 'var(--off-white-40)', textAlign: 'center', padding: 14 }}>No matches.</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Announcement card — shared renderer.
// ============================================================================
function AnnouncementCard({ a, onReact, onEdit, onDelete, onPin, isAuthor }) {
  const t = ANNOUNCE_TYPES[a.type] || ANNOUNCE_TYPES.info;
  const reactions = window.__announceStore?.reactionsFor(a.id) || {};
  const audLabel = window.__announceStore?.audienceLabel(a.audience) || '';
  const timeAgo = window.__announceStore?.timeAgo(a.createdAt) || '';
  const isNew = (Date.now() - (a.createdAt || 0)) < 48 * 3600 * 1000;

  return (
    <div className="card-panel" style={{ borderLeft: `2px solid ${t.color}`, padding: 22, position: 'relative' }}>
      {a.pinned && (
        <div style={{
          position: 'absolute', top: 10, right: 12,
          padding: '2px 7px', background: 'var(--lime)', borderRadius: 2,
          color: 'var(--deep-black)', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700,
        }}>
          <i className="fa-solid fa-thumbtack" style={{ marginRight: 4 }} />PINNED
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: t.color }}>
            <i className={'fa-solid ' + t.icon} style={{ marginRight: 6 }} />{t.label}
          </span>
          <span className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', padding: '2px 6px', background: 'var(--off-white-07)', borderRadius: 2 }}>
            {audLabel}
          </span>
          {isNew && (
            <span style={{
              padding: '1px 6px', background: 'var(--lime)', borderRadius: 2,
              color: 'var(--deep-black)', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', fontWeight: 700,
            }}>NEW</span>
          )}
        </div>
        <span className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)' }}>
          {timeAgo} · {a.from?.toUpperCase()}
        </span>
      </div>

      <h3 className="t-heading" style={{ fontSize: 18, margin: '0 0 6px 0', textTransform: 'none', letterSpacing: 0 }}>{a.title}</h3>
      <div className="t-body" style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div>

      {a.link && (
        <a href={a.link} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block', marginTop: 12, color: 'var(--sky)', fontFamily: 'var(--font-mono)',
          fontSize: 11, letterSpacing: '0.05em', textDecoration: 'none',
        }}><i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 6 }} />Open link</a>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--off-white-07)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {REACTION_EMOJIS.map(({ emoji, label }) => {
            const count = reactions[emoji] || 0;
            return (
              <button key={emoji} onClick={() => onReact?.(a.id, emoji)} style={{
                padding: '5px 10px',
                background: count > 0 ? 'rgba(201,229,74,0.08)' : 'var(--off-white-07)',
                border: '1px solid ' + (count > 0 ? 'var(--lime)' : 'var(--off-white-15)'),
                borderRadius: 2, color: 'var(--off-white)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
              }} title={label}>
                <span style={{ fontSize: 13 }}>{emoji}</span>
                <span style={{ fontSize: 10, color: 'var(--off-white-68)' }}>{count}</span>
              </button>
            );
          })}
        </div>
        {isAuthor && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onPin?.(a.id)} title={a.pinned ? 'Unpin' : 'Pin to top'} style={miniBtn()}>
              <i className={'fa-solid ' + (a.pinned ? 'fa-thumbtack-slash' : 'fa-thumbtack')} />
            </button>
            <button onClick={() => onEdit?.(a)} title="Edit" style={miniBtn()}>
              <i className="fa-solid fa-pen" />
            </button>
            <button onClick={() => onDelete?.(a)} title="Delete" style={miniBtn()}>
              <i className="fa-solid fa-trash" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function miniBtn() {
  return {
    background: 'transparent', border: '1px solid var(--off-white-15)', borderRadius: 2,
    color: 'var(--off-white-68)', cursor: 'pointer', padding: '5px 9px', fontSize: 10,
  };
}

// ============================================================================
// Announcement feed — audience-filtered. Exonaut side uses ME; role consoles
// can pass a specific userId or null for "show all posted by me".
// ============================================================================
function AnnouncementFeed({ forUserId, authorName, authorRole, emptyMessage, showAll }) {
  const { all, visibleTo, react, togglePin, remove, update } = useAnnouncements();
  const [editing, setEditing] = React.useState(null);

  const list = showAll
    ? all
    : (forUserId ? visibleTo(forUserId) : all);

  function confirmDelete(a) {
    if (confirm('Delete announcement "' + a.title + '"?')) remove(a.id);
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {list.length === 0 && (
        <div className="card-panel" style={{ textAlign: 'center', padding: 40 }}>
          <i className="fa-solid fa-bullhorn" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 10 }} />
          <div className="t-body" style={{ color: 'var(--off-white-68)' }}>
            {emptyMessage || 'No announcements yet.'}
          </div>
        </div>
      )}
      {list.map(a => {
        const isAuthor = authorRole &&
          (a.fromRole === authorRole || (authorName && a.from === authorName));
        return (
          <AnnouncementCard
            key={a.id}
            a={a}
            onReact={react}
            onPin={togglePin}
            onEdit={(ann) => setEditing(ann)}
            onDelete={confirmDelete}
            isAuthor={isAuthor}
          />
        );
      })}

      {editing && (
        <AnnounceCompose
          open
          onClose={() => setEditing(null)}
          initial={editing}
          authorName={editing.from}
          authorRole={editing.fromRole}
        />
      )}
    </div>
  );
}

// ============================================================================
// Exonaut-side AnnouncementsPage — override the one from screens.jsx.
// ============================================================================
function AnnouncementsPageV2() {
  const { react } = useAnnouncements();   // eslint-disable-line
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>FROM YOUR LEADS, COMMANDERS, AND ADMINS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Announcements</h1>
        </div>
      </div>
      <AnnouncementFeed forUserId={ME.id} />
    </div>
  );
}
// Replace the stale const-backed implementation:
window.AnnouncementsPage = AnnouncementsPageV2;

// ============================================================================
// Per-role consoles — each wraps the shared compose modal with that role's
// identity + permissions, plus a feed of *their* posted announcements.
// ============================================================================

function AnnounceConsole({ roleLabel, roleColor, role, authorName, authorAvatar, authorSub, restrictToTrack, restrictToReports, audienceNote }) {
  const { byAuthor } = useAnnouncements();
  const [composeOpen, setComposeOpen] = React.useState(false);
  const myList = byAuthor(role, authorName);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: roleColor }}>
            {roleLabel} · ANNOUNCEMENTS
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Post Announcements</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {audienceNote} You've posted <strong style={{ color: 'var(--off-white)' }}>{myList.length}</strong> announcement{myList.length === 1 ? '' : 's'}.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
          <i className="fa-solid fa-paper-plane" /> NEW ANNOUNCEMENT
        </button>
      </div>

      {/* Author identity card */}
      <div className="card-panel" style={{ padding: 16, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <AvatarWithRing name={authorName} size={42} tier={authorAvatar || 'corps'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-heading" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
            Posting as {authorName}
          </div>
          <div className="t-mono" style={{ fontSize: 10, color: roleColor, letterSpacing: '0.1em', fontWeight: 700 }}>
            {authorSub}
          </div>
        </div>
      </div>

      <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 12 }}>
        YOUR POSTED ANNOUNCEMENTS
      </div>

      <AnnouncementFeed
        showAll
        authorName={authorName}
        authorRole={role}
        emptyMessage="You haven't posted any announcements yet. Use the button above to publish your first one."
      />
      {/* only show the caller's own posts */}
      <style>{`
        /* feed filter via state above — 'showAll' loads everything, so we wrap: */
      `}</style>

      {composeOpen && (
        <AnnounceCompose
          open
          onClose={() => setComposeOpen(false)}
          authorName={authorName}
          authorRole={role}
          restrictToTrack={restrictToTrack}
          restrictToReports={restrictToReports}
        />
      )}
    </div>
  );
}

// Lead — scoped to their track + their reports.
function LeadAnnounce() {
  const { profile } = useCurrentUserProfile();
  const lead = LEADS.find(l => l.track === profile.trackCode) || LEADS.find(l => l.id === 'lead-ais') || LEADS[0];
  const track = TRACKS.find(t => t.code === lead.track);
  return (
    <AnnounceConsoleScoped
      roleLabel="MISSION LEAD"
      roleColor="var(--platinum)"
      role="lead"
      authorName={profile.fullName || 'Mission Lead'}
      authorAvatar="corps"
      authorSub={`TRACK LEAD · ${track?.short} · ${lead.reports.length} REPORTS`}
      restrictToTrack={lead.track}
      restrictToReports={lead.reports}
      audienceNote={`As a Mission Lead, you can broadcast to your ${track?.short} track or message specific Exonauts in your roster.`}
    />
  );
}

// Commander — full access.
function CommanderAnnounce() {
  const { profile } = useCurrentUserProfile();
  return (
    <AnnounceConsoleScoped
      roleLabel="COMMANDER"
      roleColor="var(--ink, #F4C542)"
      role="commander"
      authorName={profile.fullName || 'Mission Commander'}
      authorAvatar="corps"
      authorSub="MISSION COMMANDER · ALL COHORTS"
      audienceNote="As Commander, you can broadcast to every Exonaut, one or more cohorts, specific tracks, or individuals."
    />
  );
}

// Platform Admin — full access.
function AdminAnnounce() {
  const { profile } = useCurrentUserProfile();
  return (
    <AnnounceConsoleScoped
      roleLabel="PLATFORM ADMIN"
      roleColor="var(--sky)"
      role="admin"
      authorName={profile.fullName || 'Platform Admin'}
      authorAvatar="corps"
      authorSub="PLATFORM ADMIN · ALL COHORTS · SYSTEM ROLE"
      audienceNote="Platform Admin announcements reach any Exonaut, cohort, track, or individual across the system."
    />
  );
}

// Scoped variant: console that only shows this author's posted announcements.
function AnnounceConsoleScoped(props) {
  const { byAuthor } = useAnnouncements();
  const [composeOpen, setComposeOpen] = React.useState(false);
  const mine = byAuthor(props.role, props.authorName);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: props.roleColor }}>
            {props.roleLabel} · ANNOUNCEMENTS
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Post Announcements</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {props.audienceNote} You've posted <strong style={{ color: 'var(--off-white)' }}>{mine.length}</strong> announcement{mine.length === 1 ? '' : 's'}.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
          <i className="fa-solid fa-paper-plane" /> NEW ANNOUNCEMENT
        </button>
      </div>

      <div className="card-panel" style={{ padding: 16, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <AvatarWithRing name={props.authorName} size={42} tier={props.authorAvatar || 'corps'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-heading" style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)' }}>
            Posting as {props.authorName}
          </div>
          <div className="t-mono" style={{ fontSize: 10, color: props.roleColor, letterSpacing: '0.1em', fontWeight: 700 }}>
            {props.authorSub}
          </div>
        </div>
      </div>

      <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white-40)', letterSpacing: '0.12em', marginBottom: 12 }}>
        YOUR POSTED ANNOUNCEMENTS · {mine.length}
      </div>

      <ScopedFeed list={mine} authorName={props.authorName} authorRole={props.role} />

      {composeOpen && (
        <AnnounceCompose
          open
          onClose={() => setComposeOpen(false)}
          authorName={props.authorName}
          authorRole={props.role}
          restrictToTrack={props.restrictToTrack}
          restrictToReports={props.restrictToReports}
        />
      )}
    </div>
  );
}

function ScopedFeed({ list, authorName, authorRole }) {
  const { react, togglePin, remove } = useAnnouncements();
  const [editing, setEditing] = React.useState(null);

  function confirmDelete(a) {
    if (confirm('Delete announcement "' + a.title + '"?')) remove(a.id);
  }

  if (list.length === 0) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: 40 }}>
        <i className="fa-solid fa-bullhorn" style={{ fontSize: 28, color: 'var(--off-white-40)', marginBottom: 10 }} />
        <div className="t-body" style={{ color: 'var(--off-white-68)' }}>
          You haven't posted any announcements yet. Use the button above to publish your first one.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {list.map(a => (
        <AnnouncementCard
          key={a.id}
          a={a}
          onReact={react}
          onPin={togglePin}
          onEdit={(ann) => setEditing(ann)}
          onDelete={confirmDelete}
          isAuthor
        />
      ))}
      {editing && (
        <AnnounceCompose
          open
          onClose={() => setEditing(null)}
          initial={editing}
          authorName={authorName}
          authorRole={authorRole}
        />
      )}
    </div>
  );
}

Object.assign(window, {
  AnnounceCompose, AnnouncementCard, AnnouncementFeed,
  LeadAnnounce, CommanderAnnounce, AdminAnnounce,
  AnnouncementsPageV2,
});
