import React, { useState } from 'react';
import { ProfileData } from './ProfileView';

interface ProfileEditFormProps {
  initialData: ProfileData;
  onSave: (updatedData: ProfileData) => void;
  onCancel: () => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [displayName, setDisplayName] = useState(initialData.display_name);
  const [bio, setBio] = useState(initialData.bio);
  const [allowGroupInvitations, setAllowGroupInvitations] = useState(
    initialData.allow_group_invitations
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...initialData,
      display_name: displayName,
      bio,
      allow_group_invitations: allowGroupInvitations,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Edit Profile</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
          style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={300}
          style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={allowGroupInvitations}
            onChange={(e) => setAllowGroupInvitations(e.target.checked)}
          />
          Allow Group Invitations
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button type="submit" style={{ flex: 1, padding: '0.5rem', cursor: 'pointer' }}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '0.5rem', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  );
};