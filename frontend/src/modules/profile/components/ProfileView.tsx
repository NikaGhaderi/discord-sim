import React, { useRef } from 'react';
import { resolveMediaUrl } from '@infrastructure/apiClient';
import { Button } from '@shared/components/ui/Button';
import { cn } from '@shared/lib/cn';

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
  /** True when rendered inside another component that already provides its
   * own modal-card chrome (e.g. UserProfileModal, which wraps this in a
   * <Modal>) -- skips ProfileView's own .modal-card wrapper so the two
   * fixed-width cards don't nest and force a horizontal scrollbar. */
  embedded?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  isOwnProfile,
  onEditClick,
  onAvatarUpload,
  isUploadingAvatar = false,
  embedded = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAvatarUpload?.(file);
    e.target.value = '';
  };

  const initial = profile.display_name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={cn(
        !embedded &&
          'mx-auto my-8 max-w-[420px] rounded-card border border-border bg-surface/90 p-5 shadow-[0_24px_80px_rgb(0_0_0/18%)] backdrop-blur'
      )}
    >
      <div className="mb-4 text-center">
        {profile.avatar_url ? (
          <a href={resolveMediaUrl(profile.avatar_url)} target="_blank" rel="noreferrer" className="inline-block">
            <img
              src={resolveMediaUrl(profile.avatar_url)}
              alt={profile.display_name}
              className="mx-auto block h-[120px] w-[120px] rounded-full object-cover"
            />
          </a>
        ) : (
          // No external placeholder-image dependency (it can silently fail
          // to load, leaving a blank gap) -- a generated initial always
          // renders and already matches whatever palette is active.
          <div className="mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-full bg-brand text-5xl font-bold text-background">
            {initial}
          </div>
        )}
        <h2 className="mb-1 mt-3 text-xl font-semibold text-foreground">{profile.display_name}</h2>
        <p className="m-0 text-sm text-muted">{profile.bio || 'No bio provided.'}</p>

        {isOwnProfile && onAvatarUpload && (
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              data-testid="avatar-file-input"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
            </Button>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <div className="flex items-center justify-between py-2 text-sm text-foreground">
          <span>Allow Group Invitations</span>
          <strong>{profile.allow_group_invitations ? 'Yes' : 'No'}</strong>
        </div>
      )}

      {isOwnProfile && onEditClick && (
        <Button onClick={onEditClick} className="mt-6 w-full">
          Edit Profile
        </Button>
      )}
    </div>
  );
};
