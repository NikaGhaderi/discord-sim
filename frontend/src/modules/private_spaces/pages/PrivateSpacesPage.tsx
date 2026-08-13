import React, { useEffect, useState } from 'react';
import { profileApi } from '../../profile';
import { DirectMessageList } from '../components/DirectMessageList';
import { GroupList } from '../components/GroupList';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { InvitationList } from '../components/InvitationList';
import { Group } from '../types';

export const PrivateSpacesPage: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [removedGroupId, setRemovedGroupId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState(false);

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

  if (isLoadingUser) {
    return <div style={{ padding: '20px' }}>Loading…</div>;
  }

  if (userError || currentUserId === null) {
    return <div style={{ padding: '20px' }}>Couldn&apos;t load your account.</div>;
  }

  return (
    <div className="private-spaces-layout" style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      <aside className="private-spaces-sidebar" style={{ width: '300px' }}>
        <DirectMessageList currentUserId={currentUserId} />
        <hr style={{ margin: '20px 0' }} />
        <GroupList
          onSelectGroup={(group) => setSelectedGroup(group)}
          removedGroupId={removedGroupId}
        />
      </aside>

      <main className="private-spaces-main" style={{ flex: 1 }}>
        <InvitationList />
        {selectedGroup && (
          <div style={{ marginTop: '30px' }}>
            <GroupSettingsPanel
              group={selectedGroup}
              onUpdateGroup={(updated) => setSelectedGroup(updated)}
              onDeleteOrLeave={(groupId) => {
                setSelectedGroup(null);
                setRemovedGroupId(groupId);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};
