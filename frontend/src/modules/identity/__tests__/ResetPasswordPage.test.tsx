import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import * as identityModule from '../index';

vi.mock('../index', () => ({
  identityApi: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    verify2FA: vi.fn(),
    logoutUser: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  },
}));

const identityApi = identityModule.identityApi as unknown as {
  confirmPasswordReset: ReturnType<typeof vi.fn>;
};

function renderAtUrl(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows an error and no form when the URL has no token', () => {
    renderAtUrl('/reset-password');

    expect(screen.getByRole('alert')).toHaveTextContent(/missing its token/i);
    expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();
  });

  test('reads the token from the URL and confirms the reset with it', async () => {
    identityApi.confirmPasswordReset.mockResolvedValue({
      message: 'Your password has been reset successfully.',
    });
    renderAtUrl('/reset-password?token=real-token-123');

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'NewPassw0rd!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPassw0rd!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByText(/reset successfully/i)).toBeInTheDocument(),
    );
    expect(identityApi.confirmPasswordReset).toHaveBeenCalledWith(
      'real-token-123',
      'NewPassw0rd!',
    );
    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });

  test('shows the backend error on an invalid/expired token', async () => {
    identityApi.confirmPasswordReset.mockRejectedValue(
      new Error('This password reset link is invalid or has expired.'),
    );
    renderAtUrl('/reset-password?token=garbage');

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'NewPassw0rd!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPassw0rd!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid or has expired/i),
    );
  });
});
