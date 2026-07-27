import React, { useState } from 'react';

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => void;
  isSubmitting?: boolean;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} className="identity-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '350px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Forgot Password</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
        Enter your account email and we'll send you a link to reset your password.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="forgot-email" style={{ fontSize: '14px', fontWeight: 'bold' }}>Email</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="example@domain.com"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{ padding: '12px', background: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'default' : 'pointer', fontWeight: 'bold', marginTop: '10px', opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Sending…' : 'Send Reset Link'}
      </button>
    </form>
  );
};
