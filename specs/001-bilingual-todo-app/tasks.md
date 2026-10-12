---

description: "Task list for the Bilingual Todo App"
---

# Tasks: Bilingual Todo App

**Input**: Design documents from `/specs/001-bilingual-todo-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. The project constitution (Principle V) makes unit tests mandatory for all new and changed code and requires axe accessibility checks, so every story includes test tasks. Write each test first and confirm it fails before the implementation task it covers.

**Organization**: Grouped by user story so each can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependencies)
- **[Story]**: User story the task belongs to (US1 to US6)
- Paths follow plan.md: `frontend/`, `mock-backend/`, `contentful/`
- **Text rule (constitution II)**: no task may put literal user-visible text in a template or component. Every string comes from a Contentful `uiLabel` key listed in `contracts/content-model.md`. Tests follow the same rule: e2e and unit tests assert text through Contentful fixture values or `data-testid` / role locators, never literal strings (enforced by the lint step in the ESLint rule task).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the three projects and tooling

- [X] T001 Run `git init -b main` in the repository root and create the feature branch with `git switch -c 001-bilingual-todo-app` (no commit yet); confirm `git status` works
- [X] T002 Create root folders `frontend/`, `mock-backend/`, `contentful/` and a root `.gitignore` that ignores `node_modules/`, `frontend/src/environments/environment.local.ts`, `mock-backend/db.runtime.json`, `.claude/`, `dist/`, `playwright-report/`
- [X] T003 Scaffold the Angular app in `frontend/` with the pinned CLI `npx @angular/cli@22.2.2 new` (standalone components, strict TypeScript, SCSS, routing, no SSR); record the CLI version and the default unit-test runner it generates in `frontend/README.md`; set `ChangeDetectionStrategy.OnPush` as the schematic default in `frontend/angular.json`
- [X] T004 [P] Create `mock-backend/package.json` with `json-server@0.17.4` pinned, scripts `start` and `test` (Node test runner)
- [X] T005 [P] Create `contentful/package.json` with `contentful-migration` and `contentful-management`, scripts `migrate` and `seed`
- [X] T006 [P] Configure `angular-eslint` and Prettier in `frontend/eslint.config.js` and `frontend/.prettierrc`; add `npm run lint` and `npm run format:check`
- [X] T007 [P] Add `@playwright/test` and `@axe-core/playwright` and create `frontend/playwright.config.ts` with two projects (`en`, `fr`) that start at `/en` and `/fr`
- [X] T008 [P] Create `frontend/src/environments/environment.example.ts` (keys `contentfulSpaceId`, `contentfulEnvironmentId`, `contentfulDeliveryToken`, `apiBaseUrl`) and wire `environment.local.ts` through `fileReplacements` in `frontend/angular.json`
- [X] T009 [P] Create design tokens in `frontend/src/styles/tokens.scss` (AA-contrast text/background pairs, visible focus ring) and a 360px-up responsive base layout in `frontend/src/styles/base.scss`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Content source, mock backend, language infrastructure, and the shell. No user story can start until this is complete.

**Checkpoint**: Foundation ready. The app boots at `/en` and `/fr`, loads Contentful content in both locales, and can call the mock backend.

### Contentful provisioning

- [X] T010 [P] Write migration `contentful/migrations/001-app-settings-ui-label.js` creating `appSettings` (`appTitle` Symbol L required max 60; `tagline` Symbol L max 120; `logo` Asset not L; `logoAlt` Symbol L max 120 (required whenever `logo` is set, enforced by the translation check); `footerText` Symbol L max 160; `languageSwitcherLabel` Symbol L required max 60) and `uiLabel` (`key` Symbol not L required unique pattern `^[a-z][A-Za-z0-9.]*$`; `value` Symbol L required max 200; `group` Symbol not L required in Buttons, Forms, Validation, Messages, Filters, Navigation, Status)
- [X] T011 [P] Write migration `contentful/migrations/002-category-priority.js` creating `category` (`name` Symbol L required max 40; `slug` Symbol not L required unique pattern `^[a-z0-9-]+$`; `colour` Symbol not L required pattern `^#[0-9A-Fa-f]{6}$`; `icon` Symbol; `sortOrder` Integer required) and `priority` (`label` Symbol L required max 40; `slug` Symbol not L required unique in low, medium, high; `level` Integer required 1-10; `colour` Symbol required pattern `^#[0-9A-Fa-f]{6}$`)
- [X] T012 [P] Write migration `contentful/migrations/003-empty-state-page-faq.js` creating `emptyState` (`heading` L required max 80; `message` Text L required max 300; `illustration` Asset; `illustrationAlt` Symbol L max 120 (required whenever `illustration` is set, enforced by the translation check); `callToActionLabel` L max 40), `page` (`title` L required max 80; `slug` unique in home, help; `intro` RichText L, headings h2-h3 only; `emptyState` Link to emptyState; `seoTitle` L max 70; `seoDescription` Text L max 160) and `faqItem` (`question` L required max 160; `answer` RichText L required; `sortOrder` Integer required)
- [X] T013 [P] Create seed data `contentful/seed/ui-labels.json` with an English (`en-CA`) and French (`fr-CA`) `value` for every key in the "Required `uiLabel` keys" table of `contracts/content-model.md` (including `{count}` in `message.clearCompletedConfirm` and both `status.itemsRemaining.*`, and `form.dueDate.hint`, `dialog.delete.heading`, `dialog.clearCompleted.heading`); every key MUST have both `en-CA` and `fr-CA` values (FR-038)
- [X] T014 [P] Create seed data `contentful/seed/content.json` with the single `appSettings` entry, categories personal/work/shopping/health, priorities low/medium/high (levels 1/2/3 with colours), pages `home` and `help` (with `emptyState`), one `emptyState`, and at least 3 `faqItem` entries, all in `en-CA` and `fr-CA` for every localized field, including `logoAlt` and `illustrationAlt` for any seeded image
- [X] T015 Write `contentful/seed/import.mjs` that reads both seed files, creates and publishes entries through the Management API using `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT_ID`, `CONTENTFUL_MANAGEMENT_TOKEN` from the environment (never written to disk); safe to re-run (upsert by `key` / `slug`)
- [X] T016 [P] Write `contentful/tests/import.test.mjs` with the Management client mocked: creates then publishes each entry, a second run upserts by `key` / `slug` without duplicates, fails clearly when an environment variable is missing, and never writes a token to disk or logs it
- [X] T017 [P] Write `contentful/README.md` documenting one-time locale setup (`en-CA` default, `fr-CA` with fallback `en-CA`), token creation, and the `migrate` and `seed` commands

