# Research: Task List Scrolling

All technical context items were resolvable from the existing app; no NEEDS CLARIFICATION remained.

## D-01: How to make the list exactly "10 tasks" tall

- **Decision**: A directive measures the bottom edge of the 10th row relative to the list's top and applies it as `max-height` on the scroll container. It re-measures with `ResizeObserver` (container width changes, font load, language switch) and when the number of rows changes. With 10 or fewer rows it sets no limit.
- **Rationale**: Rows have different heights (descriptions, French expansion, narrow screens), so a fixed `rem` or `calc(10 * x)` would show 8 or 12 tasks in some cases and break FR-002 and the spec's edge case on row heights.
- **Alternatives considered**: Fixed CSS `max-height` (inaccurate for variable rows); CSS `scroll-snap`/subgrid tricks (no reliable "N rows" height in CSS); virtual scrolling library (new dependency, overkill for about 50 tasks, and harms find-in-page and screen reader navigation).

## D-02: Keeping controls visible and handling short screens

- **Decision**: The wrapper's `max-height` is `min(measured height of 10 rows, available height)`. Available height is `100dvh − the wrapper's top offset in the viewport − 16px`, but never less than the height of 3 rows. The directive recomputes it on resize and when the form above opens or closes. The page itself keeps normal flow (no sticky positioning).
- **Rationale**: Bounding the list is what keeps the controls on screen; sticky headers add complexity and fail at 200% zoom. The viewport cap covers the spec edge case where 10 rows do not fit.
- **Alternatives considered**: `position: sticky` on the controls (collides with the existing header, awkward on mobile).

## D-03: Accessibility of a scrollable region

- **Decision**: Wrap the existing `ul` in a `div` that carries the directive. While scrollable, the wrapper is `role="region"`, has `tabindex="0"` and an `aria-label` from Contentful; it is neither focusable nor a region when not scrollable. The `ul` and its `li` rows keep their native list semantics. A visible focus ring uses the existing focus style.
- **Rationale**: axe's `scrollable-region-focusable` rule and WCAG 2.1.1 require keyboard users to be able to scroll; a label names the region for screen readers. `role="region"` on the `ul` itself would replace its list role and orphan the `li` items, which axe flags. Removing the role when not scrollable avoids a useless extra landmark and tab stop.
- **Alternatives considered**: Always focusable (extra tab stop for short lists); `role="region"` directly on the `ul` (breaks list semantics).

## D-04: Preserving scroll position

- **Decision**: Do nothing special. The `ul` stays in the DOM and rows are tracked by task id, so edits, completion and language switches update in place. Only the threshold and `max-height` are recomputed.
- **Rationale**: Tracked `@for` rows are not recreated and scroll offset belongs to the persistent container, so FR-008 holds without saving state. A test guards against regressions.
- **Alternatives considered**: Saving and restoring `scrollTop` (needless complexity and flicker risk).

## D-05: New task must be visible (FR-009)

- **Decision**: After a successful add, the page keeps the new task's id (from the `ActionResult` value that `store.add` returns) in a `revealId` signal. Once the new row has rendered, the directive scrolls it into view with `scrollIntoView({ block: 'nearest' })`, using smooth behaviour only when the user has not requested reduced motion, and the page then resets `revealId`. No change to `TodoStore`.
- **Rationale**: Where the new task lands depends on the active sort, so it may be outside the visible 10.
- **Alternatives considered**: Always scrolling to the bottom or top (wrong for other sorts).

## D-06: New content

- **Decision**: One new `uiLabel` entry, `list.region.label`, en-CA "Task list" and fr-CA "Liste des tâches", group `Status`, added to `contentful/seed/ui-labels.json` and `contentful/scripts/required-keys.json` (the translation check's key list), and imported with `npm run seed`.
- **Rationale**: Constitution Principles II and III; `check:translations` already enforces both locales.
- **Alternatives considered**: Reusing an existing label (none names the list); a new content type (unneeded).
