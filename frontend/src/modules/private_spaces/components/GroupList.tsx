import React, { useEffect, useState } from 'react';
import { privateSpacesApi } from '../index';
import { Group } from '../types';
import { JoinGroupModal } from './JoinGroupModal';

interface GroupListProps {
  onSelectGroup?: (group: Group) => void;
  /**
   * Set by the parent right after a delete/leave succeeds elsewhere (in
   * GroupSettingsPanel) so this list -- which owns its own fetched state --
   * drops the now-gone group without waiting for a full refetch.
   */
  removedGroupId?: number | null;
  /** Bumped by the parent whenever a group might have been joined
   * elsewhere (e.g. accepting an invitation) so this list refetches
   * instead of waiting for a page reload. */
  reloadToken?: number;
}

export const GroupList: React.FC<GroupListProps> = ({
  onSelectGroup,
  removedGroupId,
  reloadToken,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<number, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

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
  }, [reloadToken]);

  useEffect(() => {
    if (removedGroupId == null) return;
    setGroups((prev) => prev.filter((g) => g.group_id !== removedGroupId));
  }, [removedGroupId]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setCreateError(null);
    setIsSubmittingCreate(true);
    try {
      const newGroup = await privateSpacesApi.createGroup(groupName.trim());
      setGroups((prev) => [...prev, newGroup]);
      void loadMemberCount(newGroup.group_id);
      setGroupName('');
      setIsCreating(false);
      // Without this, a successful create looked like nothing happened --
      // the new group was appended at the bottom of a scrollable list with
      // no visual confirmation. Selecting it immediately opens its chat,
      // which is unambiguous proof it worked.
      onSelectGroup?.(newGroup);
    } catch {
      setCreateError('Failed to create group. Please try again.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  return (
    <div className="group-list-container">
      <h3>Groups</h3>
      {!isCreating ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-primary btn-block"
            style={{ padding: '6px 10px', fontSize: 13 }}
          >
            Create Group
          </button>
          <button
            onClick={() => setIsJoining(true)}
            className="btn btn-block"
            style={{ padding: '6px 10px', fontSize: 13 }}
          >
            Join Group
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleCreateGroup(e)}
          className="create-group-form"
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmittingCreate}>
              {isSubmittingCreate ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => {
                setIsCreating(false);
                setCreateError(null);
              }}
            >
              Cancel
            </button>
          </div>
          {createError && <p role="alert">{createError}</p>}
        </form>
      )}

      {isLoading && <p>Loading groups…</p>}
      {error && <p role="alert">Couldn&apos;t load groups.</p>}

      {!isLoading && !error && (
        <ul className="group-list" style={{ marginTop: 10 }}>
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

      {isJoining && (
        <JoinGroupModal
          onClose={() => setIsJoining(false)}
          onJoined={(group) => {
            setGroups((prev) =>
              prev.some((g) => g.group_id === group.group_id) ? prev : [...prev, group]
            );
            void loadMemberCount(group.group_id);
          }}
        />
      )}
    </div>
  );
};
