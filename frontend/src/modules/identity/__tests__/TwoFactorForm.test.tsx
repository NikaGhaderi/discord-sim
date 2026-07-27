import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TwoFactorForm } from '../components/TwoFactorForm';

describe('TwoFactorForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('renders a 6-digit code input with native validation attributes', () => {
    render(<TwoFactorForm onSubmit={vi.fn()} onBackToLogin={vi.fn()} />);

    const codeInput = screen.getByLabelText(/verification code/i) as HTMLInputElement;
    expect(codeInput).toBeRequired();
    expect(codeInput.maxLength).toBe(6);
    expect(codeInput.pattern).toBe('\\d{6}');
  });

  test('shows a 60s countdown that ticks down once per second', () => {
    render(<TwoFactorForm onSubmit={vi.fn()} onBackToLogin={vi.fn()} />);

    expect(screen.getByText(/resend code in 60s/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/resend code in 57s/i)).toBeInTheDocument();
  });

  test('replaces the countdown with a resend button once it reaches zero, and resend restarts it', () => {
    render(<TwoFactorForm onSubmit={vi.fn()} onBackToLogin={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    const resendButton = screen.getByRole('button', {
      name: /resend verification code/i,
    });
    expect(resendButton).toBeInTheDocument();

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(resendButton);

    expect(alertSpy).toHaveBeenCalledWith('A new verification code has been sent!');
    expect(screen.getByText(/resend code in 60s/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/resend code in 59s/i)).toBeInTheDocument();
  });

  test('calls onSubmit with the entered code', () => {
    const onSubmit = vi.fn();
    render(<TwoFactorForm onSubmit={onSubmit} onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(onSubmit).toHaveBeenCalledWith('123456');
  });

  test('calls onBackToLogin when the back link is clicked', () => {
    const onBackToLogin = vi.fn();
    render(<TwoFactorForm onSubmit={vi.fn()} onBackToLogin={onBackToLogin} />);

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  test('disables the submit button and shows a loading label while isSubmitting', () => {
    render(<TwoFactorForm onSubmit={vi.fn()} onBackToLogin={vi.fn()} isSubmitting />);

    const button = screen.getByRole('button', { name: /verifying/i });
    expect(button).toBeDisabled();
  });
});
