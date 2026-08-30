import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ProgressBar } from './ProgressBar';

interface InterviewShellProps {
  /** Tool name shown beside the progress bar. */
  toolName: string;
  current: number;
  total: number;
  children: ReactNode;
}

/** Centred interview column with its progress bar and an exit back to the toolkit. */
export function InterviewShell({
  toolName,
  current,
  total,
  children,
}: InterviewShellProps) {
  return (
    <main id="main" className="interview">
      <ProgressBar current={current} total={total} label={toolName} />
      <div className="interview__inner">{children}</div>
      <p className="interview__exit print-hide">
        <Link to="/">Exit to toolkit</Link>
      </p>
    </main>
  );
}
