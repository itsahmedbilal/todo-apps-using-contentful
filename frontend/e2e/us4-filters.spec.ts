import AxeBuilder from '@axe-core/playwright';
import { APIRequestContext, Page, TestInfo, expect, test } from '@playwright/test';
import { label, localeOf, seedName, uniqueTitle } from './support';

const api = 'http://localhost:3000/todos';

interface Seeded {
  title: string;
  completed?: boolean;
  categorySlug?: string | null;
  prioritySlug?: string;
  dueDate?: string | null;
}

async function seed(request: APIRequestContext, tasks: Seeded[]): Promise<void> {
  for (const task of tasks) {
    // Posted one at a time so createdAt is increasing in the order given.
    const response = await request.post(api, { data: task });
    expect(response.ok()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/** The titles of the listed tasks that belong to this test (they share a unique prefix). */
async function listed(page: Page, prefix: string): Promise<string[]> {
  const titles = await page.getByTestId('todo-title').allInnerTexts();
  return titles.filter((title) => title.startsWith(prefix));
}

async function search(page: Page, prefix: string): Promise<void> {
  await page.getByTestId('filter-search').fill(prefix);
}

function remainingText(count: number, testInfo: TestInfo): string {
  const locale = localeOf(testInfo);
  const one = new Intl.PluralRules(locale).select(count) === 'one';
  return label(one ? 'status.itemsRemaining.one' : 'status.itemsRemaining.other', testInfo).replace(
    '{count}',
    String(count),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('filters-bar')).toBeVisible();
});

test('filters by status, category and priority, and combines them', async ({
  page,
  request,
}, testInfo) => {
  const prefix = uniqueTitle(testInfo, 'Filter');
  await seed(request, [
    { title: `${prefix} a`, categorySlug: 'work', prioritySlug: 'high' },
    { title: `${prefix} b`, categorySlug: 'work', prioritySlug: 'low', completed: true },
    { title: `${prefix} c`, categorySlug: 'health', prioritySlug: 'high' },
  ]);
  await page.reload();
  await search(page, prefix);
  expect(await listed(page, prefix)).toHaveLength(3);

  await page.getByTestId('filter-status').selectOption('completed');
  await expect.poll(() => listed(page, prefix)).toEqual([`${prefix} b`]);

  await page.getByTestId('filter-status').selectOption('active');
  await expect.poll(() => listed(page, prefix)).toEqual([`${prefix} c`, `${prefix} a`]);

  await page.getByTestId('filter-category').selectOption('work');
  await expect.poll(() => listed(page, prefix)).toEqual([`${prefix} a`]);

  await page.getByTestId('filter-category').selectOption('');
  await page.getByTestId('filter-priority').selectOption('high');
  await expect.poll(() => listed(page, prefix)).toEqual([`${prefix} c`, `${prefix} a`]);

  await page.getByTestId('filter-status').selectOption('all');
  await page.getByTestId('filter-category').selectOption('health');
  await expect.poll(() => listed(page, prefix)).toEqual([`${prefix} c`]);
});

test('searches titles ignoring case, shows the no-results message and clears the search', async ({
  page,
  request,
}, testInfo) => {
  const prefix = uniqueTitle(testInfo, 'Search');
  await seed(request, [{ title: `${prefix} Buy Bread` }, { title: `${prefix} Call mum` }]);
  await page.reload();

  await search(page, `${prefix} buy BREAD`.toUpperCase());
  await expect.poll(() => listed(page, prefix)).toEqual([`${prefix} Buy Bread`]);

  await search(page, `${prefix} nothing-like-this`);
  await expect(page.getByTestId('todo-no-results')).toHaveText(
    label('message.noResults', testInfo),
  );
  await expect(page.getByTestId('todo-item')).toHaveCount(0);

  await page.getByTestId('filter-search-clear').click();
  await expect(page.getByTestId('filter-search')).toHaveValue('');
  await expect(page.getByTestId('todo-no-results')).toHaveCount(0);
  await expect(page.getByTestId('todo-item').first()).toBeVisible();
});

test('sorts by due date, priority and created date', async ({ page, request }, testInfo) => {
  const prefix = uniqueTitle(testInfo, 'Sort');
  await seed(request, [
    { title: `${prefix} 1`, prioritySlug: 'low', dueDate: '2030-03-01' },
    { title: `${prefix} 2`, prioritySlug: 'high' },
    { title: `${prefix} 3`, prioritySlug: 'medium', dueDate: '2030-01-01' },
    { title: `${prefix} 4`, prioritySlug: 'high', dueDate: '2030-02-01' },
  ]);
  await page.reload();
  await search(page, prefix);

  // Newest first is the starting order.
  await expect.poll(() => listed(page, prefix)).toEqual([4, 3, 2, 1].map((n) => `${prefix} ${n}`));

  await page.getByTestId('filter-sort').selectOption('dueDate');
  await expect.poll(() => listed(page, prefix)).toEqual([3, 4, 1, 2].map((n) => `${prefix} ${n}`));

  await page.getByTestId('filter-sort').selectOption('priority');
  await expect.poll(() => listed(page, prefix)).toEqual([4, 2, 3, 1].map((n) => `${prefix} ${n}`));

  await page.getByTestId('filter-sort').selectOption('createdAt');
  await expect.poll(() => listed(page, prefix)).toEqual([4, 3, 2, 1].map((n) => `${prefix} ${n}`));
});

test('the remaining count follows adding, completing and deleting tasks', async ({
  page,
  request,
}, testInfo) => {
  const prefix = uniqueTitle(testInfo, 'Count');
  await seed(request, [{ title: `${prefix} a` }]);
  await page.reload();
  const counter = page.getByTestId('todo-remaining');
  const start = Number((await counter.innerText()).match(/\d+/)?.[0]);
  await expect(counter).toHaveText(remainingText(start, testInfo));

  await page.getByTestId('todo-add-button').click();
  await page.getByTestId('todo-title-input').fill(`${prefix} b`);
  await page.getByTestId('todo-save').click();
  await expect(counter).toHaveText(remainingText(start + 1, testInfo));

  await search(page, `${prefix} b`);
  await page.getByTestId('todo-toggle').first().click();
  await expect(counter).toHaveText(remainingText(start, testInfo));

  await page.getByTestId('todo-delete').first().click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('todo-item')).toHaveCount(0);
  await expect(counter).toHaveText(remainingText(start, testInfo));
});

test('the controls are named in the active language and the category follows a language switch', async ({
  page,
}, testInfo) => {
  const locale = localeOf(testInfo);
  await expect(page.getByTestId('filter-status-label')).toHaveText(
    label('filter.status.label', testInfo),
  );
  await expect(page.getByTestId('filter-sort-label')).toHaveText(label('sort.label', testInfo));
  await expect(page.getByTestId('filter-search-label')).toHaveText(label('search.label', testInfo));
  const options = await page.getByTestId('filter-category').locator('option').allInnerTexts();
  expect(options[0]).toBe(label('filter.category.all', testInfo));
  expect(options).toContain(seedName('categories', 'work', locale));

  await page.locator('[data-testid="language-switcher"]').click();
  const there = locale === 'en-CA' ? 'fr-CA' : 'en-CA';
  await expect(page.getByTestId('filter-category').locator('option[value="work"]')).toHaveText(
    seedName('categories', 'work', there),
  );
});

test('the filters bar has no accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).include('[data-testid="filters-bar"]').analyze();
  expect(results.violations).toEqual([]);
});
