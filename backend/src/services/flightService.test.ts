import { describe, expect, it ,vi} from "vitest";
import { getDelayStatus ,getDelaySummary , investigateFlight} from "./flightService";
import { getFlight } from "./aviationstackService";

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
  it("returns on_time for 0 minutes", () => {
    expect(getDelayStatus(0)).toBe("on_time");
  });

  it("returns minor_delay for 1 minute", () => {
    expect(getDelayStatus(1)).toBe("minor_delay");
  });

  it("returns minor_delay for 14 minutes", () => {
    expect(getDelayStatus(14)).toBe("minor_delay");
  });

  it("returns delayed for 15 minutes", () => {
    expect(getDelayStatus(15)).toBe("delayed");
  });

  it("returns delayed for 59 minutes", () => {
    expect(getDelayStatus(59)).toBe("delayed");
  });

  it("returns significant_delay for 60 minutes", () => {
    expect(getDelayStatus(60)).toBe("significant_delay");
  });

  it("returns the correct summary for an on-time flight", () => {
  expect(getDelaySummary("on_time", 0)).toBe(
    "This flight is currently on time."
  );
});

it("returns the correct summary for a minor delay", () => {
  expect(getDelaySummary("minor_delay", 8)).toBe(
    "This flight has a minor delay of 8 minutes."
  );
});

it("returns the correct summary for a delayed flight", () => {
  expect(getDelaySummary("delayed", 25)).toBe(
    "This flight is delayed by 25 minutes."
  );
});

it("returns the correct summary for a significant delay", () => {
  expect(getDelaySummary("significant_delay", 90)).toBe(
    "This flight has a significant delay of 90 minutes."
  );
});

it("transforms a flight returned by Aviationstack", async () => {
  vi.mocked(getFlight).mockResolvedValue(mockFlight); //When investigateFlight() calls getFlight(), pretend the external API returned mockFlight.

  const result = await investigateFlight("SU1531");

  expect(result?.flight.iata).toBe("SU1531");
  expect(result?.flight.status).toBe("scheduled");
  expect(result?.airline.name).toBe("Aeroflot");
  expect(result?.departure.delayMinutes).toBe(25);
  expect(result?.insight.delayStatus).toBe("delayed");
  expect(result?.insight.summary).toBe(
    "This flight is delayed by 25 minutes."
  );
});

it("returns null when the flight is not found", async () => {
  vi.mocked(getFlight).mockResolvedValue(null);

  const result = await investigateFlight("INVALID");

  expect(result).toBeNull();
});

});


//Unit tests
// ├── getDelayStatus()
// └── getDelaySummary()

// Service test
// └── investigateFlight()
//       └── with mocked Aviationstack data