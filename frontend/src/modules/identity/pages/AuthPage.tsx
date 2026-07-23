import React, { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { TwoFactorForm } from '../components/TwoFactorForm';

type AuthStep = 'login' | 'register' | '2fa';

// These callbacks are placeholders standing in for real network integration
// (AuthContext + identity/api.ts). They're plain optional props specifically
// so that work can wire real handlers in from the outside later without
// touching AuthPage's internals at all -- no default means "do nothing but
// still navigate," a caller integrating real auth just passes its own
// functions here instead of forking this file.
interface AuthPageProps {
  onLoginSuccess?: (email: string) => void;
  onRegisterSuccess?: () => void;
  on2FASuccess?: (email: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  onRegisterSuccess,
  on2FASuccess,
}) => {
  const [step, setStep] = useState<AuthStep>('login');
  const [userEmail, setUserEmail] = useState('');
  const [force2FA, setForce2FA] = useState(false);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setStep('2fa');
    onLoginSuccess?.(email);
  };

  const handleRegisterSuccess = () => {
    if (onRegisterSuccess) {
      onRegisterSuccess();
    } else {
      // Standalone/demo fallback when no real registration handler is wired in.
      alert('Registration successful! Please login.');
    }
    setStep('login');
  };

  const handle2FASuccess = () => {
    if (on2FASuccess) {
      on2FASuccess(userEmail);
    } else {
      // Standalone/demo fallback when no real 2FA-completion handler is wired in.
      alert(`Successfully authenticated as ${userEmail}!`);
    }
  };

  // Determine which step to render, respecting the debug override
  const activeStep = force2FA ? '2fa' : step;

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
        {activeStep === 'login' && (
          <>
            <LoginForm onSuccess={handleLoginSuccess} />
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setStep('register')}
                style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
              >
                Register
              </button>
            </p>
          </>
        )}

        {activeStep === 'register' && (
          <>
            <RegisterForm onSuccess={handleRegisterSuccess} />
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setStep('login')}
                style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
              >
                Login
              </button>
            </p>
          </>
        )}

        {activeStep === '2fa' && (
          <TwoFactorForm
            onSuccess={handle2FASuccess}
            onBackToLogin={() => {
              setForce2FA(false); // Turn off debug mode when going back
              setStep('login');
            }}
          />
        )}
      </div>
    </div>
  );
};