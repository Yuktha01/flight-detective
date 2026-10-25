// Talks to AviationStack ("Get me the raw flight data.")

import type {
  AviationstackErrorEnvelope,
  AviationstackFlightData,
  AviationstackFlightsResponse,
} from "../types/aviationstack";

const AVIATIONSTACK_URL = "https://api.apilayer.net/aviationstack/v1/flights";

export class UpstreamTimeoutError extends Error {
  constructor(message = "Aviationstack request timed out") {
    super(message);
    this.name = "UpstreamTimeoutError";
  }
}

export class ProviderQuotaError extends Error {
  constructor(
    message = "Aviationstack quota or rate limit exceeded",
    public code?: string | number,
  ) {
    super(message);
    this.name = "ProviderQuotaError";
  }
}

export class ProviderAuthError extends Error {
  constructor(
    message = "Aviationstack authentication failed",
    public code?: string | number,
  ) {
    super(message);
    this.name = "ProviderAuthError";
  }
}

export class ProviderResponseError extends Error {
  constructor(
    message = "Aviationstack returned an error response",
    public status?: number,
  ) {
    super(message);
    this.name = "ProviderResponseError";
  }
}

export class UpstreamConnectionError extends Error {
  constructor(message = "Could not connect to flight data provider") {
    super(message);
    this.name = "UpstreamConnectionError";
  }
}

export class MalformedProviderResponseError extends Error {
  constructor(message = "Aviationstack returned a malformed response") {
    super(message);
    this.name = "MalformedProviderResponseError";
  }
}

async function fetchAviationstackFlights(
  params: Record<string, string>,
  timeoutMs = 8000,
): Promise<AviationstackFlightData[]> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if (!apiKey) {
    throw new ProviderAuthError("AVIATIONSTACK_API_KEY is not configured");
  }

  const url = new URL(AVIATIONSTACK_URL);
  url.searchParams.set("access_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new UpstreamTimeoutError();
    }
    throw new UpstreamConnectionError(
      error instanceof Error ? error.message : "Network connection failed",
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      if (response.status === 429) {
        throw new ProviderQuotaError("Aviationstack rate limit exceeded", 429);
      }
      throw new ProviderResponseError(
        `Aviationstack request failed with status ${response.status}`,
        response.status,
      );
    }
    throw new MalformedProviderResponseError(
      "Aviationstack returned non-JSON response body",
    );
  }

  // Handle provider error envelopes (which may occur on 200 OK or 4xx/5xx)
  if (typeof json === "object" && json !== null && "error" in json) {
    const errorPayload = (json as AviationstackErrorEnvelope).error;
    const errorCode = errorPayload?.code;

    // Code 104 = usage_limit_reached, 429 = rate_limit_reached
    if (
      errorCode === 104 ||
      errorCode === 429 ||
      String(errorCode).includes("rate_limit") ||
      String(errorCode).includes("usage_limit")
    ) {
      throw new ProviderQuotaError(
        errorPayload?.info || "Aviationstack quota or rate limit exceeded",
        errorCode,
      );
    }

    // Code 101 = invalid_access_key, 102 = inactive_user
    if (errorCode === 101 || errorCode === 102 || errorCode === 103) {
      throw new ProviderAuthError(
        errorPayload?.info || "Aviationstack authentication failure",
        errorCode,
      );
    }

    throw new ProviderResponseError(
      errorPayload?.info || `Aviationstack error code: ${errorCode}`,
      response.status,
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new ProviderQuotaError("Aviationstack rate limit exceeded", 429);
    }
    throw new ProviderResponseError(
      `Aviationstack request failed with status ${response.status}`,
      response.status,
    );
  }

  const data = json as Partial<AviationstackFlightsResponse>;
  if (!Array.isArray(data.data)) {
    throw new MalformedProviderResponseError(
      "Aviationstack response missing data array",
    );
  }

  return data.data;
}

export async function getFlight(
  flightIata: string,
  timeoutMs = 8000,
): Promise<AviationstackFlightData | null> {
  const flights = await fetchAviationstackFlights({ flight_iata: flightIata }, timeoutMs);
  return flights[0] ?? null;
}

export async function getRecentFlights(
  limit = 10,
  timeoutMs = 8000,
): Promise<AviationstackFlightData[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 50));
  return fetchAviationstackFlights({ limit: String(boundedLimit) }, timeoutMs);
}
