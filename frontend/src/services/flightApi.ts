import type {
  DiscoveryResponse,
  FlightApiErrorResponse,
  FlightResponse,
} from "../types/flight";

export class FlightApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "FlightApiError";
    this.status = status;
    this.code = code;
  }
}

export async function getFlight(flightNumber: string, refresh = false): Promise<FlightResponse> {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  const query = refresh ? '?refresh=true' : ''
  const response = await fetch(
    `${apiBaseUrl}/api/flights/${encodeURIComponent(flightNumber)}${query}`,
  );
  const data = (await response.json()) as
    | FlightResponse
    | FlightApiErrorResponse;

  if (!response.ok) {
    const errorData = data as FlightApiErrorResponse;
    throw new FlightApiError(
      errorData.error?.message ?? "Flight information could not be loaded.",
      response.status,
      errorData.error?.code,
    );
  }

  return data as FlightResponse;
}

export async function getDiscoveredFlights(): Promise<DiscoveryResponse> {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  const response = await fetch(`${apiBaseUrl}/api/flights/discover`);
  const data = (await response.json()) as
    | DiscoveryResponse
    | FlightApiErrorResponse;

  if (!response.ok) {
    const errorData = data as FlightApiErrorResponse;
    throw new FlightApiError(
      errorData.error?.message ?? "Unable to discover flights.",
      response.status,
      errorData.error?.code,
    );
  }

  return data as DiscoveryResponse;
}

