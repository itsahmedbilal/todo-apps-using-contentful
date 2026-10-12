# Phase 0 Research: Bilingual Todo App

All Technical Context items were resolved from the user's stack choices, the BRD (sections 7, 8, 12), the
spec, and the constitution. No NEEDS CLARIFICATION remained.

## D-01: Angular application shape
- **Decision**: Standalone components only, `ChangeDetectionStrategy.OnPush`, Signals for state (`signal`, `computed`), `HttpClient` + RxJS only at I/O edges, lazy-loaded feature routes, strict TypeScript, ESLint (`angular-eslint`) + Prettier.
- **Rationale**: Matches constitution Principle I; Signals give simple derived state (filtered/sorted list, remaining count) with minimal subscription handling.
- **Alternatives**: NgRx (rejected: overkill for one list); NgModules (rejected: legacy).

## D-02: State management for tasks
- **Decision**: One `TodoStore` (signal-based) holds the full task list, status (`loading | ready | error`), and UI filter state. Filtering, searching, sorting and the remaining count are `computed` values on the client.
- **Rationale**: Dataset is small. Priority sorting needs the `level` from Contentful, which the backend cannot know. Client-side derivation keeps one code path and instant feedback, and keeps the backend contract minimal (plain CRUD), which eases swapping in a real API (MB-05).
- **Alternatives**: Server-side filtering with json-server query params (rejected: priority sort impossible server-side; more round trips). The backend still accepts those parameters per the contract, but the app does not depend on them.

## D-03: Contentful access
- **Decision**: `contentful` SDK (Delivery API, read-only token) wrapped by `ContentService`, the only code that imports it. Entries are fetched with `client.withAllLocales` (equivalent to `locale=*`), one request per content type in parallel, `include` depth 2 for the Page to Empty State reference. Only published entries are returned by Delivery (CG-01).
- **Rationale**: Fetching all locales once gives instant language switching and lets the client know when a value came from fallback (see D-04). Seven small content types means seven requests per session, well inside free-tier limits.
- **Alternatives**: One request per locale per switch (rejected: slower switching, loses fallback awareness); GraphQL API (rejected: not requested, extra setup).

## D-04: Locale fallback
- **Decision**: Contentful locales are `en-CA` (default) and `fr-CA` with fallback locale `en-CA` configured in the space. Because the app requests all locales, the client resolves each field itself: `fr-CA` value, else `en-CA` value, else empty. The resolved value carries the locale it came from, so fallback text renders with `lang="en-CA"` inside a French page (FR-018) and no visible notice.
- **Done gate**: fallback is a runtime safety net only. Every entry must have French before a feature is done (FR-038), enforced by the translation check in D-15.
- **Rationale**: Contentful's server-side fallback only applies when a single locale is requested and hides which locale answered. Client resolution satisfies both LOC-04 and the assistive-technology requirement from clarification Q5.
- **Alternatives**: Rely on server fallback (rejected: cannot mark `lang`).

## D-05: Language identity, URL, and persistence
- **Decision**: URL segment is `en` or `fr` (`/:lang/...`); it maps to `en-CA` / `fr-CA` for Contentful and formatting. Initial language order: URL, `localStorage` (`todo.lang`), `navigator.languages` (primary subtag `en`/`fr`), then `en`. A route guard redirects unsupported or missing segments to the resolved language. A language switch is a navigation that only changes `:lang`, so the page component and any open form are reused and keep their state.
- **Rationale**: Matches LOC-05..LOC-08 and spec FR-014..FR-017. Navigation keeps the URL truthful and bookmarkable.
- **Alternatives**: Query parameter `?lang=` (rejected: BRD asks for `/en/...`, `/fr/...`); full-reload locale builds via Angular i18n (rejected: contradicts no reload and Contentful-sourced text).

## D-06: `<html lang>` and fallback marking
- **Decision**: `LanguageService` sets `document.documentElement.lang` to `en-CA` / `fr-CA`. A `translate` pipe / `ContentText` directive returns `{text, lang}`; the element gets a `lang` attribute only when it differs from the page language.
- **Rationale**: LOC-10 and clarification Q5.

## D-07: Dates and plurals
- **Decision**: Register Angular locale data for `en-CA` and `fr-CA` and format with `DatePipe` passing the active locale. "Items remaining" uses two UI Labels (`one` / `other`) chosen with `Intl.PluralRules(locale)`; counts are substituted into a `{count}` placeholder in the label.
- **Rationale**: LOC-09; French plural rules differ from English (0 and 1 are singular), so rule selection must be locale-aware.
- **Alternatives**: ICU message strings stored in Contentful (rejected: harder for editors).

## D-08: Rich text
- **Decision**: Render Contentful Rich Text (Page intro, FAQ answers) with `@contentful/rich-text-html-renderer` and bind via `[innerHTML]` so Angular's built-in sanitizer applies. Heading levels in rich text are restricted in the content model to avoid skipped heading levels.
- **Rationale**: Small, maintained, safe with sanitization.

## D-09: Enforcing "no hard-coded UI text"
- **Allowed exception**: the single bilingual fallback message shown only when Contentful is unreachable (constitution v1.1.0).
- **Decision**: Local ESLint template rule `no-literal-ui-text` fails on non-whitespace text nodes and on literal values of `aria-label`, `alt`, `title`, `placeholder`, `label` attributes in templates. In TypeScript, all text must be obtained through `ContentService` / the `translate` pipe, and code review checks for literals. Unit tests run each screen with an all-keys-mocked content set whose values are sentinel strings, and assert no other text renders. Playwright runs the same sentinel check in French.
- **Rationale**: Constitution Principle II is non-negotiable and review alone is unreliable.
- **Alternatives**: `i18n` attribute lint rule (rejected: wrong tool, expects Angular i18n).

