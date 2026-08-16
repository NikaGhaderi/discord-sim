import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
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
import { Button } from '@shared/components/ui/Button';
import { LoadingState, ErrorState } from '@shared/components/ui/AsyncState';
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
    return <LoadingState label="Loading…" />;
  }

  if (userError || currentUserId === null) {
    return <ErrorState detail="Couldn't load your account." />;
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
            <header className="main-header flex items-center gap-3 border-b border-border bg-surface px-5 py-3">
              <button
                type="button"
                className="mobile-menu-btn inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-raised hover:text-foreground"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open direct messages and groups list"
              >
                <Menu size={18} aria-hidden />
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
                  className="cursor-pointer border-none bg-transparent p-0 font-inherit text-inherit"
                  title="View profile"
                >
                  <strong>{selected.otherUsername}</strong>
                </button>
              ) : (
                <strong>{selected.group.name}</strong>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsScheduledOpen(true)}>
                  Scheduled
                </Button>
                {selected.kind === 'group' && (
                  <Button variant="secondary" size="sm" onClick={() => setIsGroupSettingsOpen(true)}>
                    Settings
                  </Button>
                )}
                {selected.kind === 'dm' && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isDeletingDm}
                    onClick={() => void handleDeleteOpenDm()}
                  >
                    Delete Chat
                  </Button>
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
            <header className="main-header flex items-center border-b border-border bg-surface px-5 py-3">
              <button
                type="button"
                className="mobile-menu-btn inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-raised hover:text-foreground"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open direct messages and groups list"
              >
                <Menu size={18} aria-hidden />
              </button>
            </header>
            <p className="empty-state text-muted">Select a group or a direct message to start chatting.</p>
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
