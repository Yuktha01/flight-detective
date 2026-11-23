# Flight Detective

Flight Detective is a full-stack, aviation-grade flight lookup and real-time tracking application. Users can investigate individual flights by flight number, explore popular flight corridors, or trigger live flight discovery with a single click. The browser interface renders an authentic glass-cockpit HUD, an interactive vintage boarding pass with realistic perforation tear simulation, and great-circle airspace visualizers.

The Express backend validates requests, manages multi-tier LRU caching, queries the Aviationstack API, redacts sensitive secrets, categorizes delay insights, and returns domain-normalized flight data to the React frontend. It supports dual execution: local development via Node/Express and production serverless execution on AWS Lambda via a Lambda Function URL with a $0 out-of-pocket target.

## Repository layout

```text
flight-detective/
├── backend/
│   ├── scripts/
│   │   └── build-lambda-zip.js
│   ├── src/
│   │   ├── routes/
│   │   │   ├── flightRoutes.test.ts
│   │   │   └── flightRoutes.ts
│   │   ├── services/
│   │   │   ├── aviationstackService.test.ts
│   │   │   ├── aviationstackService.ts
│   │   │   ├── flightCache.test.ts
│   │   │   ├── flightCache.ts
│   │   │   ├── flightService.test.ts
│   │   │   └── flightService.ts
│   │   ├── types/
│   │   │   ├── aviationstack.ts
│   │   │   └── flight.ts
│   │   ├── utils/
│   │   │   ├── sanitize.test.ts
│   │   │   └── sanitize.ts
│   │   ├── app.test.ts
│   │   ├── app.ts
│   │   ├── config.test.ts
│   │   ├── config.ts
│   │   ├── index.ts
│   │   ├── lambda.test.ts
│   │   ├── lambda.ts
│   │   └── server.ts
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── e2e/
│   │   ├── flight-search.spec.ts
│   │   └── mobile-layout.spec.ts
│   ├── public/
│   │   └── hero-aircraft.jpg
│   └── src/
│       ├── assets/
│       │   └── hero-aircraft.jpg
│       ├── components/
│       │   ├── AirspaceCanvas.tsx
│       │   ├── FlightDetails.test.tsx
│       │   ├── FlightDetails.tsx
│       │   ├── SearchForm.test.tsx
│       │   └── SearchForm.tsx
│       ├── services/
│       │   ├── flightApi.test.ts
│       │   └── flightApi.ts
│       ├── test/
│       │   └── setup.ts
│       ├── types/
│       │   └── flight.ts
│       ├── App.css
│       ├── App.test.tsx
│       ├── App.tsx
│       ├── index.css
│       └── main.tsx
└── docs/
    ├── HLD.md
    ├── LLD.md
    ├── SYSTEM-DESIGN.md
    ├── V1-OVERVIEW.md
    └── V2-OVERVIEW.md
```

## Core Features & Architecture

### Frontend & UI Architecture Specs

The frontend is built with React 19, TypeScript, and Vite, implementing a retro-modern aviation aesthetic:

- **Tactical Cockpit Glass HUD & Telemetry**:
  - **Primary Flight Display (PFD)**: Artificial horizon attitude indicator showing pitch ladder and roll bank angle index.
  - **Tactical Airspace Radar Scope**: 360-degree rotating radar sweep beam with 50NM and 100NM range rings, crosshairs, ADS-B transponder lock indicator, and real-time blip pulse animations.
  - **Dual-Unit Telemetry Instruments**: Real-time conversions including Altitude (meters, Flight Level FL, and feet), Ground Speed (km/h, knots, and Mach number), Vertical Speed Indicator (climb/descent rates), Heading (compass degrees and 8-point cardinal rose), and Transponder WGS-84 position coordinates.
