import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import logoLockup from '../../imgs/all4knox_logo_lockup.png';
import { AccountMenu } from './AccountMenu';
import { Navigation } from './Navigation';

export function Header() {
  const ref = useRef<HTMLElement>(null);

  /*
   * Publish the header's real height as --header-h. Everything else that is
   * sticky (tool result panel, review queue, interview progress bar) offsets
   * from it. Those offsets used to be hard-coded and silently went stale when
   * the nav grew onto a second row: the progress bar slid completely under
   * the header. The height changes with width and nav wrapping, so it is
   * measured rather than written down.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--header-h', `${el.offsetHeight}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--header-h');
    };
  }, []);

  return (
    <header className="site-header" ref={ref}>
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="All4Knox toolkit home">
          {/*
            The lockup is the supplied logo minus its "A joint City of
            Knoxville/Knox County initiative" line, which is illegible at
            header height. The full wording is set as text in the footer.
          */}
          <img
            className="brand__logo"
            src={logoLockup}
            alt="All4Knox"
            width={340}
            height={205}
          />
          <span className="brand__divider" aria-hidden="true" />
          <span className="brand__tagline">Clinical Buprenorphine Toolkit</span>
        </Link>
        <Navigation />
        <AccountMenu />
      </div>
    </header>
  );
}
