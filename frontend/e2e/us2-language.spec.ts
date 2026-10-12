import { expect, test } from '@playwright/test';
import { addTask, label, localeOf, row, seedTexts, uniqueTitle } from './support';

const switcher = '[data-testid="language-switcher"]';
const homeLink = 'app-header nav li:first-child a';

test.describe('switching language', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('todo-page-heading')).toBeVisible();
  });

  test('AC-01: all wording and the address change, task text does not, and nothing reloads', async ({
    page,
  }, testInfo) => {
    const title = uniqueTitle(testInfo, 'Stays');
    await addTask(page, title);
    await expect(row(page, title)).toBeVisible();

    const here = testInfo.project.name.startsWith('fr') ? 'fr' : 'en';
    const there = here === 'fr' ? 'en' : 'fr';
    const thereLocale = there === 'fr' ? 'fr-CA' : 'en-CA';
    await expect(page.locator(homeLink)).toHaveText(label('nav.home', testInfo));

    // Mark the page so a full reload would be noticed.
    await page.evaluate(() => ((window as unknown as { __keep: boolean }).__keep = true));
    await page.locator(switcher).click();

    await expect(page).toHaveURL(new RegExp(`/${there}/?$`));
    await expect(page.locator(homeLink)).toHaveText(label('nav.home', testInfo, thereLocale));
    await expect(page.locator('html')).toHaveAttribute('lang', thereLocale);
    await expect(row(page, title)).toBeVisible();
    await expect(row(page, title).getByTestId('todo-title')).toHaveText(title);
    expect(await page.evaluate(() => (window as unknown as { __keep?: boolean }).__keep)).toBe(
      true,
    );
  });

  test('an open form keeps what was typed when the language changes', async ({ page }) => {
    await page
      .getByTestId('todo-add-button')
      .or(page.getByTestId('todo-empty-action'))
      .first()
      .click();
    await page.getByTestId('todo-title-input').fill('half typed');
    await page.locator(switcher).click();
    await expect(page.getByTestId('todo-title-input')).toHaveValue('half typed');
  });

  test('every language shows only published wording, with no raw keys', async ({
    page,
  }, testInfo) => {
    await page.locator(switcher).click();
    await expect(page).toHaveURL(/\/fr\/?$|\/en\/?$/);
    const locale =
      (await page.locator('html').getAttribute('lang')) === 'fr-CA' ? 'fr-CA' : 'en-CA';
    const allowed = seedTexts(locale);
    await expect(page.getByTestId('todo-page-heading')).toBeVisible();

    const buttons = await page.locator('app-todo-list-page button').allInnerTexts();
    const shown = [
      ...buttons,
      ...(await page.locator('app-header a, app-footer p').allInnerTexts()),
    ].map((text) => text.trim());
    const unexpected = shown.filter((text) => text !== '' && !allowed.has(text));
    expect(unexpected).toEqual([]);
    expect(shown.some((text) => /^[a-z]+\.[A-Za-z.]+$/.test(text))).toBe(false);
    expect(localeOf(testInfo)).toBeDefined();
  });
});

test.describe('AC-02: a missing French translation', () => {
  test('shows the English text, marked as English, instead of a blank', async ({
    page,
    request,
  }, testInfo) => {
    // Make sure the add button (not the empty state) is on screen.
    await request.post('http://localhost:3000/todos', {
      data: { title: uniqueTitle(testInfo, 'Fallback') },
    });

    // Remove the French value of one label from the Contentful response.
    await page.route('**/cdn.contentful.com/**/entries*', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      for (const item of body.items ?? []) {
        if (item.fields?.key?.['en-CA'] === 'button.addTodo') delete item.fields.value['fr-CA'];
      }
      await route.fulfill({ response, json: body });
    });

    await page.goto('/fr/');
    const add = page.getByTestId('todo-add-button');
    await expect(add).toHaveText(label('button.addTodo', testInfo, 'en-CA'));
    await expect(add).toHaveAttribute('lang', 'en-CA');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});

test.describe('which language opens first', () => {
  test('AC-07: the language the person chose is used the next time they open the app', async ({
    page,
  }) => {
    await page.goto('/en/');
    await expect(page.getByTestId('todo-page-heading')).toBeVisible();
    await page.locator(switcher).click();
    await expect(page).toHaveURL(/\/fr\/?$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/fr\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-CA');
  });

  test('the address wins over the saved choice', async ({ page }) => {
    await page.goto('/en/');
    await page.locator(switcher).click();
    await expect(page).toHaveURL(/\/fr\/?$/);

    await page.goto('/en/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-CA');
  });

  test.describe('with no address and no saved choice', () => {
    test.describe('French browser', () => {
      test.use({ locale: 'fr-CA' });
      test('opens in French', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/fr\/?$/);
      });
    });

    test.describe('English browser', () => {
      test.use({ locale: 'en-US' });
      test('opens in English', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/en\/?$/);
      });
    });

    test.describe('another language', () => {
      test.use({ locale: 'de-DE' });
      test('opens in English', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/en\/?$/);
      });
    });
  });

  test.describe('a saved choice beats the browser language', () => {
    test.use({ locale: 'en-US' });
    test('opens in the saved language', async ({ page }) => {
      await page.goto('/en/');
      await page.locator(switcher).click();
      await expect(page).toHaveURL(/\/fr\/?$/);
      await page.goto('/');
      await expect(page).toHaveURL(/\/fr\/?$/);
    });
  });
});
