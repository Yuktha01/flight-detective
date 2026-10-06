# Flight Detective

Flight Detective is a full-stack flight lookup application. A user submits
a flight number in the React frontend; the Express backend validates it,
queries Aviationstack, maps the provider response to the application's
response model, and returns a flight briefing to the frontend.

## Repository layout

```text
flight-detective/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── app.ts
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

# Frontend
cd frontend
npm test
npm run test:e2e
npm run lint
npm run build
```

Backend tests use Vitest and Supertest. Frontend unit tests use Vitest and
React Testing Library; browser tests use Playwright.

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
ECR, ECS, and Secrets Manager. These deployment resources are managed
outside this repository and are not represented as infrastructure-as-code
here. This repository documents and contains the frontend and backend
application implementation, not an AWS deployment definition.
