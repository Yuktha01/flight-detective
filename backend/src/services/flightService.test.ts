import { describe, expect, it, vi } from "vitest";
import {
  discoverFlights,
  getDelayStatus,
  getDelaySummary,
  investigateFlight,
} from "./flightService";
import { getFlight, getRecentFlights } from "./aviationstackService";

// describe → group tests
//     ↓
// it → define a scenario
//     ↓
// expect → state what should happen
//     ↓
// toBe → compare actual result with expected result
//vi is Vitest's utility for things like mocking functions and spying on calls.

vi.mock("./aviationstackService", () => ({
  getFlight: vi.fn(),
  getRecentFlights: vi.fn(),
}));

const mockFlight = {
  flight_date: "2026-09-13",
  flight_status: "scheduled" as const,

  departure: {
    airport: "Tomsk",
    timezone: "Asia/Tomsk",
    iata: "TOF",
    icao: "UNTT",
    terminal: null,
    gate: null,
    delay: 25,
    scheduled: "2026-09-13T10:00:00+00:00",
    estimated: "2026-09-13T10:25:00+00:00",
    actual: null,
    estimated_runway: null,
    actual_runway: null,
    baggage: null,
  },

  arrival: {
    airport: "Sheremetyevo International",
    timezone: "Europe/Moscow",
    iata: "SVO",
    icao: "UUEE",
    terminal: null,
    gate: null,
    delay: 25,
    scheduled: "2026-09-13T11:30:00+00:00",
    estimated: "2026-09-13T11:55:00+00:00",
    actual: null,
    estimated_runway: null,
    actual_runway: null,
    baggage: null,
  },

  airline: {
    id: "1",
    fleet_average_age: null,
    airline_id: null,
    callsign: "AEROFLOT",
    hub_code: null,
    iata_code: "SU",
    icao_code: "AFL",
    country_iso2: "RU",
    date_founded: null,
    iata_prefix_accounting: null,
    airline_name: "Aeroflot",
    country_name: "Russia",
    fleet_size: null,
    status: "active",
    type: "airline",
  },

  flight: {
    number: "1531",
    iata: "SU1531",
    icao: "AFL1531",
    codeshared: null,
  },

  aircraft: null,
  live: null,
};

describe("getDelayStatus", () => {
  it("returns on_time for 0 minutes on confirmed flights", () => {
    expect(getDelayStatus(0)).toBe("on_time");
    expect(getDelayStatus(0, "scheduled")).toBe("on_time");
    expect(getDelayStatus(0, "in_flight")).toBe("on_time");
    expect(getDelayStatus(0, "landed")).toBe("on_time");
  });

  it("returns minor_delay for 1 to 14 minutes", () => {
    expect(getDelayStatus(1)).toBe("minor_delay");
    expect(getDelayStatus(14)).toBe("minor_delay");
  });

  it("returns delayed for 15 to 59 minutes", () => {
    expect(getDelayStatus(15)).toBe("delayed");
    expect(getDelayStatus(59)).toBe("delayed");
  });

  it("returns significant_delay for 60+ minutes", () => {
    expect(getDelayStatus(60)).toBe("significant_delay");
    expect(getDelayStatus(120)).toBe("significant_delay");
  });

  it("returns unknown when delay is null or undefined", () => {
    expect(getDelayStatus(null)).toBe("unknown");
    expect(getDelayStatus(undefined as any)).toBe("unknown");
    expect(getDelayStatus(null, "scheduled")).toBe("unknown");
  });

  it("returns on_time for negative delays on confirmed flights", () => {
    expect(getDelayStatus(-10, "in_flight")).toBe("on_time");
  });

  it("returns unknown when flight status is unknown even if delay is 0 or negative", () => {
    expect(getDelayStatus(0, "unknown")).toBe("unknown");
    expect(getDelayStatus(-5, "unknown")).toBe("unknown");
  });

  it("returns cancelled when flight status is cancelled regardless of delay", () => {
    expect(getDelayStatus(0, "cancelled")).toBe("cancelled");
    expect(getDelayStatus(45, "cancelled")).toBe("cancelled");
    expect(getDelayStatus(null, "cancelled")).toBe("cancelled");
  });

  it("returns diverted when flight status is diverted", () => {
    expect(getDelayStatus(0, "diverted")).toBe("diverted");
    expect(getDelayStatus(30, "diverted")).toBe("diverted");
    expect(getDelayStatus(null, "diverted")).toBe("diverted");
  });

  it("returns incident when flight status is incident", () => {
    expect(getDelayStatus(0, "incident")).toBe("incident");
    expect(getDelayStatus(null, "incident")).toBe("incident");
  });
});

