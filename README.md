# PZB Zudatenberechner

Full-stack web application to capture train compositions, clone wagons with identical characteristics, and calculate the three PZB input values (train length, train weight, braking percentage/Bremshundertstel). The project ships with a Docker Compose stack so it can be deployed to platforms such as [Coolify](https://coolify.io) directly from this repository.

## Tech Stack

- **Frontend**: React + Vite (TypeScript), served by Nginx with built-in API proxy
- **Backend**: FastAPI + SQLModel (Python 3.11)
- **Database**: PostgreSQL 15
- **Container Orchestration**: Docker Compose (frontend, backend, database)

## Features

- Create and manage trains with metadata.
- Add wagons with length, weights, brake type, and axle data.
- Clone wagons (single or batch) to speed up entry of identical wagons.
- Automatic aggregation of train length, weight, and Bremshundertstel (BrH).
- REST API (`/api`) powering the frontend; results available as JSON.
- Docker-first setup ready for local development or deployment.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose plugin)
- Optional: Python 3.11 and Node.js 20+ if you want to run services outside containers.

## Quick Start (Docker Compose)

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Frontend: <http://localhost:8080>
- Backend API & docs: <http://localhost:8000/docs>
- PostgreSQL: localhost:5432 (credentials from `.env`)

The frontend container includes an Nginx reverse proxy that forwards `/api/*` requests to the backend, so no extra proxy is required.

## Local Development (non-container)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/pzb
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE=http://localhost:8000/api` in a `.env` file under `frontend/` when working outside Docker.

## Running Tests

Tests for calculations and API endpoints can be added under `backend/tests/` (pytest) and `frontend/src/__tests__/` (Vitest/React Testing Library). Execute them inside the respective containers or local environments once created.

## Deployment on Coolify

1. Push this repository to GitHub.
2. In Coolify, create a new **Docker Compose** application and point it to the repo URL/branch.
3. Paste the contents of `docker-compose.yml` into the Compose editor (or allow Coolify to read it automatically).
4. Add the environment variables from `.env.example` (or customise for production).
5. Assign CPU/RAM limits if desired and deploy.

Coolify will build each service, run the Compose stack, and expose the frontend service. The backend and database remain on the internal Coolify network.

## API Highlights

- `GET /api/trains` – list trains
- `POST /api/trains` – create train
- `POST /api/trains/{train_id}/wagons` – add wagon
- `POST /api/trains/{train_id}/wagons/{wagon_id}/clone?quantity=N` – clone a wagon N times
- `GET /api/trains/{train_id}/calculation` – retrieve computed PZB values

Interactive documentation is available at `/docs` when the backend is running.

## Configuration

Backend configuration is driven by environment variables:

- `DATABASE_URL` – SQLAlchemy connection string.
- `CORS_ORIGINS` – Comma-separated list of allowed origins (defaults to `http://localhost:5173` in dev, `http://localhost:8080` in Compose).

Frontend configuration uses Vite variables at build time:

- `VITE_API_BASE` – Base path for API calls (`/api` by default so Nginx can proxy).

## Roadmap / Next Steps

- Add authentication/authorization for multi-user environments.
- Persist wagon templates for faster data entry.
- Extend calculations with additional PZB rules or country-specific variants.
- Provide CSV/PDF export of train data.
