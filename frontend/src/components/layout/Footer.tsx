import { Link } from 'react-router-dom';
import { BackendStatus } from './BackendStatus';
import { EMERGENCY_NOTICE, PHI_NOTICE } from '../../content/governance';
import { CONTENT_REVIEW, CONTENT_VERSION } from '../../content/version';
import logoLockup from '../../imgs/all4knox_logo_lockup.png';
import aslLogo from '../../imgs/asl_logo_reversed_trimmed.png';
import mcnabbLogo from '../../imgs/mcnabb_logo_web.png';

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

      {/*
        Acknowledgements. The band is dark because the lab mark we have is the
        reversed (white-text) version; the All4Knox mark has black text, so it
        sits on its own light plate rather than being recoloured.
      */}
      <section className="site-ack" aria-label="Acknowledgements">
        <div className="site-ack__inner">
          <div className="site-ack__item">
            <span className="site-ack__plate">
              <img src={logoLockup} alt="All4Knox" width={340} height={205} />
            </span>
            <p className="site-ack__text">
              All4Knox is a joint City of Knoxville / Knox County initiative.
            </p>
          </div>

          <div className="site-ack__item">
            <p className="site-ack__label">Clinical partner</p>
            <span className="site-ack__plate site-ack__plate--wide">
              <img src={mcnabbLogo} alt="McNabb Center" width={600} height={184} />
            </span>
          </div>

          <div className="site-ack__item">
            <p className="site-ack__label">Developed by</p>
            <img
              className="site-ack__asl"
              src={aslLogo}
              alt="Applied Systems Lab, University of Tennessee, Knoxville"
              width={556}
              height={139}
            />
          </div>
        </div>
      </section>
    </footer>
  );
}