describe("getDelaySummary", () => {
  it("returns the correct summary for an on-time flight", () => {
    expect(getDelaySummary("on_time", 0)).toBe(
      "This flight is currently on time.",
    );
  });

  it("returns the correct summary for a minor delay", () => {
    expect(getDelaySummary("minor_delay", 8)).toBe(
      "This flight has a minor delay of 8 minutes.",
    );
  });

  it("returns the correct summary for a delayed flight", () => {
    expect(getDelaySummary("delayed", 25)).toBe(
      "This flight is delayed by 25 minutes.",
    );
  });

  it("returns the correct summary for a significant delay", () => {
    expect(getDelaySummary("significant_delay", 90)).toBe(
      "This flight has a significant delay of 90 minutes.",
    );
  });

  it("returns cancelled summary for cancelled flights", () => {
    expect(getDelaySummary("cancelled", null, "cancelled")).toBe(
      "This flight is cancelled.",
    );
  });

  it("returns diverted summary for diverted flights", () => {
    expect(getDelaySummary("diverted", null, "diverted")).toBe(
      "This flight has been diverted.",
    );
  });

  it("returns incident summary for incident flights", () => {
    expect(getDelaySummary("incident", null, "incident")).toBe(
      "An incident has been reported for this flight.",
    );
  });

  it("returns honest unknown status summaries without claiming on-time", () => {
    expect(getDelaySummary("unknown", 0, "unknown")).toBe(
      "Flight operational status is unknown; no departure delay is reported.",
    );
    expect(getDelaySummary("unknown", null, "unknown")).toBe(
      "Flight status and delay information are currently unavailable.",
    );
    expect(getDelaySummary("unknown", null, "scheduled")).toBe(
      "This flight is scheduled, but delay details are currently unavailable.",
    );
    expect(getDelaySummary("unknown", null, "in_flight")).toBe(
      "This flight is in flight, but delay details are currently unavailable.",
    );
    expect(getDelaySummary("unknown", null, "landed")).toBe(
      "This flight has landed, but delay details were not reported.",
    );
  });
});

