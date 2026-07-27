import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegisterForm } from '../components/RegisterForm';

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders username, email, password, and confirm-password fields with native validation', () => {
    render(<RegisterForm onSubmit={vi.fn()} />);

    const username = screen.getByLabelText(/username/i) as HTMLInputElement;
    const email = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    const password = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    const confirm = screen.getByLabelText(/confirm password/i) as HTMLInputElement;

    expect(username).toBeRequired();
    expect(email.type).toBe('email');
    expect(email).toBeRequired();
    expect(password.minLength).toBe(8);
    expect(confirm.minLength).toBe(8);
  });

  test('blocks submission and alerts when passwords do not match', () => {
    const onSubmit = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'nika' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'different123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    expect(alertSpy).toHaveBeenCalledWith('Passwords do not match!');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('calls onSubmit with username/email/password when passwords match', () => {
    const onSubmit = vi.fn();
    render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'nika' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'nika',
      email: 'nika@example.com',
      password: 'password123',
    });
  });

  test('disables the submit button and shows a loading label while isSubmitting', () => {
    render(<RegisterForm onSubmit={vi.fn()} isSubmitting />);

    const button = screen.getByRole('button', { name: /registering/i });
    expect(button).toBeDisabled();
  });
});
