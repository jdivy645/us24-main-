/**
 * Domain errors with stable machine codes — 12 §3, 11 §16.
 *
 * 11 §16: "Do not expose stack traces, SQL, object keys, provider secrets, or
 * transcript content in generic errors." `toResponse` is the only path an error
 * takes to the client, and it emits exactly four fields.
 */

import type { ErrorCode } from '@us24/schemas';

export class ApiProblem extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly statusCode: number,
    override readonly message: string,
    readonly details?: readonly { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiProblem';
  }

  toResponse(correlationId: string): {
    code: string;
    message: string;
    correlationId: string;
    details?: readonly { path: string; message: string }[];
  } {
    return {
      code: this.code,
      message: this.message,
      correlationId,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export const notFound = (code: ErrorCode, message: string): ApiProblem =>
  new ApiProblem(code, 404, message);

export const badRequest = (
  code: ErrorCode,
  message: string,
  details?: readonly { path: string; message: string }[],
): ApiProblem => new ApiProblem(code, 400, message, details);

export const conflict = (code: ErrorCode, message: string): ApiProblem =>
  new ApiProblem(code, 409, message);

export const unprocessable = (code: ErrorCode, message: string): ApiProblem =>
  new ApiProblem(code, 422, message);