### Mock backend

- [X] T018 [P] Create `mock-backend/db.seed.json` with 6 todos across categories personal/work/shopping/health and priorities low/medium/high, at least one completed, one with a past `dueDate`, one without `dueDate`; each has the fields in `data-model.md`
- [X] T019 [P] Implement `mock-backend/middleware/mock-controls.js`: delay from `MOCK_DELAY_MS`, random 500 at rate `MOCK_FAIL_RATE`, and a per-request `X-Mock-Fail: <status>` header
- [X] T020 [P] Implement `mock-backend/middleware/validate.js` for POST/PUT/PATCH returning `400 {error:"validation_failed", fields:[{field,code}]}` for: `title` required, trimmed 1-120 characters (`required` / `tooLong`); `description` up to 500 characters (`tooLong`); `prioritySlug` required with default `medium`; `dueDate` ISO date `YYYY-MM-DD` (`invalid`)
- [X] T021 [P] Implement `mock-backend/middleware/stamp.js` setting `createdAt` on create, `updatedAt` on every change, and `completed` default `false`
- [X] T022 Implement `mock-backend/server.js` (json-server 0.17.4 programmatic): copies `db.seed.json` to `db.runtime.json` on every start, applies middlewares in order mock-controls, validate, stamp, then the router; returns `404 {error:"not_found"}` for unknown ids and `{error:"server_error"}` on failures; listens on port 3000 (depends on T018-T021)
- [X] T023 [P] Write Node test-runner tests in `mock-backend/tests/validation.test.js`, `stamp.test.js`, `mock-controls.test.js` covering title 0/1/120/121 characters, description 500/501, bad date, default priority, timestamps, 404, delay and forced failure

- [X] T024 [P] Write `mock-backend/tests/server.test.js`: starting the server copies `db.seed.json` to `db.runtime.json` (so added tasks are gone after a restart), serves at least 5 seed tasks on `GET /todos`, unknown id returns `404 {error:"not_found"}`, forced failure returns `{error:"server_error"}`, and middlewares run in the order mock-controls, validate, stamp

