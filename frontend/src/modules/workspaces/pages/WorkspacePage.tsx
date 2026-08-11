import React, { useEffect, useState } from 'react';
import { workspacesApi } from '../index';
import { Channel, ChannelMember } from '../types';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChannelSettingsModal } from '../components/ChannelSettingsModal';
import '../workspaces.css';

export const WorkspacePage: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    workspacesApi.listChannels().then((list) => {
      setChannels(list);
      setSelectedChannelId((current) => current ?? list[0]?.channel_id ?? null);
    });
  }, []);

  const selectedChannel = channels.find((c) => c.channel_id === selectedChannelId) ?? null;

  const removeChannelFromList = (channelId: number) => {
    setChannels((prev) => prev.filter((c) => c.channel_id !== channelId));
    setSelectedChannelId((current) => (current === channelId ? null : current));
  };

  return (
    <div className="workspace-layout" dir="ltr" lang="en">
      <ChannelSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        onChannelCreated={(channel) => {
          setChannels((prev) => [...prev, channel]);
          setSelectedChannelId(channel.channel_id);
        }}
        onChannelJoined={(membership: ChannelMember) => {
          workspacesApi.listChannels().then(setChannels);
          setSelectedChannelId(membership.channel_id);
        }}
      />

      <main className="main-panel">
        {selectedChannel ? (
          <>
            <header className="main-header">
              <strong># {selectedChannel.name}</strong>
              <button type="button" className="btn" onClick={() => setIsSettingsOpen(true)}>
                Settings
              </button>
            </header>
            <div className="main-content">
              <p className="empty-state">Messaging is out of scope for this module.</p>
            </div>
          </>
        ) : (
          <p className="empty-state">Select or create a channel to get started.</p>
        )}
      </main>

      {isSettingsOpen && selectedChannel && (
        <ChannelSettingsModal
          channel={selectedChannel}
          onClose={() => setIsSettingsOpen(false)}
          onUpdated={(channelId, name) => {
            setChannels((prev) =>
              prev.map((c) => (c.channel_id === channelId ? { ...c, name } : c))
            );
          }}
          onDeleted={(channelId) => {
            removeChannelFromList(channelId);
            setIsSettingsOpen(false);
          }}
          onLeft={(channelId) => {
            removeChannelFromList(channelId);
            setIsSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default WorkspacePage;
