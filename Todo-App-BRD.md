# Business Requirements Document (BRD)
## Bilingual Todo Application — Contentful + Angular + Mock Backend

| Item | Detail |
|---|---|
| Document version | 1.0 (Draft) |
| Date | October 12, 2026 |
| Author | Ahmed Bilal |
| Status | For review |
| Project type | Learning / proof-of-concept |

---

## 1. Executive Summary

This project delivers a bilingual (English and French) Todo web application. The application is built with **Angular** on the frontend, uses **Contentful** as the headless CMS for all managed content and translations, and uses a **mock backend** to store and serve the user's todo items.

The key idea is a clear separation of responsibilities:

- **Contentful** owns *content* — labels, messages, categories, priorities, help text, and page copy, in English and French.
- **Mock backend** owns *user data* — the todo items a user creates, edits, completes, and deletes.
- **Angular** combines both and presents them to the user in the selected language.

---

## 2. Business Objectives

| ID | Objective |
|---|---|
| BO-01 | Demonstrate a working headless CMS integration between Contentful and Angular. |
| BO-02 | Support English and French content, managed entirely by content editors in Contentful without code changes. |
| BO-03 | Provide full todo management (create, read, update, delete) against a mock backend. |
| BO-04 | Show a clean separation between editorial content (CMS) and transactional data (backend). |
| BO-05 | Produce a reference project that follows patterns used in enterprise bilingual sites (e.g. Canadian telecom and banking). |

---

## 3. Scope

### 3.1 In Scope

- Angular single-page application for managing todos.
- Contentful space with content model, entries, and two locales (English, French).
- Language switcher between English and French.
- Mock backend providing REST endpoints for todo items.
- Filtering, sorting, and categorizing todos.
- Responsive layout for desktop and mobile.
- Basic accessibility compliance.

### 3.2 Out of Scope

- Real database or production backend.
- User authentication and multiple user accounts.
- Push notifications, reminders, or email.
- Offline mode and data sync.
- Locales other than English and French.
- Production deployment, CI/CD pipelines, and monitoring.

---

## 4. Stakeholders

| Role | Responsibility |
|---|---|
| Product Owner | Defines requirements and accepts deliverables. |
| Frontend Developer | Builds the Angular application and integrations. |
| Content Editor | Creates and translates content in Contentful. |
| QA / Tester | Validates requirements and acceptance criteria. |
| End User | Uses the app to manage personal tasks. |

---

## 5. Assumptions and Constraints

### 5.1 Assumptions

- A Contentful space is available (free tier is sufficient).
- Content is read-only from the app's side; the app only reads from Contentful through the Content Delivery API.
- The mock backend runs locally and data may reset on restart, unless persistence to a local file is chosen.
- A single anonymous user uses the app (no login).

### 5.2 Constraints

- Contentful free tier limits on locales, content types, and API calls must be respected.
- Contentful access tokens must not be committed to source control; they are provided through environment configuration.
- French content must be reviewed for correctness before being published.

---

## 6. Localization Requirements

### 6.1 Locales

| Locale | Code (proposed) | Role |
|---|---|---|
| English (Canada) | `en-CA` | Default locale |
| French (Canada) | `fr-CA` | Secondary locale |

> Decision required: confirm `en-CA` / `fr-CA` versus `en-US` / `fr`. Canadian locales are recommended given the target audience.

### 6.2 Localization Rules

| ID | Requirement |
|---|---|
| LOC-01 | Every user-facing text in the app must come from Contentful. No hard-coded UI strings, except a minimal fallback error message shown if Contentful is unreachable. |
| LOC-02 | All text fields in the content model must be marked as **localized** in Contentful. |
| LOC-03 | Non-text fields such as sort order, colour codes, and icons must **not** be localized. |
| LOC-04 | French locale must fall back to English when a French value is missing. |
| LOC-05 | The user can switch language at any time from the header; the switch updates all content without a full page reload. |
| LOC-06 | The selected language must be remembered for the user's next visit. |
| LOC-07 | The initial language is taken from the URL if present, otherwise the saved preference, otherwise the browser language, otherwise English. |
| LOC-08 | The URL should reflect the current language (e.g. `/en/...` and `/fr/...`). |
| LOC-09 | Dates must display in the format of the selected locale. |
| LOC-10 | The HTML `lang` attribute must update to match the selected language. |
| LOC-11 | User-created todo titles and descriptions are **not** translated; they are shown exactly as the user typed them. |

