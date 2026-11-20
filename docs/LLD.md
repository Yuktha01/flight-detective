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
│   │   ├── AirspaceCanvas.tsx
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
├── scripts/
│   └── build-lambda-zip.js
├── src/
│   ├── routes/
│   │   ├── flightRoutes.test.ts
│   │   └── flightRoutes.ts
│   ├── services/
│   │   ├── aviationstackService.test.ts
│   │   ├── aviationstackService.ts
│   │   ├── flightCache.test.ts
│   │   ├── flightCache.ts
│   │   ├── flightService.test.ts
│   │   └── flightService.ts
│   ├── types/
│   │   ├── aviationstack.ts
│   │   └── flight.ts
│   ├── app.ts
│   ├── config.test.ts
│   ├── config.ts
│   ├── index.ts
│   ├── lambda.test.ts
│   ├── lambda.ts
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
Express app on localhost for local development.

### `src/lambda.ts`

Wraps the Express app using `@codegenie/serverless-express` and exports an
async AWS Lambda Event Function handler (`handler`) compatible with
AWS Lambda Function URLs (Payload Format Version 2.0) and Amazon API Gateway.
Bundled by esbuild into `lambda.js` with handler `lambda.handler`.

### `src/app.ts`

Creates the Express app, disables `trust proxy` (so rate limiting uses the adapter's trusted socket remote address / `sourceIp`), enables `cors()`,
`express.json()`, mounts the flight routes at `/api/flights`, applies the
flight search rate limiter, and adds the `/api/health` endpoint.

### `src/routes/flightRoutes.ts`

Defines:
- `GET /api/flights/discover`: Returns a bounded list of real flights.
- `GET /api/flights/:flightNumber`: Investigates and returns flight data.

Supports `?refresh=true` to bypass the in-memory cache. All error loggers sanitize
and redact secret keys.

### `src/services/flightCache.ts`

In-memory LRU cache (`FlightCache`) storing successful flight responses (TTL: 120s),
404 not-found outcomes (TTL: 60s), and discovery flights (TTL: 60s) to protect
Aviationstack quota.

### `src/services/flightService.ts`

Calls `getFlight()` or `getRecentFlights()`. Maps raw provider records into
the application-owned `FlightResponse` or `DiscoveryResponse`, deriving delay
status and insight summaries.

### `src/services/aviationstackService.ts`

Reads `AVIATIONSTACK_API_KEY` from environment variables, makes a native `fetch`
request to `https://api.apilayer.net/aviationstack/v1/flights`, and handles errors
with custom typed exception classes. Sanitizes error messages to ensure credentials
or secret-bearing URLs cannot be leaked.

### `src/config.ts`

Validates runtime configuration (`AVIATIONSTACK_API_KEY`, `PORT`, `ALLOWED_ORIGINS`,
`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`).

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
| Upstream timeout | 504 | `UPSTREAM_TIMEOUT` |
| Upstream quota / rate limit | 503 | `PROVIDER_QUOTA_EXCEEDED` |
| Upstream provider error | 502 | `PROVIDER_ERROR` |
| Upstream auth failure / server error | 500 | `FLIGHT_DATA_UNAVAILABLE` |
| Rate limit exceeded | 429 | `RATE_LIMIT_EXCEEDED` |
| CORS origin not allowed | 403 | `CORS_FORBIDDEN` |

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

Insight is based on departure delay:

| Delay in minutes | `DelayStatus` |
| ---: | --- |
| 0 | `on_time` |
| 1–14 | `minor_delay` |
| 15–59 | `delayed` |
| 60 or greater | `significant_delay` |

## 7. Environment variables

| Variable | Used by | Behavior |
| --- | --- | --- |
| `AVIATIONSTACK_API_KEY` | Backend | **Required**. Read at runtime from Lambda environment variables; never logged or exposed in client responses. |
| `ALLOWED_ORIGINS` | Backend | Optional comma-separated origins allowed by CORS (e.g. `https://example.com,http://localhost:5173`). |
| `FRONTEND_URL` | Backend | Optional single origin appended to CORS allowed origins. |
| `RATE_LIMIT_WINDOW_MS` | Backend | Rate limiter sliding window in milliseconds (default: `60000`). |
| `RATE_LIMIT_MAX` | Backend | Max requests allowed per window (default: `30`). |
| `PORT` | Backend (Local) | Listening port for `server.ts`; defaults to `3000`. |
| `VITE_API_BASE_URL` | Frontend | Optional API origin; when empty, the request path is relative `/api/...`. |

## 8. Lambda execution environment characteristics & limitations

- **Stateless & Ephemeral**: Lambda execution containers spin up on demand and shut down after idle periods. Cold starts incur a slight execution delay (~200–500ms).
- **In-Memory Cache Scope**: `FlightCache` is held in container memory. Warm invocations hitting the same microVM share the cache. Concurrent requests on separate microVMs maintain independent caches. Cold starts begin with empty caches.
- **In-Memory Rate Limiting Scope**: `express-rate-limit` maintains counters in memory per container. In multi-instance concurrent bursts, each container enforces its own counter.
- **Reserved Concurrency**: If AWS Reserved Concurrency is configured on the Lambda function, it sets an upper limit on the number of concurrently executing Lambda instances (microVMs), not requests per minute, and must not be treated as a global rate limiter. Invocations arriving when all reserved environments are busy receive HTTP 429.
- **CORS Configuration**: Express is the sole CORS handler. Lambda Function URL CORS must remain unconfigured (None) in AWS to prevent duplicate headers.
- **Architecture**: Production dependencies are pure JavaScript without native C/C++ addons, suggesting architecture independence; however, actual execution on ARM64 Graviton2 requires verification in an AWS ARM64 environment.
- **Timeout Configuration**: The Lambda function must be configured with a 15-second timeout. The upstream Aviationstack provider fetch timeout remains 8 seconds (via `AbortSignal.timeout(8000)`).
- **Cost Isolation**: In keeping with the $0 target constraint, external caching or state layers (such as Redis/ElastiCache or DynamoDB) are deliberately not used.

## 9. Tests

- Backend Lambda handler tests: `backend/src/lambda.test.ts`
  - Validates Lambda Function URL (Payload v2) event parsing, GET, OPTIONS preflight, CORS headers, query parameters (`?refresh=true`), and response status codes.
- Backend route tests: `backend/src/routes/flightRoutes.test.ts`
  - Covers valid and invalid inputs, not found, discovery, caching, rate limiting, and provider error mappings.
- Backend cache tests: `backend/src/services/flightCache.test.ts`
  - Validates LRU eviction, TTL expiry, deletion, and retrieval.
- Backend service tests: `backend/src/services/flightService.test.ts`
  - Covers delay categories and summaries, transformations, both airline shapes, and missing flight results.
- Backend config tests: `backend/src/config.test.ts`
  - Validates environment parsing and defaults.
- Frontend tests: `frontend/src/App.test.tsx`, `frontend/src/components/SearchForm.test.tsx`, `frontend/src/services/flightApi.test.ts`.
- Playwright E2E tests: `frontend/e2e/flight-search.spec.ts`.

## 10. Lambda packaging script

`backend/scripts/build-lambda-zip.js`:
- Compiles TypeScript to `backend/dist/`.
- Sets up a staging directory with `dist/` and root shims (`index.js`, `lambda.js`), safely excluding archive files.
- Installs clean production dependencies with `npm install --omit=dev`.
- Archives the package into `backend/flight-detective-lambda.zip` (~1.1 MB).
- Run with `npm run build:lambda` or `npm run package`.
- Target runtime: `Node.js 22.x`.
