import { useMemo, useState } from 'react';
import { Button } from '../components/common/Button';
import { CheckboxGroup } from '../components/forms/CheckboxGroup';
import { RadioGroup } from '../components/forms/RadioGroup';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { SourceBadge } from '../components/toolkit/SourceBadge';
import { coverageOptions } from '../content/prescribing';
import {
  DIRECTORY_NOT_EXHAUSTIVE,
  needOptions,
  regionOptions,
} from '../content/referrals';
import { CONTENT_REVIEW, CONTENT_VERSION } from '../content/version';
import { emptyFilters, searchReferrals } from '../services/referralSearch';
import type {
  Coverage,
  ReferralFilters,
  ReferralNeed,
  ReferralOrganization,
  ReferralRegion,
} from '../types/clinical';

const unverified = <span className="unverified">Not yet verified</span>;

const yesNo = (value: boolean | null) =>
  value === null ? unverified : value ? 'Yes' : 'No';

function OrganizationCard({
  organization,
  uncertain,
  unverifiedAgainst,
}: {
  organization: ReferralOrganization;
  uncertain: boolean;
  unverifiedAgainst: string[];
}) {
  const org = organization;
  return (
    <li className="org-card">
      <header className="org-card__header">
        <h3 className="org-card__name">{org.name}</h3>
        {uncertain ? (
          <span className="tag tag--warn">
            Unconfirmed match — {unverifiedAgainst.join(', ')} not verified
          </span>
        ) : null}
      </header>

      {org.notes ? <p className="org-card__notes">{org.notes}</p> : null}

      <dl className="org-card__fields">
        <div>
          <dt>Phone</dt>
          <dd>{org.phone ?? unverified}</dd>
        </div>
        <div>
          <dt>Website</dt>
          <dd>
            {org.website ? (
              <a href={org.website} target="_blank" rel="noreferrer">
                {org.website}
              </a>
            ) : (
              unverified
            )}
          </dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{org.address ?? unverified}</dd>
        </div>
        <div>
          <dt>County</dt>
          <dd>{org.county ?? unverified}</dd>
        </div>
        <div>
          <dt>Accepts TennCare</dt>
          <dd>{yesNo(org.acceptsTenncare)}</dd>
        </div>
        <div>
          <dt>Accepts private</dt>
          <dd>{yesNo(org.acceptsPrivate)}</dd>
        </div>
        <div>
          <dt>Grant funded</dt>
          <dd>{yesNo(org.grantFunded)}</dd>
        </div>
        <div>
          <dt>MAT available</dt>
          <dd>{yesNo(org.matAvailable)}</dd>
        </div>
        <div>
          <dt>Detox available</dt>
          <dd>{yesNo(org.detoxAvailable)}</dd>
        </div>
        <div>
          <dt>Last verified</dt>
          <dd>{org.lastVerified ?? unverified}</dd>
        </div>
      </dl>
    </li>
  );
}

/** Referral directory — skeleton §11. Route: /referrals */
export function ReferralDirectory() {
  const [filters, setFilters] = useState<ReferralFilters>(emptyFilters);

  const matches = useMemo(() => searchReferrals(filters), [filters]);

  const toggleNeed = (need: ReferralNeed) =>
    setFilters((prev) => ({
      ...prev,
      needs: prev.needs.includes(need)
        ? prev.needs.filter((n) => n !== need)
        : [...prev.needs, need],
    }));

  const hasFilters =
    filters.region !== null ||
    filters.coverage !== null ||
    filters.needs.length > 0;

  return (
    <PageContainer
      title="Referrals & Higher Level of Care"
      lede="Tennessee and Knoxville-area specialty, inpatient and grant-funded options referenced in the All4Knox clinical summary."
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <ClinicalAlert tone="pending" title="Contact details are not yet verified">
        <p>
          The All4Knox clinical summary names these organisations and what they
          offer, but contains no addresses, phone numbers, websites or payer
          acceptance. Those fields show as <em>not yet verified</em> rather than
          being filled in from another source — confirm them directly with the
          organisation before referring a patient.
        </p>
        <p>{DIRECTORY_NOT_EXHAUSTIVE}</p>
      </ClinicalAlert>

      <div className="tool-layout">
        <div className="tool-layout__steps print-hide">
          <section className="filter-panel">
            <h2 className="section-heading">Filters</h2>
            <RadioGroup
              name="region"
              legend="Location"
              options={regionOptions}
              value={filters.region}
              onChange={(region: ReferralRegion) =>
                setFilters((prev) => ({ ...prev, region }))
              }
              layout="column"
            />
            <RadioGroup
              name="coverage"
              legend="Patient coverage"
              options={coverageOptions}
              value={filters.coverage}
              onChange={(coverage: Coverage) =>
                setFilters((prev) => ({ ...prev, coverage }))
              }
              layout="column"
            />
            <CheckboxGroup
              name="needs"
              legend="Need"
              options={needOptions}
              selected={filters.needs}
              onToggle={toggleNeed}
              layout="column"
            />
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(emptyFilters())}
              >
                Clear filters
              </Button>
            ) : null}
          </section>
        </div>

        <div className="tool-layout__result">
          <p className="result-count">
            {matches.length} organisation{matches.length === 1 ? '' : 's'}
          </p>
          {matches.length === 0 ? (
            <p className="placeholder">
              No entry in the current directory matches these filters. That is a
              gap in the directory, not evidence that no such service exists.
            </p>
          ) : (
            <ul className="org-list">
              {matches.map((match) => (
                <OrganizationCard
                  key={match.organization.id}
                  organization={match.organization}
                  uncertain={match.uncertain}
                  unverifiedAgainst={match.unverifiedAgainst}
                />
              ))}
            </ul>
          )}
          <SourceBadge
            source={{
              document: 'All4Knox Clinical Summary 2026',
              location: 'Referral / higher level of care',
            }}
            review={CONTENT_REVIEW}
            contentVersion={CONTENT_VERSION}
          />
        </div>
      </div>
    </PageContainer>
  );
}
