import React from 'react';

interface AvatarProps {
  avatarUrl?: string | null;
  /** Used as alt text — should be the display name/username the avatar belongs to. */
  label: string;
  size?: number;
}

/**
 * Small round avatar image, shared across profile and private_spaces.
 * Falls back to the same placeholder ProfileView already uses when
 * `avatarUrl` is null/empty (a user with no avatar set).
 */
export const Avatar: React.FC<AvatarProps> = ({ avatarUrl, label, size = 28 }) => (
  <img
    src={avatarUrl || 'https://via.placeholder.com/150'}
    alt={label}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      objectFit: 'cover',
      verticalAlign: 'middle',
      marginRight: '8px',
    }}
  />
);
