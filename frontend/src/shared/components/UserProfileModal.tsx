import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { ProfileView } from '../../modules/profile/components/ProfileView';
import { profileApi } from '../../modules/profile';

interface UserProfileModalProps {
  userId: number;
  onClose: () => void;
}

/** Read-only view of another user's public profile, opened by clicking
 * their name/avatar in a message thread, group, or DM. */
export const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string; bio: string } | null>(
    null
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profileApi
      .listPublicProfilesByIds([userId])
      .then(([p]) => {
        if (cancelled) return;
        if (!p) {
          setError(true);
          return;
        }
        setProfile({
          display_name: p.display_name || p.username,
          avatar_url: p.avatar_url ?? '',
          bio: p.bio,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Modal title="Profile" onClose={onClose}>
      {error && <p role="alert">Couldn&apos;t load this user&apos;s profile.</p>}
      {!error && !profile && <p className="list-row-subtitle">Loading…</p>}
      {profile && (
        <ProfileView
          profile={{ ...profile, allow_group_invitations: false }}
          isOwnProfile={false}
          embedded
        />
      )}
    </Modal>
  );
};
