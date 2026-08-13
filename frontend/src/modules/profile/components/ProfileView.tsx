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

  const initial = profile.display_name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="modal-card" style={{ margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        {profile.avatar_url ? (
          <a
            href={resolveMediaUrl(profile.avatar_url)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-block' }}
          >
            <img
              src={resolveMediaUrl(profile.avatar_url)}
              alt={profile.display_name}
              style={{
                display: 'block',
                margin: '0 auto',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          </a>
        ) : (
          // No external placeholder-image dependency (it can silently fail
          // to load, leaving a blank gap) -- a generated initial always
          // renders and already matches whatever palette is active.
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: 700,
              background: 'var(--ws-primary)',
              color: 'var(--ws-text-on-bubble)',
            }}
          >
            {initial}
          </div>
        )}
        <h2 style={{ margin: '0.75rem 0 0.25rem' }}>{profile.display_name}</h2>
        <p style={{ color: 'var(--ws-text-secondary)', margin: 0 }}>
          {profile.bio || 'No bio provided.'}
        </p>

        {isOwnProfile && onAvatarUpload && (
          <div style={{ marginTop: '0.75rem' }}>
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
              className="btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <div className="list-row" style={{ borderBottom: 'none' }}>
          <span>Allow Group Invitations</span>
          <strong>{profile.allow_group_invitations ? 'Yes' : 'No'}</strong>
        </div>
      )}

      {isOwnProfile && onEditClick && (
        <button onClick={onEditClick} className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }}>
          Edit Profile
        </button>
      )}
    </div>
  );
};
