import { Page, expect, test } from '@playwright/test';
import { label } from './support';

const LABEL_KEY = 'filter.status.label';
const LABEL_TEST_ID = 'filter-status-label';

interface LabelEntry {
  fields: { key: Record<string, string>; value: Record<string, string> };
}

/**
 * Stands in for an editor's change in Contentful: the uiLabel response is passed through `change`
 * before the app sees it. Replace `change` to simulate a later edit.
 */
async function editLabels(page: Page, change: (items: LabelEntry[]) => LabelEntry[]) {
  let current = change;
  await page.route('**/cdn.contentful.com/**/entries*', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (route.request().url().includes('content_type=uiLabel')) {
      body.items = current(body.items);
      body.total = body.items.length;
    }
    await route.fulfill({ response, json: body });
  });
  return (next: typeof change) => (current = next);
}

const target = (items: LabelEntry[]) =>
  items.find((item) => item.fields.key['en-CA'] === LABEL_KEY)!;

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('a label an editor changes and publishes shows after a reload', async ({ page }, testInfo) => {
  const edited = `Edited ${testInfo.project.name} ${Date.now()}`;
  await editLabels(page, (items) => {
    target(items).fields.value = { 'en-CA': edited, 'fr-CA': edited };
    return items;
  });
  await page.goto('./');
  await expect(page.getByTestId(LABEL_TEST_ID)).toHaveText(edited);
  await page.reload();
  await expect(page.getByTestId(LABEL_TEST_ID)).toHaveText(edited);
});

test('an unedited label shows the published wording', async ({ page }, testInfo) => {
  await page.goto('./');
  await expect(page.getByTestId(LABEL_TEST_ID)).toHaveText(label(LABEL_KEY, testInfo));
});

test('a draft-only entry (absent from the Delivery API) is not shown, and the raw key never is', async ({
  page,
}) => {
  await editLabels(page, (items) => items.filter((item) => item !== target(items)));
  await page.goto('./');
  await expect(page.getByTestId('filters-bar')).toBeVisible();
  await expect(page.getByTestId(LABEL_TEST_ID)).toHaveText('');
  await expect(page.locator('body')).not.toContainText(LABEL_KEY);
});

test('an added French value replaces the English fallback', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('fr'), 'The fallback only happens in French.');
  const english = `English only ${Date.now()}`;
  const french = `Version française ${Date.now()}`;

  const setEdit = await editLabels(page, (items) => {
    target(items).fields.value = { 'en-CA': english };
    return items;
  });
  await page.goto('./');
  await expect(page.getByTestId(LABEL_TEST_ID)).toHaveText(english);
  await expect(page.getByTestId(LABEL_TEST_ID)).toHaveAttribute('lang', 'en-CA');

  setEdit((items) => {
    target(items).fields.value = { 'en-CA': english, 'fr-CA': french };
    return items;
  });
  await page.reload();
  await expect(page.getByTestId(LABEL_TEST_ID)).toHaveText(french);
  await expect(page.getByTestId(LABEL_TEST_ID)).not.toHaveAttribute('lang', /.+/);
});
