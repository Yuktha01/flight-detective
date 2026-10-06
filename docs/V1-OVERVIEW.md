# Flight Detective V1 Overview

## Purpose

Flight Detective lets a user look up one flight by flight number and read
its status, route, schedule, delay information, and any aircraft or live
position data supplied by the provider.

## Implemented user flow

1. The user enters a flight number in the React frontend.
2. The frontend trims and uppercases the value, then validates its format.
3. The frontend calls the Flight Detective backend.
4. The backend validates the route parameter and requests the flight from
   Aviationstack.
5. The backend converts the first returned provider record into the
   application response model and derives a delay summary.
6. The frontend renders the response or displays an appropriate error
   state.

## Technology

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- External data provider: Aviationstack
- Unit/integration testing: Vitest; frontend tests use React Testing Library,
  backend route tests use Supertest
- Browser testing: Playwright

## Flight number format

Both frontend and backend validate using:

```regex
^[A-Z][A-Z0-9]{1,2}\d{1,4}$
```

The frontend normalizes input to uppercase before submission. The backend
also uppercases the parameter before validating and querying the provider.

## API routes

### `GET /api/health`

Returns a JSON status and message indicating the backend is running. It
reports process responsiveness; it does not check the Aviationstack
connection.

### `GET /api/flights/:flightNumber`

Looks up a flight by its flight number and returns the application
`FlightResponse` object.

## Provider and transformation

The backend sends `access_key` and `flight_iata` query parameters to the
Aviationstack flights endpoint. It uses only the first record in the
provider response's `data` array. No record results in a not-found response.

The application maps provider status values into application status values,
normalizes full or compact airline objects, converts missing delay values
to zero, and derives a delay category and summary. Aircraft and live
position fields remain `null` if the provider does not include those
objects.

Delay categories are derived from departure delay:

| Departure delay | Category |
| --- | --- |
| `0` | `on_time` |
| `1–14` | `minor_delay` |
| `15–59` | `delayed` |
| `60+` | `significant_delay` |

The implementation treats a missing (`null`) delay as zero. The category
therefore reflects that mapping; it does not independently verify that the
flight is on time.

## Error responses

| HTTP status | Error code | Meaning |
| --- | --- | --- |
| `400` | `INVALID_FLIGHT_NUMBER` | The path parameter does not match the accepted format. |
| `404` | `FLIGHT_NOT_FOUND` | Aviationstack returned no flight record. |
| `500` | `FLIGHT_DATA_UNAVAILABLE` | Provider request or backend processing failed. |

## Persistence and scope

The backend performs synchronous lookups and does not store flight data.
There is no database, cache, authentication system, queue, or background
worker in the repository implementation.

## Deployment architecture

The application can be deployed using AWS services such as S3, CloudFront,
ECR, ECS, and Secrets Manager. These deployment resources are managed
outside this repository and are not represented as infrastructure-as-code
here.
