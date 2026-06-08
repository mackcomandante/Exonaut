-- Allow OAuth/email users to create their own profile row after authentication.
-- Google OAuth returns a valid auth.users row, but the app still needs
-- public.user_profiles so routing, roles, and profile UI can load.

drop policy if exists "user_profiles_insert_self" on public.user_profiles;

create policy "user_profiles_insert_self"
on public.user_profiles
for insert
with check (
  id = auth.uid()
  and coalesce(role, 'exonaut') = 'exonaut'
);

