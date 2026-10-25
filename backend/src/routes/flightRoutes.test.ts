import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app, { flightRateLimiter } from "../app";
import {
  MalformedProviderResponseError,
  ProviderAuthError,
  ProviderQuotaError,
  ProviderResponseError,
  UpstreamConnectionError,
  UpstreamTimeoutError,
  getFlight,
} from "../services/aviationstackService";
import { flightCache } from "../services/flightCache";

vi.mock("../services/aviationstackService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/aviationstackService")>();
  return {
    ...actual,
    getFlight: vi.fn(),
  };
});

const mockFlightData = {
  flight_date: "2026-09-13",
  flight_status: "scheduled",

  departure: {
    airport: "Tomsk",
    timezone: "Asia/Tomsk",
    iata: "TOF",
    icao: "UNTT",
    terminal: null,
    gate: null,
    delay: 25,
    scheduled: "2026-09-13T10:00:00+00:00",
    estimated: "2026-09-13T10:25:00+00:00",
    actual: null,
    estimated_runway: null,
    actual_runway: null,
    baggage: null,
  },

  arrival: {
    airport: "Sheremetyevo International",
    timezone: "Europe/Moscow",
    iata: "SVO",
    icao: "UUEE",
    terminal: null,
    gate: null,
    delay: 25,
    scheduled: "2026-09-13T11:30:00+00:00",
    estimated: "2026-09-13T11:55:00+00:00",
    actual: null,
    estimated_runway: null,
    actual_runway: null,
    baggage: null,
  },

  airline: {
    id: "1",
    fleet_average_age: null,
    airline_id: null,
    callsign: "AEROFLOT",
    hub_code: null,
    iata_code: "SU",
    icao_code: "AFL",
    country_iso2: "RU",
    date_founded: null,
    iata_prefix_accounting: null,
    airline_name: "Aeroflot",
    country_name: "Russia",
    fleet_size: null,
    status: "active",
    type: "airline",
  },

  flight: {
    number: "1531",
    iata: "SU1531",
    icao: "AFL1531",
    codeshared: null,
  },

  aircraft: null,
  live: null,
};

