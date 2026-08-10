import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThreadView } from '../components/ThreadView';
import { MessageComposer } from '../components/MessageComposer';

describe('Messaging Core UI (SCRUM-41)', () => {
  it('renders initial messages correctly', () => {
    render(<ThreadView />);
    expect(screen.getByText(/Welcome to the channel!/i)).toBeInTheDocument();
    expect(screen.getByText(/@nika_lead/i)).toBeInTheDocument();
  });

  it('allows sending a new message and displays it in the thread', () => {
    render(<ThreadView />);
    
    const input = screen.getByPlaceholderText(/Write a message.../i);
    fireEvent.change(input, { target: { value: 'Hello from test suite!' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByText('Hello from test suite!')).toBeInTheDocument();
    expect(screen.getByText(/@ftm_roosta/i)).toBeInTheDocument();
  });

  it('filters messages based on search query', () => {
    render(<ThreadView />);
    
    const searchInput = screen.getByPlaceholderText(/Search messages.../i);
    fireEvent.change(searchInput, { target: { value: 'Workspaces' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(screen.getByText(/Workspaces UI structure is updated/i)).toBeInTheDocument();
    expect(screen.queryByText(/Welcome to the channel!/i)).not.toBeInTheDocument();
  });
});