- **Dual-View Flight Route**:
  - **Interactive Vintage Boarding Pass**: Authentic retro airline boarding pass with an interactive perforated ticket stub. Features physics-based tear sound synthesis via Web Audio API, haptic feedback on mobile (`navigator.vibrate`), pointer grab/drag/tear physics on desktop, and swipe-down pull-to-tear gesture on mobile. Includes paper animations (paper airplane fly-away, crumple-and-roll, auto-dispense fresh ticket).
  - **Great-Circle Geodesic Airspace Canvas**: Interactive HTML5 canvas (`AirspaceCanvas.tsx`) rendering curved great-circle flight paths, origin/destination airport waypoints, animated aircraft blip, and day/night contrast.
- **Search Experience & Real Flight Discovery**:
  - **Live Flight Discovery ("Surprise Me")**: One-click discovery querying active airborne flights from Aviationstack with random sampling and error handling.
  - **Popular Corridor Suggestions**: Quick-select pills for high-traffic corridors (e.g., JFK→LHR, SFO→HND, LAX→NRT) with real-time ghost corridor hint and Tab-key auto-fill completion.
  - **Validation & Cache Refresh**: Client-side regex format validation (`^[A-Z][A-Z0-9]{1,2}\d{1,4}$`), uppercase transformation, and one-click cache-bypass refresh button (`?refresh=true`).
- **Masthead Navigation & Aviation Design System**:
  - Scroll-aware smart sticky masthead (auto-hides on downward scroll past threshold, reveals on upward scroll, with direct anchor navigation to search and briefing sections).
  - High-contrast aviation typography and CSS design tokens (`--bg-primary`, `--accent-sky`, `--cockpit-amber`, `--amber-radar`, `--pfd-sky`, `--pfd-ground`).
  - Responsive multi-column footer with quick navigation, corridor references, and social links.
  - Mobile-first responsiveness and reduced-motion accessibility (`prefers-reduced-motion`).

### Backend Architecture Specs

The backend is built with Node.js, Express, and TypeScript, engineered for high resilience, zero secrets leakage, and cost-free serverless operation:

- **Dual Execution Runtime**: Runs as a standard Express HTTP server (`src/server.ts`) for local development or as a serverless AWS Lambda Event Function via `@codegenie/serverless-express` (`src/lambda.ts`) fronted by an AWS Lambda Function URL ($0 out-of-pocket target).
- **Zero-Dependency Fast esbuild Bundling**: Custom bundling script (`backend/scripts/build-lambda-zip.js`) compiling TypeScript into a single self-contained `lambda.js` file (~290 KB zip) with zero runtime `node_modules` dependencies.
- **Multi-Tier In-Memory LRU Cache (`FlightCache`)**:
  - Successful flight lookups cached for 120 seconds.
  - 404 Not Found responses cached for 60 seconds (protecting upstream quota against repeated invalid lookups).
  - Flight discovery pools cached for 60 seconds.
  - Direct cache bypass support via `?refresh=true` query parameter.
- **Security, Rate Limiting & Key Redaction**:
  - In-memory rate limiting via `express-rate-limit` (default: 30 requests/minute per container).
  - Strict CORS handling configured solely in Express (`ALLOWED_ORIGINS`, `FRONTEND_URL`).
  - Consolidated API key sanitization (`src/utils/sanitize.ts`) that intercepts all logs and error objects to guarantee Aviationstack access keys and secret query parameters are never leaked.
- **Domain Normalization & Delay Categorization**:
  - Strict provider mapping to application statuses (`scheduled`, `in_flight`, `landed`, `cancelled`, `incident`, `diverted`).
  - Derived delay insights (`on_time`, `minor_delay`, `delayed`, `significant_delay`).

## Run locally

Use separate terminals.

### Backend

```powershell
cd backend
npm install
```

Create `backend/.env` using `backend/.env.example` as a template, then set
`AVIATIONSTACK_API_KEY`. `PORT` is optional and defaults to `3000`.

```powershell
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to
`http://localhost:3000`. `VITE_API_BASE_URL` can instead specify an API
origin; it is a frontend build-time value and must not contain secrets.

