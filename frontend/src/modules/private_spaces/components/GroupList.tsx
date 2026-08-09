import React, { useEffect, useState } from 'react';
import { privateSpacesApi } from '../index';
import { Group } from '../types';

interface GroupListProps {
  onSelectGroup?: (group: Group) => void;
}

export const GroupList: React.FC<GroupListProps> = ({ onSelectGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<number, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadMemberCount = async (groupId: number) => {
    try {
      const members = await privateSpacesApi.listGroupMembers(groupId);
      setMemberCounts((prev) => ({ ...prev, [groupId]: members.length }));
    } catch {
      // Non-fatal -- the group itself still renders, just without a count.
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const data = await privateSpacesApi.listGroups();
        if (cancelled) return;
        setGroups(data);
        // Member counts are fetched per group in parallel and don't block
        // the group list itself from rendering.
        void Promise.all(data.map((g) => loadMemberCount(g.group_id)));
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
    void loadMemberCount(newGroup.group_id);
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
              {memberCounts[group.group_id] !== undefined && (
                <span className="group-member-count">
                  {' '}
                  ({memberCounts[group.group_id]}{' '}
                  {memberCounts[group.group_id] === 1 ? 'member' : 'members'})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
