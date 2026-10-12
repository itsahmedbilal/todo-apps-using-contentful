import { expect, test } from '@playwright/test';
import { label, localeOf, row, seedName, uniqueTitle } from './support';

const switcher = '[data-testid="language-switcher"]';

async function openForm(page: import('@playwright/test').Page): Promise<void> {
  await page
    .getByTestId('todo-add-button')
    .or(page.getByTestId('todo-empty-action'))
    .first()
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('todo-page-heading')).toBeVisible();
});

test('the form offers every seeded category and priority in the active language', async ({
  page,
}, testInfo) => {
  await openForm(page);
  const locale = localeOf(testInfo);
  const categories = await page
    .getByTestId('todo-category-select')
    .locator('option')
    .allInnerTexts();
  expect(categories).toEqual([
    label('form.category.none', testInfo),
    ...['personal', 'work', 'shopping', 'health'].map((slug) =>
      seedName('categories', slug, locale),
    ),
  ]);
  const priorities = await page
    .getByTestId('todo-priority-select')
    .locator('option')
    .allInnerTexts();
  expect(priorities).toEqual(
    ['high', 'medium', 'low'].map((slug) => seedName('priorities', slug, locale)),
  );
  await expect(page.getByTestId('todo-priority-select')).toHaveValue('medium');
});

test('AC-05: a newly published category appears in the dropdown in both languages after a reload', async ({
  page,
}) => {
  const newCategory = {
    sys: { id: 'category-e2e', type: 'Entry', contentType: { sys: { id: 'category' } } },
    fields: {
      name: { 'en-CA': 'E2E category', 'fr-CA': 'Catégorie E2E' },
      slug: { 'en-CA': 'e2e-new' },
      colour: { 'en-CA': '#1d6fa5' },
      sortOrder: { 'en-CA': 99 },
    },
  };
  // Stand in for an editor publishing a new category: add it to the Contentful response.
  await page.route('**/cdn.contentful.com/**/entries*', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (route.request().url().includes('content_type=category')) {
      body.items.push(newCategory);
      body.total = body.items.length;
    }
    await route.fulfill({ response, json: body });
  });

  for (const [lang, name] of [
    ['en', 'E2E category'],
    ['fr', 'Catégorie E2E'],
  ] as const) {
    await page.goto(`/${lang}/`);
    await page.reload();
    await openForm(page);
    await expect(
      page.getByTestId('todo-category-select').locator('option[value="e2e-new"]'),
    ).toHaveText(name);
  }
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('a task keeps its category and priority, in the new language, when the language changes', async ({
  page,
}, testInfo) => {
  const title = uniqueTitle(testInfo, 'Organised');
  await openForm(page);
  await page.getByTestId('todo-title-input').fill(title);
  await page.getByTestId('todo-category-select').selectOption('shopping');
  await page.getByTestId('todo-priority-select').selectOption('high');
  await page.getByTestId('todo-save').click();

  const item = row(page, title);
  const here = localeOf(testInfo);
  const there = here === 'en-CA' ? 'fr-CA' : 'en-CA';
  await expect(item.getByTestId('todo-category')).toHaveText(
    seedName('categories', 'shopping', here),
  );
  await expect(item.getByTestId('todo-priority')).toHaveText(seedName('priorities', 'high', here));

  await page.locator(switcher).click();
  await expect(item.getByTestId('todo-category')).toHaveText(
    seedName('categories', 'shopping', there),
  );
  await expect(item.getByTestId('todo-priority')).toHaveText(seedName('priorities', 'high', there));
  await expect(item.getByTestId('todo-title')).toHaveText(title);
});

test('a task whose category no longer exists shows the uncategorized label', async ({
  page,
  request,
}, testInfo) => {
  const title = uniqueTitle(testInfo, 'Orphan');
  await request.post('http://localhost:3000/todos', {
    data: { title, categorySlug: 'removed-category', prioritySlug: 'low' },
  });
  await page.reload();
  await expect(row(page, title).getByTestId('todo-category')).toHaveText(
    label('status.uncategorized', testInfo),
  );
});