## API

- `GET /api/health` reports whether the backend process is responding.
- `GET /api/flights/:flightNumber` returns a transformed flight record. Supports optional `?refresh=true` to bypass cache.
- `GET /api/flights/discover` returns a bounded list of real airborne flights for discovery. Supports optional `?refresh=true`.

Flight numbers are uppercased and validated on both frontend and backend
with `^[A-Z][A-Z0-9]{1,2}\d{1,4}$`.

### HTTP Error Contract

| HTTP Status | Error Code | Meaning |
|---|---|---|
| `400` | `INVALID_FLIGHT_NUMBER` | Flight number parameter does not match the accepted format |
| `403` | `CORS_FORBIDDEN` | Origin is not in the allowed CORS origins list |
| `404` | `FLIGHT_NOT_FOUND` | Upstream provider returned no matching flight records |
| `429` | `RATE_LIMIT_EXCEEDED` | Client exceeded maximum allowed search requests per window |
| `500` | `FLIGHT_DATA_UNAVAILABLE` | Provider authentication failure or unhandled exception |
| `502` | `PROVIDER_ERROR` | Upstream network failure, connection refused, or malformed provider response |
| `503` | `PROVIDER_QUOTA_EXCEEDED` | Upstream provider monthly API quota or rate limit exceeded |
| `504` | `UPSTREAM_TIMEOUT` | Upstream provider request exceeded 8-second timeout |

The backend owns the Aviationstack credential. The browser only calls the
Flight Detective API.

## Tests and build

```powershell
# Backend (103 unit, route, service, cache, sanitizer, and Lambda handler tests)
cd backend
npm test
npm run build
npm run build:lambda

# Frontend (38 unit tests, linting, build, and Playwright E2E tests)
cd frontend
npm test
npm run lint
npm run build
npm run test:e2e
```

Backend tests use Vitest and Supertest. Frontend unit tests use Vitest and
React Testing Library; browser E2E tests use Playwright covering both desktop and mobile layouts.

## AWS Lambda Deployment (Target $0 Out-of-Pocket)

The backend Express application supports dual execution modes:
1. **Local Development**: Standard Express HTTP server via `src/server.ts` (`npm run dev` or `npm start`).
2. **AWS Lambda Event Function**: Serverless execution via `@codegenie/serverless-express` in `src/lambda.ts`, exposed through an AWS Lambda Function URL.

### Cost Optimization ($0 Target)
Migrating from AWS ECS Fargate to an AWS Lambda Event Function with a Lambda Function URL eliminates 24/7 container compute costs and API Gateway management fees:
- **AWS Lambda Free Tier**: Includes 1,000,000 free requests per month and 400,000 GB-seconds of compute time per month (e.g. 1,600,000 seconds at 256 MB) indefinitely under the Always Free tier.
- **Lambda Function URL**: Direct HTTP(S) endpoint provided by AWS with $0 fixed hourly or subscription fees (unlike API Gateway or Application Load Balancers).
- **Zero Cost at Idle**: The backend scales completely to zero when not receiving requests.

### Lambda Deployment Package Command
To build the deployment package:

```powershell
cd backend
npm run build:lambda
# or
npm run package
```

This compiles and bundles the TypeScript backend with esbuild into a single, self-contained `lambda.js` file with zero node_modules dependencies, and generates:
- `backend/flight-detective-lambda.zip` (~290 KB)

### AWS Lambda Configuration
When creating or updating the AWS Lambda function in the AWS Console, AWS CLI, SAM, or Terraform:
- **Runtime**: `Node.js 22.x` (Amazon Linux 2023)
- **Architecture**: `arm64` or `x86_64` (The package dependencies are pure JavaScript without native C/C++ addons, bundled into a single JS file).
- **Handler**: `lambda.handler`
- **Memory**: `256 MB` to `512 MB`
- **Timeout**: `15 seconds`. The AWS Lambda function must be configured with a 15-second timeout. The upstream Aviationstack provider fetch timeout remains 8 seconds (bounded via `AbortSignal`), leaving sufficient margin for execution overhead and cold starts.

