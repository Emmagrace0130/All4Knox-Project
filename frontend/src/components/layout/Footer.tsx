import { Link } from 'react-router-dom';
import { BackendStatus } from './BackendStatus';
import { EMERGENCY_NOTICE, PHI_NOTICE } from '../../content/governance';
import { CONTENT_REVIEW, CONTENT_VERSION } from '../../content/version';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__emergency">
          <strong>Emergencies.</strong> {EMERGENCY_NOTICE}
        </p>
        <p className="site-footer__note">{PHI_NOTICE}</p>
        <p className="site-footer__meta">
          <span>Clinical guidance version {CONTENT_VERSION}</span>
          <span aria-hidden="true">·</span>
          <span>
            Last reviewed:{' '}
            {CONTENT_REVIEW.reviewedDate ?? 'pending clinical review'}
          </span>
          <span aria-hidden="true">·</span>
          <Link to="/clinical-sources">Clinical sources &amp; versions</Link>
          <span aria-hidden="true">·</span>
          <BackendStatus />
        </p>
      </div>
    </footer>
  );
}