### Frontend foundation

- [X] T025 [P] Create `frontend/src/app/core/config/app-config.ts` exposing environment values through an injectable `AppConfig`
- [X] T026 [P] Create `frontend/src/app/core/content/content.models.ts` with `LocalizedField<T>`, `ResolvedText`, `ContentSnapshot`, and entry types (including `logoAlt` and `illustrationAlt`) for `appSettings`, `uiLabel`, `category`, `priority`, `page`, `emptyState`, `faqItem` per `data-model.md`
- [X] T027 [P] Create `frontend/src/app/core/i18n/locales.ts` mapping URL language `en`/`fr` to `en-CA`/`fr-CA` and registering Angular locale data for both
- [X] T028 [P] Write `frontend/src/app/core/i18n/locales.spec.ts` (URL `en`/`fr` map to `en-CA`/`fr-CA`, unsupported values rejected, both Angular locale data registered) and `frontend/src/app/core/config/app-config.spec.ts` (environment values exposed through `AppConfig`, none logged or exposed beyond the Delivery token)
- [X] T029 Implement `frontend/src/app/core/content/content.service.ts`, the only file importing `contentful`: fetch all seven content types in parallel with `withAllLocales`, include depth 2, return raw localized entries; throw a typed `ContentUnavailableError` on failure
- [X] T030 [P] Write `frontend/src/app/core/content/content.service.spec.ts` with the SDK mocked: all types requested, locales preserved, failure raises `ContentUnavailableError`
- [X] T031 Implement `frontend/src/app/core/i18n/language.service.ts`: active language signal; initial order URL, `localStorage` key `todo.lang` (try/catch), `navigator.languages` primary subtag `en`/`fr`, then `en`; exposes `urlLang`, `locale`; `setLanguage()` persists the choice
- [X] T032 [P] Write `frontend/src/app/core/i18n/language.service.spec.ts` covering every step of the resolution order, unsupported values, and storage access throwing
- [X] T033 Implement `frontend/src/app/core/content/content.store.ts` (signal store): loads once on app start, status `idle | loading | ready | error` with `retry()`, resolves each field `fr-CA`, else `en-CA`, else empty into `ResolvedText` (with source `lang`), indexes labels by key, categories by slug sorted by `sortOrder` and priorities by slug sorted by `level` (highest first), pages by slug, FAQ sorted; `text(key, params?)`; `plural(baseKey, count)` using `Intl.PluralRules`; a key missing in both locales yields empty text and a development warning, never the key
- [X] T034 [P] Write `frontend/src/app/core/content/content.store.spec.ts`: fallback per field, `lang` tagging, plural selection for 0/1/2 in `fr-CA` and `en-CA`, `{count}` substitution, missing key yields empty, retry after failure
- [X] T035 Implement `frontend/src/app/core/i18n/translate.pipe.ts` and `frontend/src/app/core/i18n/content-text.directive.ts`: pipe returns resolved text for a key; directive sets `lang` on the host only when the text came from a different language than the page
- [X] T036 [P] Write `frontend/src/app/core/i18n/translate.pipe.spec.ts` and `content-text.directive.spec.ts`
- [X] T037 [P] Create `frontend/src/app/core/api/todo.models.ts` (`Todo`, `TodoInput`, `TodoPatch`, `ApiError` per `contracts/todos-api.openapi.yaml`) and `frontend/src/app/core/api/todo-api.service.ts`, the only backend consumer, using `AppConfig.apiBaseUrl`: `list`, `get`, `create`, `update`, `patch`, `remove`; maps HTTP 400 field codes to `{field, code}` and other failures to a typed `ApiUnavailableError`
- [X] T038 [P] Write `frontend/src/app/core/api/todo-api.service.spec.ts` with `HttpTestingController` for all five endpoints, 400 mapping, 404 and 500
- [X] T039 Implement `frontend/src/app/app.routes.ts` and `frontend/src/app/app.config.ts`: routes `/:lang` (guard accepts `en`/`fr` only, otherwise redirects to the resolved language), a lazy child for todos (default) and a `**` route to the not-found page (the Help route is added in the Help page task); load content with `provideAppInitializer` that does not block rendering of the shell; provide `LOCALE_ID` handling per research D-07
- [X] T040 [P] Write `frontend/src/app/app.routes.spec.ts` covering redirect for missing/unsupported language, `/en` and `/fr` accepted, unknown path shows not-found (depends on T043 for the not-found page)
- [X] T041 [P] Create `frontend/src/app/core/content/fallback-message.ts`, the single allowed hard-coded text (constitution Principle II): ONE bilingual constant holding the whole "content unavailable, try again" message in English and French, with the retry button wording included inside that same constant, so no other hard-coded string exists in the app; it is shown only when Contentful is unreachable, never for any other error or screen. Also create `frontend/src/app/shared/content-unavailable/content-unavailable.component.ts` that shows it when content status is `error`, with a spec asserting it renders only that constant and only in the error state
- [X] T042 [P] Create shared shell components in `frontend/src/app/shared/` (each standalone, OnPush, text only via keys, with spec files): `app-shell` (skip link `nav.skipToContent`, landmarks), `header` (logo with `alt` from the localized `logoAlt`, `appTitle`, `tagline`, nav with the `nav.home` link only for now, labelled `nav.main.label`; the `nav.help` link is added together with the Help route), `footer` (`footerText`), `loader` (non-textual spinner with `aria-busy="true"` on its container), `status-region` (`aria-live="polite"` for success messages), `error-panel` (message + `button.retry`)
- [X] T043 [P] Implement the localized not-found page `frontend/src/app/features/not-found/not-found.page.ts` using `notFound.heading`, `notFound.message`, `notFound.backHome`, routed from the `**` route in `frontend/src/app/app.routes.ts`, with spec `not-found.page.spec.ts` (axe clean, no literal text)
- [X] T044 [P] Implement the local ESLint template rule in `frontend/eslint-local-rules/no-literal-ui-text.js` failing on non-whitespace text nodes and literal `aria-label`, `alt`, `title`, `placeholder`, `label` attribute values in `*.html` templates, with a rule test file and wired into `frontend/eslint.config.js`; extend the same lint step to `frontend/e2e/**/*.ts` and all `*.spec.ts` files so it fails on literal strings in text locators and assertions (`getByText`, `getByLabel`, `getByRole` with a literal `name`, `toHaveText`, `toContainText`), and require text to be asserted through Contentful fixture values (from `frontend/src/testing/fake-content.ts` or the intercepted Contentful response) or `data-testid` / role locators; include one failing and one passing example in the rule tests
- [X] T045 [P] Create test helpers in `frontend/src/testing/`: `fake-content.ts` (fixture snapshot with sentinel values per key in both locales and one key missing in `fr-CA`), `assert-no-literal-text.ts` (fails if rendered text is not a sentinel), `axe.ts` (runs `axe-core` and fails on any violation)

