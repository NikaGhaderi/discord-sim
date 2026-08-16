import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Avatar } from '@shared/components/Avatar';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { profileApi, PublicProfile } from '../../profile';
import { privateSpacesApi } from '../index';
import { DirectChat } from '../types';

interface DirectMessageListProps {
  currentUserId: number;
  onSelectDm?: (dm: DirectChat) => void;
  /** Fires after a DM is deleted from this list, so the parent can clear
   * its selection if that was the currently-open chat. */
  onDeletedDm?: (dmId: number) => void;
  /** Set by the parent right after a delete succeeds elsewhere (e.g. a
   * "Delete Chat" button in the open chat's own header) so this list --
   * which owns its own fetched state -- drops the now-gone DM without a
   * refetch. */
  removedDmId?: number | null;
}

const otherParticipantId = (dm: DirectChat, currentUserId: number): number =>
  dm.user1_id === currentUserId ? dm.user2_id : dm.user1_id;

export const DirectMessageList: React.FC<DirectMessageListProps> = ({
  currentUserId,
  onSelectDm,
  onDeletedDm,
  removedDmId,
}) => {
  const [dms, setDms] = useState<DirectChat[]>([]);
  const [profilesById, setProfilesById] = useState<
    Record<number, PublicProfile>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDms = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const data = await privateSpacesApi.listDirectChats();
        if (cancelled) return;
        setDms(data);

        // Bulk-resolve every other participant's profile (username + avatar,
        // per the doc's §8-3-1 "profile pictures must be shown" rule) in one
        // request rather than one lookup per DM.
        const otherIds = Array.from(
          new Set(data.map((dm) => otherParticipantId(dm, currentUserId)))
        );
        const profiles = await profileApi.listPublicProfilesByIds(otherIds);
        if (!cancelled) {
          setProfilesById(
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

    void loadDms();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (removedDmId == null) return;
    setDms((prev) => prev.filter((dm) => dm.direct_chat_id !== removedDmId));
  }, [removedDmId]);

  const handleDelete = async (e: React.MouseEvent, dmId: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    setDeletingId(dmId);
    try {
      await privateSpacesApi.deleteDirectChat(dmId);
      setDms((prev) => prev.filter((dm) => dm.direct_chat_id !== dmId));
      onDeletedDm?.(dmId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartDm = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username) return;

    setStartError(null);
    try {
      // No endpoint resolves a raw user_id to a username, but the reverse
      // (username -> user_id) IS resolvable via the public profile lookup,
      // since PublicProfileSerializer includes user_id.
      const profile = await profileApi.getPublicProfile(username);
      const { chat } = await privateSpacesApi.createOrGetDirectChat(
        profile.user_id
      );
      setDms((prev) =>
        prev.some((dm) => dm.direct_chat_id === chat.direct_chat_id)
          ? prev
          : [chat, ...prev]
      );
      setNewUsername('');
      setIsCreating(false);
    } catch {
      setStartError(`Couldn't find user "${username}".`);
    }
  };

  return (
    <div className="dm-list-container">
      <h3 className="mb-5 text-sm font-semibold tracking-wide text-muted">Direct Messages</h3>
      {!isCreating ? (
        <Button variant="secondary" size="sm" className="mb-5 w-full" onClick={() => setIsCreating(true)}>
          Start New DM
        </Button>
      ) : (
        <form onSubmit={(e) => void handleStartDm(e)} className="mb-5 flex flex-col gap-2">
          <Input
            label="Username"
            placeholder="Enter username..."
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1">
              Start
            </Button>
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {startError && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {startError}
        </p>
      )}
      {isLoading && <p className="text-sm text-muted">Loading direct messages…</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          Couldn&apos;t load direct messages.
        </p>
      )}

      {!isLoading && !error && (
        <ul className="mt-2.5 flex flex-col gap-0.5">
          {dms.map((dm) => {
            const otherId = otherParticipantId(dm, currentUserId);
            const otherProfile = profilesById[otherId];
            const label = otherProfile?.username ?? `User #${otherId}`;
            return (
              <li
                key={dm.direct_chat_id}
                onClick={() => onSelectDm?.(dm)}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted transition hover:bg-surface-raised hover:text-foreground"
              >
                {/* Falls back to the raw id (and a placeholder avatar) only
                    if the bulk lookup didn't resolve it, e.g. the other
                    user was deleted. A flex row (rather than relying on
                    inline flow) keeps the avatar and username on one line
                    regardless of whether the avatar is an <img> or the
                    text-initial fallback. */}
                <Avatar avatarUrl={otherProfile?.avatar_url} label={label} />
                <strong className="flex-1 text-foreground">{label}</strong>
                <Button
                  variant="danger"
                  size="sm"
                  className="min-h-0 px-1.5 py-0.5"
                  disabled={deletingId === dm.direct_chat_id}
                  onClick={(e) => void handleDelete(e, dm.direct_chat_id)}
                  aria-label={`Delete conversation with ${label}`}
                  title="Delete conversation"
                >
                  <X size={12} aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
