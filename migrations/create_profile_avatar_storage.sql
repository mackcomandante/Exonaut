-- Profile avatar storage for all roles.
-- Run after migrations/create_user_profiles_roles.sql.

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "profile_avatars_read_public" ON storage.objects;
CREATE POLICY "profile_avatars_read_public"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "profile_avatars_upload_own" ON storage.objects;
CREATE POLICY "profile_avatars_upload_own"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "profile_avatars_update_own" ON storage.objects;
CREATE POLICY "profile_avatars_update_own"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "profile_avatars_delete_own" ON storage.objects;
CREATE POLICY "profile_avatars_delete_own"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
