export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: string[];

  constructor(code: string, message: string, httpStatus: number, details?: string[]) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: string[]) {
    super('VALIDATION_ERROR', message, 400, details);
    if (details) {
      this.message = `${message}: ${details.join(', ')}`;
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_REQUIRED', message, 401);
  }
}

export class AuthInvalidError extends AppError {
  constructor(message = 'Authentication failed') {
    super('AUTHENTICATION_INVALID', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super('CONFLICT', message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super('RATE_LIMITED', message, 429);
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 400);
  }
}