---

## Phase 3: User Story 1 - Manage my tasks (Priority: P1) 🎯 MVP

**Goal**: View, add, edit, complete/incomplete and delete (with confirmation) tasks, with success, empty, loading and error states.

**Independent Test**: Add a task, edit it, mark it complete, delete it with confirmation. The list reflects each change, and success messages show after saving and deleting. Empty list shows the empty state; backend failure shows an error with retry.

### Tests for User Story 1 (write first, confirm they fail)

- [X] T046 [P] [US1] `frontend/src/app/features/todos/todo.store.spec.ts`: load success/failure, add, update, toggle complete, delete, `retry`, repeated rapid toggles do not duplicate requests
- [X] T047 [P] [US1] `frontend/src/app/features/todos/todo-form/todo-form.component.spec.ts`: empty title blocked with `validation.title.required`; title of 120 characters accepted and 121 gives `validation.title.tooLong`; description 500 accepted and 501 gives `validation.description.tooLong`; invalid date gives `validation.dueDate.invalid`; past due date accepted; backend 400 codes mapped to the same messages; axe clean; no literal text
- [X] T048 [P] [US1] `frontend/src/app/features/todos/todo-item/todo-item.component.spec.ts`: shows title and description exactly as typed, due date in the active locale, toggle/edit/delete emit the right events, each action button's accessible name combines its label with the task title (`aria-labelledby` pointing at the button label and the title element, so two rows never have identical names), axe clean, no literal text
- [X] T049 [P] [US1] `frontend/src/app/features/todos/todo-list.page.spec.ts`: loader while loading, list rendered, empty state with heading, message and illustration `alt` from `illustrationAlt`, error panel with retry on failure, `message.itemSaved` / `message.itemDeleted` in the status region, delete flow shows `dialog.delete.heading` and only deletes after confirm, no literal text
- [X] T050 [P] [US1] `frontend/src/app/shared/confirm-dialog/confirm-dialog.component.spec.ts`: opens modal, focus trapped, Escape cancels, confirm and cancel buttons use `button.confirm` / `button.cancel`, dialog named by its heading label through `aria-labelledby`
- [X] T051 [P] [US1] `frontend/e2e/us1-manage-tasks.spec.ts` (runs in `en` and `fr`): AC-03, AC-04 and AC-06 from the BRD plus edit, toggle and delete-with-confirm; axe on list and form

