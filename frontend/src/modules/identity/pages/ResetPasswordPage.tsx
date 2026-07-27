import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { useAuth } from '../context';

/**
 * Landing page for the link emailed by the password-reset request flow
 * (`?token=...`). Not part of the doc's documented API contract (only the
 * request step is documented) -- exists so that link actually leads
 * somewhere usable.
 */
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (newPassword: string) => {
    setError(null);
    try {
      const message = await auth.confirmPasswordReset(token, newPassword);
      setSuccessMessage(message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'This password reset link is invalid or has expired.',
      );
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        {!token && (
          <p role="alert" style={{ color: '#c0392b', backgroundColor: '#fdecea', padding: '10px', borderRadius: '4px', fontSize: '14px' }}>
            This password reset link is missing its token. Please use the link from your email.
          </p>
        )}

        {token && !successMessage && (
          <>
            {error && (
              <p role="alert" style={{ color: '#c0392b', backgroundColor: '#fdecea', padding: '10px', borderRadius: '4px', fontSize: '14px', marginTop: 0, marginBottom: '15px' }}>
                {error}
              </p>
            )}
            <ResetPasswordForm onSubmit={handleSubmit} isSubmitting={auth.isLoading} />
          </>
        )}

        {successMessage && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#333' }}>{successMessage}</p>
            <a
              href="/"
              style={{ color: '#5865F2', textDecoration: 'underline', fontSize: '14px' }}
            >
              Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
