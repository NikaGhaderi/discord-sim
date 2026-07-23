import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '../pages/AuthPage';

describe('AuthPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders LoginForm by default', () => {
    render(<AuthPage />);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  test('the "Register" link switches to RegisterForm', () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  test('the debug checkbox forces the 2FA view regardless of step', () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByLabelText(/debug: force 2fa view/i));

    expect(
      screen.getByRole('heading', { name: /two-factor authentication/i })
    ).toBeInTheDocument();
  });

  test('a successful login navigates to the 2FA step and calls onLoginSuccess', () => {
    const onLoginSuccess = vi.fn();
    render(<AuthPage onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    expect(onLoginSuccess).toHaveBeenCalledWith('nika@example.com');
    expect(
      screen.getByRole('heading', { name: /two-factor authentication/i })
    ).toBeInTheDocument();
  });

  test('a successful registration calls onRegisterSuccess instead of the demo alert when provided', () => {
    const onRegisterSuccess = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<AuthPage onRegisterSuccess={onRegisterSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    expect(onRegisterSuccess).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  test('registration falls back to a demo alert when no onRegisterSuccess prop is given', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    expect(alertSpy).toHaveBeenCalledWith('Registration successful! Please login.');
  });
});
