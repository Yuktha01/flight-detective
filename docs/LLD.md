# Flight Detective — Low-Level Design

## 1. Repository structure

```text
frontend/
├── e2e/
│   ├── flight-search.spec.ts
│   └── mobile-layout.spec.ts
├── public/
│   └── hero-aircraft.jpg
├── src/
│   ├── assets/
│   │   └── hero-aircraft.jpg
│   ├── components/
│   │   ├── AirspaceCanvas.tsx
│   │   ├── FlightDetails.test.tsx
│   │   ├── FlightDetails.tsx
│   │   ├── SearchForm.test.tsx
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
├── tsconfig.json
├── tsconfig.node.json
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
│   ├── utils/
│   │   ├── sanitize.test.ts
│   │   └── sanitize.ts
│   ├── app.test.ts
│   ├── app.ts
│   ├── config.test.ts
│   ├── config.ts
│   ├── index.ts
│   ├── lambda.test.ts
│   ├── lambda.ts
│   └── server.ts
├── .env.example
└── Dockerfile

docs/
├── HLD.md
├── LLD.md
├── SYSTEM-DESIGN.md
├── V1-OVERVIEW.md
└── V2-OVERVIEW.md
```

## 2. Frontend modules & UI Architecture

### `src/main.tsx`

Creates the React root, enables `StrictMode`, imports global styles, and
renders `App`.

### `src/App.tsx`

The root application controller and state orchestrator:
- Manages the discriminated search state (`initial`, `loading`, `success`, `not_found`, `invalid_input`, `unavailable`).
- Drives the smart sticky masthead navigation with directional scroll detection (auto-hides on downward scroll $> 8\text{px}$ past threshold, smoothly reveals on upward scroll $\ge 12\text{px}$).
- Provides quick anchor navigation to the search input (`#search-section`) and flight briefing (`#results-section`).
- Handles popular corridor selection pills and triggers immediate investigations.
- Orchestrates the "Surprise Me" real-flight discovery flow by calling `flightApi.getDiscoveredFlights()`.
- Supports manual cache-bypass refreshes via `?refresh=true`.

### `src/components/SearchForm.tsx`

Interactive search form module:
- Renders the labeled text input, submit button, and "Surprise Me" action button.
- **Popular Corridors**: Displays quick-action pills for prominent flight corridors (e.g., JFK→LHR, SFO→HND, LAX→NRT).
- **Ghost Corridor Hint & Tab Auto-Fill**: Inspects user input in real-time, displays an inline matching ghost text suggestion, and auto-completes on <kbd>Tab</kbd> keypress.
- **Client-Side Validation**: Validates flight codes against `^[A-Z][A-Z0-9]{1,2}\d{1,4}$`, providing immediate feedback for invalid entries.

### `src/components/FlightDetails.tsx`

The primary flight briefing interface, composed of two core sections:

1. **Interactive Route Section**:
   - **Vintage Boarding Pass View**: Skeuomorphic retro boarding pass featuring an interactive perforated ticket stub (`.ticket-perf-divider`).
     - *Desktop Physics*: Supports pointer grab, drag, and tear physics with real-time rotation and velocity.
     - *Mobile Drag Gesture*: Pointer capture listener tracking vertical drag (`mobileDragY`). Swiping down $\ge 20\text{px}$ cleanly detaches the stub.
     - *Procedural Audio Rip Synthesis*: Uses Web Audio API oscillator and noise buffer bursts to generate realistic paper tearing sounds without external media files.
     - *Haptic Vibration*: Emits a $25\text{ms}$ vibration pulse via `navigator.vibrate` when torn on supported devices.
     - *Paper Actions*: Allows folding detached stubs into paper airplanes that fly away, crumpling them into paper balls that roll off-screen, or auto-dispensing fresh replacement tickets.
   - **View Toggle**: Switches between the Vintage Boarding Pass and the Great-Circle Geodesic Airspace Canvas (`AirspaceCanvas.tsx`).

