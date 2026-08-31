import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Markdown } from '../components/common/Markdown';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { useIdentity } from '../hooks/identityContext';
import * as api from '../services/api';
import type {
  AssistantStatus,
  Citation,
  ConversationMessage,
} from '../services/api';
import { DECISION_SUPPORT_NOTE } from '../content/governance';

/**
 * "Ask All4Knox" — skeleton §23.
 *
 * The assistant retrieves from the approved All4Knox clinical content and
 * nothing else. Below the relevance floor the backend never calls the model at
 * all, so an answer cannot come from model weights — the page shows a refusal
 * and points back at the deterministic tools.
 *
 * Conversations persist server-side against the session, so switching tabs and
 * returning continues the thread. A visitor's conversation is deleted with
 * their session after inactivity.
 */
const SUGGESTIONS = [
  'How should I interpret BUP positive with fentanyl on the same screen?',
  'My patient has TennCare and I am not BESMART enrolled. Can I prescribe?',
  'What should I do when a patient is still having cravings on 16 mg?',
  'How do I start buprenorphine for someone using fentanyl?',
];

/** A turn being streamed right now, before it lands in the transcript. */
interface PendingTurn {
  question: string;
  answer: string;
  citations: Citation[];
  refused: boolean;
}

function Citations({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <section className="assistant__sources">
      <h3 className="section-heading">Sources used ({citations.length})</h3>
      <ol className="assistant__citations">
        {citations.map((citation) => (
          <li key={`${citation.id}-${citation.index}`} className="assistant__citation">
            <span className="assistant__citation-index">[{citation.index}]</span>
            <div>
              <Link to={citation.route}>{citation.title}</Link>
              <p className="assistant__citation-meta">
                {citation.module} · {citation.sourceDocument}
                {citation.slide ? `, slide ${citation.slide}` : ''} · content
                version {citation.contentVersion}
              </p>
              <p className="assistant__citation-review">{citation.reviewState}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AskAll4Knox() {
  const { role, identity, loading: identityLoading } = useIdentity();
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [restoring, setRestoring] = useState(true);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Rehydrate the session's conversation — but only AFTER identity has
  // resolved.
  //
  // This ordering is load-bearing. Every endpoint mints a session when the
  // request arrives without a cookie. React runs child effects before parent
  // effects, so without this gate the page would fire its fetches before
  // IdentityProvider had established the cookie, each request would mint its
  // OWN session, and the conversation would end up owned by a session the
  // browser no longer holds — producing a 404 on the very next question.
  useEffect(() => {
    if (identityLoading) return;
    let cancelled = false;
    api
      .getCurrentConversation()
      .then((data) => {
        if (cancelled) return;
        setConversationId(data.conversationId);
        setMessages(data.messages);
      })
      .catch(() => {
        /* offline — the page still works, it just starts empty */
      })
      .finally(() => !cancelled && setRestoring(false));

    api
      .getAssistantStatus()
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus({ enabled: false, reason: 'API unreachable' }));

    return () => {
      cancelled = true;
      abortRef.current?.();
    };
  }, [identityLoading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, pending?.answer]);

  const ask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 3 || streaming) return;

      abortRef.current?.();
      setQuestion('');
      setError(null);
      setStreaming(true);
      setPending({ question: trimmed, answer: '', citations: [], refused: false });

      abortRef.current = api.askAssistantStream(
        trimmed,
        {
          onCitations: (citations, _version, convId) => {
            if (convId) setConversationId(convId);
            setPending((p) => (p ? { ...p, citations } : p));
          },
          onToken: (token) =>
            setPending((p) => (p ? { ...p, answer: p.answer + token } : p)),
          onRefusal: (payload) =>
            setPending((p) =>
              p ? { ...p, answer: payload.answer, refused: true } : p,
            ),
          onError: (message) => {
            // A stale conversation id (session rotated, or swept for
            // inactivity) is recoverable: drop it and let the next question
            // open a fresh conversation rather than dead-ending the provider.
            if (message.includes('404')) {
              setConversationId(null);
              setError(
                'That conversation is no longer available — your session may have expired. Ask again to start a new one.',
              );
            } else {
              setError(message);
            }
            setStreaming(false);
          },
          onDone: () => {
            setStreaming(false);
            // The turn is persisted server-side; fold it into the transcript.
            setPending((p) => {
              if (p) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}-q`,
                    role: 'user',
                    content: p.question,
                    citations: [],
                    refused: false,
                    createdAt: new Date().toISOString(),
                  },
                  {
                    id: `${Date.now()}-a`,
                    role: 'assistant',
                    content: p.answer,
                    citations: p.citations,
                    refused: p.refused,
                    createdAt: new Date().toISOString(),
                  },
                ]);
              }
              return null;
            });
          },
        },
        conversationId,
      );
    },
    [streaming, conversationId],
  );

  const startNew = async () => {
    abortRef.current?.();
    setStreaming(false);
    setPending(null);
    setError(null);
    try {
      const data = await api.newConversation();
      setConversationId(data.conversationId);
      setMessages([]);
    } catch {
      setMessages([]);
    }
  };

  const unavailable =
    status !== null && (!status.enabled || status.ollama?.reachable === false);
  const hasTranscript = messages.length > 0 || pending !== null;

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
          <Link to="/toolkit/uds">decision tools</Link> remain the primary way to
          get guidance — they are deterministic and do not involve a model.
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
        {hasTranscript ? (
          <div className="assistant__meta print-hide">
            <span className="assistant__session">
              {identity?.isAuthenticated
                ? `Signed in as ${identity.user?.displayName} (${role})`
                : 'Browsing as a visitor — this conversation is kept for this session only'}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={startNew}>
              New conversation
            </button>
          </div>
        ) : null}

        {restoring ? (
          <p className="placeholder">Restoring your conversation…</p>
        ) : null}

        {/* ---- transcript ---- */}
        {messages.map((message) =>
          message.role === 'user' ? (
            <p key={message.id} className="assistant__turn-question">
              {message.content}
            </p>
          ) : (
            <article key={message.id} className="assistant__answer">
              <h2 className="section-heading">
                {message.refused ? 'Not covered by the approved content' : 'Answer'}
              </h2>
              <div className="assistant__body">
                <Markdown>{message.content}</Markdown>
              </div>
              <Citations citations={message.citations} />
            </article>
          ),
        )}

        {/* ---- turn in flight ---- */}
        {pending ? (
          <>
            <p className="assistant__turn-question">{pending.question}</p>
            <article className="assistant__answer">
              <h2 className="section-heading">
                {pending.refused ? 'Not covered by the approved content' : 'Answer'}
              </h2>
              <div className="assistant__body">
                <Markdown>{pending.answer}</Markdown>
                {streaming ? (
                  <span className="assistant__cursor" aria-hidden="true" />
                ) : null}
              </div>
              <Citations citations={pending.citations} />
            </article>
          </>
        ) : null}

        <div ref={endRef} />

        {error ? (
          <ClinicalAlert tone="warning" title="The assistant could not answer">
            <p>{error}</p>
            <p>
              Use the decision tools directly — they do not depend on the model.
            </p>
          </ClinicalAlert>
        ) : null}

        {/* ---- composer ---- */}
        <form
          className="assistant__form print-hide"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <label className="assistant__label" htmlFor="assistant-question">
            {hasTranscript ? 'Ask a follow-up' : 'Your question'}
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

        {!hasTranscript && !unavailable && !restoring ? (
          <div className="assistant__suggestions print-hide">
            <h2 className="section-heading">Try one of these</h2>
            <ul className="assistant__suggestion-list">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className="assistant__suggestion"
                    onClick={() => ask(suggestion)}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}
