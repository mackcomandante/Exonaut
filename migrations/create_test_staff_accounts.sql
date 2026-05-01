-- Test account setup for Supabase.
--
-- First create these users in Supabase Dashboard > Authentication > Users:
--
--   exonaut.test@exoasia.hub    / ExonautTest123!
--   lead.test@exoasia.hub       / ExonautTest123!
--   commander.test@exoasia.hub  / ExonautTest123!
--   admin.test@exoasia.hub      / ExonautTest123!
--
-- Then run this in Supabase SQL Editor to force the matching app profiles.
-- This assumes migrations/create_user_profiles_roles.sql has already been run.

WITH desired_accounts(email, full_name, role, cohort_id, track_code) AS (
  VALUES
    ('exonaut.test@exoasia.hub', 'Test Exonaut', 'exonaut', 'c2627', 'AIS'),
    ('lead.test@exoasia.hub', 'Test Mission Lead', 'lead', 'c2627', 'AIS'),
    ('commander.test@exoasia.hub', 'Test Mission Commander', 'commander', 'c2627', NULL),
    ('admin.test@exoasia.hub', 'Test Platform Admin', 'admin', 'c2627', NULL)
)
INSERT INTO public.user_profiles (id, email, full_name, role, cohort_id, track_code)
SELECT
  auth.users.id,
  desired_accounts.email,
  desired_accounts.full_name,
  desired_accounts.role,
  desired_accounts.cohort_id,
  desired_accounts.track_code
FROM desired_accounts
JOIN auth.users ON lower(auth.users.email) = lower(desired_accounts.email)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  cohort_id = EXCLUDED.cohort_id,
  track_code = EXCLUDED.track_code;

-- Verify the rows exist and have the expected roles.
SELECT id, email, full_name, role, cohort_id, track_code
FROM public.user_profiles
WHERE email IN (
  'exonaut.test@exoasia.hub',
  'lead.test@exoasia.hub',
  'commander.test@exoasia.hub',
  'admin.test@exoasia.hub'
)
ORDER BY role;