### Implementation for User Story 1

- [X] T052 [US1] Implement `frontend/src/app/features/todos/todo.store.ts`: signal store over `TodoApiService` (list, add, update, toggle, remove), `status`, error state, last-action message key for the status region, in-flight guard against duplicate actions (depends on T037)
- [X] T053 [P] [US1] Implement `frontend/src/app/shared/confirm-dialog/confirm-dialog.component.ts` using native `<dialog>` and `showModal()`, heading and message passed as resolved text and the dialog named through `aria-labelledby`
- [X] T054 [P] [US1] Implement `frontend/src/app/features/todos/todo-form/todo-form.component.ts` (title, description, due date; priority defaults to `medium`; labels from `form.*`; inline errors from `validation.*`; saved text trimmed; titles and descriptions never translated)
- [X] T055 [P] [US1] Implement `frontend/src/app/features/todos/todo-item/todo-item.component.ts` (title, description, due date formatted with the active locale, complete toggle with `button.markComplete` / `button.markIncomplete`, `button.edit`, `button.delete`); every action button takes its accessible name from `aria-labelledby` combining the button's own label element and the task title element, so the name includes the task title without any literal text
- [X] T056 [US1] Implement `frontend/src/app/features/todos/todo-list.page.ts` and route entry: add/edit form, list, empty state from the `home` Page `emptyState` (heading, message, illustration with `alt` from `illustrationAlt`, call-to-action opens the add form), loader while loading, `error-panel` with `button.retry` on failure (`message.error.load`), success messages `message.itemSaved` / `message.itemDeleted` in the status region, delete confirmation headed by `dialog.delete.heading` with `message.deleteConfirm`
- [X] T057 [US1] Wire the todos page as the default child route in `frontend/src/app/app.routes.ts` and make the app shell render it with header and footer
- [X] T058 [US1] Run lint, unit tests and `us1-manage-tasks` e2e; fix failures

**Checkpoint**: US1 is a working MVP in the default language.

---

## Phase 4: User Story 2 - Use the app in English or French (Priority: P1)

**Goal**: Switch between English and French at any time; the choice is remembered; URL, `<html lang>`, dates and fallback text behave per spec.

**Independent Test**: Switch to French; all text, dates and URL change, task text does not, no reload, open form input is kept. Reopen the app and French is still selected.

### Tests for User Story 2

- [X] T059 [P] [US2] `frontend/src/app/shared/language-switcher/language-switcher.component.spec.ts`: shows the other language's name (`language.name.fr` / `language.name.en`), labelled by `languageSwitcherLabel`, keyboard operable, axe clean
- [X] T060 [P] [US2] `frontend/src/app/core/i18n/html-lang-sync.service.spec.ts`: `document.documentElement.lang` is `en-CA` / `fr-CA` and updates on switch
- [X] T061 [P] [US2] `frontend/src/app/features/todos/todo-list.language.spec.ts`: switching language keeps the same component instance and unsaved form values; user task text unchanged; dates formatted per locale; fallback text carries `lang="en-CA"` in `fr`
- [X] T062 [P] [US2] `frontend/e2e/us2-language.spec.ts`: AC-01, AC-02, AC-07; order URL over saved preference over browser language over English; no full page reload during switch; sentinel check that no literal text appears in `fr`

### Implementation for User Story 2

