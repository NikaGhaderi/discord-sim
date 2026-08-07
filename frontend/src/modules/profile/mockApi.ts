import { UserProfile, UpdateProfilePayload } from './api';

const mockProfileDatabase: UserProfile = {
  user_id: 'usr_123456',
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
): Promise<Omit<UserProfile, 'allow_group_invitations'>> => {
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