2. **Tactical Cockpit Glass HUD & Telemetry**:
   - **Primary Flight Display (PFD)**: Attitude director indicator with artificial horizon sky/ground division (`--pfd-sky`, `--pfd-ground`), pitch ladder markings ($\pm 10^\circ, \pm 20^\circ$), and roll bank angle index.
   - **Tactical Airspace Radar Scope**: 360-degree rotating radar sweep arm with radial sweep gradient, 50NM/100NM concentric range rings, crosshairs, and live pulsating ADS-B blips.
   - **Dual-Unit Telemetry Instruments**:
     - *Altitude*: Displays meters, Flight Level (FL), and feet.
     - *Ground Speed*: Displays km/h, knots, and Mach number.
     - *Vertical Speed*: Displays climb/descent rate and status label (`Climbing`, `Level Flight`, `Descending`).
     - *Heading*: Displays degrees and 8-point cardinal rose (`ENE`, `SW`, etc.).
     - *Coordinates*: Displays decimal degrees and formatted DMS hemisphere transponder fix (`40°38'N 73°46'W`).

### `src/components/AirspaceCanvas.tsx`

High-performance HTML5 2D Canvas component rendering great-circle geodesic flight routes:
- Calculates spherical interpolation between origin and destination coordinates.
- Renders smooth geodesic Bezier curves with neon trail gradients.
- Animates real-time aircraft marker progression along the flight corridor.

### `src/services/flightApi.ts`

Constructs API URLs using `VITE_API_BASE_URL` (empty by default for relative proxying), performs native `fetch` calls, parses JSON responses, and maps errors into typed `FlightApiError` instances:
- `getFlight(flightNumber, refresh?)`: Calls `/api/flights/:flightNumber`.
- `getDiscoveredFlights(refresh?)`: Calls `/api/flights/discover`.

### `src/types/flight.ts`

Frontend domain models mirroring the backend contract: `FlightResponse`, `DiscoveryResponse`, `DiscoveredFlight`, `FlightStatus`, `DelayStatus`, and error shapes.

## 3. Frontend flow and states

```text
SearchForm / Corridor Pill / Surprise Me
  → App validates and normalizes
  → flightApi.getFlight() / getDiscoveredFlights()
  → GET /api/flights/:flightNumber(?refresh=true)
  → FlightResponse
  → FlightDetails (Boarding Pass / Geodesic Canvas + Cockpit HUD)
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
- `GET /api/flights/discover`: Returns a bounded list of real airborne flights.
- `GET /api/flights/:flightNumber`: Investigates and returns flight data.

Supports `?refresh=true` to bypass the in-memory cache. All error loggers sanitize
and redact secret keys using `sanitize.ts`.

### `src/services/flightCache.ts`

In-memory LRU cache (`FlightCache`) storing:
- Successful flight responses (TTL: 120s)
- 404 not-found outcomes (TTL: 60s)
- Discovery flight pools (TTL: 60s)

This protects upstream Aviationstack quota while supporting explicit cache bypass via `?refresh=true`.

### `src/services/flightService.ts`

Calls `getFlight()` or `getRecentFlights()`. Maps raw provider records into
the application-owned `FlightResponse` or `DiscoveryResponse`, deriving delay
status and insight summaries.

### `src/services/aviationstackService.ts`

Reads `AVIATIONSTACK_API_KEY` from environment variables, makes a native `fetch`
request to `https://api.apilayer.net/aviationstack/v1/flights`, and handles errors
with custom typed exception classes. Sanitizes error messages to ensure credentials
or secret-bearing URLs cannot be leaked.

### `src/utils/sanitize.ts`

Utility functions that intercept strings and errors to redact API keys and query parameters matching `access_key=[^&]+`.

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

## 8. Lambda execution characteristics & architectural considerations

