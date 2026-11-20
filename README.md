# Flight Detective

Flight Detective is a full-stack flight lookup application. A user submits
a flight number in the React frontend; the Express backend validates it,
queries Aviationstack, maps the provider response to the application's
response model, and returns a flight briefing to the frontend.

## Repository layout

```text
flight-detective/
├── backend/
│   ├── scripts/
│   │   └── build-lambda-zip.js
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── index.ts
│   │   ├── lambda.ts
│   │   └── server.ts
│   └── Dockerfile
├── frontend/
│   ├── e2e/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── services/
│       ├── test/
│       ├── types/
│       ├── App.tsx
│       └── main.tsx
└── docs/
```

The frontend uses React, TypeScript, and Vite. The backend uses Express and
TypeScript. The backend has no database or persistent application storage.

## Run locally

Use separate terminals.

Backend:

```powershell
cd backend
npm install
```

Create `backend/.env` using `backend/.env.example` as a template, then set
`AVIATIONSTACK_API_KEY`. `PORT` is optional and defaults to `3000`.

```powershell
npm run dev
```

Frontend:

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
- `GET /api/flights/:flightNumber` returns a transformed flight record.
- `GET /api/flights/discover` returns a bounded list of real flights for discovery.

Flight numbers are uppercased and validated on both frontend and backend
with `^[A-Z][A-Z0-9]{1,2}\d{1,4}$`. The flight lookup returns:

- `400 INVALID_FLIGHT_NUMBER` for invalid input
- `404 FLIGHT_NOT_FOUND` if the provider returns no flight record
- `500 FLIGHT_DATA_UNAVAILABLE` if the provider request or backend handling
  fails

The backend owns the Aviationstack credential. The browser only calls the
Flight Detective API.

## Tests and build

```powershell
# Backend
cd backend
npm test
npm run build
npm run build:lambda

# Frontend
cd frontend
npm test
npm run test:e2e
npm run lint
npm run build
```

Backend tests use Vitest and Supertest. Frontend unit tests use Vitest and
React Testing Library; browser tests use Playwright.

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

## Documentation

- [V1 overview](docs/V1-OVERVIEW.md)
- [High-level design](docs/HLD.md)
- [Low-level design](docs/LLD.md)
- [System design](docs/SYSTEM-DESIGN.md)

## Deployment architecture

The application can be deployed using AWS services such as S3, CloudFront,
AWS Lambda (with Lambda Function URL), and Lambda Environment Variables. These deployment resources are managed outside this repository and are
not represented as infrastructure-as-code here. This repository documents and
contains the frontend and backend application implementation, not an AWS deployment
definition.
