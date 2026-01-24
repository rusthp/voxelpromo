/**
 * Base Application Error Class
 *
 * All custom errors should extend this class.
 * Provides consistent error handling with:
 * - HTTP status codes
 * - Operational vs programming error classification
 * - Machine-readable error codes
 * - Additional context for debugging
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      isOperational?: boolean;
      errorCode?: string;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message);

    // Maintain proper stack trace (only available in V8 engines like Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.isOperational = options.isOperational ?? true;
    this.errorCode = options.errorCode || 'INTERNAL_ERROR';
    this.context = options.context;
    this.timestamp = new Date();

    // Make the error enumerable for JSON serialization
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Serialize error to JSON format
   * Safe for sending to clients (excludes stack in production)
   */
  toJSON(): Record<string, any> {
    const error: Record<string, any> = {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      timestamp: this.timestamp.toISOString(),
    };

    // Include context if available
    if (this.context) {
      error.context = this.context;
    }

    // Include stack trace only in development
    if (process.env.NODE_ENV !== 'production') {
      error.stack = this.stack;
    }

    return error;
  }

  /**
   * Check if an error is an AppError instance
   */
  static isAppError(error: any): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Check if an error is operational (expected)
   */
  static isOperationalError(error: any): boolean {
    if (AppError.isAppError(error)) {
      return error.isOperational;
    }
    return false;
  }
}