### Environment Variables
Configure the following environment variables on the Lambda Function:
- `AVIATIONSTACK_API_KEY`: **Required**. The Aviationstack access key. Read securely at runtime; never exposed in source code, client responses, or logs.
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins for CORS (e.g., `https://your-frontend.cloudfront.net,http://localhost:5173`).
- `FRONTEND_URL`: Optional single frontend URL to allow via CORS.
- `RATE_LIMIT_WINDOW_MS`: Optional window for flight route rate limiting in milliseconds (default: `60000`).
- `RATE_LIMIT_MAX`: Optional maximum allowed searches per window (default: `30`).

### Lambda Function URL Configuration
- **Auth Type**: `NONE` (public endpoint protected by CORS, request validation, rate limiting, and backend API key).
- **CORS**: **Must remain unconfigured (set to None)** in the AWS Lambda Function URL configuration. Express is retained as the sole CORS handler. Configuring CORS on both the Function URL and in Express will inject duplicate `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` headers, causing web browsers to reject responses.

### In-Memory Cache and Rate Limiting Behavior
- **Ephemeral State**: Lambda execution environments are ephemeral. Cold starts initialize empty in-memory caches and rate limiter state.
- **Warm Re-use**: Subsequent invocations on the same warm container reuse the in-memory LRU cache (`flightCache`, `discoveryCache`) and rate limiter counters.
- **Instance Isolation & Rate Limiting Scope**: Concurrent executions in separate microVMs maintain independent memory spaces. `express-rate-limit` enforces limits per container instance.
- **Reserved Concurrency**: If AWS Reserved Concurrency is configured on the Lambda function, it sets an upper limit on the number of concurrently executing Lambda instances (microVMs), not requests per minute, and must not be treated as a global rate limiter. Invocations that arrive when all reserved execution environments are busy will be throttled with HTTP 429.
- **Zero-Cost Design**: In accordance with the $0 target constraint, no external paid storage services (Redis, ElastiCache, DynamoDB) are introduced.

## Docker

The backend has a multi-stage Docker build:

```powershell
cd backend
docker build -t flight-detective-backend .
docker run --rm -p 3000:3000 --env-file .env flight-detective-backend
```

The container runs the compiled backend on port `3000`; the Aviationstack
key is provided at runtime rather than baked into the image. There is no
frontend Dockerfile or Compose configuration in this repository.

## Documentation & Architecture Specifications

Detailed architecture and design specifications are maintained in the [`docs/`](docs/) directory:

- [V1 Overview](docs/V1-OVERVIEW.md) — Baseline product requirements, initial user journey, flight number rules, and data mapping principles.
- [V2 Overview](docs/V2-OVERVIEW.md) — Comprehensive V2 specifications: glass-cockpit HUD, vintage boarding pass tear physics, airspace canvas, live flight discovery, multi-tier caching, and zero-cost serverless Lambda architecture.
- [High-Level Design (HLD)](docs/HLD.md) — System boundaries, component topology, sequence diagrams, and deployment architecture.
- [Low-Level Design (LLD)](docs/LLD.md) — Module architecture, frontend and backend implementation specs, test specifications, and Lambda execution details.
- [System Design](docs/SYSTEM-DESIGN.md) — Architectural patterns, request flows, failure modes, trust boundaries, and zero-cost serverless trade-offs.

## Deployment architecture

The application can be deployed using AWS services such as S3, CloudFront,
AWS Lambda (with Lambda Function URL), and Lambda Environment Variables. These deployment resources are managed outside this repository and are
not represented as infrastructure-as-code here. This repository documents and
contains the frontend and backend application implementation, not an AWS deployment
definition.
