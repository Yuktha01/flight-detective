# Flight Detective — Low-Level Design

## 1. Repository structure

```text
frontend/
├── e2e/
│   └── flight-search.spec.ts
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── FlightDetails.tsx
│   │   └── SearchForm.tsx
│   ├── services/
│   │   ├── flightApi.ts
│   │   └── flightApi.test.ts
│   ├── test/
│   │   └── setup.ts
│   ├── types/
│   │   └── flight.ts
│   ├── App.css
│   ├── App.test.tsx
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── playwright.config.ts
└── vite.config.ts

backend/
├── src/
│   ├── routes/
│   │   ├── flightRoutes.test.ts
│   │   └── flightRoutes.ts
│   ├── services/
│   │   ├── aviationstackService.ts
│   │   ├── flightService.test.ts
│   │   └── flightService.ts
│   ├── types/
│   │   ├── aviationstack.ts
│   │   └── flight.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
└── Dockerfile
```

## 2. Frontend modules

### `src/main.tsx`

Creates the React root, enables `StrictMode`, imports global styles, and
renders `App`.

### `src/App.tsx`

Owns the controlled flight-number value and a discriminated search state:
initial, loading, success, not-found, invalid, or generic error. It
normalizes and validates the submitted input before calling the API
service.

### `src/components/SearchForm.tsx`

Renders the labeled text input and submit button. It reports input changes
and form submission through props and displays validation feedback supplied
by `App`.

### `src/services/flightApi.ts`

Constructs the API URL using `VITE_API_BASE_URL` (empty by default), calls
`fetch`, parses JSON, and throws `FlightApiError` for non-success HTTP
responses. The URL path is `/api/flights/:flightNumber`; the path value is
URL-encoded.

### `src/components/FlightDetails.tsx`

Renders summary/status, departure and arrival route, scheduled/estimated/
actual times, delay insight, aircraft fields, and optional live-position
fields. It formats timestamps using the browser locale and timezone.

### `src/types/flight.ts`

Defines the frontend copy of the application response and error response
types.

## 3. Frontend flow and states

```text
SearchForm
  → App validates and normalizes
  → flightApi.getFlight()
  → GET /api/flights/:flightNumber
  → FlightResponse
  → FlightDetails
```

The frontend validates with `^[A-Z][A-Z0-9]{1,2}\d{1,4}$`. The input and
submit button are disabled while loading. A `400` response becomes an
invalid-input state, a `404` response becomes a not-found state, and other
errors become a generic unavailable state.

## 4. Backend modules

### `src/server.ts`

Loads `dotenv/config`, selects `process.env.PORT || 3000`, and starts the
Express app.

### `src/app.ts`

Creates the Express app, enables `cors()` and `express.json()`, mounts the
flight routes at `/api/flights`, and adds the health endpoint.

### `src/routes/flightRoutes.ts`

Defines `GET /:flightNumber`. It uppercases and validates the path
parameter, calls `investigateFlight()`, and responds with a success
payload or a structured error payload.

### `src/services/flightService.ts`

Calls `getFlight()`. If the result is `null`, it returns `null`; otherwise,
it maps provider fields into a `FlightResponse`.

### `src/services/aviationstackService.ts`

Reads `AVIATIONSTACK_API_KEY`, makes a native `fetch` request to
`https://api.apilayer.net/aviationstack/v1/flights`, and sets query
parameters `access_key` and `flight_iata`. A non-OK HTTP response is
logged with its status and body and causes an exception. On success, the
first `data` item is returned, or `null` if the array is empty.

### `src/types/aviationstack.ts` and `src/types/flight.ts`

The first file describes the provider response; the second defines the
application response. The frontend receives the application model, not
the provider model.

## 5. Validation and HTTP contract

Both tiers use:

```regex
^[A-Z][A-Z0-9]{1,2}\d{1,4}$
```

Backend responses:

