import { apiClient } from '@infrastructure/apiClient';

export interface UserProfile {
  user_id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  allow_group_invitations?: boolean;
}

export interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  allow_group_invitations?: boolean;
}

export type PublicProfile = Omit<UserProfile, 'allow_group_invitations'>;

/** Shared contract for both implementations (real and mock). */
export interface ProfileApi {
  getMyProfile(): Promise<UserProfile>;
  updateProfile(payload: UpdateProfilePayload): Promise<UserProfile>;
  getPublicProfile(username: string): Promise<PublicProfile>;
  /**
   * Bulk-resolves raw user ids to public profiles. Backs the username
   * displays in private_spaces (DM participants, group members, invitation
   * senders) -- those only ever carry a user_id, and before this endpoint
   * existed there was no way to turn that into a username at all.
   * Ids that don't resolve to a real user are simply absent from the
   * result, not errored.
   */
  listPublicProfilesByIds(userIds: number[]): Promise<PublicProfile[]>;
  uploadAvatar(file: File): Promise<UserProfile>;
}

export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/api/users/me/profile/');
  return response.data;
};

export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UserProfile> => {
  const response = await apiClient.patch<UserProfile>('/api/users/me/profile/', payload);
  return response.data;
};

export const getPublicProfile = async (
  username: string
): Promise<PublicProfile> => {
  const response = await apiClient.get<PublicProfile>(
    `/api/users/${username}/profile/`
  );
  return response.data;
};

export const listPublicProfilesByIds = async (
  userIds: number[]
): Promise<PublicProfile[]> => {
  if (userIds.length === 0) {
    return [];
  }
  const response = await apiClient.get<PublicProfile[]>('/api/users/by-ids/', {
    params: { ids: userIds.join(',') },
  });
  return response.data;
};

export const uploadAvatar = async (file: File): Promise<UserProfile> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await apiClient.post<UserProfile>('/api/users/me/avatar/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};