import { Outlet } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { IdentityProvider } from '../hooks/useIdentity';

export function App() {
  return (
    <IdentityProvider>
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Outlet />
      <Footer />
    </div>
    </IdentityProvider>
  );
}
