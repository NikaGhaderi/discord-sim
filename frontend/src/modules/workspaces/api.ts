import { apiClient } from '@infrastructure/apiClient';
import {
  Channel,
  ChannelMember,
  ChannelPermission,
  ChannelUpdateResponse,
  CreateRolePayload,
  Role,
  RoleAssignment,
  Topic,
  UpdateRolePayload,
} from './types';

/** Shared contract for both implementations (real and mock). */
export interface WorkspacesApi {
  listChannels(): Promise<Channel[]>;
  getChannel(channelId: number): Promise<Channel>;
  createChannel(name: string): Promise<Channel>;
  updateChannel(channelId: number, name: string): Promise<ChannelUpdateResponse>;
  deleteChannel(channelId: number): Promise<void>;
  joinChannel(channelId: number, nicknameInChannel?: string): Promise<ChannelMember>;
  /**
   * inviteToken is Channel.invite_token. Separate from `joinChannel` --
   * both endpoints are real: this one is for joining via a shared invite
   * link without already knowing the channel_id.
   */
  joinChannelByInviteToken(
    inviteToken: string,
    nicknameInChannel?: string
  ): Promise<ChannelMember>;
  leaveChannel(channelId: number): Promise<void>;

  listMembers(channelId: number): Promise<ChannelMember[]>;
  /** Effective PermissionCode values the current user holds in this channel. */
  getMyPermissions(channelId: number): Promise<ChannelPermission[]>;
  /** Self-service only -- the backend rejects renaming another member. */
  updateMemberNickname(
    channelId: number,
    userId: number,
    nicknameInChannel: string
  ): Promise<ChannelMember>;
  kickMember(channelId: number, userId: number): Promise<void>;

  listRoles(channelId: number): Promise<Role[]>;
  createRole(channelId: number, payload: CreateRolePayload): Promise<Role>;
  updateRole(channelId: number, roleId: number, payload: UpdateRolePayload): Promise<Role>;
  deleteRole(channelId: number, roleId: number): Promise<void>;
  assignRole(channelId: number, userId: number, roleId: number): Promise<RoleAssignment>;

  listTopics(channelId: number): Promise<Topic[]>;
  getTopic(channelId: number, topicId: number): Promise<Topic>;
  createTopic(channelId: number, title: string): Promise<Topic>;
  deleteTopic(channelId: number, topicId: number): Promise<void>;
}

const ENDPOINTS = {
  channels: '/api/channels/',
  channel: (channelId: number) => `/api/channels/${channelId}/`,
  channelJoin: (channelId: number) => `/api/channels/${channelId}/join/`,
  channelLeave: (channelId: number) => `/api/channels/${channelId}/leave/`,
  channelInviteJoin: (inviteToken: string) =>
    `/api/channels/invite/${inviteToken}/join/`,
  members: (channelId: number) => `/api/channels/${channelId}/members/`,
  myPermissions: (channelId: number) => `/api/channels/${channelId}/my-permissions/`,
  member: (channelId: number, userId: number) =>
    `/api/channels/${channelId}/members/${userId}/`,
  memberRoles: (channelId: number, userId: number) =>
    `/api/channels/${channelId}/members/${userId}/roles/`,
  roles: (channelId: number) => `/api/channels/${channelId}/roles/`,
  role: (channelId: number, roleId: number) =>
    `/api/channels/${channelId}/roles/${roleId}/`,
  topics: (channelId: number) => `/api/channels/${channelId}/topics/`,
  topic: (channelId: number, topicId: number) =>
    `/api/channels/${channelId}/topics/${topicId}/`,
} as const;

export const listChannels = async (): Promise<Channel[]> => {
  const response = await apiClient.get<Channel[]>(ENDPOINTS.channels);
  return response.data;
};

export const getChannel = async (channelId: number): Promise<Channel> => {
  const response = await apiClient.get<Channel>(ENDPOINTS.channel(channelId));
  return response.data;
};

export const createChannel = async (name: string): Promise<Channel> => {
  const response = await apiClient.post<Channel>(ENDPOINTS.channels, { name });
  return response.data;
};

