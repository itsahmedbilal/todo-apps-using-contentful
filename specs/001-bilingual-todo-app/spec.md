# Feature Specification: Bilingual Todo App

**Feature Branch**: `001-bilingual-todo-app`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Bilingual todo app as described in docs/BRD.md sections 2, 6, 9, 10, 11. Focus on user needs, not tech." (BRD source: `Todo-App-BRD.md`)

## Clarifications

### Session 2026-10-12

- Q: Which language versions should the app support: plain English and French, or Canadian English and Canadian French? → A: Canadian English (en-CA, default) and Canadian French (fr-CA); French falls back to English.
- Q: Should created tasks persist across restarts, or may they reset? → A: They may reset; at least 5 sample tasks (spread across categories and priorities) are reloaded on every start.
- Q: Can a user pick a due date in the past? → A: Yes; past dates are allowed, and an incomplete task with a past due date is shown as overdue.
- Q: Should "clear completed" ask for confirmation? → A: Yes; the confirmation states how many tasks will be removed.
- Q: When French text is missing and English is shown, should the user be told? → A: No visible notice; English text is shown quietly and marked as English for assistive technologies.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage my tasks (Priority: P1)

A person opens the app and sees their list of tasks. They add a new task with a title and, optionally, a description, category, priority, and due date. They can edit any detail later, mark a task done (or not done) with one click, and delete a task after confirming. This is the core value: a working task list.

**Why this priority**: Without task management there is no product. This slice alone is a usable MVP.

**Independent Test**: Open the app, add a task, edit it, mark it complete, then delete it with confirmation. The list reflects each change and a confirmation message appears after saving and deleting.

**Acceptance Scenarios**:

1. **Given** the user enters a valid title, **When** they save, **Then** the task appears in the list, and a success message is shown in the active language.
2. **Given** the title is empty, **When** the user tries to save, **Then** saving is blocked and a required-field message is shown next to the field in the active language.
3. **Given** an existing task, **When** the user edits any of its fields and saves, **Then** the list shows the updated values.
4. **Given** an active task, **When** the user marks it complete (or a completed task incomplete) with one click, **Then** its status changes immediately.
5. **Given** an existing task, **When** the user chooses delete, **Then** they are asked to confirm, and only after confirming the task is removed and a success message is shown.
6. **Given** there are no tasks, **When** the user views the list, **Then** a friendly empty-state message is shown instead of a blank screen.
7. **Given** the task data cannot be loaded or saved, **When** the user loads or changes the list, **Then** a friendly error message with a retry option is shown, and the app remains usable.

---

### User Story 2 - Use the app in English or French (Priority: P1)

A person can switch the whole app between English and French at any time from the header. Everything the app says (labels, buttons, categories, priorities, messages, page text, help content, and dates) changes language without losing their place. Tasks they typed themselves stay exactly as written. The app remembers their language for next time.

**Why this priority**: Bilingual support is the defining purpose of the product; French-speaking users must feel the experience is native.

**Independent Test**: Switch from English to French and verify every piece of app text, the date formats, and the address of the page change, while task titles and descriptions typed by the user are unchanged. Close and reopen the app and confirm French is still selected.

**Acceptance Scenarios**:

1. **Given** the app is in English, **When** the user selects French, **Then** all labels, categories, priorities, and empty-state text appear in French, the page address shows French, and user-entered task text is unchanged.
2. **Given** the user switches language, **When** the switch completes, **Then** it happens without a full page reload and without losing the user's current list view or unsaved form entries.
3. **Given** the user previously chose French, **When** they return later, **Then** the app opens in French.
4. **Given** a first-time visitor with no saved preference, **When** they open the app with no language in the address, **Then** the app uses their browser language if it is English or French, otherwise English.
5. **Given** the page address includes a language, **When** the app opens, **Then** that language takes priority over any saved preference or browser language.
6. **Given** a piece of text has no French version, **When** the app is in French, **Then** the English text is shown instead of a blank, with no visible notice, and is identified as English to assistive technologies.
7. **Given** the app is in either language, **When** dates are shown, **Then** they use that language's date format, and assistive technologies are told the page language.

