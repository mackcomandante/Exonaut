// Supabase-backed current profile helpers.

const PROFILE_SELECT = [
  'id', 'email', 'full_name', 'role', 'cohort_id', 'track_code',
  'bio', 'linkedin_url', 'data_room_url', 'school', 'expertise', 'avatar_url',
  'approval_status', 'approval_reason', 'requested_role', 'requested_cohort_id',
  'requested_track_code', 'email_confirmed_at', 'approved_at', 'rejected_at',
  'created_at', 'updated_at',
].join(', ');

function normalizedRequestedRole(role) {
  return ['exonaut', 'commander', 'admin'].includes(role) ? role : 'exonaut';
}

function profileToClient(row, user) {
  const metadata = (user && user.user_metadata) || {};
  const fullName = (row && row.full_name) || metadata.full_name || metadata.name || (row && row.email) || (user && user.email) || ME.name;
  const approvalStatus = (row && row.approval_status) || 'active';
  return {
    id: (row && row.id) || (user && user.id) || ME_ID,
    email: (row && row.email) || (user && user.email) || '',
    fullName,
    role: (row && row.role) || metadata.role || 'exonaut',
    cohortId: (row && row.cohort_id) || ME.cohort || 'c2627',
    trackCode: (row && row.track_code) || ME.track || 'AIS',
    bio: (row && row.bio) || '',
    linkedinUrl: (row && row.linkedin_url) || '',
    dataRoomUrl: (row && row.data_room_url) || '',
    school: (row && row.school) || '',
    expertise: (row && row.expertise) || '',
    avatarUrl: (row && row.avatar_url) || '',
    approvalStatus,
    approvalReason: (row && row.approval_reason) || '',
    requestedRole: (row && row.requested_role) || metadata.role || '',
    requestedCohortId: (row && row.requested_cohort_id) || metadata.cohort_id || '',
    requestedTrackCode: (row && row.requested_track_code) || metadata.track_code || '',
    emailConfirmedAt: (row && row.email_confirmed_at) || (user && (user.email_confirmed_at || user.confirmed_at)) || '',
    approvedAt: (row && row.approved_at) || '',
    rejectedAt: (row && row.rejected_at) || '',
    createdAt: (row && row.created_at) || '',
    updatedAt: (row && row.updated_at) || '',
  };
}

function setProfileDirectory(profiles) {
  window.__profileDirectory = Array.isArray(profiles) ? profiles : [];
}

