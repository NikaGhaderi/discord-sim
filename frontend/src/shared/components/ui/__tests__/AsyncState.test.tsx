import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoadingState, EmptyState, ErrorState } from '../AsyncState';

describe('AsyncState', () => {
  it('LoadingState shows the given label with a status role', () => {
    render(<LoadingState label="Loading channels" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading channels');
  });

  it('EmptyState shows title, description, and an optional action', () => {
    render(
      <EmptyState title="No channels yet" description="Create one to get started." action={<button>Create</button>} />
    );

    expect(screen.getByText('No channels yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('ErrorState calls onRetry when its retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState detail="Network error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
