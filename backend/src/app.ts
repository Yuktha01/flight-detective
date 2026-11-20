import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { getAllowedOrigins, getRateLimitConfig } from "./config";
import flightRoutes from "./routes/flightRoutes";
import { sanitizeLog } from "./utils/sanitize";

const app = express();
// Express trust proxy is disabled so rate limiting uses the adapter's trusted socket remote address (sourceIp),
// ignoring caller-controlled X-Forwarded-For headers.
app.set("trust proxy", false);

export class CorsForbiddenError extends Error {
  constructor(message = "Cross-origin request not allowed.") {
    super(message);
    this.name = "CorsForbiddenError";
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. server-to-server, curl, health probes, Supertest)
      if (!origin) {
        return callback(null, true);
      }
      const allowedOrigins = getAllowedOrigins(process.env);
      const normalizedOrigin = origin.trim().replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new CorsForbiddenError(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(express.json());

// Health check endpoint (kept strictly outside the rate limiter)
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Flight Detective backend is running",
  });
});

// Flight route rate limiter (configurable via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX)
const rateLimitConfig = getRateLimitConfig(process.env);
export const flightRateLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  limit: rateLimitConfig.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many flight searches. Please wait a moment and try again.",
      },
    });
  },
});

app.use("/api/flights", flightRateLimiter, flightRoutes);

// Custom error middleware ensuring all errors (including CORS rejection) return clean JSON
const errorHandler: express.ErrorRequestHandler = (
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) => {
  if (
    err instanceof CorsForbiddenError ||
    (err instanceof Error &&
      (err.name === "CorsForbiddenError" || err.message.includes("not allowed by CORS")))
  ) {
    res.status(403).json({
      error: {
        code: "CORS_FORBIDDEN",
        message: "Cross-origin request not allowed.",
      },
    });
    return;
  }

  const errorName = err instanceof Error ? err.name : "UnknownError";
  const sanitizedMessage = sanitizeLog(err);

  console.error(`Unhandled server error [${errorName}]: ${sanitizedMessage}`);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An internal server error occurred.",
    },
  });
};

app.use(errorHandler);

export { app, errorHandler };
export default app;
