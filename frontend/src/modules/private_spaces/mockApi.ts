import {
  DirectChat,
  Group,
  GroupInvitation,
  GroupMember,
  InvitationPage,
  InvitationStatusUpdate,
} from './types';

/** The mock's own "current user" id, mirroring profile/mockApi.ts's fixed user. */
const MOCK_CURRENT_USER_ID = 123456;

let nextDmId = 3;
const mockDirectChats: DirectChat[] = [
  {
    direct_chat_id: 1,
    user1_id: MOCK_CURRENT_USER_ID,
    user2_id: 2001,
    created_at: '2026-08-01T10:30:00Z',
  },
  {
    direct_chat_id: 2,
    user1_id: MOCK_CURRENT_USER_ID,
    user2_id: 2002,
    created_at: '2026-08-05T09:00:00Z',
  },
];

let nextGroupId = 3;
const mockGroups: Group[] = [
  {
    group_id: 1,
    name: 'Frontend Team',
    creator_id: MOCK_CURRENT_USER_ID,
    created_at: '2026-07-20T12:00:00Z',
    invite_token: 'mock-invite-token-1',
  },
  {
    group_id: 2,
    name: 'General Chat',
    creator_id: 3001,
    created_at: '2026-07-22T08:00:00Z',
    invite_token: 'mock-invite-token-2',
  },
];

const mockGroupMembers: Record<number, GroupMember[]> = {
  1: [
    {
      user_id: MOCK_CURRENT_USER_ID,
      is_admin: true,
      joined_at: '2026-07-20T12:00:00Z',
    },
  ],
  2: [
    { user_id: 3001, is_admin: true, joined_at: '2026-07-22T08:00:00Z' },
    {
      user_id: MOCK_CURRENT_USER_ID,
      is_admin: false,
      joined_at: '2026-07-23T09:00:00Z',
    },
  ],
};

let nextInvitationId = 2;
const mockInvitations: GroupInvitation[] = [
  {
    invitation_id: 1,
    group_id: 2,
    group_name: 'General Chat',
    inviter_id: 3001,
    invitee_id: MOCK_CURRENT_USER_ID,
    status: 'PENDING',
    created_at: '2026-08-08T14:00:00Z',
  },
];

const delay = <T>(value: T, ms = 200): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

export const listDirectChats = async (): Promise<DirectChat[]> => {
  return delay([...mockDirectChats]);
};

export const createOrGetDirectChat = async (
  targetUserId: number
): Promise<{ chat: DirectChat; created: boolean }> => {
  const existing = mockDirectChats.find(
    (dm) =>
      (dm.user1_id === MOCK_CURRENT_USER_ID && dm.user2_id === targetUserId) ||
      (dm.user2_id === MOCK_CURRENT_USER_ID && dm.user1_id === targetUserId)
  );
  if (existing) {
    return delay({ chat: existing, created: false });
  }
  const chat: DirectChat = {
    direct_chat_id: nextDmId++,
    user1_id: MOCK_CURRENT_USER_ID,
    user2_id: targetUserId,
    created_at: new Date().toISOString(),
  };
  mockDirectChats.push(chat);
  return delay({ chat, created: true });
};

export const deleteDirectChat = async (dmId: number): Promise<void> => {
  const index = mockDirectChats.findIndex((dm) => dm.direct_chat_id === dmId);
  if (index !== -1) {
    mockDirectChats.splice(index, 1);
  }
  return delay(undefined);
};

export const listGroups = async (): Promise<Group[]> => {
  return delay([...mockGroups]);
};

export const createGroup = async (name: string): Promise<Group> => {
  const group: Group = {
    group_id: nextGroupId++,
    name,
    creator_id: MOCK_CURRENT_USER_ID,
    created_at: new Date().toISOString(),
    invite_token: `mock-invite-token-${nextGroupId}`,
  };
  mockGroups.push(group);
  mockGroupMembers[group.group_id] = [
    { user_id: MOCK_CURRENT_USER_ID, is_admin: true, joined_at: group.created_at },
  ];
  return delay(group);
};

