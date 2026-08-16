import React, { useEffect, useState } from 'react';
import { Avatar } from '@shared/components/Avatar';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
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
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-2">
        <Input id="group-name-input" label="Group Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit" className="mt-1 w-full" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Name'}
        </Button>
      </form>

      <div className="mt-5">
        <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor="group-invite-link">
          Invite Link
          <div className="flex gap-2">
            <input
              id="group-invite-link"
              type="text"
              readOnly
              value={group.invite_token}
              className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3.5 text-foreground"
            />
            <Button type="button" variant="secondary" onClick={() => void handleCopyInviteLink()}>
              {didCopyInviteLink ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </label>
      </div>

      <div className="mt-5">
        <h4 className="mb-2 text-sm font-semibold text-foreground">Members</h4>
        {isLoadingMembers && <p className="text-sm text-muted">Loading members…</p>}
        {membersError && (
          <p role="alert" className="text-sm text-danger">
            Couldn&apos;t load members.
          </p>
        )}
        {!isLoadingMembers && !membersError && (
          <ul className="flex flex-col gap-1">
            {members.map((member) => {
              const memberProfile = memberProfilesById[member.user_id];
              const memberLabel =
                memberProfile?.username ?? `User #${member.user_id}`;
              return (
                <li key={member.user_id} className="flex items-center gap-2 text-sm text-foreground">
                  <Avatar avatarUrl={memberProfile?.avatar_url} label={memberLabel} size={20} />
                  {memberLabel}
                  {member.is_admin && ' (admin)'}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={(e) => void handleInvite(e)} className="mt-5 flex flex-col gap-2">
        <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor="group-invite-username">
          Invite a member (username)
          <div className="flex gap-2">
            <input
              id="group-invite-username"
              type="text"
              placeholder="username"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              required
              className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3.5 text-foreground placeholder:text-muted/70"
            />
            <Button type="submit" disabled={isInviting}>
              {isInviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </label>
        {inviteError && (
          <p role="alert" className="text-sm text-danger">
            {inviteError}
          </p>
        )}
        {inviteSent && <p className="text-sm text-muted">{inviteSent}</p>}
      </form>

      {/*
        Both actions are offered to every member, not just admins: the
        backend has no admin check on either endpoint (DeleteGroupUseCase
        docstring cites Phase 1 doc §8-3-6 -- any member may delete the
        whole group, superseding SCRUM-26's original admin-only AC).
      */}
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={() => void handleDeleteOrLeave('leave')} disabled={isRemoving}>
          Leave Group
        </Button>
        <Button variant="danger" onClick={() => void handleDeleteOrLeave('delete')} disabled={isRemoving}>
          Delete Group
        </Button>
      </div>
    </div>
  );
};
