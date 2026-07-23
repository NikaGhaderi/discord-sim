import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegisterForm } from '../components/RegisterForm';

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders email, password, and confirm-password fields with native validation', () => {
    render(<RegisterForm onSuccess={vi.fn()} />);

    const email = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    const password = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    const confirm = screen.getByLabelText(/confirm password/i) as HTMLInputElement;

    expect(email.type).toBe('email');
    expect(email).toBeRequired();
    expect(password.minLength).toBe(8);
    expect(confirm.minLength).toBe(8);
  });

  test('blocks submission and alerts when passwords do not match', () => {
    const onSuccess = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<RegisterForm onSuccess={onSuccess} />);

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
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('calls onSuccess when passwords match', () => {
    const onSuccess = vi.fn();
    render(<RegisterForm onSuccess={onSuccess} />);

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

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
