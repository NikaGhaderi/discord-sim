import React, { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@shared/components/Avatar';
import { Button } from '@shared/components/ui/Button';
import { Card } from '@shared/components/ui/Card';
import { profileApi, PublicProfile } from '../../profile';
import { socketClient } from '../../notifications';
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

  const loadInvitations = useCallback(async (isCancelled: () => boolean) => {
    setIsLoading(true);
    setError(false);
    try {
      const page = await privateSpacesApi.listMyInvitations();
      if (isCancelled()) return;
      setInvitations(page.results);

      const inviterIds = Array.from(
        new Set(page.results.map((inv) => inv.inviter_id))
      );
      const profiles = await profileApi.listPublicProfilesByIds(inviterIds);
      if (!isCancelled()) {
        setInviterProfilesById(
          Object.fromEntries(profiles.map((p) => [p.user_id, p]))
        );
      }
    } catch {
      if (!isCancelled()) {
        setError(true);
      }
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadInvitations(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadInvitations]);

  // A new invitation sent while this list is already open previously
  // required a full page reload to show up -- the sender's own action
  // never pushed anything to the invitee. Refetch live instead whenever a
  // GROUP_INVITATION_RECEIVED notification arrives over the socket.
  useEffect(() => {
    return socketClient.onNewNotification((notification) => {
      if (notification.event_type === 'GROUP_INVITATION_RECEIVED') {
        void loadInvitations(() => false);
      }
    });
  }, [loadInvitations]);

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
    return <p className="text-sm text-muted">Loading invitations…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Couldn&apos;t load invitations.
      </p>
    );
  }

  return (
    <div className="invitation-list-container">
      <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted">Pending Group Invitations</h3>
      {invitations.length === 0 ? (
        <p className="text-sm text-muted">No pending invitations.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {invitations.map((invitation) => {
            const inviterProfile = inviterProfilesById[invitation.inviter_id];
            const inviterLabel = inviterProfile?.username ?? `User #${invitation.inviter_id}`;
            const isResponding = respondingId === invitation.invitation_id;
            return (
              <Card key={invitation.invitation_id} className="p-3">
                <div className="text-sm font-medium text-foreground">
                  # {invitation.group_name ?? `Group #${invitation.group_id}`}
                </div>
                <div className="my-1.5 flex items-center gap-2 text-sm text-muted">
                  <Avatar avatarUrl={inviterProfile?.avatar_url} label={inviterLabel} size={20} />
                  Invited by {inviterLabel}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void respond(invitation.invitation_id, 'ACCEPTED')}
                    disabled={isResponding}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void respond(invitation.invitation_id, 'DECLINED')}
                    disabled={isResponding}
                  >
                    Decline
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
