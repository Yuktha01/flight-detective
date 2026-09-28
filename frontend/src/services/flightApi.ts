import type { FlightApiErrorResponse, FlightResponse } from "../types/flight";

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

export async function getFlight(flightNumber: string): Promise<FlightResponse> {
  const response = await fetch(
    `/api/flights/${encodeURIComponent(flightNumber)}`,
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
