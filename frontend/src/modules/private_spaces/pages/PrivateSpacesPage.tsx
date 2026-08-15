import React, { useEffect, useState } from 'react';
import { profileApi } from '../../profile';
import { privateSpacesApi } from '../index';
import { DirectMessageList } from '../components/DirectMessageList';
import { GroupList } from '../components/GroupList';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { InvitationList } from '../components/InvitationList';
import { MessageThread } from '../../messaging/components/MessageThread';
import { ScheduledMessagesPanel } from '../../messaging/components/ScheduledMessagesPanel';
import { Modal } from '@shared/components/Modal';
import { UserProfileModal } from '@shared/components/UserProfileModal';
import { DirectChat, Group } from '../types';

type SelectedSpace =
  | { kind: 'group'; group: Group }
  | { kind: 'dm'; dm: DirectChat; otherUsername: string }
  | null;

export const PrivateSpacesPage: React.FC = () => {
  const [selected, setSelected] = useState<SelectedSpace>(null);
  const [removedGroupId, setRemovedGroupId] = useState<number | null>(null);
  const [groupsReloadToken, setGroupsReloadToken] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isScheduledOpen, setIsScheduledOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [removedDmId, setRemovedDmId] = useState<number | null>(null);
  const [isDeletingDm, setIsDeletingDm] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // sender_id -> real username, for whichever group/DM is currently open --
  // like channels, the backend never sends a username on a message, only
  // sender_id, so it has to be resolved client-side per thread.
  const [senderNameOverrides, setSenderNameOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadCurrentUser = async () => {
      setIsLoadingUser(true);
      setUserError(false);
      try {
        // AuthContext doesn't expose the logged-in user's id, so we reuse
        // the profile module's own-profile endpoint (which does) rather
        // than inventing a new auth mechanism.
        const profile = await profileApi.getMyProfile();
        if (!cancelled) {
          setCurrentUserId(profile.user_id);
          setCurrentUsername(profile.username);
        }
      } catch {
        if (!cancelled) {
          setUserError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUser(false);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected || currentUserId === null) {
      setSenderNameOverrides({});
      return;
    }
    let cancelled = false;

    const resolveNames = async () => {
      const overrides: Record<number, string> = {};
      if (currentUsername) overrides[currentUserId] = currentUsername;

      if (selected.kind === 'dm') {
        const otherId =
          selected.dm.user1_id === currentUserId ? selected.dm.user2_id : selected.dm.user1_id;
        overrides[otherId] = selected.otherUsername;
      } else {
        const members = await privateSpacesApi.listGroupMembers(selected.group.group_id);
        const profiles = await profileApi.listPublicProfilesByIds(members.map((m) => m.user_id));
        for (const profile of profiles) {
          overrides[profile.user_id] = profile.username;
        }
      }

      if (!cancelled) setSenderNameOverrides(overrides);
    };

    void resolveNames();
    return () => {
      cancelled = true;
    };
  }, [selected, currentUserId, currentUsername]);

  const handleSelectDm = async (dm: DirectChat) => {
    if (currentUserId === null) return;
    const otherId = dm.user1_id === currentUserId ? dm.user2_id : dm.user1_id;
    const [otherProfile] = await profileApi.listPublicProfilesByIds([otherId]);
    setSelected({
      kind: 'dm',
      dm,
      otherUsername: otherProfile?.username ?? `User #${otherId}`,
    });
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteOpenDm = async () => {
    if (selected?.kind !== 'dm') return;
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    setIsDeletingDm(true);
    try {
      await privateSpacesApi.deleteDirectChat(selected.dm.direct_chat_id);
      setRemovedDmId(selected.dm.direct_chat_id);
      setSelected(null);
    } finally {
      setIsDeletingDm(false);
    }
  };

  if (isLoadingUser) {
    return <div style={{ padding: '20px' }}>Loading…</div>;
  }

  if (userError || currentUserId === null) {
    return <div style={{ padding: '20px' }}>Couldn&apos;t load your account.</div>;
  }

  return (
    <div className="private-spaces-layout workspace-layout">
      {isMobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <aside
        className={`private-spaces-sidebar sidebar${isMobileSidebarOpen ? ' mobile-open' : ''}`}
        style={{ overflowY: 'auto' }}
      >
        <DirectMessageList
          currentUserId={currentUserId}
          onSelectDm={(dm) => void handleSelectDm(dm)}
          removedDmId={removedDmId}
          onDeletedDm={(dmId) => {
            if (selected?.kind === 'dm' && selected.dm.direct_chat_id === dmId) {
              setSelected(null);
            }
          }}
        />
        <hr style={{ margin: '20px 0', borderColor: 'var(--ws-border)' }} />
        <GroupList
          onSelectGroup={(group) => {
            setSelected({ kind: 'group', group });
            setIsMobileSidebarOpen(false);
          }}
          removedGroupId={removedGroupId}
          reloadToken={groupsReloadToken}
        />
        <hr style={{ margin: '20px 0', borderColor: 'var(--ws-border)' }} />
        <InvitationList onAccepted={() => setGroupsReloadToken((t) => t + 1)} />
      </aside>

      <main className="private-spaces-main main-panel" style={{ minWidth: 0 }}>
        {selected ? (
          <>
            <header className="main-header">
              <button
                type="button"
                className="btn mobile-menu-btn"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open direct messages and groups list"
              >
                ☰
              </button>
              {selected.kind === 'dm' ? (
                <button
                  type="button"
                  onClick={() => {
                    const otherId =
                      selected.dm.user1_id === currentUserId
                        ? selected.dm.user2_id
                        : selected.dm.user1_id;
                    setViewingUserId(otherId);
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                  title="View profile"
                >
                  <strong>{selected.otherUsername}</strong>
                </button>
              ) : (
                <strong>{selected.group.name}</strong>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button type="button" className="btn" onClick={() => setIsScheduledOpen(true)}>
                  Scheduled
                </button>
                {selected.kind === 'group' && (
                  <button type="button" className="btn" onClick={() => setIsGroupSettingsOpen(true)}>
                    Settings
                  </button>
                )}
                {selected.kind === 'dm' && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={isDeletingDm}
                    onClick={() => void handleDeleteOpenDm()}
                  >
                    Delete Chat
                  </button>
                )}
              </div>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <MessageThread
                groupId={selected.kind === 'group' ? selected.group.group_id : undefined}
                directChatId={selected.kind === 'dm' ? selected.dm.direct_chat_id : undefined}
                currentUserId={currentUserId}
                senderNameOverrides={senderNameOverrides}
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
                aria-label="Open direct messages and groups list"
              >
                ☰
              </button>
            </header>
            <p className="empty-state">Select a group or a direct message to start chatting.</p>
          </>
        )}
      </main>

      {isGroupSettingsOpen && selected?.kind === 'group' && (
        <Modal title="Group Settings" onClose={() => setIsGroupSettingsOpen(false)}>
          <GroupSettingsPanel
            group={selected.group}
            onUpdateGroup={(updated) => setSelected({ kind: 'group', group: updated })}
            onDeleteOrLeave={(groupId) => {
              setSelected(null);
              setRemovedGroupId(groupId);
              setIsGroupSettingsOpen(false);
            }}
          />
        </Modal>
      )}

      {isScheduledOpen && selected && (
        <Modal title="Scheduled Messages" onClose={() => setIsScheduledOpen(false)}>
          <ScheduledMessagesPanel
            target={
              selected.kind === 'group'
                ? { group_id: selected.group.group_id }
                : { direct_chat_id: selected.dm.direct_chat_id }
            }
          />
        </Modal>
      )}

      {viewingUserId !== null && (
        <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
};