- [X] T063 [US2] Implement `frontend/src/app/shared/language-switcher/language-switcher.component.ts` in the header: navigates to the same route with the other `:lang` segment and calls `LanguageService.setLanguage()` to persist
- [X] T064 [P] [US2] Implement `frontend/src/app/core/i18n/html-lang-sync.service.ts` setting `<html lang>` from the active locale, started in `frontend/src/app/app.config.ts`
- [X] T065 [US2] Apply locale-aware date formatting everywhere dates render (`todo-item`, form hint) via `DatePipe` with the active locale, and show the date-format hint under the due-date field from `form.dueDate.hint`; ensure no hard-coded date format strings in templates
- [X] T066 [US2] Ensure fallback marking is applied on every template that prints content (header, footer, labels, rich text) using `content-text.directive.ts` from T035
- [X] T067 [US2] Run lint, unit and e2e; fix failures

**Checkpoint**: US1 and US2 work together; the product is bilingual end to end.

---

## Phase 5: User Story 3 - Organise tasks with categories and priorities (Priority: P2)

**Goal**: Assign a category and priority per task, with names in the active language and graceful handling of removed categories.

**Independent Test**: Create a task with a category and priority in English, switch to French, same category and priority show French names. Removing a category leaves tasks showing the uncategorized label.

### Tests for User Story 3

- [X] T068 [P] [US3] `frontend/src/app/features/todos/todo-form/todo-form.options.spec.ts`: category and priority options are in `sortOrder` / `level` order, in the active language, with `form.category.none`; priority default `medium`
- [X] T069 [P] [US3] `frontend/src/app/shared/badge/badge.component.spec.ts`: text label always rendered, text colour computed for AA contrast against any hex background, orphan category shows `status.uncategorized`, unknown priority shows the Medium label
- [X] T070 [P] [US3] `frontend/e2e/us3-categories.spec.ts`: AC-05 (new category published appears after reload in both languages) and language switch keeps a task's category and priority

### Implementation for User Story 3

- [X] T071 [P] [US3] Add category and priority selects to `todo-form.component.ts` populated from `ContentStore` in the active language (`form.category.label`, `form.priority.label`)
- [X] T072 [P] [US3] Implement `frontend/src/app/shared/badge/badge.component.ts` (colour from Contentful, computed readable text colour, text label always visible) and use it in `todo-item.component.ts` for category and priority
- [X] T073 [US3] Add lookup helpers to `content.store.ts` (`categoryName(slug)`, `priorityLabel(slug)`) with the orphan and unknown fallbacks (FR-030) and update their specs in `content.store.spec.ts`
- [X] T074 [US3] Run lint, unit and e2e; fix failures

---

## Phase 6: User Story 4 - Find and focus on the right tasks (Priority: P2)

**Goal**: Filter by status, category, priority; search by title; sort by due date, priority, created date; show remaining count.

**Independent Test**: With mixed tasks, apply each filter, search and sort and confirm the list narrows and reorders; remaining count matches active tasks.

### Tests for User Story 4

- [X] T075 [P] [US4] `frontend/src/app/features/todos/todo-filters.spec.ts`: status, category, priority combine with AND; case-insensitive title search; due-date sort ascending with no-date last; priority sort by `level` descending with due-date tiebreak; created-date sort newest first; remaining count updates after add, complete and delete; empty result shows `message.noResults`
- [X] T076 [P] [US4] `frontend/src/app/features/todos/filters-bar/filters-bar.component.spec.ts`: controls labelled by `filter.*`, `sort.*`, `search.*` keys, keyboard operable, axe clean, plural remaining text in `en` and `fr` (0, 1, 2)
- [X] T077 [P] [US4] `frontend/e2e/us4-filters.spec.ts` in both languages

### Implementation for User Story 4

- [X] T078 [US4] Add `TodoFilterState` and `computed` `visibleTodos`, `remainingCount` to `todo.store.ts` per `data-model.md` sorting rules
- [X] T079 [US4] Implement `frontend/src/app/features/todos/filters-bar/filters-bar.component.ts` (status all/active/completed, category, priority, sort, search with `button.clearSearch`) using `filter.*`, `sort.*`, `search.*` keys
- [X] T080 [US4] Show remaining count using `status.itemsRemaining.one` / `.other` via `ContentStore.plural`, and the no-results message, in `todo-list.page.ts`
- [X] T081 [US4] Run lint, unit and e2e; fix failures

---

## Phase 7: User Story 5 - Editors update all text without a developer (Priority: P2)