function useCurrentUserProfile() {
  const [profile, setProfile] = React.useState(() => ({
    id: ME_ID,
    email: '',
    fullName: ME.name,
    role: 'exonaut',
    cohortId: ME.cohort || 'c2627',
    trackCode: ME.track || 'AIS',
    bio: '',
    linkedinUrl: '',
    dataRoomUrl: '',
    school: '',
    expertise: '',
    avatarUrl: '',
  }));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const refresh = React.useCallback(async () => {
    if (!window.__db || !window.__db.auth) return profile;
    setLoading(true);
    setError('');
    try {
      const sessionResult = await window.__db.auth.getSession();
      const user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
      if (!user) return profile;

      const { data, error: profileError } = await window.__db
        .from('user_profiles')
        .select(PROFILE_SELECT)
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      let row = data;
      if (!row) {
        const metadata = user.user_metadata || {};
        const requestedCohort = metadata.cohort_id || ME.cohort || 'c2627';
        const requestedTrack = metadata.track_code || ME.track || 'AIS';
        const insertResult = await window.__db
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            full_name: metadata.full_name || metadata.name || user.email || 'Exonaut',
            role: 'exonaut',
            cohort_id: requestedCohort,
            track_code: requestedTrack,
            approval_status: 'pending_approval',
            requested_role: normalizedRequestedRole(metadata.role),
            requested_cohort_id: requestedCohort,
            requested_track_code: requestedTrack,
            email_confirmed_at: user.email_confirmed_at || user.confirmed_at || null,
          }, { onConflict: 'id' })
          .select(PROFILE_SELECT)
          .single();
        if (insertResult.error) throw insertResult.error;
        row = insertResult.data;
      }

      const nextProfile = profileToClient(row, user);
      ME.id = nextProfile.id;
      ME.name = nextProfile.fullName;
      ME.track = nextProfile.trackCode;
      ME.cohort = nextProfile.cohortId;
      const existing = Array.isArray(window.__profileDirectory) ? window.__profileDirectory : [];
      setProfileDirectory([nextProfile, ...existing.filter(p => p.id !== nextProfile.id)]);
      setProfile(nextProfile);
      return nextProfile;
    } catch (err) {
      setError((err && err.message) || 'Could not load profile.');
      return profile;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    async function load() {
      const nextProfile = await refresh();
      if (!active || !nextProfile) return;
    }
    load();
    return () => { active = false; };
  }, [refresh]);

  const save = React.useCallback(async (patch) => {
    if (!window.__db || !window.__db.auth) throw new Error('Supabase is not loaded.');
    const sessionResult = await window.__db.auth.getSession();
    const user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
    if (!user) throw new Error('You must be signed in to update your profile.');

    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'fullName')) update.full_name = patch.fullName;
    if (Object.prototype.hasOwnProperty.call(patch, 'trackCode')) update.track_code = patch.trackCode;
    if (Object.prototype.hasOwnProperty.call(patch, 'cohortId')) update.cohort_id = patch.cohortId;
    if (Object.prototype.hasOwnProperty.call(patch, 'bio')) update.bio = patch.bio;
    if (Object.prototype.hasOwnProperty.call(patch, 'linkedinUrl')) update.linkedin_url = patch.linkedinUrl;
    if (Object.prototype.hasOwnProperty.call(patch, 'dataRoomUrl')) update.data_room_url = patch.dataRoomUrl;
    if (Object.prototype.hasOwnProperty.call(patch, 'school')) update.school = patch.school;
    if (Object.prototype.hasOwnProperty.call(patch, 'expertise')) update.expertise = patch.expertise;
    if (Object.prototype.hasOwnProperty.call(patch, 'avatarUrl')) update.avatar_url = patch.avatarUrl;

    const { data, error: updateError } = await window.__db
      .from('user_profiles')
      .update(update)
      .eq('id', user.id)
      .select(PROFILE_SELECT)
      .single();
    if (updateError) throw updateError;

    const nextProfile = profileToClient(data, user);
    ME.name = nextProfile.fullName;
    ME.track = nextProfile.trackCode;
    ME.cohort = nextProfile.cohortId;
    const existing = Array.isArray(window.__profileDirectory) ? window.__profileDirectory : [];
    setProfileDirectory([nextProfile, ...existing.filter(p => p.id !== nextProfile.id)]);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  return { profile, loading, error, refresh, save };
}

async function uploadProfileAvatar(file) {
  if (!window.__db || !window.__db.auth) throw new Error('Supabase is not loaded.');
  if (!file) return '';
  if (!String(file.type || '').startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 3 * 1024 * 1024) throw new Error('Profile photo must be 3MB or smaller.');

  const sessionResult = await window.__db.auth.getSession();
  const user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
  if (!user) throw new Error('You must be signed in to upload a profile photo.');

  const ext = (file.name || 'avatar.png').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await window.__db.storage
    .from('profile-avatars')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
  if (error) throw error;

  const { data } = window.__db.storage.from('profile-avatars').getPublicUrl(path);
  return data?.publicUrl || '';
}