| Condition | Status | Error code |
| --- | ---: | --- |
| Invalid flight number | 400 | `INVALID_FLIGHT_NUMBER` |
| No provider record | 404 | `FLIGHT_NOT_FOUND` |
| Exception in route processing, including provider error | 500 | `FLIGHT_DATA_UNAVAILABLE` |

Error JSON has the shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

The health response is:

```json
{
  "status": "ok",
  "message": "Flight Detective backend is running"
}
```

## 6. Transformation rules

The response contains `flight`, `airline`, `route`, `departure`, `arrival`,
`aircraft`, `live`, and `insight` fields.

Provider status mapping:

| Aviationstack | Application |
| --- | --- |
| `scheduled` | `scheduled` |
| `active` | `in_flight` |
| `landed` | `landed` |
| `cancelled` | `cancelled` |
| `incident` | `incident` |
| `diverted` | `diverted` |

The airline mapper supports both provider object variants:

- Full form: `airline_name`, `iata_code`, and `icao_code`
- Compact form: `name`, `iata`, and `icao`

Departure and arrival delay values are each mapped from `null` to `0`.
Insight is based on departure delay:

| Delay in minutes | `DelayStatus` |
| ---: | --- |
| 0 | `on_time` |
| 1–14 | `minor_delay` |
| 15–59 | `delayed` |
| 60 or greater | `significant_delay` |

The mapper copies schedule fields, route identifiers, terminal and gate
values. It maps aircraft and live data into app-named fields when present
and returns `null` for either object when absent. Live altitude is named
`altitudeMeters`; horizontal speed is named `speedKmh`.

## 7. Environment variables

| Variable | Used by | Behavior |
| --- | --- | --- |
| `AVIATIONSTACK_API_KEY` | Backend | Required for provider requests. Missing configuration throws and is returned by the route as `500`. |
| `PORT` | Backend | Listening port; defaults to `3000`. |
| `VITE_API_BASE_URL` | Frontend | Optional API origin; when empty, the request path is relative `/api/...`. |

The backend template is `backend/.env.example`. Vite environment values are
build-time frontend configuration, not a place for secrets.

## 8. Vite and browser test configuration

`frontend/vite.config.ts` enables the React plugin, proxies `/api` to
`http://localhost:3000`, and configures Vitest with `jsdom`, a thread pool,
the `src/**/*.{test,spec}.{ts,tsx}` test include pattern, and
`src/test/setup.ts`.

`frontend/playwright.config.ts` runs the `e2e` suite in Chromium and starts
the Vite development server on `127.0.0.1:5173` if needed.

## 9. Tests

- Backend route tests: `backend/src/routes/flightRoutes.test.ts`
  - Covers valid and invalid inputs, not found, success, and service failure.
- Backend service tests: `backend/src/services/flightService.test.ts`
  - Covers delay categories and summaries, transformations, both airline
    shapes, and missing flight results.
- Frontend app tests: `frontend/src/App.test.tsx`
  - Covers empty/loading/success and error states.
- Frontend component tests: `frontend/src/components/SearchForm.test.tsx`
  - Covers rendering, input changes, submit, loading disablement, and
    validation feedback.
- Frontend service tests: `frontend/src/services/flightApi.test.ts`
  - Covers relative and configured API base URLs.
- Playwright tests: `frontend/e2e/flight-search.spec.ts`
  - Covers successful lookup display and not-found feedback with
    intercepted API responses.

## 10. Docker

`backend/Dockerfile` uses separate build, production-dependency, and runtime
stages. The build stage compiles TypeScript. The runtime stage copies
production dependencies and `dist`, runs as the `node` user, sets
`NODE_ENV=production` and `PORT=3000`, exposes port `3000`, and starts
`node dist/server.js`. Runtime configuration, including the API key, is
provided to the container rather than copied into the image.

The repository does not contain a frontend Dockerfile or Docker Compose
file.

## 11. Deployment architecture

The repository contains application code and the backend Dockerfile, but
does not contain infrastructure-as-code for cloud resources. The
application can be deployed using AWS services such as S3, CloudFront,
ECR, ECS, and Secrets Manager; those resources are managed outside this
repository.
