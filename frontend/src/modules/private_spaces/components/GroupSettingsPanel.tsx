import React, { useState } from 'react';
import { Group } from '../types';

interface GroupSettingsPanelProps {
  group: Group;
  onUpdateGroup?: (updatedGroup: Group) => void;
  onDeleteOrLeave?: (groupId: string) => void;
}

export const GroupSettingsPanel: React.FC<GroupSettingsPanelProps> = ({
  group,
  onUpdateGroup,
  onDeleteOrLeave,
}) => {
  const [name, setName] = useState(group.name);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateGroup?.({ ...group, name: name.trim() });
  };

  const actionButtonText = group.is_admin ? 'Delete Group' : 'Leave Group';

  return (
    <div className="group-settings-panel">
      <h3>Group Settings: {group.name}</h3>
      
      <form onSubmit={handleSave}>
        <label htmlFor="group-name-input">Group Name:</label>
        <input
          id="group-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit">Save Changes</button>
      </form>

      <div className="danger-zone" style={{ marginTop: '20px' }}>
        <button
          type="button"
          onClick={() => onDeleteOrLeave?.(group.id)}
          className="btn-danger"
        >
          {actionButtonText}
        </button>
      </div>
    </div>
  );
};