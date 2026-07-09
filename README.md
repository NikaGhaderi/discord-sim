# Discord-Sim

> A scalable, real-time messaging platform built with a Hybrid Monolith-First architecture.

This repository contains the source code for the **System Analysis and Design** course project at **Sharif University of Technology** (Spring 1404–1405). The platform features real-time WebSocket communication, complex channel/group role management, media sharing, and offline notification caching.

**Course:** System Analysis and Design
**Instructors:** Dr. Jafar Habibi, Dr. Mohsen Hokama
**Phase 1 report:** `[docs/SD-PROJ-6.pdf](docs/SD-PROJ-6.pdf)` — requirements (Agile user stories & MoSCoW), methodology justification, architecture diagrams, ERD, wireframes, and the full API contract.

## The Team


| Member            | Role                              |
| ----------------- | --------------------------------- |
| Parnia Shahsavari | Frontend Developer                |
| Fatemeh Roosta    | Frontend Developer                |
| Samyar Lajevardi  | Product Owner & Backend Developer |
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

Before opening a PR, read **[CONTRIBUTING.md](CONTRIBUTING.md)** . It defines the Definition of Ready/Done, the `type/JIRA-ID-description` branching convention, the `Closes: DSIM-###` PR requirement, and the migration-conflict protocol. All of it is enforced in code review and CI.

Run these in order — steps 1–3 are the one-time setup for a fresh clone:

### 1. Clone and configure

```bash
git clone https://github.com/NikaGhaderi/discord-sim.git
cd discord-sim
cp .env.example .env
# then fill in POSTGRES_USER, POSTGRES_PASSWORD, SECRET_KEY, etc. in .env
```



### 2. Build the frontend once

```bash
cd frontend
npm install
npm run build
cd ..
```

> **Gotcha:** `docker-compose.yml` bind-mounts `frontend/dist` straight into nginx. If you skip this step and go straight to `make up`, Docker will silently create an empty `dist/` folder and nginx will serve a blank page at `/` — the API (`/api`, `/admin`) still works fine, it's just the SPA that's missing. Re-run `npm run build` any time the frontend changes and you want nginx to serve the new build.



### 3. Run the stack

```bash
make up          # docker-compose up -d --build (nginx, web, worker, db, redis)
make logs        # tail the web service logs
make down        # stop everything
```

The app is served through nginx at `http://localhost` (`/api` and `/admin` proxy to Django, `/ws` proxies WebSocket traffic).

### 4. Database migrations

```bash
make migrate          # apply migrations
make makemigrations   # generate new migrations (announce in the team channel first — see CONTRIBUTING.md)
```



### 5. Everyday backend work

```bash
make shell            # docker-compose exec web python manage.py shell
```

Formatting/linting (also enforced by `.pre-commit-config.yaml` and CI):

```bash
docker-compose exec web black .
docker-compose exec web flake8 .
```



### 6. Frontend dev loop

```bash
cd frontend
npm run dev     # Vite dev server with hot reload on :5173
npm run lint
```

Husky runs `npm run lint` automatically on commit.

### 7. Running tests

```bash
make test-backend     # docker-compose exec web pytest
make test-frontend     # frontend unit tests via vitest
```



### 8. CI

Every PR against `main`/`develop` runs `.github/workflows/pr-checks.yml`: backend lint + tests (`black`, `flake8`, `pytest`), frontend lint + tests (`eslint`, `vitest`), and a `docker-compose build` sanity check. A PR cannot merge unless all three jobs pass and it satisfies the Definition of Done in CONTRIBUTING.md.