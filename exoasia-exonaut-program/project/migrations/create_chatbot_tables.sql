-- Chatbot conversation and message storage.
-- Run in Supabase SQL editor after the existing migrations.

-- One row per conversation session per user
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id            text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

-- One row per message (user or assistant)
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id              text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast history lookup
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation
  ON public.chatbot_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user
  ON public.chatbot_conversations(user_id, last_message_at DESC);

-- RLS: users can only read/write their own rows
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users manage own conversations"
  ON public.chatbot_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own messages" ON public.chatbot_messages;
CREATE POLICY "Users manage own messages"
  ON public.chatbot_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
