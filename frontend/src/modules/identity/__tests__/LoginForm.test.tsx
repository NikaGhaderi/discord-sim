import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '../components/LoginForm';

describe('LoginForm', () => {
  test('renders email and password fields with native validation attributes', () => {
    render(<LoginForm onSuccess={vi.fn()} />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const password = screen.getByLabelText(/password/i) as HTMLInputElement;

    expect(email).toBeRequired();
    expect(email.type).toBe('email');
    expect(password).toBeRequired();
    expect(password.minLength).toBe(8);
  });

  test('tracks input via controlled state', () => {
    render(<LoginForm onSuccess={vi.fn()} />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'nika@example.com' } });

    expect(email.value).toBe('nika@example.com');
  });

  test('calls onSuccess with the entered email on submit', () => {
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(onSuccess).toHaveBeenCalledWith('nika@example.com');
  });
});
