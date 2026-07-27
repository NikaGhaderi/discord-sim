import React, { useEffect, useState } from 'react';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { TwoFactorForm } from '../components/TwoFactorForm';
import { useAuth } from '../context';

type Mode = 'login' | 'register' | 'forgot-password';

interface AuthPageProps {
  /**
   * Called once the user reaches the AUTHENTICATED step. AuthPage itself
   * doesn't navigate anywhere (there's no router/dashboard yet) — this is an
   * escape hatch for whichever page composes AuthPage into a larger app.
   */
  onAuthenticated?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [force2FA, setForce2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated) {
      onAuthenticated?.();
    }
    // Only re-run when authentication actually flips, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  const handleLogin = async (payload: { username: string; password: string }) => {
    setError(null);
    try {
      await auth.login(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in with the provided credentials.');
    }
  };

  const handleRegister = async (payload: { username: string; email: string; password: string }) => {
    setError(null);
    try {
      // Registration issues real tokens directly (no 2FA step for
      // registration per the backend), so a successful call here takes the
      // user straight to the AUTHENTICATED step.
      await auth.register(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    }
  };

  const handleForgotPassword = async (email: string) => {
    setError(null);
    setForgotPasswordMessage(null);
    try {
      // Anti-enumeration: this resolves with the same message whether or
      // not the email matches an account -- just display it, don't branch.
      const message = await auth.requestPasswordReset(email);
      setForgotPasswordMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const handleVerify2FA = async (code: string) => {
    setError(null);
    try {
      await auth.verifyTwoFactor(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The 2FA code is invalid or expired.');
    }
  };

  const handleLogout = () => {
    setMode('login');
    setForce2FA(false);
    setError(null);
    setForgotPasswordMessage(null);
    void auth.logout();
  };

  // Determine which step to render, respecting the debug override
  const activeStep = force2FA ? '2FA' : auth.authStep;

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
      {/* Temporary Debug Checkbox */}
      <div style={{
        marginBottom: '20px',
        padding: '10px 15px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeeba',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        color: '#856404'
      }}>
        <input
          id="debug-force-2fa"
          type="checkbox"
          checked={force2FA}
          onChange={(e) => setForce2FA(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor="debug-force-2fa" style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          Debug: Force 2FA View
        </label>
      </div>

      <div style={{
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        {error && (
          <p role="alert" style={{ color: '#c0392b', backgroundColor: '#fdecea', padding: '10px', borderRadius: '4px', fontSize: '14px', marginTop: 0, marginBottom: '15px' }}>
            {error}
          </p>
        )}

        {activeStep === 'LOGIN' && mode === 'login' && (
          <>
            <LoginForm onSubmit={handleLogin} isSubmitting={auth.isLoading} />
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(null); setMode('register'); }}
                style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
              >
                Register
              </button>
            </p>
            <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px' }}>
              <button
                type="button"
                onClick={() => { setError(null); setForgotPasswordMessage(null); setMode('forgot-password'); }}
                style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
              >
                Forgot password?
              </button>
            </p>
          </>
        )}

        {activeStep === 'LOGIN' && mode === 'forgot-password' && (
          forgotPasswordMessage ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#333' }}>{forgotPasswordMessage}</p>
              <button
                type="button"
                onClick={() => { setForgotPasswordMessage(null); setMode('login'); }}
                style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit', fontSize: '14px', marginTop: '10px' }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <ForgotPasswordForm onSubmit={handleForgotPassword} isSubmitting={auth.isLoading} />
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
                <button
                  type="button"
                  onClick={() => { setError(null); setMode('login'); }}
                  style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                >
                  Back to Login
                </button>
              </p>
            </>
          )
        )}

        {activeStep === 'LOGIN' && mode === 'register' && (
          <>
            <RegisterForm onSubmit={handleRegister} isSubmitting={auth.isLoading} />
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(null); setMode('login'); }}
                style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
              >
                Login
              </button>
            </p>
          </>
        )}

        {activeStep === '2FA' && (
          <TwoFactorForm
            onSubmit={handleVerify2FA}
            isSubmitting={auth.isLoading}
            onBackToLogin={() => {
              setForce2FA(false); // Turn off debug mode when going back
              setError(null);
              setMode('login');
            }}
          />
        )}

        {activeStep === 'AUTHENTICATED' && (
          <div style={{ textAlign: 'center' }}>
            <h2>You're logged in</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Authenticated successfully.</p>
            <button
              type="button"
              onClick={handleLogout}
              style={{ padding: '12px 20px', background: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
