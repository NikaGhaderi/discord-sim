import React, { useEffect, useState } from 'react';
import { profileApi } from '../../profile';
import { privateSpacesApi } from '../index';
import { DirectChat } from '../types';

interface DirectMessageListProps {
  currentUserId: number;
  onSelectDm?: (dm: DirectChat) => void;
}

const otherParticipantId = (dm: DirectChat, currentUserId: number): number =>
  dm.user1_id === currentUserId ? dm.user2_id : dm.user1_id;

export const DirectMessageList: React.FC<DirectMessageListProps> = ({
  currentUserId,
  onSelectDm,
}) => {
  const [dms, setDms] = useState<DirectChat[]>([]);
  const [usernamesById, setUsernamesById] = useState<Record<number, string>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDms = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const data = await privateSpacesApi.listDirectChats();
        if (cancelled) return;
        setDms(data);

        // Bulk-resolve every other participant's username in one request
        // rather than one lookup per DM.
        const otherIds = Array.from(
          new Set(data.map((dm) => otherParticipantId(dm, currentUserId)))
        );
        const profiles = await profileApi.listPublicProfilesByIds(otherIds);
        if (!cancelled) {
          setUsernamesById(
            Object.fromEntries(profiles.map((p) => [p.user_id, p.username]))
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
        <button onClick={() => setIsCreating(true)} className="btn-primary">
          Start New DM
        </button>
      ) : (
        <form onSubmit={(e) => void handleStartDm(e)} className="start-dm-form">
          <input
            type="text"
            placeholder="Enter username..."
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
          />
          <button type="submit">Start</button>
          <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
        </form>
      )}

      {startError && <p role="alert">{startError}</p>}
      {isLoading && <p>Loading direct messages…</p>}
      {error && <p role="alert">Couldn&apos;t load direct messages.</p>}

      {!isLoading && !error && (
        <ul className="dm-list">
          {dms.map((dm) => {
            const otherId = otherParticipantId(dm, currentUserId);
            return (
              <li
                key={dm.direct_chat_id}
                onClick={() => onSelectDm?.(dm)}
                className="dm-item"
              >
                {/* Falls back to the raw id only if the bulk lookup didn't
                    resolve it (e.g. the other user was deleted). */}
                <strong>{usernamesById[otherId] ?? `User #${otherId}`}</strong>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
