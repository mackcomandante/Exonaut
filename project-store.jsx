// Project Action Register: project membership, assigned actions, progress,
// review comments, resources, and project point awards.
(function () {
  if (window.__projectStore) return;

  const listeners = new Set();
  let state = {
    projects: [],
    tasks: [],
    members: [],
    resources: [],
    assignees: [],
    submissions: [],
    comments: [],
    activity: [],
    loaded: false,
    error: '',
  };

  const TASK_CLASSES = {
    critical: { label: 'CRITICAL', color: 'red', points: 2 },
    urgent: { label: 'URGENT', color: 'blue', points: 1 },
    important: { label: 'IMPORTANT', color: 'yellow', points: 3 },
  };

  const ACTION_STATUSES = [
    { id: 'not_started', label: 'Not Started' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'for_review', label: 'For Review' },
    { id: 'done', label: 'Done' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  function normalizeStatus(status) {
    return ({
      backlog: 'not_started',
      assigned: 'not_started',
      submitted: 'for_review',
      approved: 'done',
      rejected: 'in_progress',
    })[status] || status || 'not_started';
  }

  function projectRoster(projectId) {
    return state.members.filter(member => member.projectId === projectId).map(member => member.userId);
  }

  function classifyTask({ urgent, important }) {
    if (urgent && important) return { key: 'critical', status: 'not_started', sortOrder: -1000, ...TASK_CLASSES.critical };
    if (urgent && !important) return { key: 'urgent', status: 'not_started', sortOrder: 0, ...TASK_CLASSES.urgent };
    return { key: 'important', status: 'not_started', sortOrder: 1000, ...TASK_CLASSES.important };
  }

  function deadlineState(task) {
    if (!task?.dueDate || ['done', 'cancelled'].includes(normalizeStatus(task.status))) return 'On Track';
    const today = new Date().toISOString().slice(0, 10);
    if (task.dueDate < today) return 'Overdue';
    if (normalizeStatus(task.status) === 'blocked') return 'Blocked';
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
      status: normalizeStatus(row.status),
      topic: row.topic || '',
      nextStep: row.next_step || '',
      blockers: row.blockers || '',
      referenceLinks: Array.isArray(row.reference_links) ? row.reference_links : [],
      progressNote: row.progress_note || '',
      displayOrder: Number(row.display_order || row.sort_order || 0),
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

  function toMember(row) {
    return {
      projectId: row.project_id,
      userId: row.user_id,
      memberRole: row.member_role || 'member',
      joinedAt: row.joined_at,
      addedBy: row.added_by,
    };
  }

  function toResource(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      resourceType: row.resource_type || 'link',
      url: row.url || '',
      addedBy: row.added_by,
      createdAt: row.created_at,
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
      const [projectsResult, tasksResult, membersResult, resourcesResult, assigneesResult, submissionsResult, commentsResult, activityResult] = await Promise.all([
        window.__db.from('projects').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_tasks').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false }),
        window.__db.from('project_members').select('*'),
        window.__db.from('project_resources').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_assignees').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_submissions').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_comments').select('*').order('created_at', { ascending: false }),
        window.__db.from('project_task_activity').select('*').order('created_at', { ascending: false }),
      ]);

      const error = projectsResult.error || tasksResult.error || membersResult.error || resourcesResult.error || assigneesResult.error || submissionsResult.error || commentsResult.error || activityResult.error;
      if (error) throw error;

      state = {
        projects: (projectsResult.data || []).map(toProject),
        tasks: (tasksResult.data || []).map(toTask),
        members: (membersResult.data || []).map(toMember),
        resources: (resourcesResult.data || []).map(toResource),
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
    const previousTask = data.id ? state.tasks.find(task => task.id === data.id) : null;
    const classified = classifyTask({
      urgent: data.urgent !== undefined ? data.urgent : data.priority === 'critical' || data.priority === 'urgent',
      important: data.important !== undefined ? data.important : data.priority !== 'urgent',
    });
    const status = normalizeStatus(data.status || classified.status);
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
      topic: data.topic || '',
      next_step: data.nextStep || '',
      blockers: data.blockers || '',
      reference_links: data.referenceLinks || [],
      progress_note: data.progressNote || '',
      display_order: Number(data.displayOrder ?? data.sortOrder ?? classified.sortOrder),
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
    const progressChanged = !!data.id && row.progress_note && row.progress_note !== previousTask?.progressNote;
    const statusChanged = !!data.id && previousTask && previousTask.status !== row.status;
    if (!data.id) {
      await logActivity(row.id, 'action_created', {
        title: row.title,
        status: row.status,
        class: row.task_class,
        deadlineState: deadlineState(toTask(row)),
        progressNote: row.progress_note,
      });
    } else {
      if (statusChanged) {
        await logActivity(row.id, 'status_changed', {
          title: row.title,
          status: row.status,
          fromStatus: previousTask.status,
          class: row.task_class,
          deadlineState: deadlineState(toTask(row)),
        });
      }
      if (progressChanged) {
        await logActivity(row.id, 'progress_update_added', {
          title: row.title,
          status: row.status,
          class: row.task_class,
          deadlineState: deadlineState(toTask(row)),
          progressNote: row.progress_note,
        });
      }
      if (!statusChanged && !progressChanged) {
        await logActivity(row.id, 'action_updated', {
          title: row.title,
          status: row.status,
          class: row.task_class,
          deadlineState: deadlineState(toTask(row)),
        });
      }
    }
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
    ACTION_STATUSES,
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
      const membership = state.members.find(member => member.projectId === projectId && member.userId === userId);
      if (membership) return membership.memberRole;
      if (state.tasks.some(t => t.projectId === projectId && (t.trackLeadId === userId || t.secondOfficerId === userId))) return 'track-lead';
      if (state.assignees.some(a => a.userId === userId && state.tasks.some(t => t.id === a.taskId && t.projectId === projectId))) return 'member';
      return 'none';
    },
    visibleProjects(profile) {
      if (!profile) return [];
      if (profile.role === 'admin' || profile.role === 'commander') return state.projects;
      return state.projects.filter(project => this.projectAccess(profile.id, project.id) !== 'none');
    },
    async createProject(data) {
      await upsertProject(data);
      await this.setProjectMembers(data.id || state.projects[0]?.id, data.firstOfficerId, data.memberIds || []);
    },
    projectRoster,
    async setProjectMembers(projectId, leadId, userIds) {
      const addedBy = await actorId();
      const rows = [
        { project_id: projectId, user_id: leadId, member_role: 'lead', added_by: addedBy },
        ...[...new Set(userIds || [])].filter(id => id && id !== leadId).map(userId => ({
          project_id: projectId,
          user_id: userId,
          member_role: 'member',
          added_by: addedBy,
        })),
      ].filter(row => row.user_id);
      const { error: clearError } = await window.__db.from('project_members').delete().eq('project_id', projectId);
      if (clearError) throw clearError;
      if (rows.length) {
        const { error } = await window.__db.from('project_members').upsert(rows, { onConflict: 'project_id,user_id' });
        if (error) throw error;
      }
      await refresh();
    },
    async archiveProject(projectId) {
      const { error } = await window.__db.from('projects').update({ status: 'archived' }).eq('id', projectId);
      if (error) throw error;
      await refresh();
    },
    async deleteProject(projectId) {
      await Promise.all([
        window.__db.from('project_task_activity').delete().in('task_id', state.tasks.filter(t => t.projectId === projectId).map(t => t.id)),
        window.__db.from('project_task_comments').delete().in('task_id', state.tasks.filter(t => t.projectId === projectId).map(t => t.id)),
        window.__db.from('project_task_submissions').delete().in('task_id', state.tasks.filter(t => t.projectId === projectId).map(t => t.id)),
        window.__db.from('project_task_assignees').delete().in('task_id', state.tasks.filter(t => t.projectId === projectId).map(t => t.id)),
      ]);
      await Promise.all([
        window.__db.from('project_tasks').delete().eq('project_id', projectId),
        window.__db.from('project_members').delete().eq('project_id', projectId),
        window.__db.from('project_resources').delete().eq('project_id', projectId),
      ]);
      const { error } = await window.__db.from('projects').delete().eq('id', projectId);
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
      await logActivity(taskId, 'assignment_changed', { count: rows.length });
      await refresh();
    },
    async updateActionStatus(taskId, status) {
      const patch = { status: normalizeStatus(status) };
      if (patch.status === 'done') patch.completed_at = new Date().toISOString();
      const { error } = await window.__db.from('project_tasks').update(patch).eq('id', taskId);
      if (error) throw error;
      await logActivity(taskId, 'status_changed', { status: patch.status });
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
        window.__db.from('project_tasks').update({ status: 'for_review', submitted_note: note || '' }).eq('id', taskId),
      ]);
      if (insertResult.error || taskResult.error) throw insertResult.error || taskResult.error;
      await logActivity(taskId, 'submitted_for_review', { submittedBy, hasFile: !!fileUrl, hasLink: !!linkUrl });
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
          status: 'done',
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
    async addResource({ projectId, title, resourceType, url }) {
      const addedBy = await actorId();
      const row = {
        id: 'pres-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        project_id: projectId,
        title,
        resource_type: resourceType || 'link',
        url,
        added_by: addedBy,
      };
      const { error } = await window.__db.from('project_resources').insert(row);
      if (error) throw error;
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_resources' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_assignees' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_submissions' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_comments' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_activity' }, refresh)
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
          <div className="t-body" style={{ marginTop: 6 }}>Create projects, assign members, and open their shared Action Register workspace.</div>
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => window.__projectStore.archiveProject(project.id)}>Archive</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => { if (window.confirm(`Delete "${project.title}"? This will permanently remove all tasks, members, and activity. This cannot be undone.`)) window.__projectStore.deleteProject(project.id); }}>Delete</button>
                  </div>
                </div>
                <div className="project-stat-grid">
                  <ProjectStat label="Project Lead" value={nameOf(project.firstOfficerId)} />
                  <ProjectStat label="Exonauts" value={roster.length} />
                  <ProjectStat label="Actions" value={projectTasks.length} />
                  <ProjectStat label="For Review" value={projectTasks.filter(t => t.status === 'for_review').length} />
                  <ProjectStat label="Done" value={projectTasks.filter(t => t.status === 'done').length} />
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

function LegacyProjectWorkspacePage({ mode = 'member' }) {
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

      {canOfficer && <LegacyTaskComposer project={project} trackCode={activeTrack} profiles={profiles} />}
      <LegacyActionPlaceholder
        tasks={projectTasks}
        profile={profile}
        profiles={profiles}
        assignees={assignees}
        canOfficer={canOfficer}
        onOpen={setSelectedTaskId}
      />

      {selectedTask && (
        <LegacyTaskDetailModal
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

function LegacyTaskComposer({ project, trackCode, profiles }) {
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

function LegacyActionPlaceholder() {
  return null;
}

function LegacyTaskDetailModal({ task, project, profile, profiles, assignees, submissions, comments, activity, canOfficer, onClose }) {
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

function ProjectWorkspacePage() {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { tasks, members, resources, assignees, submissions, comments, activity, error } = useProjects();
  const visibleProjects = window.__projectStore.visibleProjects(profile).filter(project => project.status !== 'archived');
  const [projectId, setProjectId] = React.useState('');
  const [tab, setTab] = React.useState('register');
  const [selectedId, setSelectedId] = React.useState(null);
  const project = visibleProjects.find(item => item.id === projectId) || visibleProjects[0];
  const actions = tasks.filter(task => task.projectId === project?.id);
  const projectMembers = members.filter(member => member.projectId === project?.id);
  const projectResources = resources.filter(resource => resource.projectId === project?.id);
  const selectedAction = actions.find(task => task.id === selectedId);
  const access = project ? window.__projectStore.projectAccess(profile.id, project.id) : 'none';
  const canManage = profile.role === 'admin' || profile.role === 'commander' || access === 'first' || access === 'lead';
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Unassigned';
  const complete = actions.filter(task => task.status === 'done').length;
  const blocked = actions.filter(task => task.status === 'blocked').length;

  if (!project) return <div className="enter"><div className="card-panel project-empty">No assigned projects available.</div></div>;
  return (
    <div className="enter project-workspace">
      <header className="card-panel project-register-header">
        <div>
          <div className="t-label" style={{ color: 'var(--platinum)' }}>PROJECT ACTION REGISTER</div>
          <div className="project-title-line"><h1 className="t-title">{project.title}</h1><ProjectState status={project.status} /></div>
          <p className="t-body">{project.description || 'Shared actions, progress updates, and project resources.'}</p>
          <div className="project-header-meta">
            <span><i className="fa-solid fa-user-tie" /> {nameOf(project.firstOfficerId)}</span>
            <span><i className="fa-solid fa-users" /> {projectMembers.length} members</span>
            <span><i className="fa-regular fa-calendar" /> {prettyDate(project.startDate)} - {prettyDate(project.dueDate)}</span>
          </div>
        </div>
        <div className="project-header-side">
          <select className="select project-switcher" value={project.id} onChange={event => { setProjectId(event.target.value); setSelectedId(null); setTab('register'); }}>
            {visibleProjects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <div className="project-metric-grid">
            <ProjectMetric label="Actions" value={actions.length} />
            <ProjectMetric label="Done" value={complete} />
            <ProjectMetric label="Blocked" value={blocked} alert={blocked > 0} />
            <ProjectMetric label="Complete" value={(actions.length ? Math.round(complete / actions.length * 100) : 0) + '%'} />
          </div>
        </div>
      </header>
      {error && <div className="card-panel project-error">{error}</div>}
      <nav className="project-tabs">
        {[['register', 'Action Register'], ['overview', 'Overview'], ['resources', 'Resources'], ['activity', 'Activity']].map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {tab === 'register' && <ActionRegister project={project} actions={actions} members={projectMembers} assignees={assignees} profiles={profiles} canManage={canManage} onOpen={setSelectedId} />}
      {tab === 'overview' && <ProjectOverview actions={actions} assignees={assignees} profiles={profiles} onOpen={setSelectedId} />}
      {tab === 'resources' && <ProjectResources project={project} actions={actions} resources={projectResources} submissions={submissions.filter(item => actions.some(action => action.id === item.taskId))} profiles={profiles} canManage={canManage} />}
      {tab === 'activity' && <ProjectActivity actions={actions} activity={activity.filter(item => actions.some(action => action.id === item.taskId))} profiles={profiles} />}
      {selectedAction && (
        <ActionDrawer key={selectedAction.id} action={selectedAction} project={project} members={projectMembers} profile={profile} profiles={profiles} assignees={assignees.filter(item => item.taskId === selectedAction.id)} submissions={submissions.filter(item => item.taskId === selectedAction.id)} comments={comments.filter(item => item.taskId === selectedAction.id)} activity={activity.filter(item => item.taskId === selectedAction.id)} canManage={canManage} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function ProjectState({ status }) {
  const labels = { draft: 'On Hold', active: 'Active', completed: 'Completed' };
  return <span className={'project-state state-' + status}>{labels[status] || status}</span>;
}

function ProjectMetric({ label, value, alert }) {
  return <div className={'project-metric' + (alert ? ' alert' : '')}><strong>{value}</strong><span>{label}</span></div>;
}

function ActionStatus({ status }) {
  const record = window.__projectStore.ACTION_STATUSES.find(item => item.id === status);
  return <span className={'action-status action-' + status}>{record?.label || status}</span>;
}

function prettyDate(value) {
  if (!value) return 'Not set';
  return new Date(value.length === 10 ? value + 'T00:00:00' : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function actionOverdue(action) {
  return !!action.dueDate && action.dueDate < new Date().toISOString().slice(0, 10) && !['done', 'cancelled'].includes(action.status);
}

function ActionRegister({ project, actions, members, assignees, profiles, canManage, onOpen }) {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [responsible, setResponsible] = React.useState('all');
  const [creating, setCreating] = React.useState(false);
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Unassigned';
  const filtered = actions.filter(action => {
    const owners = assignees.filter(item => item.taskId === action.id).map(item => item.userId);
    const searchable = [action.topic, action.title, action.brief, action.nextStep, action.blockers].join(' ').toLowerCase();
    return (!search || searchable.includes(search.toLowerCase())) && (status === 'all' || action.status === status) && (responsible === 'all' || owners.includes(responsible));
  }).sort((a, b) => (a.displayOrder - b.displayOrder) || String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  return (
    <section className="card-panel action-register-panel">
      <div className="action-toolbar">
        <label className="action-search"><i className="fa-solid fa-magnifying-glass" /><input placeholder="Search actions..." value={search} onChange={event => setSearch(event.target.value)} /></label>
        <select className="select" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{window.__projectStore.ACTION_STATUSES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <select className="select" value={responsible} onChange={event => setResponsible(event.target.value)}><option value="all">All responsible users</option>{members.map(member => <option key={member.userId} value={member.userId}>{nameOf(member.userId)}</option>)}</select>
        {canManage && <button className="btn btn-primary" onClick={() => setCreating(value => !value)}><i className="fa-solid fa-plus" /> New Action</button>}
      </div>
      {creating && <NewActionForm project={project} members={members} profiles={profiles} onClose={() => setCreating(false)} />}
      <div className="action-table-wrap">
        <table className="action-table">
          <thead><tr><th>#</th><th>Topic</th><th>Action / Particulars</th><th>Status</th><th>Next Step</th><th>Due</th><th>Responsible</th><th>Blockers</th><th>Links</th><th>Updated</th></tr></thead>
          <tbody>
            {filtered.map((action, index) => {
              const owners = assignees.filter(item => item.taskId === action.id).map(item => nameOf(item.userId));
              return (
                <tr key={action.id} className={(action.status === 'blocked' ? 'blocked ' : '') + (actionOverdue(action) ? 'overdue' : '')} onClick={() => onOpen(action.id)}>
                  <td data-label="#">{index + 1}</td>
                  <td data-label="Topic"><strong>{action.topic || '-'}</strong></td>
                  <td data-label="Action"><span className="action-title">{action.title}</span><small>{action.brief}</small></td>
                  <td data-label="Status"><ActionStatus status={action.status} /></td>
                  <td data-label="Next Step">{action.nextStep || '-'}</td>
                  <td data-label="Due"><span className={actionOverdue(action) ? 'due-over' : ''}>{prettyDate(action.dueDate)}</span></td>
                  <td data-label="Responsible">{owners.join(', ') || 'Unassigned'}</td>
                  <td data-label="Blockers">{action.blockers ? <span className="blocker-note"><i className="fa-solid fa-triangle-exclamation" /> {action.blockers}</span> : '-'}</td>
                  <td data-label="Links">{action.referenceLinks.length ? <span className="link-count"><i className="fa-solid fa-paperclip" /> {action.referenceLinks.length}</span> : '-'}</td>
                  <td data-label="Updated">{prettyDate(action.updatedAt || action.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && <div className="action-empty">No actions match this view.</div>}
      </div>
    </section>
  );
}

function NewActionForm({ project, members, profiles, onClose }) {
  const [draft, setDraft] = React.useState({ topic: '', title: '', brief: '', status: 'not_started', nextStep: '', dueDate: '', responsibleId: '', blockers: '' });
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || id;
  async function save() {
    if (!draft.title.trim()) return;
    const taskId = await window.__projectStore.saveTask({ projectId: project.id, trackCode: project.trackCodes[0] || 'GENERAL', accountableId: project.firstOfficerId, topic: draft.topic.trim(), title: draft.title.trim(), brief: draft.brief.trim(), status: draft.status, nextStep: draft.nextStep.trim(), blockers: draft.blockers.trim(), dueDate: draft.dueDate, displayOrder: Date.now() });
    if (draft.responsibleId) await window.__projectStore.assignTaskTeam(taskId, [draft.responsibleId]);
    onClose();
  }
  return (
    <div className="new-action-form">
      <div className="new-action-grid">
        <input className="input" placeholder="Topic" value={draft.topic} onChange={event => setDraft(value => ({ ...value, topic: event.target.value }))} />
        <input className="input" placeholder="Action / Particulars" value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} />
        <select className="select" value={draft.responsibleId} onChange={event => setDraft(value => ({ ...value, responsibleId: event.target.value }))}><option value="">Responsible user</option>{members.map(member => <option key={member.userId} value={member.userId}>{nameOf(member.userId)}</option>)}</select>
        <select className="select" value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))}>{window.__projectStore.ACTION_STATUSES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <textarea className="textarea" placeholder="Description / details" value={draft.brief} onChange={event => setDraft(value => ({ ...value, brief: event.target.value }))} />
        <textarea className="textarea" placeholder="Next step" value={draft.nextStep} onChange={event => setDraft(value => ({ ...value, nextStep: event.target.value }))} />
        <input className="input" type="date" value={draft.dueDate} onChange={event => setDraft(value => ({ ...value, dueDate: event.target.value }))} />
        <input className="input" placeholder="Initial blocker, if any" value={draft.blockers} onChange={event => setDraft(value => ({ ...value, blockers: event.target.value }))} />
      </div>
      <div className="task-composer-actions"><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save Action</button></div>
    </div>
  );
}

function ProjectOverview({ actions, assignees, profiles, onOpen }) {
  const done = actions.filter(action => action.status === 'done').length;
  const active = actions.filter(action => action.status === 'in_progress').length;
  const blocked = actions.filter(action => action.status === 'blocked').length;
  const attention = actions.filter(action => action.status === 'blocked' || actionOverdue(action));
  const workload = profiles.map(person => ({
    person,
    count: assignees.filter(assignment => assignment.userId === person.id && actions.some(action => action.id === assignment.taskId && !['done', 'cancelled'].includes(action.status))).length,
  })).filter(item => item.count).sort((a, b) => b.count - a.count);
  const deadlines = actions.filter(action => action.dueDate && !['done', 'cancelled'].includes(action.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  return (
    <section className="project-overview">
      <div className="project-overview-metrics">
        <ProjectMetric value={actions.length} label="Total Actions" />
        <ProjectMetric value={done} label="Done" />
        <ProjectMetric value={active} label="In Progress" />
        <ProjectMetric value={blocked} label="Blocked" alert={blocked > 0} />
        <ProjectMetric value={actions.filter(actionOverdue).length} label="Overdue" alert={actions.some(actionOverdue)} />
        <ProjectMetric value={(actions.length ? Math.round(done / actions.length * 100) : 0) + '%'} label="Complete" />
      </div>
      <div className="overview-columns">
        <div className="card-panel overview-panel">
          <h2>Attention Needed</h2>
          {!attention.length && <p className="empty-line">No blocked or overdue actions.</p>}
          {attention.map(action => <button key={action.id} className="attention-row" onClick={() => onOpen(action.id)}><strong>{action.title}</strong><span>{action.status === 'blocked' ? 'Blocked' : 'Overdue'} - {action.topic || 'General'}</span></button>)}
        </div>
        <div className="card-panel overview-panel">
          <h2>Team Workload</h2>
          {!workload.length && <p className="empty-line">No active assigned actions.</p>}
          {workload.map(item => <div key={item.person.id} className="workload-row"><span>{item.person.fullName || item.person.email}</span><strong>{item.count} active</strong></div>)}
        </div>
        <div className="card-panel overview-panel">
          <h2>Upcoming Deadlines</h2>
          {!deadlines.length && <p className="empty-line">No upcoming deadlines.</p>}
          {deadlines.map(action => <button key={action.id} className="deadline-row" onClick={() => onOpen(action.id)}><span>{prettyDate(action.dueDate)}</span><strong>{action.title}</strong></button>)}
        </div>
      </div>
    </section>
  );
}

function ProjectResources({ project, actions, resources, submissions, profiles, canManage }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: '', resourceType: 'link', url: '' });
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Project member';
  const references = actions.flatMap(action => action.referenceLinks.map((url, index) => ({ id: action.id + '-' + index, title: action.title, resourceType: 'reference', url, addedBy: action.createdBy, createdAt: action.updatedAt })));
  const deliverables = submissions.filter(item => item.linkUrl || item.fileUrl).map(item => ({ id: item.id, title: actions.find(action => action.id === item.taskId)?.title || 'Submitted deliverable', resourceType: 'deliverable', url: item.linkUrl || item.fileUrl, addedBy: item.submittedBy, createdAt: item.createdAt }));
  const allResources = [...resources, ...references, ...deliverables];
  async function save() {
    if (!draft.title.trim() || !draft.url.trim()) return;
    await window.__projectStore.addResource({ projectId: project.id, ...draft });
    setDraft({ title: '', resourceType: 'link', url: '' });
    setAdding(false);
  }
  return (
    <section className="card-panel resources-panel">
      <div className="panel-heading">
        <div><h2>Project Resources</h2><p>Important links and submitted deliverables in one place.</p></div>
        {canManage && <button className="btn btn-primary btn-sm" onClick={() => setAdding(value => !value)}><i className="fa-solid fa-plus" /> Add Resource</button>}
      </div>
      {adding && <div className="resource-form"><input className="input" placeholder="Resource title" value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /><select className="select" value={draft.resourceType} onChange={event => setDraft(value => ({ ...value, resourceType: event.target.value }))}><option value="link">Link</option><option value="file">File</option><option value="brief">Brief</option></select><input className="input" placeholder="URL" value={draft.url} onChange={event => setDraft(value => ({ ...value, url: event.target.value }))} /><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>}
      <div className="resource-list">
        {!allResources.length && <div className="action-empty">No resources have been added.</div>}
        {allResources.map(resource => <a key={resource.id} className="resource-row" href={resource.url} target="_blank" rel="noreferrer"><i className="fa-solid fa-link" /><div><strong>{resource.title}</strong><span>{resource.resourceType} - added by {nameOf(resource.addedBy)} - {prettyDate(resource.createdAt)}</span></div><i className="fa-solid fa-arrow-up-right-from-square" /></a>)}
      </div>
    </section>
  );
}

function ProjectActivity({ actions, activity, profiles }) {
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Project member';
  const actionOf = id => actions.find(action => action.id === id)?.title || 'Action';
  return (
    <section className="card-panel project-activity-panel">
      <h2>Activity</h2>
      {!activity.length && <div className="action-empty">No project activity yet.</div>}
      {activity.map(item => <div key={item.id} className="project-activity-row"><span className="activity-dot" /><div><strong>{nameOf(item.actorId)}</strong> {item.action.replaceAll('_', ' ')} <b>{actionOf(item.taskId)}</b><time>{prettyDate(item.createdAt)}</time></div></div>)}
    </section>
  );
}

function ActionDrawer({ action, project, members, profile, profiles, assignees, submissions, comments, activity, canManage, onClose }) {
  const [team, setTeam] = React.useState(assignees.map(assignment => assignment.userId));
  const [edit, setEdit] = React.useState({ topic: action.topic, title: action.title, brief: action.brief, status: action.status, nextStep: action.nextStep, dueDate: action.dueDate || '', blockers: action.blockers, referenceLinks: action.referenceLinks.join('\n'), progressNote: action.progressNote });
  const [submission, setSubmission] = React.useState({ note: '', linkUrl: '', fileUrl: '' });
  const [comment, setComment] = React.useState('');
  const [review, setReview] = React.useState('');
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Unknown';
  const isAssigned = assignees.some(assignment => assignment.userId === profile.id);
  const canUpdate = canManage || (isAssigned && !['done', 'cancelled'].includes(action.status));
  async function save() {
    const permitted = canManage ? edit : { status: edit.status, nextStep: edit.nextStep, blockers: edit.blockers, referenceLinks: edit.referenceLinks, progressNote: edit.progressNote };
    await window.__projectStore.saveTask({ ...action, ...permitted, referenceLinks: edit.referenceLinks.split(/\n|,/).map(value => value.trim()).filter(Boolean), id: action.id, projectId: action.projectId, trackCode: action.trackCode });
    if (canManage) await window.__projectStore.assignTaskTeam(action.id, team);
  }
  async function submitForReview() {
    await window.__projectStore.submitTask({ taskId: action.id, ...submission, note: submission.note || edit.progressNote });
    setSubmission({ note: '', linkUrl: '', fileUrl: '' });
  }
  async function postComment() {
    if (!comment.trim()) return;
    await window.__projectStore.addComment(action.id, comment.trim());
    setComment('');
  }
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="action-drawer" onClick={event => event.stopPropagation()}>
        <div className="drawer-head"><div><div className="t-label" style={{ color: 'var(--platinum)' }}>{edit.topic || 'GENERAL ACTION'}</div><h2>{edit.title}</h2></div><button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark" /></button></div>
        <div className="drawer-body">
          <section className="drawer-section">
            <div className="drawer-section-title">Action Details</div>
            {canManage && <input className="input" placeholder="Topic" value={edit.topic} onChange={event => setEdit(value => ({ ...value, topic: event.target.value }))} />}
            {canManage && <input className="input" value={edit.title} onChange={event => setEdit(value => ({ ...value, title: event.target.value }))} />}
            {canManage ? <textarea className="textarea" value={edit.brief} onChange={event => setEdit(value => ({ ...value, brief: event.target.value }))} /> : <p>{action.brief || 'No details provided.'}</p>}
            <div className="drawer-field-grid">
              <label>Status<select className="select" disabled={!canUpdate} value={edit.status} onChange={event => setEdit(value => ({ ...value, status: event.target.value }))}>{window.__projectStore.ACTION_STATUSES.filter(item => canManage || !canUpdate || !['done', 'cancelled'].includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label>Due date<input className="input" type="date" disabled={!canManage} value={edit.dueDate} onChange={event => setEdit(value => ({ ...value, dueDate: event.target.value }))} /></label>
            </div>
            <label>Next step<textarea className="textarea" disabled={!canUpdate} value={edit.nextStep} onChange={event => setEdit(value => ({ ...value, nextStep: event.target.value }))} /></label>
            <label>Blockers<textarea className="textarea" disabled={!canUpdate} value={edit.blockers} onChange={event => setEdit(value => ({ ...value, blockers: event.target.value }))} /></label>
            <label>Reference links<textarea className="textarea" disabled={!canUpdate} placeholder="One URL per line" value={edit.referenceLinks} onChange={event => setEdit(value => ({ ...value, referenceLinks: event.target.value }))} /></label>
            <label>Progress update<textarea className="textarea" disabled={!canUpdate} placeholder="What changed today?" value={edit.progressNote} onChange={event => setEdit(value => ({ ...value, progressNote: event.target.value }))} /></label>
            {canUpdate && <button className="btn btn-primary btn-sm" onClick={save}>Save Update</button>}
          </section>
          <section className="drawer-section">
            <div className="drawer-section-title">Responsible</div>
            {canManage ? <select multiple className="select assignee-select" value={team} onChange={event => setTeam(Array.from(event.target.selectedOptions).map(option => option.value))}>{members.map(member => <option key={member.userId} value={member.userId}>{nameOf(member.userId)}</option>)}</select> : <p>{assignees.map(assignment => nameOf(assignment.userId)).join(', ') || 'Unassigned'}</p>}
            <p className="drawer-muted">Project lead: {nameOf(project.firstOfficerId)}</p>
          </section>
          <section className="drawer-section">
            <div className="drawer-section-title">Submissions</div>
            {!submissions.length && <div className="empty-line">No work submitted yet.</div>}
            {submissions.map(item => <div className="submission-row" key={item.id}><strong>{nameOf(item.submittedBy)}</strong><p>{item.note || 'Submission added.'}</p>{item.linkUrl && <a href={item.linkUrl} target="_blank" rel="noreferrer">Open link</a>}{item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer">Open file</a>}</div>)}
            {isAssigned && <div className="submission-form"><textarea className="textarea" placeholder="Submission note" value={submission.note} onChange={event => setSubmission(value => ({ ...value, note: event.target.value }))} /><input className="input" placeholder="Link URL" value={submission.linkUrl} onChange={event => setSubmission(value => ({ ...value, linkUrl: event.target.value }))} /><input className="input" placeholder="File URL" value={submission.fileUrl} onChange={event => setSubmission(value => ({ ...value, fileUrl: event.target.value }))} /><button className="btn btn-primary btn-sm" onClick={submitForReview}>Submit for Review</button></div>}
          </section>
          {canManage && action.status === 'for_review' && <section className="drawer-section"><div className="drawer-section-title">Review</div><textarea className="textarea" placeholder="Approval or revision comment" value={review} onChange={event => setReview(event.target.value)} /><div className="review-actions"><button className="btn btn-primary btn-sm" onClick={() => window.__projectStore.approveTask(action.id, review || 'Approved')}>Approve / Mark Done</button><button className="btn btn-ghost btn-sm" onClick={() => window.__projectStore.requestRevision(action.id, review || 'Needs revision')}>Request Revision</button></div></section>}
          <section className="drawer-section">
            <div className="drawer-section-title">Comments and History</div>
            {comments.map(item => <div key={item.id} className={'comment-row ' + item.kind}><strong>{nameOf(item.authorId)}</strong><p>{item.comment}</p></div>)}
            <div className="comment-form"><textarea className="textarea" placeholder="Add a comment" value={comment} onChange={event => setComment(event.target.value)} /><button className="btn btn-ghost btn-sm" onClick={postComment}>Add Comment</button></div>
            <div className="drawer-timeline">
              {action.progressNote && !activity.some(item => item.metadata?.progressNote === action.progressNote) && <div className="has-note"><span><strong>Latest Progress Update</strong><p>{action.progressNote}</p></span><time>Latest</time></div>}
              {activity.map(item => <div key={item.id} className={item.metadata?.progressNote ? 'has-note' : ''}><span><strong>{item.action.replaceAll('_', ' ')}</strong>{item.metadata?.progressNote && <p>{item.metadata.progressNote}</p>}</span><time>{prettyDate(item.createdAt)}</time></div>)}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { ProjectBuilderPage, ProjectWorkspacePage });