**Goal**: Editors manage every piece of wording in both languages in Contentful; only published content reaches users; translation gaps are detectable.

**Independent Test**: An editor changes a label in both languages and publishes; reload shows it. A draft is not shown.

### Tests for User Story 5

- [X] T082 [P] [US5] `contentful/tests/check-translations.test.mjs`: the check script reports, and exits non-zero for, every localized field of every entry that lacks an `en-CA` or `fr-CA` value, every `uiLabel` key from the content-model contract that is missing entirely, and any `logo` / `illustration` set without its localized alt text; a fixture with a missing `fr-CA` value that a fallback-resolved read would hide MUST still be reported
- [X] T083 [P] [US5] `frontend/e2e/us5-editor-content.spec.ts`: with the Contentful response intercepted, a changed label appears after reload, a draft-only entry (absent from Delivery) is not shown, an added French value replaces the English fallback

### Implementation for User Story 5

- [X] T084 [US5] Write `contentful/scripts/check-translations.mjs` (reads the space via the Delivery token; reads raw per-locale values (all locales requested, no fallback applied) so a missing French value is never hidden by the English fallback; lists missing English AND French values for every localized field of every entry, plus missing alt text for set images, per FR-038; exits non-zero on any gap. This is the done gate; the runtime English fallback is only a safety net)
- [X] T085 [US5] Add the full required `uiLabel` key list to `contentful/scripts/required-keys.json` derived from `contracts/content-model.md` (all groups: Buttons, Forms, Validation, Messages, Filters, Status, Navigation)
- [X] T086 [US5] Write the editor guide in `contentful/EDITORS.md`: how to edit a label in both languages, add a category or priority, publish, why drafts do not show, and the French-required rule
- [X] T087 [US5] Verify in `contentful/README.md` that each migration validation (required, unique, length) matches `contracts/content-model.md` and add `npm run check:translations` script in `contentful/package.json`

---

## Phase 8: User Story 6 - Get help and clear feedback (Priority: P3)

**Goal**: Help page with FAQ, per-page titles and descriptions, loading indicators, clear completed tasks, overdue highlighting.

**Independent Test**: Open Help in both languages; complete tasks and clear them with confirmation; a past-due active task is highlighted with text and icon.

### Tests for User Story 6

- [X] T088 [P] [US6] `frontend/src/app/features/help/help.page.spec.ts`: FAQ in `sortOrder`, rich text rendered through the sanitizer, language switch, axe clean
- [X] T089 [P] [US6] `frontend/src/app/core/content/rich-text.pipe.spec.ts`: renders paragraphs, h2-h3 headings, lists, links, bold and italic; a script or event-handler attribute in the content is removed by the sanitizer; empty or missing rich text renders nothing
- [X] T090 [P] [US6] `frontend/src/app/core/seo/page-meta.service.spec.ts`: `document.title` and meta description follow the Page entry per language with fallback to `appTitle`
- [X] T091 [P] [US6] `frontend/src/app/features/todos/overdue.spec.ts`: overdue only if not completed and due date earlier than today; today is not overdue; completed never overdue
- [X] T092 [P] [US6] `frontend/src/app/features/todos/clear-completed.spec.ts`: confirmation text shows the count via `{count}`; removes only completed tasks; hidden/disabled when none completed
- [X] T093 [P] [US6] `frontend/e2e/us6-help-feedback.spec.ts` in both languages, including loaders with `MOCK_DELAY_MS`

### Implementation for User Story 6

