import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/**
 * 11 §2: Vite rather than Create React App, which is no longer the recommended
 * starting point. 11 §18: "Avoid public CDN scripts" — every dependency is
 * bundled, nothing is fetched from a third-party origin at runtime.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@us24/domain': r('../../packages/domain/src/index.ts'),
      '@us24/schemas': r('../../packages/schemas/src/index.ts'),
      '@us24/ui': r('../../packages/ui/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: { '/v1': { target: 'http://127.0.0.1:3001', changeOrigin: true } },
  },
  build: {
    // Stays at apps/web/dist so `vite preview` works. The deploy gets a copy at
    // the repository root via scripts/stage-web-output.mjs — see vercel.json.
    sourcemap: true,
    rollupOptions: {
      output: {
        // 11 §17: split the framework away from application code so a route
        // change does not invalidate the largest cached chunk.
        manualChunks: (id) =>
          id.includes('node_modules/react') || id.includes('node_modules/scheduler')
            ? 'vendor'
            : undefined,
      },
    },
  },
});
