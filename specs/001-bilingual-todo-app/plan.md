# Implementation Plan: Bilingual Todo App

**Branch**: `001-bilingual-todo-app` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-bilingual-todo-app/spec.md`

## Summary

A bilingual (Canadian English / Canadian French) todo single-page app. All user-facing text comes from
Contentful (read through the Delivery API, all locales fetched in one pass and cached for the session),
while the user's tasks live in a json-server mock backend. Switching language is a purely client-side
re-resolution of already-cached content, so it is instant, keeps form input, and needs no reload. French
falls back to English per field in the client, which lets the app mark fallback text with `lang="en"`
(FR-018). Backend and CMS access are each isolated behind a single service so the backend can be swapped
for a real API by configuration alone.

## Technical Context

**Language/Version**: TypeScript (strict) on Angular 22.2.2 (scaffolded with `@angular/cli@22.2.2`, pinned in the scaffold task), Node.js 24 LTS tooling

**Primary Dependencies**: Angular (standalone components, Signals, Router, HttpClient), `contentful` 11.x (Delivery SDK), `@contentful/rich-text-html-renderer` 17.x, `@angular-eslint`, Prettier. Mock backend: `json-server` 0.17.4 (stable line; the 1.0 line is still beta). Tooling: `contentful-migration` 5.x, `contentful-management` (provisioning only).

**Storage**: Contentful space (content, read-only from the app). json-server JSON file (tasks, reset from a seed file on every start). Browser `localStorage` for the language preference only (per-viewer convenience, wrapped in try/catch).

**Testing**: Angular CLI default unit-test runner with Angular testing utilities (Contentful and HTTP mocked); `axe-core` assertions in component tests; Playwright + `@axe-core/playwright` for end-to-end and accessibility, run in both locales. Mock backend: Node test runner for validation middleware.

**Target Platform**: Latest Chrome, Edge, Firefox, Safari; 360px mobile up to desktop.

**Project Type**: Web application (Angular SPA) + local mock backend + Contentful provisioning scripts.

**Performance Goals**: Usable in under 3 s on a typical connection (SC-006); language switch under 1 s (SC-003) via in-memory cache of both locales.

**Constraints**: No literal UI text in templates/components (single allowed exception: one bilingual fallback message). Delivery token and space ID supplied through environment configuration, never committed. Contentful free-tier limits (2 locales, 7 content types, API calls) respected by one batched content load per session.

**Scale/Scope**: Single anonymous user, ~5-50 tasks, 7 content types, ~60-80 UI label entries, 5 screens (list/home, add-edit, delete confirmation, help, not found).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Angular Best Practices | Standalone + OnPush components, Signals, strict TS, lazy feature routes, lint clean | PASS: see Project Structure and research D-01, D-02 |
| II. No Hard-Coded UI Text | No literal strings in templates/TS; lint-enforced | PASS: custom template lint rule + translated key lookup only (D-09); sole exception is the single bilingual fallback message that constitution v1.1.0 permits, shown only when Contentful is unreachable |
| III. Contentful Single Source | One content service; components never call Contentful; per-locale cache; loading/failure handled | PASS: `ContentService` is the only Contentful consumer (D-03, D-04) |
| IV. EN/FR Support | Both locales for every entry; runtime switch; persisted; `<html lang>`; locale-aware formats | PASS: en-CA/fr-CA, `LanguageService`, Angular locale data (D-05, D-06, D-07); a translation check requires French on every entry as the done gate (D-15), runtime English fallback is a safety net only |
| V. WCAG 2.1 AA + Unit Tests | Keyboard, focus, contrast; axe in the local quality gate; unit tests for all new code; Contentful mocked | PASS: native `<dialog>`, axe in unit and e2e, local gate of lint + unit + e2e + axe (D-11) |

Notes: the constitution says "EN/FR"; the spec (clarification Q1) fixes these as `en-CA`/`fr-CA`. No conflict. Re-check after Phase 1: PASS, no violations, so Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-bilingual-todo-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── todos-api.openapi.yaml
│   └── content-model.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
frontend/                          # Angular app
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config/            # environment access (tokens, API base URL)
│   │   │   ├── content/           # ContentService (only Contentful consumer), ContentStore, rich-text, models
│   │   │   ├── i18n/              # LanguageService, translate pipe, locale data, lang-resolver, html-lang sync
│   │   │   ├── api/               # TodoApiService (only backend consumer), error mapping
│   │   │   └── seo/               # PageMetaService (title/description from Page entries)
│   │   ├── features/
│   │   │   ├── todos/             # list page, todo form, todo item, filters bar, delete/clear dialogs, TodoStore
│   │   │   ├── help/              # FAQ page
│   │   │   └── not-found/
│   │   ├── shared/                # header, footer, language switcher, loader, status/toast, error panel, dialog
│   │   ├── app.config.ts
│   │   └── app.routes.ts          # /:lang(en|fr)/... lazy routes
│   ├── environments/              # environment.example.ts (committed), environment.local.ts (gitignored)
│   └── styles/                    # tokens (AA-contrast palette), focus, layout
├── e2e/                           # Playwright specs (EN + FR) with axe
├── eslint-local-rules/            # no-literal-ui-text template rule
└── angular.json, package.json, tsconfig*.json
mock-backend/
├── db.seed.json                   # >= 5 seed tasks
├── server.js                      # json-server programmatic server
├── middleware/                    # validate.js, stamp.js, mock-controls.js (delay / failure)
├── tests/                         # validation middleware tests
└── package.json
contentful/
├── migrations/                    # content-model migrations (7 content types)
├── seed/                          # EN + FR seed entries (JSON) + import script
└── README.md
```

**Structure Decision**: Three top-level folders (`frontend`, `mock-backend`, `contentful`) because the three concerns have different runtimes and owners (app, mock API, CMS provisioning). They share nothing at build time except the documented API contract and content-model contract, so the mock backend can be replaced without touching `frontend/src/app/features`.

## Complexity Tracking

No constitution violations; nothing to justify.
