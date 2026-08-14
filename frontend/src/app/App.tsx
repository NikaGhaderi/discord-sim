import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../modules/identity/context';
import { AuthPage } from '../modules/identity/pages/AuthPage';
import { ResetPasswordPage } from '../modules/identity/pages/ResetPasswordPage';
import { ProfilePage } from '../modules/profile/pages/ProfilePage';
import { PrivateSpacesPage } from '../modules/private_spaces/pages/PrivateSpacesPage';
import { WorkspacePage } from '../modules/workspaces/pages/WorkspacePage';
import { RealtimeProvider } from '../modules/notifications/RealtimeProvider';
import { AppNav } from '../shared/components/AppNav';

function AppRoutes() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {isAuthenticated && <AppNav />}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Routes>
          <Route
            path="/"
            element={<AuthPage onAuthenticated={() => navigate('/workspaces')} />}
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/private-spaces" element={<PrivateSpacesPage />} />
          <Route path="/workspaces" element={<WorkspacePage />} />
        </Routes>
      </div>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RealtimeProvider>
          <AppRoutes />
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
