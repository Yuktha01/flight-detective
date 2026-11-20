import { describe, expect, it } from "vitest";
import { sanitizeLog } from "./sanitize";

describe("sanitizeLog", () => {
  it("redacts access_key from query parameter strings", () => {
    const input = "https://api.aviationstack.com/v1/flights?access_key=secret_12345&limit=1";
    const output = sanitizeLog(input);
    expect(output).not.toContain("secret_12345");
    expect(output).toBe("https://api.aviationstack.com/v1/flights?access_key=[REDACTED]&limit=1");
  });

  it("scrubs the raw AVIATIONSTACK_API_KEY from arbitrary text if present", () => {
    const original = process.env.AVIATIONSTACK_API_KEY;
    try {
      process.env.AVIATIONSTACK_API_KEY = "live_secret_key_abc";
      const input = "Authentication failed for key live_secret_key_abc during request";
      const output = sanitizeLog(input);
      expect(output).not.toContain("live_secret_key_abc");
      expect(output).toBe("Authentication failed for key [REDACTED] during request");
    } finally {
      process.env.AVIATIONSTACK_API_KEY = original;
    }
  });

  it("handles Error objects and non-string inputs cleanly", () => {
    const err = new Error("Failed to connect: access_key=secret_token_999");
    const output = sanitizeLog(err);
    expect(output).toBe("Failed to connect: access_key=[REDACTED]");
  });
});
