import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

describe('ForgotPasswordForm', () => {
  test('renders an email field with native validation attributes', () => {
    render(<ForgotPasswordForm onSubmit={vi.fn()} />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(email).toBeRequired();
    expect(email.type).toBe('email');
  });

  test('calls onSubmit with the entered email', () => {
    const onSubmit = vi.fn();
    render(<ForgotPasswordForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(onSubmit).toHaveBeenCalledWith('nika@example.com');
  });

  test('disables the submit button and shows a loading label while isSubmitting', () => {
    render(<ForgotPasswordForm onSubmit={vi.fn()} isSubmitting />);

    const button = screen.getByRole('button', { name: /sending/i });
    expect(button).toBeDisabled();
  });
});
