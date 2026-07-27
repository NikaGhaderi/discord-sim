import React, { useState } from 'react';

interface RegisterFormProps {
  onSubmit: (payload: { username: string; email: string; password: string }) => void;
  isSubmitting?: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    // Prevent the default form submission behavior
    e.preventDefault();

    // Perform password confirmation check before triggering submit
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Trigger submit only if all validations pass
    onSubmit({ username, email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="identity-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '350px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Create Account</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Fill in the details below to register.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="reg-username" style={{ fontSize: '14px', fontWeight: 'bold' }}>Username</label>
        <input
          id="reg-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="username"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="reg-email" style={{ fontSize: '14px', fontWeight: 'bold' }}>Email</label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="example@domain.com"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="reg-password" style={{ fontSize: '14px', fontWeight: 'bold' }}>Password</label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="At least 8 characters"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="confirm-password" style={{ fontSize: '14px', fontWeight: 'bold' }}>Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Repeat your password"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{ padding: '12px', background: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'default' : 'pointer', fontWeight: 'bold', marginTop: '10px', opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Registering…' : 'Register'}
      </button>
    </form>
  );
};
