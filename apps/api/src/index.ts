import { buildApp } from './app.js';

/**
 * Server entry point.
 *
 * 12 §18: API instances run separately from worker instances. In this build the
 * in-process job runner shares the API process (ADR-013); splitting them is a
 * deployment change, not a code change, because everything goes through
 * `JobRunner`.
 */
const { app, config } = await buildApp();

try {
  await app.listen({ port: config.port, host: config.host });
   
  console.log(`US24 API listening on http://${config.host}:${config.port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
