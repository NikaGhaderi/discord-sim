import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/identity/context';
import { ThemePicker } from './ThemePicker';
import { NotificationBell } from './NotificationBell';
import { Button } from './ui/Button';
import { cn } from '@shared/lib/cn';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-xl px-3 py-2 text-sm font-medium transition hover:text-foreground',
    isActive ? 'text-brand font-semibold' : 'text-muted'
  );

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
    <nav className="flex flex-wrap items-center gap-1 border-b border-border bg-nav px-5 py-2.5">
      <NavLink to="/workspaces" className={linkClass}>
        Workspaces
      </NavLink>
      <NavLink to="/private-spaces" className={linkClass}>
        Direct Messages
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        Profile
      </NavLink>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <Button variant="secondary" size="sm" onClick={() => setIsThemePickerOpen(true)}>
          Theme
        </Button>
        <Button variant="danger" size="sm" onClick={() => void handleLogout()}>
          Logout
        </Button>
      </div>

      {isThemePickerOpen && <ThemePicker onClose={() => setIsThemePickerOpen(false)} />}
    </nav>
  );
};
