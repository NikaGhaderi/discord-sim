import React, { useEffect, useState } from 'react';
import { privateSpacesApi } from '../index';
import { Group } from '../types';

interface GroupListProps {
  onSelectGroup?: (group: Group) => void;
}

export const GroupList: React.FC<GroupListProps> = ({ onSelectGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const data = await privateSpacesApi.listGroups();
        if (!cancelled) {
          setGroups(data);
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

    void loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const newGroup = await privateSpacesApi.createGroup(groupName.trim());
    setGroups((prev) => [...prev, newGroup]);
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
        <form onSubmit={(e) => void handleCreateGroup(e)} className="create-group-form">
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

      {isLoading && <p>Loading groups…</p>}
      {error && <p role="alert">Couldn&apos;t load groups.</p>}

      {!isLoading && !error && (
        <ul className="group-list">
          {groups.map((group) => (
            <li
              key={group.group_id}
              onClick={() => onSelectGroup?.(group)}
              className="group-item"
            >
              <span>{group.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
