// Exonaut Guide - onboarding checklist from the new Exonauts guide.

const EXONAUT_GUIDE_SECTIONS = [
  {
    id: 'account',
    title: 'Account Setup',
    eyebrow: 'STEP 01',
    icon: 'fa-user-check',
    tasks: [
      { id: 'gmail', title: 'Create your Exoasia Gmail', detail: 'Use exoasia.fullname@gmail.com. If Gmail flags it, create a different address.' },
      { id: 'admin-email', title: 'Inform the Admin team', detail: 'Send your Exoasia email address so they can grant access.' },
      { id: 'action-register', title: 'Access the Action Register', detail: 'Open the Google Sheet once Admin gives access.', href: 'https://docs.google.com/spreadsheets/d/14aw34EL7OZA3vqMMiFY1eEQx3X7x5_3gx9ZY8iAwT2o/edit?usp=sharing', action: 'OPEN SHEET' },
      { id: 'exonauts-sheet', title: 'Fill out the Exonauts sheet', detail: 'Enter your details on the bottom row.', href: 'https://docs.google.com/spreadsheets/d/14aw34EL7OZA3vqMMiFY1eEQx3X7x5_3gx9ZY8iAwT2o/edit?usp=sharing', action: 'OPEN SHEET' },
      { id: 'personal-tab', title: 'Create your personal tab', detail: 'Name the tab after yourself and copy the Exonaut Platform template.', href: 'https://docs.google.com/spreadsheets/d/14aw34EL7OZA3vqMMiFY1eEQx3X7x5_3gx9ZY8iAwT2o/edit?usp=sharing', action: 'OPEN SHEET' },
      { id: 'data-room', title: 'Create Personal Data Room', detail: 'Create a personal Google Drive folder for internship files, outputs, references, and submitted work. Paste the folder link in My Profile -> Data Room URL.', href: 'https://drive.google.com/drive/my-drive', action: 'OPEN DRIVE' },
      { id: 'track-project', title: 'Wait for track and project assignment', detail: 'Admin usually assigns these after 2-3 days.', status: 'admin' },
      { id: 'teams', title: 'Install Exoasia Teams', detail: 'Coordinate with Feone for Windows or Anya for Mac account details.', href: 'https://drive.google.com/drive/folders/1IJdLMs7cv9_TPszP5B9dxfFCpoMKfikO', action: 'OPEN DRIVE' },
      { id: 'linkedin', title: 'Post your LinkedIn announcement', detail: 'Publish your new internship position announcement.', href: 'https://www.canva.com/design/DAHHWgxGNYQ/olIReujkiRcV3MvRok8cSg/edit', action: 'OPEN CANVA' },
    ],
  },
  {
    id: 'docs',
    title: 'OJT Documents',
    eyebrow: 'STEP 02',
    icon: 'fa-file-signature',
    tasks: [
      { id: 'initial-docs', title: 'Complete initial OJT requirements', detail: 'Endorsement Request, Endorsement Letter, COA, proof of acceptance, S2S, and Trainee Schedule.' },
      { id: 'onedrive', title: 'Upload documents for signing', detail: "Upload your documents to Sir KitKat's OneDrive." },
      { id: 'remaining-docs', title: 'Complete remaining documents', detail: 'Training Plan, Waiver, and Project Proposal after the first batch is signed and emailed.' },
      { id: 'gdrive-link', title: 'Upload signed docs to your GDrive', detail: 'Paste the link in the SIGNING OJT DOCS sheet in the Action Register.', href: 'https://docs.google.com/spreadsheets/d/14aw34EL7OZA3vqMMiFY1eEQx3X7x5_3gx9ZY8iAwT2o/edit?usp=sharing', action: 'OPEN SHEET' },
      { id: 'status', title: 'Track signing status', detail: 'Watch the status column and wait for Admin instructions.', status: 'admin', href: 'https://docs.google.com/spreadsheets/d/14aw34EL7OZA3vqMMiFY1eEQx3X7x5_3gx9ZY8iAwT2o/edit?usp=sharing', action: 'OPEN SHEET' },
    ],
  },
  {
    id: 'announcements',
    title: 'Important Announcements',
    eyebrow: 'REMINDERS',
    icon: 'fa-bullhorn',
    tasks: [
      { id: 'meetings', title: 'Attend Monday and Wednesday meetings', detail: 'Mandatory meetings with Sir Mack are at 8:00 AM.', href: 'https://us06web.zoom.us/j/2378429345?pwd=G0c8CCGac2GsDMpwB0BNpVs6fMyVL0.1', action: 'OPEN ZOOM' },
      { id: 'zoom', title: 'Check Zoom links and calendar invites', detail: 'Find links in the Action Register Links sheet and watch the WhatsApp group.', href: 'https://us06web.zoom.us/j/2378429345?pwd=G0c8CCGac2GsDMpwB0BNpVs6fMyVL0.1', action: 'OPEN ZOOM' },
      { id: 'pubmat', title: 'Create your LinkedIn pubmat', detail: 'Use the Exonaut Announcement Canva template.', href: 'https://www.canva.com/design/DAHHWgxGNYQ/olIReujkiRcV3MvRok8cSg/edit', action: 'OPEN CANVA' },
      { id: 'portal', title: 'Use the Exonaut Portal', detail: 'Sign up with your Exoasia email and follow Missions to earn points.' },
      { id: 'whatsapp', title: 'Check pinned WhatsApp messages', detail: 'Important details and instructions are usually pinned or announced there.' },
    ],
  },
];

