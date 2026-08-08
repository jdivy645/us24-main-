/**
 * Global app shell — 05 §1, 03 §1.
 *
 * 05 §1: "The no-login requirement means there is no profile menu; an optional
 * workstation or operator label is shown as operational metadata."
 * 03 §1: "Do not show account, profile, sign-in, or sign-out controls in
 * version one." Neither exists anywhere in this component.
 */

import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useRouteError, isRouteErrorResponse } from 'react-router';
import { Banner, Button, LiveRegion } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { useAnnouncer } from './announcer.js';

const NAV = [
  { to: '/verifications/new', label: 'New verification', icon: '＋' },
  { to: '/records', label: 'Records', icon: '▤' },
  { to: '/review', label: 'Review queue', icon: '!' },
  { to: '/carriers', label: 'Carrier master', icon: '◈' },
  { to: '/templates', label: 'Templates', icon: '▭' },
  { to: '/system', label: 'System', icon: '⚙' },
  { to: '/help', label: 'Help', icon: '?' },
] as const;

export function AppShell(): React.JSX.Element {
  const { message } = useAnnouncer();

  // 03 §1: "Show processing and review counts beside relevant navigation items."
  const { data: cases } = useQuery({
    queryKey: queryKeys.cases('all'),
    queryFn: () => api.listCases(),
    staleTime: 15_000,
  });

  const reviewCount =
    cases?.items.filter((c) => c.case_status === 'NEEDS_REVIEW' || c.case_status === 'FAILED')
      .length ?? 0;
  const processingCount =
    cases?.items.filter(
      (c) => c.workflow_state === 'PROCESSING' || c.workflow_state === 'PROCESSING_FAILED',
    ).length ?? 0;

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="topbar">
        <div className="topbar__brand">
          <span className="wordmark">
            US24 <span>Solutions</span>
          </span>
          <span className="topbar__product">Verification of Benefits</span>
        </div>
        <div className="topbar__meta">
          <span className="chip" title="Deployment environment">
            Local development
          </span>
          <span className="chip" title="System health">
            <span aria-hidden="true" className="health-dot" /> Systems nominal
          </span>
          {/*
            09 §14: operational metadata, explicitly not authentication.
            There is deliberately no profile or sign-out control (03 §1).
          */}
          <span className="chip" title="Operational label only — not authentication">
            Workstation (unauthenticated)
          </span>
        </div>
      </header>

      <div className="shell__body">
        <nav className="rail" aria-label="Primary">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `rail__link${isActive ? ' rail__link--active' : ''}`}
                >
                  <span className="rail__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.to === '/review' && reviewCount > 0 && (
                    <span className="rail__count tnum" aria-label={`${reviewCount} unresolved`}>
                      {reviewCount}
                    </span>
                  )}
                  {item.to === '/records' && processingCount > 0 && (
                    <span className="rail__count tnum" aria-label={`${processingCount} processing`}>
                      {processingCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* 05 §1: a global announcement region for uploads, processing and saves. */}
      <LiveRegion message={message} />
    </div>
  );
}

/**
 * Route error boundary — 11 §16 and 05 §18.
 *
 * "API failure shows retry, correlation ID, and safe navigation."
 * "Unknown route shows navigation back to New Verification and Records."
 */
export function RouteErrorBoundary(): React.JSX.Element {
  const error = useRouteError();

  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const message =
    error instanceof Error ? error.message : 'Something went wrong loading this page.';
  const correlationId =
    error && typeof error === 'object' && 'correlationId' in error
      ? String((error as { correlationId: unknown }).correlationId)
      : null;

  return (
    <div className="page">
      <h1 className="page__title">{is404 ? 'Page not found' : 'This page could not load'}</h1>
      <Banner tone="danger" title={is404 ? 'Unknown route.' : 'Request failed.'}>
        {is404
          ? 'The address you followed does not match a page in this application.'
          : message}
        {correlationId && (
          <>
            {' '}
            Quote correlation ID <strong className="tnum">{correlationId}</strong> if you contact
            support.
          </>
        )}
      </Banner>
      <div className="row" style={{ marginTop: 'var(--space-4)' }}>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/verifications/new')}>
          Go to New verification
        </Button>
        <Button variant="neutral" onClick={() => (window.location.href = '/records')}>
          Go to Records
        </Button>
      </div>
    </div>
  );
}

/**
 * Unknown route — 05 §18: "Unknown route shows navigation back to New
 * Verification and Records."
 *
 * Separate from `RouteErrorBoundary` because an unmatched path is not a thrown
 * error: rendering the boundary directly would leave `useRouteError()` empty and
 * report a load failure instead of a missing page.
 */
export function NotFoundRoute(): React.JSX.Element {
  return (
    <div className="page">
      <h1 className="page__title">Page not found</h1>
      <Banner tone="danger" title="Unknown route.">
        The address you followed does not match a page in this application.
      </Banner>
      <div className="row" style={{ marginTop: 'var(--space-4)' }}>
        <Link className="btn btn--primary" to="/verifications/new">
          Go to New verification
        </Link>
        <Link className="btn btn--secondary" to="/records">
          Go to Records
        </Link>
      </div>
    </div>
  );
}

/**
 * 05 §18: "Skeletons preserve the final structure rather than displaying a blank
 * white panel." Every route falls back to this rather than an empty screen.
 */
export function RouteSkeleton({ title }: { title: string }): React.JSX.Element {
  return (
    <div className="page" aria-busy="true">
      <h1 className="page__title">{title}</h1>
      <p className="meta">Loading…</p>
      <div className="stack stack--3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card" style={{ minHeight: 88 }}>
            <div className="skeleton skeleton--title" />
            <div className="skeleton" />
            <div className="skeleton skeleton--short" />
          </div>
        ))}
      </div>
    </div>
  );
}