## D-10: Accessibility approach
- **Decision**: Native `<dialog>` with `showModal()` for delete and clear-completed confirmations (built-in focus trap and Escape), each named by its heading label (`dialog.delete.heading`, `dialog.clearCompleted.heading`) through `aria-labelledby`; images take their `alt` text from the localized `logoAlt` / `illustrationAlt` fields; `aria-live="polite"` region for success messages; overdue state conveyed by an icon plus text label, not colour alone (FR-012); visible focus ring; AA-contrast design tokens validated for both colour-coded badges (category and priority colours come from Contentful, so the app derives a readable text colour and adds a text label). Initial content loading shows a non-text spinner with `aria-busy="true"` on the container, because text is not yet available.
- **Rationale**: Constitution Principle V; WCAG 2.1 AA.
- **Risk**: Editor-chosen badge colours may fail contrast. Mitigation: colour is decoration only; the label is always shown, and the badge text colour is computed for AA against the background.

## D-11: Testing strategy
- **Decision**: Unit tests for every service, pipe, guard, store and component with Contentful and HTTP mocked (`ContentService` replaced by a fake that returns fixture entries in both locales). `axe-core` run in component tests. Playwright specs map to BRD AC-01..AC-07 and run in `en` and `fr`, with `@axe-core/playwright` on every screen. Mock backend validation has Node test-runner tests.
- **Rationale**: Principle V and NFR-08.

## D-12: Mock backend (json-server)
- **Decision**: `json-server` 0.17.4 as a programmatic server (`server.js`) with three middlewares applied before the router: `mock-controls` (artificial delay via `MOCK_DELAY_MS`, simulated failure via `X-Mock-Fail: <status>` header or `MOCK_FAIL_RATE`), `validate` (title 1-120, description max 500, `prioritySlug` required with default `medium`, `dueDate` ISO date; returns 400 with machine-readable error codes), `stamp` (`createdAt`/`updatedAt`; `completed` defaults false). On start the server copies `db.seed.json` to an untracked runtime file, so data resets on every restart (clarification Q2). Seed has 6 tasks across categories and priorities (MB-01).
- **Rationale**: json-server has no validation or timestamps, so middleware is required for MB-02..MB-04. Pinning 0.17.4 avoids the beta 1.0 line's changed query syntax.
- **Error body**: `{ "error": "validation_failed", "fields": [{ "field": "title", "code": "required" }] }`. The backend returns codes, not text; the app maps codes to Contentful UI Labels (FR-035), keeping all text in Contentful.
- **Alternatives**: Angular in-memory web API (rejected: user chose json-server, and an HTTP server proves the real-API swap).

## D-13: Backend replaceability
- **Decision**: `TodoApiService` reads its base URL from environment config and uses only the five endpoints in `contracts/todos-api.openapi.yaml`. `categorySlug`/`prioritySlug` are stored, never translated names (BRD 8.2).
- **Rationale**: MB-05.

## D-14: Configuration and secrets
- **Decision**: `environment.example.ts` is committed; `environment.local.ts` (space ID, environment ID, Delivery token, API base URL) is gitignored and used through `fileReplacements`. Only the Delivery token reaches the browser. The Management token needed by provisioning scripts is read from an environment variable and never written to disk.
- **Rationale**: NFR-06, constitution technical constraints. Note: any token shipped to a browser is visible to users; the Delivery token is read-only and published-content-only, which is acceptable here.

## D-15: Contentful provisioning
- **Decision**: Content model as `contentful-migration` scripts (7 content types per BRD 7) plus a seed import script with EN + FR entries (minimum 20 UI labels listed in the BRD, 4 categories, 3 priorities, home/help pages, an empty state, a few FAQ items). Locale setup (`en-CA` default, `fr-CA` fallback to `en-CA`) is documented as a one-time manual step in `contentful/README.md`. Field validations (required, unique key/slug, length limits) are in the migrations (CG-03).
- **Translation check**: `contentful/scripts/check-translations.mjs` fails when any localized field of any entry lacks an `en-CA` or `fr-CA` value, or when `logo` / `illustration` is set without its localized alt text (`logoAlt`, `illustrationAlt`). It is part of the local quality gate.
- **Rationale**: BRD milestone 1; reproducible model; editors manage everything afterwards (CG-02).

## D-16: Page titles and SEO
- **Decision**: `PageMetaService` sets `document.title` and the meta description from the Page entry for the current route and language, falling back to the App Settings title.
- **Rationale**: FR-027.

## D-17: Missing or deleted references
- **Decision**: A task whose `categorySlug` has no matching published Category shows the `label.uncategorized` UI Label; a missing priority falls back to Medium's label. A UI Label missing in both locales renders nothing (never a raw key) and logs a warning in development.
- **Rationale**: FR-030, constitution Principle III, BRD risk table.

## D-18: Caching
- **Decision**: In-memory cache for the lifetime of the page load (all locales in one load); reload re-fetches, which satisfies AC-05.
- **Rationale**: NFR-02; avoids stale content across sessions.
