// Project management flow: First Officer ownership, Second Officer track boards,
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
    delegations: [],
    loaded: false,
    error: '',
  };

  const KANBAN_COLUMNS = [
    { id: 'assigned', label: 'To Do', icon: 'fa-list-check' },
    { id: 'in_progress', label: 'In Progress', icon: 'fa-spinner' },
    { id: 'submitted', label: 'Done', icon: 'fa-circle-check' },
    { id: 'approved', label: 'Approved', icon: 'fa-award' },
  ];

  const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

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
      createdBy: row.created_by,
      status: row.status || 'assigned',
      priority: row.priority || 'medium',
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

  function toDelegation(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      trackCode: row.track_code,
      firstOfficerId: row.first_officer_id,
      secondOfficerId: row.second_officer_id,
      title: row.title,
      instructions: row.instructions || '',
      expectedOutput: row.expected_output || '',
      priority: row.priority || 'medium',
      status: row.status || 'draft',
      dueDate: row.due_date || '',
      notes: row.notes || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function actorId() {
    if (!window.__db || !window.__db.auth) return localStorage.getItem('exo:userId') || null;
    const session = await window.__db.auth.getSession();
    return session?.data?.session?.user?.id || localStorage.getItem('exo:userId') || null;
  }

  function secondOfficerForTrack(trackCode) {
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
      const [projectsResult, tasksResult, assigneesResult, submissionsResult, commentsResult, activityResult, delegationsResult] = await Promise.all([
        window.__db.from('projects').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_tasks').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        window.__db.from('project_task_assignees').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_submissions').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_comments').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_activity').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_delegations').select('*').order('created_at', { ascending: false }),
      ]);

      const error = projectsResult.error || tasksResult.error || assigneesResult.error || submissionsResult.error || commentsResult.error || activityResult.error || delegationsResult.error;
      if (error) throw error;

      state = {
        projects: (projectsResult.data || []).map(toProject),
        tasks: (tasksResult.data || []).map(toTask),
        assignees: (assigneesResult.data || []).map(toAssignee),
        submissions: (submissionsResult.data || []).map(toSubmission),
        comments: (commentsResult.data || []).map(toComment),
        activity: (activityResult.data || []).map(toActivity),
        delegations: (delegationsResult.data || []).map(toDelegation),
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
    const row = {
      id: data.id || 'ptask-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      project_id: data.projectId,
      title: data.title || 'Untitled task',
      brief: data.brief || '',
      track_code: data.trackCode,
      second_officer_id: data.secondOfficerId || secondOfficerForTrack(data.trackCode),
      created_by: data.createdBy || createdBy,
      status: data.status || 'assigned',
      priority: data.priority || 'medium',
      deliverable_type: data.deliverableType || 'file',
      points: Number(data.points || 2),
      due_date: data.dueDate || null,
      sort_order: Number(data.sortOrder || 0),
    };
    const { error } = await window.__db.from('project_tasks').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    await logActivity(row.id, data.id ? 'task_updated' : 'task_created', { title: row.title, status: row.status });
    await refresh();
  }

  window.__projectStore = {
    KANBAN_COLUMNS,
    PRIORITIES,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state; },
    refresh,
    userIsFirstOfficer(userId) {
      return state.projects.some(p => p.firstOfficerId === userId && p.status !== 'archived');
    },
    firstOfficerProjects(userId) {
      return state.projects.filter(p => p.firstOfficerId === userId && p.status !== 'archived');
    },
    secondOfficerTasks(userId) {
      return state.tasks.filter(t => t.secondOfficerId === userId);
    },
    userIsSecondOfficer(userId) {
      return state.delegations.some(d => d.secondOfficerId === userId && d.status !== 'completed')
        || state.tasks.some(t => t.secondOfficerId === userId && t.status !== 'approved');
    },
    visibleDelegations(profile) {
      if (!profile) return [];
      if (profile.role === 'admin' || profile.role === 'commander') return state.delegations;
      return state.delegations.filter(d => d.firstOfficerId === profile.id || d.secondOfficerId === profile.id);
    },
    projectAccess(userId, projectId) {
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return 'none';
      if (project.firstOfficerId === userId) return 'first';
      if (state.delegations.some(d => d.projectId === projectId && d.secondOfficerId === userId)) return 'second';
      if (state.tasks.some(t => t.projectId === projectId && t.secondOfficerId === userId)) return 'second';
      if (state.assignees.some(a => a.userId === userId && state.tasks.some(t => t.id === a.taskId && t.projectId === projectId))) return 'member';
      return 'none';
    },
    visibleProjects(profile) {
      if (!profile) return [];
      if (profile.role === 'admin' || profile.role === 'commander') return state.projects;
      return state.projects.filter(project => this.projectAccess(profile.id, project.id) !== 'none'
        || project.trackCodes.includes(profile.trackCode));
    },
    secondOfficerForTrack,
    async createProject(data) {
      await upsertProject(data);
    },
    async archiveProject(projectId) {
      const { error } = await window.__db.from('projects').update({ status: 'archived' }).eq('id', projectId);
      if (error) throw error;
      await refresh();
    },
    async saveTask(data) {
      await saveTask(data);
    },
    async saveDelegation(data) {
      const actor = await actorId();
      const row = {
        id: data.id || 'pdel-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        project_id: data.projectId,
        track_code: data.trackCode,
        first_officer_id: data.firstOfficerId || actor,
        second_officer_id: data.secondOfficerId || secondOfficerForTrack(data.trackCode),
        title: data.title || 'Untitled delegation',
        instructions: data.instructions || '',
        expected_output: data.expectedOutput || '',
        priority: data.priority || 'medium',
        status: data.status || 'delegated',
        due_date: data.dueDate || null,
        notes: data.notes || '',
      };
      const { error } = await window.__db.from('project_delegations').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      await refresh();
    },
    async deleteDelegation(id) {
      const { error } = await window.__db.from('project_delegations').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    },
    async acknowledgeDelegation(id) {
      const { error } = await window.__db.from('project_delegations').update({ status: 'acknowledged' }).eq('id', id);
      if (error) throw error;
      await refresh();
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
      const recipients = assignees.length ? assignees.map(a => a.userId) : [task.secondOfficerId].filter(Boolean);
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
        pillar: 'project',
        points: task.points,
        note: task.title,
        awarded_by: reviewer,
      }));
      if (rows.length) {
        const { error } = await window.__db.from('point_ledger').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_delegations' }, refresh)
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
  const [draft, setDraft] = React.useState({ title: '', description: '', trackCodes: [], firstOfficerId: '', startDate: '', dueDate: '' });
  const [saving, setSaving] = React.useState(false);
  const officers = profiles.filter(p => ['exonaut', 'lead', 'commander'].includes(p.role || 'exonaut'));
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';

  function toggleTrack(code) {
    setDraft(d => ({ ...d, trackCodes: d.trackCodes.includes(code) ? d.trackCodes.filter(c => c !== code) : [...d.trackCodes, code] }));
  }

  async function createProject() {
    if (!draft.title.trim() || !draft.firstOfficerId || draft.trackCodes.length === 0) return;
    setSaving(true);
    try {
      await window.__projectStore.createProject({ ...draft, title: draft.title.trim(), description: draft.description.trim(), status: 'active' });
      setDraft({ title: '', description: '', trackCodes: [], firstOfficerId: '', startDate: '', dueDate: '' });
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
          <div className="t-body" style={{ marginTop: 6 }}>Create projects, assign a First Officer, and open track boards for Second Officers.</div>
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
          <label className="t-label-muted">FIRST OFFICER</label>
          <select className="select" value={draft.firstOfficerId} onChange={e => setDraft(d => ({ ...d, firstOfficerId: e.target.value }))}>
            <option value="">Select officer</option>
            {officers.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
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
                  <ProjectStat label="First Officer" value={nameOf(project.firstOfficerId)} />
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
    || tasks.some(t => t.projectId === project.id && t.trackCode === code && t.secondOfficerId === profile.id)
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
    || projectTasks.some(t => t.secondOfficerId === profile.id)
    || window.__crownStore?.getActiveCrownForTrack(activeTrack)?.userId === profile.id;
  const [selectedTaskId, setSelectedTaskId] = React.useState(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

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
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>PROJECTS · {mode === 'first' ? 'FIRST OFFICER' : mode === 'second' ? 'SECOND OFFICER' : 'ROSTER'}</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{project.title}</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            {mode === 'first' ? 'Choose a project and track to inspect or manage its execution board.' : (project.description || 'Track task board and submissions.')}
          </div>
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
  const [draft, setDraft] = React.useState({ title: '', brief: '', priority: 'medium', deliverableType: 'file', dueDate: '' });
  const crown = window.__crownStore?.getActiveCrownForTrack(trackCode);

  async function save() {
    if (!draft.title.trim()) return;
    await window.__projectStore.saveTask({
      projectId: project.id,
      trackCode,
      secondOfficerId: crown?.userId,
      title: draft.title.trim(),
      brief: draft.brief.trim(),
      priority: draft.priority,
      deliverableType: draft.deliverableType,
      dueDate: draft.dueDate,
    });
    setDraft({ title: '', brief: '', priority: 'medium', deliverableType: 'file', dueDate: '' });
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
        <select className="select" value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}>
          {window.__projectStore.PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
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
        const colTasks = tasks.filter(t => t.status === col.id);
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
                  <div key={task.id} className={'kanban-card priority-' + task.priority} draggable={canOfficer || team.some(a => a.userId === profile.id)} onDragStart={e => e.dataTransfer.setData('text/plain', task.id)} onClick={() => onOpen(task.id)}>
                    <div className="kanban-card-title">{task.title}</div>
                    <div className="kanban-card-brief">{task.brief || 'No brief.'}</div>
                    <div className="kanban-card-meta">
                      <span>{task.priority}</span>
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
  const [edit, setEdit] = React.useState({ title: task.title, brief: task.brief, priority: task.priority, dueDate: task.dueDate || '', deliverableType: task.deliverableType });
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unknown';
  const isAssigned = assignees.some(a => a.userId === profile.id);

  async function saveTask() {
    await window.__projectStore.saveTask({ ...task, ...edit, id: task.id, projectId: task.projectId, trackCode: task.trackCode });
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
                  <select className="select" value={edit.priority} onChange={e => setEdit(d => ({ ...d, priority: e.target.value }))}>{window.__projectStore.PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
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
                  <button className="btn btn-primary btn-sm" onClick={() => window.__projectStore.approveTask(task.id, review || 'Approved')}>Approve +2</button>
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

function ProjectsPage() {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { projects, delegations, loaded, error } = useProjects();
  useCrownState();
  const [selectedId, setSelectedId] = React.useState(null);
  const visible = window.__projectStore.visibleProjects(profile).filter(p => p.status !== 'archived');
  const selected = visible.find(p => p.id === selectedId);
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  const trackName = code => TRACKS.find(t => t.code === code)?.short || code;

  function secondOfficerName(project, trackCode) {
    const explicit = delegations.find(d => d.projectId === project.id && d.trackCode === trackCode)?.secondOfficerId;
    const crown = window.__crownStore?.getActiveCrownForTrack(trackCode)?.userId;
    return nameOf(explicit || crown);
  }

  if (selected) {
    const access = window.__projectStore.projectAccess(profile.id, selected.id);
    const visibleTracks = profile.role === 'admin' || access === 'first'
      ? selected.trackCodes
      : selected.trackCodes.filter(code => code === profile.trackCode || delegations.some(d => d.projectId === selected.id && d.trackCode === code && d.secondOfficerId === profile.id));
    return (
      <div className="enter">
        <div className="section-head">
          <div>
            <div className="t-label" style={{ marginBottom: 8, color: 'var(--lime)' }}>PROJECT DETAIL</div>
            <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{selected.title}</h1>
            <div className="t-body" style={{ marginTop: 6 }}>{selected.description || 'No project description provided.'}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => setSelectedId(null)}><i className="fa-solid fa-arrow-left" /> Projects</button>
        </div>

        <div className="project-detail-grid">
          <ProjectInfoTile label="Status" value={selected.status} />
          <ProjectInfoTile label="Cohort" value={selected.cohortId} />
          <ProjectInfoTile label="First Officer" value={nameOf(selected.firstOfficerId)} />
          <ProjectInfoTile label="Due Date" value={selected.dueDate || 'Not set'} />
        </div>

        <div className="card-panel" style={{ padding: 20 }}>
          <div className="t-label" style={{ marginBottom: 12 }}>ASSIGNED TRACKS</div>
          <div className="project-track-detail-list">
            {visibleTracks.map(code => {
              const trackDelegations = delegations.filter(d => d.projectId === selected.id && d.trackCode === code);
              return (
                <div key={code} className="project-track-detail">
                  <div>
                    <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0 }}>{trackName(code)}</div>
                    <div className="t-body" style={{ fontSize: 12, marginTop: 4 }}>Second Officer: {secondOfficerName(selected, code)}</div>
                  </div>
                  <span className="status-pill status-submitted">{trackDelegations.length} delegation{trackDelegations.length === 1 ? '' : 's'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--lime)' }}>PROJECTS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Projects</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Projects assigned to your role or track.</div>
        </div>
      </div>
      {error && <div className="card-panel" style={{ padding: 14, marginBottom: 14, color: 'var(--red)' }}>{error}</div>}
      {!loaded && <div className="card-panel" style={{ padding: 28 }}>Loading projects...</div>}
      {visible.length === 0 && loaded && <div className="card-panel" style={{ padding: 36, textAlign: 'center' }}>No assigned projects yet.</div>}
      <div className="project-card-grid">
        {visible.map(project => (
          <button key={project.id} className="project-card-button" onClick={() => setSelectedId(project.id)}>
            <div className="t-label" style={{ color: 'var(--lime)', marginBottom: 8 }}>{project.status} · {project.trackCodes.map(trackName).join(' · ')}</div>
            <h2>{project.title}</h2>
            <p>{project.description || 'Open project details.'}</p>
            <div className="project-card-meta">
              <span><i className="fa-solid fa-user-tie" /> {nameOf(project.firstOfficerId)}</span>
              <span><i className="fa-solid fa-calendar" /> {project.dueDate || 'No due date'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectInfoTile({ label, value }) {
  return (
    <div className="project-info-tile">
      <div className="t-mono">{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function FirstOfficerDelegationsPage() {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { projects, delegations } = useProjects();
  useCrownState();
  const myProjects = projects.filter(p => p.firstOfficerId === profile.id && p.status !== 'archived');
  const [draft, setDraft] = React.useState({ projectId: '', trackCode: '', title: '', instructions: '', expectedOutput: '', priority: 'medium', dueDate: '', notes: '', status: 'delegated' });
  const [editing, setEditing] = React.useState(null);
  const [error, setError] = React.useState('');
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  const project = myProjects.find(p => p.id === draft.projectId) || myProjects[0];
  const availableTracks = project?.trackCodes || [];

  React.useEffect(() => {
    if (!draft.projectId && myProjects[0]) setDraft(d => ({ ...d, projectId: myProjects[0].id, trackCode: myProjects[0].trackCodes[0] || '' }));
  }, [myProjects.length]);

  function editDelegation(d) {
    setEditing(d.id);
    setDraft({
      projectId: d.projectId,
      trackCode: d.trackCode,
      title: d.title,
      instructions: d.instructions,
      expectedOutput: d.expectedOutput,
      priority: d.priority,
      dueDate: d.dueDate || '',
      notes: d.notes || '',
      status: d.status,
    });
  }

  async function save() {
    setError('');
    if (!draft.projectId || !draft.trackCode || !draft.title.trim()) {
      setError('Project, track, and title are required.');
      return;
    }
    try {
      await window.__projectStore.saveDelegation({
        id: editing,
        ...draft,
        firstOfficerId: profile.id,
        secondOfficerId: window.__projectStore.secondOfficerForTrack(draft.trackCode),
      });
      setEditing(null);
      setDraft(d => ({ projectId: d.projectId, trackCode: d.trackCode, title: '', instructions: '', expectedOutput: '', priority: 'medium', dueDate: '', notes: '', status: 'delegated' }));
    } catch (err) {
      setError(err.message || 'Could not save delegation.');
    }
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--lime)' }}>FIRST OFFICER · DELEGATIONS</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Delegations</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Create detailed briefs for Second Officers before work is broken down into project tasks.</div>
        </div>
      </div>

      {myProjects.length === 0 && <div className="card-panel" style={{ padding: 36, textAlign: 'center' }}>No First Officer projects assigned.</div>}
      {myProjects.length > 0 && (
        <div className="delegation-layout">
          <div className="card-panel delegation-form">
            <h2 className="t-heading" style={{ fontSize: 16, marginTop: 0 }}>{editing ? 'Edit Brief' : 'New Brief'}</h2>
            {error && <div className="t-body" style={{ color: 'var(--red)' }}>{error}</div>}
            <select className="select" value={draft.projectId} onChange={e => {
              const next = myProjects.find(p => p.id === e.target.value);
              setDraft(d => ({ ...d, projectId: e.target.value, trackCode: next?.trackCodes?.[0] || '' }));
            }}>
              {myProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <select className="select" value={draft.trackCode} onChange={e => setDraft(d => ({ ...d, trackCode: e.target.value }))}>
              {availableTracks.map(code => <option key={code} value={code}>{TRACKS.find(t => t.code === code)?.short || code} · {nameOf(window.__projectStore.secondOfficerForTrack(code))}</option>)}
            </select>
            <input className="input" placeholder="Delegation title" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
            <textarea className="textarea" placeholder="Detailed instructions" value={draft.instructions} onChange={e => setDraft(d => ({ ...d, instructions: e.target.value }))} />
            <textarea className="textarea" placeholder="Expected output" value={draft.expectedOutput} onChange={e => setDraft(d => ({ ...d, expectedOutput: e.target.value }))} />
            <div className="task-composer-grid">
              <select className="select" value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}>{window.__projectStore.PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
              <select className="select" value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>{['draft', 'delegated', 'acknowledged', 'in_progress', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input className="input" type="date" value={draft.dueDate} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
            </div>
            <textarea className="textarea" placeholder="Notes" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
            <div className="task-composer-actions">
              {editing && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel Edit</button>}
              <button className="btn btn-primary btn-sm" onClick={save}>Save Delegation</button>
            </div>
          </div>

          <div className="delegation-list">
            {delegations.filter(d => d.firstOfficerId === profile.id).map(d => (
              <DelegationCard key={d.id} delegation={d} profiles={profiles} projects={projects} onEdit={() => editDelegation(d)} onDelete={() => window.__projectStore.deleteDelegation(d.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SecondOfficerDelegationInboxPage() {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { projects, delegations } = useProjects();
  const [selectedId, setSelectedId] = React.useState(null);
  const inbox = delegations.filter(d => d.secondOfficerId === profile.id);
  const selected = inbox.find(d => d.id === selectedId);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>SECOND OFFICER · INBOX</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Delegation Inbox</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Read First Officer briefs, then distribute work on Project Tasks.</div>
        </div>
      </div>

      {selected ? (
        <DelegationDetail delegation={selected} profiles={profiles} projects={projects} onBack={() => setSelectedId(null)} />
      ) : (
        <>
          {inbox.length === 0 && <div className="card-panel" style={{ padding: 36, textAlign: 'center' }}>No delegation briefs assigned yet.</div>}
          <div className="project-card-grid">
            {inbox.map(d => <DelegationCard key={d.id} delegation={d} profiles={profiles} projects={projects} onOpen={() => setSelectedId(d.id)} onAcknowledge={() => window.__projectStore.acknowledgeDelegation(d.id)} />)}
          </div>
        </>
      )}
    </div>
  );
}

function DelegationCard({ delegation, profiles, projects, onOpen, onEdit, onDelete, onAcknowledge }) {
  const project = projects.find(p => p.id === delegation.projectId);
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  return (
    <div className={'delegation-card priority-' + delegation.priority} onClick={onOpen}>
      <div className="delegation-card-head">
        <span className="status-pill status-submitted">{delegation.status}</span>
        <span>{delegation.priority}</span>
      </div>
      <h2>{delegation.title}</h2>
      <p>{project?.title || 'Project'} · {TRACKS.find(t => t.code === delegation.trackCode)?.short || delegation.trackCode}</p>
      <div className="project-card-meta">
        <span><i className="fa-solid fa-user-tie" /> {nameOf(delegation.firstOfficerId)}</span>
        <span><i className="fa-solid fa-calendar" /> {delegation.dueDate || 'No due date'}</span>
      </div>
      {(onEdit || onDelete || onAcknowledge) && (
        <div className="delegation-card-actions" onClick={e => e.stopPropagation()}>
          {onAcknowledge && delegation.status === 'delegated' && <button className="btn btn-primary btn-sm" onClick={onAcknowledge}>Acknowledge</button>}
          {onEdit && <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>}
          {onDelete && <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>}
        </div>
      )}
    </div>
  );
}

function DelegationDetail({ delegation, profiles, projects, onBack }) {
  const project = projects.find(p => p.id === delegation.projectId);
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  return (
    <div className="card-panel delegation-detail">
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="t-label" style={{ color: 'var(--platinum)', marginBottom: 8 }}>{project?.title || 'Project'} · {TRACKS.find(t => t.code === delegation.trackCode)?.short || delegation.trackCode}</div>
          <h2 className="t-title" style={{ fontSize: 28, margin: 0 }}>{delegation.title}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>Back</button>
      </div>
      <div className="project-detail-grid">
        <ProjectInfoTile label="First Officer" value={nameOf(delegation.firstOfficerId)} />
        <ProjectInfoTile label="Priority" value={delegation.priority} />
        <ProjectInfoTile label="Status" value={delegation.status} />
        <ProjectInfoTile label="Due Date" value={delegation.dueDate || 'Not set'} />
      </div>
      <div className="task-section">
        <div className="t-label-muted">DETAILED INSTRUCTIONS</div>
        <div className="t-body">{delegation.instructions || 'No instructions provided.'}</div>
      </div>
      <div className="task-section">
        <div className="t-label-muted">EXPECTED OUTPUT</div>
        <div className="t-body">{delegation.expectedOutput || 'No expected output provided.'}</div>
      </div>
      <div className="task-section">
        <div className="t-label-muted">NOTES</div>
        <div className="t-body">{delegation.notes || 'No notes.'}</div>
      </div>
    </div>
  );
}

function FirstOfficerProjectsPage() {
  return <FirstOfficerDelegationsPage />;
}

function ProjectTasksPage() {
  const { profile } = useCurrentUserProfile();
  const isFirstOfficer = window.__projectStore.userIsFirstOfficer(profile.id);
  return <ProjectWorkspacePage mode={isFirstOfficer ? 'first' : 'second'} />;
}

function CertificatesBadgesPage() {
  const { profile } = useCurrentUserProfile();
  const { total, breakdown } = useUserPoints(profile.id);
  const liveBadges = useLiveBadges(profile.id);
  const next = MILESTONES.find(m => total < m.at);
  const certificateReady = total >= 900;
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>EXONAUT · CERTIFICATES & BADGES</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Credentials</h1>
          <div className="t-body" style={{ marginTop: 6 }}>Track your certificate status, badge progress, and approved point total.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18, marginBottom: 20 }}>
        <div className="card-panel" style={{ padding: 24 }}>
          <div className="t-label" style={{ color: certificateReady ? 'var(--lime)' : 'var(--off-white-40)', marginBottom: 10 }}>CERTIFICATE STATUS</div>
          <h2 className="t-title" style={{ fontSize: 28, margin: 0 }}>{certificateReady ? 'Ready for Issue' : 'In Progress'}</h2>
          <div className="t-body" style={{ marginTop: 8 }}>{certificateReady ? 'You have reached the certificate threshold.' : `${Math.max(0, 900 - total)} points until certificate eligibility.`}</div>
          <div style={{ height: 8, background: 'var(--off-white-07)', borderRadius: 4, overflow: 'hidden', marginTop: 18 }}>
            <div style={{ width: Math.min(100, total / 900 * 100) + '%', height: '100%', background: 'var(--lime)' }} />
          </div>
        </div>
        <div className="card-panel" style={{ padding: 24 }}>
          <div className="t-label" style={{ marginBottom: 10 }}>POINTS SOURCE</div>
          <div className="t-title" style={{ fontSize: 34, margin: 0 }}>{total}</div>
          <div className="t-body" style={{ marginTop: 8 }}>Approved mission and project points only.</div>
          <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 12 }}>
            PROJECT {breakdown.project || 0} · CLIENT {breakdown.client || 0} · RECRUITMENT {breakdown.recruitment || 0}
          </div>
          {next && <div className="t-body" style={{ marginTop: 10, color: 'var(--lime)' }}>{next.at - total} points to {next.name}</div>}
        </div>
      </div>
      <div className="badge-grid">
        {liveBadges.map(b => (
          <div key={b.code} className={'badge' + (!b.earned ? ' locked' : '')}>
            <div className="badge-medallion"><BadgeMedallion badge={b} size={60} /></div>
            <div className="badge-name">{b.name}</div>
            {b.earned ? <div className="badge-date">{b.date || 'EARNED'}</div> : <div className="badge-locked-label"><i className="fa-solid fa-lock" style={{ fontSize: 8, marginRight: 4 }} />LOCKED</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ProjectBuilderPage,
  ProjectWorkspacePage,
  ProjectsPage,
  FirstOfficerDelegationsPage,
  SecondOfficerDelegationInboxPage,
  FirstOfficerProjectsPage,
  ProjectTasksPage,
  CertificatesBadgesPage,
});
