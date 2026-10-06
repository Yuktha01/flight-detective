export type FlightStatus =
  | "scheduled"
  | "in_flight"
  | "landed"
  | "cancelled"
  | "incident"
  | "diverted"
  | "unknown";

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
    updated: string | null;
    latitude: number | null;
    longitude: number | null;
    altitudeMeters: number | null;
    direction: number | null;
    speedKmh: number | null;
    speedVertical: number | null;
    isGround: boolean | null;
  } | null;
  insight: {
    delayMinutes: number;
    delayStatus: DelayStatus;
    summary: string;
  };
}

export interface FlightApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}
