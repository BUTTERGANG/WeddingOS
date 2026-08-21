import type { Request, Response, NextFunction } from "express";

/**
 * Wraps an async route handler so thrown errors are forwarded to express error handler.
 * No more try/catch boilerplate in every route.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}