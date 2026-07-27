import React, { useState } from 'react';

interface ResetPasswordFormProps {
  onSubmit: (newPassword: string) => void;
  isSubmitting?: boolean;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    onSubmit(newPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="identity-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '350px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Reset Password</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Choose a new password for your account.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="new-password" style={{ fontSize: '14px', fontWeight: 'bold' }}>New Password</label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          placeholder="At least 8 characters"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="confirm-new-password" style={{ fontSize: '14px', fontWeight: 'bold' }}>Confirm New Password</label>
        <input
          id="confirm-new-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Repeat your new password"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{ padding: '12px', background: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'default' : 'pointer', fontWeight: 'bold', marginTop: '10px', opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  );
};
