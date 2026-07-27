import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResetPasswordForm } from '../components/ResetPasswordForm';

describe('ResetPasswordForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders new-password and confirm fields with native validation', () => {
    render(<ResetPasswordForm onSubmit={vi.fn()} />);

    const newPassword = screen.getByLabelText(/^new password$/i) as HTMLInputElement;
    const confirm = screen.getByLabelText(/confirm new password/i) as HTMLInputElement;

    expect(newPassword.minLength).toBe(8);
    expect(newPassword).toBeRequired();
    expect(confirm.minLength).toBe(8);
    expect(confirm).toBeRequired();
  });

  test('blocks submission and alerts when the passwords do not match', () => {
    const onSubmit = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ResetPasswordForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'NewPassw0rd!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(alertSpy).toHaveBeenCalledWith('Passwords do not match!');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('calls onSubmit with the new password when both fields match', () => {
    const onSubmit = vi.fn();
    render(<ResetPasswordForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'NewPassw0rd!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPassw0rd!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(onSubmit).toHaveBeenCalledWith('NewPassw0rd!');
  });

  test('disables the submit button and shows a loading label while isSubmitting', () => {
    render(<ResetPasswordForm onSubmit={vi.fn()} isSubmitting />);

    const button = screen.getByRole('button', { name: /resetting/i });
    expect(button).toBeDisabled();
  });
});
