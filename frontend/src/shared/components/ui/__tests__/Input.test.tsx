import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('associates the visible label with the input via htmlFor/id', () => {
    render(<Input label="Channel Name" name="name" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Channel Name')).toBeInTheDocument();
  });

  it('shows an error message and marks the input invalid', () => {
    render(<Input label="Channel Name" name="name" value="" onChange={() => {}} error="Required" />);

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByLabelText(/Channel Name/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onChange as the user types', () => {
    let value = '';
    const { rerender } = render(
      <Input label="Channel Name" name="name" value={value} onChange={(e) => (value = e.target.value)} />
    );

    fireEvent.change(screen.getByLabelText('Channel Name'), { target: { value: 'general' } });

    expect(value).toBe('general');
    rerender(<Input label="Channel Name" name="name" value={value} onChange={() => {}} />);
  });
});
