import { apiClient } from '@infrastructure/apiClient';

export interface UserProfile {
  user_id: string;
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

export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/api/profile/me/');
  return response.data;
};

export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UserProfile> => {
  const response = await apiClient.patch<UserProfile>('/api/profile/me/', payload);
  return response.data;
};

export const getPublicProfile = async (
  username: string
): Promise<Omit<UserProfile, 'allow_group_invitations'>> => {
  const response = await apiClient.get<Omit<UserProfile, 'allow_group_invitations'>>(
    `/api/profile/${username}/`
  );
  return response.data;
};