import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { SourceBadge } from '../components/toolkit/SourceBadge';
import { EDUCATIONAL_LABEL } from '../content/governance';
import { buprenorphineBasics } from '../content/learn';

/** Buprenorphine-naloxone basics — skeleton §10. Route: /learn/buprenorphine */
export function LearnBuprenorphine() {
  const { precipitatedWithdrawal } = buprenorphineBasics;

  return (
    <PageContainer
      eyebrow={EDUCATIONAL_LABEL}
      title={buprenorphineBasics.title}
      lede="Background reading. For the clinical workflow, go straight to the induction tool."
      width="reading"
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      {buprenorphineBasics.sections.map((section) => (
        <section key={section.id} className="prose-section">
          <h2>{section.title}</h2>
          {section.id === 'what-is-suboxone' ? (
            <p>
              Suboxone is a combination of{' '}
              {buprenorphineBasics.components.join(' and ').toLowerCase()}.
            </p>
          ) : null}
          <ul className="list list--dot">
            {section.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}

      <section className="prose-section" id="precipitated-withdrawal">
        <h2>{precipitatedWithdrawal.title}</h2>
        <ol className="chain">
          {precipitatedWithdrawal.steps.map((step, index) => (
            <li key={step} className="chain__step">
              <span className="chain__index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="chain__text">{step}</span>
            </li>
          ))}
        </ol>
        <p className="chain__note">{precipitatedWithdrawal.note}</p>
        <p className="prose-section__cta">
          <Link to="/toolkit/start" className="btn btn--primary btn--md">
            Choose an induction method
          </Link>
        </p>
      </section>

      <SourceBadge
        source={buprenorphineBasics.source}
        review={buprenorphineBasics.review}
        contentVersion={buprenorphineBasics.contentVersion}
      />
    </PageContainer>
  );
}
