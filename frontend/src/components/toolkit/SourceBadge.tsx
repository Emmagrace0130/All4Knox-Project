import { Link } from 'react-router-dom';
import type { ReviewMeta, SourceRef } from '../../types/clinical';

interface SourceBadgeProps {
  source: SourceRef;
  review: ReviewMeta;
  contentVersion: string;
  /** Show [View Source] / [Print] actions (skeleton §6 result card). */
  showActions?: boolean;
}

/**
 * Source + version + review line required on every clinical algorithm
 * (skeleton §7, §20, §21). An unreviewed block says "Pending clinical review"
 * rather than showing a blank or placeholder date.
 */
export function SourceBadge({
  source,
  review,
  contentVersion,
  showActions = false,
}: SourceBadgeProps) {
  return (
    <div className="source-badge">
      <dl className="source-badge__meta">
        <div>
          <dt>Source</dt>
          <dd>
            {source.document}
            {source.slide ? ` · slide ${source.slide}` : ''}
            {source.location ? ` · ${source.location}` : ''}
          </dd>
        </div>
        <div>
          <dt>Content version</dt>
          <dd>{contentVersion}</dd>
        </div>
        <div>
          <dt>Last clinical review</dt>
          <dd>
            {review.reviewedDate ? (
              <>
                {review.reviewedDate}
                {review.reviewedBy ? ` · ${review.reviewedBy}` : ''}
              </>
            ) : (
              <span className="source-badge__pending">Pending clinical review</span>
            )}
          </dd>
        </div>
      </dl>
      {showActions ? (
        <div className="source-badge__actions print-hide">
          <Link to="/clinical-sources" className="btn btn--ghost btn--sm">
            View source
          </Link>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      ) : null}
    </div>
  );
}
