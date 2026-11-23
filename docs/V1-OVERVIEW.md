# Flight Detective V1 Overview

## Purpose

Flight Detective V1 was designed as a lightweight full-stack flight lookup utility. It allows a user to look up a single flight by its IATA/ICAO flight number and view its basic status, route, schedule, delay summary, and any aircraft or live position data provided by the upstream provider.

## Implemented User Flow (V1 Baseline)

1. The user manually enters a flight number in the React frontend.
2. The frontend trims and uppercases the value, then validates its format.
3. The frontend sends an HTTP request to the Express backend.
4. The backend validates the route parameter and queries the Aviationstack API.
5. The backend converts the first returned provider record into the application response model and derives a delay summary.
6. The frontend renders the response cards or displays an error state.

## Technology Stack (V1 Baseline)

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript
- **External Data Provider**: Aviationstack API
- **Testing**: Vitest, React Testing Library, Supertest, Playwright
- **Deployment**: AWS ECS Fargate container deployment

## Flight Number Format

Both frontend and backend validate using:

```regex
^[A-Z][A-Z0-9]{1,2}\d{1,4}$
```

The frontend normalizes input to uppercase before submission. The backend also uppercases the parameter before validating and querying the provider.

## API Routes (V1 Baseline)

### `GET /api/health`
Returns a JSON status and message indicating the backend process is running. Reports process responsiveness without checking the upstream Aviationstack connection.

### `GET /api/flights/:flightNumber`
Looks up a flight by flight number and returns the application `FlightResponse` object.

## Provider and Transformation

The backend sends `access_key` and `flight_iata` query parameters to the Aviationstack flights endpoint. It uses only the first record in the provider response `data` array.

Status values are mapped to application domain statuses (`scheduled`, `in_flight`, `landed`, `cancelled`, `incident`, `diverted`). Departure delay categories are derived as follows:

| Departure Delay (minutes) | Category |
|---|---|
| `0` (or `null`) | `on_time` |
| `1–14` | `minor_delay` |
| `15–59` | `delayed` |
| `60+` | `significant_delay` |

## Error Responses (V1 Baseline)

| HTTP Status | Error Code | Meaning |
|---|---|---|
| `400` | `INVALID_FLIGHT_NUMBER` | The flight number parameter does not match the accepted format. |
| `404` | `FLIGHT_NOT_FOUND` | Aviationstack returned no matching flight records. |
| `500` | `FLIGHT_DATA_UNAVAILABLE` | Provider request or backend processing failed. |

## Persistence and Scope (V1 Baseline)

In the V1 baseline, the backend performed synchronous lookups without local caching, discovery endpoints, rate limiting, or serverless adapters.

---

> [!NOTE]
> For the modern, production-grade architecture featuring the glass-cockpit HUD, interactive vintage boarding pass with perforation tear physics, Great-Circle geodesic route visualizer, real flight discovery engine, multi-tier LRU caching, and zero-cost AWS Lambda Function URL serverless architecture, see [V2 Overview](V2-OVERVIEW.md).
