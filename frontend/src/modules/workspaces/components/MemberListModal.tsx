import React, { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@shared/components/Avatar';
import { Modal } from '@shared/components/Modal';
import { profileApi, PublicProfile } from '../../profile';
import { workspacesApi } from '../index';
import { ChannelMember } from '../types';

interface MemberListModalProps {
  channelId: number;
  currentUserId?: number;
  /** True if the current user holds KICK_MEMBERS -- controls whether the
   * Kick button renders at all, rather than showing it and letting the
   * backend 403 on click. */
  canKick: boolean;
  onClose: () => void;
}

export const MemberListModal: React.FC<MemberListModalProps> = ({
  channelId,
  currentUserId,
  canKick,
  onClose,
}) => {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [profilesById, setProfilesById] = useState<Record<number, PublicProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [kickingUserId, setKickingUserId] = useState<number | null>(null);
  const [kickError, setKickError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const data = await workspacesApi.listMembers(channelId);
        if (cancelled) return;
        setMembers(data);
        const profiles = await profileApi.listPublicProfilesByIds(
          data.map((m) => m.user_id)
        );
        if (!cancelled) {
          setProfilesById(Object.fromEntries(profiles.map((p) => [p.user_id, p])));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const label = profilesById[m.user_id]?.username ?? m.nickname_in_channel ?? '';
      return label.toLowerCase().includes(q);
    });
  }, [members, profilesById, query]);

  const handleKick = async (userId: number) => {
    if (!window.confirm('Remove this member from the channel?')) return;
    setKickError(null);
    setKickingUserId(userId);
    try {
      await workspacesApi.kickMember(channelId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch {
      setKickError('Failed to remove this member.');
    } finally {
      setKickingUserId(null);
    }
  };

  return (
    <Modal title="Channel Members" onClose={onClose}>
      <input
        type="text"
        placeholder="Search members..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
      />

      {kickError && <p role="alert">{kickError}</p>}
      {isLoading && <p className="list-row-subtitle">Loading members...</p>}
      {error && <p role="alert">Couldn&apos;t load members.</p>}

      {!isLoading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '50vh', overflowY: 'auto' }}>
          {visibleMembers.length === 0 && (
            <p className="list-row-subtitle">No members match &quot;{query}&quot;.</p>
          )}
          {visibleMembers.map((member) => {
            const profile = profilesById[member.user_id];
            const label = profile?.username ?? member.nickname_in_channel ?? `User #${member.user_id}`;
            const isSelf = member.user_id === currentUserId;
            return (
              <div key={member.user_id} className="list-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar avatarUrl={profile?.avatar_url} label={label} size={24} />
                  <span>{label}</span>
                </div>
                {canKick && !isSelf && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={kickingUserId === member.user_id}
                    onClick={() => void handleKick(member.user_id)}
                  >
                    {kickingUserId === member.user_id ? 'Removing...' : 'Kick'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
