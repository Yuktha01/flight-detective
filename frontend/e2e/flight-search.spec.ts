import { expect, test } from "@playwright/test";

const flightResponse = {
  flight: {
    number: "SU1531",
    iata: "SU1531",
    icao: "AFL1531",
    status: "in_flight",
    date: "2026-09-28",
  },
  airline: {
    name: "Aeroflot",
    iata: "SU",
    icao: "AFL",
  },
  route: {
    departure: {
      airport: "Sheremetyevo International Airport",
      iata: "SVO",
      icao: "UUEE",
      terminal: "C",
      gate: "12",
    },
    arrival: {
      airport: "Pulkovo Airport",
      iata: "LED",
      icao: "ULLI",
      terminal: "1",
      gate: "4",
    },
  },
  departure: {
    scheduled: "2026-09-28T10:00:00+03:00",
    estimated: "2026-09-28T10:15:00+03:00",
    actual: null,
    delayMinutes: 15,
  },
  arrival: {
    scheduled: "2026-09-28T11:30:00+03:00",
    estimated: null,
    actual: null,
    delayMinutes: 8,
  },
  aircraft: {
    registration: "RA-12345",
    iata: "A320",
    icao: "A320",
  },
  live: {
    updated: "2026-09-28T10:45:00+03:00",
    latitude: 59.93,
    longitude: 30.36,
    altitudeMeters: 10000,
    direction: 180,
    speedKmh: 800,
    speedVertical: 2,
    isGround: false,
  },
  insight: {
    delayMinutes: 15,
    delayStatus: "delayed",
    summary: "This flight is delayed by 15 minutes.",
  },
};

test("searches for a flight and displays its briefing", async ({ page }) => {
  await page.route("**/api/flights/SU1531", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ status: 200, json: flightResponse });
  });

  await page.goto("/");
  const flightNumberInput = page.getByRole("textbox", {
    name: "Flight number",
  });
  const investigateButton = page.getByRole("button", { name: /investigate/i });

  await expect(flightNumberInput).toBeVisible();
  await expect(investigateButton).toBeVisible();
  await flightNumberInput.fill("SU1531");
  await investigateButton.click();

  await expect(page.getByRole("status")).toContainText("CHECKING SU1531");
  await expect(page.getByRole("heading", { name: "SU1531" })).toBeVisible();
  await expect(page.getByText("Aeroflot")).toBeVisible();
  await expect(page.getByText("SVO")).toBeVisible();
  await expect(page.getByText("LED", { exact: true })).toBeVisible();
  await expect(page.getByText("in flight", { exact: true })).toBeVisible();
  await expect(
    page.getByText("This flight is delayed by 15 minutes."),
  ).toBeVisible();
});

test("shows a not-found message for a 404 flight response", async ({
  page,
}) => {
  await page.route("**/api/flights/SU1531", async (route) => {
    await route.fulfill({
      status: 404,
      json: {
        error: {
          code: "FLIGHT_NOT_FOUND",
          message: "We couldn't find that flight.",
        },
      },
    });
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: "Flight number" }).fill("SU1531");
  await page.getByRole("button", { name: /investigate/i }).click();

  await expect(
    page.getByRole("heading", { name: "We could not locate that flight" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "We couldn't find that flight.",
  );
});