---

## 7. Contentful Content Model

The content model below describes required content types and fields. "L" means localized.

### 7.1 Content Type: `App Settings` (single entry)

| Field | Type | L | Required | Purpose |
|---|---|---|---|---|
| App Title | Short text | Yes | Yes | Name shown in header and browser tab |
| Tagline | Short text | Yes | No | Subtitle under app title |
| Logo | Media | No | No | Header logo |
| Footer Text | Short text | Yes | No | Footer copyright line |
| Language Switcher Label | Short text | Yes | Yes | Accessible label for the switcher |

### 7.2 Content Type: `UI Label`

Holds small reusable strings (buttons, placeholders, validation messages).

| Field | Type | L | Required | Purpose |
|---|---|---|---|---|
| Key | Short text (unique) | No | Yes | Stable identifier, e.g. `button.addTodo` |
| Value | Short text | Yes | Yes | Text shown to the user |
| Group | Short text (dropdown) | No | Yes | e.g. Buttons, Forms, Validation, Messages |

**Minimum labels required:** Add todo, Save, Cancel, Edit, Delete, Mark complete, Mark incomplete, Title placeholder, Description placeholder, Due date label, Required field message, Title too long message, Delete confirmation message, Item saved message, Item deleted message, Generic error message, Filter labels (All, Active, Completed), Sort labels, Search placeholder, Items remaining text.

### 7.3 Content Type: `Category`

| Field | Type | L | Required | Purpose |
|---|---|---|---|---|
| Name | Short text | Yes | Yes | e.g. Work / Travail |
| Slug | Short text (unique) | No | Yes | Stable identifier used by the backend |
| Colour | Short text (hex) | No | Yes | Badge colour |
| Icon | Short text | No | No | Icon name |
| Sort Order | Integer | No | Yes | Display order |

Initial categories: Personal, Work, Shopping, Health.

### 7.4 Content Type: `Priority`

| Field | Type | L | Required | Purpose |
|---|---|---|---|---|
| Label | Short text | Yes | Yes | e.g. High / Élevée |
| Slug | Short text (unique) | No | Yes | `low`, `medium`, `high` |
| Level | Integer | No | Yes | Used for sorting |
| Colour | Short text (hex) | No | Yes | Indicator colour |

### 7.5 Content Type: `Page`

| Field | Type | L | Required | Purpose |
|---|---|---|---|---|
| Title | Short text | Yes | Yes | Page heading |
| Slug | Short text (unique) | No | Yes | Route, e.g. `home`, `about`, `help` |
| Intro | Rich text | Yes | No | Introduction copy |
| Empty State | Reference → `Empty State` | No | No | Shown when list is empty |
| SEO Title | Short text | Yes | No | Browser title |
| SEO Description | Long text | Yes | No | Meta description |

### 7.6 Content Type: `Empty State`

| Field | Type | L | Required | Purpose |
|---|---|---|---|---|
| Heading | Short text | Yes | Yes | e.g. "Nothing to do!" |
| Message | Long text | Yes | Yes | Supporting message |
| Illustration | Media | No | No | Image |
| Call to Action Label | Short text | Yes | No | Button text |

### 7.7 Content Type: `FAQ Item` (Help page)

| Field | Type | L | Required | Purpose |
|---|---|---|---|---|
| Question | Short text | Yes | Yes | |
| Answer | Rich text | Yes | Yes | |
| Sort Order | Integer | No | Yes | |

### 7.8 Content Governance

| ID | Requirement |
|---|---|
| CG-01 | Only **published** entries are shown in the app. |
| CG-02 | Content editors can update any text in English or French without developer involvement. |
| CG-03 | Field validations in Contentful must enforce required fields, unique keys/slugs, and text length limits. |
| CG-04 | Every published entry must have an English value; French is required for all fields shown in the main todo screen. |

---

## 8. Mock Backend Requirements

### 8.1 Purpose