function useUserProfiles() {
  const [profiles, setProfiles] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const refresh = React.useCallback(async () => {
    if (!window.__db) return [];
    setLoading(true);
    setError('');
    try {
      const { data, error: profilesError } = await window.__db
        .from('user_profiles')
        .select(PROFILE_SELECT)
        .order('created_at', { ascending: true });
      if (profilesError) throw profilesError;
      const nextProfiles = (data || []).map(row => profileToClient(row, null));
      setProfileDirectory(nextProfiles);
      setProfiles(nextProfiles);
      return nextProfiles;
    } catch (err) {
      setError((err && err.message) || 'Could not load profiles.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const updateProfile = React.useCallback(async (id, patch) => {
    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'fullName')) update.full_name = patch.fullName;
    if (Object.prototype.hasOwnProperty.call(patch, 'role')) update.role = patch.role;
    if (Object.prototype.hasOwnProperty.call(patch, 'cohortId')) update.cohort_id = patch.cohortId;
    if (Object.prototype.hasOwnProperty.call(patch, 'trackCode')) update.track_code = patch.trackCode;
    if (Object.prototype.hasOwnProperty.call(patch, 'bio')) update.bio = patch.bio;
    if (Object.prototype.hasOwnProperty.call(patch, 'linkedinUrl')) update.linkedin_url = patch.linkedinUrl;
    if (Object.prototype.hasOwnProperty.call(patch, 'dataRoomUrl')) update.data_room_url = patch.dataRoomUrl;
    if (Object.prototype.hasOwnProperty.call(patch, 'school')) update.school = patch.school;
    if (Object.prototype.hasOwnProperty.call(patch, 'expertise')) update.expertise = patch.expertise;
    if (Object.prototype.hasOwnProperty.call(patch, 'avatarUrl')) update.avatar_url = patch.avatarUrl;
    if (Object.prototype.hasOwnProperty.call(patch, 'approvalStatus')) update.approval_status = patch.approvalStatus;
    if (Object.prototype.hasOwnProperty.call(patch, 'approvalReason')) update.approval_reason = patch.approvalReason;
    if (Object.prototype.hasOwnProperty.call(patch, 'requestedRole')) update.requested_role = patch.requestedRole;
    if (Object.prototype.hasOwnProperty.call(patch, 'requestedCohortId')) update.requested_cohort_id = patch.requestedCohortId;
    if (Object.prototype.hasOwnProperty.call(patch, 'requestedTrackCode')) update.requested_track_code = patch.requestedTrackCode;
    if (Object.prototype.hasOwnProperty.call(patch, 'emailConfirmedAt')) update.email_confirmed_at = patch.emailConfirmedAt;
    if (Object.prototype.hasOwnProperty.call(patch, 'approvedAt')) update.approved_at = patch.approvedAt;
    if (Object.prototype.hasOwnProperty.call(patch, 'approvedBy')) update.approved_by = patch.approvedBy;
    if (Object.prototype.hasOwnProperty.call(patch, 'rejectedAt')) update.rejected_at = patch.rejectedAt;
    if (Object.prototype.hasOwnProperty.call(patch, 'rejectedBy')) update.rejected_by = patch.rejectedBy;

    const { data, error: updateError } = await window.__db
      .from('user_profiles')
      .update(update)
      .eq('id', id)
      .select(PROFILE_SELECT)
      .single();
    if (updateError) throw updateError;

    const nextProfile = profileToClient(data, null);
    const baseProfiles = profiles.some(p => p.id === id) ? profiles : [nextProfile, ...profiles];
    const nextProfiles = baseProfiles.map(p => p.id === id ? nextProfile : p);
    setProfileDirectory(nextProfiles);
    setProfiles(nextProfiles);
    return nextProfile;
  }, [profiles]);

  const deleteProfile = React.useCallback(async (id) => {
    if (!window.__db) throw new Error('Supabase is not loaded.');
    if (!id) throw new Error('Missing user id.');

    let result = null;
    try {
      const { data, error: deleteError } = await window.__db.functions.invoke('delete-user', {
        body: { userId: id },
      });
      if (deleteError) throw deleteError;
      if (data?.error) throw new Error(data.error);
      result = data || { ok: true };
    } catch (err) {
      const message = err?.message || String(err || '');
      const functionUnreachable = /Failed to send a request to the Edge Function|FunctionsFetchError/i.test(message);
      if (!functionUnreachable) throw err;

      const { error: profileDeleteError } = await window.__db
        .from('user_profiles')
        .delete()
        .eq('id', id);
      if (profileDeleteError) {
        throw new Error(profileDeleteError.message || 'Could not delete profile row.');
      }

      result = {
        ok: true,
        profileOnly: true,
        warning: 'Profile row deleted, but the Supabase Auth user remains because the delete-user Edge Function is not deployed or reachable.',
      };
    }

    const nextProfiles = profiles.filter(p => p.id !== id);
    setProfileDirectory(nextProfiles);
    setProfiles(nextProfiles);
    return result;
  }, [profiles]);

  return { profiles, loading, error, refresh, updateProfile, deleteProfile };
}

Object.assign(window, { useCurrentUserProfile, useUserProfiles, uploadProfileAvatar });
