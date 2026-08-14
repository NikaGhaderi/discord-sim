import React, { useEffect, useState } from 'react';
import { Avatar } from '@shared/components/Avatar';
import { profileApi, PublicProfile } from '../../profile';
import { privateSpacesApi } from '../index';
import { GroupInvitation } from '../types';

interface InvitationListProps {
  /** Fires right after an invitation is accepted, so the parent can refresh
   * the group list instantly instead of the user having to reload the page
   * to see the group they just joined. */
  onAccepted?: () => void;
}

export const InvitationList: React.FC<InvitationListProps> = ({ onAccepted }) => {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [inviterProfilesById, setInviterProfilesById] = useState<
    Record<number, PublicProfile>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadInvitations = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const page = await privateSpacesApi.listMyInvitations();
        if (cancelled) return;
        setInvitations(page.results);

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

  const respond = async (invitationId: number, status: 'ACCEPTED' | 'DECLINED') => {
    setRespondingId(invitationId);
    try {
      await privateSpacesApi.respondToInvitation(invitationId, status);
      setInvitations((prev) => prev.filter((inv) => inv.invitation_id !== invitationId));
      if (status === 'ACCEPTED') onAccepted?.();
    } finally {
      setRespondingId(null);
    }
  };

  if (isLoading) {
    return <p className="list-row-subtitle">Loading invitations…</p>;
  }

  if (error) {
    return <p role="alert">Couldn&apos;t load invitations.</p>;
  }

  return (
    <div className="invitation-list-container">
      <h3>Pending Group Invitations</h3>
      {invitations.length === 0 ? (
        <p className="list-row-subtitle">No pending invitations.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invitations.map((invitation) => {
            const inviterProfile = inviterProfilesById[invitation.inviter_id];
            const inviterLabel = inviterProfile?.username ?? `User #${invitation.inviter_id}`;
            const isResponding = respondingId === invitation.invitation_id;
            return (
              <div
                key={invitation.invitation_id}
                className="modal-card"
                style={{ width: 'auto', padding: 12 }}
              >
                <div className="list-row-title"># {invitation.group_name ?? `Group #${invitation.group_id}`}</div>
                <div
                  className="list-row-subtitle"
                  style={{ display: 'flex', alignItems: 'center', margin: '6px 0 10px' }}
                >
                  <Avatar avatarUrl={inviterProfile?.avatar_url} label={inviterLabel} size={20} />
                  Invited by {inviterLabel}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => void respond(invitation.invitation_id, 'ACCEPTED')}
                    disabled={isResponding}
                    className="btn btn-primary"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void respond(invitation.invitation_id, 'DECLINED')}
                    disabled={isResponding}
                    className="btn"
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
