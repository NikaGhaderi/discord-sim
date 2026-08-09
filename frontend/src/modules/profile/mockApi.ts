import { UserProfile, UpdateProfilePayload, PublicProfile } from './api';

const mockProfileDatabase: UserProfile = {
  user_id: 123456,
  username: 'ftm_roosta',
  display_name: 'Fatemeh Roosta',
  avatar_url: 'https://via.placeholder.com/150',
  bio: 'Software Engineer & Frontend Developer',
  allow_group_invitations: true,
};

export const getMyProfile = async (): Promise<UserProfile> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ...mockProfileDatabase });
    }, 200);
  });
};

export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UserProfile> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      Object.assign(mockProfileDatabase, payload);
      resolve({ ...mockProfileDatabase });
    }, 200);
  });
};

export const getPublicProfile = async (
  username: string
): Promise<PublicProfile> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { allow_group_invitations, ...publicData } = mockProfileDatabase;
      resolve({
        ...publicData,
        username,
        display_name: `Public ${username}`,
      });
    }, 200);
  });
};

/**
 * Synthesizes a stable mock public profile per user id (other than the
 * fixed mock "current user"), so repeated lookups in the same session are
 * consistent -- mirroring getPublicProfile's "Public {username}" pattern.
 */
const syntheticProfilesById = new Map<number, PublicProfile>();

const syntheticProfileFor = (userId: number): PublicProfile => {
  if (userId === mockProfileDatabase.user_id) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { allow_group_invitations, ...publicData } = mockProfileDatabase;
    return publicData;
  }
  let profile = syntheticProfilesById.get(userId);
  if (!profile) {
    profile = {
      user_id: userId,
      username: `mock_user_${userId}`,
      display_name: `Mock User ${userId}`,
      avatar_url: null,
      bio: '',
    };
    syntheticProfilesById.set(userId, profile);
  }
  return profile;
};

export const listPublicProfilesByIds = async (
  userIds: number[]
): Promise<PublicProfile[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(userIds.map(syntheticProfileFor));
    }, 200);
  });
};