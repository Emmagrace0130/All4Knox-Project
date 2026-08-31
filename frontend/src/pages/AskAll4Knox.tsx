import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import {
  askAssistantStream,
  getAssistantStatus,
} from '../services/api';
import type { AssistantStatus, Citation } from '../services/api';
import { DECISION_SUPPORT_NOTE } from '../content/governance';

/**
 * "Ask All4Knox" — skeleton §23.
 *
 * The assistant retrieves from the approved All4Knox clinical content and
 * nothing else. When retrieval finds nothing relevant the backend never calls
 * the model at all, so the answer cannot come from model weights — the page
 * shows a refusal and points back at the deterministic tools.
 *
 * This does NOT replace the decision tools. It is a way of finding your way to
 * them in words.
 */
const SUGGESTIONS = [
  'How should I interpret BUP positive with fentanyl on the same screen?',
  'My patient has TennCare and I am not BESMART enrolled. Can I prescribe?',
  'What should I do when a patient is still having cravings on 16 mg?',
  'How do I start buprenorphine for someone using fentanyl?',
];

export function AskAll4Knox() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [contentVersion, setContentVersion] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getAssistantStatus()
      .then(setStatus)
      .catch(() => setStatus({ enabled: false, reason: 'API unreachable' }));
    return () => abortRef.current?.();
  }, []);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || streaming) return;

    abortRef.current?.();
    setAsked(trimmed);
    setAnswer('');
    setCitations([]);
    setError(null);
    setRefused(false);
    setStreaming(true);

    abortRef.current = askAssistantStream(trimmed, {
      onCitations: (found, version) => {
        setCitations(found);
        setContentVersion(version);
      },
      onToken: (token) => setAnswer((prev) => prev + token),
      onRefusal: (payload) => {
        setRefused(true);
        setAnswer(payload.answer);
        setContentVersion(payload.contentVersion);
      },
      onError: (message) => {
        setError(message);
        setStreaming(false);
      },
      onDone: () => setStreaming(false),
    });
  };

  const unavailable =
    status !== null &&
    (!status.enabled || status.ollama?.reachable === false);

  return (
    <PageContainer
      eyebrow="Clinical Decision Support"
      title="Ask All4Knox"
      lede="Ask a clinical workflow question in your own words. Answers come only from the approved All4Knox content, with the source shown."
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <ClinicalAlert tone="info" title="What this can and cannot do">
        <p>{DECISION_SUPPORT_NOTE}</p>
        <p>
          This assistant only repeats what is in the approved All4Knox clinical
          content. If the content does not cover your question, it will say so
          rather than answer from general medical knowledge. The{' '}
          <Link to="/toolkit/uds">decision tools</Link> remain the primary way
          to get guidance — they are deterministic and do not involve a model.
        </p>
      </ClinicalAlert>

      {unavailable ? (
        <ClinicalAlert tone="pending" title="The assistant is not available">
          <p>
            {status?.reason ??
              status?.ollama?.error ??
              'The local language model is not reachable right now.'}
          </p>
          <p>
            Every clinical decision tool works without it — they never call a
            model. Start from the <Link to="/">toolkit</Link>.
          </p>
        </ClinicalAlert>
      ) : null}

      <section className="assistant">
        <form
          className="assistant__form print-hide"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <label className="assistant__label" htmlFor="assistant-question">
            Your question
          </label>
          <textarea
            id="assistant-question"
            className="assistant__input"
            rows={3}
            value={question}
            placeholder="e.g. How should I interpret BUP + FENT on today's UDS?"
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                ask(question);
              }
            }}
            disabled={unavailable}
          />
          <p className="assistant__hint">
            Do not enter patient names, dates of birth, or any other identifying
            information.
          </p>
          <div className="button-row">
            <Button type="submit" disabled={streaming || unavailable}>
              {streaming ? 'Answering…' : 'Ask'}
            </Button>
            {streaming ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  abortRef.current?.();
                  setStreaming(false);
                }}
              >
                Stop
              </Button>
            ) : null}
          </div>
        </form>

        {!asked && !unavailable ? (
          <div className="assistant__suggestions print-hide">
            <h2 className="section-heading">Try one of these</h2>
            <ul className="assistant__suggestion-list">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className="assistant__suggestion"
                    onClick={() => {
                      setQuestion(suggestion);
                      ask(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <ClinicalAlert tone="warning" title="The assistant could not answer">
            <p>{error}</p>
            <p>Use the decision tools directly — they do not depend on the model.</p>
          </ClinicalAlert>
        ) : null}

        {asked && !error ? (
          <article className="assistant__answer">
            <h2 className="section-heading">
              {refused ? 'Not covered by the approved content' : 'Answer'}
            </h2>
            <p className="assistant__question">“{asked}”</p>

            <div className="assistant__body">
              {answer
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .map((line, index) => (
                  <p key={`${index}-${line.slice(0, 24)}`}>{line}</p>
                ))}
              {streaming ? <span className="assistant__cursor" aria-hidden="true" /> : null}
            </div>

            {citations.length > 0 ? (
              <section className="assistant__sources">
                <h3 className="section-heading">
                  Sources used ({citations.length})
                </h3>
                <ol className="assistant__citations">
                  {citations.map((citation) => (
                    <li key={citation.id} className="assistant__citation">
                      <span className="assistant__citation-index">
                        [{citation.index}]
                      </span>
                      <div>
                        <Link to={citation.route}>{citation.title}</Link>
                        <p className="assistant__citation-meta">
                          {citation.module} · {citation.sourceDocument}
                          {citation.slide ? `, slide ${citation.slide}` : ''} ·
                          content version {citation.contentVersion}
                        </p>
                        <p className="assistant__citation-review">
                          {citation.reviewState}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {contentVersion ? (
              <p className="assistant__version">
                Clinical guidance version {contentVersion} · nothing in this
                toolkit has been clinically reviewed yet ·{' '}
                <Link to="/clinical-sources">see all sources</Link>
              </p>
            ) : null}
          </article>
        ) : null}
      </section>
    </PageContainer>
  );
}
