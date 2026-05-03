// Project management flow: Project Lead ownership, Track Lead / First Officer boards,
// roster submissions, review comments, and project point awards.
(function () {
  if (window.__projectStore) return;

  const listeners = new Set();
  let state = {
    projects: [],
    tasks: [],
    assignees: [],
    submissions: [],
    comments: [],
    activity: [],
    loaded: false,
    error: '',
  };

  const KANBAN_COLUMNS = [
    { id: 'backlog', label: 'Backlog', icon: 'fa-box-archive' },
    { id: 'assigned', label: 'To Do', icon: 'fa-list-check' },
    { id: 'in_progress', label: 'In Progress', icon: 'fa-spinner' },
    { id: 'submitted', label: 'Done', icon: 'fa-circle-check' },
    { id: 'approved', label: 'Approved', icon: 'fa-award' },
  ];

  const TASK_CLASSES = {
    critical: { label: 'CRITICAL', color: 'red', points: 2 },
    urgent: { label: 'URGENT', color: 'blue', points: 1 },
    important: { label: 'IMPORTANT', color: 'yellow', points: 3 },
  };

  const PROJECT_ROSTER_KEY = 'exo:project-rosters:v1';

  function loadProjectRosters() {
    try { return JSON.parse(localStorage.getItem(PROJECT_ROSTER_KEY) || '{}'); } catch { return {}; }
  }

  function saveProjectRosters(rosters) {
    try { localStorage.setItem(PROJECT_ROSTER_KEY, JSON.stringify(rosters)); } catch {}
  }

  function projectRoster(projectId) {
    return loadProjectRosters()[projectId] || [];
  }

  function setProjectRoster(projectId, userIds) {
    const rosters = loadProjectRosters();
    rosters[projectId] = [...new Set(userIds || [])];
    saveProjectRosters(rosters);
    notify();
  }

  function classifyTask({ urgent, important }) {
    if (urgent && important) return { key: 'critical', status: 'assigned', sortOrder: -1000, ...TASK_CLASSES.critical };
    if (urgent && !important) return { key: 'urgent', status: 'assigned', sortOrder: 0, ...TASK_CLASSES.urgent };
    return { key: 'important', status: 'backlog', sortOrder: 1000, ...TASK_CLASSES.important };
  }

  function deadlineState(task) {
    if (!task?.dueDate || task.status === 'approved') return 'On Track';
    const today = new Date().toISOString().slice(0, 10);
    if (['assigned', 'in_progress'].includes(task.status) && task.dueDate <= today) return 'Critical';
    if (task.status === 'backlog' && task.taskClass === 'important' && task.dueDate <= today) return 'Critical';
    if (task.status === 'backlog' && task.taskClass === 'important' && task.dueDate > today) return 'At Risk';
    return 'On Track';
  }

  function notify() {
    listeners.forEach(fn => fn());
  }

  function setState(patch) {
    state = { ...state, ...patch };
    notify();
  }

  function toProject(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      cohortId: row.cohort_id || 'c2627',
      trackCodes: row.track_codes || [],
      firstOfficerId: row.first_officer_id,
      status: row.status || 'draft',
      startDate: row.start_date || '',
      dueDate: row.due_date || '',
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toTask(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      brief: row.brief || '',
      trackCode: row.track_code,
      secondOfficerId: row.second_officer_id,
      trackLeadId: row.track_lead_id || row.second_officer_id,
      createdBy: row.created_by,
      status: row.status || 'assigned',
      priority: row.priority || row.task_class || 'important',
      urgent: !!row.urgent,
      important: row.important !== false,
      taskClass: row.task_class || row.priority || 'important',
      accountableId: row.accountable_id || null,
      consultedId: row.consulted_id || null,
      informedIds: row.informed_ids || [],
      deliverableType: row.deliverable_type || 'file',
      points: Number(row.points) || 2,
      dueDate: row.due_date || '',
      submittedNote: row.submitted_note || '',
      reviewNote: row.review_note || '',
      sortOrder: Number(row.sort_order || 0),
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toAssignee(row) {
    return {
      id: row.id,
      taskId: row.task_id,
      userId: row.user_id,
      assignedBy: row.assigned_by,
      status: row.status || 'assigned',
      createdAt: row.created_at,
    };
  }

  function toSubmission(row) {
    return {
      id: row.id,
      taskId: row.task_id,
      submittedBy: row.submitted_by,
      note: row.note || '',
      linkUrl: row.link_url || '',
      fileUrl: row.file_url || '',
      status: row.status || 'submitted',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toComment(row) {
    return {
      id: row.id,
      taskId: row.task_id,
      authorId: row.author_id,
      comment: row.comment || '',
      kind: row.kind || 'comment',
      createdAt: row.created_at,
    };
  }

  function toActivity(row) {
    return {
      id: row.id,
      taskId: row.task_id,
      actorId: row.actor_id,
      action: row.action,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }

  async function actorId() {
    if (!window.__db || !window.__db.auth) return localStorage.getItem('exo:userId') || null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || localStorage.getItem('exo:userId') || null;
  }

  function trackLeadForTrack(trackCode) {
    return window.__crownStore?.getActiveCrownForTrack(trackCode)?.userId || null;
  }

  async function logActivity(taskId, action, metadata = {}) {
    if (!window.__db) return;
    const actor = await actorId();
    const row = {
      id: 'pact-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      task_id: taskId,
      actor_id: actor,
      action,
      metadata,
    };
    await window.__db.from('project_task_activity').insert(row);
  }

  async function refresh() {
    if (!window.__db) {
      setState({ loaded: true, error: '' });
      return state;
    }
    try {
      const [projectsResult, tasksResult, assigneesResult, submissionsResult, commentsResult, activityResult] = await Promise.all([
        window.__db.from('projects').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_tasks').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        window.__db.from('project_task_assignees').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_submissions').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_comments').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_activity').select('*').order('created_at', { ascending: false }),
      ]);

      const error = projectsResult.error || tasksResult.error || assigneesResult.error || submissionsResult.error || commentsResult.error || activityResult.error;
      if (error) throw error;

      state = {
        projects: (projectsResult.data || []).map(toProject),
        tasks: (tasksResult.data || []).map(toTask),
        assignees: (assigneesResult.data || []).map(toAssignee),
        submissions: (submissionsResult.data || []).map(toSubmission),
        comments: (commentsResult.data || []).map(toComment),
        activity: (activityResult.data || []).map(toActivity),
        loaded: true,
        error: '',
      };
      notify();
    } catch (err) {
      console.warn('Could not load project management data:', err);
      setState({ loaded: true, error: err.message || 'Could not load project data.' });
    }
    return state;
  }

  async function upsertProject(data) {
    const createdBy = await actorId();
    const row = {
      id: data.id || 'proj-' + Date.now(),
      title: data.title || 'Untitled Project',
      description: data.description || '',
      cohort_id: data.cohortId || 'c2627',
      track_codes: data.trackCodes || [],
      first_officer_id: data.firstOfficerId,
      status: data.status || 'active',
      start_date: data.startDate || null,
      due_date: data.dueDate || null,
      created_by: createdBy,
    };
    const { error } = await window.__db.from('projects').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    await refresh();
  }

  async function saveTask(data) {
    const createdBy = await actorId();
    const classified = classifyTask({
      urgent: data.urgent !== undefined ? data.urgent : data.priority === 'critical' || data.priority === 'urgent',
      important: data.important !== undefined ? data.important : data.priority !== 'urgent',
    });
    const status = data.status || classified.status;
    const row = {
      id: data.id || 'ptask-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      project_id: data.projectId,
      title: data.title || 'Untitled task',
      brief: data.brief || '',
      track_code: data.trackCode,
      second_officer_id: data.trackLeadId || data.secondOfficerId || trackLeadForTrack(data.trackCode),
      track_lead_id: data.trackLeadId || data.secondOfficerId || trackLeadForTrack(data.trackCode),
      created_by: data.createdBy || createdBy,
      status,
      priority: classified.key,
      urgent: !!data.urgent,
      important: data.important !== false,
      task_class: classified.key,
      accountable_id: data.accountableId || null,
      consulted_id: data.consultedId || null,
      informed_ids: data.informedIds || [],
      deliverable_type: data.deliverableType || 'file',
      points: Number(data.points || classified.points),
      due_date: data.dueDate || null,
      sort_order: Number(data.sortOrder ?? classified.sortOrder),
    };
    const { error } = await window.__db.from('project_tasks').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    await logActivity(row.id, data.id ? 'task_updated' : 'task_created', {
      title: row.title,
      status: row.status,
      class: row.task_class,
      deadlineState: deadlineState(toTask(row)),
    });
    if (!data.id && row.task_class === 'critical' && data.responsibleId && window.__notifStore) {
      window.__notifStore.add({
        toUserId: data.responsibleId,
        type: 'project-task',
        title: 'CRITICAL TASK ASSIGNED',
        sub: `${row.title} needs acceptance ASAP.`,
        icon: 'fa-bolt',
      });
    }
    if (!data.id && data.consultedId && window.__notifStore) {
      window.__notifStore.add({
        toUserId: data.consultedId,
        type: 'project-feed',
        title: 'CONSULTED ON PROJECT TASK',
        sub: row.title,
        icon: 'fa-comments',
      });
    }
    await refresh();
    return row.id;
  }

  window.__projectStore = {
    KANBAN_COLUMNS,
    TASK_CLASSES,
    classifyTask,
    deadlineState,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state; },
    refresh,
    userIsFirstOfficer(userId) {
      return state.projects.some(p => p.firstOfficerId === userId && p.status !== 'archived');
    },
    firstOfficerProjects(userId) {
      return state.projects.filter(p => p.firstOfficerId === userId && p.status !== 'archived');
    },
    firstOfficerTasks(userId) {
      return state.tasks.filter(t => t.trackLeadId === userId || t.secondOfficerId === userId);
    },
    projectAccess(userId, projectId) {
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return 'none';
      if (project.firstOfficerId === userId) return 'first';
      if (state.tasks.some(t => t.projectId === projectId && (t.trackLeadId === userId || t.secondOfficerId === userId))) return 'track-lead';
      if (state.assignees.some(a => a.userId === userId && state.tasks.some(t => t.id === a.taskId && t.projectId === projectId))) return 'member';
      return 'none';
    },
    visibleProjects(profile) {
      if (!profile) return [];
      if (profile.role === 'admin' || profile.role === 'commander') return state.projects;
      return state.projects.filter(project => this.projectAccess(profile.id, project.id) !== 'none'
        || projectRoster(project.id).includes(profile.id)
        || project.trackCodes.includes(profile.trackCode));
    },
    async createProject(data) {
      await upsertProject(data);
      if (data.id || data.memberIds?.length) {
        setProjectRoster(data.id || state.projects[0]?.id, data.memberIds || []);
      }
    },
    projectRoster,
    setProjectRoster,
    async archiveProject(projectId) {
      const { error } = await window.__db.from('projects').update({ status: 'archived' }).eq('id', projectId);
      if (error) throw error;
      await refresh();
    },
    async saveTask(data) {
      return await saveTask(data);
    },
    async deleteTask(taskId) {
      const { error } = await window.__db.from('project_tasks').delete().eq('id', taskId);
      if (error) throw error;
      await refresh();
    },
    async assignTaskTeam(taskId, userIds) {
      const assignedBy = await actorId();
      const existing = state.assignees.filter(a => a.taskId === taskId);
      const removeIds = existing.filter(a => !(userIds || []).includes(a.userId)).map(a => a.id);
      if (removeIds.length) {
        const { error } = await window.__db.from('project_task_assignees').delete().in('id', removeIds);
        if (error) throw error;
      }
      const rows = (userIds || []).map(userId => ({
        id: 'passign-' + taskId + '-' + userId,
        task_id: taskId,
        user_id: userId,
        assigned_by: assignedBy,
        status: 'assigned',
      }));
      if (rows.length) {
        const { error } = await window.__db.from('project_task_assignees').upsert(rows, { onConflict: 'task_id,user_id' });
        if (error) throw error;
      }
      await logActivity(taskId, 'assignees_updated', { count: rows.length });
      await refresh();
    },
    async moveTask(taskId, status) {
      const patch = { status };
      if (status === 'approved') patch.completed_at = new Date().toISOString();
      const { error } = await window.__db.from('project_tasks').update(patch).eq('id', taskId);
      if (error) throw error;
      await logActivity(taskId, 'status_changed', { status });
      await refresh();
    },
    async submitTask({ taskId, note, linkUrl, fileUrl }) {
      const submittedBy = await actorId();
      const submission = {
        id: 'psub-' + taskId + '-' + submittedBy + '-' + Date.now(),
        task_id: taskId,
        submitted_by: submittedBy,
        note: note || '',
        link_url: linkUrl || '',
        file_url: fileUrl || '',
        status: 'submitted',
      };
      const [insertResult, taskResult] = await Promise.all([
        window.__db.from('project_task_submissions').insert(submission),
        window.__db.from('project_tasks').update({ status: 'submitted', submitted_note: note || '' }).eq('id', taskId),
      ]);
      if (insertResult.error || taskResult.error) throw insertResult.error || taskResult.error;
      await logActivity(taskId, 'submission_added', { submittedBy, hasFile: !!fileUrl, hasLink: !!linkUrl });
      await refresh();
    },
    async addComment(taskId, comment, kind = 'comment') {
      const authorId = await actorId();
      const row = {
        id: 'pcom-' + taskId + '-' + Date.now(),
        task_id: taskId,
        author_id: authorId,
        comment,
        kind,
      };
      const { error } = await window.__db.from('project_task_comments').insert(row);
      if (error) throw error;
      await logActivity(taskId, kind === 'revision' ? 'revision_requested' : 'comment_added', { comment });
      await refresh();
    },
    async requestRevision(taskId, comment) {
      const [commentResult, taskResult] = await Promise.all([
        this.addComment(taskId, comment, 'revision'),
        window.__db.from('project_tasks').update({ status: 'in_progress', review_note: comment }).eq('id', taskId),
      ]);
      if (commentResult?.error || taskResult.error) throw commentResult?.error || taskResult.error;
      await refresh();
    },
    async approveTask(taskId, note) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;
      const reviewer = await actorId();
      const assignees = state.assignees.filter(a => a.taskId === taskId);
      const recipients = assignees.length ? assignees.map(a => a.userId) : [task.trackLeadId || task.secondOfficerId].filter(Boolean);
      const [taskResult] = await Promise.all([
        window.__db.from('project_tasks').update({
          status: 'approved',
          review_note: note || 'Approved',
          completed_at: new Date().toISOString(),
        }).eq('id', taskId),
        note ? this.addComment(taskId, note, 'approval') : Promise.resolve(),
      ]);
      if (taskResult.error) throw taskResult.error;

      const rows = recipients.map(userId => ({
        id: 'pts-project-' + taskId + '-' + userId,
        user_id: userId,
        source_type: 'project',
        source_id: taskId,
        cohort_id: 'c2627',
        track_code: task.trackCode,
        pillar: 'missions',
        points: task.points,
        note: task.title,
        awarded_by: reviewer,
      }));
      if (rows.length) {
        const { error } = await window.__db.from('point_ledger').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      if (window.__pointsStore) {
        recipients.forEach(userId => {
          const exists = window.__pointsStore.getAll(userId).some(e => e.source === 'project.task' && e.ref === taskId);
          if (!exists) window.__pointsStore.add(userId, { source: 'project.task', pts: task.points, note: task.title, ref: taskId });
        });
      }
      await logActivity(taskId, 'approved', { recipients: recipients.length, points: task.points });
      await refresh();
    },
  };

  window.useProjects = function useProjects() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const unsub = window.__projectStore.subscribe(() => setTick(t => t + 1));
      if (!state.loaded) window.__projectStore.refresh();
      if (!window.__db) return unsub;
      const channel = window.__db
        .channel('project_management_realtime_' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_assignees' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_submissions' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_comments' }, refresh)
        .subscribe();
      return () => {
        unsub();
        if (window.__db && channel) window.__db.removeChannel(channel);
      };
    }, []);
    return window.__projectStore.all();
  };

  window.__projectStore.refresh();
})();