- [X] T094 [P] [US6] Implement `frontend/src/app/features/help/help.page.ts`, add its lazy `help` route in `frontend/src/app/app.routes.ts`, add the `nav.help` link to the header nav in `frontend/src/app/shared/header/header.component.ts` (with its spec updated), and rich-text rendering in `frontend/src/app/core/content/rich-text.pipe.ts` (`@contentful/rich-text-html-renderer` output bound via `[innerHTML]` so Angular sanitizes it)
- [X] T095 [P] [US6] Implement `frontend/src/app/core/seo/page-meta.service.ts` and call it from the todos and help routes
- [X] T096 [US6] Add overdue computation and the visual state (icon plus `status.overdue` text, not colour alone) to `todo-item.component.ts`
- [X] T097 [US6] Add clear-completed action (`button.clearCompleted`) to `todo-list.page.ts` using the shared confirm dialog headed by `dialog.clearCompleted.heading` with `message.clearCompletedConfirm` and `{count}`, then `message.completedCleared`
- [X] T098 [US6] Show loading indicators for content and tasks (`loader` component plus `status.loading` after first content load) and make sure no page flashes blank text
- [X] T099 [US6] Run lint, unit and e2e; fix failures

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T100 [P] Run Playwright with axe on every screen and state (list, form, dialogs, help, not found, error, empty) in `en` and `fr` and fix all violations (SC-008)
- [X] T101 [P] Keyboard-only walkthrough of every flow in both languages; fix focus order and focus return after dialogs close
- [X] T102 [P] Verify layouts at 360px, tablet and desktop, including French text expansion without truncation or overlap
- [X] T103 [P] Sentinel sweep: run every screen in `fr` with the fake content set and the real Contentful content; confirm no literal UI text and no raw keys; confirm `no-literal-ui-text` lint passes with zero errors
- [X] T104 Measure first usable render on a throttled connection and confirm language switch under 1 second (SC-003, SC-006); fix regressions
- [X] T105 [P] Cross-browser e2e run on Chromium, Firefox and WebKit via Playwright projects in `frontend/playwright.config.ts`
- [X] T106 [P] Security review: confirm no token is committed (search the repository), only the Delivery token is in the browser, Management token is read only from the environment, rich text is sanitized
- [X] T107 [P] Write a root `README.md` (setup, three components, environment config, commands) and keep `quickstart.md` accurate
- [X] T108 Execute every scenario in `specs/001-bilingual-todo-app/quickstart.md` in order and record pass/fail; fix gaps
- [X] T109 Run the full local quality gate: `npm run lint`, `npm run test:lint-rules`, `npm test`, `npm run e2e` (includes axe) in `frontend/`, `npm test` in `mock-backend/`, and `npm run check:translations` in `contentful/` (French on every entry); confirm the constitution check (Principles I-V) still passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: needs Phase 1; blocks all stories
- **US1 (Phase 3)** and **US2 (Phase 4)**: both P1, start after Phase 2; US2 builds on the US1 page for its form-preservation and date tests, so run US1 first
- **US3, US4**: need US1; independent of each other
- **US5**: needs Phase 2 only (Contentful side) and can run in parallel with any story
- **US6**: needs US1 (list, dialog); the Help page and page meta need Phase 2 only
- **Polish (Phase 9)**: needs all desired stories

### Within Each Story

Tests first (confirm they fail), then stores/services, then components, then page wiring, then the run-and-fix task.

### Task-level notes

- T022 depends on T018-T021. T040 depends on T043. T033 depends on T026-T029. T035 depends on T033. T052 depends on T037. T056 depends on T052-T055.
- T073 and T078 edit files from earlier stories (`content.store.ts`, `todo.store.ts`); do not run them in parallel with other edits to those files.

### Parallel Opportunities

- Phase 1: T004-T009
- Phase 2: T010-T014 and T016 (Contentful) alongside T018-T021 and T024 (mock backend) alongside T025-T028, T030, T032, T034, T036, T038, T040-T045 (frontend)
- Each story's test tasks are all [P]; component tasks marked [P] touch different files
- US5 can proceed in parallel with US3, US4, US6

### Parallel Example: User Story 1

```text
Task: "todo.store.spec.ts"                        (T046)
Task: "todo-form.component.spec.ts"               (T047)
Task: "confirm-dialog.component.spec.ts"          (T050)
Task: "e2e us1-manage-tasks.spec.ts"              (T051)
then
Task: "confirm-dialog.component.ts"               (T053)
Task: "todo-form.component.ts"                    (T054)
Task: "todo-item.component.ts"                    (T055)
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2)

1. Phase 1 Setup, Phase 2 Foundational
2. Phase 3 (US1), then validate in English
3. Phase 4 (US2), then validate in English and French. This pair is the smallest release that is both useful and bilingual.

### Incremental Delivery

Add US3, then US4, then US5 and US6, validating each against its Independent Test and the matching quickstart scenarios.

### Notes

- [P] tasks touch different files with no unfinished dependencies
- Commit after each task or logical group
- Stop at any checkpoint to validate
- Never put a literal UI string in code; add a `uiLabel` key to `contracts/content-model.md` and the seed instead
