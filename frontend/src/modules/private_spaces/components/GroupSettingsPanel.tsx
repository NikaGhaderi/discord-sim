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
  const [inviteUsername, setInviteUsername] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<string | null>(null);
  const [didCopyInviteLink, setDidCopyInviteLink] = useState(false);

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

  const handleCopyInviteLink = async () => {
    await navigator.clipboard.writeText(group.invite_token);
    setDidCopyInviteLink(true);
    setTimeout(() => setDidCopyInviteLink(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = inviteUsername.trim();
    if (!username) return;
    setInviteError(null);
    setInviteSent(null);
    setIsInviting(true);
    try {
      // No endpoint invites by username directly -- resolve to a user_id
      // first, same pattern DirectMessageList uses to start a DM.
      const profile = await profileApi.getPublicProfile(username);
      await privateSpacesApi.sendGroupInvitation(group.group_id, profile.user_id);
      setInviteSent(`Invitation sent to ${username}.`);
      setInviteUsername('');
    } catch {
      setInviteError(`Couldn't invite "${username}". Check the username and try again.`);
    } finally {
      setIsInviting(false);
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
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSave} className="field">
        <label htmlFor="group-name-input">Group Name</label>
        <input
          id="group-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Name'}
        </button>
      </form>

      <div className="field" style={{ marginTop: '20px' }}>
        <label htmlFor="group-invite-link">Invite Link</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="group-invite-link" type="text" readOnly value={group.invite_token} />
          <button type="button" className="btn" onClick={() => void handleCopyInviteLink()}>
            {didCopyInviteLink ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

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
                <li key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar avatarUrl={memberProfile?.avatar_url} label={memberLabel} size={20} />
                  {memberLabel}
                  {member.is_admin && ' (admin)'}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={(e) => void handleInvite(e)} className="field" style={{ marginTop: '20px' }}>
        <label htmlFor="group-invite-username">Invite a member (username)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="group-invite-username"
            type="text"
            placeholder="username"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={isInviting}>
            {isInviting ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
        {inviteError && <p role="alert">{inviteError}</p>}
        {inviteSent && <p>{inviteSent}</p>}
      </form>

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
          className="btn btn-danger"
          disabled={isRemoving}
        >
          Delete Group
        </button>
      </div>
    </div>
  );
};
