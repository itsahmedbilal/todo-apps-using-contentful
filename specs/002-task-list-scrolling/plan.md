# Implementation Plan: Task List Scrolling

**Branch**: `002-task-list-scrolling` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-task-list-scrolling/spec.md`

## Summary

Once the task list shows more than 10 tasks, the list area stops growing and scrolls inside itself, so the header, filters and add-task controls stay reachable. The height limit is the measured height of the first 10 rows (rows vary in height, especially in French), capped by the viewport on short screens. The scroll area is keyboard focusable and labelled from a new Contentful `uiLabel` entry (EN + FR). Scroll position survives edits, completion and language switches because the list element and its rows are never recreated. A small page-level directive does the measuring and the scroll-into-view of a newly added task. No new dependencies and no backend changes.

## Technical Context

**Language/Version**: TypeScript (strict) on Angular 22.2.2, Node.js 24 LTS tooling (unchanged from feature 001)

**Primary Dependencies**: None added. Uses the browser's `ResizeObserver` and CSS `overflow`/`max-height`.

**Storage**: N/A. The Contentful space gains one `uiLabel` entry; the mock backend is untouched.

**Testing**: Angular default unit-test runner (directive and page tests, Contentful mocked); Playwright + `@axe-core/playwright` e2e in both locales; `contentful` Node tests and `check:translations` for the new entry.

**Target Platform**: Latest Chrome, Edge, Firefox, Safari; 360px mobile to desktop; 200% zoom.

**Project Type**: Web application (existing Angular SPA + Contentful provisioning).

**Performance Goals**: Measuring is limited to the list element's first 10 rows and re-runs only on resize or when rows change; no visible layout jump on first render.

**Constraints**: No literal UI text (Principle II). Honour `prefers-reduced-motion`. Limit counts currently shown tasks (after filter, search, sort).

**Scale/Scope**: One page (`todo-list.page.ts`), one new small directive, one new content entry, about 4 files changed or added in `frontend/` (plus the e2e spec), 3 small changes in `contentful/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Angular Best Practices | Standalone, OnPush, signals, strict TS, no template logic, lint clean | PASS: standalone directive with signals; threshold lives in one named constant; no logic in the template beyond a bound attribute |
| II. No Hard-Coded UI Text | The scroll area's accessible name is not a literal | PASS: label comes from `uiLabel` `list.region.label` through the existing content pipeline; no fallback text added |
| III. Contentful Single Source | Text only via `ContentService`/`ContentStore` | PASS: the page reads the label from `ContentStore`; nothing calls Contentful directly |
| IV. EN/FR (`en-CA`/`fr-CA`) | Both locales on the new entry; layout tolerates French expansion | PASS: seed has both values and `check:translations` enforces it; height is measured from real rows, so French wrapping is handled |
| V. WCAG 2.1 AA + Unit Tests | Keyboard scroll, focus visible, axe passes, tests for new code | PASS: focusable labelled region (research D-03), tests listed in quickstart, axe in e2e at 360px and desktop |

Re-check after Phase 1: PASS, no violations. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-task-list-scrolling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── content-model-delta.md   # Phase 1 output (the one new uiLabel)
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/app/features/todos/
│   ├── todo-list.page.ts            # MODIFIED: wrap the list in the scroll region div, bind label, reveal new task
│   ├── todo-list.page.spec.ts       # MODIFIED: threshold, label, states, position tests
│   └── scroll-list/
│       ├── scroll-list.directive.ts       # NEW: measures first 10 rows, sets max-height, scrolls new row into view
│       └── scroll-list.directive.spec.ts  # NEW
└── e2e/
    └── us7-list-scrolling.spec.ts   # NEW: 11+ tasks, keyboard, EN and FR, axe at 360px and desktop

contentful/
├── seed/ui-labels.json              # MODIFIED: add list.region.label (en-CA, fr-CA)
├── scripts/required-keys.json       # MODIFIED: add list.region.label to the required keys
└── tests/check-translations.test.mjs # MODIFIED: required key count 66 → 67
```

**Structure Decision**: Keep the change inside the existing `features/todos` folder. The measuring logic is a standalone attribute directive next to the page, so the page template stays free of logic (Principle I) and the behaviour is unit-testable on its own.

## Complexity Tracking

No constitution violations to justify.
