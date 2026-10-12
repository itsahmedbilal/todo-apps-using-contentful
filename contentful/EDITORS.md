# Editor guide

Every word the app shows comes from Contentful, in English and in French. You can change any of it
without a developer. Task titles and descriptions typed by users are not content; they are never translated.

## Change a label in both languages

1. In Contentful, open **Content** and filter by the content type **UI Label**.
2. Find the label by its **key** (for example `button.save`). Do not change the key; the app finds text by it.
3. Fill in **Value** for **English (Canada)** and for **French (Canada)**.
4. Click **Publish changes**.
5. Reload the app. The new wording appears in both languages.

A label may contain `{count}`. Keep it exactly as written; the app replaces it with a number.

## Add or change a category or priority

- **Category**: open **Category**, add an entry or edit one. Fill in **Name** in English and French, a unique
  **Slug** (lowercase letters, numbers and dashes), a **Colour** (like `#1d6fa5`) and a **Sort order**.
- **Priority**: open **Priority**. Fill in **Label** in both languages, the **Slug** (`low`, `medium` or
  `high`), a **Level** (1 to 10, higher is more important) and a **Colour**.

Publish the entry. It appears in the app's lists after a reload, in both languages. Do not change a slug that
tasks already use; tasks keep the old slug and would show as "Uncategorized".

## Pages, empty state and FAQ

Edit **Page** (Home, Help), **Empty State** and **FAQ Item** the same way. Fill in every text field in both
languages. If you add a picture (a logo or an illustration), you must also fill in its alt text, the
**Logo alt** or **Illustration alt** field, in both languages.

## Why a change does not show

The app only shows **published** content. A draft, or an edit you have not published, is invisible to users.
Click **Publish changes** (or **Publish** for a new entry). A label that is not published shows as blank;
the app never shows the raw key.

## French is required

An entry is not finished until the French text is filled in. If French is missing, the app falls back to
English so users never see a blank, but that is a safety net, not the goal.

To find what is missing, ask a developer to run `npm run check:translations` in the `contentful` folder, or
run it yourself with the read-only Delivery token (see the README). It lists every field that lacks an English
or French value, every required label that does not exist, and every picture without alt text. It reads the
raw values for both languages, so a missing French value is always reported even though users would see
English. Fix everything it lists and publish.
