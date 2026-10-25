import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MalformedProviderResponseError,
  ProviderAuthError,
  ProviderQuotaError,
  ProviderResponseError,
  UpstreamConnectionError,
  UpstreamTimeoutError,
  getFlight,
} from "./aviationstackService";

describe("aviationstackService - getFlight", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, AVIATIONSTACK_API_KEY: "test_key" };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws ProviderAuthError if AVIATIONSTACK_API_KEY is not configured", async () => {
    delete process.env.AVIATIONSTACK_API_KEY;

    await expect(getFlight("SU1531")).rejects.toThrow(ProviderAuthError);
  });

  it("throws UpstreamTimeoutError when fetch times out", async () => {
    const timeoutError = new DOMException("The operation was aborted", "TimeoutError");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(timeoutError);

    await expect(getFlight("SU1531")).rejects.toThrow(UpstreamTimeoutError);
  });

  it("throws UpstreamConnectionError when network connection fails", async () => {
    const networkError = new TypeError("fetch failed");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(networkError);

    await expect(getFlight("SU1531")).rejects.toThrow(UpstreamConnectionError);
  });

  it("throws ProviderQuotaError when provider returns HTTP 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response);

    await expect(getFlight("SU1531")).rejects.toThrow(ProviderQuotaError);
  });

  it("throws ProviderQuotaError when provider returns 200 with code 104 error envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        error: {
          code: 104,
          type: "usage_limit_reached",
          info: "Your monthly usage limit has been reached.",
        },
      }),
    } as Response);

    await expect(getFlight("SU1531")).rejects.toThrow(ProviderQuotaError);
  });

  it("throws ProviderAuthError when provider returns 200 with code 101 error envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        error: {
          code: 101,
          type: "invalid_access_key",
          info: "You have supplied an invalid API Access Key.",
        },
      }),
    } as Response);

    await expect(getFlight("SU1531")).rejects.toThrow(ProviderAuthError);
  });

  it("throws ProviderResponseError when provider returns unexpected error envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        error: {
          code: 999,
          info: "Some internal upstream error",
        },
      }),
    } as Response);

    await expect(getFlight("SU1531")).rejects.toThrow(ProviderResponseError);
  });

  it("throws MalformedProviderResponseError when provider returns non-JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON at position 0");
      },
    } as unknown as Response);

    await expect(getFlight("SU1531")).rejects.toThrow(MalformedProviderResponseError);
  });

  it("throws MalformedProviderResponseError when JSON lacks data array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ unexpected: "payload" }),
    } as unknown as Response);

    await expect(getFlight("SU1531")).rejects.toThrow(MalformedProviderResponseError);
  });

  it("returns flight data when provider returns valid payload", async () => {
    const mockFlight = { flight_date: "2026-09-13", flight: { iata: "SU1531" } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        pagination: { limit: 100, offset: 0, count: 1, total: 1 },
        data: [mockFlight],
      }),
    } as unknown as Response);

    const result = await getFlight("SU1531");
    expect(result).toEqual(mockFlight);
  });
});

