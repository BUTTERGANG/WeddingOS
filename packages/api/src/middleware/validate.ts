import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

type SchemaMap = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
};

/**
 * Middleware that validates request body/query/params against a Zod schema.
 * Returns 400 with a structured error if validation fails.
 * 
 * Usage:
 *   router.post("/", validate({ body: registerSchema }), handler);
 *   router.get("/", validate({ query: paginationSchema }), handler);
 */
export function validate(schemas: SchemaMap) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Invalid request data",
            details: err.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
        });
      }
      next(err);
    }
  };
}

// ── Shared schemas ────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const clientIdParamSchema = z.object({
  clientId: z.coerce.number().int().positive(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});