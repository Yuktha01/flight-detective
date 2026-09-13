//What does Flight Detective give our FE.

//DATA TRANSFORMATION OR MAPPING will be done from aviationstack.ts file and this file through service layer(flightService.ts)

export type FlightStatus = //LITERAL UNION TYPE | "" | ""...
  "scheduled" | "in_flight" | "landed" | "cancelled" | "incident" | "diverted";

export type DelayStatus =
  | "on_time"
  | "minor_delay"
  | "delayed"
  | "significant_delay";

export interface FlightResponse {
  flight: {
    number: string;
    iata: string;
    icao: string;
    status: FlightStatus;
    date: string;
  };

  airline: {
    name: string;
    iata: string | null;
    icao: string | null;
  };

  route: {
    departure: {
      airport: string;
      iata: string;
      icao: string;
      terminal: string | null;
      gate: string | null;
    };

    arrival: {
      airport: string;
      iata: string;
      icao: string;
      terminal: string | null;
      gate: string | null;
    };
  };

  departure: {
    scheduled: string;
    estimated: string | null;
    actual: string | null;
    delayMinutes: number;
  };

  arrival: {
    scheduled: string;
    estimated: string | null;
    actual: string | null;
    delayMinutes: number;
  };

  aircraft: {
    registration: string | null;
    iata: string | null;
    icao: string | null;
  } | null;

  live: {
    updated: string;
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    direction: number;
    speedKmh: number;
    speedVertical: number;
    isGround: boolean;
  } | null;

  insight: {
    delayMinutes: number;
    delayStatus : DelayStatus;
    summary: string;
  };
}
