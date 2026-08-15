import React, { useEffect, useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { workspacesApi } from '../index';
import { Channel, ChannelPermission } from '../types';
import { ManageRolesModal } from './ManageRolesModal';
import { TopicManagerModal } from './TopicManagerModal';

interface ChannelSettingsModalProps {
  channel: Channel;
  /** Needed only for the "My Nickname" self-service field below -- omitted
   * entirely (no crash, field just doesn't render) if the caller hasn't
   * loaded the current user's id yet. */
  currentUserId?: number;
  /** Permissions the current user holds in this channel -- controls which
   * of the actions below (rename, manage roles/topics, delete) even
   * render, so a member without the permission never sees a button that
   * would just 403 when clicked. */
  myPermissions: ChannelPermission[];
  onClose: () => void;
  onUpdated: (channelId: number, name: string) => void;
  onDeleted: (channelId: number) => void;
  onLeft: (channelId: number) => void;
}

type SubPanel = 'none' | 'roles' | 'topics';

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  channel,
  currentUserId,
  myPermissions,
  onClose,
  onUpdated,
  onDeleted,
  onLeft,
}) => {
  const canManageChannel = myPermissions.includes('MANAGE_CHANNEL');
  const canManageRoles = myPermissions.includes('MANAGE_ROLES');
  const canManageTopics = myPermissions.includes('MANAGE_TOPICS');
  const [name, setName] = useState(channel.name);
  const [subPanel, setSubPanel] = useState<SubPanel>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didCopyInvite, setDidCopyInvite] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [didSaveNickname, setDidSaveNickname] = useState(false);

  // Pre-fills with whatever nickname is already set, so this field acts as
  // an editor, not just a one-shot "set once" input.
  useEffect(() => {
    if (currentUserId === undefined) return;
    let cancelled = false;
    workspacesApi.listMembers(channel.channel_id).then((members) => {
      if (cancelled) return;
      const self = members.find((m) => m.user_id === currentUserId);
      if (self?.nickname_in_channel) {
        setNickname(self.nickname_in_channel);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [channel.channel_id, currentUserId]);

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(channel.invite_token);
    setDidCopyInvite(true);
    setTimeout(() => setDidCopyInvite(false), 2000);
  };

  const handleRename = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const result = await workspacesApi.updateChannel(channel.channel_id, name.trim());
      onUpdated(result.channel_id, result.name);
    } catch {
      setError('Failed to update channel name.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete channel "${channel.name}"? This cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      await workspacesApi.deleteChannel(channel.channel_id);
      onDeleted(channel.channel_id);
      onClose();
    } catch {
      setError('Failed to delete channel.');
    }
  };

  const handleSaveNickname = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentUserId === undefined || !nickname.trim()) return;
    setError(null);
    setIsSavingNickname(true);
    try {
      await workspacesApi.updateMemberNickname(
        channel.channel_id,
        currentUserId,
        nickname.trim()
      );
      setDidSaveNickname(true);
      setTimeout(() => setDidSaveNickname(false), 2000);
    } catch {
      setError('Failed to update your nickname.');
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm(`Leave channel "${channel.name}"?`)) return;
    setError(null);
    setIsLeaving(true);
    try {
      await workspacesApi.leaveChannel(channel.channel_id);
      onLeft(channel.channel_id);
      onClose();
    } catch {
      setError('Failed to leave channel.');
    } finally {
      setIsLeaving(false);
    }
  };

  if (subPanel === 'roles') {
    return <ManageRolesModal channelId={channel.channel_id} onClose={() => setSubPanel('none')} />;
  }

  if (subPanel === 'topics') {
    return <TopicManagerModal channelId={channel.channel_id} onClose={() => setSubPanel('none')} />;
  }

  return (
    <Modal title="Channel Settings" onClose={onClose}>
      {error && <p className="error-text">{error}</p>}
      {canManageChannel && (
        <form onSubmit={handleRename}>
          <div className="field">
            <label htmlFor="settings-channel-name">Channel Name</label>
            <input
              id="settings-channel-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Name'}
          </button>
        </form>
      )}

      <div className="field">
        <label htmlFor="settings-invite-link">Invite Link</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="settings-invite-link" type="text" readOnly value={channel.invite_token} />
          <button type="button" className="btn" onClick={handleCopyInvite}>
            {didCopyInvite ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {currentUserId !== undefined && (
        <form onSubmit={handleSaveNickname} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="settings-my-nickname">My Nickname (this channel)</label>
            <input
              id="settings-my-nickname"
              type="text"
              placeholder="Set a nickname for this channel"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-block" disabled={isSavingNickname}>
            {isSavingNickname ? 'Saving...' : didSaveNickname ? 'Saved!' : 'Save Nickname'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
        {canManageRoles && (
          <button type="button" className="btn btn-block" onClick={() => setSubPanel('roles')}>
            Manage Roles
          </button>
        )}
        {canManageTopics && (
          <button type="button" className="btn btn-block" onClick={() => setSubPanel('topics')}>
            Manage Topics
          </button>
        )}
        <button type="button" className="btn btn-block" disabled={isLeaving} onClick={handleLeave}>
          {isLeaving ? 'Leaving...' : 'Leave Channel'}
        </button>
        {canManageChannel && (
          <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
            Delete Channel
          </button>
        )}
      </div>
    </Modal>
  );
};
