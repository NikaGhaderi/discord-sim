import React, { useEffect, useState } from 'react';
import { workspacesApi } from '../index';
import { Channel, ChannelMember, ChannelPermission } from '../types';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChannelSettingsModal } from '../components/ChannelSettingsModal';
import { MemberListModal } from '../components/MemberListModal';
import { TopicTabs } from '../components/TopicTabs';
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
  const [isMemberListOpen, setIsMemberListOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [myChannelPermissions, setMyChannelPermissions] = useState<ChannelPermission[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [memberNicknames, setMemberNicknames] = useState<Record<number, string>>({});

  useEffect(() => {
    workspacesApi.listChannels().then((list) => {
      setChannels(list);
      setSelectedChannelId((current) => current ?? list[0]?.channel_id ?? null);
    });
  }, []);

  useEffect(() => {
    if (selectedChannelId === null) {
      setHasDeletePermission(false);
      setMyChannelPermissions([]);
      return;
    }
    let cancelled = false;
    workspacesApi.getMyPermissions(selectedChannelId).then((permissions) => {
      if (!cancelled) {
        setHasDeletePermission(permissions.includes('DELETE_MESSAGES'));
        setMyChannelPermissions(permissions);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedChannelId]);

  // Members' channel nicknames aren't returned on the message itself (the
  // backend only ever sends sender_id), so they're resolved separately here
  // and merged into how the thread renders each sender's name. Re-fetched
  // whenever Settings closes, since that's the only place a nickname can
  // change.
  useEffect(() => {
    if (selectedChannelId === null) {
      setMemberNicknames({});
      return;
    }
    if (isSettingsOpen) return;
    let cancelled = false;
    workspacesApi.listMembers(selectedChannelId).then((members) => {
      if (cancelled) return;
      const nicknames: Record<number, string> = {};
      for (const member of members) {
        if (member.nickname_in_channel) {
          nicknames[member.user_id] = member.nickname_in_channel;
        }
      }
      setMemberNicknames(nicknames);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedChannelId, isSettingsOpen]);

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
  const activeTopicId = selectedTopicId ?? selectedChannel?.default_topic_id;

  // Switching channels resets the active topic back to that channel's
  // default -- a topic id from the previous channel would otherwise leak
  // across and either point at the wrong channel or not exist there at all.
  useEffect(() => {
    setSelectedTopicId(null);
  }, [selectedChannelId]);

  const removeChannelFromList = (channelId: number) => {
    setChannels((prev) => prev.filter((c) => c.channel_id !== channelId));
    setSelectedChannelId((current) => (current === channelId ? null : current));
  };

  return (
    <div className="workspace-layout" dir="ltr" lang="en">
      {isMobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <ChannelSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        mobileOpen={isMobileSidebarOpen}
        onSelectChannel={(channelId) => {
          setSelectedChannelId(channelId);
          setIsMobileSidebarOpen(false);
        }}
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
              <button
                type="button"
                className="btn mobile-menu-btn"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open channel list"
              >
                ☰
              </button>
              <span
                onClick={() => setIsMemberListOpen(true)}
                style={{ cursor: 'pointer' }}
                title="View channel members"
                aria-label={`View members of ${selectedChannel.name}`}
                role="button"
                tabIndex={0}
              >
                <strong># {selectedChannel.name}</strong>
              </span>
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
            <TopicTabs
              channelId={selectedChannel.channel_id}
              selectedTopicId={activeTopicId}
              onSelectTopic={setSelectedTopicId}
              refreshKey={isSettingsOpen ? 1 : 0}
            />
            <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <MessageThread
                topicId={activeTopicId}
                currentUserId={currentUserId ?? undefined}
                hasDeletePermission={hasDeletePermission}
                hasSendMediaPermission={myChannelPermissions.includes('SEND_MEDIA')}
                hasSendMessagesPermission={myChannelPermissions.includes('SEND_MESSAGES')}
                senderNameOverrides={memberNicknames}
              />
            </div>
          </>
        ) : (
          <>
            <header className="main-header">
              <button
                type="button"
                className="btn mobile-menu-btn"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open channel list"
              >
                ☰
              </button>
            </header>
            <p className="empty-state">Select or create a channel to get started.</p>
          </>
        )}
      </main>

      {isSettingsOpen && selectedChannel && (
        <ChannelSettingsModal
          channel={selectedChannel}
          currentUserId={currentUserId ?? undefined}
          myPermissions={myChannelPermissions}
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

      {isMemberListOpen && selectedChannel && (
        <MemberListModal
          channelId={selectedChannel.channel_id}
          currentUserId={currentUserId ?? undefined}
          canKick={myChannelPermissions.includes('KICK_MEMBERS')}
          onClose={() => setIsMemberListOpen(false)}
        />
      )}

      {openPanel === 'search' && selectedChannel && activeTopicId !== undefined && (
        <Modal title="Search Messages" onClose={() => setOpenPanel('none')}>
          <SearchBar
            searchFn={async (query): Promise<SearchResultItem[]> => {
              const page = await messagingApi.searchMessages({
                query,
                topic_id: activeTopicId,
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

      {openPanel === 'scheduled' && selectedChannel && activeTopicId !== undefined && (
        <Modal title="Scheduled Messages" onClose={() => setOpenPanel('none')}>
          <ScheduledMessagesPanel target={{ topic_id: activeTopicId }} />
        </Modal>
      )}
    </div>
  );
};

export default WorkspacePage;