Simulates a real REST API for todo items so the frontend can be built and tested without a production backend.

### 8.2 Todo Data Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | Text / number | Yes | Generated by backend |
| title | Text | Yes | 1–120 characters |
| description | Text | No | Up to 500 characters |
| completed | Boolean | Yes | Default false |
| categorySlug | Text | No | Must match a Contentful Category slug |
| prioritySlug | Text | Yes | Must match a Contentful Priority slug; default `medium` |
| dueDate | Date | No | ISO date |
| createdAt | Date-time | Yes | Set by backend |
| updatedAt | Date-time | Yes | Set by backend |

> Todos store **slugs**, not translated names. The app looks up the localized name from Contentful at display time. This keeps user data language-independent.

### 8.3 Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/todos` | List all todos (supports filter, sort, search parameters) |
| GET | `/todos/{id}` | Get a single todo |
| POST | `/todos` | Create a todo |
| PUT / PATCH | `/todos/{id}` | Update a todo |
| DELETE | `/todos/{id}` | Delete a todo |

### 8.4 Mock Backend Behaviour

| ID | Requirement |
|---|---|
| MB-01 | Must start with seed data of at least 5 sample todos across categories and priorities. |
| MB-02 | Must return proper HTTP status codes (200, 201, 204, 400, 404, 500). |
| MB-03 | Should support an optional artificial delay to test loading states. |
| MB-04 | Should support a way to simulate errors to test error handling. |
| MB-05 | Must be replaceable by a real API later by changing only configuration, not feature code. |
| MB-06 | Tool choice (e.g. json-server or Angular in-memory web API) to be decided during design. |

---

## 9. Functional Requirements

### 9.1 Todo Management

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User can view a list of all todos. | Must |
| FR-02 | User can add a todo with title (required), description, category, priority, and due date. | Must |
| FR-03 | User can edit any field of an existing todo. | Must |
| FR-04 | User can mark a todo complete or incomplete with one click. | Must |
| FR-05 | User can delete a todo after confirming. | Must |
| FR-06 | User can filter by status: All, Active, Completed. | Must |
| FR-07 | User can filter by category and by priority. | Should |
| FR-08 | User can sort by due date, priority, or created date. | Should |
| FR-09 | User can search todos by title. | Should |
| FR-10 | App shows a count of remaining active todos. | Should |
| FR-11 | User can clear all completed todos at once. | Could |
| FR-12 | Overdue todos are visually highlighted. | Could |

### 9.2 Content and Language

| ID | Requirement | Priority |
|---|---|---|
| FR-13 | Header shows app title, logo, and language switcher from Contentful. | Must |
| FR-14 | Category and priority dropdowns are populated from Contentful in the active language. | Must |
| FR-15 | Empty list shows the Empty State content from Contentful. | Must |
| FR-16 | Help page shows FAQ items from Contentful. | Should |
| FR-17 | Page titles and meta descriptions come from Contentful per language. | Should |

### 9.3 Feedback and Errors

| ID | Requirement | Priority |
|---|---|---|
| FR-18 | Show loading indicators while content or data is loading. | Must |
| FR-19 | Show success messages after save and delete (text from Contentful). | Must |
| FR-20 | Show a friendly error message if the backend fails, with a retry option. | Must |
| FR-21 | If Contentful is unreachable, the app shows a fallback message and does not crash. | Must |
| FR-22 | Form validation messages appear inline and come from Contentful. | Must |

---

## 10. User Stories

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-01 | User | add a task with a category and priority | I can organise my work |
| US-02 | User | mark tasks as done | I can track progress |
| US-03 | User | switch between English and French | I can use the app in my preferred language |
| US-04 | User | filter to see only active tasks | I can focus on what's left |
| US-05 | French-speaking user | see categories and messages in French | the experience feels native |
| US-06 | Content editor | change button text or add a category in Contentful | the app updates without a developer |
| US-07 | Content editor | translate content into French in the same entry | translations stay linked to the English version |

---

## 11. Acceptance Criteria (Key Scenarios)

**AC-01 — Language switch**
- Given the app is in English, when the user selects French, then all labels, categories, priorities, and empty-state text appear in French, the URL changes to the French path, and user-entered todo text remains unchanged.

