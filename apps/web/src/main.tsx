import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import '@us24/ui';
import './app/app.css';
import { AnnouncerProvider } from './app/announcer.js';
import { router } from './app/router.js';

/**
 * 11 §6: "TanStack Query owns server state."
 * 11 §6 also forbids persisting PHI-bearing caches to localStorage — this client
 * is in-memory only, with no persister configured. Nothing in this application
 * writes case, transcript or patient data to browser storage (11 §18).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </QueryClientProvider>
  </StrictMode>,
);
