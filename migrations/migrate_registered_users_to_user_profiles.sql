-- Migration: copy rows from registered_users -> user_profiles
-- Adds any registered users that don't already exist in user_profiles (by email or id).

-- NOTE: `user_profiles.id` has a foreign key to `users.id`.
-- To avoid FK violations we first ensure there is a corresponding row in `users`.
DO $$
DECLARE
  users_regclass text := NULL;
BEGIN
  -- choose existing users table: prefer auth.users (Supabase), fall back to public.users
  IF to_regclass('auth.users') IS NOT NULL THEN
    users_regclass := 'auth.users';
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    users_regclass := 'public.users';
  END IF;

  IF users_regclass IS NULL THEN
    RAISE NOTICE 'No users table found at auth.users or public.users - skipping users creation and profile import.';
    RETURN;
  END IF;

  -- Ensure `pgcrypto` for `gen_random_uuid()` (no-op if already present)
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto';

  -- 1) For registered_users rows with a valid UUID user_id, create a `users` row (if missing)
  EXECUTE format(
    'INSERT INTO %s (id, email, created_at)
     SELECT ru.user_id::uuid, ru.email, NOW()
     FROM public.registered_users ru
     WHERE ru.user_id IS NOT NULL
       AND ru.user_id ~ %L
       AND NOT EXISTS (SELECT 1 FROM %s u WHERE u.id::text = ru.user_id)'
  , users_regclass, '^[0-9a-fA-F\-]{36}$', users_regclass);

  -- 2) For registered_users rows without a valid user_id, create a `users` row using a generated UUID
  EXECUTE format(
    'INSERT INTO %s (id, email, created_at)
     SELECT gen_random_uuid(), ru.email, NOW()
     FROM public.registered_users ru
     WHERE (ru.user_id IS NULL OR NOT (ru.user_id ~ %L))
       AND NOT EXISTS (SELECT 1 FROM %s u WHERE u.email = ru.email)'
  , users_regclass, '^[0-9a-fA-F\-]{36}$', users_regclass);

  -- 3) Now insert into user_profiles using the canonical users.id (matched by email or user_id)
  EXECUTE format(
    'INSERT INTO public.user_profiles (id, email, full_name, role, cohort_id, created_at, updated_at)
     SELECT u.id, ru.email, ru.name, ru.role, NULL, NOW(), NOW()
     FROM public.registered_users ru
     JOIN %s u ON (
       (ru.user_id IS NOT NULL AND ru.user_id ~ %L AND u.id::text = ru.user_id)
       OR u.email = ru.email
     )
     WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = u.id OR up.email = ru.email)'
  , users_regclass, '^[0-9a-fA-F\-]{36}$');
END$$;

-- Down migration (optional): this will remove rows that match emails from registered_users
-- Use with caution. Uncomment to enable rollback behavior.
--
-- BEGIN;
-- DELETE FROM public.user_profiles up
-- WHERE EXISTS (
--   SELECT 1 FROM public.registered_users ru WHERE ru.email = up.email
-- );
-- COMMIT;
