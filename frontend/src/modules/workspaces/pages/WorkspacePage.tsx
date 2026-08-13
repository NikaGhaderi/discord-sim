import React, { useEffect, useState } from 'react';
import { workspacesApi } from '../index';
import { Channel, ChannelMember } from '../types';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChannelSettingsModal } from '../components/ChannelSettingsModal';
import { profileApi } from '../../profile';
import { messagingApi } from '../../messaging';
import { MessageThread } from '../../messaging/components/MessageThread';
import { SearchBar, SearchResultItem } from '../../messaging/components/SearchBar';
import { ScheduledMessagesPanel } from '../../messaging/components/ScheduledMessagesPanel';
import { Modal } from '@shared/components/Modal';
import '../workspaces.css';

type OpenPanel = 'none' | 'search' | 'scheduled';

export const WorkspacePage: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    workspacesApi.listChannels().then((list) => {
      setChannels(list);
      setSelectedChannelId((current) => current ?? list[0]?.channel_id ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    // AuthContext doesn't expose the logged-in user's id, so we reuse the
    // profile module's own-profile endpoint (which does), same pattern as
    // PrivateSpacesPage.
    profileApi.getMyProfile().then((profile) => {
      if (!cancelled) setCurrentUserId(profile.user_id);
    });
    return () => {
      cancelled = true;
    };
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setOpenPanel('search')}>
                  Search
                </button>
                <button type="button" className="btn" onClick={() => setOpenPanel('scheduled')}>
                  Scheduled
                </button>
                <button type="button" className="btn" onClick={() => setIsSettingsOpen(true)}>
                  Settings
                </button>
              </div>
            </header>
            <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <MessageThread
                topicId={selectedChannel.default_topic_id}
                currentUserId={currentUserId ?? undefined}
              />
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

      {openPanel === 'search' && selectedChannel && (
        <Modal title="Search Messages" onClose={() => setOpenPanel('none')}>
          <SearchBar
            searchFn={async (query): Promise<SearchResultItem[]> => {
              const page = await messagingApi.searchMessages({
                query,
                topic_id: selectedChannel.default_topic_id,
              });
              return page.results.map((m) => ({
                id: String(m.base_message_id),
                sender: m.sender_username,
                timestamp: m.sent_at,
                snippet: m.content,
              }));
            }}
          />
        </Modal>
      )}

      {openPanel === 'scheduled' && selectedChannel && (
        <Modal title="Scheduled Messages" onClose={() => setOpenPanel('none')}>
          <ScheduledMessagesPanel target={{ topic_id: selectedChannel.default_topic_id }} />
        </Modal>
      )}
    </div>
  );
};

export default WorkspacePage;