const EXONAUT_GUIDE_CONTACTS = [
  { name: 'Ynikko Aguas', role: 'Inquiries and reports', phone: '9662678981' },
  { name: 'Feone', role: 'Admin Team', phone: '09193291514' },
  { name: 'Edelle', role: 'Admin Team', phone: '09241245339' },
  { name: 'Myrr', role: 'Admin Team', phone: '09562071698' },
  { name: 'Felipe', role: 'Admin Team', phone: '09612308866' },
];

const SIR_MACK_BOOKING_URL = 'https://link.gamechangerfunnel.com/widget/booking/L6l6siGhUd4ras8fMWHd';

function ExonautGuidePage() {
  const { profile } = useCurrentUserProfile();
  const storageKey = `exo:guide:${profile.id || ME_ID}`;
  const allTaskIds = React.useMemo(
    () => EXONAUT_GUIDE_SECTIONS.flatMap(section => section.tasks.map(task => task.id)),
    []
  );
  const [checked, setChecked] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) { return {}; }
  });

  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(checked)); } catch (e) {}
  }, [checked, storageKey]);

  const checkedWithProfile = React.useMemo(() => ({
    ...checked,
    ...(String(profile.dataRoomUrl || '').trim() ? { 'data-room': true } : {}),
  }), [checked, profile.dataRoomUrl]);
  const doneCount = allTaskIds.filter(id => checkedWithProfile[id]).length;
  const progress = allTaskIds.length ? Math.round((doneCount / allTaskIds.length) * 100) : 0;
  const toggleTask = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>EXONAUT GUIDE</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>New Exonaut Checklist</h1>
        </div>
        <span className="section-meta">{doneCount}/{allTaskIds.length} COMPLETE</span>
      </div>

      <div className="card-hud" style={{ padding: 22, marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div className="t-heading" style={{ fontSize: 18 }}>Onboarding Progress</div>
            <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-54)', marginTop: 4 }}>
              Complete each setup item as you move through your first Exoasia steps.
            </div>
          </div>
          <div className="t-mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{progress}%</div>
        </div>
        <div className="pillar-bar" style={{ marginBottom: 0, '--pillar-color': 'var(--accent)' }}>
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 22 }}>
        {EXONAUT_GUIDE_SECTIONS.map(section => (
          <GuideSection key={section.id} section={section} checked={checkedWithProfile} onToggle={toggleTask} />
        ))}
      </div>

      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>Contacts</h2>
        <span className="section-meta">WHO TO REACH OUT TO</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {EXONAUT_GUIDE_CONTACTS.map(contact => (
          <div key={contact.name} className="card-flat" style={{ padding: 16 }}>
            <div className="t-heading" style={{ fontSize: 14 }}>{contact.name}</div>
            <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-54)', margin: '4px 0 10px' }}>{contact.role}</div>
            <a className="btn btn-ghost btn-sm" href={`tel:${contact.phone}`} style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}>
              <i className="fa-solid fa-phone" /> {contact.phone}
            </a>
          </div>
        ))}
      </div>

      <div className="section-head" style={{ marginTop: 26 }}>
        <h2>Resignation Protocol</h2>
        <span className="section-meta">OFFICIAL PROGRAM EXIT PROCESS</span>
      </div>
      <div className="card-panel" style={{ padding: 20, borderLeft: '2px solid var(--lavender)' }}>
        <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)', lineHeight: 1.6, marginBottom: 16 }}>
          If you are considering resigning from the Exonaut Program, follow the official protocol below. Starting the protocol does not finalize your resignation; you must wait for Sir Mack's final signal before fully leaving.
        </div>
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {[
            'Book a call with Sir Mack to discuss your reasons and concerns for resigning.',
            'If Sir Mack confirms that your reasons are valid, send your updated resignation email to him.',
            'Include a turnover proposal for your current projects/tasks and the designated Exonaut who will receive the handoff.',
            'Wait for Sir Mack\'s final signal before fully leaving the company/program.',
          ].map((item, index) => (
            <div key={item} className="card-flat" style={{ padding: 12, display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
              <div className="t-mono" style={{ color: 'var(--lavender)', fontWeight: 800 }}>{index + 1}</div>
              <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white)' }}>{item}</div>
            </div>
          ))}
        </div>
        <a className="btn btn-primary btn-sm" href={SIR_MACK_BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <i className="fa-solid fa-calendar-check" /> BOOK A CALL WITH SIR MACK
        </a>
      </div>
    </div>
  );
}

