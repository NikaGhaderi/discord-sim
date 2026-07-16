import React, { useState } from 'react';

interface LoginFormProps {
  onSuccess: (email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    // Prevent the default form submission behavior (page reload)
    e.preventDefault(); 
    
    // Trigger success callback only if native HTML5 validation passes
    onSuccess(email);
  };

  return (
    <form onSubmit={handleSubmit} className="identity-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '350px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Welcome Back</h2>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>Please enter your credentials to access your account.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 'bold' }}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="example@domain.com"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 'bold' }}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="At least 8 characters"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <button type="submit" style={{ padding: '12px', background: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
        Login
      </button>
    </form>
  );
};