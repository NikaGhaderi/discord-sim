import React, { useState } from 'react';
import { Input } from '@shared/components/ui/Input';
import { Textarea } from '@shared/components/ui/Textarea';
import { Button } from '@shared/components/ui/Button';
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
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 max-w-[400px] rounded-card border border-border bg-surface/90 p-5 shadow-[0_24px_80px_rgb(0_0_0/18%)] backdrop-blur"
    >
      <h2 className="mb-4 text-xl font-semibold text-foreground">Edit Profile</h2>

      <div className="mb-4 flex flex-col gap-4">
        <Input
          label="Display Name"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
        />

        <Textarea
          label="Bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={300}
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={allowGroupInvitations}
            onChange={(e) => setAllowGroupInvitations(e.target.checked)}
          />
          Allow Group Invitations
        </label>
      </div>

      <div className="mt-6 flex gap-4">
        <Button type="submit" className="flex-1">
          Save
        </Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};