**AC-02 — Missing French translation**
- Given a UI label has no French value, when the app is in French, then the English value is shown instead of a blank.

**AC-03 — Create todo**
- Given the user enters a valid title, when they save, then the todo appears in the list, a success message shows in the active language, and the backend stores it.

**AC-04 — Validation**
- Given the title is empty, when the user tries to save, then saving is blocked and the required-field message from Contentful is shown.

**AC-05 — Content update**
- Given an editor publishes a new category in Contentful, when the app is reloaded, then the new category appears in the dropdown in both languages.

**AC-06 — Backend failure**
- Given the mock backend returns an error, when the user loads the list, then a friendly localized error with a retry button is shown.

**AC-07 — Language persistence**
- Given the user chose French, when they return later, then the app opens in French.

---

## 12. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Initial page usable within 3 seconds on a typical connection. |
| NFR-02 | Performance | Contentful content should be cached per language for the session to avoid repeated calls. |
| NFR-03 | Accessibility | Meet WCAG 2.1 AA: keyboard navigation, focus states, labels, contrast. |
| NFR-04 | Responsiveness | Works on screens from 360px mobile to desktop. |
| NFR-05 | Browser support | Latest versions of Chrome, Edge, Firefox, Safari. |
| NFR-06 | Security | Contentful tokens kept in environment config, never in the repository; only the read-only Delivery token is used in the app. |
| NFR-07 | Maintainability | Contentful access and backend access are each isolated in their own service layer. |
| NFR-08 | Testability | Unit tests for core logic and services; key flows covered by end-to-end tests. |
| NFR-09 | Code quality | Linting and formatting rules enforced. |

---

## 13. Screens

| Screen | Description |
|---|---|
| Todo List (Home) | Header, add-todo form, filters, sort, search, list, remaining count, footer. |
| Add / Edit Todo | Form (inline or dialog) with all todo fields and validation. |
| Delete Confirmation | Confirmation dialog with localized text. |
| Help / FAQ | FAQ items from Contentful. |
| Not Found | Localized 404 page. |

---

## 14. Milestones

| Phase | Deliverable |
|---|---|
| 1. Setup | Contentful space, locales, content model, sample entries in EN and FR. |
| 2. Mock backend | Endpoints and seed data available locally. |
| 3. App shell | Angular app, routing with language in URL, header and footer from Contentful. |
| 4. Todo features | CRUD, filters, sort, search against the mock backend. |
| 5. Localization | Language switcher, fallback, persistence, date formatting. |
| 6. Quality | Error handling, accessibility review, tests. |
| 7. Review | Demo and sign-off against acceptance criteria. |

---

## 15. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Incomplete French translations | Mixed-language UI | Fallback to English; required French on key fields |
| Contentful API limits or outage | App content missing | Session caching and fallback message |
| Hard-coded strings slip into code | Breaks bilingual support | Code review checklist; test in French mode |
| Category deleted in Contentful but still used by todos | Broken labels | Show slug or "Uncategorized" as fallback |
| Mock backend differs from future real API | Rework later | Define API contract up front (Section 8) |

---

## 16. Open Questions

1. Confirm locale codes: `en-CA` / `fr-CA` or `en-US` / `fr`?
2. Should mock backend data persist between restarts?
3. Should Contentful Preview API be used to let editors preview drafts?
4. Is an "About" page required in addition to Help?
5. Should todo data be stored per language, or shared across languages (recommended: shared)?

---

## 17. Glossary

| Term | Meaning |
|---|---|
| BRD | Business Requirements Document |
| Headless CMS | A content system that delivers content through APIs, with no built-in front end |
| Content Type | A content structure in Contentful (like a table schema) |
| Entry | A single piece of content of a content type |
| Locale | A language/region setting, e.g. `fr-CA` |
| Fallback locale | Locale used when a translation is missing |
| Delivery API | Contentful's read-only API for published content |
| Preview API | Contentful's API for draft content |
| Slug | A stable, non-translated identifier |
| Mock backend | A simulated API used during development |

---

## 18. Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Product Owner | | | |
| Developer | | | |
| QA | | | |
