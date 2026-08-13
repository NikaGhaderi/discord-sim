import React, { useState } from 'react';
import { Modal } from '@shared/components/Modal';
import { NotificationFeed } from '../../notifications/components/NotificationFeed';
import { Channel, ChannelMember } from '../types';
import { CreateChannelModal } from './CreateChannelModal';
import { JoinChannelModal } from './JoinChannelModal';

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannelId: number | null;
  onSelectChannel: (channelId: number) => void;
  onChannelCreated: (channel: Channel) => void;
  onChannelJoined: (membership: ChannelMember) => void;
}

type OpenModal = 'none' | 'create' | 'join' | 'notifications';

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onChannelCreated,
  onChannelJoined,
}) => {
  const [openModal, setOpenModal] = useState<OpenModal>('none');
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <aside className="sidebar">
      {/*
        "Home"/"Friends"/"Direct Messages" used to live here as
        non-functional placeholders (no onClick at all, and "Friends" has
        no backing feature anywhere in the backend). Real cross-page
        navigation now lives in the persistent <AppNav>; only this
        channel-scoped Notifications entry belongs here.
      */}
      <nav>
        <div className="channel-item" onClick={() => setOpenModal('notifications')}>
          Notifications
        </div>
      </nav>

      <div className="sidebar-section-title">
        <span>CHANNELS</span>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={() => setShowAddMenu((v) => !v)}
            aria-label="Add channel"
          >
            +
          </button>
          {showAddMenu && (
            <div
              className="modal-card"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                width: 160,
                padding: 8,
                zIndex: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-block"
                style={{ marginBottom: 6 }}
                onClick={() => {
                  setOpenModal('create');
                  setShowAddMenu(false);
                }}
              >
                Create Channel
              </button>
              <button
                type="button"
                className="btn btn-block"
                onClick={() => {
                  setOpenModal('join');
                  setShowAddMenu(false);
                }}
              >
                Join Channel
              </button>
            </div>
          )}
        </div>
      </div>

      <nav>
        {channels.length === 0 && <p className="list-row-subtitle">No channels yet.</p>}
        {channels.map((channel) => (
          <div
            key={channel.channel_id}
            className={`channel-item${channel.channel_id === selectedChannelId ? ' active' : ''}`}
            onClick={() => onSelectChannel(channel.channel_id)}
          >
            # {channel.name}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto' }} className="list-row-subtitle">
        User · Online
      </div>

      {openModal === 'create' && (
        <CreateChannelModal onClose={() => setOpenModal('none')} onCreated={onChannelCreated} />
      )}
      {openModal === 'join' && (
        <JoinChannelModal onClose={() => setOpenModal('none')} onJoined={onChannelJoined} />
      )}
      {openModal === 'notifications' && (
        <Modal title="Notifications" onClose={() => setOpenModal('none')}>
          <NotificationFeed />
        </Modal>
      )}
    </aside>
  );
};
