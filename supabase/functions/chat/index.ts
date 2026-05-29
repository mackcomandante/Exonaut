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
  userBadges: Array<{ badge_code: string; badge_name: string }>,
  leaderboard: Array<{ user_id: string; users: { full_name: string }; points: number }>,
  announcements: Array<{ title: string; body: string; type: string; author_name: string }>
): string {
  const lines: string[] = [];

  lines.push('=== YOUR PROGRESS ===');
  lines.push(`• Total Points: ${totalPoints}`);
  if (userBadges && userBadges.length > 0) {
    lines.push(`• Badges Earned (${userBadges.length}): ${userBadges.map(b => b.badge_name).join(', ')}`);
  } else {
    lines.push('• Badges Earned: None yet');
  }

  lines.push('\n=== LEADERBOARD (TOP 10) ===');
  if (leaderboard && leaderboard.length > 0) {
    leaderboard.forEach((entry, idx) => {
      lines.push(`${idx + 1}. ${entry.users.full_name}: ${entry.points} points`);
    });
  } else {
    lines.push('No leaderboard data available');
  }

  lines.push('\n=== RECENT ANNOUNCEMENTS ===');
  if (announcements && announcements.length > 0) {
    announcements.forEach(ann => {
      lines.push(`• [${ann.type.toUpperCase()}] ${ann.title} — ${ann.author_name}`);
      lines.push(`  ${ann.body.substring(0, 100)}...`);
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

    // 6. Load real-time data (Phase 5)
    const { data: userPoints } = await supabase
      .from('point_ledger')
      .select('points')
      .eq('user_id', user.id);
    const totalPoints = userPoints?.reduce((sum, row) => sum + (row.points || 0), 0) ?? 0;

    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('badge_code, badge_name')
      .eq('user_id', user.id);

    const { data: leaderboard } = await supabase
      .from('point_ledger')
      .select('user_id, users!inner(full_name), points')
      .eq('users.cohort_id', profile?.cohort_id)
      .order('points', { ascending: false })
      .limit(10);

    const { data: announcements } = await supabase
      .from('announcements')
      .select('title, body, type, author_name')
      .order('created_at', { ascending: false })
      .limit(3);

    // Format real-time context
    const realtimeContext = formatRealtimeData(totalPoints, userBadges, leaderboard, announcements);

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

    // 9. Call Groq API (OpenAI-compatible)
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', errText);
      return new Response(
        JSON.stringify({ error: 'AI service unavailable. Please try again.' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqRes.json();
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
