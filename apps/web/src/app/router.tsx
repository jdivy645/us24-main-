/**
 * Route map — 03 §2, exactly the fifteen routes the spec enumerates.
 *
 * 05 §18 (the no-blank-state rule): every route below renders populated content,
 * an explained empty state, or a skeleton that preserves the final structure.
 * None renders a blank panel.
 */

import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell, NotFoundRoute, RouteErrorBoundary } from './shell.js';
import { NewVerificationRoute } from '../routes/new-verification.js';
import { SetupRoute } from '../routes/setup.js';
import { ProcessingRoute } from '../routes/processing.js';
import { WorkspaceRoute } from '../routes/workspace.js';
import { ReviewRoute } from '../routes/review.js';
import { RecordsRoute } from '../routes/records.js';
import { RecordDetailRoute, HistoricalVersionRoute } from '../routes/record-detail.js';
import { ReviewQueueRoute } from '../routes/review-queue.js';
import { CarriersRoute, CarrierDetailRoute } from '../routes/carriers.js';
import { TemplatesRoute } from '../routes/templates.js';
import { SystemRoute } from '../routes/system.js';
import { HelpRoute } from '../routes/help.js';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // 03 §2: "`/` redirects to `/verifications/new`" because it is the
      // highest-frequency task (03 §1).
      { index: true, element: <Navigate to="/verifications/new" replace /> },

      { path: 'verifications/new', element: <NewVerificationRoute /> },
      { path: 'verifications/:caseId/setup', element: <SetupRoute /> },
      { path: 'verifications/:caseId/processing', element: <ProcessingRoute /> },
      { path: 'verifications/:caseId/workspace', element: <WorkspaceRoute /> },
      { path: 'verifications/:caseId/review', element: <ReviewRoute /> },

      { path: 'records', element: <RecordsRoute /> },
      { path: 'records/:recordId', element: <RecordDetailRoute /> },
      { path: 'records/:recordId/versions/:versionId', element: <HistoricalVersionRoute /> },

      { path: 'review', element: <ReviewQueueRoute /> },

      { path: 'carriers', element: <CarriersRoute /> },
      { path: 'carriers/:carrierId', element: <CarrierDetailRoute /> },

      { path: 'templates', element: <TemplatesRoute /> },
      { path: 'system', element: <SystemRoute /> },
      { path: 'help', element: <HelpRoute /> },

      // 05 §18: an unknown route explains itself and offers safe navigation.
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