describe("GET /api/flights/:flightNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flightCache.clear();
  });

  it("returns 404 when the flight is not found", async () => {
    vi.mocked(getFlight).mockResolvedValue(null);

    const response = await request(app).get("/api/flights/XX9999");

    expect(response.status).toBe(404);
    expect(response.headers["x-cache"]).toBe("MISS");
    expect(response.body).toEqual({
      error: {
        code: "FLIGHT_NOT_FOUND",
        message: "We couldn't find that flight.",
      },
    });
  });

  it("accepts W2 flight numbers and looks them up", async () => {
    vi.mocked(getFlight).mockResolvedValue(null);

    const response = await request(app).get("/api/flights/W24979");

    expect(response.status).toBe(404);
    expect(getFlight).toHaveBeenCalledWith("W24979");
  });

  it("accepts three-letter airline codes and looks them up", async () => {
    vi.mocked(getFlight).mockResolvedValue(null);

    const response = await request(app).get("/api/flights/GEC8387");

    expect(response.status).toBe(404);
    expect(getFlight).toHaveBeenCalledWith("GEC8387");
  });

  it("returns flight data when the flight is found", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    const response = await request(app).get("/api/flights/SU1531");

    expect(response.status).toBe(200);
    expect(response.headers["x-cache"]).toBe("MISS");
    expect(response.body.flight.iata).toBe("SU1531");
    expect(response.body.flight.status).toBe("scheduled");
    expect(response.body.airline.name).toBe("Aeroflot");
    expect(response.body.departure.delayMinutes).toBe(25);
    expect(response.body.insight.delayStatus).toBe("delayed");
    expect(response.body.retrievedAt).toBeDefined();
  });

  it("serves repeated requests from cache with X-Cache: HIT", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    // Initial request: cache MISS
    const firstResponse = await request(app).get("/api/flights/SU1531");
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers["x-cache"]).toBe("MISS");
    expect(getFlight).toHaveBeenCalledTimes(1);

    // Second request: cache HIT
    const secondResponse = await request(app).get("/api/flights/SU1531");
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers["x-cache"]).toBe("HIT");
    expect(getFlight).toHaveBeenCalledTimes(1); // Not called again
  });

  it("caches 404 responses for not-found flights", async () => {
    vi.mocked(getFlight).mockResolvedValue(null);

    const first = await request(app).get("/api/flights/XX9999");
    expect(first.status).toBe(404);
    expect(first.headers["x-cache"]).toBe("MISS");

    const second = await request(app).get("/api/flights/XX9999");
    expect(second.status).toBe(404);
    expect(second.headers["x-cache"]).toBe("HIT");
    expect(getFlight).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when ?refresh=true is provided", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    await request(app).get("/api/flights/SU1531");
    expect(getFlight).toHaveBeenCalledTimes(1);

    const refreshResponse = await request(app).get("/api/flights/SU1531?refresh=true");
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.headers["x-cache"]).toBe("MISS");
    expect(getFlight).toHaveBeenCalledTimes(2);
  });

  it("does not cache upstream error responses", async () => {
    vi.mocked(getFlight).mockRejectedValueOnce(new UpstreamTimeoutError());

    const first = await request(app).get("/api/flights/SU1531");
    expect(first.status).toBe(504);

    // Provide successful data on next call
    vi.mocked(getFlight).mockResolvedValueOnce(mockFlightData);

    const second = await request(app).get("/api/flights/SU1531");
    expect(second.status).toBe(200);
    expect(second.headers["x-cache"]).toBe("MISS");
    expect(getFlight).toHaveBeenCalledTimes(2);
  });

  it("maps upstream timeout errors to 504 UPSTREAM_TIMEOUT", async () => {
    vi.mocked(getFlight).mockRejectedValue(new UpstreamTimeoutError());

    const response = await request(app).get("/api/flights/SU1531");

    expect(response.status).toBe(504);
    expect(response.body).toEqual({
      error: {
        code: "UPSTREAM_TIMEOUT",
        message: "Flight data provider timed out. Please try again.",
      },
    });
  });

  it("maps upstream quota/rate-limit errors to 503 PROVIDER_QUOTA_EXCEEDED", async () => {
    vi.mocked(getFlight).mockRejectedValue(new ProviderQuotaError("quota exceeded", 104));

    const response = await request(app).get("/api/flights/SU1531");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: "PROVIDER_QUOTA_EXCEEDED",
        message:
          "Flight data service is temporarily unavailable due to upstream rate limits. Please try again later.",
      },
    });
  });

  it("maps upstream auth errors to 500 FLIGHT_DATA_UNAVAILABLE without leaking secrets", async () => {
    vi.mocked(getFlight).mockRejectedValue(new ProviderAuthError("invalid key", 101));

    const response = await request(app).get("/api/flights/SU1531");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "FLIGHT_DATA_UNAVAILABLE",
        message: "Flight information is temporarily unavailable.",
      },
    });
  });

  it("maps provider status/response errors to 502 PROVIDER_ERROR", async () => {
    vi.mocked(getFlight).mockRejectedValue(new ProviderResponseError("500 from provider", 500));

    const response = await request(app).get("/api/flights/SU1531");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "PROVIDER_ERROR",
        message: "Flight data provider returned an error. Please try again.",
      },
    });
  });

  it("maps malformed response errors to 502 PROVIDER_ERROR", async () => {
    vi.mocked(getFlight).mockRejectedValue(
      new MalformedProviderResponseError("non-json returned"),
    );

    const response = await request(app).get("/api/flights/SU1531");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "PROVIDER_ERROR",
        message: "Flight data provider returned an error. Please try again.",
      },
    });
  });

  it("maps upstream connection errors to 502 PROVIDER_ERROR without caching", async () => {
    vi.mocked(getFlight).mockRejectedValueOnce(
      new UpstreamConnectionError("ECONNREFUSED"),
    );

    const first = await request(app).get("/api/flights/SU1531");
    expect(first.status).toBe(502);
    expect(first.body).toEqual({
      error: {
        code: "PROVIDER_ERROR",
        message: "Flight data provider returned an error. Please try again.",
      },
    });

    // Verify it was not cached: next call calls getFlight again
    vi.mocked(getFlight).mockResolvedValueOnce(mockFlightData);
    const second = await request(app).get("/api/flights/SU1531");
    expect(second.status).toBe(200);
    expect(second.headers["x-cache"]).toBe("MISS");
    expect(getFlight).toHaveBeenCalledTimes(2);
  });

  it("returns 400 for an invalid flight number", async () => {
    const response = await request(app).get("/api/flights/INVALID");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_FLIGHT_NUMBER",
        message: "Please enter a valid flight number.",
      },
    });
    expect(getFlight).not.toHaveBeenCalled();
  });
});

describe("CORS and Security Headers", () => {
  it("allows requests from approved development origins", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("blocks GET requests from unapproved origins with 403", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://malicious-website.com");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "CORS_FORBIDDEN",
        message: "Cross-origin request not allowed.",
      },
    });
  });

  it("blocks preflight OPTIONS requests from unapproved origins with 403", async () => {
    const response = await request(app)
      .options("/api/flights/SU1531")
      .set("Origin", "http://malicious-website.com")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "CORS_FORBIDDEN",
        message: "Cross-origin request not allowed.",
      },
    });
  });
});

describe("GET /api/health", () => {
  it("returns 200 ok and is not subject to flight search rate limiting", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      message: "Flight Detective backend is running",
    });
  });
});



describe("Rate Limiting on /api/flights", () => {
  it("enforces the rate limit on /api/flights while keeping /api/health accessible", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    // Consume remaining requests in current window (up to 30)
    for (let i = 0; i < 30; i++) {
      await request(app).get("/api/flights/SU1531");
    }

    // Next request to flight search must be rate limited (429)
    const rateLimitedResponse = await request(app).get("/api/flights/SU1531");
    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.body).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many flight searches. Please wait a moment and try again.",
      },
    });

    // Health check must remain completely outside the rate limiter
    const healthResponse = await request(app).get("/api/health");
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.status).toBe("ok");
  });
});


