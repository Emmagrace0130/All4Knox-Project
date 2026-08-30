import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface PageContainerProps {
  title: string;
  lede?: string;
  /** Eyebrow above the title, e.g. "Clinical Decision Support". */
  eyebrow?: string;
  /** Narrower measure for reading-heavy pages. */
  width?: 'default' | 'reading';
  /** Back link shown above the title. */
  backTo?: { to: string; label: string };
  children: ReactNode;
}

export function PageContainer({
  title,
  lede,
  eyebrow,
  width = 'default',
  backTo,
  children,
}: PageContainerProps) {
  return (
    <main id="main" className={`page page--${width}`}>
      <div className="page__inner">
        {backTo ? (
          <Link to={backTo.to} className="page__back print-hide">
            <span aria-hidden="true">←</span> {backTo.label}
          </Link>
        ) : null}
        <header className="page__header">
          {eyebrow ? <p className="page__eyebrow">{eyebrow}</p> : null}
          <h1 className="page__title">{title}</h1>
          {lede ? <p className="page__lede">{lede}</p> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
