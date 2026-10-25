export interface AppConfig {
  apiKey: string;
  port: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export function validateConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const apiKey = env.AVIATIONSTACK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AVIATIONSTACK_API_KEY environment variable is required and must not be empty.",
    );
  }

  const rawPort = env.PORT?.trim();
  const port = rawPort ? Number(rawPort) : 3000;

  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT configuration: "${env.PORT}". Must be a number between 1 and 65535.`);
  }

  return { apiKey, port };
}

export function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const defaultOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
  ];

  const envOrigins = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const frontendUrl = env.FRONTEND_URL?.trim();
  if (frontendUrl && !envOrigins.includes(frontendUrl)) {
    envOrigins.push(frontendUrl);
  }

  const combined = Array.from(new Set([...defaultOrigins, ...envOrigins])).map((origin) =>
    origin.replace(/\/+$/, ""),
  );

  return combined;
}

export function getRateLimitConfig(env: NodeJS.ProcessEnv = process.env): RateLimitConfig {
  const rawWindow = env.RATE_LIMIT_WINDOW_MS?.trim();
  const windowMs = rawWindow ? Number(rawWindow) : 60 * 1000; // 1 minute default

  const rawMax = env.RATE_LIMIT_MAX?.trim();
  const max = rawMax ? Number(rawMax) : 30; // 30 requests default

  return {
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60 * 1000,
    max: Number.isFinite(max) && max > 0 ? max : 30,
  };
}
