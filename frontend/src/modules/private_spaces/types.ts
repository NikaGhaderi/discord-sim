/**
 * types — data contracts for the private_spaces module (DMs, groups, group
 * invitations).
 *
 * Source: verified live against the running backend (SCRUM-58's new
 * endpoints included) as part of SCRUM-35. These replace the SCRUM-34 mock
 * types (`DirectMessage`, `Group` with `is_admin`/`member_count`,
 * `Invitation`), which never matched the real API shapes.
 */

export interface DirectChat {
  direct_chat_id: number;
  user1_id: number;
  user2_id: number;
  created_at: string;
}

export interface Group {
  group_id: number;
  name: string;
  creator_id: number;
  created_at: string;
  invite_token: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface GroupInvitation {
  invitation_id: number;
  group_id: number;
  /** Only populated on the my-invitations list -- the invitee isn't a group
   * member yet, so GetGroupUseCase (which requires membership) can't be
   * used to resolve the name any other way. Null on other responses that
   * reuse this same shape (e.g. the create-invitation response). */
  group_name: string | null;
  inviter_id: number;
  invitee_id: number;
  status: InvitationStatus;
  created_at: string;
}

export interface InvitationPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: GroupInvitation[];
}

/** Response of PATCH /api/invitations/{id}/ — intentionally smaller than GroupInvitation. */
export interface InvitationStatusUpdate {
  invitation_id: number;
  status: string;
}

/**
 * A single group's membership row. Not in the Phase 1 doc's contract, but
 * needed to actually show who's in a group and who's admin -- there was no
 * way to get this at all before the members endpoint was added.
 */
export interface GroupMember {
  user_id: number;
  is_admin: boolean;
  joined_at: string;
}
