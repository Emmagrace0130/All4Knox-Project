import { Link } from 'react-router-dom';
import { Navigation } from './Navigation';

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="All4Knox toolkit home">
          <span className="brand__mark" aria-hidden="true">
            A4K
          </span>
          <span className="brand__text">
            <span className="brand__name">All4Knox</span>
            <span className="brand__tagline">Clinical Buprenorphine Toolkit</span>
          </span>
        </Link>
        <Navigation />
      </div>
    </header>
  );
}
