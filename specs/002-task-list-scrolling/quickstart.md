# Quickstart: Validate Task List Scrolling

Prerequisites: setup from the root [README](../../README.md) is done (Contentful space seeded, `mock-backend` and `frontend` installed). Data shapes: [data-model.md](data-model.md). Content addition: [contracts/content-model-delta.md](contracts/content-model-delta.md).

## 1. Provision the new label

```powershell
cd contentful
npm run seed
npm test                     # expect: required key count is 67
npm run check:translations   # expect: pass, list.region.label present in en-CA and fr-CA
```

## 2. Run the app

```powershell
cd mock-backend; npm start        # port 3000 (resets to seed data)
cd frontend; npm start            # port 4200
```

## 3. Manual checks (English, then French via the header switcher)

| # | Do | Expect |
|---|----|--------|
| 1 | Have 10 or fewer tasks | No scrollbar; no extra tab stop on the list (SC-003) |
| 2 | Add tasks until there are 11 | List area shows 10 rows and scrolls; header and filters stay in place (FR-002, FR-004) |
| 3 | Scroll to the bottom with mouse, touch, then keyboard (Tab to the list, arrows, Page Down, End) | Every task reachable (FR-005) |
| 4 | Tab through the tasks | Focused task scrolls into view with a visible ring (FR-006) |
| 5 | Inspect the list with a screen reader | Announced as a region named "Task list" / "Liste des tâches" (FR-007) |
| 6 | Scroll down, mark a task complete, edit one, switch language | Scroll position unchanged (FR-008, SC-004) |
| 7 | Add a task that sorts near the end | It scrolls into view (FR-009) |
| 8 | Filter or search down to 10 or fewer | Scrolling disappears; clear the filter and it returns (FR-003) |
| 9 | Delete everything / force a load error | Empty or error state shows, no scroll area (FR-010) |
| 10 | Resize to 360px wide and zoom to 200% | List stays usable and all tasks reachable; in French, 10 rows still fit the measured height |

## 4. Automated

```powershell
cd frontend
npm run lint
npm test                    # directive and page unit tests
npm run e2e                 # includes e2e/us7-list-scrolling.spec.ts, EN and FR, axe at 360px and desktop
```

Expected: all green. The local quality gate in the constitution is satisfied only when lint, unit, e2e and axe all pass.
