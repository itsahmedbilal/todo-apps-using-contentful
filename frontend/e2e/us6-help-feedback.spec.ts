import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { label, localeOf, row, seedFaqQuestions, seedPageText, uniqueTitle } from './support';

const api = 'http://localhost:3000/todos';

test.describe('help page', () => {
  test('opens from the navigation and shows the title, intro and FAQ in the active language', async ({
    page,
  }, testInfo) => {
    const locale = localeOf(testInfo);
    await page.goto('./');
    await page.getByTestId('nav-help').click();
    await expect(page).toHaveURL(/\/help$/);
    await expect(page.getByTestId('help-heading')).toHaveText(
      seedPageText('help', 'title', locale),
    );
    await expect(page.getByTestId('help-intro')).toContainText(
      seedPageText('help', 'intro', locale),
    );
    await expect(page.getByTestId('help-question')).toHaveText(seedFaqQuestions(locale));
    await expect(page).toHaveTitle(seedPageText('help', 'seoTitle', locale));
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  });

  test('switches language in place', async ({ page }, testInfo) => {
    const here = localeOf(testInfo);
    const there = here === 'en-CA' ? 'fr-CA' : 'en-CA';
    await page.goto('./help');
    await expect(page.getByTestId('help-question')).toHaveText(seedFaqQuestions(here));
    await page.locator('[data-testid="language-switcher"]').click();
    await expect(page.getByTestId('help-question')).toHaveText(seedFaqQuestions(there));
    await expect(page.getByTestId('help-heading')).toHaveText(seedPageText('help', 'title', there));
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('./help');
    await expect(page.getByTestId('help-heading')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});

test.describe('home page title', () => {
  test('the tab title follows the home page entry', async ({ page }, testInfo) => {
    await page.goto('./');
    await expect(page).toHaveTitle(seedPageText('home', 'seoTitle', localeOf(testInfo)));
  });
});

test.describe('overdue tasks', () => {
  test('a past-due active task is marked with text and an icon, a completed one is not', async ({
    page,
    request,
  }, testInfo) => {
    const late = uniqueTitle(testInfo, 'Late');
    const done = uniqueTitle(testInfo, 'Done');
    await request.post(api, { data: { title: late, dueDate: '2000-01-01' } });
    await request.post(api, { data: { title: done, dueDate: '2000-01-01', completed: true } });
    await page.goto('./');
    const overdue = row(page, late).getByTestId('todo-overdue');
    await expect(overdue).toContainText(label('status.overdue', testInfo));
    await expect(overdue.locator('[aria-hidden="true"]')).toBeVisible();
    await expect(row(page, done).getByTestId('todo-overdue')).toHaveCount(0);
  });
});

test.describe('clear completed', () => {
  test('asks first with the count, then removes only completed tasks', async ({
    page,
    request,
  }, testInfo) => {
    const keep = uniqueTitle(testInfo, 'Keep');
    const gone = uniqueTitle(testInfo, 'Gone');
    await request.post(api, { data: { title: keep } });
    await request.post(api, { data: { title: gone, completed: true } });
    await page.goto('./');
    await page.getByTestId('todo-clear-completed').click();
    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog.locator('h2')).toHaveText(label('dialog.clearCompleted.heading', testInfo));
    expect(await dialog.locator('p').innerText()).toMatch(/\d+/);

    await page.getByTestId('confirm-cancel').click();
    await expect(row(page, gone)).toBeVisible();

    await page.getByTestId('todo-clear-completed').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('status-message')).toHaveText(
      label('message.completedCleared', testInfo),
    );
    await expect(row(page, gone)).toHaveCount(0);
    await expect(row(page, keep)).toBeVisible();
    await expect(page.getByTestId('todo-clear-completed')).toHaveCount(0);
  });
});

test.describe('loading indicators', () => {
  test('shows a loader while tasks are slow to arrive, then the list', async ({ page }) => {
    await page.route(`${api}*`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto('./');
    await expect(page.getByTestId('todo-loader')).toBeVisible();
    await expect(page.getByTestId('todo-loader').locator('[aria-busy="true"]')).toBeVisible();
    await expect(page.getByTestId('todo-item').first()).toBeVisible();
    await expect(page.getByTestId('todo-loader')).toHaveCount(0);
  });

  test('shows a loader while the content is slow to arrive', async ({ page }) => {
    await page.route('**/cdn.contentful.com/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto('./');
    await expect(page.locator('app-loader [aria-busy="true"]')).toBeVisible();
    await expect(page.getByTestId('todo-page-heading')).toBeVisible();
  });
});
