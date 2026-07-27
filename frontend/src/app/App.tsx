import { AuthProvider } from '../modules/identity/context';
import { AuthPage } from '../modules/identity/pages/AuthPage';

export function App() {
  return (
    <AuthProvider>
      <main>
        <AuthPage />
      </main>
    </AuthProvider>
  );
}
