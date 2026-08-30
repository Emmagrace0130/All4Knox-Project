import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import {
  EXTERNAL_LINK_NOTICE,
  externalResources,
  resourceSections,
} from '../content/resources';

/** Resources — skeleton §12. Route: /resources */
export function Resources() {
  return (
    <PageContainer
      title="Resources"
      lede="Quick guides, patient education and external clinical references."
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      {resourceSections.map((section) => (
        <section key={section.id} className="resource-section">
          <h2 className="section-heading">{section.title}</h2>
          {section.description ? (
            <p className="resource-section__description">{section.description}</p>
          ) : null}
          <ul className="resource-list">
            {section.items.map((item) => (
              <li key={item.title} className="resource-item">
                {item.to ? (
                  <Link to={item.to} className="resource-item__link">
                    {item.title}
                    <span aria-hidden="true"> →</span>
                  </Link>
                ) : (
                  <span className="resource-item__text">
                    {item.title}
                    <span className="tag tag--muted">Planned</span>
                  </span>
                )}
                {item.note ? (
                  <span className="resource-item__note">{item.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="resource-section">
        <h2 className="section-heading">External Clinical Resources</h2>
        <ClinicalAlert tone="pending" title="Links pending review">
          <p>{EXTERNAL_LINK_NOTICE}</p>
        </ClinicalAlert>
        <ul className="resource-list">
          {externalResources.map((item) => (
            <li key={item.title} className="resource-item">
              <a
                className="resource-item__link"
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                {item.title}
                <span aria-hidden="true"> ↗</span>
              </a>
              {item.note ? (
                <span className="resource-item__note">{item.note}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
