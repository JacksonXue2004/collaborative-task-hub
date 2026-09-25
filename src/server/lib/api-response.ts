// Unified API response helpers. Route Handlers use these to serialize results
// and to map AppError into safe end-user JSON responses. Server Actions use a
// different ActionState shape (see types.ts) because they must integrate with
// useActionState on the client.

import { NextResponse } from 'next/server';
import { AppError } from './errors';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      error: { code: err.code, message: err.message },
    };
    return NextResponse.json(body, { status: err.httpStatus });
  }
  // Never leak stack traces to the client. Log internally and return 500 generic.
  console.error('[Unhandled API error]', err);
  return NextResponse.json<ApiErrorResponse>(
    { error: { code: 'INTERNAL', message: 'Internal server error' } },
    { status: 500 },
  );
}
