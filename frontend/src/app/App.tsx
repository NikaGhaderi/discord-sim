import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../modules/identity/context';
import { AuthPage } from '../modules/identity/pages/AuthPage';
import { ResetPasswordPage } from '../modules/identity/pages/ResetPasswordPage';
import { ProfilePage } from '../modules/profile/pages/ProfilePage';
import { PrivateSpacesPage } from '../modules/private_spaces/pages/PrivateSpacesPage';
import { WorkspacePage } from '../modules/workspaces/pages/WorkspacePage';

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <main>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/private-spaces" element={<PrivateSpacesPage />} />
            <Route path="/workspaces" element={<WorkspacePage />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}