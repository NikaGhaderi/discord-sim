import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/identity/context';
import { ThemePicker } from './ThemePicker';
import { NotificationBell } from './NotificationBell';

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  padding: '8px 12px',
  textDecoration: 'none',
  color: isActive ? 'var(--ws-primary)' : 'var(--ws-text)',
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
  const navigate = useNavigate();
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    // isAuthenticated flipping to false doesn't change the current route by
    // itself (no route guards exist) -- without this, logging out from
    // /workspaces or /private-spaces left the same page mounted instead of
    // landing back on the login form.
    navigate('/', { replace: true });
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 6,
        gap: 4,
        padding: '10px 20px',
        borderBottom: '1px solid var(--ws-border)',
        background: 'var(--ws-bg-nav)',
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

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <NotificationBell />
        <button type="button" className="btn" onClick={() => setIsThemePickerOpen(true)}>
          Theme
        </button>
        <button type="button" className="btn btn-danger" onClick={() => void handleLogout()}>
          Logout
        </button>
      </div>

      {isThemePickerOpen && <ThemePicker onClose={() => setIsThemePickerOpen(false)} />}
    </nav>
  );
};
