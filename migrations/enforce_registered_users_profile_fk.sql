-- Migration: enforce foreign key from registered_users.user_id to user_profiles.id
-- Run in Supabase SQL Editor or via migration runner.

BEGIN;

-- Ensure the user_id column is uuid typed (best-effort; will fail if values are not castable)
ALTER TABLE IF EXISTS public.registered_users
  ALTER COLUMN user_id TYPE uuid USING (user_id::uuid);

-- Remove any existing constraint with the same name, then add the FK constraint.
ALTER TABLE IF EXISTS public.registered_users
  DROP CONSTRAINT IF EXISTS fk_registered_users_user_profile;

ALTER TABLE IF EXISTS public.registered_users
  ADD CONSTRAINT fk_registered_users_user_profile
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

COMMIT;

-- Note: If your registered_users table uses a different column name (e.g., "user_id" vs "id"),
-- adjust the column name before running. This migration enforces referential integrity so
-- every registered user row must have a matching row in public.user_profiles.
