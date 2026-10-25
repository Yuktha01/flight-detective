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
  DelayStatus,
  FlightResponse,
  FlightStatus,
} from "../types/flight";

// If Aviationstack gives us a delay number, use it. If null or not finite, preserve null.
function calculateDelayMinutes(delay: number | null | undefined): number | null {
  if (typeof delay === "number" && Number.isFinite(delay)) {
    return delay;
  }
  return null;
}

export function getDelayStatus(
  delayMinutes: number | null,
  flightStatus?: FlightStatus,
): DelayStatus {
  if (flightStatus === "cancelled") {
    return "cancelled";
  }
  if (flightStatus === "diverted") {
    return "diverted";
  }
  if (flightStatus === "incident") {
    return "incident";
  }

  if (delayMinutes === null || delayMinutes === undefined) {
    return "unknown";
  }

  if (flightStatus === "unknown") {
    if (delayMinutes <= 0) {
      return "unknown";
    }
    if (delayMinutes < 15) {
      return "minor_delay";
    }
    if (delayMinutes < 60) {
      return "delayed";
    }
    return "significant_delay";
  }

  if (delayMinutes <= 0) {
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

export function getFlightStatus(
  status: AviationstackFlightData["flight_status"],
): FlightStatus {
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

    default:
      return "unknown";
  }
}

export function getDelaySummary(
  delayStatus: DelayStatus,
  delayMinutes: number | null,
  flightStatus?: FlightStatus,
): string {
  switch (delayStatus) {
    case "cancelled":
      return "This flight is cancelled.";

    case "diverted":
      return "This flight has been diverted.";

    case "incident":
      return "An incident has been reported for this flight.";

    case "unknown": {
      if (flightStatus === "unknown") {
        if (delayMinutes === 0) {
          return "Flight operational status is unknown; no departure delay is reported.";
        }
        return "Flight status and delay information are currently unavailable.";
      }
      if (flightStatus === "scheduled") {
        return "This flight is scheduled, but delay details are currently unavailable.";
      }
      if (flightStatus === "in_flight") {
        return "This flight is in flight, but delay details are currently unavailable.";
      }
      if (flightStatus === "landed") {
        return "This flight has landed, but delay details were not reported.";
      }
      return "Delay details are currently unavailable for this flight.";
    }

    case "on_time":
      return "This flight is currently on time.";

    case "minor_delay":
      if (flightStatus === "unknown") {
        return `Flight status is unconfirmed, but a minor delay of ${delayMinutes} minutes is reported.`;
      }
      return `This flight has a minor delay of ${delayMinutes} minutes.`;

    case "delayed":
      if (flightStatus === "unknown") {
        return `Flight status is unconfirmed, but a delay of ${delayMinutes} minutes is reported.`;
      }
      return `This flight is delayed by ${delayMinutes} minutes.`;

    case "significant_delay":
      if (flightStatus === "unknown") {
        return `Flight status is unconfirmed, but a significant delay of ${delayMinutes} minutes is reported.`;
      }
      return `This flight has a significant delay of ${delayMinutes} minutes.`;
  }
}

function transformFlight(flight: AviationstackFlightData): FlightResponse {
  const departureDelayMinutes = calculateDelayMinutes(flight.departure.delay);
  const arrivalDelayMinutes = calculateDelayMinutes(flight.arrival.delay);

  const airline = flight.airline;
  const airlineName =
    "airline_name" in airline ? airline.airline_name : airline.name;
  const airlineIata = "iata_code" in airline ? airline.iata_code : airline.iata;
  const airlineIcao = "icao_code" in airline ? airline.icao_code : airline.icao;

  const flightStatus = getFlightStatus(flight.flight_status);
  const delayStatus = getDelayStatus(departureDelayMinutes, flightStatus);
  const delaySummary = getDelaySummary(
    delayStatus,
    departureDelayMinutes,
    flightStatus,
  );
  const insightDelayMinutes =
    flightStatus === "cancelled" ? null : departureDelayMinutes;

  return {
    flight: {
      number: flight.flight.number,
      iata: flight.flight.iata,
      icao: flight.flight.icao,
      status: flightStatus,
      date: flight.flight_date,
    },

    airline: {
      name: airlineName,
      iata: airlineIata,
      icao: airlineIcao,
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
      scheduled: flight.departure.scheduled ?? null,
      estimated: flight.departure.estimated ?? null,
      actual: flight.departure.actual ?? null,
      delayMinutes: departureDelayMinutes,
    },

    arrival: {
      scheduled: flight.arrival.scheduled ?? null,
      estimated: flight.arrival.estimated ?? null,
      actual: flight.arrival.actual ?? null,
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
      delayMinutes: insightDelayMinutes,
      delayStatus,
      summary: delaySummary,
    },

    retrievedAt: new Date().toISOString(),
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

