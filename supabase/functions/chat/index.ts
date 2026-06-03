import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import knowledge from './knowledge-base.json' assert { type: 'json' };

const GROQ_API_KEY        = Deno.env.get('GROQ_API_KEY') ?? '';
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Knowledge formatter ──────────────────────────────────────────────────────
function formatKnowledge(k: typeof knowledge, userTrackCode: string): string {
  const track = k.tracks.find(t => t.code === userTrackCode);
  const trackBrief = userTrackCode ? (k.trackBriefs as Record<string, unknown[]>)[userTrackCode] : null;

  const lines: string[] = [];

  lines.push('=== PROGRAM OVERVIEW ===');
  lines.push(k.program.summary);

  lines.push('\n=== TIERS (points required to reach each) ===');
  k.tiers.forEach(t => {
    lines.push(`• ${t.label} (${t.short}): ${t.minPoints !== null ? t.minPoints + '+ points' : 'Program completion'}`);
  });

  lines.push('\n=== ALL 7 TRACKS ===');
  k.tracks.forEach(t => {
    lines.push(`• ${t.name} (${t.code}): ${t.objective}`);
  });

  lines.push('\n=== RITUALS & POINTS ===');
  k.rituals.forEach(r => {
    lines.push(`• ${r.name}: +${r.points} pts`);
  });

  lines.push('\n=== POINTS RUBRIC ===');
  const groups: Record<string, typeof k.pointsRubric> = {};
  k.pointsRubric.forEach(r => {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  });
  Object.entries(groups).forEach(([group, items]) => {
    lines.push(`\n${group}:`);
    items.forEach(r => lines.push(`  • ${r.action}: ${r.points} — ${r.note}`));
  });

  lines.push('\n=== BADGES (22 total) ===');
  const badgeGroups: Record<string, typeof k.badges> = {};
  k.badges.forEach(b => {
    if (!badgeGroups[b.category]) badgeGroups[b.category] = [];
    badgeGroups[b.category].push(b);
  });
  Object.entries(badgeGroups).forEach(([cat, badges]) => {
    lines.push(`\n${cat.toUpperCase()}:`);
    badges.forEach(b => lines.push(`  • ${b.name} (${b.code}): ${b.subtitle}`));
  });

  lines.push('\n=== WEEK 1 & 2 (ALL TRACKS) ===');
  k.universalWeeks.forEach(w => {
    lines.push(`\nWeek ${w.week} — ${w.title} (${w.pointsRange} pts)`);
    w.missions.forEach(m => lines.push(`  Mission ${m.number} (+${m.points} pts): ${m.task}`));
  });

  if (track && trackBrief) {
    lines.push(`\n=== ${track.name.toUpperCase()} TRACK BRIEF (Weeks 3–12) ===`);
    lines.push(`Objective: ${track.objective}`);
    lines.push(`Badge to earn: ${track.trackBadge}`);
    (trackBrief as Array<{ week: number; title: string; ptsRange: string; missions: string[] }>).forEach(w => {
      lines.push(`\nWeek ${w.week} — ${w.title} (${w.ptsRange} pts)`);
      w.missions.forEach(m => lines.push(`  • ${m}`));
    });
  }

  return lines.join('\n');
}

