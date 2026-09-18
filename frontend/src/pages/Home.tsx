import { Link } from 'react-router-dom';
import { LinkButton } from '../components/common/Button';
import { ToolkitCard } from '../components/toolkit/ToolkitCard';
import { toolkitCards } from '../content/toolkit';
import { CONTENT_REVIEW, CONTENT_VERSION } from '../content/version';
import aslLogo from '../imgs/asl_logo_reversed_trimmed.png';
import mcnabbLogo from '../imgs/mcnabb_logo_web.png';

/**
 * Landing page — mission, partners, and routing.
 *
 * A note on the tension this resolves: skeleton §5 and §27 are emphatic that a
 * busy clinician must reach a tool in one click and must not be made to read
 * first. A conventional splash page would break that.
 *
 * So the toolkit cards live ON this page, immediately below a short mission
 * statement. Nothing is one click further away than it was before, and the page
 * still explains what All4Knox is to someone arriving cold — a McNabb Center
 * partner, a prospective funder, or a clinician who has never seen it.
 */

/**
 * Partner and related-site slots.
 *
 * `logo: null` renders the organisation's name as a text plate rather than a
 * broken image. Only marks the organisation has supplied belong here — we are
 * not shipping a placeholder that implies an endorsement nobody granted.
 *
 * `logoSurface` is the background the mark was designed for: the lab's mark
 * is the reversed (white-text) version and disappears on a light plate.
 */
const PARTNERS = [
  {
    id: 'mcnabb',
    name: 'McNabb Center',
    role: 'Clinical partner',
    blurb:
      'Behavioral health and addiction treatment across East Tennessee. All4Knox is being piloted as a tool for their providers.',
    href: null as string | null,
    logo: mcnabbLogo as string | null,
    logoSurface: 'light' as 'light' | 'dark',
  },
  {
    id: 'asl',
    name: 'Applied Systems Lab',
    role: 'Research partner',
    blurb:
      'Industrial and systems engineering research at the University of Tennessee, Knoxville — the lab behind this toolkit.',
    href: null as string | null,
    logo: aslLogo as string | null,
    logoSurface: 'dark' as 'light' | 'dark',
  },
];

const AUDIENCES = [
  {
    title: 'I am seeing a patient now',
    body: 'Go straight to the decision tool you need. No reading, no sign-in.',
    to: '/toolkit',
    cta: 'Open the toolkit',
  },
  {
    title: 'I am new to prescribing buprenorphine',
    body: 'Start with what Suboxone is, why precipitated withdrawal happens, and how induction is chosen.',
    to: '/learn/buprenorphine',
    cta: 'Start learning',
  },
  {
    title: 'I have a question in plain words',
    body: 'Ask All4Knox answers from the approved clinical content only, and shows its sources.',
    to: '/ask',
    cta: 'Ask a question',
  },
];

export function Home() {
  return (
    <main id="main" className="page page--home">
      <div className="page__inner">
        {/* ---- mission ---- */}
        <section className="splash-hero">
          <p className="splash-hero__eyebrow">
            A pilot with the McNabb Center · Knoxville, Tennessee
          </p>
          <h1 className="splash-hero__title">
            Practical buprenorphine guidance, at the point of care.
          </h1>
          <p className="splash-hero__lede">
            All4Knox is a quick-reference clinical toolkit for Tennessee
            providers treating opioid use disorder. It turns the decision
            pathways clinicians actually need — can I prescribe, how do I start,
            what does this drug screen mean — into tools that answer in seconds.
          </p>
          <div className="splash-hero__actions">
            <LinkButton to="/toolkit">Open the toolkit</LinkButton>
            <LinkButton to="/ask" variant="secondary">
              Ask a question
            </LinkButton>
          </div>
          <p className="splash-hero__meta">
            Clinical guidance version {CONTENT_VERSION} ·{' '}
            {CONTENT_REVIEW.reviewedDate
              ? `last reviewed ${CONTENT_REVIEW.reviewedDate}`
              : 'not yet clinically reviewed'}{' '}
            · <Link to="/clinical-sources">see every source</Link>
          </p>
        </section>

        {/* ---- why it exists ---- */}
        <section className="splash-mission" aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="splash-mission__heading">
            Why this exists
          </h2>
          <div className="splash-mission__grid">
            <article>
              <h3>The barrier moved</h3>
              <p>
                Federal law no longer requires a special waiver to prescribe
                buprenorphine. What still stops providers is practical: which
                Tennessee and TennCare rules apply, how to start someone using
                fentanyl without causing precipitated withdrawal, and what to do
                with an unexpected drug screen.
              </p>
            </article>
            <article>
              <h3>Answers in seconds, not chapters</h3>
              <p>
                Every tool gives a short answer first, then the next clinical
                actions, then the source. The decision logic is deterministic
                and version-controlled — the same inputs always produce the same
                guidance, and every block shows where it came from.
              </p>
            </article>
            <article>
              <h3>Built for this state, with this partner</h3>
              <p>
                The guidance is Tennessee-specific and drawn from the All4Knox
                clinical summary, developed with the McNabb Center. Referral
                options are local. Nothing here asks for patient-identifying
                information.
              </p>
            </article>
          </div>
        </section>

        {/* ---- routing by intent ---- */}
        <section className="splash-audiences" aria-labelledby="audiences-heading">
          <h2 id="audiences-heading" className="section-heading">
            Where do you want to start?
          </h2>
          <ul className="splash-audiences__list">
            {AUDIENCES.map((audience) => (
              <li key={audience.to} className="splash-audience">
                <h3>{audience.title}</h3>
                <p>{audience.body}</p>
                <Link to={audience.to} className="splash-audience__cta">
                  {audience.cta} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- the tools themselves, so nothing is further than one click ---- */}
        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="section-heading">
            The toolkit
          </h2>
          <ul className="tool-grid">
            {toolkitCards.map((card) => (
              <ToolkitCard key={card.id} card={card} />
            ))}
          </ul>
        </section>

        {/* ---- partners ---- */}
        <section className="splash-partners" aria-labelledby="partners-heading">
          <h2 id="partners-heading" className="section-heading">
            Partners
          </h2>
          <ul className="splash-partners__list">
            {PARTNERS.map((partner) => (
              <li key={partner.id} className="splash-partner">
                <div
                  className={`splash-partner__logo splash-partner__logo--${partner.logoSurface}`}
                >
                  {partner.logo ? (
                    <img src={partner.logo} alt={`${partner.name} logo`} />
                  ) : (
                    <span className="splash-partner__wordmark">
                      {partner.name}
                    </span>
                  )}
                </div>
                <div>
                  <p className="splash-partner__role">{partner.role}</p>
                  <h3 className="splash-partner__name">
                    {partner.href ? (
                      <a href={partner.href} target="_blank" rel="noopener noreferrer">
                        {partner.name}
                      </a>
                    ) : (
                      partner.name
                    )}
                  </h3>
                  <p className="splash-partner__blurb">{partner.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- governance, stated plainly ---- */}
        <section className="splash-status">
          <h2 className="splash-status__heading">Status of this toolkit</h2>
          <p>
            The clinical content has been transcribed from the All4Knox Clinical
            Summary 2026 and <strong>has not yet been reviewed by a
            clinician</strong>. Every block reports its own review state, and
            nothing claims a review it has not had.
          </p>
          <p>
            This is clinical decision support, not a substitute for clinician
            judgment, and it is not for emergency use.{' '}
            <Link to="/clinical-sources">
              Review every block and its source →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