function ProjectBuilderPage() {
  const { profiles } = useUserProfiles();
  const { projects, tasks, loaded, error } = useProjects();
  useCrownState();
  const [draft, setDraft] = React.useState({ title: '', description: '', trackCodes: [], firstOfficerId: '', memberIds: [], startDate: '', dueDate: '' });
  const [saving, setSaving] = React.useState(false);
  const officers = profiles.filter(p => ['exonaut', 'lead', 'commander'].includes(p.role || 'exonaut'));
  const exonauts = profiles.filter(p => (p.role || 'exonaut') === 'exonaut');
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';

  function toggleTrack(code) {
    setDraft(d => ({ ...d, trackCodes: d.trackCodes.includes(code) ? d.trackCodes.filter(c => c !== code) : [...d.trackCodes, code] }));
  }

  async function createProject() {
    if (!draft.title.trim() || !draft.firstOfficerId || draft.trackCodes.length === 0) return;
    setSaving(true);
    try {
      const id = 'proj-' + Date.now();
      await window.__projectStore.createProject({ ...draft, id, title: draft.title.trim(), description: draft.description.trim(), status: 'active' });
      setDraft({ title: '', description: '', trackCodes: [], firstOfficerId: '', memberIds: [], startDate: '', dueDate: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>PLATFORM ADMIN · PROJECTS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Project Builder</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Create projects, assign a Project Lead, and open track boards for Track Leads / First Officers.</div>
        </div>
      </div>

      {error && <div className="card-panel" style={{ padding: 14, marginBottom: 14, color: 'var(--red)' }}>{error}</div>}
      <div className="project-admin-layout">
        <div className="card-panel project-form">
          <h2 className="t-heading" style={{ fontSize: 16, marginTop: 0 }}>Create Project</h2>
          <label className="t-label-muted">TITLE</label>
          <input className="input" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
          <label className="t-label-muted">DESCRIPTION</label>
          <textarea className="textarea" rows={4} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          <label className="t-label-muted">TRACKS</label>
          <div className="track-chip-row">
            {TRACKS.map(t => <button key={t.code} className={'lb-filter' + (draft.trackCodes.includes(t.code) ? ' active' : '')} onClick={() => toggleTrack(t.code)}>{t.short}</button>)}
          </div>
          <label className="t-label-muted">PROJECT LEAD</label>
          <select className="select" value={draft.firstOfficerId} onChange={e => setDraft(d => ({ ...d, firstOfficerId: e.target.value }))}>
            <option value="">Select officer</option>
            {officers.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
          </select>
          <label className="t-label-muted">PROJECT EXONAUTS</label>
          <select multiple className="select assignee-select" value={draft.memberIds} onChange={e => setDraft(d => ({ ...d, memberIds: Array.from(e.target.selectedOptions).map(o => o.value) }))}>
            {exonauts.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
          </select>
          <div className="project-date-grid">
            <input className="input" type="date" value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
            <input className="input" type="date" value={draft.dueDate} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
          </div>
          <button className="btn btn-primary" disabled={saving || !draft.title || !draft.firstOfficerId || !draft.trackCodes.length} onClick={createProject}>
            <i className="fa-solid fa-diagram-project" /> {saving ? 'Saving...' : 'Create Project'}
          </button>
        </div>

        <div>
          {!loaded && <div className="card-panel">Loading projects...</div>}
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const roster = window.__projectStore.projectRoster(project.id);
            return (
              <div key={project.id} className="card-panel project-summary-card">
                <div className="project-summary-main">
                  <div>
                    <div className="t-label" style={{ color: 'var(--sky)', marginBottom: 6 }}>{project.trackCodes.join(' · ')} · {project.status}</div>
                    <h2 className="t-heading project-title">{project.title}</h2>
                    <div className="t-body">{project.description || 'No description yet.'}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.__projectStore.archiveProject(project.id)}>Archive</button>
                </div>
                <div className="project-stat-grid">
                  <ProjectStat label="Project Lead" value={nameOf(project.firstOfficerId)} />
                  <ProjectStat label="Exonauts" value={roster.length} />
                  <ProjectStat label="Tasks" value={projectTasks.length} />
                  <ProjectStat label="Done" value={projectTasks.filter(t => t.status === 'submitted').length} />
                  <ProjectStat label="Approved" value={projectTasks.filter(t => t.status === 'approved').length} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProjectStat({ label, value }) {
  return (
    <div className="project-stat">
      <div className="t-mono">{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function ProjectWorkspacePage({ mode = 'member' }) {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { projects, tasks, assignees, submissions, comments, activity, error } = useProjects();
  useCrownState();
  const visibleProjects = window.__projectStore.visibleProjects(profile).filter(p => p.status !== 'archived');
  const [projectId, setProjectId] = React.useState('');
  const project = visibleProjects.find(p => p.id === projectId) || visibleProjects[0];
  const [trackCode, setTrackCode] = React.useState('');
  const projectAccess = project ? window.__projectStore.projectAccess(profile.id, project.id) : 'none';
  const officerTracks = project ? project.trackCodes.filter(code =>
    projectAccess === 'first'
    || profile.role === 'admin'
    || tasks.some(t => t.projectId === project.id && t.trackCode === code && (t.trackLeadId === profile.id || t.secondOfficerId === profile.id))
    || window.__crownStore?.getActiveCrownForTrack(code)?.userId === profile.id
  ) : [];
  const allowedTracks = project
    ? (profile.role === 'admin' || projectAccess === 'first'
      ? project.trackCodes
      : [...new Set([...officerTracks, project.trackCodes.includes(profile.trackCode) ? profile.trackCode : null].filter(Boolean))])
    : [];
  const activeTrack = allowedTracks.includes(trackCode) ? trackCode : (allowedTracks[0] || profile.trackCode || 'AIS');
  const projectTasks = tasks.filter(t => t.projectId === project?.id && t.trackCode === activeTrack);
  const access = projectAccess;
  const canOfficer = profile.role === 'admin'
    || access === 'first'
    || projectTasks.some(t => t.trackLeadId === profile.id || t.secondOfficerId === profile.id)
    || window.__crownStore?.getActiveCrownForTrack(activeTrack)?.userId === profile.id;
  const [selectedTaskId, setSelectedTaskId] = React.useState(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const modeLabel = mode === 'project-lead' ? 'PROJECT LEAD' : mode === 'first-officer' ? 'FIRST OFFICER' : 'ROSTER';

  React.useEffect(() => {
    if (project && !allowedTracks.includes(activeTrack)) setTrackCode(allowedTracks[0] || '');
  }, [project?.id]);

  if (!project) {
    return (
      <div className="enter">
        <div className="card-panel" style={{ padding: 36, textAlign: 'center' }}>No project boards available.</div>
      </div>
    );
  }

  return (
    <div className="enter">
      <div className="section-head project-workspace-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>PROJECTS · {modeLabel}</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{project.title}</h1>
          <div className="t-body" style={{ marginTop: 6 }}>{project.description || 'Track task board and submissions.'}</div>
        </div>
        <select className="select project-switcher" value={project.id} onChange={e => { setProjectId(e.target.value); setTrackCode(''); }}>
          {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {error && <div className="card-panel" style={{ padding: 14, marginBottom: 14, color: 'var(--red)' }}>{error}</div>}
      <div className="track-chip-row project-track-tabs">
        {allowedTracks.map(code => (
          <button key={code} className={'lb-filter' + (activeTrack === code ? ' active' : '')} onClick={() => setTrackCode(code)}>
            {TRACKS.find(t => t.code === code)?.short || code}
          </button>
        ))}
      </div>

      {canOfficer && <TaskComposer project={project} trackCode={activeTrack} profiles={profiles} />}
      <KanbanBoard
        tasks={projectTasks}
        profile={profile}
        profiles={profiles}
        assignees={assignees}
        canOfficer={canOfficer}
        onOpen={setSelectedTaskId}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          project={project}
          profile={profile}
          profiles={profiles}
          assignees={assignees.filter(a => a.taskId === selectedTask.id)}
          submissions={submissions.filter(s => s.taskId === selectedTask.id)}
          comments={comments.filter(c => c.taskId === selectedTask.id)}
          activity={activity.filter(a => a.taskId === selectedTask.id)}
          canOfficer={canOfficer}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}

function TaskComposer({ project, trackCode, profiles }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: '', brief: '', urgent: false, important: true, deliverableType: 'file', dueDate: '', responsibleId: '', consultedId: '' });
  const crown = window.__crownStore?.getActiveCrownForTrack(trackCode);
  const roster = profiles.filter(p => (p.role || 'exonaut') === 'exonaut' && (p.trackCode || 'AIS') === trackCode && (p.cohortId || 'c2627') === (project.cohortId || 'c2627'));
  const projectLead = profiles.find(p => p.id === project.firstOfficerId);
  const commander = profiles.find(p => p.role === 'commander') || { id: 'cmdr-01', fullName: 'Mission Commander' };

  async function save() {
    if (!draft.title.trim()) return;
    const taskId = await window.__projectStore.saveTask({
      projectId: project.id,
      trackCode,
      trackLeadId: crown?.userId,
      title: draft.title.trim(),
      brief: draft.brief.trim(),
      urgent: draft.urgent,
      important: draft.important,
      responsibleId: draft.responsibleId,
      accountableId: project.firstOfficerId,
      consultedId: draft.consultedId || null,
      informedIds: [commander.id, crown?.userId].filter(Boolean),
      deliverableType: draft.deliverableType,
      dueDate: draft.dueDate,
    });
    if (draft.responsibleId) await window.__projectStore.assignTaskTeam(taskId, [draft.responsibleId]);
    setDraft({ title: '', brief: '', urgent: false, important: true, deliverableType: 'file', dueDate: '', responsibleId: '', consultedId: '' });
    setOpen(false);
  }

  if (!open) {
    return <button className="btn btn-primary" onClick={() => setOpen(true)} style={{ marginBottom: 14 }}><i className="fa-solid fa-plus" /> Add Task</button>;
  }
  return (
    <div className="card-panel task-composer">
      <input className="input" placeholder="Task title" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
      <textarea className="textarea" placeholder="Brief, evidence needed, and expectations" value={draft.brief} onChange={e => setDraft(d => ({ ...d, brief: e.target.value }))} />
      <div className="task-composer-grid">
        <select className="select" value={draft.responsibleId} onChange={e => setDraft(d => ({ ...d, responsibleId: e.target.value }))}>
          <option value="">Responsible Exonaut</option>
          {roster.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
        </select>
        <select className="select" value={project.firstOfficerId} disabled>
          <option>{projectLead?.fullName || projectLead?.email || 'Project Lead'} accountable</option>
        </select>
        <select className="select" value={draft.consultedId} onChange={e => setDraft(d => ({ ...d, consultedId: e.target.value }))}>
          <option value="">Consulted person</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
        </select>
      </div>
      <div className="task-composer-grid">
        <label className="task-check"><input type="checkbox" checked={draft.urgent} onChange={e => setDraft(d => ({ ...d, urgent: e.target.checked }))} /> Urgent</label>
        <label className="task-check"><input type="checkbox" checked={draft.important} onChange={e => setDraft(d => ({ ...d, important: e.target.checked }))} /> Important</label>
        <select className="select" value={draft.deliverableType} onChange={e => setDraft(d => ({ ...d, deliverableType: e.target.value }))}>
          <option value="file">File</option>
          <option value="link">Link</option>
          <option value="note">Note</option>
        </select>
        <input className="input" type="date" value={draft.dueDate} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
      </div>
      <div className="task-composer-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>Save Task</button>
      </div>
    </div>
  );
}

function KanbanBoard({ tasks, profile, profiles, assignees, canOfficer, onOpen }) {
  function canMove(task, status) {
    if (canOfficer) return true;
    const isAssigned = assignees.some(a => a.taskId === task.id && a.userId === profile.id);
    return isAssigned && ['in_progress', 'submitted'].includes(status);
  }

  return (
    <div className="kanban-board">
      {window.__projectStore.KANBAN_COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id).sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
        return (
          <div key={col.id} className="kanban-column" onDragOver={e => e.preventDefault()} onDrop={e => {
            const taskId = e.dataTransfer.getData('text/plain');
            const task = tasks.find(t => t.id === taskId);
            if (task && canMove(task, col.id)) window.__projectStore.moveTask(taskId, col.id);
          }}>
            <div className="kanban-column-head">
              <span><i className={'fa-solid ' + col.icon} /> {col.label}</span>
              <strong>{colTasks.length}</strong>
            </div>
            <div className="kanban-card-stack">
              {colTasks.map(task => {
                const team = assignees.filter(a => a.taskId === task.id);
                return (
                  <div key={task.id} className={'kanban-card task-' + task.taskClass} draggable={canOfficer || team.some(a => a.userId === profile.id)} onDragStart={e => e.dataTransfer.setData('text/plain', task.id)} onClick={() => onOpen(task.id)}>
                    <div className="kanban-card-title">{task.title}</div>
                    <div className="kanban-card-brief">{task.brief || 'No brief.'}</div>
                    <div className="kanban-card-meta">
                      <span>{window.__projectStore.TASK_CLASSES[task.taskClass]?.label || task.taskClass}</span>
                      <span>{window.__projectStore.deadlineState(task)}</span>
                      <span>{team.length} assigned</span>
                      {task.dueDate && <span>{task.dueDate}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskDetailModal({ task, project, profile, profiles, assignees, submissions, comments, activity, canOfficer, onClose }) {
  const roster = profiles.filter(p => (p.role || 'exonaut') === 'exonaut' && (p.trackCode || 'AIS') === task.trackCode && (p.cohortId || 'c2627') === (project.cohortId || 'c2627'));
  const [team, setTeam] = React.useState(assignees.map(a => a.userId));
  const [submission, setSubmission] = React.useState({ note: '', linkUrl: '', fileUrl: '' });
  const [review, setReview] = React.useState('');
  const [edit, setEdit] = React.useState({ title: task.title, brief: task.brief, urgent: !!task.urgent, important: task.important !== false, dueDate: task.dueDate || '', deliverableType: task.deliverableType });
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unknown';
  const isAssigned = assignees.some(a => a.userId === profile.id);

  async function saveTask() {
    await window.__projectStore.saveTask({ ...task, ...edit, id: task.id, projectId: task.projectId, trackCode: task.trackCode, trackLeadId: task.trackLeadId || task.secondOfficerId });
  }

  async function submitWork() {
    await window.__projectStore.submitTask({ taskId: task.id, ...submission });
    setSubmission({ note: '', linkUrl: '', fileUrl: '' });
  }

  function attachFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSubmission(d => ({ ...d, fileUrl: reader.result || file.name }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="task-modal card-panel" onClick={e => e.stopPropagation()}>
        <div className="task-modal-head">
          <div>
            <div className="t-label" style={{ color: 'var(--platinum)', marginBottom: 6 }}>{TRACKS.find(t => t.code === task.trackCode)?.short || task.trackCode} · {task.status}</div>
            <h2 className="t-title">{task.title}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="task-modal-grid">
          <div className="task-main-pane">
            {canOfficer ? (
              <div className="task-section">
                <div className="t-label-muted">TASK DETAILS</div>
                <input className="input" value={edit.title} onChange={e => setEdit(d => ({ ...d, title: e.target.value }))} />
                <textarea className="textarea" value={edit.brief} onChange={e => setEdit(d => ({ ...d, brief: e.target.value }))} />
                <div className="task-composer-grid">
                  <label className="task-check"><input type="checkbox" checked={edit.urgent} onChange={e => setEdit(d => ({ ...d, urgent: e.target.checked }))} /> Urgent</label>
                  <label className="task-check"><input type="checkbox" checked={edit.important} onChange={e => setEdit(d => ({ ...d, important: e.target.checked }))} /> Important</label>
                  <select className="select" value={edit.deliverableType} onChange={e => setEdit(d => ({ ...d, deliverableType: e.target.value }))}><option value="file">File</option><option value="link">Link</option><option value="note">Note</option></select>
                  <input className="input" type="date" value={edit.dueDate} onChange={e => setEdit(d => ({ ...d, dueDate: e.target.value }))} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={saveTask}>Save Changes</button>
              </div>
            ) : (
              <div className="task-section">
                <div className="t-body">{task.brief || 'No brief provided.'}</div>
              </div>
            )}

            <div className="task-section">
              <div className="t-label-muted">SUBMISSIONS</div>
              {submissions.length === 0 && <div className="empty-line">No submissions yet.</div>}
              {submissions.map(s => (
                <div key={s.id} className="submission-row">
                  <strong>{nameOf(s.submittedBy)}</strong>
                  <p>{s.note || 'No note.'}</p>
                  {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noreferrer">{s.linkUrl}</a>}
                  {s.fileUrl && <a href={s.fileUrl} target="_blank" rel="noreferrer">Open file</a>}
                </div>
              ))}
              {isAssigned && (
                <div className="submission-form">
                  <textarea className="textarea" placeholder="Submission note" value={submission.note} onChange={e => setSubmission(d => ({ ...d, note: e.target.value }))} />
                  <input className="input" placeholder="Link URL" value={submission.linkUrl} onChange={e => setSubmission(d => ({ ...d, linkUrl: e.target.value }))} />
                  <input className="input" placeholder="File URL or uploaded file link" value={submission.fileUrl} onChange={e => setSubmission(d => ({ ...d, fileUrl: e.target.value }))} />
                  <input className="input" type="file" onChange={e => attachFile(e.target.files && e.target.files[0])} />
                  <button className="btn btn-primary btn-sm" onClick={submitWork}>Submit Work</button>
                </div>
              )}
            </div>
          </div>

          <div className="task-side-pane">
            <div className="task-section">
              <div className="t-label-muted">RACI</div>
              <div className="name-stack">
                <span>Responsible: {assignees.map(a => nameOf(a.userId)).join(', ') || 'Unassigned'}</span>
                <span>Accountable: {nameOf(task.accountableId || project.firstOfficerId)}</span>
                <span>Consulted: {task.consultedId ? nameOf(task.consultedId) : 'As needed'}</span>
                <span>Informed: Mission Commander{task.trackLeadId || task.secondOfficerId ? ' · Track Lead' : ''}</span>
              </div>
            </div>

            <div className="task-section">
              <div className="t-label-muted">ASSIGNEES</div>
              {canOfficer ? (
                <>
                  <select multiple className="select assignee-select" value={team} onChange={e => setTeam(Array.from(e.target.selectedOptions).map(o => o.value))}>
                    {roster.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.__projectStore.assignTaskTeam(task.id, team)}>Update Assignees</button>
                </>
              ) : (
                <div className="name-stack">{assignees.map(a => <span key={a.id}>{nameOf(a.userId)}</span>)}</div>
              )}
            </div>

            {canOfficer && (
              <div className="task-section">
                <div className="t-label-muted">REVIEW</div>
                <textarea className="textarea" placeholder="Approval or revision comment" value={review} onChange={e => setReview(e.target.value)} />
                <div className="review-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => window.__projectStore.approveTask(task.id, review || 'Approved')}>Approve +{task.points}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.__projectStore.requestRevision(task.id, review || 'Needs revision')}>Request Revision</button>
                </div>
              </div>
            )}

            <div className="task-section">
              <div className="t-label-muted">COMMENTS</div>
              {comments.length === 0 && <div className="empty-line">No comments yet.</div>}
              {comments.map(c => <div key={c.id} className={'comment-row ' + c.kind}><strong>{nameOf(c.authorId)}</strong><p>{c.comment}</p></div>)}
            </div>

            <div className="task-section">
              <div className="t-label-muted">ACTIVITY</div>
              {activity.slice(0, 8).map(a => <div key={a.id} className="activity-row">{a.action.replaceAll('_', ' ')}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProjectBuilderPage, ProjectWorkspacePage });
