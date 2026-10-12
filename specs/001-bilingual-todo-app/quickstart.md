# Quickstart: Validation Guide

How to run the app and prove it works end to end. Contracts: [todos-api](contracts/todos-api.openapi.yaml),
[content model](contracts/content-model.md). Data: [data-model.md](data-model.md).

## Prerequisites

- Node.js 24 LTS and npm
- A Contentful space (free tier) with locales `en-CA` (default) and `fr-CA` (fallback `en-CA`)
- A Contentful **Delivery** token and, for provisioning only, a **Management** token (kept in your shell, never committed)

## 1. Provision Contentful (one time)

```powershell
cd contentful
npm install
$env:CONTENTFUL_SPACE_ID = "<space id>"
$env:CONTENTFUL_ENVIRONMENT_ID = "master"
$env:CONTENTFUL_MANAGEMENT_TOKEN = "<management token>"
npm run migrate      # creates the 7 content types
npm run seed         # imports EN + FR entries and publishes them
```

Expected: 7 content types exist; seeded entries are published; every `uiLabel` key listed in the content-model contract has `en-CA` and `fr-CA` values.

## 2. Start the mock backend

```powershell
cd mock-backend
npm install
npm start            # http://localhost:3000, resets data from db.seed.json
```

Optional: `$env:MOCK_DELAY_MS = 800` to see loaders; `$env:MOCK_FAIL_RATE = 0.3` to see errors.
Expected: `GET http://localhost:3000/todos` returns at least 5 tasks.

## 3. Configure and start the app

```powershell
cd frontend
npm install
Copy-Item src/environments/environment.example.ts src/environments/environment.local.ts
# edit environment.local.ts: spaceId, environmentId, deliveryToken, apiBaseUrl
npm start            # http://localhost:4200 redirects to /en or /fr
```

## 4. Automated checks

```powershell
cd frontend
npm run lint         # includes the no-literal-ui-text template rule
npm test             # unit tests (Contentful and HTTP mocked)
npm run test:lint-rules   # tests for the no-literal-text lint rule
npm run e2e          # Playwright, English and French, with axe checks
npm run e2e:cross    # optional: also Firefox and WebKit
cd ../mock-backend; npm test
cd ../contentful; npm test; npm run check:translations   # French and English on every entry, alt text on every image
```

Expected: all pass with zero lint errors, zero axe violations, and no missing translations. Together these form the local quality gate.

## 5. Manual validation scenarios

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Create (AC-03, US1) | Add a task with a valid title | Appears in list; success message in active language |
| 2 | Validation (AC-04) | Save with an empty title | Save blocked; required message from Contentful beside the field |
| 3 | Edit / complete / delete (US1) | Edit a task, toggle complete, delete and confirm | List updates each time; delete needs confirmation |
| 4 | Language switch (AC-01) | Choose French in the header | All text, category and priority names, dates are French; URL becomes `/fr/...`; task titles unchanged; no reload; open form input kept |
| 5 | Missing translation (AC-02) | Unpublish the French value of one label in Contentful, reload in French | English text shown, no notice; element has `lang="en-CA"` |
| 6 | Persistence (AC-07) | Pick French, close tab, open `/` | Opens `/fr` |
| 7 | Language order (US2) | Clear storage; open `/` with browser set to French; open `/en` | `/fr` from browser language; URL wins on `/en` |
| 8 | Content update (AC-05) | Publish a new category in Contentful; reload | Appears in dropdown in both languages |
| 9 | Backend failure (AC-06) | Run backend with `MOCK_FAIL_RATE=1`; load list | Localized error with retry; retry works after unsetting |
| 10 | Content failure (FR-034) | Use an invalid Delivery token | Single fallback message with retry; no crash |
| 11 | Filters / sort / search (US4) | Apply status, category, priority, search, each sort | List narrows and orders correctly; remaining count updates; no-match message when empty |
| 12 | Overdue and clear completed (US6) | Task due yesterday; complete several tasks and clear | Overdue shows icon and text; today is not overdue; clear asks to confirm with the count |
| 13 | Accessibility (SC-008) | Use keyboard only through every flow, both languages | All operable, focus visible, dialogs trap focus and close with Escape |
| 14 | Orphan category (FR-030) | Delete a category entry that a task uses; reload | Task shows the Uncategorized label |
| 15 | Restart reset (clarification Q2) | Add a task, restart backend | Tasks return to the seed set |

## 6. Validation record (T108)

Each scenario was checked by automated tests against the real Contentful space and the mock backend. Scenarios 5, 8, 9, 10 simulate the Contentful or backend condition by intercepting the response.

| # | Result | Covered by |
|---|--------|------------|
| 1 | Pass | `us1-manage-tasks` AC-03 |
| 2 | Pass | `us1-manage-tasks` AC-04 |
| 3 | Pass | `us1-manage-tasks` edit, toggle, delete with confirm |
| 4 | Pass | `us2-language` AC-01 |
| 5 | Pass | `us2-language` AC-02 |
| 6 | Pass | `us2-language` AC-07 |
| 7 | Pass | `us2-language` language order |
| 8 | Pass | `us3-categories` AC-05, `us5-editor-content` |
| 9 | Pass | `us1-manage-tasks` AC-06, `polish` error state |
| 10 | Pass | `polish` content unavailable |
| 11 | Pass | `us4-filters` |
| 12 | Pass | `us6-help-feedback` overdue and clear completed |
| 13 | Pass (automated only) | `polish` T100 and T101; no human screen-reader pass was done |
| 14 | Pass | `us3-categories` orphan category |
| 15 | Pass | `mock-backend/tests/server.test.js` (reset on start) |

Gate run: lint clean; `test:lint-rules` 66 pass; frontend unit 349 pass; mock-backend 41 pass; contentful 25 pass; Playwright (Chromium, en + fr) 113 pass; cross-browser (Chromium, Firefox, WebKit) 335 pass, 3 flaky and 1 failure on first run, the failure fixed afterwards; `check:translations`: all 80 entries have English and French. First render on a throttled production build: about 2.1 s.
