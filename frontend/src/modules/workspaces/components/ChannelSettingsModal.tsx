import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { workspacesApi } from '../index';
import { Channel } from '../types';
import { ManageRolesModal } from './ManageRolesModal';
import { TopicManagerModal } from './TopicManagerModal';

interface ChannelSettingsModalProps {
  channel: Channel;
  onClose: () => void;
  onUpdated: (channelId: number, name: string) => void;
  onDeleted: (channelId: number) => void;
  onLeft: (channelId: number) => void;
}

type SubPanel = 'none' | 'roles' | 'topics';

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  channel,
  onClose,
  onUpdated,
  onDeleted,
  onLeft,
}) => {
  const [name, setName] = useState(channel.name);
  const [subPanel, setSubPanel] = useState<SubPanel>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didCopyInvite, setDidCopyInvite] = useState(false);

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

      <div className="field">
        <label htmlFor="settings-invite-link">Invite Link</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="settings-invite-link" type="text" readOnly value={channel.invite_token} />
          <button type="button" className="btn" onClick={handleCopyInvite}>
            {didCopyInvite ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
        <button type="button" className="btn btn-block" onClick={() => setSubPanel('roles')}>
          Manage Roles
        </button>
        <button type="button" className="btn btn-block" onClick={() => setSubPanel('topics')}>
          Manage Topics
        </button>
        <button type="button" className="btn btn-block" disabled={isLeaving} onClick={handleLeave}>
          {isLeaving ? 'Leaving...' : 'Leave Channel'}
        </button>
        <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
          Delete Channel
        </button>
      </div>
    </Modal>
  );
};
