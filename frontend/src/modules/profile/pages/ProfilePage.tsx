import React, { useState } from 'react';
import { ProfileView, ProfileData } from '../components/ProfileView';
import { ProfileEditForm } from '../components/ProfileEditForm';

const MOCK_PROFILE: ProfileData = {
  display_name: 'Fatemeh Roosta',
  avatar_url: 'https://via.placeholder.com/150',
  bio: 'Frontend developer working on Discord Sim.',
  allow_group_invitations: true,
};

// Mock data is presented as the viewer's own profile until SCRUM-29 wires
// this page up to the real authenticated user.
const IS_OWN_PROFILE = true;

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>(MOCK_PROFILE);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (updatedData: ProfileData) => {
    setProfile(updatedData);
    setIsEditing(false);
  };

  return (
    <div>
      {isEditing ? (
        <ProfileEditForm
          initialData={profile}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ProfileView
          profile={profile}
          isOwnProfile={IS_OWN_PROFILE}
          onEditClick={() => setIsEditing(true)}
        />
      )}
    </div>
  );
};