# Bilingual Todo App

A task manager in English and French. All wording is managed in Contentful; tasks live in a mock backend.
Spec, plan and contracts: [specs/001-bilingual-todo-app/](specs/001-bilingual-todo-app/).

## The three parts

| Folder | What it is | Port |
|--------|------------|------|
| [frontend/](frontend/) | Angular app (standalone components, signals, OnPush). Unit tests, Playwright e2e with axe. | 4200 |
| [mock-backend/](mock-backend/) | json-server REST API for tasks. Resets to `db.seed.json` on every start. | 3000 |
| [contentful/](contentful/) | Content model migrations, seed content (EN + FR), editor tooling. See [EDITORS.md](contentful/EDITORS.md). | n/a |

Rule: no user-visible text is written in code. Every string is a Contentful `uiLabel` (or other entry);
the only exception is the single bilingual "content unavailable" message. A lint rule enforces this.

## Setup

Needs Node.js 24 LTS and a Contentful space with locales `en-CA` (default) and `fr-CA` (fallback `en-CA`).

```powershell
# 1. Contentful (one time). Tokens stay in your shell or the gitignored contentful/.env
cd contentful; npm install
$env:CONTENTFUL_SPACE_ID = "<space id>"
$env:CONTENTFUL_ENVIRONMENT_ID = "master"
$env:CONTENTFUL_MANAGEMENT_TOKEN = "<management token>"
npm run locales; npm run migrate; npm run seed

# 2. Mock backend
cd ../mock-backend; npm install; npm start

# 3. App
cd ../frontend; npm install
Copy-Item src/environments/environment.example.ts src/environments/environment.local.ts
# edit environment.local.ts: space id, environment id, Delivery token, apiBaseUrl
npm start        # http://localhost:4200 -> /en or /fr
```

## Configuration

| Value | Where | Notes |
|-------|-------|-------|
| `contentfulSpaceId`, `contentfulEnvironmentId`, `contentfulDeliveryToken`, `apiBaseUrl` | `frontend/src/environments/environment.local.ts` (gitignored) | Only the read-only **Delivery** token goes in the app. |
| `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT_ID`, `CONTENTFUL_MANAGEMENT_TOKEN` | environment / `contentful/.env` (gitignored) | Provisioning only. Never in the app. |
| `CONTENTFUL_DELIVERY_TOKEN` | environment | Used by `check:translations`. |
| `MOCK_DELAY_MS`, `MOCK_FAIL_RATE` | environment of the mock backend | Show loaders and errors. |

## Commands

| Where | Command | Does |
|-------|---------|------|
| `frontend` | `npm start` / `npm run build` | Dev server / production build |
| `frontend` | `npm run lint` | ESLint, including the no-literal-text rule |
| `frontend` | `npm run test:lint-rules` | Tests for that rule |
| `frontend` | `npm test` | Unit tests (Contentful and HTTP mocked) |
| `frontend` | `npm run e2e` | Playwright in English and French (Chromium) with axe |
| `frontend` | `npm run e2e:cross` | Same, also in Firefox and WebKit |
| `mock-backend` | `npm test` | Backend tests |
| `contentful` | `npm test` | Seed import, locales and translation-check tests |
| `contentful` | `npm run check:translations` | Lists any missing English/French value or alt text |

First-render timing needs a production build: serve `frontend/dist/frontend/browser` with an SPA-fallback
static server and run `PERF_ORIGIN=http://localhost:4300 npx playwright test e2e/polish.spec.ts -g throttled --workers=1`.

The full local quality gate is: `npm run lint`, `npm run test:lint-rules`, `npm test`, `npm run e2e` in
`frontend`; `npm test` in `mock-backend`; `npm test` and `npm run check:translations` in `contentful`.
Manual scenarios: [quickstart.md](specs/001-bilingual-todo-app/quickstart.md).
