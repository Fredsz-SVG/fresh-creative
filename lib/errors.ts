// ============================================
// ERROR HANDLING SYSTEM
// ============================================

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, details)
    this.name = 'DatabaseError'
  }
}

// Error handler utility
export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      details: null,
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    details: null,
  }
}