describe("investigateFlight", () => {
  it("transforms a normal delayed flight returned by Aviationstack", async () => {
    vi.mocked(getFlight).mockResolvedValue(mockFlight);

    const result = await investigateFlight("SU1531");

    expect(result?.flight.iata).toBe("SU1531");
    expect(result?.flight.status).toBe("scheduled");
    expect(result?.airline.name).toBe("Aeroflot");
    expect(result?.departure.delayMinutes).toBe(25);
    expect(result?.insight.delayStatus).toBe("delayed");
    expect(result?.insight.summary).toBe(
      "This flight is delayed by 25 minutes.",
    );
    expect(result?.retrievedAt).toBeDefined();
    expect(new Date(result!.retrievedAt).toISOString()).toBe(result!.retrievedAt);
  });

  it("handles zero delay accurately for an on-time active flight", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      flight_status: "active",
      departure: {
        ...mockFlight.departure,
        delay: 0,
      },
      arrival: {
        ...mockFlight.arrival,
        delay: 0,
      },
    });

    const result = await investigateFlight("SU1531");

    expect(result?.flight.status).toBe("in_flight");
    expect(result?.departure.delayMinutes).toBe(0);
    expect(result?.arrival.delayMinutes).toBe(0);
    expect(result?.insight.delayMinutes).toBe(0);
    expect(result?.insight.delayStatus).toBe("on_time");
    expect(result?.insight.summary).toBe("This flight is currently on time.");
  });

  it("preserves negative delays without fabricating a zero-minute delay", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      flight_status: "active",
      departure: {
        ...mockFlight.departure,
        delay: -15,
      },
    });

    const result = await investigateFlight("SU1531");

    expect(result?.flight.status).toBe("in_flight");
    expect(result?.departure.delayMinutes).toBe(-15);
    expect(result?.insight.delayMinutes).toBe(-15);
    expect(result?.insight.delayStatus).toBe("on_time");
    expect(result?.insight.summary).toBe("This flight is currently on time.");
  });

  it("handles null or missing delay without defaulting to zero", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      departure: {
        ...mockFlight.departure,
        delay: null,
      },
      arrival: {
        ...mockFlight.arrival,
        delay: null,
      },
    });

    const result = await investigateFlight("SU1531");

    expect(result?.departure.delayMinutes).toBeNull();
    expect(result?.arrival.delayMinutes).toBeNull();
    expect(result?.insight.delayMinutes).toBeNull();
    expect(result?.insight.delayStatus).toBe("unknown");
    expect(result?.insight.summary).toBe(
      "This flight is scheduled, but delay details are currently unavailable.",
    );
  });

  it("handles cancelled flights correctly without claiming on-time", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      flight_status: "cancelled",
      departure: {
        ...mockFlight.departure,
        delay: 0, // Provider reported 0, but status is cancelled
      },
    });

    const result = await investigateFlight("SU1531");

    expect(result?.flight.status).toBe("cancelled");
    expect(result?.insight.delayStatus).toBe("cancelled");
    expect(result?.insight.summary).toBe("This flight is cancelled.");
    expect(result?.insight.delayMinutes).toBeNull();
  });

  it("handles diverted flights correctly", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      flight_status: "diverted",
      departure: {
        ...mockFlight.departure,
        delay: 20,
      },
    });

    const result = await investigateFlight("SU1531");

    expect(result?.flight.status).toBe("diverted");
    expect(result?.insight.delayStatus).toBe("diverted");
    expect(result?.insight.summary).toBe("This flight has been diverted.");
  });

  it("handles incident flights correctly", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      flight_status: "incident",
    });

    const result = await investigateFlight("SU1531");

    expect(result?.flight.status).toBe("incident");
    expect(result?.insight.delayStatus).toBe("incident");
    expect(result?.insight.summary).toBe(
      "An incident has been reported for this flight.",
    );
  });

  it("uses an unknown status when Aviationstack omits the flight status and avoids claiming on-time for 0 delay", async () => {
    const { flight_status: _flightStatus, ...flightWithoutStatus } = mockFlight;
    vi.mocked(getFlight).mockResolvedValue({
      ...flightWithoutStatus,
      departure: {
        ...mockFlight.departure,
        delay: 0,
      },
    });

    const result = await investigateFlight("SU1531");

    expect(result?.flight.status).toBe("unknown");
    expect(result?.insight.delayStatus).toBe("unknown");
    expect(result?.insight.summary).toBe(
      "Flight operational status is unknown; no departure delay is reported.",
    );
  });

  it("handles unexpected status strings by mapping them to unknown", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      // @ts-expect-error Testing unrecognized provider string
      flight_status: "unrecognized_status",
    });

    const result = await investigateFlight("SU1531");

    expect(result?.flight.status).toBe("unknown");
  });

  it("preserves missing scheduled, estimated, and actual timestamps without inferring values", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      departure: {
        ...mockFlight.departure,
        // @ts-expect-error Simulating missing scheduled timestamp
        scheduled: null,
        estimated: null,
        actual: null,
      },
      arrival: {
        ...mockFlight.arrival,
        // @ts-expect-error Simulating missing scheduled timestamp
        scheduled: null,
        estimated: null,
        actual: null,
      },
    });

    const result = await investigateFlight("SU1531");

    expect(result?.departure.scheduled).toBeNull();
    expect(result?.departure.estimated).toBeNull();
    expect(result?.departure.actual).toBeNull();
    expect(result?.arrival.scheduled).toBeNull();
    expect(result?.arrival.estimated).toBeNull();
    expect(result?.arrival.actual).toBeNull();
  });

  it("maps the compact airline fields returned by Aviationstack", async () => {
    vi.mocked(getFlight).mockResolvedValue({
      ...mockFlight,
      airline: { name: "Flexflight", iata: "W2", icao: "FXT" },
    });

    const result = await investigateFlight("W24979");

    expect(result?.airline).toEqual({
      name: "Flexflight",
      iata: "W2",
      icao: "FXT",
    });
  });

  it("returns null when the flight is not found", async () => {
    vi.mocked(getFlight).mockResolvedValue(null);

    const result = await investigateFlight("INVALID");

    expect(result).toBeNull();
  });
});