---

### User Story 3 - Organise tasks with categories and priorities (Priority: P2)

A person assigns each task a category (Personal, Work, Shopping, Health) and a priority (Low, Medium, High). Category and priority choices appear in the user's language. Tasks keep their category and priority regardless of which language is selected.

**Why this priority**: Organisation is the key reason to go beyond a plain list, and it showcases localized managed content, but a basic list works without it.

**Independent Test**: Create a task with a category and priority in English, switch to French, and confirm the same category and priority appear with French names.

**Acceptance Scenarios**:

1. **Given** the add/edit form is open, **When** the user opens the category or priority choices, **Then** the options are shown in the active language, in the intended display order.
2. **Given** a task has a category and priority, **When** the user switches language, **Then** the task shows the same category and priority in the new language.
3. **Given** a content editor publishes a new category, **When** the app is reloaded, **Then** the new category appears in the choices in both languages.
4. **Given** a task uses a category that no longer exists, **When** the list is shown, **Then** the task still displays and shows "Uncategorized" (in the active language) instead of a broken label.

---

### User Story 4 - Find and focus on the right tasks (Priority: P2)

A person narrows the list to what matters: only active tasks, only completed tasks, a given category or priority, or tasks whose title matches a search. They can sort by due date, priority, or created date. The app shows how many active tasks remain.

**Why this priority**: Makes the list useful as it grows; builds on Story 1.

**Independent Test**: With a mix of tasks, choose "Active", then a category, then search by a word in a title; the list narrows each time. Change the sort and confirm the order changes. The remaining count matches the number of active tasks.

**Acceptance Scenarios**:

1. **Given** a mix of tasks, **When** the user chooses All, Active, or Completed, **Then** only matching tasks are shown.
2. **Given** a mix of tasks, **When** the user filters by category and/or priority, **Then** only tasks matching all chosen filters are shown.
3. **Given** a search word, **When** the user searches, **Then** only tasks whose title contains the word are shown, regardless of capitalisation.
4. **Given** tasks with different due dates, priorities, and created dates, **When** the user picks a sort, **Then** the list is ordered accordingly.
5. **Given** any list state, **When** a task is completed, added, or deleted, **Then** the remaining-active count updates immediately.
6. **Given** the filters match nothing, **When** the list is shown, **Then** a friendly message explains that no tasks match.

---

### User Story 5 - Editors update all text without a developer (Priority: P2)

A content editor changes any button text, message, category, priority, page heading, or help entry, in English or French, in one place, and the app reflects it after publishing. Translations for an item stay linked together. Only published content is shown to users.

**Why this priority**: This is a core business objective: wording and translations must be managed by editors, not developers.

**Independent Test**: An editor changes a button label in both languages and publishes; reloading the app shows the new wording in each language. An unpublished change is not shown.

**Acceptance Scenarios**:

1. **Given** an editor edits and publishes a label, **When** the app is reloaded, **Then** the new text appears in the matching language.
2. **Given** an entry is still a draft, **When** users load the app, **Then** the draft is not shown.
3. **Given** an editor adds a French version to an existing item, **When** it is published, **Then** French users see it and no longer see the English fallback.

---

### User Story 6 - Get help and clear feedback (Priority: P3)

A person can open a Help page with frequently asked questions, see page titles and descriptions in their language, see loading indicators while things load, and clear all completed tasks at once. Overdue tasks stand out visually.

**Why this priority**: Polish that improves confidence and speed but is not required for the core experience.

**Independent Test**: Open Help and read the questions in both languages; complete several tasks and clear them in one action; view a task with a past due date and see it highlighted.

**Acceptance Scenarios**:

1. **Given** the user opens Help, **When** the page loads, **Then** the questions and answers are shown in the active language in the intended order.
2. **Given** content or tasks are loading, **When** the user waits, **Then** a loading indicator is visible.
3. **Given** completed tasks exist, **When** the user chooses "clear completed" and confirms, **Then** all completed tasks are removed and active tasks are untouched.
4. **Given** an active task has a due date in the past, **When** the list is shown, **Then** it is visually highlighted as overdue, in a way that does not rely on colour alone.
5. **Given** each page, **When** it is shown, **Then** its title and description are in the active language.

