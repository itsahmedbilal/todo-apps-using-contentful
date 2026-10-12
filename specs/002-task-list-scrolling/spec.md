# Feature Specification: Task List Scrolling

**Feature Branch**: `002-task-list-scrolling`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "I want a scrolling effect after 10 tasks"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scroll within the task list once it grows past 10 tasks (Priority: P1)

A person with many tasks sees at most 10 tasks at a time in the task list area. When more than 10 tasks are shown, the list area stops growing and the person scrolls inside it to reach the rest. The header, filters, and add-task controls stay in place, so the person never has to scroll the whole page to get back to them.

**Why this priority**: This is the whole feature. Without it, a long list pushes the controls off screen.

**Independent Test**: Add 15 tasks. The list area shows 10 tasks and a scrollbar; scrolling inside it reveals tasks 11 to 15 while the header and controls stay visible. With 10 or fewer tasks, no scrolling appears.

**Acceptance Scenarios**:

1. **Given** the list shows 10 or fewer tasks, **When** the user views it, **Then** all tasks are visible and the list shows no scrolling.
2. **Given** the list shows more than 10 tasks, **When** the user views it, **Then** the first 10 tasks are fully visible in the list area, the 11th is not, and the rest are reachable by scrolling inside the list.
3. **Given** the list is scrollable, **When** the user scrolls, **Then** the header, filters, and add-task controls remain in place.
4. **Given** the list shows exactly 10 tasks and the user adds an 11th, **When** the task is saved, **Then** the list becomes scrollable and the new task is reachable.
5. **Given** the list is scrollable, **When** the user deletes tasks or filters down to 10 or fewer, **Then** the scrolling disappears and all tasks are visible.

---

### User Story 2 - Scroll with keyboard and assistive technology (Priority: P2)

A keyboard or screen reader user can reach, scroll, and understand the scrollable list as well as a mouse user can.

**Why this priority**: The constitution requires WCAG 2.1 AA; a scrollable area must not trap or hide content from these users.

**Independent Test**: With 15 tasks, use only the keyboard to move through all tasks and confirm each one comes into view and focus is always visible.

**Acceptance Scenarios**:

1. **Given** the list is scrollable, **When** the user tabs through the tasks, **Then** the focused task is always scrolled into view and its focus indicator is visible.
2. **Given** the list is scrollable, **When** the user focuses the list area, **Then** they can scroll it with the arrow, Page Up/Down, Home and End keys.
3. **Given** the list is scrollable, **When** a screen reader reads it, **Then** the area is announced with a label in the active language, taken from managed content.

---

### User Story 3 - Stay in place after changes (Priority: P3)

When a person edits, completes, or switches language, the list keeps its scroll position instead of jumping back to the top.

**Why this priority**: Prevents losing one's place, but the list is usable without it.

**Independent Test**: Scroll to task 12, mark it complete, and switch language; the list stays at the same place.

**Acceptance Scenarios**:

1. **Given** the user has scrolled down the list, **When** they complete, un-complete, or edit a task, **Then** the scroll position is unchanged.
2. **Given** the user has scrolled down the list, **When** they switch language, **Then** the scroll position is unchanged.
3. **Given** the user adds a task, **When** it is saved, **Then** the new task is visible, scrolling to it if needed.

### Edge Cases

- Task rows have different heights (long descriptions, French text expansion, small screens): the limit stays at 10 tasks, and the list area adjusts to the height of those 10 rows.
- Filters or search reduce the list to 10 or fewer tasks: scrolling disappears. The limit counts tasks currently shown, not all tasks.
- On a short or 360px-wide screen where 10 tasks cannot fit beside the controls, the list area is limited to the available height and still scrolls.
- The list shows the empty, loading, or error state: no scroll area is shown.
- Browser zoom up to 200% and reduced-motion settings: the content stays reachable and no scroll animation is forced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the task list shows 10 or fewer tasks, the system MUST show all of them with no scrolling inside the list.
- **FR-002**: When the task list shows more than 10 tasks, the system MUST limit the list area to the height of 10 tasks and let the user scroll inside it to reach the rest.
- **FR-003**: The limit MUST apply to the tasks currently shown after filtering, searching, and sorting.
- **FR-004**: The header, filters, search, sort, and add-task controls MUST remain visible while the user scrolls the list, and the height of the list MUST NOT push them off screen. When the add or edit form is open above the list, the list MUST shrink so the form and the list both stay reachable.
- **FR-005**: The list MUST be scrollable by mouse, touch, and keyboard.
- **FR-006**: The focused task MUST always be scrolled into view and show a visible focus indicator.
- **FR-007**: The scrollable list area MUST have an accessible label in the active language, supplied from managed content, in English and French.
- **FR-008**: The list MUST keep its scroll position when a task is edited, completed, or un-completed, and when the language is switched.
- **FR-009**: After a task is added, it MUST be visible to the user.
- **FR-010**: The list MUST NOT show a scroll area in the loading, empty, or error states.
- **FR-011**: The feature MUST NOT add any hard-coded user-visible text (constitution Principle II).
- **FR-012**: The feature MUST meet WCAG 2.1 AA and work on screens from 360px wide to desktop (constitution Principle V and FR-037 of feature 001).

### Key Entities

- **Interface Text**: One new entry holding the accessible label for the scrollable task list, in English and French (existing entity from feature 001).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With 11 or more tasks, 100% of the header and control elements stay visible while the user scrolls the entire list.
- **SC-002**: A user can reach every task in a list of 50 tasks by keyboard alone, with the focused task visible every time.
- **SC-003**: With 10 or fewer tasks, no scrollbar or scrolling is shown in 100% of checks.
- **SC-004**: After completing, editing, or language-switching a task, the list stays within one task of its previous scroll position in 100% of checks.
- **SC-005**: The scrolling list passes WCAG 2.1 AA checks in both languages at 360px width and at desktop width.

## Assumptions

- "After 10 tasks" means that once more than 10 tasks are shown, the list scrolls inside a fixed-height area; the page itself does not grow. This is the interpretation used here and can be changed in clarification.
- "Scrolling effect" means ordinary scrolling inside the list area, not an animated or decorative effect. Nothing is animated for users who prefer reduced motion.
- Pagination, "load more", and infinite scrolling are out of scope.
- The 10-task limit is fixed and not configurable by users or editors.
- The existing task list, filters, and language switching from feature 001 are reused unchanged apart from this behavior.
