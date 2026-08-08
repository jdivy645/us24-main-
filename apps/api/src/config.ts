import { resolve } from 'node:path';

/**
 * Runtime configuration.
 *
 * 11 §18 / 14: no AI, storage, RingCentral or database credential ever reaches
 * the browser. Nothing here is exposed through an API response.
 */
export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly databasePath: string;
  /** Stands in for private S3-compatible object storage (12 §1). Gitignored. */
  readonly storageRoot: string;
  readonly corsOrigins: readonly string[];
  readonly maxUploadBytes: number;
  /**
   * 09 §12: a client-approved exception needs a configured approval authority.
   * 17 §18 lists that authority as pending, so it is false until the client
   * supplies one — bypasses under that reason therefore still force review.
   */
  readonly hasConfiguredExceptionAuthority: boolean;
  /** Operational label only. 09 §14 forbids treating it as authentication. */
  readonly operatorLabel: string;
  readonly environmentLabel: string;
}

const root = resolve(process.cwd());

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: Number(process.env['PORT'] ?? 3001),
    host: process.env['HOST'] ?? '127.0.0.1',
    databasePath: process.env['DATABASE_PATH'] ?? resolve(root, '.private-storage/us24.db'),
    storageRoot: process.env['STORAGE_ROOT'] ?? resolve(root, '.private-storage/artifacts'),
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:5173').split(','),
    maxUploadBytes: Number(process.env['MAX_UPLOAD_BYTES'] ?? 200 * 1024 * 1024),
    hasConfiguredExceptionAuthority: process.env['EXCEPTION_AUTHORITY_CONFIGURED'] === 'true',
    operatorLabel: process.env['OPERATOR_LABEL'] ?? 'Workstation (unauthenticated)',
    environmentLabel: process.env['ENVIRONMENT_LABEL'] ?? 'Local development',
    ...overrides,
  };
}
