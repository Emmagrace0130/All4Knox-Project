import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { useIdentity } from '../hooks/identityContext';
import * as api from '../services/api';
import type {
  ReviewBlock,
  ReviewBlockDetail,
  ReviewDecision,
  ReviewQueue,
  ReviewRecord,
  ReviewState,
} from '../services/api';

/**
 * Clinical review workspace — skeleton §20 and §21.
 *
 * Two roles reach this page and they do different things:
 *
 *   clinician → an authoritative attestation. This is what /clinical-sources
 *               reports and what `reviewedCount` counts.
 *   admin     → internal QA of the workflow itself. Recorded and shown, but it
 *               never marks a block reviewed. An engineer must not be able to
 *               sign off on clinical guidance, even by accident.
 *
 * The page states which of the two the current user is doing, every time.
 */

const STATE_LABEL: Record<ReviewState, string> = {
  unreviewed: 'Not yet reviewed',
  reviewed: 'Reviewed',
  stale: 'Content changed since review',
  rejected: 'Rejected',
  needs_info: 'Needs more information',
};

const STATE_TAG: Record<ReviewState, string> = {
  unreviewed: 'tag--muted',
  reviewed: 'tag--ok',
  stale: 'tag--warn',
  rejected: 'tag--danger',
  needs_info: 'tag--warn',
};

const DECISION_LABEL: Record<ReviewDecision, string> = {
  approved: 'Approve — the guidance is clinically correct as written',
  approved_with_changes: 'Approve with changes — correct, but edits are needed',
  needs_info: 'Needs more information before I can decide',
  rejected: 'Reject — the guidance is not clinically acceptable',
};

function ReviewLine({ record }: { record: ReviewRecord }) {
  const who = [
    record.reviewerName,
    record.credential ?? 'credential not recorded',
    record.licenseState,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <li className="review-history__item">
      <span className={`tag ${record.authority === 'clinical' ? 'tag--ok' : 'tag--muted'}`}>
        {record.authority === 'clinical' ? 'Clinical review' : 'Internal QA'}
      </span>
      <div>
        <p className="review-history__decision">
          {record.decision.replace(/_/g, ' ')} — {who}
        </p>
        <p className="review-history__meta">
          {new Date(record.createdAt).toLocaleString()} · content version{' '}
          {record.contentVersion} · hash {record.contentHash.slice(0, 10)}
        </p>
        {record.comments ? (
          <p className="review-history__comments">{record.comments}</p>
        ) : null}
      </div>
    </li>
  );
}

