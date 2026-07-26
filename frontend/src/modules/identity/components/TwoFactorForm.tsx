import React, { useState, useEffect } from 'react';

interface TwoFactorFormProps {
  onSubmit: (code: string) => void;
  onBackToLogin: () => void;
  isSubmitting?: boolean;
}

export const TwoFactorForm: React.FC<TwoFactorFormProps> = ({ onSubmit, onBackToLogin, isSubmitting = false }) => {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(60); // 60-second countdown for resending code
  const [resendCount, setResendCount] = useState(0); // bumped on resend to restart the timer effect

  // Handle the countdown timer logic. Only one interval is ever created per
  // "countdown session" (mount, or a resend); it stops itself once the count
  // hits zero instead of being torn down and recreated every second.
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Clean up the interval on component unmount to prevent memory leaks
    return () => clearInterval(timer);
  }, [resendCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Hand the entered code up; the caller is responsible for the actual
    // verify2FA network call and for deciding what happens on success/failure.
    onSubmit(code);
  };

  const handleResend = () => {
    // Reset the countdown timer back to 60 seconds and restart the interval
    setTimeLeft(60);
    setResendCount((count) => count + 1);
    alert("A new verification code has been sent!");
  };

  return (
    <form onSubmit={handleSubmit} className="identity-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '350px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Two-Factor Authentication</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
        Enter the 6-digit verification code sent to your device.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="2fa-code" style={{ fontSize: '14px', fontWeight: 'bold' }}>Verification Code</label>
        <input
          id="2fa-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          maxLength={6}
          pattern="\d{6}"
          placeholder="123456"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', letterSpacing: '4px', textAlign: 'center', fontSize: '18px' }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{ padding: '12px', background: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'default' : 'pointer', fontWeight: 'bold', marginTop: '10px', opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Verifying…' : 'Verify'}
      </button>

      <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '10px' }}>
        {timeLeft > 0 ? (
          <span style={{ color: '#666' }}>Resend code in {timeLeft}s</span>
        ) : (
          <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: '#5865F2', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
            Resend Verification Code
          </button>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />

      <button type="button" onClick={onBackToLogin} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>
        Back to Login
      </button>
    </form>
  );
};
