import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { CreateChannelModal } from '../components/CreateChannelModal';
import { JoinChannelModal } from '../components/JoinChannelModal';
import { ChannelSettingsModal } from '../components/ChannelSettingsModal';
import { ManageRolesModal } from '../components/ManageRolesModal';
import { RoleFormModal } from '../components/RoleFormModal';
import { TopicManagerModal } from '../components/TopicManagerModal';
import { WorkspacePage } from '../pages/WorkspacePage';
import { workspacesApi } from '../index';
import { messagingApi } from '../../messaging';
import { Channel, ChannelMember, Role, Topic, CHANNEL_PERMISSIONS } from '../types';

vi.mock('../index', () => ({
  workspacesApi: {
    listChannels: vi.fn(),
    getChannel: vi.fn(),
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
    deleteChannel: vi.fn(),
    joinChannel: vi.fn(),
    joinChannelByInviteToken: vi.fn(),
    leaveChannel: vi.fn(),
    listMembers: vi.fn(),
    getMyPermissions: vi.fn().mockResolvedValue([]),
    updateMemberNickname: vi.fn(),
    kickMember: vi.fn(),
    listRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    assignRole: vi.fn(),
    listTopics: vi.fn().mockResolvedValue([]),
    getTopic: vi.fn(),
    createTopic: vi.fn(),
    deleteTopic: vi.fn(),
  },
}));

vi.mock('../../notifications', () => ({
  notificationsApi: {
    listNotifications: vi.fn().mockResolvedValue([]),
    markNotificationAsRead: vi.fn(),
  },
  socketClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    onNewMessage: vi.fn(() => vi.fn()),
    onMessageDeleted: vi.fn(() => vi.fn()),
    onNewNotification: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../profile', () => ({
  profileApi: {
    getMyProfile: vi.fn().mockResolvedValue({
      user_id: 1,
      username: 'nika_lead',
      display_name: 'Nika',
      avatar_url: '',
      bio: '',
      allow_group_invitations: true,
    }),
    updateProfile: vi.fn(),
    getPublicProfile: vi.fn(),
    listPublicProfilesByIds: vi.fn(),
  },
}));

vi.mock('../../messaging', () => ({
  messagingApi: {
    sendMessage: vi.fn(),
    listMessages: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    attachMedia: vi.fn(),
    searchMessages: vi.fn(),
    createScheduledMessage: vi.fn(),
    cancelScheduledMessage: vi.fn(),
    listScheduledMessages: vi.fn().mockResolvedValue([]),
  },
}));

const channel: Channel = {
  channel_id: 1,
  name: 'general',
  creator_id: 9,
  default_topic_id: 5,
  created_at: '2026-01-01T00:00:00Z',
  invite_token: 'abc123',
};

const member: ChannelMember = {
  channel_id: 1,
  user_id: 42,
  nickname_in_channel: 'Sprint Master',
  joined_at: '2026-01-01T00:00:00Z',
};

const ownerRole: Role = { role_id: 1, channel_id: 1, name: 'Owner', permissions: [] };
const modRole: Role = {
  role_id: 2,
  channel_id: 1,
  name: 'Moderator',
  permissions: ['DELETE_MESSAGES'],
};

