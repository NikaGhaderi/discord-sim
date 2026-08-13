import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../modules/identity/context';

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  padding: '8px 12px',
  textDecoration: 'none',
  color: isActive ? '#5865F2' : '#333',
  fontWeight: isActive ? 700 : 400,
});

/**
 * The app's only persistent top-level navigation. Rendered once, above
 * whichever route is active, whenever the user is authenticated -- before
 * this existed, the four real pages (/workspaces, /private-spaces,
 * /profile, plus the auth screen) had no links between them at all.
 */
export const AppNav: React.FC = () => {
  const { logout } = useAuth();

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '10px 20px',
        borderBottom: '1px solid #e0e0e0',
        background: '#fff',
      }}
    >
      <NavLink to="/workspaces" style={linkStyle}>
        Workspaces
      </NavLink>
      <NavLink to="/private-spaces" style={linkStyle}>
        Direct Messages
      </NavLink>
      <NavLink to="/profile" style={linkStyle}>
        Profile
      </NavLink>
      <button
        type="button"
        onClick={() => void logout()}
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 'none',
          color: '#5865F2',
          cursor: 'pointer',
          textDecoration: 'underline',
          font: 'inherit',
        }}
      >
        Logout
      </button>
    </nav>
  );
};
