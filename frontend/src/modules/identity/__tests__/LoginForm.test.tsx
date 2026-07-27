import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '../components/LoginForm';

describe('LoginForm', () => {
  test('renders email and password fields with native validation attributes', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const password = screen.getByLabelText(/password/i) as HTMLInputElement;

    expect(email).toBeRequired();
    expect(email.type).toBe('email');
    expect(password).toBeRequired();
    expect(password.minLength).toBe(8);
  });

  test('tracks input via controlled state', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'nika@example.com' } });

    expect(email.value).toBe('nika@example.com');
  });

  test('calls onSubmit with the entered credentials, keyed as username/password', () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'nika@example.com',
      password: 'password123',
    });
  });

  test('disables the submit button and shows a loading label while isSubmitting', () => {
    render(<LoginForm onSubmit={vi.fn()} isSubmitting />);

    const button = screen.getByRole('button', { name: /logging in/i });
    expect(button).toBeDisabled();
  });
});
