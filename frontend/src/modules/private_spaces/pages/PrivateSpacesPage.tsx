import React, { useState } from 'react';
import { DirectMessageList } from '../components/DirectMessageList';
import { GroupList } from '../components/GroupList';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { InvitationList } from '../components/InvitationList';
import { Group } from '../types';

export const PrivateSpacesPage: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  return (
    <div className="private-spaces-layout" style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      <aside className="private-spaces-sidebar" style={{ width: '300px' }}>
        <DirectMessageList />
        <hr style={{ margin: '20px 0' }} />
        <GroupList onSelectGroup={(group) => setSelectedGroup(group)} />
      </aside>

      <main className="private-spaces-main" style={{ flex: 1 }}>
        <InvitationList />
        {selectedGroup && (
          <div style={{ marginTop: '30px' }}>
            <GroupSettingsPanel
              group={selectedGroup}
              onUpdateGroup={(updated) => setSelectedGroup(updated)}
              onDeleteOrLeave={() => setSelectedGroup(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
};