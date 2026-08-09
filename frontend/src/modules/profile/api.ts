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

/** Shared contract for both implementations (real and mock). */
export interface ProfileApi {
  getMyProfile(): Promise<UserProfile>;
  updateProfile(payload: UpdateProfilePayload): Promise<UserProfile>;
  getPublicProfile(
    username: string
  ): Promise<Omit<UserProfile, 'allow_group_invitations'>>;
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
): Promise<Omit<UserProfile, 'allow_group_invitations'>> => {
  const response = await apiClient.get<Omit<UserProfile, 'allow_group_invitations'>>(
    `/api/users/${username}/profile/`
  );
  return response.data;
};