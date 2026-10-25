import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled Application Error:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    } as ApiErrorResponse);
    return;
  }

  const statusCode = (err as { status?: number }).status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
  } as ApiErrorResponse);
}