describe("discoverFlights", () => {
  it("filters out records with missing or invalid flight numbers", async () => {
    vi.mocked(getRecentFlights).mockResolvedValue([
      {
        flight_date: "2026-09-13",
        flight_status: "scheduled",
        flight: { iata: null as any, icao: null as any, number: null as any, codeshared: null },
        airline: { name: "Ghost Air", iata: "GA", icao: "GHA" },
        departure: { airport: "A", timezone: "UTC", iata: "AAA", icao: "AAAA", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T10:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        arrival: { airport: "B", timezone: "UTC", iata: "BBB", icao: "BBBB", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T11:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        aircraft: null,
        live: null,
      },
      {
        flight_date: "2026-09-13",
        flight_status: "active",
        flight: { iata: "INVALID_LONG_CODE", icao: "INV1", number: "1", codeshared: null },
        airline: { name: "Bad Format", iata: "BF", icao: "BFF" },
        departure: { airport: "A", timezone: "UTC", iata: "AAA", icao: "AAAA", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T10:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        arrival: { airport: "B", timezone: "UTC", iata: "BBB", icao: "BBBB", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T11:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        aircraft: null,
        live: null,
      },
      {
        flight_date: "2026-09-13",
        flight_status: "active",
        flight: { iata: "SU1531", icao: "AFL1531", number: "1531", codeshared: null },
        airline: { name: "Aeroflot", iata: "SU", icao: "AFL" },
        departure: { airport: "Sheremetyevo", timezone: "UTC", iata: "SVO", icao: "UUEE", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T10:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        arrival: { airport: "Pulkovo", timezone: "UTC", iata: "LED", icao: "ULLI", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T11:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        aircraft: null,
        live: null,
      },
    ]);

    const result = await discoverFlights(10);

    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].flightNumber).toBe("SU1531");
    expect(result.flights[0].airlineName).toBe("Aeroflot");
    expect(result.flights[0].status).toBe("in_flight");
    expect(result.flights[0].departure.iata).toBe("SVO");
    expect(result.flights[0].arrival.iata).toBe("LED");
    expect(result.retrievedAt).toBeDefined();
  });

  it("deduplicates duplicate flight numbers", async () => {
    vi.mocked(getRecentFlights).mockResolvedValue([
      {
        flight_date: "2026-09-13",
        flight_status: "scheduled",
        flight: { iata: "BA249", icao: "BAW249", number: "249", codeshared: null },
        airline: { name: "British Airways", iata: "BA", icao: "BAW" },
        departure: { airport: "Heathrow", timezone: "UTC", iata: "LHR", icao: "EGLL", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T10:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        arrival: { airport: "Galeao", timezone: "UTC", iata: "GIG", icao: "SBGL", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T21:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        aircraft: null,
        live: null,
      },
      {
        flight_date: "2026-09-13",
        flight_status: "scheduled",
        flight: { iata: "BA249", icao: "BAW249", number: "249", codeshared: null },
        airline: { name: "British Airways", iata: "BA", icao: "BAW" },
        departure: { airport: "Heathrow", timezone: "UTC", iata: "LHR", icao: "EGLL", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T10:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        arrival: { airport: "Galeao", timezone: "UTC", iata: "GIG", icao: "SBGL", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T21:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        aircraft: null,
        live: null,
      },
    ]);

    const result = await discoverFlights(10);
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].flightNumber).toBe("BA249");
  });

  it("handles empty results gracefully", async () => {
    vi.mocked(getRecentFlights).mockResolvedValue([]);

    const result = await discoverFlights(10);
    expect(result.flights).toEqual([]);
    expect(result.retrievedAt).toBeDefined();
  });

  it("handles airline_name from alternative provider format", async () => {
    vi.mocked(getRecentFlights).mockResolvedValue([
      {
        flight_date: "2026-09-13",
        flight_status: "landed",
        flight: { iata: "LH400", icao: "DLH400", number: "400", codeshared: null },
        airline: { airline_name: "Lufthansa", iata_code: "LH" } as any,
        departure: { airport: "Frankfurt", timezone: "UTC", iata: "FRA", icao: "EDDF", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T10:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        arrival: { airport: "JFK", timezone: "UTC", iata: "JFK", icao: "KJFK", terminal: null, gate: null, delay: null, scheduled: "2026-09-13T18:00:00Z", estimated: null, actual: null, estimated_runway: null, actual_runway: null, baggage: null },
        aircraft: null,
        live: null,
      },
    ]);

    const result = await discoverFlights(10);
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].airlineName).toBe("Lufthansa");
    expect(result.flights[0].status).toBe("landed");
  });
});

//Unit tests
// ├── getDelayStatus()
// └── getDelaySummary()

// Service test
// └── investigateFlight()
//       └── with mocked Aviationstack data
