# Discord-Sim

> A scalable, real-time messaging platform built with a Hybrid Monolith-First architecture.

This repository contains the source code for the **System Analysis and Design** course project at **Sharif University of Technology** (Spring 1404–1405). The platform features real-time WebSocket communication, complex channel/group role management, media sharing, and offline notification caching.

**Course:** System Analysis and Design
**Instructors:** Dr. Jafar Habibi, Dr. Mohsen Hokama
**Phase 1 report:** `[docs/SD-PROJ-6.pdf](docs/SD-PROJ-6.pdf)` — requirements, methodology justification, architecture diagrams, ERD, wireframes, and the full API contract.

## The Team


| Member            | Role                              |
| ----------------- | --------------------------------- |
| Parnia Shahsavari | Frontend Developer                |
| Fatemeh Roosta    | Frontend Developer                |
| Samyar Lajevardy  | Product Owner & Backend Developer |
| Nika Ghaderi      | Scrum Master & Backend Developer  |


---



## Architecture Overview

Discord-Sim follows a **Monolith-First** system architecture with a **Clean/Layered** code architecture applied pragmatically inside it; the two are deliberately separate decisions:

- **System level** (deployment boundaries): a single Django application process, not a constellation of microservices. This keeps DevOps and deployment complexity low for a 4-person student team on a tight timeline.
- **Code level** (internal structure): each Django app is still split into `domain` / `application` / `api` layers so business logic never leaks into views or serializers. Simpler CRUD-only apps (e.g. `notifications`) are allowed to skip the `application` layer to avoid over-engineering — see `[.cursorrules](.cursorrules)` for the enforced rule.

```
                        ┌──────────────────────────────────────────────────────────────┐
                        │                        nginx (reverse proxy)                 │
                        │   /api, /admin → web   /ws → web   /static, /media   / → SPA │
                        └───────────────────────────┬──────────────────────────────────┘
                                                    │
                                      ┌─────────────┴───────────────┐
                                      │                             │
                            ┌─────────▼──────────┐       ┌──────────▼──────────┐
                            │   web (Django +    │       │  worker (Celery)    │
                            │   DRF + Channels)  │       │  email, media,      │
                            │   REST + WebSocket │       │  scheduled messages │
                            └─────────┬──────────┘       └──────────┬──────────┘
                                      │                             │
                              ┌───────┴────────┐           ┌────────┴───────┐
                              │  PostgreSQL    │           │     Redis      │
                              │  system of     │           │  Celery broker,│
                              │  record        │           │  channel layer,│
                              │                │           │  cache         │
                              └────────────────┘           └────────────────┘
```

**Backend** — Python / Django, Clean Architecture (Domain → Application → API):

- `domain/` — entities and business rules, no framework dependencies.
- `application/` — use-case services orchestrating domain objects.
- `api/` — Django views/serializers/routers; thin adapters only.
- `core/` — Celery wiring and cross-cutting background tasks.
- Django Channels (ASGI) handles WebSocket connections for live messages and notifications alongside the REST API in the same process.

**Frontend** — React + TypeScript + Vite, Feature-Sliced ("Screaming") Architecture:

- `src/modules/<domain>/` — one folder per business domain (identity, workspaces, private_spaces, messaging, notifications, profile), each owning its own components and `__tests`__.
- `src/shared/` — domain-agnostic UI primitives; never imports from `modules/`.
- `src/infrastructure/` — API/WebSocket clients that modules depend on.
- `src/app/` — routing, providers, shell composition only.

**Infrastructure** — Docker Compose orchestrating 5 services: `nginx`, `web`, `worker`, `db` (PostgreSQL), `redis`.

**Workflow** — Agile Scrum, one-week sprints, Jira-integrated (see [CONTRIBUTING.md](CONTRIBUTING.md) for the branching policy, Definition of Ready/Done, and Jira binding rules).

---



## Repository Structure

