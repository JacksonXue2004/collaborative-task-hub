// Custom business-error classes. Centralizing error types allows the REST layer
// and Server Actions to map errors to proper HTTP status codes and end-user
// messages without exposing internal stack traces.
export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DATABASE';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: insufficient permissions') {
    super('FORBIDDEN', 403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input') {
    super('VALIDATION', 400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict — optimistic lock version mismatch') {
    super('CONFLICT', 409, message);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super('DATABASE', 500, message);
  }
}
