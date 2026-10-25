import { describe, expect, it } from "vitest";
import { getAllowedOrigins, getRateLimitConfig, validateConfig } from "./config";

describe("validateConfig", () => {
  it("throws when AVIATIONSTACK_API_KEY is missing or empty", () => {
    expect(() => validateConfig({})).toThrow(
      "AVIATIONSTACK_API_KEY environment variable is required",
    );
    expect(() => validateConfig({ AVIATIONSTACK_API_KEY: "" })).toThrow(
      "AVIATIONSTACK_API_KEY environment variable is required",
    );
    expect(() => validateConfig({ AVIATIONSTACK_API_KEY: "   " })).toThrow(
      "AVIATIONSTACK_API_KEY environment variable is required",
    );
  });

  it("returns config when AVIATIONSTACK_API_KEY is present", () => {
    const config = validateConfig({ AVIATIONSTACK_API_KEY: "test_key_123" });
    expect(config.apiKey).toBe("test_key_123");
    expect(config.port).toBe(3000);
  });

  it("parses custom PORT", () => {
    const config = validateConfig({
      AVIATIONSTACK_API_KEY: "test_key_123",
      PORT: "8080",
    });
    expect(config.port).toBe(8080);
  });

  it("throws when PORT is invalid", () => {
    expect(() =>
      validateConfig({
        AVIATIONSTACK_API_KEY: "test_key_123",
        PORT: "not-a-port",
      }),
    ).toThrow("Invalid PORT configuration");
  });
});

describe("getAllowedOrigins", () => {
  it("includes default local origins", () => {
    const origins = getAllowedOrigins({});
    expect(origins).toContain("http://localhost:5173");
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("http://127.0.0.1:5173");
  });

  it("merges ALLOWED_ORIGINS and FRONTEND_URL cleanly without trailing slashes", () => {
    const origins = getAllowedOrigins({
      ALLOWED_ORIGINS: "https://app.flightdetective.com/, https://preview.example.com",
      FRONTEND_URL: "https://d12345.cloudfront.net/",
    });
    expect(origins).toContain("https://app.flightdetective.com");
    expect(origins).toContain("https://preview.example.com");
    expect(origins).toContain("https://d12345.cloudfront.net");
    expect(origins).toContain("http://localhost:5173");
  });
});

describe("getRateLimitConfig", () => {
  it("returns default values when environment is unset", () => {
    const config = getRateLimitConfig({});
    expect(config.windowMs).toBe(60000);
    expect(config.max).toBe(30);
  });

  it("parses custom environment values", () => {
    const config = getRateLimitConfig({
      RATE_LIMIT_WINDOW_MS: "30000",
      RATE_LIMIT_MAX: "15",
    });
    expect(config.windowMs).toBe(30000);
    expect(config.max).toBe(15);
  });
});
