// Messages page - direct conversations between Exonauts and program staff.

const MESSAGE_ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024;

function readMessageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > MESSAGE_ATTACHMENT_MAX_BYTES) {
      return reject(new Error(`${file.name} is larger than 3 MB.`));
    }
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result || ''),
    });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function filesToMessageAttachments(fileList) {
  const files = Array.from(fileList || []);
  return (await Promise.all(files.map(readMessageFile))).filter(Boolean);
}

function formatAttachmentSize(size) {
  const bytes = Number(size || 0);
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function cohortIdOf(profile) {
  return profile?.cohortId || ME.cohort || 'c2627';
}

function trackLabel(trackCode) {
  return (typeof TRACKS !== 'undefined' ? TRACKS : []).find(t => t.code === trackCode)?.short || trackCode || 'No track';
}

function profileDisplayName(profile) {
  return profile?.fullName || profile?.email || profile?.name || 'Exonaut';
}

function userCanRemoveGroupMember(currentProfile, thread, memberProfile) {
  if (!currentProfile || !thread?.isGroup || !memberProfile || memberProfile.id === currentProfile.id) return false;
  if ((thread.participantIds || []).includes(currentProfile.id)) return true;
  if (['admin', 'commander'].includes(currentProfile.role)) return true;
  const ledTracks = new Set();
  if ((currentProfile.role || '') === 'lead' && currentProfile.trackCode) ledTracks.add(currentProfile.trackCode);
  (typeof TRACKS !== 'undefined' ? TRACKS : []).forEach(track => {
    if (window.__crownStore?.getActiveCrownForTrack?.(track.code)?.userId === currentProfile.id) ledTracks.add(track.code);
  });
  if (!ledTracks.size) return false;
  return thread.participantIds.some(id => {
    const p = (window.__profileDirectory || []).find(item => item.id === id);
    return p && ledTracks.has(p.trackCode || 'AIS');
  });
}

function fileIconForAttachment(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'fa-file-pdf';
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'fa-file-word';
  if (type.includes('spreadsheet') || type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'fa-file-excel';
  if (type.includes('presentation') || type.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'fa-file-powerpoint';
  if (type.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar')) return 'fa-file-zipper';
  return 'fa-file-lines';
}

function canEmbedAttachment(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  return type.includes('pdf') || name.endsWith('.pdf');
}

function MessageAttachments({ attachments = [], editable = false, onRemove, onPreview }) {
  if (!attachments.length) return null;
  return (
    <div className="message-attachments">
      {attachments.map((file, index) => {
        const isImage = String(file.type || '').startsWith('image/');
        return (
          <div key={file.id || file.name || index} className={'message-attachment' + (isImage ? ' image' : '')}>
            {isImage ? (
              <button
                type="button"
                className="message-image-preview-btn"
                onClick={() => onPreview?.(file)}
                title={file.name || 'Open image'}
              >
                <img src={file.dataUrl} alt={file.name || 'Attached image'} />
              </button>
            ) : (
              <button
                type="button"
                className="message-file-card"
                onClick={() => onPreview?.(file)}
                title={file.name || 'Open file'}
              >
                <i className={'fa-solid ' + fileIconForAttachment(file)} />
                <span>
                  <strong>{file.name || 'Attachment'}</strong>
                  <em>{formatAttachmentSize(file.size)}</em>
                </span>
                <a className="message-file-download" href={file.dataUrl} download={file.name || 'attachment'} title="Download file" onClick={e => e.stopPropagation()}>
                  <i className="fa-solid fa-download" />
                </a>
              </button>
            )}
            {editable && (
              <button type="button" className="message-attachment-remove" onClick={() => onRemove?.(index)} title="Remove attachment">
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MessagesPage({ intent, onIntentHandled }) {
  const { profile } = useCurrentUserProfile();
  const usersState = useUserProfiles();
  const profiles = usersState.profiles && usersState.profiles.length
    ? usersState.profiles
    : (window.__profileDirectory || []);
  const {
    threads,
    messagesForThread,
    createThread,
    createGroup,
    renameThread,
    removeParticipant,
    addParticipants,
    ensureTrackGroups,
    sendMessage,
    markThreadRead,
    timeAgo,
    loaded,
    error,
  } = useMessages(profile);
  const [activeId, setActiveId] = React.useState('');
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [groupOpen, setGroupOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [threadSearch, setThreadSearch] = React.useState('');
  const [attachments, setAttachments] = React.useState([]);
  const [previewImage, setPreviewImage] = React.useState(null);
  const [mobileConversationOpen, setMobileConversationOpen] = React.useState(false);
  const [composeDefaults, setComposeDefaults] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const activeThread = threads.find(t => t.id === activeId) || threads[0] || null;
  const messages = activeThread ? messagesForThread(activeThread.id) : [];
  const visibleThreads = threads.filter(thread => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return true;
    return [
      thread.title,
      thread.preview,
      ...(thread.participantNames || []),
      ...(thread.otherParticipantNames || []),
    ].some(value => String(value || '').toLowerCase().includes(q));
  });

  React.useEffect(() => {
    if (!activeId && threads[0]) setActiveId(threads[0].id);
    if (activeId && !threads.some(t => t.id === activeId)) setActiveId(threads[0]?.id || '');
  }, [threads.length, activeId]);

  React.useEffect(() => {
    if (!loaded || !profile?.id || !profiles.length || !ensureTrackGroups) return;
    ensureTrackGroups(profiles).catch(err => console.warn('Could not ensure track group chat:', err.message || err));
  }, [loaded, profile?.id, profile?.cohortId, profile?.trackCode, profiles.length]);

  React.useEffect(() => {
    if (activeThread) markThreadRead(activeThread.id);
  }, [activeThread?.id]);

  React.useEffect(() => {
    if (!intent?.recipientId) return;
    const existingThread = threads.find(thread =>
      (thread.otherParticipantIds || []).includes(intent.recipientId)
    );
    if (existingThread) {
      setActiveId(existingThread.id);
      setMobileConversationOpen(true);
      setComposeOpen(false);
      setComposeDefaults(null);
      onIntentHandled?.();
      return;
    }
    if (!loaded) return;
    setComposeDefaults({
      recipientId: intent.recipientId,
      recipientName: intent.recipientName || '',
      title: intent.title || '',
    });
    setComposeOpen(true);
    onIntentHandled?.();
  }, [intent?.requestedAt, intent?.recipientId, loaded, threads]);

  const send = async () => {
    const text = draft.trim();
    if ((!text && attachments.length === 0) || !activeThread) return;
    const files = attachments;
    setDraft('');
    setAttachments([]);
    try {
      await sendMessage({ threadId: activeThread.id, body: text, attachments: files });
    } catch (err) {
      alert((err && err.message) || 'Could not send message.');
      setDraft(text);
      setAttachments(files);
    }
  };

  const addAttachments = async (fileList) => {
    try {
      const files = await filesToMessageAttachments(fileList);
      setAttachments(current => [...current, ...files]);
    } catch (err) {
      alert((err && err.message) || 'Could not attach file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const directory = profiles
    .filter(p => p.id && p.id !== profile?.id)
    .sort((a, b) => (a.fullName || a.email || '').localeCompare(b.fullName || b.email || ''));
  const cohortDirectory = directory.filter(p => (p.cohortId || 'c2627') === cohortIdOf(profile));

  return (
    <div className="messages-page enter">
      <h1 className="messages-page-title">Messages</h1>
      {error && (
        <div className="card-panel" style={{ padding: 14, marginBottom: 14, borderColor: 'rgba(255,90,95,0.35)' }}>
          <div className="t-body" style={{ color: 'var(--coral)' }}>{error}</div>
        </div>
      )}

      <div className={'messages-layout' + (mobileConversationOpen ? ' conversation-open' : '')}>
        <div className="messages-thread-list card-panel">
          <div className="messages-thread-actions">
            <div className="messages-thread-action-grid">
              <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
                <i className="fa-solid fa-pen-to-square" /> New Message
              </button>
              <button className="btn btn-ghost" onClick={() => setGroupOpen(true)}>
                <i className="fa-solid fa-user-group" /> New Group
              </button>
            </div>
            <div className="messages-thread-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                value={threadSearch}
                onChange={e => setThreadSearch(e.target.value)}
                placeholder="Search conversations..."
              />
            </div>
          </div>
          {!loaded && threads.length === 0 && (
            <div className="messages-empty">Loading messages...</div>
          )}
          {loaded && threads.length === 0 && (
            <div className="messages-empty">
              <i className="fa-solid fa-inbox" />
              <strong>No messages yet</strong>
              <span>Start a thread with another Exonaut or program lead.</span>
            </div>
          )}
          {loaded && threads.length > 0 && visibleThreads.length === 0 && (
            <div className="messages-empty compact">No conversations found.</div>
          )}
          {visibleThreads.map(thread => {
            const avatarName = (thread.otherParticipantNames || []).join(', ') || thread.title;
            const avatarUrl = (thread.otherParticipantAvatars || []).find(Boolean) || '';
            const avatarRole = (thread.otherParticipantRoles || [])[0] || 'exonaut';
            const threadAdmin = profiles.find(p => p.id === thread.createdBy);
            const adminName = threadAdmin ? profileDisplayName(threadAdmin) : 'Group admin';
            return (
              <button
                key={thread.id}
                className={'messages-thread' + (activeThread?.id === thread.id ? ' active' : '')}
                onClick={() => { setActiveId(thread.id); setMobileConversationOpen(true); }}
              >
                <div className="messages-thread-avatar">
                  {thread.isGroup ? (
                    <div className="messages-group-avatar"><i className="fa-solid fa-user-group" /></div>
                  ) : (
                    <AvatarWithRing
                      name={avatarName}
                      avatarUrl={avatarUrl}
                      size={34}
                      tier={avatarRole === 'exonaut' ? 'entry' : 'corps'}
                    />
                  )}
                </div>
                <div className="messages-thread-main">
                  <div className="messages-thread-title">
                    <span>{thread.title}</span>
                    {thread.unreadCount > 0 && <b>{thread.unreadCount}</b>}
                  </div>
                  {thread.isGroup && <div className="messages-thread-meta">{thread.threadType === 'track_group' ? 'Track Group' : 'Group'} / {thread.participantIds.length} members / Admin: {adminName}</div>}
                  <div className="messages-thread-preview">{thread.preview}</div>
                </div>
                <div className="messages-thread-time">{thread.lastMessage ? timeAgo(thread.lastMessage.createdAt) : ''}</div>
              </button>
            );
          })}
        </div>

        <div className="messages-conversation card-panel">
          {activeThread ? (
            <>
              <div className="messages-conversation-head">
                <button type="button" className="messages-mobile-back" onClick={() => setMobileConversationOpen(false)} aria-label="Back to conversations">
                  <i className="fa-solid fa-arrow-left" /> Conversations
                </button>
                <div className="messages-conversation-title">
                  <div>
                    <div className="t-heading" style={{ marginBottom: 2 }}>{activeThread.title}</div>
                    <div className="t-micro">
                      {activeThread.isGroup
                        ? `${activeThread.participantIds.length} members / Admin: ${profileDisplayName(profiles.find(p => p.id === activeThread.createdBy))}`
                        : activeThread.otherParticipantNames.join(' / ')}
                    </div>
                  </div>
                  {activeThread.isGroup && (
                    <button type="button" className="message-group-details-btn" onClick={() => setDetailsOpen(true)} title="Group Details">
                      <i className="fa-solid fa-sliders" />
                    </button>
                  )}
                </div>
              </div>
              <div className="messages-body">
                {messages.length === 0 ? (
                  <div className="messages-empty compact">No messages in this thread yet.</div>
                ) : messages.map(m => {
                  const mine = m.senderId === profile.id;
                  const sender = (window.__profileDirectory || []).find(p => p.id === m.senderId);
                  return (
                    <div key={m.id} className={'message-row' + (mine ? ' mine' : '')}>
                      {!mine && (
                        <AvatarWithRing
                          name={sender?.fullName || 'Exonaut'}
                          avatarUrl={sender?.avatarUrl || ''}
                          size={28}
                          tier={sender?.role === 'exonaut' ? 'entry' : 'corps'}
                        />
                      )}
                      <div className="message-bubble">
                        {!mine && <div className="message-sender">{sender?.fullName || 'Exonaut'}</div>}
                        {m.body && <div>{m.body}</div>}
                        <MessageAttachments attachments={m.attachments || []} onPreview={setPreviewImage} />
                        <time>{timeAgo(m.createdAt)}</time>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="messages-composer">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="message-file-input"
                  onChange={e => addAttachments(e.target.files)}
                />
                <button className="message-attach-btn" type="button" onClick={() => fileInputRef.current?.click()} title="Attach files">
                  <i className="fa-solid fa-paperclip" />
                </button>
                <div className="messages-composer-main">
                  <MessageAttachments
                    attachments={attachments}
                    editable
                    onPreview={setPreviewImage}
                    onRemove={(index) => setAttachments(files => files.filter((_, i) => i !== index))}
                  />
                  <textarea
                    className="textarea"
                    rows={2}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
                    }}
                    placeholder="Write a message..."
                  />
                </div>
                <button className="btn btn-primary" disabled={!draft.trim() && attachments.length === 0} onClick={send}>
                  <i className="fa-solid fa-paper-plane" /> Send
                </button>
              </div>
            </>
          ) : (
            <div className="messages-empty">
              <i className="fa-solid fa-comments" />
              <strong>Select a thread</strong>
              <span>Conversations will appear here.</span>
            </div>
          )}
        </div>
      </div>

      {composeOpen && (
        <MessageComposeModal
          key={(composeDefaults?.recipientId || 'new') + ':' + (composeDefaults?.title || '')}
          profiles={directory}
          initialRecipientId={composeDefaults?.recipientId || ''}
          initialRecipientName={composeDefaults?.recipientName || ''}
          initialTitle={composeDefaults?.title || ''}
          onClose={() => setComposeOpen(false)}
          onCreate={async (payload) => {
            const thread = await createThread(payload);
            setActiveId(thread.id);
            setMobileConversationOpen(true);
            setComposeOpen(false);
          }}
        />
      )}

      {groupOpen && (
        <GroupComposeModal
          profiles={cohortDirectory}
          cohortId={cohortIdOf(profile)}
          onClose={() => setGroupOpen(false)}
          onCreate={async (payload) => {
            const thread = await createGroup(payload);
            setActiveId(thread.id);
            setMobileConversationOpen(true);
            setGroupOpen(false);
          }}
        />
      )}

      {detailsOpen && activeThread && (
        <GroupDetailsModal
          thread={activeThread}
          profiles={profiles}
          currentProfile={profile}
          onClose={() => setDetailsOpen(false)}
          onRename={async (title) => {
            await renameThread({ threadId: activeThread.id, title });
          }}
          onRemove={async (userId) => {
            await removeParticipant({ threadId: activeThread.id, userId });
          }}
          onAdd={async (userIds) => {
            await addParticipants({ threadId: activeThread.id, userIds });
          }}
        />
      )}

      {previewImage && (
        <div className="message-preview-backdrop" onClick={() => setPreviewImage(null)}>
          <div className={'message-preview-dialog' + (String(previewImage.type || '').startsWith('image/') ? '' : ' file')} onClick={e => e.stopPropagation()}>
            <button className="message-preview-close" onClick={() => setPreviewImage(null)} title="Close preview">
              <i className="fa-solid fa-xmark" />
            </button>
            {String(previewImage.type || '').startsWith('image/') ? (
              <img src={previewImage.dataUrl} alt={previewImage.name || 'Image preview'} />
            ) : canEmbedAttachment(previewImage) ? (
              <iframe className="message-preview-frame" src={previewImage.dataUrl} title={previewImage.name || 'File preview'} />
            ) : (
              <div className="message-preview-file-panel">
                <i className={'fa-solid ' + fileIconForAttachment(previewImage)} />
                <strong>{previewImage.name || 'Attachment'}</strong>
                <span>{formatAttachmentSize(previewImage.size)}</span>
                <a className="btn btn-primary" href={previewImage.dataUrl} download={previewImage.name || 'attachment'}>
                  <i className="fa-solid fa-download" /> Download
                </a>
              </div>
            )}
            <div className="message-preview-caption">{previewImage.name || 'Image'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupComposeModal({ profiles, cohortId, onClose, onCreate }) {
  const [title, setTitle] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [track, setTrack] = React.useState('all');
  const [selected, setSelected] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const availableTracks = Array.from(new Set(profiles.map(p => p.trackCode || 'AIS').filter(Boolean))).sort();
  const matches = profiles.filter(p => {
    if (track !== 'all' && (p.trackCode || 'AIS') !== track) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.fullName, p.email, p.trackCode, p.role].some(v => String(v || '').toLowerCase().includes(q));
  });
  const selectedProfiles = selected.map(id => profiles.find(p => p.id === id)).filter(Boolean);
  const canCreate = title.trim().length >= 3 && title.trim().length <= 60 && selected.length >= 2;

  function toggle(id) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  async function submit() {
    if (!canCreate) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), participantIds: selected });
    } catch (err) {
      alert((err && err.message) || 'Could not create group.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="messages-modal group-compose-modal card-panel" onClick={e => e.stopPropagation()}>
        <div className="messages-modal-head">
          <div>
            <div className="t-micro">NEW GROUP</div>
            <div className="t-heading">Create group chat</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Group name" maxLength={60} />
        <div className="group-picker-filters">
          <div className="messages-thread-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Exonauts..." />
          </div>
          <select className="select" value={track} onChange={e => setTrack(e.target.value)}>
            <option value="all">All tracks</option>
            {availableTracks.map(code => <option key={code} value={code}>{trackLabel(code)}</option>)}
          </select>
        </div>
        <div className="selected-member-chips">
          {selectedProfiles.map(p => <button key={p.id} onClick={() => toggle(p.id)}>{profileDisplayName(p)} <i className="fa-solid fa-xmark" /></button>)}
          {!selectedProfiles.length && <span>Select at least 2 Exonauts from this cohort.</span>}
        </div>
        <div className="messages-recipient-list group-member-picker">
          {matches.map(p => (
            <button key={p.id} className={'messages-recipient' + (selected.includes(p.id) ? ' active' : '')} onClick={() => toggle(p.id)}>
              <AvatarWithRing name={profileDisplayName(p)} avatarUrl={p.avatarUrl} size={30} tier={p.role === 'exonaut' ? 'entry' : 'corps'} />
              <span>
                <strong>{profileDisplayName(p)}</strong>
                <em>{trackLabel(p.trackCode)} / {p.cohortId || cohortId}</em>
              </span>
              <i className={'fa-solid ' + (selected.includes(p.id) ? 'fa-circle-check' : 'fa-plus')} />
            </button>
          ))}
          {matches.length === 0 && <div className="messages-empty compact">No Exonauts found.</div>}
        </div>
        <div className="messages-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canCreate || saving} onClick={submit}>
            <i className="fa-solid fa-user-group" /> {saving ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupDetailsModal({ thread, profiles, currentProfile, onClose, onRename, onRemove, onAdd }) {
  const [title, setTitle] = React.useState(thread.title || '');
  const [saving, setSaving] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addQuery, setAddQuery] = React.useState('');
  const [selectedAdds, setSelectedAdds] = React.useState([]);
  const participants = (thread.participantIds || []).map(id => profiles.find(p => p.id === id) || { id, fullName: 'Exonaut' });
  const adminProfile = profiles.find(p => p.id === thread.createdBy) || participants.find(p => p.id === thread.createdBy);
  const canRename = thread.threadType === 'group';
  const canManageMembers = thread.isGroup && (thread.participantIds || []).includes(currentProfile?.id);
  const addCandidates = profiles
    .filter(p => p.id && !(thread.participantIds || []).includes(p.id))
    .filter(p => {
      const q = addQuery.trim().toLowerCase();
      if (!q) return true;
      return [p.fullName, p.email, p.role, p.trackCode].some(value => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => profileDisplayName(a).localeCompare(profileDisplayName(b)))
    .slice(0, 20);

  async function rename() {
    if (!canRename || title.trim() === thread.title) return;
    setSaving(true);
    try {
      await onRename(title.trim());
      setSaving(false);
    } catch (err) {
      alert((err && err.message) || 'Could not rename group.');
      setSaving(false);
    }
  }

  async function remove(userId) {
    const member = participants.find(p => p.id === userId);
    if (!window.confirm(`Remove ${profileDisplayName(member)} from this group?`)) return;
    try {
      await onRemove(userId);
    } catch (err) {
      alert((err && err.message) || 'Could not remove member.');
    }
  }

  function toggleAdd(userId) {
    setSelectedAdds(current => current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]);
  }

  async function addSelected() {
    if (!selectedAdds.length) return;
    setSaving(true);
    try {
      await onAdd(selectedAdds);
      setSelectedAdds([]);
      setAddQuery('');
      setAddOpen(false);
      setSaving(false);
    } catch (err) {
      alert((err && err.message) || 'Could not add members.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="messages-modal group-details-modal card-panel" onClick={e => e.stopPropagation()}>
        <div className="messages-modal-head">
          <div>
            <div className="t-micro">{thread.threadType === 'track_group' ? 'TRACK GROUP' : 'GROUP DETAILS'}</div>
            <div className="t-heading">{thread.title}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <label className="group-details-label">Group name</label>
        <div className="group-rename-row">
          <input className="input" disabled={!canRename} value={title} onChange={e => setTitle(e.target.value)} />
          <button className="btn btn-primary" disabled={!canRename || saving || title.trim() === thread.title} onClick={rename}>Rename Group</button>
        </div>
        <label className="group-details-label">Group admin</label>
        <div className="group-admin-card">
          <AvatarWithRing name={profileDisplayName(adminProfile)} avatarUrl={adminProfile?.avatarUrl} size={34} tier={adminProfile?.role === 'exonaut' ? 'entry' : 'corps'} />
          <span>
            <strong>{profileDisplayName(adminProfile)}</strong>
            <em>{adminProfile ? `${trackLabel(adminProfile.trackCode)} / ${adminProfile.role || 'exonaut'}` : 'Original group creator'}</em>
          </span>
        </div>
        {thread.threadType === 'track_group' && <p className="group-details-note">Default track groups are synced from the cohort roster and cannot be renamed.</p>}
        {canManageMembers && (
          <div className="group-member-tools">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddOpen(open => !open)}>
              <i className="fa-solid fa-user-plus" /> Add Members
            </button>
          </div>
        )}
        {addOpen && canManageMembers && (
          <div className="group-add-panel">
            <div className="messages-thread-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input value={addQuery} onChange={e => setAddQuery(e.target.value)} placeholder="Search people to add..." />
            </div>
            <div className="messages-recipient-list group-member-picker">
              {addCandidates.map(p => (
                <button key={p.id} className={'messages-recipient' + (selectedAdds.includes(p.id) ? ' active' : '')} onClick={() => toggleAdd(p.id)}>
                  <AvatarWithRing name={profileDisplayName(p)} avatarUrl={p.avatarUrl} size={30} tier={p.role === 'exonaut' ? 'entry' : 'corps'} />
                  <span>
                    <strong>{profileDisplayName(p)}</strong>
                    <em>{trackLabel(p.trackCode)} / {p.role || 'exonaut'}</em>
                  </span>
                  {selectedAdds.includes(p.id) && <i className="fa-solid fa-check" />}
                </button>
              ))}
              {addCandidates.length === 0 && <div className="messages-empty compact">No available members found.</div>}
            </div>
            <div className="messages-modal-actions">
              <button className="btn btn-primary btn-sm" disabled={!selectedAdds.length || saving} onClick={addSelected}>
                <i className="fa-solid fa-user-plus" /> Add {selectedAdds.length || ''} Member{selectedAdds.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}
        <div className="group-participant-list">
          {participants.map(p => {
            const canRemove = userCanRemoveGroupMember(currentProfile, thread, p);
            return (
              <div className="group-participant-row" key={p.id}>
                <AvatarWithRing name={profileDisplayName(p)} avatarUrl={p.avatarUrl} size={32} tier={p.role === 'exonaut' ? 'entry' : 'corps'} />
                <span>
                  <strong>{profileDisplayName(p)}</strong>
                  <em>{trackLabel(p.trackCode)} / {p.role || 'exonaut'}</em>
                </span>
                {canRemove && <button className="btn btn-ghost btn-sm danger-action" onClick={() => remove(p.id)}>Remove</button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MessageComposeModal({ profiles, onClose, onCreate, initialRecipientId = '', initialRecipientName = '', initialTitle = '' }) {
  const [query, setQuery] = React.useState(initialRecipientName);
  const [recipientId, setRecipientId] = React.useState(initialRecipientId);
  const [title, setTitle] = React.useState(initialTitle);
  const [body, setBody] = React.useState('');
  const [attachments, setAttachments] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const matches = profiles.filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.fullName, p.email, p.role, p.trackCode].some(v => String(v || '').toLowerCase().includes(q));
  }).slice(0, 12);

  async function submit() {
    if (!recipientId || (!body.trim() && attachments.length === 0)) return;
    setSaving(true);
    try {
      await onCreate({ participantIds: [recipientId], title, body, attachments });
    } catch (err) {
      alert((err && err.message) || 'Could not create message.');
      setSaving(false);
    }
  }

  const addAttachments = async (fileList) => {
    try {
      const files = await filesToMessageAttachments(fileList);
      setAttachments(current => [...current, ...files]);
    } catch (err) {
      alert((err && err.message) || 'Could not attach file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="messages-modal card-panel" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="t-micro">NEW THREAD</div>
            <div className="t-heading">Start a message</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        <input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people..." />
        <div className="messages-recipient-list">
          {matches.map(p => (
            <button
              key={p.id}
              className={'messages-recipient' + (recipientId === p.id ? ' active' : '')}
              onClick={() => {
                setRecipientId(p.id);
                if (!title.trim()) setTitle(p.fullName || p.email || 'Message');
              }}
            >
              <AvatarWithRing name={p.fullName || p.email || 'Exonaut'} avatarUrl={p.avatarUrl} size={30} tier={p.role === 'exonaut' ? 'entry' : 'corps'} />
              <span>
                <strong>{p.fullName || p.email || 'Exonaut'}</strong>
                <em>{p.role || 'exonaut'} / {p.trackCode || 'No track'}</em>
              </span>
            </button>
          ))}
          {matches.length === 0 && <div className="messages-empty compact">No people found.</div>}
        </div>

        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Thread title, optional" />
        <textarea className="textarea" rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Message..." />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="message-file-input"
          onChange={e => addAttachments(e.target.files)}
        />
        <div className="messages-modal-attachments">
          <button className="btn btn-ghost" type="button" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-paperclip" /> Attach
          </button>
          <MessageAttachments
            attachments={attachments}
            editable
            onRemove={(index) => setAttachments(files => files.filter((_, i) => i !== index))}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!recipientId || (!body.trim() && attachments.length === 0) || saving} onClick={submit}>
            <i className="fa-solid fa-paper-plane" /> {saving ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MessagesPage, MessageComposeModal, GroupComposeModal, GroupDetailsModal });