```
discord-sim/
├── .github/
│   ├── workflows/pr-checks.yml      # CI: backend tests, frontend tests, docker build
│   └── pull_request_template.md
├── docs/
│   └── SD-PROJ-6.pdf                # Phase 1 report (requirements, architecture, ERD, wireframes, API contract)
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf                   # reverse proxy: /api,/admin,/ws → web; / → built SPA
├── frontend/                        # React + TypeScript + Vite (Feature-Sliced Design)
│   ├── src/
│   │   ├── app/                     # routing, providers, shell
│   │   ├── modules/
│   │   │   ├── identity/            # auth & session
│   │   │   ├── workspaces/          # channels, server-level roles
│   │   │   ├── private_spaces/      # DMs & groups
│   │   │   ├── messaging/           # message composition, history, realtime
│   │   │   ├── notifications/       # notification feed
│   │   │   └── profile/             # current user's profile
│   │   │       └── __tests__/
│   │   ├── shared/                  # domain-agnostic UI/utilities
│   │   └── infrastructure/          # API & WebSocket clients
│   ├── eslint.config.js
│   ├── vite.config.ts
│   └── package.json
├── backend/                         # Django (Clean Architecture)
│   ├── config/
│   │   ├── settings/                # base / development / production
│   │   ├── urls.py, wsgi.py, asgi.py, celery.py
│   ├── core/
│   │   └── tasks/                   # Celery background tasks
│   ├── apps/
│   │   ├── authentication/          # domain / application / api / tests
│   │   ├── messaging/                # domain / application / api / tests
│   │   ├── notifications/           # domain / api / tests
│   │   ├── permissions/
│   │   ├── users/
│   │   └── shared/infrastructure/   # cross-app infra (logging, pagination, etc.)
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml                # nginx, web, worker, db, redis
├── Makefile                          # up, down, logs, migrate, test-backend, test-frontend, ...
├── .cursorrules                      # enforced Clean Architecture / Feature-Sliced Design rules
├── .env.example
└── CONTRIBUTING.md                   # DoR/DoD, branching, Jira binding, migration rules
```

---



## Development

