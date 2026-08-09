import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageThread } from '../components/MessageThread';

describe('MessageThread (SCRUM-42)', () => {
  it('renders the initial page of messages, tagging only the edited ones', () => {
    render(<MessageThread />);

    expect(screen.getByText('Message content #20')).toBeInTheDocument();
    expect(screen.getByText('Message content #1')).toBeInTheDocument();

    // Message #18 is a multiple of 3 (is_edited) -- #19 isn't.
    const edited = screen.getByText('Message content #18').closest('div')!;
    const notEdited = screen.getByText('Message content #19').closest('div')!;
    expect(within(edited).getByText('(edited)')).toBeInTheDocument();
    expect(within(notEdited).queryByText('(edited)')).not.toBeInTheDocument();

    // Older messages haven't loaded yet.
    expect(screen.queryByText('Message content #21')).not.toBeInTheDocument();
  });

  it('loads the next page of older messages when scrolled to the top', async () => {
    render(<MessageThread />);

    const scrollContainer = screen.getByTestId('message-thread-scroll');
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });

    expect(screen.getByText('Loading older messages...')).toBeInTheDocument();

    await waitFor(
      () => expect(screen.getByText('Message content #21')).toBeInTheDocument(),
      { timeout: 2000 }
    );
    expect(screen.getByText('Message content #40')).toBeInTheDocument();
  });

  it('stops offering more pages once the full mock history has loaded', async () => {
    render(<MessageThread />);
    const scrollContainer = screen.getByTestId('message-thread-scroll');

    // 60 mock messages, 20 per page, 20 already shown initially -> 2 more loads to exhaust.
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });
    await waitFor(() => expect(screen.getByText('Message content #40')).toBeInTheDocument(), {
      timeout: 2000,
    });

    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });
    await waitFor(() => expect(screen.getByText('Message content #60')).toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.getByText('Beginning of message history')).toBeInTheDocument();
  });
});
