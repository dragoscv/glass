import type { MCPError } from './types';
import { ErrorCode } from './types';

export class GlassMCPError extends Error implements MCPError {
  public readonly code: ErrorCode;
  public readonly details: Record<string, unknown> | undefined;
  public readonly statusCode: number | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'GlassMCPError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ('captureStackTrace' in Error) {
      (Error as typeof Error & { captureStackTrace: (thisArg: object, func: Function) => void }).captureStackTrace(this, GlassMCPError);
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      stack: this.stack,
    };
  }

  public static isGlassMCPError(error: unknown): error is GlassMCPError {
    return error instanceof GlassMCPError;
  }

  public static fromUnknown(error: unknown, code?: ErrorCode): GlassMCPError {
    if (GlassMCPError.isGlassMCPError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new GlassMCPError(
        code ?? ErrorCode.INTERNAL_ERROR,
        error.message,
        { originalError: error.name }
      );
    }

    return new GlassMCPError(
      code ?? ErrorCode.INTERNAL_ERROR,
      String(error),
      { originalValue: error }
    );
  }
}
