/**
 * types — data contracts for the workspaces module (channels, topics,
 * custom roles, and channel membership).
 *
 * Source: Phase 1 doc §8-2, cross-checked directly against the real
 * backend serializers (`backend/apps/workspaces/api/serializers.py`) as
 * part of SCRUM-33's review, since some of these endpoints (invite-token
 * join, list roles/members/topics) were added after the doc was written
 * and only exist in the actual backend code.
 */

export type ChannelPermission =
  | 'MANAGE_CHANNEL'
  | 'MANAGE_ROLES'
  | 'MANAGE_TOPICS'
  | 'DELETE_MESSAGES'
  | 'KICK_MEMBERS'
  | 'SEND_MEDIA'
  | 'SEND_MESSAGES';

export const CHANNEL_PERMISSIONS: ChannelPermission[] = [
  'MANAGE_CHANNEL',
  'MANAGE_ROLES',
  'MANAGE_TOPICS',
  'DELETE_MESSAGES',
  'KICK_MEMBERS',
  'SEND_MEDIA',
  'SEND_MESSAGES',
];

export const PERMISSION_LABELS: Record<ChannelPermission, string> = {
  MANAGE_CHANNEL: 'Manage Channel',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_TOPICS: 'Manage Topics',
  DELETE_MESSAGES: 'Delete Messages',
  KICK_MEMBERS: 'Kick Members',
  SEND_MEDIA: 'Send Media',
  SEND_MESSAGES: 'Send Messages',
};

export interface Channel {
  channel_id: number;
  name: string;
  creator_id: number;
  default_topic_id: number;
  created_at: string;
  invite_token: string;
}

/**
 * Response of PATCH /api/channels/{id}/ — intentionally smaller than
 * Channel. This matches the Phase 1 doc's own example exactly (§8-2-3);
 * the real backend serializer happens to return the full Channel object,
 * but this type deliberately only promises what the doc guarantees.
 */
export interface ChannelUpdateResponse {
  channel_id: number;
  name: string;
}

/**
 * A channel membership row — returned by both the join endpoints and the
 * member-list endpoint (same backend serializer, `ChannelMemberSerializer`,
 * both times). There is no `is_muted` field anywhere in the real backend.
 */
export interface ChannelMember {
  channel_id: number;
  user_id: number;
  nickname_in_channel: string;
  joined_at: string;
}

export interface Role {
  role_id: number;
  channel_id: number;
  name: string;
  permissions: ChannelPermission[];
}

export interface CreateRolePayload {
  name: string;
  permissions: ChannelPermission[];
}

export interface UpdateRolePayload {
  permissions: ChannelPermission[];
}

export interface RoleAssignment {
  userrole_id: number;
  user_id: number;
  role_id: number;
  assigned_at: string;
}

export interface Topic {
  topic_id: number;
  channel_id: number;
  title: string;
  created_at: string;
}