---

### Edge Cases

- The text content source is unreachable: the app shows a minimal built-in fallback message instead of crashing or showing blank/raw placeholder text. This minimal message is the only text allowed outside the managed content.
- Title is exactly 120 characters (accepted) or 121 (rejected with a message in the active language); description over 500 characters is rejected the same way.
- A task is edited in one language and viewed in the other: its title and description are identical in both.
- A language is requested in the address that is neither English nor French: the app falls back to the default language.
- A French value is missing for any piece of content at runtime: English is shown (see User Story 2) as a safety net only. A missing French value is a defect, because every content entry must have French before a feature is done (FR-038).
- The user switches language while a form is open with unsaved input: the entered text is preserved.
- Rapid repeated clicks on complete/delete do not create duplicate actions or inconsistent state.
- The page opened at an unknown address shows a localized "not found" page.
- A task's due date is today: it is not treated as overdue.
- A user picks a due date in the past: it is accepted, and the task is shown as overdue until it is completed. Completed tasks are never shown as overdue.

## Requirements *(mandatory)*

### Functional Requirements

**Task management**

- **FR-001**: Users MUST be able to view a list of all their tasks.
- **FR-002**: Users MUST be able to add a task with a title (required, 1–120 characters) and optional description (up to 500 characters), category, priority (default Medium), and due date.
- **FR-003**: Users MUST be able to edit any field of an existing task.
- **FR-004**: Users MUST be able to mark a task complete or incomplete with one action.
- **FR-005**: Users MUST be asked to confirm before a task is deleted.
- **FR-006**: Users MUST be able to filter tasks by status: All, Active, Completed.
- **FR-007**: Users SHOULD be able to filter tasks by category and by priority.
- **FR-008**: Users SHOULD be able to sort tasks by due date, priority, or created date.
- **FR-009**: Users SHOULD be able to search tasks by title.
- **FR-010**: The app SHOULD show the count of remaining active tasks.
- **FR-011**: Users MAY clear all completed tasks at once, after a confirmation that states how many tasks will be removed.
- **FR-012**: The app MAY visually highlight overdue tasks, without relying on colour alone.

**Language and content**

- **FR-013**: All user-facing text MUST come from the managed content source, in English and French. The only exception is one hard-coded English/French fallback message (including its retry wording), shown only when that source cannot be reached.
- **FR-014**: Users MUST be able to switch between English and French at any time from the header, and all text MUST update without a full page reload.
- **FR-015**: The app MUST remember the user's chosen language for their next visit.
- **FR-016**: The initial language MUST be chosen in this order: language in the page address, saved preference, browser language, English.
- **FR-017**: The page address MUST reflect the current language.
- **FR-018**: When French text is missing, the app MUST show the English text instead, without a visible notice, and MUST mark that text as English for assistive technologies.
- **FR-019**: Dates MUST be displayed in the format of the selected language's Canadian variant (English-Canada or French-Canada).
- **FR-020**: The page language indicated to assistive technologies MUST match the selected language.
- **FR-021**: Task titles and descriptions entered by the user MUST be shown exactly as typed and MUST NOT be translated.
- **FR-022**: Tasks MUST keep their category and priority independent of language; the displayed names MUST be looked up in the active language.
- **FR-023**: Category and priority choices MUST be populated from managed content in the active language, in their configured display order.
- **FR-024**: The header MUST show the app title, logo (with its text alternative in the active language), and language switcher from managed content.
- **FR-025**: An empty task list MUST show the configured empty-state content (heading, message, optional call to action).
- **FR-026**: A Help page SHOULD show frequently asked questions in the active language and configured order.
- **FR-027**: Page titles and descriptions SHOULD be provided per language.
- **FR-028**: Only published content MUST be shown to users.
- **FR-029**: Content editors MUST be able to change any text, category, priority, or help entry in either language without developer involvement.
- **FR-030**: A task whose category no longer exists MUST still display, labelled "Uncategorized" in the active language.
- **FR-038**: Every managed content entry MUST have both English and French values before a feature is considered done. English fallback at runtime (FR-018) is a safety net only, not a way to ship untranslated content.
- **FR-039**: Every image shown from managed content (logo, empty-state illustration) MUST have a text alternative in the active language.

