//personal note -> interface describes an object
// AviationstackFlightData(code easier to understand and resuse hence multiple interfaces instead of one)
// │
// ├── departure → AviationstackAirport
// ├── arrival   → AviationstackAirport
// ├── airline   → AviationstackAirline
// ├── flight    → AviationstackFlight
// ├── aircraft  → AviationstackAircraft
// └── live      → AviationstackLive

// naming convention Aviationstack...because below represent ext API's data model.

export interface AviationstackAirport {
  //AviationstackFlight should have below properties and the properties have below mentioned types
  airport: string;
  timezone: string;
  iata: string;
  icao: string;
  terminal: string | null;
  gate: string | null;
  delay: number | null;
  scheduled: string;
  estimated: string | null;
  actual: string | null;
  estimated_runway: string | null;
  actual_runway: string | null;
  baggage: string | null;
}

export interface AviationstackAirline {
  id: string;
  fleet_average_age: number | null;
  airline_id: string | null;
  callsign: string | null;
  hub_code: string | null;
  iata_code: string | null;
  icao_code: string | null;
  country_iso2: string | null;
  date_founded: string | null;
  iata_prefix_accounting: string | null;
  airline_name: string;
  country_name: string | null;
  fleet_size: number | null;
  status: string | null;
  type: string | null;
}

export interface AviationstackFlight {
  number: string;
  iata: string;
  icao: string;
  codeshared: Record<string, unknown> | null; //as per documentation codeshared is an object or null. We currently don't know whats inside it.
}

export interface AviationstackAircraft {
  registration: string | null;
  iata: string | null;
  icao: string | null;
  icao24: string | null;
}

export interface AviationstackLive {
  updated: string;
  latitude: number;
  longitude: number;
  altitude: number;
  direction: number;
  speed_horizontal: number;
  speed_vertical: number;
  is_ground: boolean;
}

export type AviationstackFlightStatus =
  //union type (A flight status can only be ONE of these SIX values)
  "scheduled" | "active" | "landed" | "cancelled" | "incident" | "diverted";

export interface AviationstackFlightData {
  flight_date: string;
  flight_status: AviationstackFlightStatus;
  departure: AviationstackAirport;
  arrival: AviationstackAirport;
  airline: AviationstackAirline;
  flight: AviationstackFlight;
  aircraft: AviationstackAircraft | null; //aircraft object or null
  live: AviationstackLive | null;
}

export interface AviationstackPagination {
  limit: number;
  offset: number;
  count: number;
  total: number;
}

export interface AviationstackFlightsResponse {
  pagination: AviationstackPagination; //{}
  data: AviationstackFlightData[]; //complete api respones will be an array []
}
