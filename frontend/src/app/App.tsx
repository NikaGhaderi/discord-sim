import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../modules/identity/context';
import { AuthPage } from '../modules/identity/pages/AuthPage';
import { ResetPasswordPage } from '../modules/identity/pages/ResetPasswordPage';
import { ProfilePage } from '../modules/profile/pages/ProfilePage';

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <main>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}