**Feedback and errors**

- **FR-031**: The app MUST show loading indicators while content or tasks load.
- **FR-032**: The app MUST show success messages after saving and deleting a task, in the active language.
- **FR-033**: The app MUST show a friendly error message with a retry option when tasks cannot be loaded or saved.
- **FR-034**: If the managed content is unreachable, the app MUST show the fallback message and MUST NOT crash.
- **FR-035**: Form validation messages MUST appear next to the relevant field, in the active language.

**Accessibility and quality** (from project constitution)

- **FR-036**: The app MUST meet WCAG 2.1 AA, including keyboard operation, visible focus, labelled controls, and sufficient contrast, in both languages.
- **FR-037**: The app MUST be usable on screens from 360px wide to desktop.

### Key Entities

- **Task**: A user's to-do item. Has a title, optional description, completed status (default not complete), optional category, priority (default Medium), optional due date, and created and last-updated times. Titles and descriptions are language-independent.
- **Category**: A way to group tasks (initially Personal, Work, Shopping, Health). Has a stable identifier, a name per language, a display colour, an optional icon, and a display order. Tasks refer to it by its stable identifier.
- **Priority**: A task's importance (Low, Medium, High). Has a stable identifier, a label per language, a level used for sorting, and a display colour.
- **Interface Text**: A small reusable piece of wording (button, placeholder, message, validation message), identified by a stable key and available in English and French.
- **Page**: A screen's heading, introductory copy, search-engine title and description, and optional empty-state content, per language.
- **Empty State**: Heading, message, optional illustration (with a text alternative per language) and call-to-action label shown when there is nothing to display.
- **Help Entry**: A question and answer per language with a display order.
- **Language Preference**: The user's chosen language, remembered between visits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can add their first task in under 30 seconds without instructions.
- **SC-002**: 100% of user-visible text (excluding text typed by the user and the single fallback message) appears in French when French is selected, verified by a full walkthrough of every screen and state.
- **SC-003**: Switching language updates the whole screen in under 1 second, with no loss of the user's list position or unsaved form input.
- **SC-004**: A returning user who chose French sees the app in French on 100% of their next visits.
- **SC-005**: A content editor can change a piece of wording in both languages and see it live in the app within 10 minutes of publishing, with no developer help.
- **SC-006**: The main task screen is usable within 3 seconds on a typical connection.
- **SC-007**: All key scenarios (AC-01 to AC-07 in the BRD) pass in both English and French.
- **SC-008**: The app passes WCAG 2.1 AA checks on every screen in both languages, and every function can be completed with the keyboard alone.
- **SC-009**: In an error situation (tasks cannot be loaded, or text source unreachable), 100% of users see a readable message and a way forward, never a blank or broken screen.
- **SC-010**: Users complete core actions (add, edit, complete, delete) successfully on the first attempt at least 90% of the time in usability testing, in both languages.

## Assumptions

- A single anonymous user uses the app; there is no login or multiple accounts.
- Supported languages are English and French only, specifically Canadian English (`en-CA`, the default) and Canadian French (`fr-CA`). The project constitution's shorthand "EN/FR" refers to these two.
- Task data in the prototype resets when the supporting service restarts; permanent storage is not required. On every start the app has at least 5 sample tasks across different categories and priorities.
- Tasks are shared across languages (not stored per language).
- Users can see only published content; previewing drafts is out of scope.
- An About page is out of scope; Help and a not-found page are included.
- Notifications, reminders, email, offline use, data sync, additional languages, and production deployment are out of scope.
- Supported browsers are the latest versions of Chrome, Edge, Firefox, and Safari.
- Editors provide both English and French for every content entry before publishing (including image text alternatives); French content is reviewed for correctness before publishing. English fallback exists at runtime only as a safety net.
- Other requirements from the BRD not selected for this feature (data contracts, content model detail, milestones, risks) will be handled during planning.
