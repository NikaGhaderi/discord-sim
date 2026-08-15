import React, { useEffect, useState } from 'react';
import { Avatar } from '@shared/components/Avatar';
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
      <h3>Direct Messages</h3>
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary btn-block"
          style={{ padding: '6px 10px', fontSize: 13 }}
        >
          Start New DM
        </button>
      ) : (
        <form
          onSubmit={(e) => void handleStartDm(e)}
          className="start-dm-form"
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <input
            type="text"
            placeholder="Enter username..."
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Start</button>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </form>
      )}

      {startError && <p role="alert">{startError}</p>}
      {isLoading && <p>Loading direct messages…</p>}
      {error && <p role="alert">Couldn&apos;t load direct messages.</p>}

      {!isLoading && !error && (
        <ul className="dm-list" style={{ marginTop: 10 }}>
          {dms.map((dm) => {
            const otherId = otherParticipantId(dm, currentUserId);
            const otherProfile = profilesById[otherId];
            const label = otherProfile?.username ?? `User #${otherId}`;
            return (
              <li
                key={dm.direct_chat_id}
                onClick={() => onSelectDm?.(dm)}
                className="dm-item"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {/* Falls back to the raw id (and a placeholder avatar) only
                    if the bulk lookup didn't resolve it, e.g. the other
                    user was deleted. A flex row (rather than relying on
                    inline flow) keeps the avatar and username on one line
                    regardless of whether the avatar is an <img> or the
                    text-initial fallback. */}
                <Avatar avatarUrl={otherProfile?.avatar_url} label={label} />
                <strong style={{ flex: 1 }}>{label}</strong>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  disabled={deletingId === dm.direct_chat_id}
                  onClick={(e) => void handleDelete(e, dm.direct_chat_id)}
                  aria-label={`Delete conversation with ${label}`}
                  title="Delete conversation"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
