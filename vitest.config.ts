import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/**
 * Workspace test projects — 15 §2 test layers.
 *
 * `domain` covers pure unit, normalization, rule-engine and golden-case tests.
 * `api` covers contract and repository tests. `web` covers component tests.
 * Browser E2E and accessibility flows live in `e2e/` under Playwright.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@us24/domain': r('./packages/domain/src/index.ts'),
      '@us24/schemas': r('./packages/schemas/src/index.ts'),
      '@us24/testing': r('./packages/testing/src/index.ts'),
      '@us24/ui': r('./packages/ui/src/index.ts'),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@us24/domain': r('./packages/domain/src/index.ts'),
            '@us24/schemas': r('./packages/schemas/src/index.ts'),
            '@us24/testing': r('./packages/testing/src/index.ts'),
          },
        },
        test: {
          name: 'domain',
          root: r('./packages/domain'),
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@us24/domain': r('./packages/domain/src/index.ts'),
            '@us24/schemas': r('./packages/schemas/src/index.ts'),
            '@us24/testing': r('./packages/testing/src/index.ts'),
          },
        },
        test: {
          name: 'schemas',
          root: r('./packages/schemas'),
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@us24/domain': r('./packages/domain/src/index.ts'),
            '@us24/schemas': r('./packages/schemas/src/index.ts'),
            '@us24/testing': r('./packages/testing/src/index.ts'),
          },
        },
        test: {
          name: 'api',
          root: r('./apps/api'),
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@us24/domain': r('./packages/domain/src/index.ts'),
            '@us24/schemas': r('./packages/schemas/src/index.ts'),
            '@us24/testing': r('./packages/testing/src/index.ts'),
            '@us24/ui': r('./packages/ui/src/index.ts'),
          },
        },
        test: {
          name: 'web',
          root: r('./apps/web'),
          environment: 'jsdom',
          globals: true,
          setupFiles: [r('./apps/web/src/test/setup.ts')],
          include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
        },
      },
    ],
  },
});