function guideActionIcon(action = '') {
  if (action.includes('SHEET')) return 'fa-table';
  if (action.includes('DRIVE')) return 'fa-folder-open';
  if (action.includes('ZOOM')) return 'fa-video';
  if (action.includes('CANVA')) return 'fa-palette';
  return 'fa-arrow-up-right-from-square';
}

function GuideSection({ section, checked, onToggle }) {
  const complete = section.tasks.filter(task => checked[task.id]).length;
  return (
    <div className="card-panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="t-label-muted" style={{ marginBottom: 6 }}>{section.eyebrow}</div>
          <div className="t-heading" style={{ fontSize: 17 }}>
            <i className={'fa-solid ' + section.icon} style={{ color: 'var(--accent)', marginRight: 8 }} />
            {section.title}
          </div>
        </div>
        <div className="status-pill status-approved">{complete}/{section.tasks.length}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {section.tasks.map(task => (
          <div
            key={task.id}
            className="card-flat"
            style={{
              border: checked[task.id] ? '1px solid color-mix(in srgb, var(--lime) 60%, transparent)' : '1px solid var(--line)',
              padding: 12,
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: '22px 1fr',
              gap: 10,
              alignItems: 'start',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              title={checked[task.id] ? 'Mark as not done' : 'Mark as done'}
              style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            >
              <i
                className={'fa-solid ' + (checked[task.id] ? 'fa-circle-check' : 'fa-circle')}
                style={{ color: checked[task.id] ? 'var(--lime)' : 'var(--off-white-20)', marginTop: 2 }}
              />
            </button>
            <span>
              <span className="t-heading" style={{ display: 'block', fontSize: 13, lineHeight: 1.3 }}>{task.title}</span>
              <span className="t-body" style={{ display: 'block', fontSize: 11, color: 'var(--off-white-54)', marginTop: 4, lineHeight: 1.45 }}>{task.detail}</span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: task.status === 'admin' || task.href ? 8 : 0 }}>
                {task.status === 'admin' && (
                  <span className="status-pill status-in-progress">NEEDS ADMIN</span>
                )}
                {task.href && (
                  <a
                    className="status-pill"
                    href={task.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      textDecoration: 'none',
                      background: 'transparent',
                      border: '1px solid var(--off-white-40)',
                      color: 'var(--off-white)',
                    }}
                  >
                    <i className={'fa-solid ' + guideActionIcon(task.action)} style={{ marginRight: 5 }} />
                    {task.action || 'OPEN LINK'}
                  </a>
                )}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ExonautGuidePage });
