import { Link } from 'react-router-dom';
import { ToolkitCard } from '../components/toolkit/ToolkitCard';
import { plannedTools } from '../content/governance';
import { quickStartLinks, toolkitCards } from '../content/toolkit';

/** Landing page — skeleton §5 / §25. Doubles as the Toolkit tab. */
export function ToolkitHome() {
  return (
    <main id="main" className="page page--home">
      <div className="page__inner">
        <section className="hero">
          <h1 className="hero__title">Toolkit</h1>
          <p className="hero__subtitle">Clinical Buprenorphine Toolkit</p>
          <p className="hero__lede">
            Practical, Tennessee-specific guidance for clinicians treating opioid
            use disorder. Pick a tool, or tell us what you need help with.
          </p>
        </section>

        <section className="quickstart" aria-labelledby="quickstart-heading">
          <h2 id="quickstart-heading" className="quickstart__heading">
            What do you need help with?
          </h2>
          <ul className="quickstart__list">
            {quickStartLinks.map((link) => (
              <li key={link.to + link.label}>
                <Link to={link.to} className="quickstart__link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="section-heading">
            Toolkit
          </h2>
          <ul className="tool-grid">
            {toolkitCards.map((card) => (
              <ToolkitCard key={card.id} card={card} />
            ))}
          </ul>
        </section>

        <section className="planned" aria-labelledby="planned-heading">
          <h2 id="planned-heading" className="planned__heading">
            Planned for Phase 2
          </h2>
          <ul className="planned__list">
            {plannedTools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
