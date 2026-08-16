import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Channel, ChannelMember } from '../types';
import { CreateChannelModal } from './CreateChannelModal';
import { JoinChannelModal } from './JoinChannelModal';
import { Button } from '@shared/components/ui/Button';
import { cn } from '@shared/lib/cn';

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannelId: number | null;
  onSelectChannel: (channelId: number) => void;
  onChannelCreated: (channel: Channel) => void;
  onChannelJoined: (membership: ChannelMember) => void;
  /** True to slide this in as an open drawer on mobile (see the
   * `.sidebar.mobile-open` rule in workspaces.css) -- irrelevant above the
   * mobile breakpoint, where the sidebar is always visible regardless. */
  mobileOpen?: boolean;
}

type OpenModal = 'none' | 'create' | 'join';

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onChannelCreated,
  onChannelJoined,
  mobileOpen = false,
}) => {
  const [openModal, setOpenModal] = useState<OpenModal>('none');
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''} flex h-full flex-col gap-3 bg-surface p-3`}>
      {/*
        "Home"/"Friends"/"Direct Messages" used to live here as
        non-functional placeholders (no onClick at all, and "Friends" has
        no backing feature anywhere in the backend). Real cross-page
        navigation, and the notifications bell (which used to live here as
        a channels-only entry, invisible from private-spaces), now both
        live in the persistent <AppNav>.
      */}
      <div className="flex items-center justify-between rounded-full bg-black/25 px-2.5 py-1">
        <span className="text-xs font-semibold tracking-wide text-muted">CHANNELS</span>
        <div className="relative">
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-surface-raised hover:text-foreground"
            onClick={() => setShowAddMenu((v) => !v)}
            aria-label="Add channel"
          >
            <Plus size={14} aria-hidden />
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-card border border-border bg-surface-raised p-2 shadow-[0_24px_80px_rgb(0_0_0/18%)]">
              <Button
                variant="secondary"
                size="sm"
                className="mb-1.5 w-full justify-start"
                onClick={() => {
                  setOpenModal('create');
                  setShowAddMenu(false);
                }}
              >
                Create Channel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOpenModal('join');
                  setShowAddMenu(false);
                }}
              >
                Join Channel
              </Button>
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {channels.length === 0 && <p className="px-2 text-sm text-muted">No channels yet.</p>}
        {channels.map((channel) => (
          <div
            key={channel.channel_id}
            className={cn(
              'cursor-pointer rounded-xl border-l-2 border-transparent px-3 py-2 text-sm text-muted transition hover:bg-surface-raised hover:text-foreground',
              channel.channel_id === selectedChannelId &&
                'border-accent bg-surface-raised font-semibold text-foreground'
            )}
            onClick={() => onSelectChannel(channel.channel_id)}
          >
            # {channel.name}
          </div>
        ))}
      </nav>

      <div className="mt-auto text-xs text-muted">User · Online</div>

      {openModal === 'create' && (
        <CreateChannelModal onClose={() => setOpenModal('none')} onCreated={onChannelCreated} />
      )}
      {openModal === 'join' && (
        <JoinChannelModal onClose={() => setOpenModal('none')} onJoined={onChannelJoined} />
      )}
    </aside>
  );
};