// ─── Real-time data formatter ────────────────────────────────────────────────
function formatRealtimeData(
  totalPoints: number,
  pointBreakdown: Record<string, number>,
  userBadges: Array<{ badge_code: string; badge_name: string }>,
  leaderboard: Array<{ full_name: string; points: number }>,
  announcements: Array<{ title: string; body: string; type: string; author_name: string }>,
  ritualLogs: Array<{ ritual_id: string; logged_at: string }>,
  kudosReceived: Array<{ giver_id: string; message: string; created_at: string }>,
  kudosGiven: Array<{ receiver_id: string; message: string; created_at: string }>,
  profiles: Array<{ id: string; full_name: string }>,
  userProjects: Array<{ id: string; title: string; status: string; description: string }>,
  userTasks: Array<{ id: string; project_id: string; title: string; status: string; topic: string; next_step: string; due_date: string }>,
  missionSubs: Array<{ mission_id: string; mission_title: string; grade: string | null; feedback: string | null; submitted_at: string; graded_at: string | null }>
): string {
  const lines: string[] = [];

  lines.push('=== YOUR PROGRESS ===');
  lines.push(`• Total Points: ${totalPoints}`);

  const ritualNames: Record<string, string> = {
    'mon-ign': 'Monday Ignition',
    'mid-pls': 'Mid-Week Pulse',
    'fri-win': 'Friday Win Wall',
    'iotw': 'Intern of Week',
    'teach-bk': 'Teach-Back',
  };

  if (Object.keys(pointBreakdown).length > 0) {
    lines.push('• Points by source:');
    Object.entries(pointBreakdown).forEach(([source, pts]) => {
      lines.push(`  - ${source}: ${pts} pts`);
    });
  }

  if (userBadges && userBadges.length > 0) {
    lines.push(`• Badges Earned (${userBadges.length}): ${userBadges.map(b => b.badge_name).join(', ')}`);
  } else {
    lines.push('• Badges Earned: None yet');
  }

  lines.push('\n=== THIS WEEK\'S RITUALS ===');
  if (ritualLogs && ritualLogs.length > 0) {
    const loggedIds = new Set(ritualLogs.map(r => r.ritual_id));
    const allRituals = ['mon-ign', 'mid-pls', 'fri-win', 'teach-bk'];
    allRituals.forEach(id => {
      const done = loggedIds.has(id);
      lines.push(`• ${ritualNames[id] ?? id}: ${done ? 'LOGGED' : 'Not yet logged'}`);
    });
  } else {
    lines.push('• No rituals logged this week yet');
  }

  lines.push('\n=== KUDOS ===');
  if (kudosReceived && kudosReceived.length > 0) {
    lines.push(`• Received (${kudosReceived.length} recent):`);
    kudosReceived.slice(0, 3).forEach(k => {
      const name = profiles.find(p => p.id === k.giver_id)?.full_name ?? 'Someone';
      lines.push(`  - From ${name}: "${k.message.substring(0, 80)}"`);
    });
  } else {
    lines.push('• No kudos received yet');
  }
  if (kudosGiven && kudosGiven.length > 0) {
    lines.push(`• Given (${kudosGiven.length} total)`);
  }

  lines.push('\n=== LEADERBOARD (TOP 10 IN COHORT) ===');
  if (leaderboard && leaderboard.length > 0) {
    leaderboard.forEach((entry, idx) => {
      lines.push(`${idx + 1}. ${entry.full_name}: ${entry.points} pts`);
    });
  } else {
    lines.push('No leaderboard data available');
  }

  lines.push('\n=== MY PROJECTS ===');
  if (userProjects && userProjects.length > 0) {
    userProjects.forEach(p => {
      lines.push(`• ${p.title} [${p.status}]`);
      const tasks = userTasks.filter((t: any) => t.project_id === p.id);
      if (tasks.length > 0) {
        tasks.slice(0, 5).forEach((t: any) => {
          const due = t.due_date ? ` (due ${t.due_date})` : '';
          const next = t.next_step ? ` → ${t.next_step.substring(0, 60)}` : '';
          lines.push(`  - [${t.status}] ${t.title}${due}${next}`);
        });
      }
    });
  } else {
    lines.push('• Not assigned to any active projects');
  }

  lines.push('\n=== TRACK TASK SUBMISSIONS ===');
  if (missionSubs && missionSubs.length > 0) {
    missionSubs.forEach(s => {
      const grade = s.grade ? ` — ${s.grade.toUpperCase()}` : ' — Pending review';
      const feedback = s.feedback ? ` Feedback: "${s.feedback.substring(0, 80)}"` : '';
      lines.push(`• ${s.mission_title}${grade}${feedback}`);
    });
  } else {
    lines.push('• No track task submissions yet');
  }

  lines.push('\n=== RECENT ANNOUNCEMENTS ===');
  if (announcements && announcements.length > 0) {
    announcements.forEach(ann => {
      lines.push(`• [${ann.type.toUpperCase()}] ${ann.title} — ${ann.author_name}`);
      lines.push(`  ${ann.body.substring(0, 150)}`);
    });
  } else {
    lines.push('No announcements yet');
  }

  return lines.join('\n');
}

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(role: string, profile: Record<string, string>, formattedKnowledge: string, realtimeContext?: string): string {
  return `You are the Exonaut AI Assistant for the Exonaut Program by Exoasia Innovation Hub.

Your job: answer questions about the Exonaut Program accurately, concisely, and encouragingly.
Stay on topic — only answer questions related to the Exonaut Program.
If asked about something outside the program, politely redirect.
Never make up points values, badge names, or rules — only use what is in the knowledge base below.

TERMINOLOGY (important):
• The "Track" page is where Exonauts complete their weekly program work. It was formerly called "Missions".
• A "mission" or "weekly mission" = a week's collection of tasks (e.g., "Week 02 — Concept Papers & Discovery").
• A "task" or "track task" = an individual deliverable inside a mission (e.g., "10 Concept Papers", "Discovery Meetings").
• "Track task submissions" = deliverables the user has submitted for grading.
• Always refer to these as "track tasks" or "weekly tasks", not just "missions", to match what users see in the app.
• The person who oversees and approves track task submissions is called the "Track Lead", not "Mission Lead".

CURRENT USER:
- Name: ${profile.full_name ?? 'Exonaut'}
- Role: ${role}
- Track: ${profile.track_name ?? profile.track_code ?? 'Unknown'}
- Cohort: ${knowledge.program.cohort?.name ?? 'Batch 2026–2027'}

ROLE CONTEXT:
${(knowledge.roles as Record<string, string>)[role] ?? 'Active program participant.'}

--- PROGRAM KNOWLEDGE BASE ---
${formattedKnowledge}
--- END KNOWLEDGE BASE ---

${realtimeContext ? `--- LIVE DATA ---\n${realtimeContext}\n--- END LIVE DATA ---\n` : ''}

FORMATTING RULES (NO MARKDOWN):
• Use bullet points (•) for lists of items
• Use ALL CAPS for section headers (e.g., TRACKS, BADGES, etc.)
• Add blank lines between sections
• For long descriptions, break into short bullet points
• Use numbered lists (1. 2. 3.) for sequences
• Keep sentences short and scannable
• Never use markdown syntax (**bold**, *italic*, etc.)

Answer clearly and helpfully. Prioritize readability over length. When asked about progress, rankings, or announcements, refer to the live data above. Keep responses under 300 words unless the question requires more detail.`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // 1. Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    // 2. Get user profile + role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name, track_code, cohort_id')
      .eq('id', user.id)
      .single();

    const role      = profile?.role ?? 'exonaut';
    const trackCode = profile?.track_code ?? '';
    const trackName = knowledge.tracks.find(t => t.code === trackCode)?.name ?? trackCode;

    // 3. Parse request
    const { message, conversationId } = await req.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: CORS });
    }

    const convId = conversationId || `conv-${user.id.slice(0, 8)}-${Date.now()}`;

    // 4. Upsert conversation row
    await supabase.from('chatbot_conversations').upsert(
      { id: convId, user_id: user.id, last_message_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    await supabase.from('chatbot_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId);

    // 5. Load last 10 messages as history
    const { data: history } = await supabase
      .from('chatbot_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(10);

    const historyMessages = (history ?? []).reverse();

    // 6. Load real-time data
    // Points: total + breakdown by source_type
    const { data: userPointRows } = await supabase
      .from('point_ledger')
      .select('points, source_type')
      .eq('user_id', user.id);
    const totalPoints = userPointRows?.reduce((sum: number, row: any) => sum + (row.points || 0), 0) ?? 0;
    const pointBreakdown: Record<string, number> = {};
    (userPointRows || []).forEach((row: any) => {
      const src = row.source_type || 'other';
      pointBreakdown[src] = (pointBreakdown[src] || 0) + (row.points || 0);
    });

    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('badge_code, badge_name')
      .eq('user_id', user.id);

    // Leaderboard: aggregate point_ledger per user in cohort
    const { data: cohortProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('cohort_id', profile?.cohort_id);
    const cohortUserIds = (cohortProfiles || []).map((p: any) => p.id);
    const { data: cohortPointRows } = cohortUserIds.length ? await supabase
      .from('point_ledger')
      .select('user_id, points')
      .in('user_id', cohortUserIds) : { data: [] };
    const cohortTotals: Record<string, number> = {};
    (cohortPointRows || []).forEach((row: any) => {
      cohortTotals[row.user_id] = (cohortTotals[row.user_id] || 0) + (row.points || 0);
    });
    const leaderboard = (cohortProfiles || [])
      .map((p: any) => ({ full_name: p.full_name, points: cohortTotals[p.id] || 0 }))
      .sort((a: any, b: any) => b.points - a.points)
      .slice(0, 10);

    const { data: announcements } = await supabase
      .from('announcements')
      .select('title, body, type, author_name')
      .order('created_at', { ascending: false })
      .limit(3);

    // Ritual logs: current week (last 9 days covers Mon–Sun safely)
    const nineAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString();
    const { data: ritualLogs } = await supabase
      .from('ritual_logs')
      .select('ritual_id, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', nineAgo);

    // Kudos received and given
    const { data: kudosReceived } = await supabase
      .from('kudos')
      .select('giver_id, message, created_at')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    const { data: kudosGiven } = await supabase
      .from('kudos')
      .select('receiver_id, message, created_at')
      .eq('giver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Projects: get projects the user is a member of + their open tasks
    const { data: projectMemberships } = await supabase
      .from('project_members')
      .select('project_id, member_role')
      .eq('user_id', user.id);
    const memberProjectIds = (projectMemberships || []).map((m: any) => m.project_id);

    let userProjects: any[] = [];
    let userTasks: any[] = [];
    if (memberProjectIds.length) {
      const [projectsRes, tasksRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, title, status, description')
          .in('id', memberProjectIds)
          .neq('status', 'archived'),
        supabase
          .from('project_tasks')
          .select('id, project_id, title, status, topic, next_step, due_date')
          .in('project_id', memberProjectIds)
          .not('status', 'in', '("done","cancelled")'),
      ]);
      userProjects = projectsRes.data || [];
      userTasks = tasksRes.data || [];
    }

    // Mission submissions
    const { data: missionSubs } = await supabase
      .from('mission_submissions')
      .select('mission_id, mission_title, grade, feedback, submitted_at, graded_at')
      .eq('exonaut_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(10);

    // Format real-time context
    const realtimeContext = formatRealtimeData(
      totalPoints, pointBreakdown, userBadges, leaderboard,
      announcements, ritualLogs, kudosReceived, kudosGiven,
      cohortProfiles || [], userProjects, userTasks, missionSubs || []
    );

    // 7. Build context (fixed + real-time)
    const formattedKnowledge = formatKnowledge(knowledge, trackCode);
    const systemPrompt = buildSystemPrompt(
      role,
      { full_name: profile?.full_name, track_code: trackCode, track_name: trackName },
      formattedKnowledge,
      realtimeContext
    );

    // 8. Build messages array for Groq (OpenAI-compatible format)
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyMessages.map(m => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as const,
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 9. Call Groq API with model fallback chain (smartest → dumbest)
    const GROQ_MODELS = [
      'groq/compound',
      'llama-3.3-70b-versatile',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'qwen/qwen3-32b',
      'llama-3.1-8b-instant',
      'allam-2-7b',
    ];

    let groqData: any = null;

    for (const model of GROQ_MODELS) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 800 }),
      });

      if (groqRes.ok) {
        groqData = await groqRes.json();
        break;
      }

      const errText = await groqRes.text();
      console.error(`Groq model ${model} failed (${groqRes.status}):`, errText);

      // Fall through on rate-limit (429), payload too large (413), or server errors (5xx)
      if (groqRes.status !== 429 && groqRes.status !== 413 && groqRes.status < 500) break;
    }

    if (!groqData) {
      return new Response(
        JSON.stringify({ error: 'AI service unavailable. Please try again later.' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const answer = groqData.choices?.[0]?.message?.content
      ?? 'Sorry, I could not generate a response. Please try again.';

    // 10. Save both messages to DB
    const ts = Date.now();
    await supabase.from('chatbot_messages').insert([
      {
        id:              `msg-u-${ts}`,
        conversation_id: convId,
        user_id:         user.id,
        role:            'user',
        content:         message,
        created_at:      new Date(ts).toISOString(),
      },
      {
        id:              `msg-a-${ts + 1}`,
        conversation_id: convId,
        user_id:         user.id,
        role:            'assistant',
        content:         answer,
        created_at:      new Date(ts + 1).toISOString(),
      },
    ]);

    // 11. Return answer
    return new Response(
      JSON.stringify({ content: answer, conversationId: convId }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Chat function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
