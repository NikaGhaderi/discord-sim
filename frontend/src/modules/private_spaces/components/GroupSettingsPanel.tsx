import React, { useState } from 'react';
import { privateSpacesApi } from '../index';
import { Group } from '../types';

interface GroupSettingsPanelProps {
  group: Group;
  /** Computed once by the parent from `group.creator_id === currentUserId`. */
  isAdmin: boolean;
  onUpdateGroup?: (updatedGroup: Group) => void;
  onDeleteOrLeave?: (groupId: number) => void;
}

export const GroupSettingsPanel: React.FC<GroupSettingsPanelProps> = ({
  group,
  isAdmin,
  onUpdateGroup,
  onDeleteOrLeave,
}) => {
  const [name, setName] = useState(group.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await privateSpacesApi.updateGroup(
        group.group_id,
        name.trim()
      );
      onUpdateGroup?.(updated);
    } catch {
      setError('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrLeave = async () => {
    setIsRemoving(true);
    setError(null);
    try {
      await privateSpacesApi.deleteOrLeaveGroup(
        group.group_id,
        isAdmin ? 'delete' : 'leave'
      );
      onDeleteOrLeave?.(group.group_id);
    } catch {
      setError('Failed to update group membership.');
      setIsRemoving(false);
    }
  };

  const actionButtonText = isAdmin ? 'Delete Group' : 'Leave Group';

  return (
    <div className="group-settings-panel">
      <h3>Group Settings: {group.name}</h3>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSave}>
        <label htmlFor="group-name-input">Group Name:</label>
        <input
          id="group-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" disabled={isSaving}>
          Save Changes
        </button>
      </form>

      <div className="danger-zone" style={{ marginTop: '20px' }}>
        <button
          type="button"
          onClick={() => void handleDeleteOrLeave()}
          className="btn-danger"
          disabled={isRemoving}
        >
          {actionButtonText}
        </button>
      </div>
    </div>
  );
};
