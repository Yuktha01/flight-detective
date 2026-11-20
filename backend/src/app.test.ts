import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { errorHandler } from "./app";

const TEST_API_KEY = "live-aviationstack-secret-key-xyz98765";

describe("Global Error Handler Log Sanitization and Response", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.AVIATIONSTACK_API_KEY;
    process.env.AVIATIONSTACK_API_KEY = TEST_API_KEY;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.AVIATIONSTACK_API_KEY = originalApiKey;
    consoleErrorSpy.mockRestore();
  });

  it("proves an error containing the exact API key does not expose it in logs", async () => {
    const testApp = express();
    testApp.get("/error-with-key", () => {
      throw new Error(`Failed to authenticate with key: ${TEST_API_KEY}`);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get("/error-with-key");

    // 1. Exact key must NOT appear anywhere in the console error log
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).not.toContain(TEST_API_KEY);
    expect(loggedMessage).toContain("Unhandled server error [Error]: Failed to authenticate with key: [REDACTED]");

    // 2. Client response must remain generic HTTP 500 without internal error details
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal server error occurred.",
      },
    });
  });

  it("proves an error containing a secret-bearing URL does not expose the key", async () => {
    const testApp = express();
    testApp.get("/error-with-url", () => {
      throw new Error(
        `Upstream connection aborted: https://api.aviationstack.com/v1/flights?access_key=${TEST_API_KEY}&limit=1`,
      );
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get("/error-with-url");

    // 1. Secret key must NOT appear in logs, access_key is replaced with [REDACTED], but host URL is preserved
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).not.toContain(TEST_API_KEY);
    expect(loggedMessage).toContain("https://api.aviationstack.com/v1/flights?access_key=[REDACTED]&limit=1");

    // 2. Client response must remain generic HTTP 500 without internal error details
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal server error occurred.",
      },
    });
  });

  it("proves an error containing both a secret-bearing URL and standalone API key redacts both and returns generic 500", async () => {
    const testApp = express();
    testApp.get("/error-with-both", () => {
      throw new Error(
        `Failed to reach https://api.aviationstack.com/v1/flights?access_key=${TEST_API_KEY} using key ${TEST_API_KEY}`,
      );
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get("/error-with-both");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).not.toContain(TEST_API_KEY);
    expect(loggedMessage).toContain("https://api.aviationstack.com/v1/flights?access_key=[REDACTED] using key [REDACTED]");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal server error occurred.",
      },
    });
  });
});

