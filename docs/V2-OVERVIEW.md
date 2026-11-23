# Flight Detective V2 Overview — Aviation-Grade Flight Intelligence Platform

## 1. Executive Summary & Evolution

Flight Detective V2 represents a complete evolution from the V1 single flight lookup prototype into an aviation-grade flight intelligence platform. V2 introduces a retro-modern avionics user experience, real-time ADS-B flight discovery, interactive skeuomorphic flight passes, physics-driven great-circle route visualization, multi-tier caching, and a zero-cost serverless AWS Lambda architecture.

### V1 vs V2 Comparison Matrix

| Capability | V1 Baseline | V2 Modern Platform |
|---|---|---|
| **User Interface** | Basic static result cards | Glass-cockpit HUD (PFD artificial horizon, radar scope, dual telemetry units) |
| **Route Visualization** | Simple text-based route display | Dual view: Interactive Vintage Boarding Pass with perforation tear physics & HTML5 Geodesic Airspace Canvas |
| **Flight Discovery** | Manual flight code input only | One-click real flight discovery ("Surprise Me") sampling active airborne flights |
| **Search Experience** | Standard text input | Popular corridor quick-select pills, ghost corridor hint, and <kbd>Tab</kbd> auto-fill |
| **Audio & Haptics** | None | Procedural paper-tear audio synthesis (Web Audio API) and mobile haptic feedback (`navigator.vibrate`) |
| **Navigation** | Basic header | Scroll-aware sticky masthead with auto-hide/reveal hysteresis and multi-column footer |
| **Backend Architecture** | 24/7 AWS ECS Fargate container | Serverless AWS Lambda Event Function via Lambda Function URL ($0 out-of-pocket target) |
| **Packaging & Build** | Standard container image | Fast esbuild zero-dependency bundling into a ~290 KB self-contained deployment zip |
| **Caching Layer** | None (direct provider queries) | Multi-tier in-memory LRU cache (`FlightCache`) with TTLs and `?refresh=true` cache bypass |
| **Security & Secrets** | Basic environment variables | Centralized API key redaction in logs/errors (`sanitize.ts`), strict CORS, and per-IP rate limiting |
| **Test Coverage** | Initial route and unit tests | 103 backend Vitest tests, 38 frontend Vitest/RTL tests, and Playwright desktop & mobile E2E test suites |

---

## 2. V2 Frontend UI Architecture & Experience

### 2.1 Interactive Vintage Boarding Pass (`FlightDetails.tsx`)

- **Perforation Tear Simulation**:
  - **Desktop Physics**: Supports pointer grab, drag, and tear physics with real-time rotation and velocity.
  - **Mobile Drag Gesture**: Vertical pointer capture tracking downward pull (`mobileDragY`). Pulling down $\ge 20\text{px}$ cleanly detaches the stub.
  - **Procedural Audio Rip Synthesis**: Uses the Web Audio API to procedurally generate authentic white noise rip transients and sub-bass thumps without external media assets.
  - **Mobile Haptic Feedback**: Emits a $25\text{ms}$ vibration pulse via `navigator.vibrate` upon tear completion.
  - **Paper Actions**: Allows folding detached stubs into flying paper airplanes (`handlePaperAirplane()`), crumpling them into paper balls that roll off-screen, or auto-dispensing fresh replacement passes.
- **Flight Information**: Departure and arrival airport IATA codes, cities, terminals, gates, scheduled/estimated/actual timestamps, flight status badge, delay insight category, and transponder readout.

### 2.2 Great-Circle Geodesic Airspace Canvas (`AirspaceCanvas.tsx`)

- **Spherical Geometry**: Computes great-circle waypoints across spherical coordinates between origin and destination airports.
- **Curved Arc Rendering**: Draws glowing Bezier approximations of geodesic trajectories with neon gradient strokes.
- **Live Flight Progress**: Animates aircraft position along the flight corridor matching elapsed flight time or live coordinates.
- **Dual View Mode**: Provides seamless toggle between the Vintage Boarding Pass and the full Airspace Canvas view.

### 2.3 Tactical Cockpit Glass HUD (`FlightDetails.tsx`)

- **Primary Flight Display (PFD)**: Attitude director indicator with artificial horizon sky/ground division (`--pfd-sky`, `--pfd-ground`), pitch ladder markings ($\pm 10^\circ, \pm 20^\circ$), and roll bank angle index.
- **Tactical Airspace Radar Scope**: 360-degree rotating radar sweep arm with glowing radial gradient sweep beam, 50NM/100NM concentric range rings, crosshairs, and live pulsating ADS-B blips.
- **Dual-Unit Telemetry Instruments**:
  - **Altitude**: Displays meters, Flight Level (FL), and feet.
  - **Ground Speed**: Displays km/h, knots, and Mach number.
  - **Vertical Speed**: Displays climb/descent rate and status label (`Climbing`, `Level Flight`, `Descending`).
  - **Heading**: Displays degrees and 8-point cardinal rose (`ENE`, `SW`, etc.).
  - **Coordinates**: Displays decimal degrees and formatted DMS hemisphere transponder fix (`40°38'N 73°46'W`).

### 2.4 Search Experience & Corridors (`SearchForm.tsx`)

- **Popular Route Corridors**: Quick-select buttons for high-traffic routes (`JFK → LHR`, `SFO → HND`, `LAX → NRT`, etc.).
- **Ghost Corridor Hint & Tab Auto-Fill**: Real-time inline suggestion auto-completing on <kbd>Tab</kbd> keypress.
- **Real Flight Discovery ("Surprise Me")**: Queries `/api/flights/discover` to retrieve active airborne flights, selecting one at random for immediate investigation.
- **Cache Refresh Button**: Triggers `?refresh=true` to bypass cached data and retrieve real-time updates.

