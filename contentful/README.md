# Contentful provisioning

Creates the content model and starting content for the bilingual todo app.
The model is defined in `specs/001-bilingual-todo-app/contracts/content-model.md`; the migrations here implement it.

## 1. Locales

Run `npm run locales` to create them. It renames the default locale to `en-CA` (only while the space has no
entries) and adds `fr-CA`. It is safe to re-run. Contentful migrations cannot manage locales, so this is a
separate script. To do it by hand instead, use the web app (Settings > Locales):

| Locale | Code | Settings |
|--------|------|----------|
| English (Canada) | `en-CA` | Default locale. Required for publishing. |
| French (Canada) | `fr-CA` | Fallback locale: `en-CA`. Optional (not required) for publishing. |

The app also requests all locales and resolves the fallback itself, so a missing French value never
shows a blank. A missing French value is still a defect: every entry must have French before a feature
is done (see `npm run check:translations` below).

## 2. Create the tokens

| Token | Where | Used by | Rule |
|-------|-------|---------|------|
| Management token | Settings > CMA tokens | `migrate` and `seed` (this folder) | Keep in your shell only. Never commit it, never put it in the app. |
| Delivery token | Settings > API keys | The Angular app | Read-only, published content only. Goes in `frontend/src/environments/environment.local.ts` (gitignored). |

## 3. Run the provisioning

PowerShell:

```powershell
cd contentful
npm install
$env:CONTENTFUL_SPACE_ID = "<space id>"
$env:CONTENTFUL_ENVIRONMENT_ID = "master"
$env:CONTENTFUL_MANAGEMENT_TOKEN = "<management token>"
npm run locales    # en-CA (default) and fr-CA
npm run migrate    # creates the 7 content types, in order
npm run seed       # creates and publishes the starting entries
```

- `npm run migrate` runs `migrations/001` to `003` in filename order. Run it once per environment; running it
  again on a space that already has the content types will fail.
- `npm run seed` is safe to run again. Each entry has a fixed id (for example `uiLabel-button.addTodo`,
  `category-personal`, `page-home`), so a second run updates the same entries instead of adding duplicates.
- Both commands read the three environment variables above. If one is missing they stop and name it. The
  token is never printed or written to disk.

## 4. What gets created

| Content type | Seeded entries |
|--------------|----------------|
| `appSettings` | 1 |
| `uiLabel` | 66, one per key in the content-model contract, each with `en-CA` and `fr-CA` |
| `category` | personal, work, shopping, health |
| `priority` | low, medium, high |
| `emptyState` | 1 (home) |
| `page` | home, help |
| `faqItem` | 3 |

No images are seeded. If you add a logo or an empty-state illustration, you must also fill in the
localized alt text (`logoAlt`, `illustrationAlt`) in both languages.

The French text is a first draft. French content must be reviewed for correctness before it is published
for real users.

## 5. Check translations

```powershell
$env:CONTENTFUL_SPACE_ID = "<space id>"
$env:CONTENTFUL_ENVIRONMENT_ID = "master"
$env:CONTENTFUL_DELIVERY_TOKEN = "<Delivery token>"   # read-only, not the Management token
npm run check:translations
```

Lists every localized field of every published entry that lacks an `en-CA` or `fr-CA` value, every key in
`scripts/required-keys.json` (the contract's label list) with no `uiLabel` entry, and any logo or illustration
without alt text in both languages. It exits non-zero if anything is listed, so it is the done gate. It reads
with `locale=*`, so the runtime English fallback never hides a missing French value. Editors: see `EDITORS.md`.

## 6. Tests

```powershell
npm test    # import, locale and translation-check tests, with the Management client mocked (no network, no token)
```

## Field validations

The migrations enforce required fields, unique keys and slugs, patterns and length limits exactly as listed
in the content-model contract (CG-03). Localized required fields are checked against the default locale only;
French completeness is enforced by the translation check, not by Contentful.

Checked field by field against the contract: every required flag, unique flag, pattern, `in` list, length
limit and the priority `level` range 1-10 in migrations `001` to `003` matches `content-model.md`.
