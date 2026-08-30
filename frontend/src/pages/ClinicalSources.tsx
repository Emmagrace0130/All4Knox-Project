import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import {
  contentRegistry,
  registryCounts,
  reviewedCount,
} from '../content/registry';
import {
  CONTENT_REVIEW,
  CONTENT_VERSION,
  SOURCE_DOCUMENT,
} from '../content/version';
import type { EntryStatus } from '../types/clinical';

const statusLabel: Record<EntryStatus, string> = {
  documented: 'Entered',
  partial: 'Partially entered',
  pending: 'Not yet entered',
};

const statusTag: Record<EntryStatus, string> = {
  documented: 'tag--ok',
  partial: 'tag--warn',
  pending: 'tag--muted',
};

/** Clinical source / version control — skeleton §20. Route: /clinical-sources */
export function ClinicalSources() {
  const counts = registryCounts();
  const reviewed = reviewedCount();
  const total = contentRegistry.length;

  return (
    <PageContainer
      title="Clinical Sources & Versions"
      lede="Every clinical block in this toolkit, with its source, entry status and review state."
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <section className="version-summary">
        <dl className="version-summary__grid">
          <div>
            <dt>Guidance set</dt>
            <dd>All4Knox Clinical Guidance</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{CONTENT_VERSION}</dd>
          </div>
          <div>
            <dt>Source document</dt>
            <dd>{SOURCE_DOCUMENT}</dd>
          </div>
          <div>
            <dt>Last clinical review</dt>
            <dd>{CONTENT_REVIEW.reviewedDate ?? 'Not yet reviewed'}</dd>
          </div>
          <div>
            <dt>Next scheduled review</dt>
            <dd>{CONTENT_REVIEW.nextReviewDate ?? 'Not yet scheduled'}</dd>
          </div>
          <div>
            <dt>Blocks reviewed</dt>
            <dd>
              {reviewed} of {total}
            </dd>
          </div>
        </dl>
      </section>

      <ClinicalAlert tone="pending" title="No block has been clinically reviewed">
        <p>
          {counts.documented} of {total} blocks are transcribed from the source
          presentation, {counts.partial} are partially entered
          {counts.pending > 0
            ? `, and ${counts.pending} are placeholders awaiting content`
            : ''}
          . None has been signed off by a clinical reviewer.
        </p>
        <p>
          Before production use, a named clinician must review each block and
          record the reviewer, review date, effective date and next review date.
          Tennessee prescribing restrictions, TennCare requirements, prior
          authorization, dose limits, BESMART requirements and referral
          information need particular attention.
        </p>
      </ClinicalAlert>

      <section>
        <h2 className="section-heading">Content blocks</h2>
        <div className="table-scroll">
          <table className="registry-table">
            <thead>
              <tr>
                <th scope="col">Block</th>
                <th scope="col">Module</th>
                <th scope="col">Source location</th>
                <th scope="col">Entry status</th>
                <th scope="col">Reviewer</th>
                <th scope="col">Reviewed</th>
                <th scope="col">Version</th>
              </tr>
            </thead>
            <tbody>
              {contentRegistry.map((entry) => (
                <tr key={entry.id}>
                  <th scope="row">
                    <Link to={entry.route}>{entry.title}</Link>
                    <span className="registry-table__id">{entry.id}</span>
                  </th>
                  <td>{entry.module}</td>
                  <td>{entry.source.location ?? entry.source.document}</td>
                  <td>
                    <span className={`tag ${statusTag[entry.entryStatus]}`}>
                      {statusLabel[entry.entryStatus]}
                    </span>
                  </td>
                  <td>{entry.review.reviewedBy ?? '—'}</td>
                  <td>{entry.review.reviewedDate ?? '—'}</td>
                  <td>{entry.contentVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="prose-section">
        <h2>How content is maintained</h2>
        <p>
          Clinical guidance is not written into React components. Each block
          lives in <code>src/content/</code> as typed data with its own source
          reference, version and review metadata, so it can be reviewed and
          updated without touching the interface — and served unchanged by the
          FastAPI backend when that lands.
        </p>
        <p>
          Where the source summary does not answer a question, the tool says so.
          It does not fill the gap with an assumption.
        </p>
      </section>
    </PageContainer>
  );
}
