import { Link } from 'react-router-dom';
import { useIdentity } from '../../hooks/identityContext';
import { FeedbackButton } from '../feedback/FeedbackButton';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

/**
 * Header account control, with the site feedback button beside it.
 *
 * Visitors see a plain "Sign in" link, not a wall — every clinical tool works
 * without an account, so this must read as optional rather than as a gate.
 */
export function AccountMenu() {
  const { identity, loading } = useIdentity();

  // Render nothing while resolving rather than flashing "Sign in" at someone
  // who is already signed in.
  // The feedback button shows in every state, including while loading.
  if (loading)
    return (
      <div className="site-header__account">
        <FeedbackButton />
      </div>
    );

  if (!identity?.isAuthenticated) {
    return (
      <div className="site-header__account">
        <FeedbackButton />
        <Link to="/sign-in" className="account-chip">
          Sign in
        </Link>
      </div>
    );
  }

  const user = identity.user!;
  return (
    <div className="site-header__account">
      <FeedbackButton />
      <Link to="/account" className="account-chip" title={user.email}>
        <span className="account-chip__avatar" aria-hidden="true">
          {initials(user.displayName)}
        </span>
        <span>{user.displayName}</span>
        <span className="account-chip__role">{user.role}</span>
      </Link>
    </div>
  );
}
