import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { handler } from "./lambda";
import { getFlight, getRecentFlights } from "./services/aviationstackService";
import { discoveryCache, flightCache } from "./services/flightCache";
import type { AviationstackFlightData } from "./types/aviationstack";

vi.mock("./services/aviationstackService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/aviationstackService")>();
  return {
    ...actual,
    getFlight: vi.fn(),
    getRecentFlights: vi.fn(),
  };
});

const mockFlightData: AviationstackFlightData = {
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

function createFunctionUrlEvent(options: {
  method?: string;
  path: string;
  queryString?: string;
  headers?: Record<string, string>;
  body?: string;
  sourceIp?: string;
}): APIGatewayProxyEventV2 {
  const method = (options.method || "GET").toUpperCase();
  const rawPath = options.path;
  const rawQueryString = options.queryString || "";
  const headers = {
    host: "abc123xyz.lambda-url.ap-south-1.on.aws",
    ...(options.headers || {}),
  };

  const queryStringParameters: Record<string, string> = {};
  if (rawQueryString) {
    const searchParams = new URLSearchParams(rawQueryString);
    searchParams.forEach((value, key) => {
      queryStringParameters[key] = value;
    });
  }

  return {
    version: "2.0",
    routeKey: "$default",
    rawPath,
    rawQueryString,
    headers,
    queryStringParameters: Object.keys(queryStringParameters).length > 0 ? queryStringParameters : undefined,
    requestContext: {
      accountId: "anonymous",
      apiId: "abc123xyz",
      domainName: "abc123xyz.lambda-url.ap-south-1.on.aws",
      domainPrefix: "abc123xyz",
      http: {
        method,
        path: rawPath,
        protocol: "HTTP/1.1",
        sourceIp: options.sourceIp || "127.0.0.1",
        userAgent: "vitest/test",
      },
      requestId: "test-req-12345",
      routeKey: "$default",
      stage: "$default",
      time: "01/Nov/2026:17:30:00 +0000",
      timeEpoch: 1793554200000,
    },
    body: options.body,
    isBase64Encoded: false,
  };
}

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: "flight-detective-backend",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:ap-south-1:123456789012:function:flight-detective-backend",
  memoryLimitInMB: "256",
  awsRequestId: "mock-aws-request-id-12345",
  logGroupName: "/aws/lambda/flight-detective-backend",
  logStreamName: "2026/11/01/[$LATEST]mock-stream",
  getRemainingTimeInMillis: () => 10000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

describe("AWS Lambda Handler (Function URL Payload v2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flightCache.clear();
    discoveryCache.clear();
    process.env.AVIATIONSTACK_API_KEY = "test-mock-api-key";
  });

  it("handles GET /api/health successfully", async () => {
    const event = createFunctionUrlEvent({
      path: "/api/health",
      method: "GET",
    });

    const result = (await handler(event, mockContext, () => {})) as any;

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toContain("application/json");

    const body = JSON.parse(result.body);
    expect(body).toEqual({
      status: "ok",
      message: "Flight Detective backend is running",
    });
  });

  it("handles OPTIONS preflight with approved origin and returns CORS headers", async () => {
    const event = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "GET",
      },
    });

    const result = (await handler(event, mockContext, () => {})) as any;

    expect([200, 204]).toContain(result.statusCode);
    expect(result.headers?.["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("blocks OPTIONS preflight with unapproved origin with 403 CORS_FORBIDDEN", async () => {
    const event = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "OPTIONS",
      headers: {
        origin: "http://malicious-site.com",
        "access-control-request-method": "GET",
      },
    });

    const result = (await handler(event, mockContext, () => {})) as any;

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("CORS_FORBIDDEN");
  });

  it("handles GET /api/flights/:flightNumber and returns transformed flight data", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    const event = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "GET",
      headers: {
        origin: "http://localhost:5173",
      },
    });

    const result = (await handler(event, mockContext, () => {})) as any;

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["x-cache"]).toBe("MISS");
    expect(result.headers?.["access-control-allow-origin"]).toBe("http://localhost:5173");

    const body = JSON.parse(result.body);
    expect(body.flight.iata).toBe("SU1531");
    expect(body.flight.status).toBe("scheduled");
    expect(body.airline.name).toBe("Aeroflot");
    expect(body.departure.delayMinutes).toBe(25);
    expect(body.insight.delayStatus).toBe("delayed");
    expect(body.retrievedAt).toBeDefined();
  });

  it("serves warm Lambda invocations from in-memory cache with X-Cache: HIT", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    const event = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "GET",
    });

    // First invocation: MISS
    const firstResult = (await handler(event, mockContext, () => {})) as any;
    expect(firstResult.statusCode).toBe(200);
    expect(firstResult.headers?.["x-cache"]).toBe("MISS");
    expect(getFlight).toHaveBeenCalledTimes(1);

    // Second warm invocation: HIT
    const secondResult = (await handler(event, mockContext, () => {})) as any;
    expect(secondResult.statusCode).toBe(200);
    expect(secondResult.headers?.["x-cache"]).toBe("HIT");
    expect(getFlight).toHaveBeenCalledTimes(1);
  });

  it("correctly parses query parameter ?refresh=true from Function URL rawQueryString to bypass cache", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    const initialEvent = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "GET",
    });
    await handler(initialEvent, mockContext, () => {});
    expect(getFlight).toHaveBeenCalledTimes(1);

    // Refresh invocation with rawQueryString
    const refreshEvent = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "GET",
      queryString: "refresh=true",
    });

    const refreshResult = (await handler(refreshEvent, mockContext, () => {})) as any;
    expect(refreshResult.statusCode).toBe(200);
    expect(refreshResult.headers?.["x-cache"]).toBe("MISS");
    expect(getFlight).toHaveBeenCalledTimes(2);
  });

  it("handles 400 INVALID_FLIGHT_NUMBER via Lambda", async () => {
    const event = createFunctionUrlEvent({
      path: "/api/flights/INVALID_FORMAT",
      method: "GET",
    });

    const result = (await handler(event, mockContext, () => {})) as any;

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("INVALID_FLIGHT_NUMBER");
  });

  it("handles 404 FLIGHT_NOT_FOUND via Lambda", async () => {
    vi.mocked(getFlight).mockResolvedValue(null);

    const event = createFunctionUrlEvent({
      path: "/api/flights/XX9999",
      method: "GET",
    });

    const result = (await handler(event, mockContext, () => {})) as any;

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("FLIGHT_NOT_FOUND");
  });

  it("handles GET /api/flights/discover via Lambda", async () => {
    vi.mocked(getRecentFlights).mockResolvedValue([mockFlightData]);

    const event = createFunctionUrlEvent({
      path: "/api/flights/discover",
      method: "GET",
    });

    const result = (await handler(event, mockContext, () => {})) as any;

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["x-cache"]).toBe("MISS");
    const body = JSON.parse(result.body);
    expect(body.flights).toHaveLength(1);
    expect(body.flights[0].flightNumber).toBe("SU1531");
  });

  it("uses trusted Lambda sourceIp for rate limiting, ignoring caller-supplied X-Forwarded-For headers", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlightData);

    const clientSourceIp = "198.51.100.99";

    // Consume the 30 allowed requests in window using spoofed rotating X-Forwarded-For headers
    for (let i = 0; i < 30; i++) {
      const event = createFunctionUrlEvent({
        path: "/api/flights/SU1531",
        method: "GET",
        sourceIp: clientSourceIp,
        headers: {
          "x-forwarded-for": `10.0.0.${i + 1}`,
        },
      });
      const res = (await handler(event, mockContext, () => {})) as any;
      expect(res.statusCode).toBe(200);
    }

    // 31st request from same sourceIp with another new X-Forwarded-For header must be rate-limited (429)
    const rateLimitedEvent = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "GET",
      sourceIp: clientSourceIp,
      headers: {
        "x-forwarded-for": "172.16.0.1",
      },
    });
    const rateLimitedResult = (await handler(rateLimitedEvent, mockContext, () => {})) as any;
    expect(rateLimitedResult.statusCode).toBe(429);
    const body = JSON.parse(rateLimitedResult.body);
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");

    // A request from a DIFFERENT sourceIp must not be rate-limited
    const otherClientEvent = createFunctionUrlEvent({
      path: "/api/flights/SU1531",
      method: "GET",
      sourceIp: "198.51.100.100",
      headers: {
        "x-forwarded-for": "10.0.0.1",
      },
    });
    const otherClientResult = (await handler(otherClientEvent, mockContext, () => {})) as any;
    expect(otherClientResult.statusCode).toBe(200);
  });
});