### 2.5 Smart Masthead & Design System

- **Scroll-Aware Sticky Masthead**: Auto-hides on downward scroll $> 8\text{px}$ past threshold, smoothly reveals on upward scroll $\ge 12\text{px}$.
- **Design Tokens**: Centralized CSS variables for avionics colors (`--bg-primary`, `--accent-sky`, `--cockpit-amber`, `--amber-radar`, `--pfd-sky`, `--pfd-ground`).
- **Responsive Layout**: Mobile-first architecture verified across mobile ($320\text{px} - 480\text{px}$), tablet ($768\text{px} - 1024\text{px}$), and desktop ($\ge 1280\text{px}$).

---

## 3. V2 Backend Architecture & Engineering

### 3.1 Serverless AWS Lambda Execution ($0 Target)

- **Dual Execution Runtime**:
  - Local HTTP server via Express (`src/server.ts`).
  - Serverless AWS Lambda Event Function via `@codegenie/serverless-express` (`src/lambda.ts`), exposed through an AWS Lambda Function URL with auth type `NONE`.
- **Zero Cost at Idle**: Scales completely to zero when idle, taking full advantage of the AWS Always Free tier (1,000,000 free requests/month, 400,000 GB-seconds of compute).
- **Fast esbuild Packaging**: Custom packaging script (`backend/scripts/build-lambda-zip.js`) compiling TypeScript into a single, self-contained `lambda.js` file (~290 KB zip) with zero runtime `node_modules` dependencies.

### 3.2 Multi-Tier In-Memory LRU Cache (`FlightCache`)

Protects upstream Aviationstack API quota with dedicated retention policies:
- **Successful Flight Responses**: 120-second TTL.
- **404 Not Found Responses**: 60-second TTL (prevents quota exhaustion from repeated invalid queries).
- **Flight Discovery Pools**: 60-second TTL.
- **Explicit Cache Bypass**: Clients can append `?refresh=true` to force fresh upstream lookups.

### 3.3 Security, Rate Limiting & Secret Redaction

- **Centralized Log Sanitization (`src/utils/sanitize.ts`)**: Intercepts all error messages and logging to redact secret access keys and query parameters matching `access_key=[^&]+`.
- **Per-IP Rate Limiting**: `express-rate-limit` enforces a default limit of 30 requests per minute per execution container.
- **CORS Isolation**: Handled strictly within Express using `ALLOWED_ORIGINS` and `FRONTEND_URL`; Lambda Function URL CORS remains unconfigured to eliminate duplicate header rejections.

---

## 4. API Endpoints & Error Contract

### Endpoints

| Endpoint | Method | Description | Cache Bypass |
|---|---|---|---|
| `/api/health` | `GET` | Health check reporting service status | N/A |
| `/api/flights/:flightNumber` | `GET` | Returns transformed flight briefing | Supported (`?refresh=true`) |
| `/api/flights/discover` | `GET` | Returns real airborne flights for discovery | Supported (`?refresh=true`) |

### Standardized Error Contract

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `INVALID_FLIGHT_NUMBER` | Flight number does not match `^[A-Z][A-Z0-9]{1,2}\d{1,4}$` |
| `403` | `CORS_FORBIDDEN` | Origin not permitted by CORS policy |
| `404` | `FLIGHT_NOT_FOUND` | No matching flight record returned from upstream provider |
| `429` | `RATE_LIMIT_EXCEEDED` | Exceeded allowed requests per window |
| `500` | `FLIGHT_DATA_UNAVAILABLE` | Provider authentication failure or unhandled exception |
| `502` | `PROVIDER_ERROR` | Upstream network failure, connection refused, or malformed body |
| `503` | `PROVIDER_QUOTA_EXCEEDED` | Upstream monthly API quota or rate limit exceeded |
| `504` | `UPSTREAM_TIMEOUT` | Upstream provider request exceeded 8-second timeout |

---

## 5. Verification & Test Suite

The V2 release includes full test coverage across all layers:

- **Backend (103 Tests)**:
  - `src/lambda.test.ts`: Lambda Function URL event parsing, CORS, preflight, and query parameters.
  - `src/routes/flightRoutes.test.ts`: Route validation, error codes, caching, and rate limiting.
  - `src/services/flightCache.test.ts`: LRU eviction, TTL expiry, deletion, and retrieval.
  - `src/services/flightService.test.ts`: Delay insights, transformations, airline shapes, and discovery.
  - `src/services/aviationstackService.test.ts`: Upstream error handling, timeouts, and auth failures.
  - `src/utils/sanitize.test.ts`: Key redaction and sanitized logging.
  - `src/config.test.ts`: Environment variable validation and defaults.
  - `src/app.test.ts`: CORS headers, health checks, and global error handling.
- **Frontend (38 Tests)**:
  - `src/App.test.tsx`: Search lifecycle, empty states, Surprise Me flow, corridor clicks, and cache bypass.
  - `src/components/FlightDetails.test.tsx`: Boarding pass rendering, perforation tear physics, keyboard tear, airplane and crumple animations.
  - `src/components/SearchForm.test.tsx`: Input validation, form submission, and corridor interactions.
  - `src/services/flightApi.test.ts`: URL construction, query parameters, and error mapping.
- **Playwright E2E Tests**:
  - `e2e/flight-search.spec.ts`: Desktop search, loading states, flight briefing rendering, and error flows.
  - `e2e/mobile-layout.spec.ts`: Mobile viewport layout, mobile ticket tear swipe gestures, and responsive masthead behavior.