export const updateChannel = async (
  channelId: number,
  name: string
): Promise<ChannelUpdateResponse> => {
  const response = await apiClient.patch<ChannelUpdateResponse>(
    ENDPOINTS.channel(channelId),
    { name }
  );
  return response.data;
};

export const deleteChannel = async (channelId: number): Promise<void> => {
  await apiClient.delete(ENDPOINTS.channel(channelId));
};

export const joinChannel = async (
  channelId: number,
  nicknameInChannel?: string
): Promise<ChannelMember> => {
  const response = await apiClient.post<ChannelMember>(
    ENDPOINTS.channelJoin(channelId),
    nicknameInChannel ? { nickname_in_channel: nicknameInChannel } : {}
  );
  return response.data;
};

export const joinChannelByInviteToken = async (
  inviteToken: string,
  nicknameInChannel?: string
): Promise<ChannelMember> => {
  const response = await apiClient.post<ChannelMember>(
    ENDPOINTS.channelInviteJoin(inviteToken),
    nicknameInChannel ? { nickname_in_channel: nicknameInChannel } : {}
  );
  return response.data;
};

export const leaveChannel = async (channelId: number): Promise<void> => {
  await apiClient.delete(ENDPOINTS.channelLeave(channelId));
};

export const listMembers = async (channelId: number): Promise<ChannelMember[]> => {
  const response = await apiClient.get<ChannelMember[]>(ENDPOINTS.members(channelId));
  return response.data;
};

export const getMyPermissions = async (
  channelId: number
): Promise<ChannelPermission[]> => {
  const response = await apiClient.get<{ permissions: ChannelPermission[] }>(
    ENDPOINTS.myPermissions(channelId)
  );
  return response.data.permissions;
};

export const updateMemberNickname = async (
  channelId: number,
  userId: number,
  nicknameInChannel: string
): Promise<ChannelMember> => {
  const response = await apiClient.patch<ChannelMember>(
    ENDPOINTS.member(channelId, userId),
    { nickname_in_channel: nicknameInChannel }
  );
  return response.data;
};

export const kickMember = async (channelId: number, userId: number): Promise<void> => {
  await apiClient.delete(ENDPOINTS.member(channelId, userId));
};

export const listRoles = async (channelId: number): Promise<Role[]> => {
  const response = await apiClient.get<Role[]>(ENDPOINTS.roles(channelId));
  return response.data;
};

export const createRole = async (
  channelId: number,
  payload: CreateRolePayload
): Promise<Role> => {
  const response = await apiClient.post<Role>(ENDPOINTS.roles(channelId), payload);
  return response.data;
};

export const updateRole = async (
  channelId: number,
  roleId: number,
  payload: UpdateRolePayload
): Promise<Role> => {
  const response = await apiClient.patch<Role>(
    ENDPOINTS.role(channelId, roleId),
    payload
  );
  return response.data;
};

export const deleteRole = async (channelId: number, roleId: number): Promise<void> => {
  await apiClient.delete(ENDPOINTS.role(channelId, roleId));
};

export const assignRole = async (
  channelId: number,
  userId: number,
  roleId: number
): Promise<RoleAssignment> => {
  const response = await apiClient.post<RoleAssignment>(
    ENDPOINTS.memberRoles(channelId, userId),
    { role_id: roleId }
  );
  return response.data;
};

export const listTopics = async (channelId: number): Promise<Topic[]> => {
  const response = await apiClient.get<Topic[]>(ENDPOINTS.topics(channelId));
  return response.data;
};

export const getTopic = async (channelId: number, topicId: number): Promise<Topic> => {
  const response = await apiClient.get<Topic>(ENDPOINTS.topic(channelId, topicId));
  return response.data;
};

export const createTopic = async (
  channelId: number,
  title: string
): Promise<Topic> => {
  const response = await apiClient.post<Topic>(ENDPOINTS.topics(channelId), {
    title,
  });
  return response.data;
};

export const deleteTopic = async (
  channelId: number,
  topicId: number
): Promise<void> => {
  await apiClient.delete(ENDPOINTS.topic(channelId, topicId));
};