- **Stateless & Ephemeral**: Lambda execution containers spin up on demand and shut down after idle periods. Cold starts incur a slight execution delay (~200–500ms).
- **In-Memory Cache Scope**: `FlightCache` is held in container memory. Warm invocations hitting the same microVM share the cache. Concurrent requests on separate microVMs maintain independent caches. Cold starts begin with empty caches.
- **In-Memory Rate Limiting Scope**: `express-rate-limit` maintains counters in memory per container. In multi-instance concurrent bursts, each container enforces its own counter.
- **Reserved Concurrency**: If AWS Reserved Concurrency is configured on the Lambda function, it sets an upper limit on the number of concurrently executing Lambda instances (microVMs), not requests per minute, and must not be treated as a global rate limiter. Invocations arriving when all reserved environments are busy receive HTTP 429.
- **CORS Configuration**: Express is the sole CORS handler. Lambda Function URL CORS must remain unconfigured (None) in AWS to prevent duplicate headers.
- **Architecture**: The bundled deployment package is pure JavaScript with zero native C/C++ addons, providing architecture independence across both ARM64 (AWS Graviton) and x86_64.
- **Timeout Configuration**: The Lambda function must be configured with a 15-second timeout. The upstream Aviationstack provider fetch timeout remains 8 seconds (via `AbortSignal.timeout(8000)`).
- **Cost Isolation**: In keeping with the $0 target constraint, external caching or state layers (such as Redis/ElastiCache or DynamoDB) are deliberately not used.

## 9. Tests

### Backend Tests (103 Tests)
- `backend/src/lambda.test.ts`: Lambda Function URL (Payload v2) event parsing, GET, OPTIONS preflight, CORS headers, query parameters (`?refresh=true`), and response status codes.
- `backend/src/routes/flightRoutes.test.ts`: Valid/invalid inputs, not found, discovery, caching, rate limiting, and provider error mappings.
- `backend/src/services/flightCache.test.ts`: LRU eviction, TTL expiry, deletion, and retrieval.
- `backend/src/services/flightService.test.ts`: Delay categories and summaries, transformations, both airline shapes, and missing flight results.
- `backend/src/services/aviationstackService.test.ts`: Upstream error handling, authentication, network failures, and timeout enforcement.
- `backend/src/utils/sanitize.test.ts`: API key sanitization and error log protection.
- `backend/src/config.test.ts`: Environment parsing, defaults, and invalid configuration rejections.
- `backend/src/app.test.ts`: CORS headers, health checks, and global error handling.

### Frontend Tests (38 Tests)
- `frontend/src/App.test.tsx`: Search lifecycle, empty states, Surprise Me flow, corridor clicks, and cache bypass.
- `frontend/src/components/FlightDetails.test.tsx`: Boarding pass rendering, perforation tear physics, keyboard tear, airplane and crumple animations.
- `frontend/src/components/SearchForm.test.tsx`: Input validation, form submission, and corridor interactions.
- `frontend/src/services/flightApi.test.ts`: URL construction, query parameters, and error mapping.

### Playwright E2E Tests
- `frontend/e2e/flight-search.spec.ts`: Desktop search, loading states, flight briefing rendering, and error flows.
- `frontend/e2e/mobile-layout.spec.ts`: Mobile viewport layout, mobile ticket tear swipe gestures, and responsive masthead behavior.

## 10. Lambda packaging script

`backend/scripts/build-lambda-zip.js`:
- Bundles the TypeScript backend using `esbuild` into a single, self-contained `dist/lambda.js` file with zero runtime `node_modules` dependencies.
- Sets up a clean staging directory with the bundled handler and root shims (`index.js`, `lambda.js`).
- Archives the package into `backend/flight-detective-lambda.zip` (~290 KB).
- Run with `npm run build:lambda` or `npm run package`.
- Target runtime: `Node.js 22.x` on `arm64` or `x86_64`.
