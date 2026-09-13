//How Flight Detective Interprets the data "Turn raw data we got from aviationstackService.ts into a Flight Detective flight."

//investigateFlight("SU1531")
//investigateFlight()
//        │
//        ▼
// getFlight()
//        │
//        ▼
// Aviationstack
//        │
//        ▼
// raw Aviationstack data
//        │
//        ▼
// transformFlight()
//        │
//        ▼
// FlightResponse

import { getFlight } from "./aviationstackService";
//typescript-only imports - primarily for ts checking ; not needed when program is actually running.
import type { AviationstackFlightData } from "../types/aviationstack";
import type {
  FlightResponse,
  FlightStatus,
  DelayStatus,
} from "../types/flight";

//If Aviationstack gives us a delay, use it. If it gives us null, use 0
function calculateDelayMinutes(delay: number | null): number {
  //Input : number OR null (OR is called union type); Output : number
  return delay ?? 0; //nullish coalescing operator
  //if delay has a value - use delay ; if delay is null - use 0
}

export function getDelayStatus(delayMinutes: number): DelayStatus {
  if (delayMinutes === 0) {
    return "on_time";
  }
  if (delayMinutes < 15) {
    return "minor_delay";
  }
  if (delayMinutes < 60) {
    return "delayed";
  }
  return "significant_delay";
}

function getFlightStatus(
  status: AviationstackFlightData["flight_status"], //status parameter must have same type as the type of flight_status property from AviationstackFlightData
): FlightStatus {
  //return type
  switch (status) {
    case "scheduled":
      return "scheduled";

    case "active":
      return "in_flight";

    case "landed":
      return "landed";

    case "cancelled":
      return "cancelled";

    case "incident":
      return "incident";

    case "diverted":
      return "diverted";
  }
}

export function getDelaySummary(delayStatus: DelayStatus, delayMinutes: number): string {
  switch (delayStatus) {
    case "on_time":
      return "This flight is currently on time.";

    case "minor_delay":
      return `This flight has a minor delay of ${delayMinutes} minutes.`;

    case "delayed":
      return `This flight is delayed by ${delayMinutes} minutes.`;

    case "significant_delay":
      return `This flight has a significant delay of ${delayMinutes} minutes.`;
  }
}

function transformFlight(flight: AviationstackFlightData): FlightResponse {
  const departureDelayMinutes = calculateDelayMinutes(flight.departure.delay);

  const arrivalDelayMinutes = calculateDelayMinutes(flight.arrival.delay);

  const delayStatus = getDelayStatus(departureDelayMinutes);
  const delaySummary = getDelaySummary(
    delayStatus,
    departureDelayMinutes
  )

  return {
    flight: {
      number: flight.flight.number,
      iata: flight.flight.iata,
      icao: flight.flight.icao,
      status: getFlightStatus(flight.flight_status),
      date: flight.flight_date,
    },

    airline: {
      name: flight.airline.airline_name,
      iata: flight.airline.iata_code,
      icao: flight.airline.icao_code,
    },

    route: {
      departure: {
        airport: flight.departure.airport,
        iata: flight.departure.iata,
        icao: flight.departure.icao,
        terminal: flight.departure.terminal,
        gate: flight.departure.gate,
      },

      arrival: {
        airport: flight.arrival.airport,
        iata: flight.arrival.iata,
        icao: flight.arrival.icao,
        terminal: flight.arrival.terminal,
        gate: flight.arrival.gate,
      },
    },

    departure: {
      scheduled: flight.departure.scheduled,
      estimated: flight.departure.estimated,
      actual: flight.departure.actual,
      delayMinutes: departureDelayMinutes,
    },

    arrival: {
      scheduled: flight.arrival.scheduled,
      estimated: flight.arrival.estimated,
      actual: flight.arrival.actual,
      delayMinutes: arrivalDelayMinutes,
    },

    aircraft: flight.aircraft
      ? {
          registration: flight.aircraft.registration,
          iata: flight.aircraft.iata,
          icao: flight.aircraft.icao,
        }
      : null,

    live: flight.live
      ? {
          updated: flight.live.updated,
          latitude: flight.live.latitude,
          longitude: flight.live.longitude,
          altitudeMeters: flight.live.altitude,
          direction: flight.live.direction,
          speedKmh: flight.live.speed_horizontal,
          speedVertical: flight.live.speed_vertical,
          isGround: flight.live.is_ground,
        }
      : null,

    insight: {
      delayMinutes: departureDelayMinutes, 
      delayStatus,
      summary : delaySummary
    },
  };
}

export async function investigateFlight(
  flightNumber: string,
): Promise<FlightResponse | null> {
  const flight = await getFlight(flightNumber);

  if (!flight) {
    return null;
  }

  return transformFlight(flight);
}
