# Contract: Content Model Delta

Addition to [`specs/001-bilingual-todo-app/contracts/content-model.md`](../../001-bilingual-todo-app/contracts/content-model.md). No content type, field, or locale changes.

## New `uiLabel` entry

| Field | Value |
|-------|-------|
| key | `list.region.label` |
| group | `Status` |
| value (en-CA) | Task list |
| value (fr-CA) | Liste des tâches |

## Consumer contract (UI)

- The wrapper element around the task list (the `ul` keeps its native list semantics), only while it is scrollable (more than 10 tasks shown), exposes:
  - `role="region"`
  - `tabindex="0"`
  - `aria-label` = the active-language value of `list.region.label`, with `lang` set to English when the French value is missing and the English fallback is used (FR-018 of feature 001).
- When the list is not scrollable, none of these attributes are present.
- The label must never appear as raw key text; if the content is unavailable, the app's existing fallback behaviour applies.

## Provisioning

Add the entry to `contentful/seed/ui-labels.json` and its key to `contentful/scripts/required-keys.json` (update the count assertion in `contentful/tests/check-translations.test.mjs` from 66 to 67), run `npm run seed`, then `npm run check:translations` (must pass with both locales present). Editors can later reword it in Contentful without code changes.
