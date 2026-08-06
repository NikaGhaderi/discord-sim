import React, { useState } from 'react';
import { ProfileView, ProfileData } from '../components/ProfileView';
import { ProfileEditForm } from '../components/ProfileEditForm';

const MOCK_PROFILE: ProfileData = {
  display_name: 'Fatemeh Roosta',
  avatar_url: 'https://via.placeholder.com/150',
  bio: 'Frontend developer working on Discord Sim.',
  allow_group_invitations: true,
};

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>(MOCK_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(true);

  const handleSave = (updatedData: ProfileData) => {
    setProfile(updatedData);
    setIsEditing(false);
  };

  return (
    <div>
      <div style={{ padding: '0.5rem', background: '#f0f0f0', textAlign: 'center', marginBottom: '1rem' }}>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isOwnProfile}
            onChange={(e) => setIsOwnProfile(e.target.checked)}
          />
          Debug: Toggle Is Own Profile ({isOwnProfile ? 'True' : 'False'})
        </label>
      </div>

      {isEditing ? (
        <ProfileEditForm
          initialData={profile}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ProfileView
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEditClick={() => setIsEditing(true)}
        />
      )}
    </div>
  );
};