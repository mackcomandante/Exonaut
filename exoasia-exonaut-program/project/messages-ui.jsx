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
    sendMessage,
    markThreadRead,
    timeAgo,
    loaded,
    error,
  } = useMessages(profile);
  const [activeId, setActiveId] = React.useState('');
  const [composeOpen, setComposeOpen] = React.useState(false);
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
    .filter(p => p.id && p.id !== profile.id)
    .sort((a, b) => (a.fullName || a.email || '').localeCompare(b.fullName || b.email || ''));

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
            <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
              <i className="fa-solid fa-pen-to-square" /> New Message
            </button>
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
            return (
              <button
                key={thread.id}
                className={'messages-thread' + (activeThread?.id === thread.id ? ' active' : '')}
                onClick={() => { setActiveId(thread.id); setMobileConversationOpen(true); }}
              >
                <div className="messages-thread-avatar">
                  <AvatarWithRing
                    name={avatarName}
                    avatarUrl={avatarUrl}
                    size={34}
                    tier={avatarRole === 'exonaut' ? 'entry' : 'corps'}
                  />
                </div>
                <div className="messages-thread-main">
                  <div className="messages-thread-title">
                    <span>{thread.title}</span>
                    {thread.unreadCount > 0 && <b>{thread.unreadCount}</b>}
                  </div>
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
                <div>
                  <div className="t-heading" style={{ marginBottom: 2 }}>{activeThread.title}</div>
                  <div className="t-micro">{activeThread.participantNames.join(' / ')}</div>
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

Object.assign(window, { MessagesPage, MessageComposeModal });
