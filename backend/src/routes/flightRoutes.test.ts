import request from "supertest";
import { beforeEach,describe, expect, it, vi } from "vitest";
import app from "../app";
import { getFlight } from "../services/aviationstackService";

vi.mock("../services/aviationstackService", () => ({
  getFlight: vi.fn(),
}));

describe("GET /api/flights/:flightNumber", () => {
    beforeEach(() => {
  vi.clearAllMocks();
});

  it("returns 404 when the flight is not found", async () => {
    vi.mocked(getFlight).mockResolvedValue(null);

    const response = await request(app)
      .get("/api/flights/XX9999");

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: {
        code: "FLIGHT_NOT_FOUND",
        message: "We couldn't find that flight.",
      },
    });
  });

  it("returns flight data when the flight is found", async () => {
  vi.mocked(getFlight).mockResolvedValue({
    flight_date: "2026-09-13",
    flight_status: "scheduled",

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
  });

  const response = await request(app)
    .get("/api/flights/SU1531");

  expect(response.status).toBe(200);

  expect(response.body.flight.iata).toBe("SU1531");
  expect(response.body.flight.status).toBe("scheduled");
  expect(response.body.airline.name).toBe("Aeroflot");
  expect(response.body.departure.delayMinutes).toBe(25);
  expect(response.body.insight.delayStatus).toBe("delayed");
});

it("returns 500 when the flight service fails", async () => {
  vi.mocked(getFlight).mockRejectedValue(
    new Error("Aviationstack unavailable")
  );

  const response = await request(app)
    .get("/api/flights/SU1531");

  expect(response.status).toBe(500);

  expect(response.body).toEqual({
    error: {
      code: "FLIGHT_DATA_UNAVAILABLE",
      message: "Flight information is temporarily unavailable.",
    },
  });
});

it("returns 400 for an invalid flight number", async () => {
  const response = await request(app)
    .get("/api/flights/INVALID");

  expect(response.status).toBe(400);

  expect(response.body).toEqual({
    error: {
      code: "INVALID_FLIGHT_NUMBER",
      message: "Please enter a valid flight number.",
    },
  });

  expect(getFlight).not.toHaveBeenCalled();
});
});