function BlockPanel({
  blockId,
  onReviewed,
  canReview,
}: {
  blockId: string;
  onReviewed: () => void;
  canReview: boolean;
}) {
  const [block, setBlock] = useState<ReviewBlockDetail | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>('approved');
  const [comments, setComments] = useState('');
  const [nextReview, setNextReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Synchronising with the API when the selected block changes. The
    // synchronous resets clear the previous block's form so a comment typed
    // against one block can never be submitted against another.
    // oxlint-disable-next-line react/set-state-in-effect
    setBlock(null);
    setComments('');
    setDecision('approved');
    setError(null);
    let cancelled = false;
    api
      .getReviewBlock(blockId)
      .then((data) => !cancelled && setBlock(data))
      .catch(() => !cancelled && setError('Could not load that block.'));
    return () => {
      cancelled = true;
    };
  }, [blockId]);

  if (error) return <p className="auth-form__error">{error}</p>;
  if (!block) return <p className="placeholder">Loading…</p>;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.submitReview(blockId, {
        decision,
        comments: comments.trim() || undefined,
        nextReviewDate: nextReview || undefined,
      });
      setBlock(result.block);
      setComments('');
      onReviewed();
    } catch {
      setError('Could not record that review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="review-detail">
      <header className="review-detail__header">
        <span className={`tag ${STATE_TAG[block.state]}`}>
          {STATE_LABEL[block.state]}
        </span>
        <h2 className="review-detail__title">{block.title}</h2>
        <p className="review-detail__meta">
          {block.module} · {block.source.document}
          {block.source.slide ? `, slide ${block.source.slide}` : ''} · content
          version {block.contentVersion} ·{' '}
          <Link to={block.route}>see it in the toolkit →</Link>
        </p>
      </header>

      {block.contentChangedSinceReview ? (
        <ClinicalAlert tone="warning" title="This block changed after it was reviewed">
          <p>
            The text below no longer matches what was signed off. The previous
            review is kept in the history but does not apply to this version.
          </p>
        </ClinicalAlert>
      ) : null}

      <section className="review-detail__content">
        <h3 className="section-heading">Exactly what the system serves</h3>
        <pre className="review-detail__text">{block.text}</pre>
        <p className="review-detail__hash">
          content hash {block.contentHash.slice(0, 16)}… — a review binds to
          this text. If it changes, the review is marked stale automatically.
        </p>
      </section>

      {canReview ? (
        <section className="review-form">
          <h3 className="section-heading">Record your review</h3>
          <fieldset className="review-form__decisions">
            {block.decisions.map((option) => (
              <label key={option} className="review-form__decision">
                <input
                  type="radio"
                  name="decision"
                  value={option}
                  checked={decision === option}
                  onChange={() => setDecision(option)}
                />
                <span>{DECISION_LABEL[option] ?? option}</span>
              </label>
            ))}
          </fieldset>

          <label className="auth-form__field">
            <span className="auth-form__label">
              Comments {decision !== 'approved' ? '(please explain)' : '(optional)'}
            </span>
            <textarea
              className="auth-form__input"
              rows={4}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="What did you check, and anything that needs changing."
            />
          </label>

          <label className="auth-form__field">
            <span className="auth-form__label">Next review due (optional)</span>
            <input
              type="date"
              className="auth-form__input"
              value={nextReview}
              onChange={(event) => setNextReview(event.target.value)}
            />
          </label>

          {error ? <p className="auth-form__error">{error}</p> : null}

          <div className="button-row">
            <Button onClick={() => void submit()} disabled={busy}>
              {busy ? 'Recording…' : 'Record review'}
            </Button>
          </div>
        </section>
      ) : null}

      {block.history.length > 0 ? (
        <section className="review-history">
          <h3 className="section-heading">
            Review history ({block.history.length})
          </h3>
          <p className="review-history__note">
            Append-only. Corrections add a record; nothing is ever overwritten.
          </p>
          <ul className="review-history__list">
            {block.history.map((record) => (
              <ReviewLine key={record.id} record={record} />
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export function ClinicalReview() {
  const { role, loading } = useIdentity();
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewState | 'all'>('all');

  const load = useCallback(() => {
    api.getReviewQueue().then(setQueue).catch(() => setQueue(null));
  }, []);

  useEffect(() => {
    if (!loading) load();
  }, [loading, load]);

  if (loading) return null;

  const canReview = queue?.canReview ?? false;
  const authority = queue?.authority ?? null;
  const blocks: ReviewBlock[] =
    queue?.blocks.filter((b) => filter === 'all' || b.state === filter) ?? [];

  return (
    <PageContainer
      eyebrow="Clinical governance"
      title="Clinical review"
      lede="Every block of guidance in the toolkit, and whether a clinician has signed off on it."
      backTo={{ to: '/clinical-sources', label: 'Clinical sources' }}
    >
      {!canReview ? (
        <ClinicalAlert tone="info" title="You are viewing the review record">
          <p>
            Review state is public — anyone can see what has and has not been
            signed off. Recording a review requires the clinician role.
          </p>
          {role === 'visitor' ? (
            <p>
              <Link to="/sign-in">Sign in</Link> if you have an account.
            </p>
          ) : null}
        </ClinicalAlert>
      ) : authority === 'qa' ? (
        <ClinicalAlert
          tone="warning"
          title="You are signed in as an administrator — your reviews are NOT clinical sign-off"
        >
          <p>
            Anything you record here is stored as <strong>internal QA</strong>:
            useful for testing and validating this workflow, but it will not
            mark a block as reviewed and it does not count toward the reviewed
            total.
          </p>
          <p>
            Only a clinician account can record an authoritative clinical
            review. That separation is deliberate — administrator is a software
            role, not a clinical credential.
          </p>
        </ClinicalAlert>
      ) : (
        <ClinicalAlert tone="info" title="Your reviews are authoritative">
          <p>
            You are recording clinical sign-off. Your name and credential are
            attached to each record, the record is permanent, and it is shown
            publicly on the clinical sources page.
          </p>
          <p>
            <Link to="/account">Add your credential and licence state</Link> if
            you have not already — a missing credential is recorded as missing.
          </p>
        </ClinicalAlert>
      )}

      {queue ? (
        <div className="review-layout">
          <div className="review-queue print-hide">
            <div className="review-queue__summary">
              <strong>
                {queue.reviewedCount} of {queue.total}
              </strong>{' '}
              blocks reviewed
            </div>
            <div className="review-queue__filters">
              {(['all', 'unreviewed', 'stale', 'needs_info', 'rejected', 'reviewed'] as const).map(
                (option) => {
                  const count =
                    option === 'all' ? queue.total : queue.counts[option] ?? 0;
                  if (option !== 'all' && count === 0) return null;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`review-queue__filter ${filter === option ? 'is-active' : ''}`}
                      onClick={() => setFilter(option)}
                    >
                      {option === 'all' ? 'All' : STATE_LABEL[option]} ({count})
                    </button>
                  );
                },
              )}
            </div>
            <ul className="review-queue__list">
              {blocks.map((block) => (
                <li key={block.id}>
                  <button
                    type="button"
                    className={`review-queue__item ${selected === block.id ? 'is-selected' : ''}`}
                    onClick={() => setSelected(block.id)}
                  >
                    <span className={`tag ${STATE_TAG[block.state]}`}>
                      {STATE_LABEL[block.state]}
                    </span>
                    <span className="review-queue__title">{block.title}</span>
                    <span className="review-queue__module">{block.module}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="review-panel">
            {selected ? (
              <BlockPanel
                blockId={selected}
                canReview={canReview}
                onReviewed={load}
              />
            ) : (
              <p className="placeholder">
                Select a block to read it and record a review.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="placeholder">Loading the review queue…</p>
      )}
    </PageContainer>
  );
}
