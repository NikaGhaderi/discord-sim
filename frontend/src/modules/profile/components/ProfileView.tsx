import React, { useRef } from 'react';
import { resolveMediaUrl } from '@infrastructure/apiClient';

export interface ProfileData {
  display_name: string;
  avatar_url: string;
  bio: string;
  allow_group_invitations: boolean;
}

interface ProfileViewProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  onEditClick?: () => void;
  /** Only relevant when isOwnProfile -- shows a "Change Photo" control that
   * calls this with the selected file. */
  onAvatarUpload?: (file: File) => void;
  isUploadingAvatar?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  isOwnProfile,
  onEditClick,
  onAvatarUpload,
  isUploadingAvatar = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAvatarUpload?.(file);
    e.target.value = '';
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <img
          src={profile.avatar_url ? resolveMediaUrl(profile.avatar_url) : 'https://via.placeholder.com/150'}
          alt={profile.display_name}
          style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <h2>{profile.display_name}</h2>
        <p style={{ color: '#666' }}>{profile.bio || 'No bio provided.'}</p>

        {isOwnProfile && onAvatarUpload && (
          <div style={{ marginTop: '0.5rem' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              data-testid="avatar-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              style={{ padding: '4px 10px', fontSize: '13px', cursor: isUploadingAvatar ? 'default' : 'pointer' }}
            >
              {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <span>
            <strong>Allow Group Invitations: </strong>
            {profile.allow_group_invitations ? 'Yes' : 'No'}
          </span>
        </div>
      )}

      {isOwnProfile && onEditClick && (
        <button
          onClick={onEditClick}
          style={{ marginTop: '1.5rem', width: '100%', padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          Edit Profile
        </button>
      )}
    </div>
  );
};
