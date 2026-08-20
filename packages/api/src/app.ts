import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pino from "pino";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routes } from "./routes/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
});

export const app = express();

// Trust proxy for correct IP behind reverse proxy
app.set("trust proxy", 1);

// Pino HTTP request logging
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => (req.url ?? "").startsWith("/static"),
    },
  }),
);

// JSON body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// CORS — only in development, allow the Vite dev server
if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
}

// Static file serving — in production, serve the built SPA
if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(__dirname, "..", "..", "app", "dist", "public");
  app.use(express.static(publicDir));
}

// Mount all API routes
app.use(routes);

// SPA fallback — serve index.html for non-API routes (production only)
if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(__dirname, "..", "..", "app", "dist", "public");
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode =
    (err as any).statusCode || (err as any).status || 500;
  const name =
    statusCode === 500 ? "InternalServerError" : err.name || "Error";

  logger.error({ err, statusCode }, err.message);

  res.status(statusCode).json({
    error: {
      name,
      message:
        statusCode >= 500
          ? "An unexpected error occurred. Please try again later."
          : err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});