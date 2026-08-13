import React, { useEffect, useState } from 'react';
import { Avatar } from '@shared/components/Avatar';
import { profileApi, PublicProfile } from '../../profile';
import { privateSpacesApi } from '../index';
import { Group, GroupMember } from '../types';

interface GroupSettingsPanelProps {
  group: Group;
  onUpdateGroup?: (updatedGroup: Group) => void;
  onDeleteOrLeave?: (groupId: number) => void;
}

export const GroupSettingsPanel: React.FC<GroupSettingsPanelProps> = ({
  group,
  onUpdateGroup,
  onDeleteOrLeave,
}) => {
  const [name, setName] = useState(group.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberProfilesById, setMemberProfilesById] = useState<
    Record<number, PublicProfile>
  >({});
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setName(group.name);

    const loadMembers = async () => {
      setIsLoadingMembers(true);
      setMembersError(false);
      try {
        const data = await privateSpacesApi.listGroupMembers(group.group_id);
        if (cancelled) return;
        setMembers(data);

        const profiles = await profileApi.listPublicProfilesByIds(
          data.map((m) => m.user_id)
        );
        if (!cancelled) {
          setMemberProfilesById(
            Object.fromEntries(profiles.map((p) => [p.user_id, p]))
          );
        }
      } catch {
        if (!cancelled) {
          setMembersError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMembers(false);
        }
      }
    };

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [group.group_id, group.name]);

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

  const handleDeleteOrLeave = async (mode: 'delete' | 'leave') => {
    const confirmed =
      mode === 'delete'
        ? window.confirm(
            `Delete group "${group.name}" for everyone? This cannot be undone.`
          )
        : window.confirm(`Leave group "${group.name}"?`);
    if (!confirmed) return;

    setIsRemoving(true);
    setError(null);
    try {
      await privateSpacesApi.deleteOrLeaveGroup(group.group_id, mode);
      onDeleteOrLeave?.(group.group_id);
    } catch {
      setError('Failed to update group membership.');
      setIsRemoving(false);
    }
  };

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

      <div className="group-members" style={{ marginTop: '20px' }}>
        <h4>Members</h4>
        {isLoadingMembers && <p>Loading members…</p>}
        {membersError && <p role="alert">Couldn&apos;t load members.</p>}
        {!isLoadingMembers && !membersError && (
          <ul>
            {members.map((member) => {
              const memberProfile = memberProfilesById[member.user_id];
              const memberLabel =
                memberProfile?.username ?? `User #${member.user_id}`;
              return (
                <li key={member.user_id}>
                  <Avatar avatarUrl={memberProfile?.avatar_url} label={memberLabel} size={20} />
                  {memberLabel}
                  {member.is_admin && ' (admin)'}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/*
        Both actions are offered to every member, not just admins: the
        backend has no admin check on either endpoint (DeleteGroupUseCase
        docstring cites Phase 1 doc §8-3-6 -- any member may delete the
        whole group, superseding SCRUM-26's original admin-only AC).
      */}
      <div className="danger-zone" style={{ marginTop: '20px', display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => void handleDeleteOrLeave('leave')}
          className="btn"
          disabled={isRemoving}
        >
          Leave Group
        </button>
        <button
          type="button"
          onClick={() => void handleDeleteOrLeave('delete')}
          className="btn-danger"
          disabled={isRemoving}
        >
          Delete Group
        </button>
      </div>
    </div>
  );
};
