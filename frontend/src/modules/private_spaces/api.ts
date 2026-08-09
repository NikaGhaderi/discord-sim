import { apiClient } from '@infrastructure/apiClient';
import {
  DirectChat,
  Group,
  GroupInvitation,
  GroupMember,
  InvitationPage,
  InvitationStatusUpdate,
} from './types';

/** Shared contract for both implementations (real and mock). */
export interface PrivateSpacesApi {
  listDirectChats(): Promise<DirectChat[]>;
  createOrGetDirectChat(
    targetUserId: number
  ): Promise<{ chat: DirectChat; created: boolean }>;
  deleteDirectChat(dmId: number): Promise<void>;
  listGroups(): Promise<Group[]>;
  createGroup(name: string): Promise<Group>;
  getGroup(groupId: number): Promise<Group>;
  listGroupMembers(groupId: number): Promise<GroupMember[]>;
  updateGroup(groupId: number, name: string): Promise<Group>;
  deleteOrLeaveGroup(
    groupId: number,
    mode: 'delete' | 'leave'
  ): Promise<void>;
  sendGroupInvitation(
    groupId: number,
    inviteeId: number
  ): Promise<{ invitation: GroupInvitation; created: boolean }>;
  respondToInvitation(
    invitationId: number,
    status: 'ACCEPTED' | 'DECLINED'
  ): Promise<InvitationStatusUpdate>;
  listMyInvitations(limit?: number, offset?: number): Promise<InvitationPage>;
}

export const listDirectChats = async (): Promise<DirectChat[]> => {
  const response = await apiClient.get<DirectChat[]>('/api/dms/');
  return response.data;
};

export const createOrGetDirectChat = async (
  targetUserId: number
): Promise<{ chat: DirectChat; created: boolean }> => {
  const response = await apiClient.post<DirectChat>('/api/dms/', {
    target_user_id: targetUserId,
  });
  return { chat: response.data, created: response.status === 201 };
};

export const deleteDirectChat = async (dmId: number): Promise<void> => {
  await apiClient.delete(`/api/dms/${dmId}/`);
};

export const listGroups = async (): Promise<Group[]> => {
  const response = await apiClient.get<Group[]>('/api/groups/');
  return response.data;
};

export const createGroup = async (name: string): Promise<Group> => {
  const response = await apiClient.post<Group>('/api/groups/', { name });
  return response.data;
};

export const getGroup = async (groupId: number): Promise<Group> => {
  const response = await apiClient.get<Group>(`/api/groups/${groupId}/`);
  return response.data;
};

export const listGroupMembers = async (
  groupId: number
): Promise<GroupMember[]> => {
  const response = await apiClient.get<GroupMember[]>(
    `/api/groups/${groupId}/members/`
  );
  return response.data;
};

export const updateGroup = async (
  groupId: number,
  name: string
): Promise<Group> => {
  const response = await apiClient.patch<Group>(`/api/groups/${groupId}/`, {
    name,
  });
  return response.data;
};

export const deleteOrLeaveGroup = async (
  groupId: number,
  mode: 'delete' | 'leave'
): Promise<void> => {
  const url =
    mode === 'delete'
      ? `/api/groups/${groupId}/`
      : `/api/groups/${groupId}/leave/`;
  await apiClient.delete(url);
};

export const sendGroupInvitation = async (
  groupId: number,
  inviteeId: number
): Promise<{ invitation: GroupInvitation; created: boolean }> => {
  const response = await apiClient.post<GroupInvitation>(
    `/api/groups/${groupId}/invitations/`,
    { invitee_id: inviteeId }
  );
  return { invitation: response.data, created: response.status === 201 };
};

export const respondToInvitation = async (
  invitationId: number,
  status: 'ACCEPTED' | 'DECLINED'
): Promise<InvitationStatusUpdate> => {
  const response = await apiClient.patch<InvitationStatusUpdate>(
    `/api/invitations/${invitationId}/`,
    { status }
  );
  return response.data;
};

export const listMyInvitations = async (
  limit?: number,
  offset?: number
): Promise<InvitationPage> => {
  const response = await apiClient.get<InvitationPage>('/api/invitations/', {
    params: { limit, offset },
  });
  return response.data;
};
