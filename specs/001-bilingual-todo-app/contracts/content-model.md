# Contract: Contentful Content Model

What the app requires from the Contentful space. `contentful/migrations/` implements it;
`contentful/seed/` provides the starting entries. Content type IDs are camelCase and fixed.

## Space setup

| Setting | Value |
|---------|-------|
| Locales | `en-CA` (default, required), `fr-CA` (fallback locale: `en-CA`) |
| Delivery token | Read-only; supplied through environment config |
| Visibility | The app reads published entries only (Delivery API) |

All text fields below are **localized**; all non-text fields are **not** localized (LOC-02, LOC-03).

## Content types

### `appSettings` (exactly one entry)
| Field ID | Type | Localized | Required | Validation |
|----------|------|-----------|----------|------------|
| appTitle | Symbol | yes | yes | max 60 |
| tagline | Symbol | yes | no | max 120 |
| logo | Asset (image) | no | no | |
| logoAlt | Symbol | yes | no (required whenever `logo` is set; enforced by the translation check) | max 120 |
| footerText | Symbol | yes | no | max 160 |
| languageSwitcherLabel | Symbol | yes | yes | max 60 |

### `uiLabel`
| Field ID | Type | Localized | Required | Validation |
|----------|------|-----------|----------|------------|
| key | Symbol | no | yes | unique; pattern `^[a-z][A-Za-z0-9.]*$` |
| value | Symbol | yes | yes | max 200 |
| group | Symbol | no | yes | in: Buttons, Forms, Validation, Messages, Filters, Navigation, Status |

### `category`
| Field ID | Type | Localized | Required | Validation |
|----------|------|-----------|----------|------------|
| name | Symbol | yes | yes | max 40 |
| slug | Symbol | no | yes | unique; pattern `^[a-z0-9-]+$` |
| colour | Symbol | no | yes | pattern `^#[0-9A-Fa-f]{6}$` |
| icon | Symbol | no | no | |
| sortOrder | Integer | no | yes | |

### `priority`
| Field ID | Type | Localized | Required | Validation |
|----------|------|-----------|----------|------------|
| label | Symbol | yes | yes | max 40 |
| slug | Symbol | no | yes | unique; in: low, medium, high |
| level | Integer | no | yes | 1-10 |
| colour | Symbol | no | yes | pattern `^#[0-9A-Fa-f]{6}$` |

### `emptyState`
| Field ID | Type | Localized | Required | Validation |
|----------|------|-----------|----------|------------|
| heading | Symbol | yes | yes | max 80 |
| message | Text | yes | yes | max 300 |
| illustration | Asset (image) | no | no | |
| illustrationAlt | Symbol | yes | no (required whenever `illustration` is set; enforced by the translation check) | max 120 |
| callToActionLabel | Symbol | yes | no | max 40 |

### `page`
| Field ID | Type | Localized | Required | Validation |
|----------|------|-----------|----------|------------|
| title | Symbol | yes | yes | max 80 |
| slug | Symbol | no | yes | unique; in: home, help |
| intro | RichText | yes | no | headings limited to h2-h3; marks bold/italic; links |
| emptyState | Link to `emptyState` | no | no | |
| seoTitle | Symbol | yes | no | max 70 |
| seoDescription | Text | yes | no | max 160 |

### `faqItem`
| Field ID | Type | Localized | Required | Validation |
|----------|------|-----------|----------|------------|
| question | Symbol | yes | yes | max 160 |
| answer | RichText | yes | yes | paragraphs, lists, links, bold/italic |
| sortOrder | Integer | no | yes | |

## Required `uiLabel` keys

The app looks up text only by these keys. **Every** key, and every localized field of every content type
(including `logoAlt` and `illustrationAlt` when an image is set), MUST have both `en-CA` and `fr-CA`
values before a feature is considered done (FR-038). The translation check enforces this. English
fallback at runtime is a safety net only.

| Group | Keys |
|-------|------|
| Buttons | `button.addTodo`, `button.save`, `button.cancel`, `button.edit`, `button.delete`, `button.markComplete`, `button.markIncomplete`, `button.retry`, `button.clearCompleted`, `button.confirm`, `button.clearSearch` |
| Forms | `form.title.label`, `form.title.placeholder`, `form.description.label`, `form.description.placeholder`, `form.dueDate.label`, `form.dueDate.hint`, `form.category.label`, `form.category.none`, `form.priority.label`, `form.addTitle`, `form.editTitle` |
| Validation | `validation.title.required`, `validation.title.tooLong`, `validation.description.tooLong`, `validation.dueDate.invalid` |
| Messages | `message.itemSaved`, `message.itemDeleted`, `message.completedCleared`, `message.deleteConfirm`, `message.clearCompletedConfirm` (contains `{count}`), `dialog.delete.heading`, `dialog.clearCompleted.heading`, `message.error.generic`, `message.error.load`, `message.noResults`, `message.contentUnavailable` |
| Filters | `filter.status.label`, `filter.status.all`, `filter.status.active`, `filter.status.completed`, `filter.category.label`, `filter.category.all`, `filter.priority.label`, `filter.priority.all`, `sort.label`, `sort.dueDate`, `sort.priority`, `sort.createdAt`, `search.label`, `search.placeholder` |
| Status | `status.itemsRemaining.one`, `status.itemsRemaining.other` (both contain `{count}`), `status.overdue`, `status.loading`, `status.uncategorized`, `status.completed` |
| Navigation | `nav.home`, `nav.help`, `nav.main.label`, `nav.skipToContent`, `language.name.en`, `language.name.fr`, `notFound.heading`, `notFound.message`, `notFound.backHome` |

Missing in both locales: the app renders nothing for that string (never the raw key) and warns in
development. The `status.loading` label is used for loaders shown after the first content load; the very
first loader is non-textual (`aria-busy`).

## Read behaviour (app side)

1. One batched load per page load: `appSettings`, `uiLabel`, `category`, `priority`, `emptyState`, `page`, `faqItem` with all locales.
2. Per-field resolution: `fr-CA` value, else `en-CA` value, else empty. Fallback values are marked `lang="en-CA"`. This is a runtime safety net; a missing French value is a defect caught by the translation check.
3. Failure of the load shows the single bilingual fallback message and a retry; the app does not crash (FR-034).
4. Only published entries are visible (CG-01); drafts never appear.
