import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { useIdentity } from '../hooks/identityContext';

/**
 * Sign in.
 *
 * Accounts are optional. Every clinical tool — and the assistant — works
 * without one; signing in adds conversation history across sessions and, for
 * clinicians and admins, configuration. The page says so, so nobody assumes
 * the toolkit is gated.
 */
export function SignIn() {
  const { signIn, identity } = useIdentity();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (identity?.isAuthenticated) {
    return (
      <PageContainer
        title="You are signed in"
        lede={`Signed in as ${identity.user?.displayName} (${identity.user?.role}).`}
        backTo={{ to: '/', label: 'Home' }}
        width="reading"
      >
        <p className="button-row">
          <Link to="/account" className="btn btn--primary">
            Your account
          </Link>
          <Link to="/toolkit" className="btn btn--ghost">
            Go to the toolkit
          </Link>
        </p>
      </PageContainer>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate('/account');
    } catch {
      // The API deliberately does not distinguish "no such account" from
      // "wrong password", and neither does this message.
      setError('That email and password combination was not recognised.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer
      eyebrow="Account"
      title="Sign in"
      lede="Signing in is optional — every clinical tool works without an account."
      backTo={{ to: '/', label: 'Home' }}
      width="reading"
    >
      <ClinicalAlert tone="info" title="What an account adds">
        <ul className="list list--dot">
          <li>Your Ask All4Knox conversations are kept across sessions.</li>
          <li>
            Clinicians can add reference documents and tune how the assistant
            generates answers.
          </li>
          <li>Administrators can manage prompts, defaults and accounts.</li>
        </ul>
        <p>
          Without an account you are a visitor: the tools and the assistant work
          normally, and your conversation is kept for this session only.
        </p>
      </ClinicalAlert>

      <form className="auth-form" onSubmit={submit}>
        <label className="auth-form__field">
          <span className="auth-form__label">Email</span>
          <input
            type="email"
            className="auth-form__input"
            value={email}
            autoComplete="username"
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="auth-form__field">
          <span className="auth-form__label">Password</span>
          <input
            type="password"
            className="auth-form__input"
            value={password}
            autoComplete="current-password"
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="button-row">
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <Link to="/" className="btn btn--ghost">
            Continue as a visitor
          </Link>
        </div>
      </form>

      <p className="auth-form__note">
        Accounts are created by an administrator. If you need one, contact the
        All4Knox team — there is no self-registration.
      </p>
    </PageContainer>
  );
}
