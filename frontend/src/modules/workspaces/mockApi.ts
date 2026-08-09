import {
  Channel,
  ChannelMember,
  ChannelUpdateResponse,
  CreateRolePayload,
  Role,
  RoleAssignment,
  Topic,
  UpdateRolePayload,
} from './types';

const now = () => new Date().toISOString();

const MOCK_CHANNEL: Channel = {
  channel_id: 1,
  name: 'Sharif SWE Project',
  creator_id: 15,
  default_topic_id: 1,
  created_at: '2026-06-19T14:30:00Z',
  invite_token: 'mock-invite-token',
};

const MOCK_ROLE: Role = {
  role_id: 3,
  channel_id: 1,
  name: 'Moderator',
  permissions: ['DELETE_MESSAGES', 'MANAGE_TOPICS', 'KICK_MEMBERS', 'SEND_MEDIA'],
};

const MOCK_MEMBER: ChannelMember = {
  channel_id: 1,
  user_id: 42,
  nickname_in_channel: 'Sprint Master',
  joined_at: '2026-06-19T14:45:00Z',
};

const MOCK_TOPIC: Topic = {
  topic_id: 5,
  channel_id: 1,
  title: 'general',
  created_at: '2026-06-19T15:10:00Z',
};

export const listChannels = async (): Promise<Channel[]> => {
  return Promise.resolve([MOCK_CHANNEL]);
};

export const getChannel = async (channelId: number): Promise<Channel> => {
  return Promise.resolve({ ...MOCK_CHANNEL, channel_id: channelId });
};

export const createChannel = async (name: string): Promise<Channel> => {
  return Promise.resolve({ ...MOCK_CHANNEL, name, created_at: now() });
};

export const updateChannel = async (
  channelId: number,
  name: string
): Promise<ChannelUpdateResponse> => {
  return Promise.resolve({ channel_id: channelId, name });
};

export const deleteChannel = async (_channelId: number): Promise<void> => {
  return Promise.resolve();
};

export const joinChannel = async (
  channelId: number,
  nicknameInChannel?: string
): Promise<ChannelMember> => {
  return Promise.resolve({
    channel_id: channelId,
    user_id: MOCK_MEMBER.user_id,
    nickname_in_channel: nicknameInChannel ?? MOCK_MEMBER.nickname_in_channel,
    joined_at: now(),
  });
};

export const joinChannelByInviteToken = async (
  _inviteToken: string,
  nicknameInChannel?: string
): Promise<ChannelMember> => {
  return Promise.resolve({
    channel_id: MOCK_CHANNEL.channel_id,
    user_id: MOCK_MEMBER.user_id,
    nickname_in_channel: nicknameInChannel ?? MOCK_MEMBER.nickname_in_channel,
    joined_at: now(),
  });
};

export const leaveChannel = async (_channelId: number): Promise<void> => {
  return Promise.resolve();
};

export const listMembers = async (
  _channelId: number
): Promise<ChannelMember[]> => {
  return Promise.resolve([MOCK_MEMBER]);
};

export const updateMemberNickname = async (
  channelId: number,
  userId: number,
  nicknameInChannel: string
): Promise<ChannelMember> => {
  return Promise.resolve({
    channel_id: channelId,
    user_id: userId,
    nickname_in_channel: nicknameInChannel,
    joined_at: MOCK_MEMBER.joined_at,
  });
};

export const kickMember = async (
  _channelId: number,
  _userId: number
): Promise<void> => {
  return Promise.resolve();
};

export const listRoles = async (_channelId: number): Promise<Role[]> => {
  return Promise.resolve([MOCK_ROLE]);
};

export const createRole = async (
  channelId: number,
  payload: CreateRolePayload
): Promise<Role> => {
  return Promise.resolve({
    role_id: MOCK_ROLE.role_id,
    channel_id: channelId,
    name: payload.name,
    permissions: payload.permissions,
  });
};

export const updateRole = async (
  channelId: number,
  roleId: number,
  payload: UpdateRolePayload
): Promise<Role> => {
  return Promise.resolve({
    role_id: roleId,
    channel_id: channelId,
    name: MOCK_ROLE.name,
    permissions: payload.permissions,
  });
};

export const deleteRole = async (
  _channelId: number,
  _roleId: number
): Promise<void> => {
  return Promise.resolve();
};

export const assignRole = async (
  _channelId: number,
  userId: number,
  roleId: number
): Promise<RoleAssignment> => {
  return Promise.resolve({
    userrole_id: 12,
    user_id: userId,
    role_id: roleId,
    assigned_at: now(),
  });
};

export const listTopics = async (_channelId: number): Promise<Topic[]> => {
  return Promise.resolve([MOCK_TOPIC]);
};

export const getTopic = async (channelId: number, topicId: number): Promise<Topic> => {
  return Promise.resolve({ ...MOCK_TOPIC, channel_id: channelId, topic_id: topicId });
};

export const createTopic = async (
  channelId: number,
  title: string
): Promise<Topic> => {
  return Promise.resolve({
    topic_id: MOCK_TOPIC.topic_id,
    channel_id: channelId,
    title,
    created_at: now(),
  });
};

export const deleteTopic = async (
  _channelId: number,
  _topicId: number
): Promise<void> => {
  return Promise.resolve();
};
