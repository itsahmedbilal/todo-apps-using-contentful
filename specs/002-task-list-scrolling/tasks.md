---

description: "Task list for Task List Scrolling"
---

# Tasks: Task List Scrolling

**Input**: Design documents from `/specs/002-task-list-scrolling/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/content-model-delta.md, quickstart.md

**Tests**: REQUIRED. The project constitution (Principle V) makes unit tests mandatory for new and changed code and requires axe checks. Write each test first and confirm it fails before the task it covers.

**Organization**: Grouped by user story so each can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependencies)
- **[Story]**: User story the task belongs to (US1 to US3)
- Paths follow plan.md: `frontend/`, `contentful/`
- **Text rule (constitution II)**: no literal user-visible text in templates, components, or tests. The new label comes from the Contentful `uiLabel` key `list.region.label`; tests read wording through the `label()` helper in `frontend/e2e/support.ts` or Contentful fixture values.

## Phase 1: Setup

**Purpose**: Make sure the existing project runs before changing it

- [ ] T001 Confirm the baseline is green by running `npm run lint` and `npm test` in `frontend/` and `npm test` in `contentful/`, and report any existing failures in the task output (no file changes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The content entry and the shared directive skeleton that all three stories use

- [ ] T002 [P] Add the entry `{ "key": "list.region.label", "group": "Status", "value": { "en-CA": "Task list", "fr-CA": "Liste des tâches" } }` to `contentful/seed/ui-labels.json` (group `Status` is one of the allowed groups in `contentful/migrations/001-app-settings-ui-label.js`)
- [ ] T003 Add `list.region.label` to the `Status` group in `contentful/scripts/required-keys.json` and change the assertion `assert.equal(loadRequiredKeys().length, 66)` in `contentful/tests/check-translations.test.mjs` to 67; then run `npm test` and `npm run check:translations` in `contentful/` and confirm the new entry passes with both locales present (`contentful/tests/import.test.mjs` compares against `entries.length`, so it needs no change)
- [ ] T004 Create the standalone attribute directive skeleton `ScrollListDirective` (selector `[appScrollList]`, OnPush-friendly, signals only) in `frontend/src/app/features/todos/scroll-list/scroll-list.directive.ts` with an exported constant `SCROLL_THRESHOLD = 10` and inputs `rowCount` (number) and `label` (string), no behaviour yet

**Checkpoint**: Content entry exists in both languages and the directive compiles.

---

## Phase 3: User Story 1 - Scroll within the list past 10 tasks (Priority: P1) 🎯 MVP

**Goal**: With more than 10 tasks shown, the list is limited to the height of 10 rows and scrolls inside itself while the header and controls stay in place.

**Independent Test**: Add 15 tasks; 10 rows are visible with a scrollbar and rows 11 to 15 are reachable by scrolling; with 10 or fewer, no scrolling appears.

### Tests for User Story 1 (write first, confirm they fail)

- [ ] T005 [P] [US1] Write unit tests in `frontend/src/app/features/todos/scroll-list/scroll-list.directive.spec.ts`: with 10 rows no `max-height` is set; with 11 rows `max-height` equals the bottom of the 10th row relative to the list top; rows of unequal heights still yield exactly 10 rows; the cap is never below the height of 3 rows; when the viewport is tall enough the value equals the 10-row height, and when it is short the value is `100dvh − host top offset − 16px`; the value changes when the host's top offset changes; the 10th row is fully inside the limit and the 11th is not; it re-measures on `ResizeObserver` callback and on a row-count change; going from 11 back to 10 removes the limit
- [ ] T006 [P] [US1] Write e2e tests in `frontend/e2e/us7-list-scrolling.spec.ts` (run in the `en` and `fr` projects): seed 10 tasks via the backend and assert the list has no scroll (`scrollHeight <= clientHeight`); add an 11th and assert the list scrolls, exactly 10 rows are within the visible area, and the heading and filters bar remain in the viewport after scrolling the list to the bottom; assert the 10th row is fully visible and the 11th is not; scroll the list with the mouse wheel and with touch emulation and assert `scrollTop` changes (FR-005); filter down to 10 or fewer and assert scrolling disappears; add a case at 360x480 with the add form open: the form's Save button and the list's first row are both inside the viewport and the list still scrolls (FR-004); use `uniqueTitle` and `data-testid` locators only

### Implementation for User Story 1

- [ ] T007 [US1] Implement measuring in `frontend/src/app/features/todos/scroll-list/scroll-list.directive.ts`: when `rowCount > SCROLL_THRESHOLD`, read the bottom edge of the 10th `li` of the host's child `ul` relative to the host's top and set host `max-height` to `min(that height, max(100dvh − host top offset − 16px, height of the first 3 rows))`; clear it otherwise; observe the host and the page container with `ResizeObserver` (so it recomputes when the form above opens or closes) and disconnect on destroy; set host `overflow-y: auto`
- [ ] T008 [US1] Apply the directive in `frontend/src/app/features/todos/todo-list.page.ts`: add `ScrollListDirective` to `imports` and wrap the existing `ul.page__list` (`data-testid="todo-list"`) in `<div class="page__scroll" appScrollList [rowCount]="visibleTodos().length">`; the `ul` and `li` keep their native list semantics; keep rows tracked by `item.id`; render the wrapper only inside the existing `@if (visibleTodos().length > 0)` block so loading, empty, error and no-results states show no scroll area (FR-010)
- [ ] T009 [US1] Add a unit test case to `frontend/src/app/features/todos/todo-list.page.spec.ts` asserting the directive is present only when tasks are shown and that loading, empty, error and no-results states render no list element
- [ ] T010 [US1] Run T005, T006 and T009; confirm they pass in both locales

**Checkpoint**: User Story 1 works on its own and is the MVP.

---

## Phase 4: User Story 2 - Keyboard and assistive technology (Priority: P2)

**Goal**: The scrollable list is focusable, labelled in the active language, and every task can be reached and seen with the keyboard.

**Independent Test**: With 15 tasks, Tab through every task by keyboard and each comes into view with a visible focus ring; a screen reader announces a region named "Task list" / "Liste des tâches".

### Tests for User Story 2 (write first, confirm they fail)

- [ ] T011 [P] [US2] Extend `frontend/src/app/features/todos/scroll-list/scroll-list.directive.spec.ts`: when scrollable, the host has `role="region"`, `tabindex="0"` and `aria-label` equal to the `label` input; when not scrollable none of these attributes are present; when the label's French value is missing and English is used, `lang="en"` is set on the host; the inner `ul` has no `role` override and keeps its list semantics
- [ ] T012 [P] [US2] Extend `frontend/e2e/us7-list-scrolling.spec.ts`: with 50 tasks (SC-002), `Tab` to the list region, scroll with ArrowDown, PageDown, End and Home and assert `scrollTop` changes; Tab through all rows and assert each focused row is inside the list's visible bounds; assert the region's accessible name equals `label('list.region.label', testInfo)` in both locales; run `@axe-core/playwright` on the page at 360px and 1280px widths with 11+ tasks and assert zero violations, including `scrollable-region-focusable`; assert no region role or extra tab stop with 10 or fewer tasks

### Implementation for User Story 2

- [ ] T013 [US2] In `frontend/src/app/features/todos/scroll-list/scroll-list.directive.ts` (host is the wrapper `div`, not the `ul`) add host bindings for `role`, `tabindex` and `aria-label` that apply only while scrollable (research D-03), and a `lang` binding for English-fallback text
- [ ] T014 [US2] In `frontend/src/app/features/todos/todo-list.page.ts` read the label from `ContentStore` (key `list.region.label`, using the same helper the page already uses for text, and the existing `content.langFor` for the language attribute) and bind it to the directive's `label` input; add no literal text
- [ ] T015 [US2] Add a visible focus style for the scrollable region in the `styles` of `frontend/src/app/features/todos/todo-list.page.ts` using the existing focus-ring token from `frontend/src/styles/tokens.scss`, with sufficient contrast (AA)
- [ ] T016 [US2] Run T011 and T012 and confirm they pass; run `npm run lint` in `frontend/` to confirm the no-literal-text rule passes

**Checkpoint**: Stories 1 and 2 both work; the list meets the keyboard and screen reader criteria.

---

## Phase 5: User Story 3 - Stay in place after changes (Priority: P3)

**Goal**: Editing, completing, and switching language keep the scroll position; a newly added task is visible.

**Independent Test**: Scroll to task 12, mark it complete and switch language; the list stays put. Add a task that sorts to the end; it scrolls into view.

### Tests for User Story 3 (write first, confirm they fail)

- [ ] T017 [P] [US3] Add unit tests to `frontend/src/app/features/todos/todo-list.page.spec.ts`: after setting `scrollTop` on the list and then completing a task, editing a task, and switching language, the same list element instance remains in the DOM and `scrollTop` is unchanged; add a test to `scroll-list.directive.spec.ts` that a request to reveal a row calls `scrollIntoView({ block: 'nearest' })` on it, with smooth behaviour only when `prefers-reduced-motion` is not set
- [ ] T018 [P] [US3] Extend `frontend/e2e/us7-list-scrolling.spec.ts`: with 15 tasks scroll down, complete a row, edit a row, switch language, and assert `scrollTop` is within one row height of the previous value (SC-004); add a task sorted near the end and assert it becomes visible within the list bounds (FR-009); with `reducedMotion: 'reduce'` assert the list still reveals the new task

### Implementation for User Story 3

- [ ] T019 [US3] In `frontend/src/app/features/todos/todo-list.page.ts`, after `store.add(input)` returns `result.ok`, set a page signal `revealId` to `result.value.id`; reset it to `null` once the directive has revealed the row; add cases to `frontend/src/app/features/todos/todo-list.page.spec.ts` that the signal is set after a successful add and not after a failed add (no change to `todo.store.ts`)
- [ ] T020 [US3] Add a `revealId` input to `frontend/src/app/features/todos/scroll-list/scroll-list.directive.ts`; when it changes to a non-null id, wait until the new row has rendered (for example in an `afterNextRender` callback), find the row by its task id attribute, call `scrollIntoView({ block: 'nearest', behavior })`, where `behavior` is `smooth` unless `matchMedia('(prefers-reduced-motion: reduce)')` matches, and emit an output so the page can reset `revealId`
- [ ] T021 [US3] In `frontend/src/app/features/todos/todo-list.page.ts` give each row a stable `data-task-id` attribute (not user-visible text), bind `revealId` to the page's `revealId` signal and handle the directive's reset output, and ensure `@for` still tracks by `item.id` so row elements are not recreated (research D-04)
- [ ] T022 [US3] Run T017 and T018 and confirm they pass in both locales

**Checkpoint**: All three stories work independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Check the edge cases from `spec.md` in `frontend/e2e/us7-list-scrolling.spec.ts`: French text expansion and long descriptions still show exactly 10 rows; 200% zoom and a short viewport (for example 360x480) keep every task reachable; filtering and search count only shown tasks
- [ ] T024 [P] Add a short "Task list scrolling" note to `README.md` and mention the new `list.region.label` entry in `contentful/EDITORS.md`
- [ ] T025 Run the full local quality gate from the constitution: `npm run lint`, `npm run format:check`, `npm test`, `npm run e2e` in `frontend/`, and `npm test` plus `npm run check:translations` in `contentful/`; record the results
- [ ] T026 Walk through every check in `specs/002-task-list-scrolling/quickstart.md` in English and French and tick off the results

---

## Dependencies & Execution Order

- **Phase 1** (T001) first. **Phase 2** (T002 to T004) blocks all stories; T002 and T004 can run in parallel, T003 follows T002.
- **US1 (P1)** needs Phase 2. It is the MVP and has no dependency on US2 or US3.
- **US2 (P2)** builds on the directive from US1 (T007) because it adds host bindings to the same file.
- **US3 (P3)** builds on the directive from US1 (T007) and the page from US1 (T008); T019 edits `todo-list.page.ts`, so run it after US2's page edits (T014, T015) to avoid conflicts.
- **Polish** after the stories you ship.
- Within each story: tests first and failing, then implementation, then the run-and-confirm task.

## Parallel Opportunities

- Phase 2: T002 and T004.
- US1: T005 and T006 (different files).
- US2: T011 and T012.
- US3: T017 and T018.
- Polish: T023 and T024.

## Implementation Strategy

**MVP first**: Phase 1, Phase 2, then User Story 1 alone (T001 to T010). That already delivers the requested behavior: the list scrolls after 10 tasks. Then add US2 (accessibility, required for WCAG 2.1 AA under the constitution, so ship it before release) and US3 (scroll position and reveal), then Polish.
