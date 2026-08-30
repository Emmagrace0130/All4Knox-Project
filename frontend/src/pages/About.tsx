import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { EMERGENCY_NOTICE, PHI_NOTICE } from '../content/governance';
import { CONTENT_VERSION, SOURCE_DOCUMENT } from '../content/version';

/** About — skeleton §21, §22. Route: /about */
export function About() {
  return (
    <PageContainer
      title="About All4Knox"
      lede="A quick-reference clinical toolkit for Tennessee clinicians learning to prescribe buprenorphine-naloxone for opioid use disorder."
      width="reading"
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <ClinicalAlert tone="escalation" title="Emergencies">
        <p>{EMERGENCY_NOTICE}</p>
      </ClinicalAlert>

      <section className="prose-section">
        <h2>Who this is for</h2>
        <ul className="list list--dot">
          <li>Primary care physicians</li>
          <li>Family medicine clinicians</li>
          <li>Internal medicine clinicians</li>
          <li>Nurse practitioners</li>
          <li>Physician assistants</li>
          <li>Other Tennessee clinicians involved in OUD treatment</li>
        </ul>
      </section>

      <section className="prose-section">
        <h2>How to read a result</h2>
        <p>
          Tools in this toolkit provide <strong>clinical decision support</strong>,
          not a determination. Every result states the inputs you gave, the
          source it came from, its content version and whether it has been
          clinically reviewed. Educational pages are labelled separately.
        </p>
        <p>
          Guidance comes from <em>{SOURCE_DOCUMENT}</em>. Content version{' '}
          {CONTENT_VERSION}. See{' '}
          <Link to="/clinical-sources">Clinical Sources &amp; Versions</Link> for
          the state of every block, including the parts that have not been
          entered or reviewed yet.
        </p>
      </section>

      <section className="prose-section">
        <h2>Privacy</h2>
        <p>{PHI_NOTICE}</p>
        <p>
          The tools ask only for the minimum clinical variables needed to give
          guidance — no name, date of birth, address, medical record number,
          phone or email.
        </p>
      </section>

      <section className="prose-section">
        <h2>Status</h2>
        <p>
          This is the Phase 1 build: toolkit landing page, Tennessee prescribing
          pathway, induction decision aid, UDS interpreter, maintenance dosing,
          referral directory and the clinical sources page. Clinical content is
          transcribed from the source presentation; referral contact details are
          the one part still unverified. It runs entirely in the browser — the
          FastAPI backend, the Phase 2 tools (COWS calculator, OUD diagnosis
          helper, naloxone guide, follow-up checklist) and search are not built
          yet.
        </p>
      </section>
    </PageContainer>
  );
}
