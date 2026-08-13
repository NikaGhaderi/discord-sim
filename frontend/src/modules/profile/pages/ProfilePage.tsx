import React, { useEffect, useState } from 'react';
import { ProfileView, ProfileData } from '../components/ProfileView';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { profileApi, UserProfile } from '../index';

const toProfileData = (profile: UserProfile): ProfileData => ({
  display_name: profile.display_name,
  avatar_url: profile.avatar_url ?? '',
  bio: profile.bio,
  allow_group_invitations: profile.allow_group_invitations ?? false,
});

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const data = await profileApi.getMyProfile();
        if (!cancelled) {
          setProfile(data);
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

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (updatedData: ProfileData) => {
    const updated = await profileApi.updateProfile({
      display_name: updatedData.display_name,
      bio: updatedData.bio,
      allow_group_invitations: updatedData.allow_group_invitations,
    });
    setProfile(updated);
    setIsEditing(false);
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const updated = await profileApi.uploadAvatar(file);
      setProfile(updated);
    } catch {
      setAvatarError('Failed to upload photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return <div>Loading…</div>;
  }

  if (error || !profile) {
    return <div>Couldn&apos;t load profile.</div>;
  }

  return (
    <div>
      {isEditing ? (
        <ProfileEditForm
          initialData={toProfileData(profile)}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          {avatarError && <p role="alert" style={{ textAlign: 'center', color: '#c0392b' }}>{avatarError}</p>}
          <ProfileView
            profile={toProfileData(profile)}
            isOwnProfile
            onEditClick={() => setIsEditing(true)}
            onAvatarUpload={(file) => void handleAvatarUpload(file)}
            isUploadingAvatar={isUploadingAvatar}
          />
        </>
      )}
    </div>
  );
};
