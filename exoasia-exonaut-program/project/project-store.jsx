// Project management flow: Project Lead ownership, Track Lead / First Officer boards,
// roster submissions, review comments, and project point awards.
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
    delegations: [],
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
    if (!task?.dueDate || ['done', 'cancelled'].includes(task.status)) return 'On Track';
    const today = new Date().toISOString().slice(0, 10);
    if (task.status === 'blocked' || task.dueDate < today) return 'Critical';
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
      firstOfficerId: row.track_lead_id || row.second_officer_id,
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
      url: row.url,
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
        window.__db.from('project_members').select('*').order('joined_at', { ascending: true }),
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
        delegations: [],
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
    const existing = data.id ? state.tasks.find(task => task.id === data.id) : null;
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
      completed_at: status === 'done' ? (data.completedAt || new Date().toISOString()) : null,
    };
    const { error } = await window.__db.from('project_tasks').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    const progressChanged = !!data.id && row.progress_note && row.progress_note !== existing?.progressNote;
    const statusChanged = !!data.id && existing && existing.status !== status;
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
          fromStatus: existing.status,
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
    ACTION_STATUSES,
    TASK_CLASSES,
    PRIORITIES: Object.keys(TASK_CLASSES),
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
    visibleDelegations(profile) {
      if (!profile) return [];
      return [];
    },
    projectAccess(userId, projectId) {
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return 'none';
      if (project.firstOfficerId === userId) return 'first';
      if (state.members.some(member => member.projectId === projectId && member.userId === userId && member.memberRole === 'lead')) return 'lead';
      if (state.tasks.some(t => t.projectId === projectId && (t.trackLeadId === userId || t.secondOfficerId === userId))) return 'track-lead';
      if (project.trackCodes.some(code => window.__crownStore?.getActiveCrownForTrack(code)?.userId === userId)) return 'track-lead';
      if (state.assignees.some(a => a.userId === userId && state.tasks.some(t => t.id === a.taskId && t.projectId === projectId))) return 'member';
      if (projectRoster(projectId).includes(userId)) return 'member';
      return 'none';
    },
    visibleProjects(profile) {
      if (!profile) return [];
      if (profile.role === 'admin' || profile.role === 'commander') return state.projects;
      return state.projects.filter(project => this.projectAccess(profile.id, project.id) !== 'none'
        || projectRoster(project.id).includes(profile.id));
    },
    trackLeadForTrack,
    secondOfficerForTrack: trackLeadForTrack,
    projectRoster,
    async createProject(data) {
      await upsertProject(data);
      const projectId = data.id || state.projects[0]?.id;
      if (projectId) await this.setProjectMembers(projectId, data.memberIds || []);
    },
    async setProjectMembers(projectId, userIds) {
      const addedBy = await actorId();
      const project = state.projects.find(item => item.id === projectId);
      const memberIds = [...new Set([project?.firstOfficerId, ...(userIds || [])].filter(Boolean))];
      const removeIds = state.members
        .filter(member => member.projectId === projectId && !memberIds.includes(member.userId))
        .map(member => member.userId);
      if (removeIds.length) {
        const { error } = await window.__db.from('project_members').delete().eq('project_id', projectId).in('user_id', removeIds);
        if (error) throw error;
      }
      const rows = memberIds.map(userId => ({
        project_id: projectId,
        user_id: userId,
        member_role: userId === project?.firstOfficerId ? 'lead' : 'member',
        added_by: addedBy,
      }));
      if (rows.length) {
        const { error } = await window.__db.from('project_members').upsert(rows, { onConflict: 'project_id,user_id' });
        if (error) throw error;
      }
      await refresh();
    },
    async updateProject(projectId, data) {
      const existing = state.projects.find(project => project.id === projectId);
      if (!existing) throw new Error('Project not found.');
      await upsertProject({
        ...existing,
        ...data,
        id: projectId,
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        cohortId: data.cohortId ?? existing.cohortId,
        trackCodes: data.trackCodes ?? existing.trackCodes,
        firstOfficerId: data.firstOfficerId ?? existing.firstOfficerId,
        status: data.status ?? existing.status,
        startDate: data.startDate ?? existing.startDate,
        dueDate: data.dueDate ?? existing.dueDate,
      });
      await this.setProjectMembers(projectId, data.memberIds ?? projectRoster(projectId));
    },
    async archiveProject(projectId) {
      const { error } = await window.__db.from('projects').update({ status: 'archived' }).eq('id', projectId);
      if (error) throw error;
      await refresh();
    },
    async deleteProject(projectId) {
      const taskIds = state.tasks.filter(t => t.projectId === projectId).map(t => t.id);
      if (taskIds.length) {
        await Promise.all([
          window.__db.from('project_task_activity').delete().in('task_id', taskIds),
          window.__db.from('project_task_comments').delete().in('task_id', taskIds),
          window.__db.from('project_task_submissions').delete().in('task_id', taskIds),
          window.__db.from('project_task_assignees').delete().in('task_id', taskIds),
        ]);
      }
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
    async saveDelegation() {},
    async deleteDelegation() {},
    async acknowledgeDelegation() {},
    async deleteTask(taskId) {
      await Promise.all([
        window.__db.from('project_task_activity').delete().eq('task_id', taskId),
        window.__db.from('project_task_comments').delete().eq('task_id', taskId),
        window.__db.from('project_task_submissions').delete().eq('task_id', taskId),
        window.__db.from('project_task_assignees').delete().eq('task_id', taskId),
      ]);
      const { error } = await window.__db.from('project_tasks').delete().eq('id', taskId);
      if (error) throw error;
      await refresh();
    },
    async clearProjectActions(projectId) {
      const taskIds = state.tasks.filter(t => t.projectId === projectId).map(t => t.id);
      if (taskIds.length) {
        await Promise.all([
          window.__db.from('project_task_activity').delete().in('task_id', taskIds),
          window.__db.from('project_task_comments').delete().in('task_id', taskIds),
          window.__db.from('project_task_submissions').delete().in('task_id', taskIds),
          window.__db.from('project_task_assignees').delete().in('task_id', taskIds),
        ]);
      }
      const { error } = await window.__db.from('project_tasks').delete().eq('project_id', projectId);
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
      const task = state.tasks.find(t => t.id === taskId);
      if (task && window.__notifStore) {
        (userIds || []).forEach(userId => window.__notifStore.add({
          toUserId: userId,
          type: 'project-task',
          title: task.taskClass === 'critical' ? 'CRITICAL TASK ASSIGNED' : 'PROJECT TASK ASSIGNED',
          sub: `${task.title} · ${deadlineState(task)} · +${task.points} pts`,
          icon: task.taskClass === 'critical' ? 'fa-bolt' : 'fa-list-check',
          metadata: { taskId },
        }));
      }
      await logActivity(taskId, 'assignment_changed', { count: rows.length });
      await refresh();
    },
    async moveTask(taskId, status) {
      const normalizedStatus = normalizeStatus(status);
      const patch = { status: normalizedStatus, completed_at: normalizedStatus === 'done' ? new Date().toISOString() : null };
      const { error } = await window.__db.from('project_tasks').update(patch).eq('id', taskId);
      if (error) throw error;
      await logActivity(taskId, 'status_changed', { status: normalizedStatus });
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
      const task = state.tasks.find(t => t.id === taskId);
      if (task && window.__notifStore) {
        [task.trackLeadId, task.secondOfficerId, task.accountableId].filter(Boolean).forEach(userId => {
          if (userId !== submittedBy) window.__notifStore.add({
            toUserId: userId,
            type: 'project-submission',
            title: 'PROJECT TASK SUBMITTED',
            sub: task.title,
            icon: 'fa-cloud-arrow-up',
            metadata: { taskId, submittedBy },
          });
        });
      }
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
      const task = state.tasks.find(t => t.id === taskId);
      if (task && window.__notifStore) {
        const assigneeIds = state.assignees.filter(a => a.taskId === taskId).map(a => a.userId);
        [...new Set([...assigneeIds, task.trackLeadId, task.secondOfficerId].filter(Boolean))]
          .filter(userId => userId !== authorId)
          .forEach(userId => window.__notifStore.add({
            toUserId: userId,
            type: kind === 'revision' ? 'project-revision' : 'project-comment',
            title: kind === 'revision' ? 'REVISION REQUESTED' : 'PROJECT COMMENT ADDED',
            sub: task.title,
            icon: kind === 'revision' ? 'fa-rotate-left' : 'fa-comment',
            metadata: { taskId, commentId: row.id },
          }));
      }
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
      if (window.__notifStore) {
        recipients.forEach(userId => window.__notifStore.add({
          toUserId: userId,
          type: 'points',
          title: `+${task.points} project points awarded`,
          sub: task.title,
          icon: 'fa-bolt',
          share: {
            kind: 'citation',
            payload: {
              id: 'CIT-' + taskId,
              title: task.title,
              grade: 'Approved',
              pointsAwarded: task.points,
              color: '#C9F24A',
              feedback: note || 'Approved project task.',
            },
          },
          metadata: { taskId },
        }));
      }
      if (window.__pointsStore) {
        recipients.forEach(userId => {
          window.__pointsStore.award({
            id: 'pts-project-' + taskId + '-' + userId,
            userId,
            sourceType: 'project',
            sourceId: taskId,
            cohortId: 'c2627',
            trackCode: task.trackCode,
            pillar: 'missions',
            points: task.points,
            note: task.title,
            awardedBy: reviewer,
          });
        });
      }
      await logActivity(taskId, 'approved', { recipients: recipients.length, points: task.points });
      await refresh();
    },
    async addResource(data) {
      const addedBy = await actorId();
      const row = {
        id: data.id || 'pres-' + Date.now(),
        project_id: data.projectId,
        title: data.title,
        resource_type: data.resourceType || 'link',
        url: data.url,
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

function ProjectBuilderPage({ roleLabel = 'PLATFORM ADMIN' } = {}) {
  const { profiles } = useUserProfiles();
  const { error } = useProjects();
  useCrownState();
  const tracks = typeof useAdminTracks === 'function' ? useAdminTracks() : TRACKS;
  const [draft, setDraft] = React.useState({ title: '', description: '', trackCodes: [], firstOfficerId: '', memberIds: [], startDate: '', dueDate: '' });
  const [memberTrackFilter, setMemberTrackFilter] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const selectedTrackCodes = draft.trackCodes;
  const selectedRoster = profiles.filter(p => selectedTrackCodes.includes(p.trackCode || 'AIS'));
  const trackLeadIds = selectedTrackCodes
    .map(code => window.__crownStore?.getActiveCrownForTrack(code)?.userId)
    .filter(Boolean);
  const officers = selectedRoster.length ? selectedRoster : profiles.filter(p => ['exonaut', 'lead', 'commander'].includes(p.role || 'exonaut'));
  const exonauts = selectedRoster.filter(p => (p.role || 'exonaut') === 'exonaut');
  const currentMemberTrack = selectedTrackCodes.includes(memberTrackFilter) ? memberTrackFilter : (selectedTrackCodes[0] || '');
  const currentTrackExonauts = exonauts.filter(p => (p.trackCode || 'AIS') === currentMemberTrack);
  const autoMemberIds = [...new Set([draft.firstOfficerId, ...trackLeadIds].filter(Boolean))];
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  const trackName = code => tracks.find(t => t.code === code)?.short || code || 'TRACK';

  function toggleTrack(code) {
    setDraft(d => {
      const trackCodes = d.trackCodes.includes(code) ? d.trackCodes.filter(c => c !== code) : [...d.trackCodes, code];
      const allowed = new Set(profiles.filter(p => trackCodes.includes(p.trackCode || 'AIS')).map(p => p.id));
      return {
        ...d,
        trackCodes,
        firstOfficerId: allowed.has(d.firstOfficerId) ? d.firstOfficerId : '',
        memberIds: d.memberIds.filter(id => allowed.has(id)),
      };
    });
  }

  React.useEffect(() => {
    if (!selectedTrackCodes.length) {
      if (memberTrackFilter) setMemberTrackFilter('');
      return;
    }
    if (!selectedTrackCodes.includes(memberTrackFilter)) setMemberTrackFilter(selectedTrackCodes[0]);
  }, [selectedTrackCodes.join('|'), memberTrackFilter]);

  function updateCurrentTrackMembers(selectedIds) {
    const currentTrackIds = new Set(currentTrackExonauts.map(p => p.id));
    setDraft(d => ({
      ...d,
      memberIds: [
        ...d.memberIds.filter(id => !currentTrackIds.has(id)),
        ...selectedIds,
      ],
    }));
  }

  function removeMember(userId) {
    setDraft(d => ({ ...d, memberIds: d.memberIds.filter(id => id !== userId) }));
  }

  async function createProject() {
    if (!draft.title.trim() || !draft.firstOfficerId || draft.trackCodes.length === 0) return;
    setSaving(true);
    try {
      const id = 'proj-' + Date.now();
      const memberIds = [...new Set([...draft.memberIds, ...autoMemberIds])];
      await window.__projectStore.createProject({ ...draft, memberIds, id, title: draft.title.trim(), description: draft.description.trim(), status: 'active' });
      setDraft({ title: '', description: '', trackCodes: [], firstOfficerId: '', memberIds: [], startDate: '', dueDate: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--sky)' }}>{roleLabel} Â· PROJECTS</div>
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
            {tracks.map(t => <button key={t.code} className={'lb-filter' + (draft.trackCodes.includes(t.code) ? ' active' : '')} onClick={() => toggleTrack(t.code)}>{t.short}</button>)}
          </div>
          <label className="t-label-muted">PROJECT LEAD</label>
          <select className="select" value={draft.firstOfficerId} onChange={e => setDraft(d => ({ ...d, firstOfficerId: e.target.value }))}>
            <option value="">Select officer</option>
            {officers.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email} · {tracks.find(t => t.code === (p.trackCode || 'AIS'))?.short || p.trackCode}</option>)}
          </select>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', margin: '6px 0 10px' }}>
            Auto First Officers: {[...new Set(trackLeadIds)].map(nameOf).join(', ') || 'none until track leads are assigned'}
          </div>
          <label className="t-label-muted">PROJECT EXONAUTS</label>
          <select className="select" value={currentMemberTrack} disabled={!selectedTrackCodes.length} onChange={e => setMemberTrackFilter(e.target.value)} style={{ marginBottom: 8 }}>
            {!selectedTrackCodes.length && <option value="">Select tracks first</option>}
            {selectedTrackCodes.map(code => <option key={code} value={code}>{trackName(code)} roster</option>)}
          </select>
          <select multiple className="select assignee-select" disabled={!currentMemberTrack}
            value={draft.memberIds.filter(id => currentTrackExonauts.some(p => p.id === id))}
            onChange={e => updateCurrentTrackMembers(Array.from(e.target.selectedOptions).map(o => o.value))}>
            {currentTrackExonauts.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email} · {trackName(p.trackCode || 'AIS')}</option>)}
          </select>
          {currentMemberTrack && currentTrackExonauts.length === 0 && (
            <div className="empty-line">No exonauts found under {trackName(currentMemberTrack)}.</div>
          )}
          {draft.memberIds.length > 0 && (
            <div className="selected-member-list">
              {draft.memberIds.map(id => (
                <button key={id} type="button" className="selected-member-pill" onClick={() => removeMember(id)}>
                  {nameOf(id)} <span>{trackName(profiles.find(p => p.id === id)?.trackCode || '')}</span>
                  <i className="fa-solid fa-xmark" />
                </button>
              ))}
            </div>
          )}
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', marginTop: 6 }}>
            Project Lead and selected Track Leads are included automatically.
          </div>
          <div className="project-date-grid">
            <input className="input" type="date" value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
            <input className="input" type="date" value={draft.dueDate} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
          </div>
          <button className="btn btn-primary" disabled={saving || !draft.title || !draft.firstOfficerId || !draft.trackCodes.length} onClick={createProject}>
            <i className="fa-solid fa-diagram-project" /> {saving ? 'Saving...' : 'Create Project'}
          </button>
        </div>

      </div>
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
          <div className="t-body" style={{ marginTop: 6 }}>
            {mode === 'project-lead' ? 'Choose a project and track to inspect or manage its execution board.' : (project.description || 'Track task board and submissions.')}
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

function ProjectWorkspacePage({ selectedProjectId = '', onBack }) {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { tasks, members, resources, assignees, submissions, comments, activity, error } = useProjects();
  const visibleProjects = window.__projectStore.visibleProjects(profile).filter(project => project.status !== 'archived');
  const [tab, setTab] = React.useState('register');
  const [selectedId, setSelectedId] = React.useState(null);
  const project = visibleProjects.find(item => item.id === selectedProjectId) || visibleProjects[0];
  const actions = tasks.filter(task => task.projectId === project?.id);
  const projectMembers = members.filter(member => member.projectId === project?.id);
  const projectResources = resources.filter(resource => resource.projectId === project?.id);
  const selectedAction = actions.find(task => task.id === selectedId);
  const access = project ? window.__projectStore.projectAccess(profile.id, project.id) : 'none';
  const canManage = profile.role === 'admin' || access === 'first' || access === 'lead';
  const canEditActions = canManage || projectMembers.some(member => member.userId === profile.id);
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Unassigned';
  const complete = actions.filter(task => task.status === 'done').length;
  const blocked = actions.filter(task => task.status === 'blocked').length;

  if (!project) return <div className="enter"><div className="card-panel project-empty">No assigned projects available.</div></div>;
  return (
    <div className="enter project-workspace">
      <header className="card-panel project-register-header">
        <div>
          <div className="t-label project-register-label">PROJECT ACTION REGISTER</div>
          <div className="project-title-line"><h1 className="t-title">{project.title}</h1><ProjectState status={project.status} /></div>
          <p className="t-body">{project.description || 'Shared actions, progress updates, and project resources.'}</p>
          <div className="project-header-meta">
            <span><i className="fa-solid fa-user-tie" /> {nameOf(project.firstOfficerId)}</span>
            <span><i className="fa-solid fa-users" /> {projectMembers.length} members</span>
            <span><i className="fa-regular fa-calendar" /> {prettyDate(project.startDate)} - {prettyDate(project.dueDate)}</span>
          </div>
        </div>
        <div className="project-header-side">
          {onBack && <button className="btn btn-ghost project-workspace-back" onClick={onBack}><i className="fa-solid fa-arrow-left" /> All Projects</button>}
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
      {tab === 'register' && <ActionRegister project={project} actions={actions} members={projectMembers} assignees={assignees} profiles={profiles} canManage={canManage} canEditActions={canEditActions} onOpen={setSelectedId} />}
      {tab === 'overview' && <ProjectOverview actions={actions} assignees={assignees} profiles={profiles} onOpen={setSelectedId} />}
      {tab === 'resources' && <ProjectResources project={project} actions={actions} resources={projectResources} submissions={submissions.filter(item => actions.some(action => action.id === item.taskId))} profiles={profiles} canManage={canManage} />}
      {tab === 'activity' && <ProjectActivity actions={actions} activity={activity.filter(item => actions.some(action => action.id === item.taskId))} profiles={profiles} />}
      {selectedAction && <ActionModal key={selectedAction.id} action={selectedAction} project={project} members={projectMembers} profiles={profiles} assignees={assignees.filter(item => item.taskId === selectedAction.id)} comments={comments.filter(item => item.taskId === selectedAction.id)} activity={activity.filter(item => item.taskId === selectedAction.id)} canManage={canManage} canEditActions={canEditActions} onClose={() => setSelectedId(null)} />}
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

function normalizeImportHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      if (row.some(value => String(value || '').trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(value => String(value || '').trim())) rows.push(row);
  return rows;
}

async function inflateZipEntry(bytes, method) {
  if (method === 0) return bytes;
  if (method !== 8) throw new Error('Unsupported Excel compression method.');
  if (!window.DecompressionStream) throw new Error('This browser cannot read .xlsx files. Export the sheet as CSV and import that file.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Could not read this Excel file.');
  const count = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const entries = {};
  let offset = centralOffset;
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (view.getUint32(localOffset, true) === 0x04034b50) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      entries[name] = { method, compressed };
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlText(value) {
  const doc = new DOMParser().parseFromString(value, 'application/xml');
  return doc;
}

function colIndexFromCellRef(ref) {
  const letters = String(ref || '').match(/[A-Z]+/i)?.[0] || 'A';
  return letters.toUpperCase().split('').reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

async function parseXlsxRows(file) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const decoder = new TextDecoder();
  const readEntry = async (name) => {
    const entry = entries[name];
    if (!entry) return '';
    return decoder.decode(await inflateZipEntry(entry.compressed, entry.method));
  };
  const sharedXml = await readEntry('xl/sharedStrings.xml');
  const sharedStrings = sharedXml
    ? Array.from(xmlText(sharedXml).getElementsByTagName('si')).map(si =>
        Array.from(si.getElementsByTagName('t')).map(t => t.textContent || '').join('')
      )
    : [];
  const parseSheetRows = (sheetXml) => {
    const doc = xmlText(sheetXml);
    return Array.from(doc.getElementsByTagName('row')).map(rowNode => {
      const cells = [];
      Array.from(rowNode.getElementsByTagName('c')).forEach(cellNode => {
        const index = colIndexFromCellRef(cellNode.getAttribute('r'));
        const type = cellNode.getAttribute('t');
        const raw = cellNode.getElementsByTagName('v')[0]?.textContent || '';
        const inline = cellNode.getElementsByTagName('t')[0]?.textContent || '';
        cells[index] = type === 's' ? (sharedStrings[Number(raw)] || '') : (type === 'inlineStr' ? inline : raw);
      });
      return cells.map(value => value || '');
    }).filter(row => row.some(value => String(value || '').trim()));
  };
  const hasActionRegisterHeader = (rows) => rows.some(row => {
    const keys = row.map(normalizeImportHeader);
    return keys.includes('topic') && (keys.includes('particulars') || keys.includes('action') || keys.includes('actionparticulars'));
  });
  const workbookXml = await readEntry('xl/workbook.xml');
  const relsXml = await readEntry('xl/_rels/workbook.xml.rels');
  let sheetPaths = ['xl/worksheets/sheet1.xml'];
  if (workbookXml && relsXml) {
    const workbook = xmlText(workbookXml);
    const rels = xmlText(relsXml);
    sheetPaths = Array.from(workbook.getElementsByTagName('sheet')).map(sheet => {
      const relId = sheet.getAttribute('r:id') || sheet.getAttribute('id');
      const rel = Array.from(rels.getElementsByTagName('Relationship')).find(item => item.getAttribute('Id') === relId);
      const target = rel?.getAttribute('Target');
      return target ? 'xl/' + target.replace(/^\/?xl\//, '') : '';
    }).filter(Boolean);
  }
  let firstRows = null;
  for (const sheetPath of sheetPaths) {
    const sheetXml = await readEntry(sheetPath);
    if (!sheetXml) continue;
    const rows = parseSheetRows(sheetXml);
    if (!firstRows) firstRows = rows;
    if (hasActionRegisterHeader(rows)) return rows;
  }
  if (firstRows) return firstRows;
  throw new Error('No worksheet found in this Excel file.');
}

function excelDateToIso(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) return raw.replace(/-(\d)(?=-|$)/g, '-0$1');
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 90000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return date.toISOString().slice(0, 10);
    }
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function normalizeImportedStatus(value) {
  const key = normalizeImportHeader(value);
  if (!key) return 'not_started';
  if (['done', 'complete', 'completed'].includes(key)) return 'done';
  if (['inprogress', 'ongoing', 'working'].includes(key)) return 'in_progress';
  if (['omitted', 'cancelled', 'canceled'].includes(key)) return 'cancelled';
  if (['blocked', 'stuck'].includes(key)) return 'blocked';
  if (['forreview', 'review', 'submitted'].includes(key)) return 'for_review';
  return 'not_started';
}

function linkListFromCell(value) {
  return String(value || '').split(/\n|,/).map(item => item.trim()).filter(Boolean);
}

function importedRowsToActions(rows, profiles, project) {
  const headerIndex = rows.findIndex(row => {
    const keys = row.map(normalizeImportHeader);
    return keys.includes('topic') && (keys.includes('particulars') || keys.includes('action') || keys.includes('actionparticulars'));
  });
  if (headerIndex < 0) throw new Error('Could not find a header row with Topic and Particulars columns.');
  const headers = rows[headerIndex].map(normalizeImportHeader);
  const findCol = (...names) => names.map(normalizeImportHeader).map(name => headers.indexOf(name)).find(index => index >= 0);
  const cols = {
    item: findCol('item', '#', 'no'),
    topic: findCol('topic'),
    title: findCol('particulars', 'actionparticulars', 'action', 'title'),
    status: findCol('status'),
    nextStep: findCol('nextsteps', 'nextstep'),
    dueDate: findCol('when', 'due', 'duedate'),
    responsible: findCol('responsible', 'owner', 'assignedto'),
    notes: findCol('notes', 'note'),
    links: findCol('links', 'link', 'references'),
  };
  const matchPerson = (name) => {
    const needle = String(name || '').trim().toLowerCase();
    if (!needle) return '';
    const clean = needle.replace(/\s+/g, ' ');
    return profiles.find(p => [p.fullName, p.email].some(value => String(value || '').trim().toLowerCase() === clean))?.id
      || profiles.find(p => String(p.fullName || '').toLowerCase().includes(clean) || clean.includes(String(p.fullName || '').toLowerCase()))?.id
      || '';
  };
  return rows.slice(headerIndex + 1).map((row, index) => {
    const title = String(row[cols.title] || '').trim();
    if (!title) return null;
    return {
      displayOrder: Number(row[cols.item]) || index + 1,
      topic: String(row[cols.topic] || '').trim(),
      title,
      brief: String(row[cols.notes] || '').trim(),
      status: normalizeImportedStatus(row[cols.status]),
      nextStep: String(row[cols.nextStep] || '').trim(),
      dueDate: excelDateToIso(row[cols.dueDate]),
      responsibleName: String(row[cols.responsible] || '').trim(),
      responsibleId: matchPerson(row[cols.responsible]),
      blockers: normalizeImportedStatus(row[cols.status]) === 'blocked' ? 'Imported as blocked' : '',
      referenceLinks: linkListFromCell(row[cols.links]),
      trackCode: project.trackCodes[0] || 'GENERAL',
      progressNote: String(row[cols.notes] || '').trim(),
    };
  }).filter(Boolean);
}

function ActionRegister({ project, actions, members, assignees, profiles, canManage, canEditActions, onOpen }) {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [responsible, setResponsible] = React.useState('all');
  const [creating, setCreating] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
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
        {canEditActions && <button className="btn btn-ghost" onClick={() => setImporting(true)}><i className="fa-solid fa-file-import" /> Import Excel</button>}
        {canEditActions && <button className="btn btn-primary" onClick={() => setCreating(value => !value)}><i className="fa-solid fa-plus" /> New Action</button>}
      </div>
      {importing && <ActionImportModal project={project} profiles={profiles} onClose={() => setImporting(false)} />}
      {creating && <NewActionForm project={project} members={members} profiles={profiles} canManage={canManage} onClose={() => setCreating(false)} />}
      <div className="action-table-wrap">
        <div className="action-selection-bar">
          <button className="action-clear-all" type="button" onClick={() => setClearing(true)} disabled={!actions.length || !canEditActions}>
            <i className="fa-solid fa-trash" /> Clear All Actions
          </button>
          <span className="action-selection-count">{actions.length} actions in this project</span>
        </div>
        <table className="action-table">
          <thead><tr><th>#</th><th>Topic</th><th>Action / Particulars</th><th>Status</th><th>Next Step</th><th>Due</th><th>Responsible</th><th>Blockers</th><th>Links</th><th>Updated</th></tr></thead>
          <tbody>
            {filtered.map((action, index) => {
              const owners = assignees.filter(item => item.taskId === action.id).map(item => nameOf(item.userId));
              return (
                <tr key={action.id} className={(action.status === 'blocked' ? 'blocked ' : '') + (actionOverdue(action) ? 'overdue' : '')} onClick={() => onOpen(action.id)}>
                  <td data-label="#">{index + 1}</td><td data-label="Topic"><strong>{action.topic || '-'}</strong></td>
                  <td data-label="Action"><span className="action-title">{action.title}</span><small>{action.brief}</small></td>
                  <td data-label="Status"><ActionStatus status={action.status} /></td><td data-label="Next Step">{action.nextStep || '-'}</td>
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
      {clearing && <ClearActionsModal project={project} actions={actions} onClose={() => setClearing(false)} />}
    </section>
  );
}

function ClearActionsModal({ project, actions, onClose }) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  async function confirmClear() {
    setSaving(true);
    setError('');
    try {
      await window.__projectStore.clearProjectActions(project.id);
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not delete all actions.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card-panel admin-project-delete-modal" onClick={event => event.stopPropagation()}>
        <div className="t-label" style={{ color: 'var(--red)', marginBottom: 8 }}>CLEAR ACTION REGISTER</div>
        <h2 className="t-heading" style={{ fontSize: 22, margin: '0 0 8px' }}>Delete all actions?</h2>
        <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)', lineHeight: 1.5 }}>
          This will delete all {actions.length} actions from {project.title}. This cannot be undone.
        </div>
        {error && <div className="t-body" style={{ color: 'var(--red)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <div className="admin-project-modal-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={confirmClear} disabled={saving} style={{ background: 'var(--red)' }}>
            <i className="fa-solid fa-trash" /> {saving ? 'Deleting...' : 'Yes, Delete All'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewActionForm({ project, members, profiles, canManage, onClose }) {
  const [draft, setDraft] = React.useState({ topic: '', title: '', brief: '', status: 'not_started', nextStep: '', dueDate: '', responsibleId: '', blockers: '' });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || id;
  async function save() {
    if (!draft.title.trim()) {
      setError('Action / Particulars is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const taskId = await window.__projectStore.saveTask({ projectId: project.id, trackCode: project.trackCodes[0] || 'GENERAL', accountableId: project.firstOfficerId, topic: draft.topic.trim(), title: draft.title.trim(), brief: draft.brief.trim(), status: draft.status, nextStep: draft.nextStep.trim(), blockers: draft.blockers.trim(), dueDate: draft.dueDate, displayOrder: Math.floor(Date.now() / 1000) });
      if (draft.responsibleId) await window.__projectStore.assignTaskTeam(taskId, [draft.responsibleId]);
      onClose();
    } catch (err) {
      const message = err?.message || 'Could not save this action.';
      if (/column|relation|display_order|topic|next_step|project_members|project_resources/i.test(message)) {
        setError('Action Register database setup is not applied yet. Run the project action register migration in Supabase, then try again.');
      } else if (/row-level security|policy|permission/i.test(message)) {
        setError('You do not have permission to create actions for this project.');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="new-action-form">
      {error && <div className="action-form-error"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
      <div className="new-action-grid">
        <input className="input" placeholder="Topic" value={draft.topic} onChange={event => setDraft(value => ({ ...value, topic: event.target.value }))} />
        <input className="input" placeholder="Action / Particulars" value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} />
        <select className="select" value={draft.responsibleId} onChange={event => setDraft(value => ({ ...value, responsibleId: event.target.value }))}><option value="">Responsible user</option>{members.map(member => <option key={member.userId} value={member.userId}>{nameOf(member.userId)}</option>)}</select>
        <select className="select" value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))}>{window.__projectStore.ACTION_STATUSES.filter(item => canManage || !['done', 'cancelled'].includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <textarea className="textarea" placeholder="Description / details" value={draft.brief} onChange={event => setDraft(value => ({ ...value, brief: event.target.value }))} />
        <textarea className="textarea" placeholder="Next step" value={draft.nextStep} onChange={event => setDraft(value => ({ ...value, nextStep: event.target.value }))} />
        <input className="input" type="date" value={draft.dueDate} onChange={event => setDraft(value => ({ ...value, dueDate: event.target.value }))} />
        <input className="input" placeholder="Initial blocker, if any" value={draft.blockers} onChange={event => setDraft(value => ({ ...value, blockers: event.target.value }))} />
      </div>
      <div className="task-composer-actions"><button className="btn btn-ghost btn-sm" disabled={saving} onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Action'}</button></div>
    </div>
  );
}

function ActionImportModal({ project, profiles, onClose }) {
  const [fileName, setFileName] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const previewRows = rows.slice(0, 8);
  const matched = rows.filter(row => row.responsibleId).length;

  async function readImportFile(file) {
    setFileName(file?.name || '');
    setRows([]);
    setError('');
    if (!file) return;
    setLoading(true);
    try {
      const name = String(file.name || '').toLowerCase();
      let parsedRows;
      if (name.endsWith('.csv')) {
        parsedRows = parseCsvRows(await file.text());
      } else if (name.endsWith('.xlsx')) {
        parsedRows = await parseXlsxRows(file);
      } else if (name.endsWith('.xls')) {
        throw new Error('Old .xls files are not supported. Export from Google Sheets as .xlsx or CSV.');
      } else {
        throw new Error('Please upload a .xlsx or .csv file.');
      }
      const actions = importedRowsToActions(parsedRows, profiles, project);
      if (!actions.length) throw new Error('No action rows found after the header row.');
      setRows(actions);
    } catch (err) {
      setError(err?.message || 'Could not read this file.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!rows.length) return;
    setSaving(true);
    setError('');
    try {
      for (const row of rows) {
        const taskId = await window.__projectStore.saveTask({
          projectId: project.id,
          trackCode: row.trackCode,
          accountableId: project.firstOfficerId,
          topic: row.topic,
          title: row.title,
          brief: row.brief,
          status: row.status,
          nextStep: row.nextStep,
          blockers: row.blockers,
          dueDate: row.dueDate,
          displayOrder: row.displayOrder,
          referenceLinks: row.referenceLinks,
          progressNote: row.progressNote,
        });
        if (row.responsibleId) await window.__projectStore.assignTaskTeam(taskId, [row.responsibleId]);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not import these actions.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card-panel action-import-modal" role="dialog" aria-modal="true" aria-label="Import action register" onClick={event => event.stopPropagation()}>
        <div className="admin-project-modal-head">
          <div>
            <div className="t-label project-register-label">ACTION REGISTER IMPORT</div>
            <h2 className="t-heading" style={{ fontSize: 24, margin: 0 }}>Import Excel</h2>
            <p className="t-body" style={{ margin: '6px 0 0', fontSize: 13 }}>
              Upload the exported action register. Headers should include Topic, Particulars, Status, Next Steps, When, Responsible, Notes, and Links.
            </p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} title="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <label className="action-import-drop">
          <i className="fa-solid fa-file-excel" />
          <span>
            <strong>{fileName || 'Choose .xlsx or .csv file'}</strong>
            <small>{loading ? 'Reading file...' : 'Google Sheets: File -> Download -> Microsoft Excel or CSV'}</small>
          </span>
          <input type="file" accept=".xlsx,.csv" onChange={event => readImportFile(event.target.files?.[0])} />
        </label>

        {error && <div className="action-form-error"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}

        {!!rows.length && (
          <>
            <div className="action-import-summary">
              <span><strong>{rows.length}</strong> actions ready</span>
              <span><strong>{matched}</strong> responsible users matched</span>
              <span><strong>{rows.length - matched}</strong> unassigned</span>
            </div>
            <div className="action-import-preview">
              <table>
                <thead>
                  <tr><th>#</th><th>Topic</th><th>Action</th><th>Status</th><th>Due</th><th>Responsible</th></tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={index}>
                      <td>{row.displayOrder}</td>
                      <td>{row.topic || '-'}</td>
                      <td>{row.title}</td>
                      <td><ActionStatus status={row.status} /></td>
                      <td>{row.dueDate || '-'}</td>
                      <td>{row.responsibleId ? profiles.find(p => p.id === row.responsibleId)?.fullName || row.responsibleName : row.responsibleName || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > previewRows.length && <div className="t-mono" style={{ fontSize: 10, color: 'var(--off-white-40)', marginTop: 8 }}>Showing first {previewRows.length} of {rows.length} rows.</div>}
            </div>
          </>
        )}

        <div className="admin-project-modal-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={confirmImport} disabled={saving || loading || !rows.length}>
            <i className="fa-solid fa-file-import" /> {saving ? 'Importing...' : `Import ${rows.length || ''} Actions`}
          </button>
        </div>
      </section>
    </div>
  );
}

function ProjectOverview({ actions, assignees, profiles, onOpen }) {
  const done = actions.filter(action => action.status === 'done').length;
  const forReview = actions.filter(action => action.status === 'for_review');
  const completed = actions.filter(action => action.status === 'done');
  const attention = actions.filter(action => action.status === 'blocked' || actionOverdue(action));
  const workload = profiles.map(person => ({ person, count: assignees.filter(assignment => assignment.userId === person.id && actions.some(action => action.id === assignment.taskId && !['done', 'cancelled'].includes(action.status))).length })).filter(item => item.count).sort((a, b) => b.count - a.count);
  const deadlines = actions.filter(action => action.dueDate && !['done', 'cancelled'].includes(action.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  return (
    <section className="project-overview">
      <div className="project-overview-metrics">
        <ProjectMetric value={actions.length} label="Total Actions" /><ProjectMetric value={done} label="Done" /><ProjectMetric value={actions.filter(action => action.status === 'in_progress').length} label="In Progress" />
        <ProjectMetric value={actions.filter(action => action.status === 'blocked').length} label="Blocked" alert={actions.some(action => action.status === 'blocked')} /><ProjectMetric value={actions.filter(actionOverdue).length} label="Overdue" alert={actions.some(actionOverdue)} /><ProjectMetric value={(actions.length ? Math.round(done / actions.length * 100) : 0) + '%'} label="Complete" />
      </div>
      <div className="overview-columns">
        <OverviewActionCard title="For Review" empty="No actions waiting for review." actions={forReview} assignees={assignees} profiles={profiles} onOpen={onOpen} />
        <OverviewActionCard title="Done" empty="No completed actions yet." actions={completed} assignees={assignees} profiles={profiles} onOpen={onOpen} />
        <div className="card-panel overview-panel"><h2>Attention Needed</h2><div className="overview-panel-body">{!attention.length && <p className="empty-line">No blocked or overdue actions.</p>}{attention.map(action => <button key={action.id} className="attention-row" onClick={() => onOpen(action.id)}><strong>{action.title}</strong><span>{action.status === 'blocked' ? 'Blocked' : 'Overdue'} - {action.topic || 'General'}</span></button>)}</div></div>
        <div className="card-panel overview-panel"><h2>Team Workload</h2><div className="overview-panel-body">{!workload.length && <p className="empty-line">No active assigned actions.</p>}{workload.map(item => <div key={item.person.id} className="workload-row"><span>{item.person.fullName || item.person.email}</span><strong>{item.count} active</strong></div>)}</div></div>
        <div className="card-panel overview-panel"><h2>Upcoming Deadlines</h2><div className="overview-panel-body">{!deadlines.length && <p className="empty-line">No upcoming deadlines.</p>}{deadlines.map(action => <button key={action.id} className="deadline-row" onClick={() => onOpen(action.id)}><span>{prettyDate(action.dueDate)}</span><strong>{action.title}</strong></button>)}</div></div>
      </div>
    </section>
  );
}

function OverviewActionCard({ title, empty, actions, assignees, profiles, onOpen }) {
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Unassigned';
  return (
    <div className="card-panel overview-panel workflow-panel">
      <h2>{title} <span className="workflow-count">{actions.length}</span></h2>
      <div className="overview-panel-body">
        {!actions.length && <p className="empty-line">{empty}</p>}
        {actions.map(action => {
          const owners = assignees.filter(assignment => assignment.taskId === action.id).map(assignment => nameOf(assignment.userId)).join(', ') || 'Unassigned';
          return (
            <button key={action.id} className="overview-action-row" onClick={() => onOpen(action.id)}>
              <strong>{action.title}</strong>
              <span>{owners}{action.dueDate ? ' - ' + prettyDate(action.dueDate) : ''}</span>
              <ActionStatus status={action.status} />
            </button>
          );
        })}
      </div>
    </div>
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
      <div className="panel-heading"><div><h2>Project Resources</h2><p>Important links and deliverables in one place.</p></div>{canManage && <button className="btn btn-primary btn-sm" onClick={() => setAdding(value => !value)}><i className="fa-solid fa-plus" /> Add Resource</button>}</div>
      {adding && <div className="resource-form"><input className="input" placeholder="Resource title" value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /><select className="select" value={draft.resourceType} onChange={event => setDraft(value => ({ ...value, resourceType: event.target.value }))}><option value="link">Link</option><option value="file">File</option><option value="brief">Brief</option></select><input className="input" placeholder="URL" value={draft.url} onChange={event => setDraft(value => ({ ...value, url: event.target.value }))} /><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>}
      <div className="resource-list">{!allResources.length && <div className="action-empty">No resources have been added.</div>}{allResources.map(resource => <a key={resource.id} className="resource-row" href={resource.url} target="_blank" rel="noreferrer"><i className="fa-solid fa-link" /><div><strong>{resource.title}</strong><span>{resource.resourceType} - added by {nameOf(resource.addedBy)} - {prettyDate(resource.createdAt)}</span></div><i className="fa-solid fa-arrow-up-right-from-square" /></a>)}</div>
    </section>
  );
}

function ProjectActivity({ actions, activity, profiles }) {
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Project member';
  const actionOf = id => actions.find(action => action.id === id)?.title || 'Action';
  return <section className="card-panel project-activity-panel"><h2>Activity</h2>{!activity.length && <div className="action-empty">No project activity yet.</div>}{activity.map(item => <div key={item.id} className="project-activity-row"><span className="activity-dot" /><div><strong>{nameOf(item.actorId)}</strong> {item.action.replaceAll('_', ' ')} <b>{actionOf(item.taskId)}</b><time>{prettyDate(item.createdAt)}</time></div></div>)}</section>;
}

function ActionModal({ action, project, members, profiles, assignees, comments, activity, canManage, canEditActions, onClose }) {
  const [mode, setMode] = React.useState('view');
  const [team, setTeam] = React.useState(assignees.map(assignment => assignment.userId));
  const [edit, setEdit] = React.useState({ topic: action.topic, title: action.title, brief: action.brief, status: action.status, nextStep: action.nextStep, dueDate: action.dueDate || '', blockers: action.blockers, referenceLinks: action.referenceLinks.join('\n'), progressNote: action.progressNote });
  const [comment, setComment] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Unknown';
  const canUpdate = canManage || (canEditActions && !['done', 'cancelled'].includes(action.status));
  const canDelete = canEditActions;
  const statusOptions = window.__projectStore.ACTION_STATUSES.filter(item => canManage || !['done', 'cancelled'].includes(item.id) || item.id === action.status);
  const responsible = assignees.map(assignment => nameOf(assignment.userId)).join(', ') || 'Unassigned';
  React.useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  async function save() {
    setSaving(true);
    setError('');
    try {
      await window.__projectStore.saveTask({ ...action, ...edit, referenceLinks: edit.referenceLinks.split(/\n|,/).map(value => value.trim()).filter(Boolean), id: action.id, projectId: action.projectId, trackCode: action.trackCode });
      await window.__projectStore.assignTaskTeam(action.id, team);
      setMode('view');
    } catch (err) {
      setError(err?.message || 'Could not save this action.');
    } finally {
      setSaving(false);
    }
  }
  async function postComment() { if (!comment.trim()) return; await window.__projectStore.addComment(action.id, comment.trim()); setComment(''); }
  async function remove() {
    if (!window.confirm(`Delete "${action.title}"? This action and its history will be removed.`)) return;
    await window.__projectStore.deleteTask(action.id);
    onClose();
  }
  return (
    <div className="action-modal-backdrop" onClick={onClose}>
      <section className="action-modal" role="dialog" aria-modal="true" aria-label={action.title} onClick={event => event.stopPropagation()}>
        <header className="action-modal-head">
          <div>
            <div className="t-label project-register-label">{action.topic || 'GENERAL ACTION'}</div>
            <h2>{action.title}</h2>
          </div>
          <div className="action-modal-controls">
            <div className="action-mode-toggle" aria-label="Action display mode">
              <button className={mode === 'view' ? 'active' : ''} onClick={() => setMode('view')}>View</button>
              {canUpdate && <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Edit</button>}
            </div>
            <button className="btn btn-ghost btn-sm" aria-label="Close action" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
          </div>
        </header>
        <div className="action-modal-body">
          {mode === 'view' ? (
            <div className="action-modal-columns">
              <section className="action-modal-section action-summary">
                <div className="action-modal-section-title">Action Details</div>
                <div className="action-summary-status"><ActionStatus status={action.status} /></div>
                <div className="action-summary-block action-summary-wide"><span>Description / details</span><p>{action.brief || 'No details provided.'}</p></div>
                <div className="action-summary-block"><span>Next step</span><p>{action.nextStep || 'Not set'}</p></div>
                <div className="action-summary-block"><span>Due date</span><p>{prettyDate(action.dueDate)}</p></div>
                <div className="action-summary-block"><span>Responsible</span><p>{responsible}</p></div>
                <div className="action-summary-block"><span>Project lead</span><p>{nameOf(project.firstOfficerId)}</p></div>
                <div className="action-summary-block action-summary-wide"><span>Blockers</span><p className={action.blockers ? 'modal-blocker' : ''}>{action.blockers || 'No blockers recorded.'}</p></div>
                <div className="action-summary-block action-summary-wide"><span>Latest progress update</span><p>{action.progressNote || 'No progress update recorded.'}</p></div>
                <div className="action-summary-block action-summary-wide"><span>Reference links</span>{action.referenceLinks.length ? <div className="action-reference-links">{action.referenceLinks.map((url, index) => <a key={url + index} href={url} target="_blank" rel="noreferrer">{url}</a>)}</div> : <p>No reference links.</p>}</div>
              </section>
              <ActionModalHistory comments={comments} activity={activity} nameOf={nameOf} progressNote={action.progressNote} />
              {canDelete && <div className="action-modal-delete"><button className="btn btn-ghost btn-sm danger-action" onClick={remove}>Delete Action</button></div>}
            </div>
          ) : (
            <div className="action-modal-columns">
              <section className="action-modal-section action-edit-form"><div className="action-modal-section-title">Edit Action</div>
                {error && <div className="action-form-error"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
                <input className="input" placeholder="Topic" value={edit.topic} onChange={event => setEdit(value => ({ ...value, topic: event.target.value }))} />
                <input className="input" value={edit.title} onChange={event => setEdit(value => ({ ...value, title: event.target.value }))} />
                <textarea className="textarea" placeholder="Description / details" value={edit.brief} onChange={event => setEdit(value => ({ ...value, brief: event.target.value }))} />
                <div className="action-modal-field-grid"><label>Status<select className="select" value={edit.status} onChange={event => setEdit(value => ({ ...value, status: event.target.value }))}>{statusOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Due date<input className="input" type="date" value={edit.dueDate} onChange={event => setEdit(value => ({ ...value, dueDate: event.target.value }))} /></label></div>
                <label>Responsible<select multiple className="select assignee-select" value={team} onChange={event => setTeam(Array.from(event.target.selectedOptions).map(option => option.value))}>{members.map(member => <option key={member.userId} value={member.userId}>{nameOf(member.userId)}</option>)}</select></label>
                <label>Next step<textarea className="textarea" value={edit.nextStep} onChange={event => setEdit(value => ({ ...value, nextStep: event.target.value }))} /></label>
                <label>Blockers<textarea className="textarea" value={edit.blockers} onChange={event => setEdit(value => ({ ...value, blockers: event.target.value }))} /></label>
                <label>Reference links<textarea className="textarea" placeholder="One URL per line" value={edit.referenceLinks} onChange={event => setEdit(value => ({ ...value, referenceLinks: event.target.value }))} /></label>
                <label>Progress update<textarea className="textarea" placeholder="What changed today?" value={edit.progressNote} onChange={event => setEdit(value => ({ ...value, progressNote: event.target.value }))} /></label>
                <div className="action-modal-actions"><button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setMode('view')}>Cancel</button><button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
              </section>
              <ActionModalHistory comments={comments} activity={activity} nameOf={nameOf} progressNote={action.progressNote} allowComment comment={comment} setComment={setComment} postComment={postComment} />
              {canDelete && <div className="action-modal-delete"><button className="btn btn-ghost btn-sm danger-action" onClick={remove}>Delete Action</button></div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ActionModalHistory({ comments, activity, nameOf, progressNote = '', allowComment = false, comment = '', setComment, postComment }) {
  return (
    <section className="action-modal-section action-modal-history">
      <div className="action-modal-section-title">Comments and History</div>
      {!comments.length && <p className="empty-line">No comments yet.</p>}
      {comments.map(item => <div key={item.id} className={'comment-row ' + item.kind}><strong>{nameOf(item.authorId)}</strong><p>{item.comment}</p></div>)}
      {allowComment && <div className="comment-form"><textarea className="textarea" placeholder="Add a comment" value={comment} onChange={event => setComment(event.target.value)} /><button className="btn btn-ghost btn-sm" onClick={postComment}>Add Comment</button></div>}
      <div className="action-modal-timeline">
        {progressNote && !activity.some(item => item.metadata?.progressNote === progressNote) && <div className="has-note"><span><strong>Latest Progress Update</strong><p>{progressNote}</p></span><time>Latest</time></div>}
        {activity.map(item => <div key={item.id} className={item.metadata?.progressNote ? 'has-note' : ''}><span><strong>{item.action.replaceAll('_', ' ')}</strong>{item.metadata?.progressNote && <p>{item.metadata.progressNote}</p>}</span><time>{prettyDate(item.createdAt)}</time></div>)}
      </div>
    </section>
  );
}

function TaskComposer({ project, trackCode, profiles }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: '', brief: '', urgent: false, important: true, deliverableType: 'file', dueDate: '', responsibleId: '', consultedId: '' });
  const crown = window.__crownStore?.getActiveCrownForTrack(trackCode);
  const roster = profiles.filter(p => (p.role || 'exonaut') === 'exonaut' && (p.trackCode || 'AIS') === trackCode && (p.cohortId || 'c2627') === (project.cohortId || 'c2627'));
  const projectLead = profiles.find(p => p.id === project.firstOfficerId);
  const commander = profiles.find(p => p.role === 'commander') || { id: 'commander', fullName: 'Mission Commander' };

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
  const [edit, setEdit] = React.useState({
    title: task.title,
    brief: task.brief,
    urgent: !!task.urgent,
    important: task.important !== false,
    dueDate: task.dueDate || '',
    deliverableType: task.deliverableType,
    consultedId: task.consultedId || '',
  });
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unknown';
  const isAssigned = assignees.some(a => a.userId === profile.id);
  const projectLead = profiles.find(p => p.id === project.firstOfficerId);
  const commander = profiles.find(p => p.role === 'commander') || { id: 'commander', fullName: 'Mission Commander' };
  const trackLeadId = task.trackLeadId || task.secondOfficerId || window.__projectStore.trackLeadForTrack(task.trackCode);
  const classInfo = window.__projectStore.TASK_CLASSES[task.taskClass] || window.__projectStore.classifyTask(task);

  async function saveTask() {
    await window.__projectStore.saveTask({
      ...task,
      ...edit,
      id: task.id,
      projectId: task.projectId,
      trackCode: task.trackCode,
      trackLeadId,
      accountableId: project.firstOfficerId,
      informedIds: [commander.id, trackLeadId].filter(Boolean),
    });
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
            <div className="t-label" style={{ color: 'var(--platinum)', marginBottom: 6 }}>{TRACKS.find(t => t.code === task.trackCode)?.short || task.trackCode} Â· {task.status}</div>
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
                <select className="select" value={edit.consultedId} onChange={e => setEdit(d => ({ ...d, consultedId: e.target.value }))}>
                  <option value="">Consulted person</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email}</option>)}
                </select>
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
                <span><strong>Responsible:</strong> {team.map(nameOf).join(', ') || 'Unassigned'}</span>
                <span><strong>Accountable:</strong> {projectLead?.fullName || projectLead?.email || 'Project Lead'}</span>
                <span><strong>Consulted:</strong> {task.consultedId ? nameOf(task.consultedId) : 'None'}</span>
                <span><strong>Informed:</strong> {[commander.id, trackLeadId].filter(Boolean).map(nameOf).join(', ')}</span>
              </div>
              <div className="kanban-card-meta" style={{ marginTop: 10 }}>
                <span>{classInfo.label || task.taskClass}</span>
                <span>{window.__projectStore.deadlineState(task)}</span>
                <span>+{task.points || classInfo.points} pts</span>
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
                  <button className="btn btn-primary btn-sm" onClick={() => window.__projectStore.approveTask(task.id, review || 'Approved')}>Approve +{task.points || classInfo.points}</button>
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

function LegacyProjectsPage() {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { projects, tasks, loaded, error } = useProjects();
  useCrownState();
  const [selectedId, setSelectedId] = React.useState(null);
  const visible = window.__projectStore.visibleProjects(profile).filter(p => p.status !== 'archived');
  const selected = visible.find(p => p.id === selectedId);
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';
  const trackName = code => TRACKS.find(t => t.code === code)?.short || code;

  function trackLeadName(trackCode) {
    const crown = window.__crownStore?.getActiveCrownForTrack(trackCode)?.userId;
    return nameOf(crown);
  }

  if (selected) {
    const access = window.__projectStore.projectAccess(profile.id, selected.id);
    const visibleTracks = profile.role === 'admin' || access === 'first'
      ? selected.trackCodes
      : selected.trackCodes.filter(code => code === profile.trackCode || tasks.some(t => t.projectId === selected.id && t.trackCode === code && (t.trackLeadId === profile.id || t.secondOfficerId === profile.id)));
    return (
      <div className="enter">
        <div className="section-head">
          <div>
            <div className="t-label" style={{ marginBottom: 8, color: 'var(--accent)' }}>PROJECT DETAIL</div>
            <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{selected.title}</h1>
            <div className="t-body" style={{ marginTop: 6 }}>{selected.description || 'No project description provided.'}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => setSelectedId(null)}><i className="fa-solid fa-arrow-left" /> Projects</button>
        </div>

        <div className="project-detail-grid">
          <ProjectInfoTile label="Status" value={selected.status} />
          <ProjectInfoTile label="Cohort" value={selected.cohortId} />
          <ProjectInfoTile label="Project Lead" value={nameOf(selected.firstOfficerId)} />
          <ProjectInfoTile label="Due Date" value={selected.dueDate || 'Not set'} />
        </div>

        <div className="card-panel" style={{ padding: 20 }}>
          <div className="t-label" style={{ marginBottom: 12 }}>ASSIGNED TRACKS</div>
          <div className="project-track-detail-list">
            {visibleTracks.map(code => {
              const trackTasks = tasks.filter(t => t.projectId === selected.id && t.trackCode === code);
              return (
                <div key={code} className="project-track-detail">
                  <div>
                    <div className="t-heading" style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0 }}>{trackName(code)}</div>
                    <div className="t-body" style={{ fontSize: 12, marginTop: 4 }}>First Officer / Track Lead: {trackLeadName(code)}</div>
                  </div>
                  <span className="status-pill status-submitted">{trackTasks.length} task{trackTasks.length === 1 ? '' : 's'}</span>
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
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--accent)' }}>PROJECTS</div>
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
            <div className="t-label" style={{ color: 'var(--accent)', marginBottom: 8 }}>{project.status} Â· {project.trackCodes.map(trackName).join(' Â· ')}</div>
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
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--accent)' }}>FIRST OFFICER Â· DELEGATIONS</div>
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
              {availableTracks.map(code => <option key={code} value={code}>{TRACKS.find(t => t.code === code)?.short || code} Â· {nameOf(window.__projectStore.secondOfficerForTrack(code))}</option>)}
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
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--platinum)' }}>SECOND OFFICER Â· INBOX</div>
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
      <p>{project?.title || 'Project'} Â· {TRACKS.find(t => t.code === delegation.trackCode)?.short || delegation.trackCode}</p>
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
          <div className="t-label" style={{ color: 'var(--platinum)', marginBottom: 8 }}>{project?.title || 'Project'} Â· {TRACKS.find(t => t.code === delegation.trackCode)?.short || delegation.trackCode}</div>
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
  return <ProjectWorkspacePage mode="project-lead" />;
}

function ProjectsPage() {
  const { profile } = useCurrentUserProfile();
  const { profiles } = useUserProfiles();
  const { tasks, loaded, error } = useProjects();
  const [selectedId, setSelectedId] = React.useState('');
  const [menuProjectId, setMenuProjectId] = React.useState('');
  const [editingProject, setEditingProject] = React.useState(null);
  const [deletingProject, setDeletingProject] = React.useState(null);
  const projects = window.__projectStore.visibleProjects(profile).filter(project => project.status !== 'archived');
  const selected = projects.find(project => project.id === selectedId);
  const canManageProjects = ['admin', 'commander'].includes(profile.role);
  const nameOf = id => profiles.find(person => person.id === id)?.fullName || profiles.find(person => person.id === id)?.email || 'Unassigned';

  if (selected) {
    return <ProjectWorkspacePage selectedProjectId={selected.id} onBack={() => setSelectedId('')} />;
  }

  return (
    <div className="enter projects-catalog">
      <div className="section-head">
        <div>
          <div className="t-label project-register-label">PROJECTS</div>
          <h1 className="t-title projects-catalog-title">Projects</h1>
          <div className="t-body">Select a project to open its Action Register.</div>
        </div>
      </div>
      {error && <div className="card-panel project-error">{error}</div>}
      {!loaded && <div className="card-panel project-empty">Loading projects...</div>}
      {loaded && !projects.length && <div className="card-panel project-empty">No assigned projects available.</div>}
      <div className="project-card-grid">
        {projects.map(project => {
          const actions = tasks.filter(task => task.projectId === project.id);
          const done = actions.filter(action => action.status === 'done').length;
          const blocked = actions.filter(action => action.status === 'blocked').length;
          return (
            <div key={project.id} className="project-card-button project-register-card" role="button" tabIndex={0} onClick={() => setSelectedId(project.id)} onKeyDown={e => { if (e.key === 'Enter') setSelectedId(project.id); }}>
              <div className="project-card-head">
                <ProjectState status={project.status} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  <span className="project-card-progress">{actions.length ? Math.round(done / actions.length * 100) : 0}% complete</span>
                  {canManageProjects && (
                    <button
                      type="button"
                      className="project-card-menu-button"
                      title="Project actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuProjectId(current => current === project.id ? '' : project.id);
                      }}
                    >
                      <i className="fa-solid fa-ellipsis-vertical" />
                    </button>
                  )}
                  {menuProjectId === project.id && (
                    <div className="project-card-menu" onClick={e => e.stopPropagation()}>
                      <button type="button" onClick={() => { setEditingProject(project); setMenuProjectId(''); }}>
                        <i className="fa-solid fa-pen" /> Edit Project
                      </button>
                      <button type="button" className="danger" onClick={() => { setDeletingProject(project); setMenuProjectId(''); }}>
                        <i className="fa-solid fa-trash" /> Delete
                      </button>
                    </div>
                  )}
                </span>
              </div>
              <h2>{project.title}</h2>
              <p>{project.description || 'Open the project Action Register.'}</p>
              <div className="project-card-meta">
                <span><i className="fa-solid fa-user-tie" /> {nameOf(project.firstOfficerId)}</span>
                <span><i className="fa-regular fa-calendar" /> {prettyDate(project.dueDate)}</span>
              </div>
              <div className="project-card-metrics">
                <span><strong>{actions.length}</strong> Actions</span>
                <span><strong>{done}</strong> Done</span>
                <span className={blocked ? 'has-blocked' : ''}><strong>{blocked}</strong> Blocked</span>
              </div>
            </div>
          );
        })}
      </div>
      {editingProject && (
        <AdminProjectEditModal
          project={editingProject}
          profiles={profiles}
          onClose={() => setEditingProject(null)}
        />
      )}
      {deletingProject && (
        <AdminProjectDeleteModal
          project={deletingProject}
          onClose={() => setDeletingProject(null)}
        />
      )}
    </div>
  );
}

function AdminProjectEditModal({ project, profiles, onClose }) {
  const tracks = typeof useAdminTracks === 'function' ? useAdminTracks() : TRACKS;
  const initialRoster = window.__projectStore.projectRoster(project.id);
  const [draft, setDraft] = React.useState({
    title: project.title || '',
    description: project.description || '',
    status: project.status || 'active',
    trackCodes: project.trackCodes || [],
    firstOfficerId: project.firstOfficerId || '',
    memberIds: initialRoster.filter(id => id !== project.firstOfficerId),
    startDate: project.startDate || '',
    dueDate: project.dueDate || '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const selectedTrackSet = new Set(draft.trackCodes);
  const candidateProfiles = profiles.filter(p => ['exonaut', 'lead', 'commander', 'admin'].includes(p.role || 'exonaut'));
  const leadOptions = candidateProfiles.filter(p => !draft.trackCodes.length || selectedTrackSet.has(p.trackCode || 'AIS') || (p.role || 'exonaut') !== 'exonaut');
  const memberOptions = profiles.filter(p => (p.role || 'exonaut') === 'exonaut' && (!draft.trackCodes.length || selectedTrackSet.has(p.trackCode || 'AIS')));
  const trackLabel = code => tracks.find(t => t.code === code)?.short || code;
  const nameOf = id => profiles.find(p => p.id === id)?.fullName || profiles.find(p => p.id === id)?.email || 'Unassigned';

  function toggleTrack(code) {
    setDraft(d => {
      const trackCodes = d.trackCodes.includes(code) ? d.trackCodes.filter(item => item !== code) : [...d.trackCodes, code];
      const allowedMembers = new Set(profiles.filter(p => trackCodes.includes(p.trackCode || 'AIS')).map(p => p.id));
      return {
        ...d,
        trackCodes,
        memberIds: d.memberIds.filter(id => allowedMembers.has(id)),
      };
    });
  }

  async function saveProject() {
    if (!draft.title.trim() || !draft.firstOfficerId) {
      setError('Project name and lead are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await window.__projectStore.updateProject(project.id, {
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
        memberIds: [...new Set([draft.firstOfficerId, ...draft.memberIds])],
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not update project.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card-panel admin-project-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-project-modal-head">
          <div>
            <div className="t-label" style={{ color: 'var(--sky)', marginBottom: 6 }}>PROJECT MANAGEMENT</div>
            <h2 className="t-heading" style={{ fontSize: 24, margin: 0 }}>Edit Project</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} title="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <label className="t-label-muted">PROJECT NAME</label>
        <input className="input" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
        <label className="t-label-muted">DESCRIPTION</label>
        <textarea className="textarea" rows={3} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
        <div className="project-date-grid">
          <label>
            <div className="t-label-muted">STATUS</div>
            <select className="select" value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
              {['draft', 'active', 'paused', 'completed', 'archived'].map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}
            </select>
          </label>
          <label>
            <div className="t-label-muted">PROJECT LEAD</div>
            <select className="select" value={draft.firstOfficerId} onChange={e => setDraft(d => ({ ...d, firstOfficerId: e.target.value }))}>
              <option value="">Select lead</option>
              {leadOptions.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email} · {trackLabel(p.trackCode || 'AIS')}</option>)}
            </select>
          </label>
        </div>
        <label className="t-label-muted">TRACKS</label>
        <div className="track-chip-row">
          {tracks.map(t => (
            <button key={t.code} type="button" className={'lb-filter' + (draft.trackCodes.includes(t.code) ? ' active' : '')} onClick={() => toggleTrack(t.code)}>
              {t.short || t.code}
            </button>
          ))}
        </div>
        <label className="t-label-muted">PROJECT MEMBERS</label>
        <select
          multiple
          className="select assignee-select"
          value={draft.memberIds}
          onChange={e => setDraft(d => ({ ...d, memberIds: Array.from(e.target.selectedOptions).map(o => o.value) }))}
        >
          {memberOptions.map(p => <option key={p.id} value={p.id}>{p.fullName || p.email} · {trackLabel(p.trackCode || 'AIS')}</option>)}
        </select>
        <div className="selected-member-list">
          {[draft.firstOfficerId, ...draft.memberIds].filter(Boolean).map(id => (
            <span key={id} className="selected-member-pill">
              {nameOf(id)} <span>{id === draft.firstOfficerId ? 'LEAD' : trackLabel(profiles.find(p => p.id === id)?.trackCode || '')}</span>
            </span>
          ))}
        </div>
        <div className="project-date-grid">
          <label>
            <div className="t-label-muted">START DATE</div>
            <input className="input" type="date" value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
          </label>
          <label>
            <div className="t-label-muted">DUE DATE</div>
            <input className="input" type="date" value={draft.dueDate} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
          </label>
        </div>
        {error && <div className="t-body" style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
        <div className="admin-project-modal-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={saveProject} disabled={saving}>
            <i className="fa-solid fa-check" /> {saving ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminProjectDeleteModal({ project, onClose }) {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState('');

  async function confirmDelete() {
    setDeleting(true);
    setError('');
    try {
      await window.__projectStore.deleteProject(project.id);
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not delete project.');
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card-panel admin-project-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="t-label" style={{ color: 'var(--red)', marginBottom: 8 }}>DELETE PROJECT</div>
        <h2 className="t-heading" style={{ fontSize: 22, margin: '0 0 8px' }}>Delete {project.title}?</h2>
        <div className="t-body" style={{ fontSize: 13, color: 'var(--off-white-68)', lineHeight: 1.5 }}>
          This will permanently remove the project, members, tasks, submissions, comments, resources, and activity.
        </div>
        {error && <div className="t-body" style={{ color: 'var(--red)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <div className="admin-project-modal-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={confirmDelete} disabled={deleting} style={{ background: 'var(--red)' }}>
            <i className="fa-solid fa-trash" /> {deleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectTasksPage() {
  const { profile } = useCurrentUserProfile();
  const isFirstOfficer = window.__projectStore.userIsFirstOfficer(profile.id);
  return <ProjectWorkspacePage mode={isFirstOfficer ? 'project-lead' : 'first-officer'} />;
}

function CertificatesBadgesPage() {
  const { profile } = useCurrentUserProfile();
  const { total, breakdown } = useUserPoints(profile.id);
  const liveBadges = useLiveBadges(profile.id);
  const next = MILESTONES.find(m => total < m.at);
  const certificateReady = total >= 900;
  const [selectedCategory, setSelectedCategory] = React.useState('milestone');
  const badgeCategories = [
    {
      id: 'milestone',
      title: 'Milestone Tier Badges',
      meta: '4 Badges · Automatic',
      description: 'Triggered automatically by total point thresholds. All include a PDF certificate.',
      icon: 'fa-chart-line',
      items: [
        { name: 'Bronze Builder', detail: '100 total points · Automatic system trigger' },
        { name: 'Silver Strategist', detail: '300 total points · Automatic system trigger' },
        { name: 'Gold Innovator', detail: '600 total points · Automatic system trigger' },
        { name: 'Platinum Disruptor', detail: '900 total points · Automatic system trigger' },
      ],
    },
    {
      id: 'track',
      title: 'Track Completion Badges',
      meta: '7 Badges · Automatic',
      description: 'Awarded when every mission in the assigned track is graded Good or Excellent. Triggered upon final mission approval. All include a PDF certificate.',
      icon: 'fa-route',
      items: [
        { name: 'AI Strategist', detail: 'Track 01 · AI Strategy' },
        { name: 'Venture Builder', detail: 'Track 02 · EBELI Ventures' },
        { name: 'L&D Champion', detail: 'Track 03 · Learning & Dev' },
        { name: 'Experience Maker', detail: 'Track 04 · Events' },
        { name: 'AI Dev Builder', detail: 'Track 05 · Software Dev' },
        { name: 'Policy Analyst', detail: 'Track 06 · Research & Policy' },
        { name: 'Content Creator', detail: 'Track 07 · Social Media' },
      ],
    },
    {
      id: 'pillar',
      title: 'Pillar Badges',
      meta: '4 Badges · Manual',
      description: 'Specific performance pillars requiring manual nomination or confirmation.',
      icon: 'fa-layer-group',
      items: [
        { name: 'Delivery Machine', detail: 'Project · 0 late submissions, 50%+ Excellent grades, and Capstone presented. Nominated by ML and awarded by Admin.' },
        { name: 'Innovation Catalyst', detail: 'Project · Most impactful idea voted by peers and Mission Leads at Week 11. Awarded by Admin, 1 per cohort.' },
        { name: 'Client Champion', detail: 'Client · 4-5 star client score, 3 touchpoints, 2 deliverables accepted, and 0 complaints. Confirmed by ML and awarded by Admin.' },
        { name: 'Talent Scout', detail: 'Recruitment · 1 recruit accepted offer and completes Week 1. System trigger with Admin confirmation. Repeatable.' },
      ],
    },
    {
      id: 'special',
      title: 'Special Award Badges',
      meta: '7 Badges · Manual',
      description: 'High-level recognition awards with admin confirmation and varying frequencies.',
      icon: 'fa-trophy',
      items: [
        { name: 'Perfect Trifecta', detail: 'All 3 Pillar badges earned in the same cohort. Awarded by Admin, 0-2 per cohort.' },
        { name: 'Track MVP', detail: 'Highest scorer in track based on mission grades, ML rating, and Demo Day. Awarded by Admin, 1 per track.' },
        { name: 'Intern of the Week', detail: 'Most points in the calendar week. System identifies top 3; Admin selects weekly.' },
        { name: 'Most Likely to Disrupt', detail: 'Peer anonymous vote at Week 11. Awarded at Demo Day, 1 per cohort.' },
        { name: 'Culture Carrier', detail: 'Most peer kudos received across 12 weeks. System calculates; Admin confirms, 1 per cohort.' },
        { name: 'Full Cycle', detail: 'Track complete, 1 client deliverable accepted, and 1 recruit submitted. System + Admin confirmation.' },
        { name: 'Pipeline Builder', detail: '2+ successful recruit placements, can span cohorts. System automatic on 2nd placement.' },
      ],
    },
  ];
  const activeCategory = badgeCategories.find(c => c.id === selectedCategory) || badgeCategories[0];
  const categoryBadges = liveBadges.filter(b => b.category === activeCategory.id);
  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>EXONAUT Â· CERTIFICATES & BADGES</div>
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
            PROJECT {breakdown.project || 0} Â· CLIENT {breakdown.client || 0} Â· RECRUITMENT {breakdown.recruitment || 0}
          </div>
          {next && <div className="t-body" style={{ marginTop: 10, color: 'var(--lime)' }}>{next.at - total} points to {next.name}</div>}
        </div>
      </div>
      <div className="credential-category-grid">
        {badgeCategories.map(category => (
          <button
            key={category.id}
            className={'credential-category-card' + (selectedCategory === category.id ? ' active' : '')}
            onClick={() => setSelectedCategory(category.id)}
          >
            <span className="credential-category-icon"><i className={'fa-solid ' + category.icon} /></span>
            <span>
              <span className="credential-category-title">{category.title}</span>
              <span className="credential-category-meta">{category.meta}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="card-panel credential-category-detail">
        <div>
          <div className="t-label" style={{ marginBottom: 6 }}>{activeCategory.meta}</div>
          <h2 className="t-heading" style={{ fontSize: 18, margin: 0 }}>{activeCategory.title}</h2>
          <div className="t-body" style={{ marginTop: 6 }}>{activeCategory.description}</div>
        </div>
        <div className="credential-requirement-list">
          {activeCategory.items.map(item => (
            <div key={item.name} className="credential-requirement">
              <div className="credential-requirement-name">{item.name}</div>
              <div className="credential-requirement-detail">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="badge-grid">
        {categoryBadges.map(b => (
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
