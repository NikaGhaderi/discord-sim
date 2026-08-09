import React, { useEffect, useState } from 'react';
import { Avatar } from '@shared/components/Avatar';
import { profileApi, PublicProfile } from '../../profile';
import { privateSpacesApi } from '../index';
import { Group, GroupInvitation } from '../types';

interface InvitationWithGroup {
  invitation: GroupInvitation;
  group: Group | null;
}

export const InvitationList: React.FC = () => {
  const [items, setItems] = useState<InvitationWithGroup[]>([]);
  const [inviterProfilesById, setInviterProfilesById] = useState<
    Record<number, PublicProfile>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadInvitations = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const page = await privateSpacesApi.listMyInvitations();
        const withGroups = await Promise.all(
          page.results.map(async (invitation) => {
            try {
              const group = await privateSpacesApi.getGroup(
                invitation.group_id
              );
              return { invitation, group };
            } catch {
              return { invitation, group: null };
            }
          })
        );
        if (cancelled) return;
        setItems(withGroups);

        const inviterIds = Array.from(
          new Set(page.results.map((inv) => inv.inviter_id))
        );
        const profiles = await profileApi.listPublicProfilesByIds(inviterIds);
        if (!cancelled) {
          setInviterProfilesById(
            Object.fromEntries(profiles.map((p) => [p.user_id, p]))
          );
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInvitations();

    return () => {
      cancelled = true;
    };
  }, []);

  const respond = async (
    invitationId: number,
    status: 'ACCEPTED' | 'DECLINED'
  ) => {
    await privateSpacesApi.respondToInvitation(invitationId, status);
    setItems((prev) =>
      prev.filter((item) => item.invitation.invitation_id !== invitationId)
    );
  };

  if (isLoading) {
    return <p>Loading invitations…</p>;
  }

  if (error) {
    return <p role="alert">Couldn&apos;t load invitations.</p>;
  }

  return (
    <div className="invitation-list-container">
      <h3>Pending Group Invitations</h3>
      {items.length === 0 ? (
        <p>No pending invitations.</p>
      ) : (
        <ul className="invitation-list">
          {items.map(({ invitation, group }) => {
            const inviterProfile = inviterProfilesById[invitation.inviter_id];
            const inviterLabel =
              inviterProfile?.username ?? `User #${invitation.inviter_id}`;
            return (
            <li key={invitation.invitation_id} className="invitation-item">
              <div>
                <strong>{group ? group.name : `Group #${invitation.group_id}`}</strong>
                {/* Falls back to the raw id (and a placeholder avatar) only
                    if the bulk lookup didn't resolve it, e.g. the inviter
                    was deleted. */}
                <p>
                  <Avatar avatarUrl={inviterProfile?.avatar_url} label={inviterLabel} size={20} />
                  From {inviterLabel}
                </p>
              </div>
              <div className="invitation-actions">
                <button
                  onClick={() => void respond(invitation.invitation_id, 'ACCEPTED')}
                  className="btn-accept"
                >
                  Accept
                </button>
                <button
                  onClick={() => void respond(invitation.invitation_id, 'DECLINED')}
                  className="btn-decline"
                >
                  Decline
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
