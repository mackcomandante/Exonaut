import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function deleteWhere(supabase: ReturnType<typeof createClient>, table: string, column: string, userId: string) {
  const { error } = await supabase.from(table).delete().eq(column, userId);
  if (error && error.code !== '42P01' && error.code !== '42703') {
    console.warn(`Could not delete ${table}.${column}:`, error.message);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const actor = authData?.user;
    if (authError || !actor) return json({ error: 'Unauthorized' }, 401);

    const { data: actorProfile, error: actorError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', actor.id)
      .single();
    if (actorError || !['admin', 'commander'].includes(actorProfile?.role)) {
      return json({ error: 'Forbidden' }, 403);
    }

    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') return json({ error: 'Missing userId' }, 400);
    if (userId === actor.id) return json({ error: 'You cannot delete your own signed-in account.' }, 400);

    const cleanup: Array<[string, string]> = [
      ['point_ledger', 'user_id'],
      ['mission_submissions', 'exonaut_id'],
      ['manual_activity_credits', 'user_id'],
      ['ritual_logs', 'user_id'],
      ['kudos', 'giver_id'],
      ['kudos', 'receiver_id'],
      ['notifications', 'to_user_id'],
      ['message_participants', 'user_id'],
      ['messages', 'sender_id'],
      ['chatbot_messages', 'user_id'],
      ['chatbot_conversations', 'user_id'],
      ['community_comments', 'author_id'],
      ['community_post_likes', 'user_id'],
      ['community_posts', 'author_id'],
      ['project_task_submissions', 'submitted_by'],
      ['project_task_assignees', 'user_id'],
      ['project_members', 'user_id'],
      ['recruitment_referrals', 'submitted_by'],
      ['crown_assignments', 'user_id'],
      ['user_badges', 'user_id'],
    ];

    for (const [table, column] of cleanup) {
      await deleteWhere(supabase, table, column, userId);
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) return json({ error: deleteError.message }, 500);
    await deleteWhere(supabase, 'user_profiles', 'id', userId);

    return json({ ok: true, userId });
  } catch (err) {
    console.error('Delete user error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
