//What does Flight Detective give our FE.

//DATA TRANSFORMATION OR MAPPING will be done from aviationstack.ts file and this file through service layer(flightService.ts)

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
  | "significant_delay"
  | "unknown"
  | "cancelled"
  | "diverted"
  | "incident";

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
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
    delayMinutes: number | null;
  };

  arrival: {
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
    delayMinutes: number | null;
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
    delayMinutes: number | null;
    delayStatus: DelayStatus;
    summary: string;
  };

  /**
   * ISO 8601 timestamp recording when the Flight Detective application
   * retrieved and transformed this flight record from the upstream provider.
   * Note: This reflects the application fetch time, not the upstream provider's radar freshness.
   */
  retrievedAt: string;
}

export interface DiscoveredFlight {
  flightNumber: string;
  airlineName: string;
  status: FlightStatus;
  departure: {
    airport: string;
    iata: string;
  };
  arrival: {
    airport: string;
    iata: string;
  };
  flightDate: string;
}

export interface DiscoveryResponse {
  flights: DiscoveredFlight[];
  retrievedAt: string;
}

