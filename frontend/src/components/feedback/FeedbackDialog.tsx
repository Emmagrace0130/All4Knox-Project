import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ApiError,
  getFeedbackQuestions,
  submitFeedback,
  type FeedbackQuestions,
} from '../../services/api';
import { Button } from '../common/Button';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

type Phase = 'form' | 'sending' | 'sent';

/**
 * The site survey, in a native modal <dialog>.
 *
 * The questions come from the API (backend/app/services/feedback.py) so the
 * form and the exported responses can never disagree about what was asked.
 * Every question is optional; the server refuses only a fully empty survey.
 */
export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const [questions, setQuestions] = useState<FeedbackQuestions | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Fetched on first open, not on every page load: most visits never use it.
  useEffect(() => {
    if (!open || questions || loadError) return;
    getFeedbackQuestions()
      .then(setQuestions)
      .catch(() => setLoadError(true));
  }, [open, questions, loadError]);

  const reset = () => {
    setRatings({});
    setAnswers({});
    setEmail('');
    setError(null);
    setPhase('form');
  };

  const close = () => {
    if (phase === 'sent') reset();
    onClose();
  };

  const isEmpty =
    Object.keys(ratings).length === 0 &&
    Object.values(answers).every((value) => !value.trim());

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isEmpty) {
      setError('Please answer at least one question before sending.');
      return;
    }
    setPhase('sending');
    setError(null);
    try {
      await submitFeedback({
        ratings,
        answers,
        page: location.pathname,
        contactEmail: email.trim() || undefined,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
      setPhase('sent');
    } catch (err) {
      setPhase('form');
      setError(
        err instanceof ApiError && err.status === 400
          ? 'Something in the form was not accepted. Please check your answers.'
          : 'Your feedback could not be sent. Please try again in a moment.',
      );
    }
  };

  return (
    <dialog
      ref={ref}
      className="feedback-dialog"
      aria-labelledby="feedback-title"
      // Escape key and backdrop close go through React state, not around it.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <div className="feedback-dialog__panel">
        <header className="feedback-dialog__head">
          <h2 id="feedback-title">Share your feedback</h2>
          <button
            type="button"
            className="feedback-dialog__close"
            onClick={close}
            aria-label="Close feedback"
          >
            ×
          </button>
        </header>

        {phase === 'sent' ? (
          <div className="feedback-dialog__body feedback-dialog__thanks">
            <p>
              <strong>Thank you!</strong> Your feedback was sent to the All4Knox
              team.
            </p>
            <Button onClick={close}>Close</Button>
          </div>
        ) : loadError ? (
          <div className="feedback-dialog__body">
            <p className="auth-form__error">
              The survey could not be loaded. Please try again in a moment.
            </p>
            <Button variant="secondary" onClick={() => setLoadError(false)}>
              Retry
            </Button>
          </div>
        ) : !questions ? (
          <div className="feedback-dialog__body">
            <p className="feedback-dialog__muted">Loading…</p>
          </div>
        ) : (
          <form className="feedback-dialog__body" onSubmit={onSubmit}>
            <p className="feedback-dialog__intro">
              Every question is optional. Your answers are sent with the page you
              were on (<code>{location.pathname}</code>).
            </p>
            <p className="alert alert--warning feedback-dialog__phi">
              Please do not include any patient names or other identifying
              patient information.
            </p>

            {questions.ratings.map((rating) => (
              <fieldset key={rating.id} className="feedback-rating">
                <legend className="auth-form__label">{rating.question}</legend>
                <div className="feedback-rating__scale">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <label
                      key={score}
                      className={`feedback-rating__option ${
                        ratings[rating.id] === score ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`fb-${rating.id}`}
                        value={score}
                        checked={ratings[rating.id] === score}
                        onChange={() =>
                          setRatings((prev) => ({ ...prev, [rating.id]: score }))
                        }
                      />
                      {score}
                    </label>
                  ))}
                </div>
                <div className="feedback-rating__ends" aria-hidden="true">
                  <span>1 · {rating.low}</span>
                  <span>5 · {rating.high}</span>
                </div>
              </fieldset>
            ))}

            {questions.choices.map((choice) => (
              <label key={choice.id} className="auth-form__field">
                <span className="auth-form__label">{choice.question}</span>
                <select
                  className="auth-form__input"
                  value={answers[choice.id] ?? ''}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [choice.id]: event.target.value }))
                  }
                >
                  <option value="">Choose one (optional)</option>
                  {choice.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            {questions.texts.map((text) => (
              <label key={text.id} className="auth-form__field">
                <span className="auth-form__label">{text.question}</span>
                <textarea
                  className="auth-form__input"
                  rows={text.id === 'task' ? 2 : 3}
                  maxLength={questions.maxText}
                  value={answers[text.id] ?? ''}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [text.id]: event.target.value }))
                  }
                />
              </label>
            ))}

            <label className="auth-form__field">
              <span className="auth-form__label">
                Email, if you would like us to follow up (optional)
              </span>
              <input
                type="email"
                className="auth-form__input"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            {error ? <p className="auth-form__error">{error}</p> : null}

            <div className="feedback-dialog__actions">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={phase === 'sending'}>
                {phase === 'sending' ? 'Sending…' : 'Send feedback'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
