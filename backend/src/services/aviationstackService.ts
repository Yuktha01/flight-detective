//Talks to AviationStack ("Get me the raw flight data.")

import type {
  AviationstackFlightData,
  AviationstackFlightsResponse,
} from "../types/aviationstack";

const AVIATIONSTACK_URL = "https://api.apilayer.net/aviationstack/v1/flights";

export async function getFlight(
  flightIata: string,
): Promise<AviationstackFlightData | null> {      //This function is asynchronous and will eventually return either an AviationstackFlightData object or null
  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if (!apiKey) {
    throw new Error("AVIATIONSTACK_API_KEY is not configured");
  }

  const url = new URL(AVIATIONSTACK_URL);

  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("flight_iata", flightIata);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Aviationstack request failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as AviationstackFlightsResponse;

  return data.data[0] ?? null;
}
