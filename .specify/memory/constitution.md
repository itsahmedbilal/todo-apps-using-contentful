<!--
Sync Impact Report
- Version change: 1.1.0 → 1.1.1 (PATCH: locale codes clarified; no semantic change)
- Modified principles:
  - IV. Bilingual Support: locales stated as en-CA (default) and fr-CA (falls back to en-CA)
- Previous amendment (1.0.0 → 1.1.0), kept for review:
  - II. No Hard-Coded UI Text: added a single permitted fallback message
  - III. Contentful as the Single Content Source: cross-references the fallback exception
  - V. Accessibility and Unit Tests: CI requirement replaced by a local quality gate
- Added sections: none
- Modified sections: Development Workflow & Quality Gates (local quality gate replaces merge gate)
- Removed sections: none
- Deferred TODOs: none
-->

# Todo App Constitution

## Core Principles

### I. Angular Best Practices
All front-end code MUST follow the current official Angular style guide and recommendations.
- Components MUST be standalone, use `OnPush` change detection, and keep templates free of
  business logic.
- State and async flows MUST use Signals and/or RxJS with explicit unsubscription handling
  (no leaked subscriptions).
- TypeScript MUST run in `strict` mode; `any` is prohibited unless justified in review.
- Features MUST be organized by feature folder with lazy-loaded routes; shared logic lives in
  injectable services, not components.
- Linting (`ng lint`) and formatting MUST pass with zero errors before merge.

Rationale: consistent, idiomatic Angular keeps the codebase maintainable and performant.

### II. No Hard-Coded UI Text (NON-NEGOTIABLE)
No user-visible string MAY be written literally in templates, components, services, or tests
of UI behavior. This includes labels, buttons, headings, placeholders, validation and error
messages, empty states, tooltips, and `aria-*`/`alt`/`title` text.
- Every such string MUST be referenced by content key and resolved at runtime.
- Reviews and lint rules MUST reject literal UI text in templates.

Single permitted exception: exactly one hard-coded fallback message, written in both English
and French, MAY exist in code. It MUST be shown only when Contentful is unreachable, and it MUST
NOT be used for any other state, screen, or error. Any further hard-coded text requires a
constitution amendment.

Rationale: a single content source makes copy changes, translation, and audits safe. The one
exception exists because an outage of the content source cannot supply its own error text.

### III. Contentful as the Single Content Source
All UI text MUST originate from Contentful, except the single fallback message permitted by
Principle II.
- Content models MUST be defined in Contentful and fetched through one dedicated content
  service; components MUST NOT call the Contentful API directly.
- Content MUST be retrieved per locale and cached; the app MUST handle loading and
  failure states without displaying raw keys or blank controls to users.
- Content model changes MUST be documented in the feature spec/plan before implementation.

Rationale: content owners can update copy without code deployments.

### IV. Bilingual Support: English and French
The application MUST fully support Canadian English (`en-CA`, the default) and Canadian French
(`fr-CA`, which falls back to `en-CA`).
- Every content entry MUST exist in both locales before a feature is considered done.
- Users MUST be able to switch language at runtime; the choice MUST persist, and the
  `<html lang>` attribute MUST reflect the active locale.
- Dates, numbers, and pluralization MUST use locale-aware formatting.
- Layouts MUST tolerate French text expansion without truncation or overlap.

Rationale: both language audiences get an equivalent experience.

### V. Accessibility (WCAG 2.1 AA) and Unit Tests (NON-NEGOTIABLE)
The application MUST conform to WCAG 2.1 Level AA.
- All functionality MUST be keyboard operable with visible focus; semantic HTML and ARIA
  MUST be used correctly; color contrast MUST meet AA ratios.
- Automated accessibility checks (axe) MUST pass as part of the local quality gate defined in
  Development Workflow & Quality Gates.

Unit tests are required for all new and changed code.
- Components, services, pipes, guards, and utilities MUST have unit tests covering behavior
  and error paths; Contentful access MUST be mocked in tests.
- Tests MUST pass the local quality gate before a feature is done; a bug fix MUST include a
  regression test.

Rationale: accessibility and verified behavior are release criteria, not enhancements.

## Technical Constraints

- Framework: Angular (latest stable major) with TypeScript strict mode.
- Content: Contentful (delivery API); credentials MUST be supplied through environment
  configuration and never committed to source control.
- Testing: the Angular default unit test runner configured in the project; accessibility checks
  via axe or equivalent.
- Dependencies MUST be justified; prefer Angular built-ins over third-party libraries.

## Development Workflow & Quality Gates

- Every feature MUST proceed through spec → plan → tasks; plans MUST include a Constitution
  Check against Principles I–V.
- Local quality gate: a feature is done only when lint, unit tests, end-to-end tests, and axe
  accessibility checks all pass when run locally, with the results confirmed before the feature
  is accepted. A hosted CI pipeline is not required.
- Code review MUST confirm: no literal UI text, EN/FR content present, keyboard and screen
  reader behavior verified, tests included.
- Deviations from any principle MUST be recorded with justification in the plan's complexity
  tracking and approved by the project owner.

## Governance

This constitution supersedes other practices and conventions for this project.
- Amendments MUST be proposed in writing, state the rationale and impact on existing specs,
  and be approved by the project owner; the document and version are updated together.
- Versioning follows semantic versioning: MAJOR for removed or redefined principles, MINOR for
  added principles or materially expanded guidance, PATCH for clarifications.
- All pull requests and reviews MUST verify compliance; unresolved violations block merge.

**Version**: 1.1.1 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-13