export const joinGroupByInviteToken = async (inviteToken: string): Promise<Group> => {
  const group = mockGroups.find((g) => g.invite_token === inviteToken);
  if (!group) {
    throw new Error(`No mock group with invite token ${inviteToken}`);
  }
  const members = (mockGroupMembers[group.group_id] ??= []);
  if (!members.some((m) => m.user_id === MOCK_CURRENT_USER_ID)) {
    members.push({
      user_id: MOCK_CURRENT_USER_ID,
      is_admin: false,
      joined_at: new Date().toISOString(),
    });
  }
  return delay(group);
};

export const listGroupMembers = async (
  groupId: number
): Promise<GroupMember[]> => {
  return delay([...(mockGroupMembers[groupId] ?? [])]);
};

export const getGroup = async (groupId: number): Promise<Group> => {
  const group = mockGroups.find((g) => g.group_id === groupId);
  if (!group) {
    throw new Error(`Mock group ${groupId} not found`);
  }
  return delay(group);
};

export const updateGroup = async (
  groupId: number,
  name: string
): Promise<Group> => {
  const group = mockGroups.find((g) => g.group_id === groupId);
  if (!group) {
    throw new Error(`Mock group ${groupId} not found`);
  }
  group.name = name;
  return delay(group);
};

export const deleteOrLeaveGroup = async (
  groupId: number,
  mode: 'delete' | 'leave'
): Promise<void> => {
  if (mode === 'delete') {
    const index = mockGroups.findIndex((g) => g.group_id === groupId);
    if (index !== -1) {
      mockGroups.splice(index, 1);
    }
    delete mockGroupMembers[groupId];
  } else {
    const members = mockGroupMembers[groupId];
    if (members) {
      mockGroupMembers[groupId] = members.filter(
        (m) => m.user_id !== MOCK_CURRENT_USER_ID
      );
    }
  }
  return delay(undefined);
};

export const sendGroupInvitation = async (
  groupId: number,
  inviteeId: number
): Promise<{ invitation: GroupInvitation; created: boolean }> => {
  const existing = mockInvitations.find(
    (inv) =>
      inv.group_id === groupId &&
      inv.invitee_id === inviteeId &&
      inv.status === 'PENDING'
  );
  if (existing) {
    return delay({ invitation: existing, created: false });
  }
  const invitation: GroupInvitation = {
    invitation_id: nextInvitationId++,
    group_id: groupId,
    // Matches the real create-invitation response, which also leaves this
    // null -- only the my-invitations list populates it.
    group_name: null,
    inviter_id: MOCK_CURRENT_USER_ID,
    invitee_id: inviteeId,
    status: 'PENDING',
    created_at: new Date().toISOString(),
  };
  mockInvitations.push(invitation);
  return delay({ invitation, created: true });
};

export const respondToInvitation = async (
  invitationId: number,
  status: 'ACCEPTED' | 'DECLINED'
): Promise<InvitationStatusUpdate> => {
  const invitation = mockInvitations.find(
    (inv) => inv.invitation_id === invitationId
  );
  if (!invitation) {
    throw new Error(`Mock invitation ${invitationId} not found`);
  }
  invitation.status = status;
  if (status === 'ACCEPTED') {
    const members = (mockGroupMembers[invitation.group_id] ??= []);
    if (!members.some((m) => m.user_id === invitation.invitee_id)) {
      members.push({
        user_id: invitation.invitee_id,
        is_admin: false,
        joined_at: new Date().toISOString(),
      });
    }
  }
  return delay({ invitation_id: invitation.invitation_id, status: invitation.status });
};

export const listMyInvitations = async (
  limit = 20,
  offset = 0
): Promise<InvitationPage> => {
  const pending = mockInvitations.filter(
    (inv) => inv.status === 'PENDING' && inv.invitee_id === MOCK_CURRENT_USER_ID
  );
  const page = pending.slice(offset, offset + limit);
  return delay({
    count: pending.length,
    next: null,
    previous: null,
    results: page,
  });
};
