# Data Model: Task List Scrolling

This feature adds no stored data and does not change the `Task` shape or the backend API.

## Content (Contentful)

| Entity | Change |
|--------|--------|
| Interface Text (`uiLabel`) | One new entry: key `list.region.label`, group `Status`, en-CA "Task list", fr-CA "Liste des tâches". See [contracts/content-model-delta.md](contracts/content-model-delta.md). |

## View state (in memory only, not persisted)

| Name | Meaning | Rules |
|------|---------|-------|
| `scrollThreshold` | Number of rows shown before the list scrolls | Constant `10` (FR-001, FR-002); not configurable |
| `isScrollable` | True when the shown task count exceeds `scrollThreshold` | Derived from the visible (filtered, searched, sorted) list (FR-003); false in loading, empty and error states (FR-010) |
| `measuredMaxHeight` | Pixel height from the top of the list to the bottom of the 10th row, capped by `100dvh − top offset − 16px` (never below 3 rows) | Recomputed on resize, row change, language change and when the form above opens or closes; unset when not scrollable |
| `revealId` | Id of a just-added task to scroll into view | Set by the page after a successful add, reset after the reveal |
| `scrollTop` | The browser's own scroll offset of the list element | Not stored; preserved because the element is persistent (research D-04) |

## State transitions

- `isScrollable` goes false → true when the shown count rises from 10 to 11 (add, or clearing a filter), and true → false when it drops to 10 or fewer (delete, clear completed, filter, search). Entering the scrollable state sets `max-height`, `role`, `tabindex` and `aria-label`; leaving it removes them.
