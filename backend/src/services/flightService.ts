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
import type { AviationstackFlightData } from "../types/aviationstack";
import type { FlightResponse } from "../types/flight";

//If Aviationstack gives us a delay, use it. If it gives us null, use 0
function calculateDelayMinutes(delay: number | null): number {
  return delay ?? 0;            //nullish coalescing operator
}

function transformFlight(flight: AviationstackFlightData): FlightResponse {
  const departureDelayMinutes = calculateDelayMinutes(
    flight.departure.delay
  );

  const arrivalDelayMinutes = calculateDelayMinutes(
    flight.arrival.delay
  );

  return {
    flight: {
      number: flight.flight.number,
      iata: flight.flight.iata,
      icao: flight.flight.icao,
      status: flight.flight_status,
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
      delayMinutes: departureDelayMinutes,      //placeholders 
      personality: "The Detective",
      summary: "Flight information is available.",
    },
  };
}

export async function investigateFlight(
  flightNumber: string
): Promise<FlightResponse | null> {
  const flight = await getFlight(flightNumber);

  if (!flight) {
    return null;
  }

  return transformFlight(flight);
}