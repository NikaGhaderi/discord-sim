# Contributing to Discord-Sim

This document defines how our team plans, builds, reviews, and ships work. It is
binding for all contributors. If something here is unclear or outdated, raise it
with the Product Owner / Scrum Master rather than silently deviating.

---

## 1. Definition of Ready (DoR)

A ticket may enter a Sprint only if **all** of the following are true:

- [ ] Written in user story format: `As a <role>, I want <capability>, so that <benefit>`.
- [ ] Acceptance Criteria are explicit, testable, and unambiguous (Given/When/Then preferred).
- [ ] Reviewed and approved by the Product Owner.
- [ ] Scoped such that it can realistically be completed within a single sprint.
- [ ] Effort has been estimated by the team (story points / t-shirt size).
- [ ] Any required API contracts (request/response shapes) or wireframes/Figma links are attached to the ticket.
- [ ] Dependencies on other tickets or teams are identified and unblocked.

If any box is unchecked, the ticket stays in the backlog — it does not enter Sprint Planning.

---

## 2. Definition of Done (DoD)

A ticket may be moved to "Done" only if **all** of the following are true:

- [ ] Implementation follows Clean Architecture as defined in `.cursorrules` (no business logic in `api`/views/serializers; logic lives in `application`/`domain`).
- [ ] Code runs locally without errors or unhandled warnings.
- [ ] `docker-compose build` and `docker-compose up` succeed from a clean checkout.
- [ ] Code is formatted and linted (`black`, `flake8` for backend; `eslint`/`prettier` for frontend) with no outstanding violations.
- [ ] 100% of the ticket's Acceptance Criteria are met and manually verified.
- [ ] UI matches the approved wireframes/designs (for frontend tickets).
- [ ] Automated tests are written/updated and passing (unit tests for `domain`/`application`, component tests for frontend modules).
- [ ] A Pull Request is opened against `develop` (or `main` for hotfixes) following the PR template.
- [ ] PR is approved by at least one peer reviewer.
- [ ] Commits are descriptive and reference the Jira ID (see §4).
- [ ] Relevant documentation (`docs/`, README, API contracts) is updated to reflect the change.

---

## 3. Branching Policy

Branch names must follow:

```
type/JIRA-ID-short-description
```

- `type` is one of: `feature`, `bugfix`, `hotfix`, `chore`, `refactor`, `docs`, `spike`.
- `JIRA-ID` is the ticket key, e.g. `DSIM-42`.
- `short-description` is lowercase, hyphen-separated.

**Examples:**
- `feature/DSIM-42-auth`
- `bugfix/DSIM-107-message-ordering`
- `hotfix/DSIM-201-nginx-timeout`

Branches are cut from `develop` (or `main` for `hotfix/*`) and merged back via Pull Request only. Direct pushes to `main`/`develop` are disabled.

---

## 4. Jira Binding Policy

To keep Jira and Git in sync automatically:

- **Branch names MUST contain the Jira ID** (enforced by branch naming convention above).
- **Commits MAY optionally reference the Jira ID** — recommended but not required, e.g.:
  ```
  DSIM-42: add JWT refresh token rotation
  ```
- **Pull Requests MUST contain `Closes: DSIM-###`** in the description (see `.github/pull_request_template.md`). This is what drives automated Jira status transitions (e.g. moving the ticket to "In Review" on PR open, "Done" on merge).
- A PR without a valid `Closes: DSIM-###` reference will not be merged, since it cannot be traced back to a Sprint item.

---

## 5. Database Migration Rules

Django migrations are a common source of merge conflicts and silent data issues. To avoid this:

1. **Announce before generating.** Before running `make makemigrations`, post in the team channel which models/app you're migrating.
2. **First to merge to `develop`/`main` wins.** Their migration file is canonical.
3. **Everyone else rebases.** Anyone else with pending migrations on the same app must:
   - Rebase their branch on the latest `develop`.
   - Delete their now-conflicting migration file(s).
   - Re-run `make makemigrations` to regenerate a migration on top of the merged one.
4. Never hand-edit a merged migration that has already been applied in a shared environment (staging/production). Write a new migration instead.
5. Squash/rename local migrations before opening a PR if you accumulated multiple "fix migration" commits — the PR should contain one clean migration per logical schema change.

---

## 6. Code Style & Tooling

- **Backend (Python):** formatted with `black`, linted with `flake8`. Both run in `pre-commit` and CI (`pr-checks.yml`). No PR merges with lint or format violations.
- **Frontend (React/TypeScript):** formatted with `prettier`, linted with `eslint`. Enforced via Husky pre-commit hook and CI.
- **Imports:** no cross-layer imports that violate `.cursorrules` (e.g. `api` importing an ORM query directly instead of calling an `application` service).
- **Naming:** domain and application classes should read like business language (`SendMessageService`, `Workspace`), not framework language (`MessageView`, `MessageSerializer` are fine only in `api/`).

## 7. Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary> [DSIM-###]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`.

Example: `feat(messaging): add typing indicator broadcast (DSIM-58)`

## 8. Code Review Guidelines

- Review for architecture compliance first (Clean Architecture / Feature-Sliced Design), correctness second, style last (style is automated).
- Reviewers should leave actionable comments, not just "LGTM" — if approving with reservations, say so explicitly.
- Authors should not merge their own PRs, even if technically permitted.
- Prefer requesting changes over long comment threads for anything that blocks the DoD.

## 9. Architecture Decision Records (ADRs)

Non-trivial architectural decisions (e.g. choosing Django vs FastAPI for a given service boundary, introducing a new async task pattern) should be recorded as a short Markdown file under `docs/phase1/adr-XXX-title.md` with: context, decision, consequences. This keeps rationale discoverable without digging through Jira/Slack history.

## 10. Security & Secrets

- Never commit `.env` or real secrets — only `.env.example` with placeholders is tracked.
- Rotate `SECRET_KEY` and database credentials between local, staging, and production; they must never be shared across environments.
- Report suspected secret leaks immediately to the team lead so the credential can be rotated, regardless of whether the commit has been pushed.