Before opening a PR, read **[CONTRIBUTING.md](CONTRIBUTING.md)**. It defines the Definition of Ready/Done, the `type/JIRA-ID-description` branching convention, the `Closes: DSIM-###` PR requirement, and the migration-conflict protocol. All of it is enforced in code review and CI.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — running, not just installed. Start it and wait for "Engine running" before continuing.
- [Node.js](https://nodejs.org/) 20+ (for the frontend, and for the bootstrap script below).

Neither `make` nor `cmake` is required. This project doesn't use CMake at all, and `make` is only a thin convenience alias around the same npm scripts described here — everything works without it.

### Start everything: one command

```bash
git clone https://github.com/NikaGhaderi/discord-sim.git
cd discord-sim
npm run dev
```

(equivalent on a machine with `make` installed: `make run`)

This single command:

1. Creates `.env` from `.env.example` if it doesn't exist yet (safe local-dev defaults, no real secrets committed).
2. Runs `docker-compose up -d --build`, bringing up the backend stack (see the table below).
3. Creates `frontend/.env.local` from `frontend/.env.example` if it doesn't exist yet.
4. Runs `npm install` in `frontend/` if `node_modules` is missing.
5. Starts the Vite dev server in the foreground, streaming its logs to your terminal.

Once it's up, open **[http://localhost:5173](http://localhost:5173)**.

### Stop everything: one command

Press **Ctrl+C** in the terminal running `npm run dev`. This stops the frontend dev server *and* runs `docker-compose down` — no separate teardown step, on Windows or Linux/Mac (verified on both).

To stop the backend containers without going through `npm run dev` (e.g. they were started separately, or a previous run didn't shut down cleanly):

```bash
npm run stop     # equivalent: make down
```



### What gets built and removed, exactly

`docker-compose up -d --build` builds/starts 5 containers (all defined in `docker-compose.yml`):


| Container | Image                 | What it does                                                                                                                                                                                                                                                    |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nginx`   | built from `nginx/`   | Reverse proxy on port 80 — routes `/api/*` and `/admin/*` to `web`, `/ws/*` for WebSocket traffic, serves the built frontend (`frontend/dist`) and Django's static/media files. This is what your browser/frontend actually talks to; never hit `web` directly. |
| `web`     | built from `backend/` | The Django app (via Daphne, ASGI) on an internal port (8000, not published to the host — only reachable through `nginx`). Runs migrations and collects static files on startup.                                                                                 |
| `worker`  | same image as `web`   | Celery worker for background tasks — currently email sending (2FA codes), later thumbnail generation and scheduled messages.                                                                                                                                    |
| `db`      | `postgres:16-alpine`  | The database. Data persists in the named volume `postgres_data`.                                                                                                                                                                                                |
| `redis`   | `redis:7-alpine`      | Cache + Celery broker, and where 2FA challenge codes / temp tokens live (short-lived by design). Data persists in `redis_data`.                                                                                                                                 |
| `mailpit` | `axllent/mailpit`     | Local-dev SMTP catcher — the app sends *real* email (2FA codes, later password reset) to it instead of a real provider. Web UI at **http://localhost:8025** shows everything sent, no credentials needed. Not used in production.                              |


`docker-compose down` (what Ctrl+C / `npm run stop` runs) **stops and removes the containers and the network only** — it does **not** touch the named volumes (`postgres_data`, `redis_data`, `static_volume`, `media_volume`). Your database survives a stop/start cycle. A fully clean slate (wipe the database too) is a separate, explicit, destructive command, never run automatically:

```bash
docker-compose down -v
```



### Useful commands while it's running

```bash
docker-compose ps                    # what's actually running right now
docker-compose logs -f web           # tail Django's logs
docker-compose logs -f worker        # tail Celery worker logs (email sending happens here)
docker-compose logs -f nginx         # tail Nginx access/error logs
```

Open **http://localhost:8025** to see every email the app has sent (2FA codes, etc.) — that's Mailpit's web UI, a local SMTP catcher, no real inbox or credentials involved.

```bash

make shell            # docker-compose exec web python manage.py shell
make migrate          # apply migrations
make makemigrations   # generate new migrations (announce in the team channel first -- see CONTRIBUTING.md)
make test-backend     # docker-compose exec web pytest
make test-frontend    # frontend unit tests via vitest

docker-compose exec web black .    # formatting (also enforced by pre-commit + CI)
docker-compose exec web flake8 .   # linting
```

Frontend-only loop (if you'd rather run `npm run dev` inside `frontend/` directly instead of the root bootstrap — e.g. the backend's already running and you just want to restart the frontend):

```bash
cd frontend
npm run dev
npm run lint
npm test -- --run
```

Husky runs `npm run lint` automatically on commit.

### Manual setup (if you don't want the one-command bootstrap)

1. `cp .env.example .env` (Linux/Mac) or `Copy-Item .env.example .env` (PowerShell) — defaults work locally, no edits required.
2. `docker-compose up -d --build`
3. `cd frontend && cp .env.example .env.local` (or `Copy-Item .env.example .env.local`). It defaults to `VITE_API_BASE_URL=http://localhost` (no `/api` suffix — every endpoint path already includes it) and `VITE_USE_MOCK_API=false`; flip the latter to `true` to develop the UI without Docker running at all.
4. `npm install && npm run dev`

> **Production-style build note:** `docker-compose.yml` bind-mounts `frontend/dist` straight into `nginx`. That directory is only populated by `npm run build` (not by `npm run dev`, which runs its own dev server on :5173 instead). If you build for production and skip this, `nginx` serves a blank page at `/` — the API (`/api`, `/admin`) still works fine either way, it's just the static SPA bundle that's missing.



### CI

Every PR against `main`/`develop` runs `.github/workflows/pr-checks.yml`: backend lint + tests (`black`, `flake8`, `pytest`), frontend lint + tests (`eslint`, `vitest`), and a `docker-compose build` sanity check. A PR cannot merge unless all three jobs pass and it satisfies the Definition of Done in CONTRIBUTING.md.