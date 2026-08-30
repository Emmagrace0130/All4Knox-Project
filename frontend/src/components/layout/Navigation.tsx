import { NavLink } from 'react-router-dom';

/** Main navigation — skeleton §4. */
const navItems = [
  { to: '/', label: 'Toolkit', end: true },
  { to: '/toolkit/start', label: 'Start Suboxone' },
  { to: '/toolkit/uds', label: 'UDS Interpreter' },
  { to: '/toolkit/dosing', label: 'Dosing' },
  { to: '/toolkit/prescribing', label: 'TN Prescribing' },
  { to: '/referrals', label: 'Referrals' },
  { to: '/resources', label: 'Resources' },
  { to: '/about', label: 'About' },
];

export function Navigation() {
  return (
    <nav className="nav print-hide" aria-label="Main">
      <ul className="nav__list">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav__link ${isActive ? 'nav__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