const topic: Topic = { topic_id: 5, channel_id: 1, title: 'general', created_at: '2026-01-01T00:00:00Z' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('ChannelSidebar', () => {
  it('shows an empty state with no channels', () => {
    render(
      <ChannelSidebar
        channels={[]}
        selectedChannelId={null}
        onSelectChannel={vi.fn()}
        onChannelCreated={vi.fn()}
        onChannelJoined={vi.fn()}
      />
    );
    expect(screen.getByText('No channels yet.')).toBeInTheDocument();
  });

  it('lists channels and calls onSelectChannel when clicked', () => {
    const onSelectChannel = vi.fn();
    render(
      <ChannelSidebar
        channels={[channel]}
        selectedChannelId={null}
        onSelectChannel={onSelectChannel}
        onChannelCreated={vi.fn()}
        onChannelJoined={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('# general'));
    expect(onSelectChannel).toHaveBeenCalledWith(1);
  });

  it('opens the create-channel modal from the add menu', () => {
    render(
      <ChannelSidebar
        channels={[]}
        selectedChannelId={null}
        onSelectChannel={vi.fn()}
        onChannelCreated={vi.fn()}
        onChannelJoined={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Add channel'));
    fireEvent.click(screen.getByText('Create Channel'));
    expect(screen.getByText('Create Channel', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the join-channel modal from the add menu', () => {
    render(
      <ChannelSidebar
        channels={[]}
        selectedChannelId={null}
        onSelectChannel={vi.fn()}
        onChannelCreated={vi.fn()}
        onChannelJoined={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Add channel'));
    fireEvent.click(screen.getByText('Join Channel'));
    expect(screen.getByText('Join a Channel')).toBeInTheDocument();
  });

  it('opens the notification feed from the sidebar nav', async () => {
    render(
      <ChannelSidebar
        channels={[]}
        selectedChannelId={null}
        onSelectChannel={vi.fn()}
        onChannelCreated={vi.fn()}
        onChannelJoined={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Notifications'));

    expect(screen.getByText('Notifications', { selector: 'h2' })).toBeInTheDocument();
    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  });
});

describe('CreateChannelModal', () => {
  it('submits the trimmed name and calls onCreated + onClose on success', async () => {
    vi.mocked(workspacesApi.createChannel).mockResolvedValueOnce(channel);
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<CreateChannelModal onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Channel Name'), {
      target: { value: '  general  ' },
    });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(channel));
    expect(workspacesApi.createChannel).toHaveBeenCalledWith('general');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error message when creation fails', async () => {
    vi.mocked(workspacesApi.createChannel).mockRejectedValueOnce(new Error('nope'));
    render(<CreateChannelModal onClose={vi.fn()} onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Channel Name'), { target: { value: 'general' } });
    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText('Failed to create channel. Please try again.')).toBeInTheDocument();
  });

  it('requires a channel name before it can submit', () => {
    render(<CreateChannelModal onClose={vi.fn()} onCreated={vi.fn()} />);
    const input = screen.getByLabelText('Channel Name') as HTMLInputElement;
    expect(input).toBeRequired();
  });
});

describe('JoinChannelModal', () => {
  it('joins via invite token, not a raw channel id', async () => {
    vi.mocked(workspacesApi.joinChannelByInviteToken).mockResolvedValueOnce(member);
    const onJoined = vi.fn();
    render(<JoinChannelModal onClose={vi.fn()} onJoined={onJoined} />);

    fireEvent.change(screen.getByLabelText('Invite Link or Token'), {
      target: { value: 'abc123' },
    });
    fireEvent.change(screen.getByLabelText('Nickname (optional)'), {
      target: { value: 'Nik' },
    });
    fireEvent.click(screen.getByText('Join'));

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(member));
    expect(workspacesApi.joinChannelByInviteToken).toHaveBeenCalledWith('abc123', 'Nik');
    expect(workspacesApi.joinChannel).not.toHaveBeenCalled();
  });

  it('passes undefined nickname when left blank', async () => {
    vi.mocked(workspacesApi.joinChannelByInviteToken).mockResolvedValueOnce(member);
    render(<JoinChannelModal onClose={vi.fn()} onJoined={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Invite Link or Token'), {
      target: { value: 'abc123' },
    });
    fireEvent.click(screen.getByText('Join'));

    await waitFor(() =>
      expect(workspacesApi.joinChannelByInviteToken).toHaveBeenCalledWith('abc123', undefined)
    );
  });
});

describe('ChannelSettingsModal', () => {
  it('renames the channel', async () => {
    vi.mocked(workspacesApi.updateChannel).mockResolvedValueOnce({
      channel_id: 1,
      name: 'renamed',
    });
    const onUpdated = vi.fn();
    render(
      <ChannelSettingsModal
        channel={channel}
        onClose={vi.fn()}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
        onLeft={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Channel Name'), { target: { value: 'renamed' } });
    fireEvent.click(screen.getByText('Save Name'));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(1, 'renamed'));
  });

  it('does not render the nickname field when currentUserId is unknown', () => {
    render(
      <ChannelSettingsModal
        channel={channel}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onLeft={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/my nickname/i)).not.toBeInTheDocument();
  });

  it('saves the current user\'s own nickname for the channel', async () => {
    vi.mocked(workspacesApi.updateMemberNickname).mockResolvedValueOnce({
      channel_id: 1,
      user_id: 42,
      nickname_in_channel: 'Sprint Master',
      joined_at: '2026-01-01T00:00:00Z',
    });
    render(
      <ChannelSettingsModal
        channel={channel}
        currentUserId={42}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onLeft={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/my nickname/i), {
      target: { value: 'Sprint Master' },
    });
    fireEvent.click(screen.getByText('Save Nickname'));

    await waitFor(() => {
      expect(workspacesApi.updateMemberNickname).toHaveBeenCalledWith(1, 42, 'Sprint Master');
    });
    expect(await screen.findByText('Saved!')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, and does nothing if declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    const onDeleted = vi.fn();
    render(
      <ChannelSettingsModal
        channel={channel}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={onDeleted}
        onLeft={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Delete Channel'));

    expect(workspacesApi.deleteChannel).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('deletes the channel once confirmed', async () => {
    vi.mocked(workspacesApi.deleteChannel).mockResolvedValueOnce(undefined);
    const onDeleted = vi.fn();
    render(
      <ChannelSettingsModal
        channel={channel}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={onDeleted}
        onLeft={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Delete Channel'));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(1));
  });

  it('leaves the channel once confirmed', async () => {
    vi.mocked(workspacesApi.leaveChannel).mockResolvedValueOnce(undefined);
    const onLeft = vi.fn();
    render(
      <ChannelSettingsModal
        channel={channel}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onLeft={onLeft}
      />
    );

    fireEvent.click(screen.getByText('Leave Channel'));

    await waitFor(() => expect(onLeft).toHaveBeenCalledWith(1));
  });

  it('shows the invite link and copies it to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <ChannelSettingsModal
        channel={channel}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onLeft={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Invite Link')).toHaveValue('abc123');

    fireEvent.click(screen.getByText('Copy'));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('abc123'));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('navigates into the roles and topics sub-panels', async () => {
    vi.mocked(workspacesApi.listRoles).mockResolvedValue([]);
    vi.mocked(workspacesApi.listMembers).mockResolvedValue([]);
    vi.mocked(workspacesApi.listTopics).mockResolvedValue([]);

    render(
      <ChannelSettingsModal
        channel={channel}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onLeft={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Manage Roles'));
    expect(screen.getByText('Manage Roles', { selector: 'h2' })).toBeInTheDocument();
    await waitFor(() => expect(workspacesApi.listRoles).toHaveBeenCalled());
  });
});

describe('ManageRolesModal', () => {
  it('loads and lists roles and members', async () => {
    vi.mocked(workspacesApi.listRoles).mockResolvedValueOnce([ownerRole, modRole]);
    vi.mocked(workspacesApi.listMembers).mockResolvedValueOnce([member]);

    render(<ManageRolesModal channelId={1} onClose={vi.fn()} />);

    expect(await screen.findByText('Moderator', { selector: '.list-row-title' })).toBeInTheDocument();
    expect(screen.getByText('Delete Messages')).toBeInTheDocument();
  });

  it('disables deleting the Owner role', async () => {
    vi.mocked(workspacesApi.listRoles).mockResolvedValueOnce([ownerRole]);
    vi.mocked(workspacesApi.listMembers).mockResolvedValueOnce([]);

    render(<ManageRolesModal channelId={1} onClose={vi.fn()} />);
    await screen.findByText('Owner', { selector: '.list-row-title' });

    const row = screen
      .getByText('Owner', { selector: '.list-row-title' })
      .closest('.list-row') as HTMLElement;
    const deleteBtn = within(row).getByText('Delete');
    expect(deleteBtn).toBeDisabled();
  });

  it('deletes a non-owner role once confirmed', async () => {
    vi.mocked(workspacesApi.listRoles).mockResolvedValueOnce([ownerRole, modRole]);
    vi.mocked(workspacesApi.listMembers).mockResolvedValueOnce([]);
    vi.mocked(workspacesApi.deleteRole).mockResolvedValueOnce(undefined);

    render(<ManageRolesModal channelId={1} onClose={vi.fn()} />);
    await screen.findByText('Moderator', { selector: '.list-row-title' });

    const row = screen
      .getByText('Moderator', { selector: '.list-row-title' })
      .closest('.list-row') as HTMLElement;
    fireEvent.click(within(row).getByText('Delete'));

    await waitFor(() => expect(workspacesApi.deleteRole).toHaveBeenCalledWith(1, 2));
    await waitFor(() =>
      expect(screen.queryByText('Moderator', { selector: '.list-row-title' })).not.toBeInTheDocument()
    );
  });

  it('assigns a role to a member', async () => {
    vi.mocked(workspacesApi.listRoles).mockResolvedValueOnce([modRole]);
    vi.mocked(workspacesApi.listMembers).mockResolvedValueOnce([member]);
    vi.mocked(workspacesApi.assignRole).mockResolvedValueOnce({
      userrole_id: 1,
      user_id: 42,
      role_id: 2,
      assigned_at: '2026-01-01T00:00:00Z',
    });

    render(<ManageRolesModal channelId={1} onClose={vi.fn()} />);
    await screen.findByText('Sprint Master');

    fireEvent.change(screen.getByDisplayValue('Select member'), { target: { value: '42' } });
    fireEvent.change(screen.getByDisplayValue('Select role'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Assign'));

    await waitFor(() => expect(workspacesApi.assignRole).toHaveBeenCalledWith(1, 42, 2));
  });
});

describe('RoleFormModal', () => {
  it('lists exactly the 6 SCRUM-18 permission codes, no more, no fewer', () => {
    render(
      <RoleFormModal channelId={1} existingRole={null} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(CHANNEL_PERMISSIONS.length);
    expect(checkboxes).toHaveLength(6);
  });

  it('creates a new role with the selected permissions', async () => {
    vi.mocked(workspacesApi.createRole).mockResolvedValueOnce(modRole);
    const onSaved = vi.fn();
    render(
      <RoleFormModal channelId={1} existingRole={null} onClose={vi.fn()} onSaved={onSaved} />
    );

    fireEvent.change(screen.getByLabelText('Role Name'), { target: { value: 'Moderator' } });
    fireEvent.click(screen.getByText('Delete Messages'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(workspacesApi.createRole).toHaveBeenCalledWith(1, {
        name: 'Moderator',
        permissions: ['DELETE_MESSAGES'],
      })
    );
    expect(onSaved).toHaveBeenCalledWith(modRole);
  });

  it('disables the name field when editing an existing role', () => {
    render(
      <RoleFormModal
        channelId={1}
        existingRole={modRole}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Role Name')).toBeDisabled();
  });

  it('updates only permissions when editing, never the name', async () => {
    vi.mocked(workspacesApi.updateRole).mockResolvedValueOnce({
      ...modRole,
      permissions: ['DELETE_MESSAGES', 'KICK_MEMBERS'],
    });
    render(
      <RoleFormModal
        channelId={1}
        existingRole={modRole}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Kick Members'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(workspacesApi.updateRole).toHaveBeenCalledWith(1, 2, {
        permissions: ['DELETE_MESSAGES', 'KICK_MEMBERS'],
      })
    );
  });
});

describe('TopicManagerModal', () => {
  it('lists topics and creates a new one', async () => {
    vi.mocked(workspacesApi.listTopics).mockResolvedValueOnce([topic]);
    vi.mocked(workspacesApi.createTopic).mockResolvedValueOnce({
      topic_id: 6,
      channel_id: 1,
      title: 'announcements',
      created_at: '2026-01-01T00:00:00Z',
    });

    render(<TopicManagerModal channelId={1} onClose={vi.fn()} />);
    expect(await screen.findByText('# general')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('New Topic Title'), {
      target: { value: 'announcements' },
    });
    fireEvent.click(screen.getByText('Add Topic'));

    await waitFor(() => expect(screen.getByText('# announcements')).toBeInTheDocument());
  });

  it('blocks deleting the last remaining topic', async () => {
    vi.mocked(workspacesApi.listTopics).mockResolvedValueOnce([topic]);
    render(<TopicManagerModal channelId={1} onClose={vi.fn()} />);
    await screen.findByText('# general');

    fireEvent.click(screen.getByText('Delete'));

    expect(
      await screen.findByText('A channel must keep at least one topic.')
    ).toBeInTheDocument();
    expect(workspacesApi.deleteTopic).not.toHaveBeenCalled();
  });

  it('allows deleting a topic when more than one exists', async () => {
    const secondTopic: Topic = { topic_id: 7, channel_id: 1, title: 'random', created_at: '2026-01-01T00:00:00Z' };
    vi.mocked(workspacesApi.listTopics).mockResolvedValueOnce([topic, secondTopic]);
    vi.mocked(workspacesApi.deleteTopic).mockResolvedValueOnce(undefined);

    render(<TopicManagerModal channelId={1} onClose={vi.fn()} />);
    await screen.findByText('# general');

    const row = screen.getByText('# general').closest('.list-row') as HTMLElement;
    fireEvent.click(within(row).getByText('Delete'));

    await waitFor(() => expect(workspacesApi.deleteTopic).toHaveBeenCalledWith(1, 5));
  });
});

describe('WorkspacePage', () => {
  it('loads channels and auto-selects the first one', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);

    render(<WorkspacePage />);

    expect(await screen.findAllByText('# general')).not.toHaveLength(0);
  });

  it('shows an empty state when there are no channels', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([]);

    render(<WorkspacePage />);

    expect(await screen.findByText('Select or create a channel to get started.')).toBeInTheDocument();
  });

  it('opens channel settings from the main panel', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);

    render(<WorkspacePage />);
    await screen.findAllByText('# general');

    fireEvent.click(screen.getByText('Settings'));

    expect(screen.getByText('Channel Settings')).toBeInTheDocument();
  });

  it('renders the real message thread for the selected channel default topic', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          base_message_id: 1,
          sender_id: 1,
          sender_username: 'User #1',
          content: 'hello from the thread',
          sent_at: '2026-01-01T00:00:00Z',
          is_edited: false,
          media: [],
        },
      ],
    });

    render(<WorkspacePage />);

    expect(await screen.findByText('hello from the thread')).toBeInTheDocument();
    expect(messagingApi.listMessages).toHaveBeenCalledWith(
      { topic_id: channel.default_topic_id },
      20,
      0
    );
  });

  it('hides the topic tab bar when the channel has only one topic', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);
    vi.mocked(workspacesApi.listTopics).mockResolvedValueOnce([topic]);
    vi.mocked(messagingApi.listMessages).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<WorkspacePage />);
    await screen.findAllByText('# general');

    await waitFor(() => expect(workspacesApi.listTopics).toHaveBeenCalledWith(1));
    // "# general" legitimately appears twice already (sidebar item + main
    // header) even with no topic tab bar -- a third instance would mean the
    // (single-topic) tab bar rendered anyway.
    expect(screen.queryAllByText('# general')).toHaveLength(2);
  });

  it('shows a topic tab bar and switches the active thread when a channel has multiple topics', async () => {
    const secondTopic: Topic = {
      topic_id: 6,
      channel_id: 1,
      title: 'random',
      created_at: '2026-01-01T00:00:00Z',
    };
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);
    vi.mocked(workspacesApi.listTopics).mockResolvedValueOnce([topic, secondTopic]);
    vi.mocked(messagingApi.listMessages).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<WorkspacePage />);
    await screen.findAllByText('# general');

    const generalTab = await screen.findByRole('button', { name: '# general' });
    const randomTab = screen.getByRole('button', { name: '# random' });
    expect(generalTab).toBeInTheDocument();
    expect(randomTab).toBeInTheDocument();

    await waitFor(() =>
      expect(messagingApi.listMessages).toHaveBeenCalledWith(
        { topic_id: topic.topic_id },
        20,
        0
      )
    );

    fireEvent.click(randomTab);

    await waitFor(() =>
      expect(messagingApi.listMessages).toHaveBeenCalledWith(
        { topic_id: secondTopic.topic_id },
        20,
        0
      )
    );
  });

  it('resets the active topic back to the new channel\'s default when switching channels', async () => {
    const secondChannel: Channel = {
      channel_id: 2,
      name: 'random-chat',
      creator_id: 9,
      default_topic_id: 8,
      created_at: '2026-01-01T00:00:00Z',
      invite_token: 'def456',
    };
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel, secondChannel]);
    vi.mocked(workspacesApi.listTopics).mockResolvedValue([topic]);
    vi.mocked(messagingApi.listMessages).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<WorkspacePage />);
    await screen.findAllByText('# general');
    await waitFor(() =>
      expect(messagingApi.listMessages).toHaveBeenCalledWith(
        { topic_id: channel.default_topic_id },
        20,
        0
      )
    );

    fireEvent.click(screen.getByText('# random-chat'));

    await waitFor(() =>
      expect(messagingApi.listMessages).toHaveBeenCalledWith(
        { topic_id: secondChannel.default_topic_id },
        20,
        0
      )
    );
  });

  it('shows a delete button on another member\'s message when the current user holds DELETE_MESSAGES for the channel', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);
    vi.mocked(workspacesApi.getMyPermissions).mockResolvedValueOnce(['DELETE_MESSAGES']);
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          base_message_id: 1,
          sender_id: 999,
          sender_username: 'someone-else',
          content: 'a message from someone else',
          sent_at: '2026-01-01T00:00:00Z',
          is_edited: false,
          media: [],
        },
      ],
    });

    render(<WorkspacePage />);

    expect(await screen.findByText('a message from someone else')).toBeInTheDocument();
    expect(workspacesApi.getMyPermissions).toHaveBeenCalledWith(channel.channel_id);
    expect(await screen.findByRole('button', { name: 'Delete Message' })).toBeInTheDocument();
  });

  it('does not show a delete button on another member\'s message without DELETE_MESSAGES', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);
    vi.mocked(workspacesApi.getMyPermissions).mockResolvedValueOnce([]);
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          base_message_id: 1,
          sender_id: 999,
          sender_username: 'someone-else',
          content: 'a message from someone else',
          sent_at: '2026-01-01T00:00:00Z',
          is_edited: false,
          media: [],
        },
      ],
    });

    render(<WorkspacePage />);

    expect(await screen.findByText('a message from someone else')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Message' })).not.toBeInTheDocument();
  });

  it('opens the search panel and shows real search results', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    vi.mocked(messagingApi.searchMessages).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          base_message_id: 9,
          sender_id: 1,
          sender_username: 'nika_lead',
          content: 'sprint backlog',
          sent_at: '2026-01-01T00:00:00Z',
          is_edited: false,
          media: [],
        },
      ],
    });

    render(<WorkspacePage />);
    await screen.findAllByText('# general');

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    fireEvent.change(screen.getByPlaceholderText('Search messages...'), {
      target: { value: 'sprint' },
    });
    const searchButtons = screen.getAllByRole('button', { name: /^search$/i });
    fireEvent.click(searchButtons[searchButtons.length - 1]);

    expect(await screen.findByText('sprint backlog')).toBeInTheDocument();
    expect(messagingApi.searchMessages).toHaveBeenCalledWith({
      query: 'sprint',
      topic_id: channel.default_topic_id,
    });
  });

  it('opens the scheduled messages panel, lists, and cancels a pending message', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([channel]);
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    vi.mocked(messagingApi.listScheduledMessages).mockResolvedValueOnce([
      {
        scheduled_id: 3,
        content: 'standup reminder',
        scheduled_time: '2030-01-01T10:00:00Z',
        topic_id: channel.default_topic_id,
      },
    ]);
    vi.mocked(messagingApi.cancelScheduledMessage).mockResolvedValueOnce(undefined);

    render(<WorkspacePage />);
    await screen.findAllByText('# general');

    fireEvent.click(screen.getByText('Scheduled'));

    expect(await screen.findByText('standup reminder')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel scheduled message/i }));

    expect(messagingApi.cancelScheduledMessage).toHaveBeenCalledWith(3);
    await waitFor(() =>
      expect(screen.queryByText('standup reminder')).not.toBeInTheDocument()
    );
  });
});
