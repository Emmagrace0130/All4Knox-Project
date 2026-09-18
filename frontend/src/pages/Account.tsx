import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { useIdentity } from '../hooks/identityContext';
import * as api from '../services/api';
import type { Bound, GenerationSettings } from '../services/api';

const FIELD_LABELS: Record<string, { label: string; hint: string }> = {
  temperature: {
    label: 'Temperature',
    hint: 'Lower is more deterministic. Clinical guidance favours low values.',
  },
  top_p: { label: 'Top-p', hint: 'Nucleus sampling cutoff.' },
  top_k: { label: 'Top-k', hint: 'Consider only the k most likely tokens.' },
  max_tokens: { label: 'Max tokens', hint: 'Upper bound on answer length.' },
  repeat_penalty: { label: 'Repeat penalty', hint: 'Discourages repetition.' },
};

/** Account overview, and generation settings for clinicians and admins. */
export function Account() {
  const { identity, signOut, loading } = useIdentity();
  const [settings, setSettings] = useState<GenerationSettings>({});
  const [bounds, setBounds] = useState<Record<string, Bound>>({});
  const [editable, setEditable] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    api
      .getGenerationSettings()
      .then((data) => {
        setSettings(data.settings);
        setBounds(data.bounds);
        setEditable(data.editable);
      })
      .catch(() => setError('Could not load generation settings.'));
  }, [loading]);

  if (loading) return null;

  if (!identity?.isAuthenticated) {
    return (
      <PageContainer
        title="Not signed in"
        lede="You are browsing as a visitor."
        backTo={{ to: '/', label: 'Home' }}
        width="reading"
      >
        <p className="button-row">
          <Link to="/sign-in" className="btn btn--primary">
            Sign in
          </Link>
        </p>
      </PageContainer>
    );
  }

  const user = identity.user!;

  const save = async () => {
    setSaved(null);
    setError(null);
    try {
      const result = await api.saveGenerationSettings(settings);
      setSettings(result.settings);
      setSaved('Saved. New answers will use these settings.');
    } catch {
      setError('Could not save those settings.');
    }
  };

  const reset = async () => {
    try {
      const result = await api.resetGenerationSettings();
      setSettings(result.settings);
      setSaved('Reset to the system defaults.');
    } catch {
      setError('Could not reset the settings.');
    }
  };

  return (
    <PageContainer
      eyebrow="Account"
      title={user.displayName}
      lede={`${user.email} · ${user.role}`}
      backTo={{ to: '/', label: 'Home' }}
      width="reading"
    >
      <section className="intro-card">
        <h2 className="intro-card__title">Your access</h2>
        <ul className="list list--check">
          <li>Every clinical decision tool and the Ask All4Knox assistant.</li>
          <li>Conversation history kept across sessions.</li>
          {user.role === 'clinician' || user.role === 'admin' ? (
            <li>Tune how the assistant generates answers (below).</li>
          ) : null}
          {user.role === 'admin' ? (
            <li>Manage system prompts, defaults and accounts.</li>
          ) : null}
        </ul>
        <div className="button-row">
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </section>

      {editable ? (
        <section className="intro-card">
          <h2 className="intro-card__title">Assistant generation settings</h2>
          <p className="intro-card__note">
            These affect how the model writes its answers. They do not change
            which sources it may use — retrieval and the safety rules are fixed
            and cannot be edited here.
          </p>

          {Object.entries(bounds).map(([field, bound]) => (
            <label key={field} className="setting-row">
              <span className="setting-row__label">
                {FIELD_LABELS[field]?.label ?? field}
                <span className="setting-row__hint">
                  {FIELD_LABELS[field]?.hint}
                </span>
              </span>
              <span className="setting-row__control">
                <input
                  type="number"
                  className="setting-row__input"
                  min={bound.min}
                  max={bound.max}
                  step={field === 'top_k' || field === 'max_tokens' ? 1 : 0.05}
                  value={
                    (settings as Record<string, number | undefined>)[field] ??
                    bound.default
                  }
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      [field]: Number(event.target.value),
                    }))
                  }
                />
                <span className="setting-row__range">
                  {bound.min}–{bound.max}
                </span>
              </span>
            </label>
          ))}

          {saved ? <p className="auth-form__note">{saved}</p> : null}
          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="button-row">
            <Button onClick={() => void save()}>Save settings</Button>
            <Button variant="ghost" onClick={() => void reset()}>
              Reset to defaults
            </Button>
          </div>
        </section>
      ) : (
        <ClinicalAlert tone="info" title="Generation settings">
          <p>
            Adjusting how the assistant generates answers requires the clinician
            or administrator role.
          </p>
        </ClinicalAlert>
      )}
    </PageContainer>
  );
}
