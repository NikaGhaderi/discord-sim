import React, { useEffect, useState } from 'react';
import { profileApi } from '../../profile';
import { DirectMessageList } from '../components/DirectMessageList';
import { GroupList } from '../components/GroupList';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { InvitationList } from '../components/InvitationList';
import { MessageThread } from '../../messaging/components/MessageThread';
import { Modal } from '@shared/components/Modal';
import { DirectChat, Group } from '../types';

type SelectedSpace =
  | { kind: 'group'; group: Group }
  | { kind: 'dm'; dm: DirectChat; otherUsername: string }
  | null;

export const PrivateSpacesPage: React.FC = () => {
  const [selected, setSelected] = useState<SelectedSpace>(null);
  const [removedGroupId, setRemovedGroupId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);

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

  const handleSelectDm = async (dm: DirectChat) => {
    if (currentUserId === null) return;
    const otherId = dm.user1_id === currentUserId ? dm.user2_id : dm.user1_id;
    const [otherProfile] = await profileApi.listPublicProfilesByIds([otherId]);
    setSelected({
      kind: 'dm',
      dm,
      otherUsername: otherProfile?.username ?? `User #${otherId}`,
    });
  };

  if (isLoadingUser) {
    return <div style={{ padding: '20px' }}>Loading…</div>;
  }

  if (userError || currentUserId === null) {
    return <div style={{ padding: '20px' }}>Couldn&apos;t load your account.</div>;
  }

  return (
    <div className="private-spaces-layout" style={{ display: 'flex', height: '100%' }}>
      <aside className="private-spaces-sidebar" style={{ width: '300px', padding: '20px', overflowY: 'auto' }}>
        <DirectMessageList currentUserId={currentUserId} onSelectDm={(dm) => void handleSelectDm(dm)} />
        <hr style={{ margin: '20px 0' }} />
        <GroupList
          onSelectGroup={(group) => setSelected({ kind: 'group', group })}
          removedGroupId={removedGroupId}
        />
        <hr style={{ margin: '20px 0' }} />
        <InvitationList />
      </aside>

      <main
        className="private-spaces-main"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        {selected ? (
          <>
            <header className="main-header">
              <strong>
                {selected.kind === 'group' ? selected.group.name : selected.otherUsername}
              </strong>
              {selected.kind === 'group' && (
                <button type="button" className="btn" onClick={() => setIsGroupSettingsOpen(true)}>
                  Settings
                </button>
              )}
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <MessageThread
                groupId={selected.kind === 'group' ? selected.group.group_id : undefined}
                directChatId={selected.kind === 'dm' ? selected.dm.direct_chat_id : undefined}
                currentUserId={currentUserId}
              />
            </div>
          </>
        ) : (
          <p className="empty-state">Select a group or a direct message to start chatting.</p>
        )}
      </main>

      {isGroupSettingsOpen && selected?.kind === 'group' && (
        <Modal title={`Group Settings: ${selected.group.name}`} onClose={() => setIsGroupSettingsOpen(false)}>
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
    </div>
  );
};
