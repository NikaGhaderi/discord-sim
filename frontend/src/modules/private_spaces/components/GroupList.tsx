import React, { useState } from 'react';
import { Group } from '../types';

interface GroupListProps {
  initialGroups?: Group[];
  onSelectGroup?: (group: Group) => void;
}

const defaultGroups: Group[] = [
  { id: 'grp-1', name: 'Frontend Team', is_admin: true, member_count: 5 },
  { id: 'grp-2', name: 'General Chat', is_admin: false, member_count: 12 },
];

export const GroupList: React.FC<GroupListProps> = ({ initialGroups = defaultGroups, onSelectGroup }) => {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const newGroup: Group = {
      id: `grp-${Date.now()}`,
      name: groupName.trim(),
      is_admin: true,
      member_count: 1,
    };

    setGroups([...groups, newGroup]);
    setGroupName('');
    setIsCreating(false);
  };

  return (
    <div className="group-list-container">
      <h3>Groups</h3>
      {!isCreating ? (
        <button onClick={() => setIsCreating(true)} className="btn-primary">
          Create Group
        </button>
      ) : (
        <form onSubmit={handleCreateGroup} className="create-group-form">
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
        </form>
      )}

      <ul className="group-list">
        {groups.map((group) => (
          <li key={group.id} onClick={() => onSelectGroup?.(group)} className="group-item">
            <span>{group.name}</span>
            <small>({group.member_count} members)</small>
          </li>
        ))}
      </ul>
    </div>
  );
};