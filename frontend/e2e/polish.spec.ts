import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';
import { label, localeOf, seedTexts, uniqueTitle } from './support';

const api = 'http://localhost:3000/todos';

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function openAddForm(page: Page): Promise<void> {
  await page
    .getByTestId('todo-add-button')
    .or(page.getByTestId('todo-empty-action'))
    .first()
    .click();
}

test.describe('T100 accessibility on every screen and state', () => {
  // Axe scans are slow, especially with several browsers running at once.
  test.setTimeout(120_000);

  test('list', async ({ page, request }, testInfo) => {
    await request.post(api, { data: { title: uniqueTitle(testInfo, 'List') } });
    await page.goto('./');
    await expect(page.getByTestId('todo-list')).toBeVisible();
    await expectNoViolations(page);
  });

  test('add form with validation errors', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('todo-page-heading')).toBeVisible();
    await openAddForm(page);
    await page.getByTestId('todo-save').click();
    await expect(page.getByTestId('todo-title-error')).toBeVisible();
    await expectNoViolations(page);
  });

  test('delete and clear-completed dialogs', async ({ page, request }, testInfo) => {
    await request.post(api, { data: { title: uniqueTitle(testInfo, 'Dlg'), completed: true } });
    await page.goto('./');
    await page.getByTestId('todo-delete').first().click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await expectNoViolations(page);
    await page.getByTestId('confirm-cancel').click();

    await page.getByTestId('todo-clear-completed').click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await expectNoViolations(page);
  });

  test('help', async ({ page }) => {
    await page.goto('./help');
    await expect(page.getByTestId('help-heading')).toBeVisible();
    await expectNoViolations(page);
  });

  test('not found', async ({ page }) => {
    await page.goto('./no-such-page');
    await expect(page.locator('main h1')).toBeVisible();
    await expectNoViolations(page);
  });

  test('empty state', async ({ page }) => {
    await page.route(`${api}*`, (route) => route.fulfill({ json: [] }));
    await page.goto('./');
    await expect(page.getByTestId('todo-empty')).toBeVisible();
    await expectNoViolations(page);
  });

  test('error state', async ({ page }) => {
    await page.route(`${api}*`, (route) => route.fulfill({ status: 500, json: {} }));
    await page.goto('./');
    await expect(page.getByTestId('todo-error')).toBeVisible();
    await expectNoViolations(page);
  });

  test('content unavailable', async ({ page }) => {
    await page.route('**/cdn.contentful.com/**', (route) =>
      route.fulfill({ status: 401, json: {} }),
    );
    await page.goto('./');
    await expect(page.locator('app-content-unavailable')).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('T101 keyboard only', () => {
  test('adds a task with the keyboard and returns focus after a dialog closes', async ({
    page,
  }, testInfo) => {
    const title = uniqueTitle(testInfo, 'Keys');
    await page.goto('./');
    await expect(page.getByTestId('todo-list')).toBeVisible();

    await page.getByTestId('todo-add-button').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('todo-title-input')).toBeFocused();
    await page.keyboard.type(title);
    await page.getByTestId('todo-save').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('todo-title').filter({ hasText: title })).toBeVisible();

    const deleteButton = page
      .getByTestId('todo-item')
      .filter({ hasText: title })
      .getByTestId('todo-delete');
    await deleteButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
    await expect(deleteButton).toBeFocused();
  });

  test('every interactive control shows a visible focus ring', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('todo-list')).toBeVisible();
    for (let step = 0; step < 6; step++) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement as Element);
        return { width: style.outlineWidth, style: style.outlineStyle };
      });
      expect(outline.style).not.toBe('none');
      expect(parseFloat(outline.width)).toBeGreaterThan(0);
    }
  });
});

test.describe('T102 layouts', () => {
  for (const [name, width, height] of [
    ['phone 360', 360, 740],
    ['tablet 768', 768, 1024],
    ['desktop 1280', 1280, 800],
  ] as const) {
    test(`no horizontal scroll or overlap at ${name}`, async ({ page, request }, testInfo) => {
      await request.post(api, {
        data: {
          title: uniqueTitle(testInfo, 'Layout'),
          description: 'a long description '.repeat(10),
          categorySlug: 'shopping',
          prioritySlug: 'high',
          dueDate: '2000-01-01',
        },
      });
      await page.setViewportSize({ width, height });
      for (const path of ['./', './help']) {
        await page.goto(path);
        await expect(
          page.getByTestId('todo-page-heading').or(page.getByTestId('help-heading')),
        ).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
      await page.goto('./');
      await openAddForm(page);
      const clipped = await page.evaluate(
        () =>
          Array.from(document.querySelectorAll('button, label, h1, h2')).filter(
            (el) =>
              el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible',
          ).length,
      );
      expect(clipped).toBe(0);
    });
  }
});

test.describe('T103 no literal or raw text', () => {
  test('every visible piece of text is published wording, a task, or a user value', async ({
    page,
  }, testInfo) => {
    const locale = localeOf(testInfo);
    const allowed = seedTexts(locale);
    for (const path of ['./', './help', './no-such-page']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('app-loader')).toHaveCount(0);
      const texts = await page
        .locator(
          'app-header a, app-header p, app-footer p, main h1, main h2:not([data-testid="todo-title"]), main label',
        )
        .allInnerTexts();
      const unexpected = texts
        .map((text) => text.trim())
        .filter((text) => text !== '' && !allowed.has(text))
        // Task titles typed by users (the seeded and test tasks) are not translated content.
        .filter((text) => !/^task|^\w+ (en|fr) \d+/i.test(text));
      expect(unexpected, `unexpected text on ${path}`).toEqual([]);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(
        /\b(?:button|form|validation|message|filter|nav|status)\.[A-Za-z.]+\b/,
      );
    }
  });
});

test.describe('T104 speed', () => {
  test('the language switches in under one second', async ({ page, request }, testInfo) => {
    await request.post(api, { data: { title: uniqueTitle(testInfo, 'Speed') } });
    await page.goto('./');
    await expect(page.getByTestId('todo-list')).toBeVisible();
    const there = localeOf(testInfo) === 'en-CA' ? 'fr-CA' : 'en-CA';
    const started = Date.now();
    await page.locator('[data-testid="language-switcher"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', there);
    await expect(page.getByTestId('filter-status-label')).toHaveText(
      label('filter.status.label', testInfo, there),
    );
    expect(Date.now() - started).toBeLessThan(1000);
  });

  // Needs a production build served at PERF_ORIGIN (the dev server is not representative):
  //   ng build; node <static-server> dist/frontend/browser 4300; PERF_ORIGIN=http://localhost:4300
  test('the task screen is usable within 3 seconds on a throttled connection', async ({
    page,
    context,
  }, testInfo) => {
    const origin = process.env['PERF_ORIGIN'];
    test.skip(!origin, 'Set PERF_ORIGIN to a production build to measure first render.');
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    // Roughly "Fast 4G": 9 Mbit/s down, 170 ms round trip.
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 170,
      downloadThroughput: (9 * 1024 * 1024) / 8,
      uploadThroughput: (1.5 * 1024 * 1024) / 8,
    });
    const started = Date.now();
    await page.goto(`${origin}/${testInfo.project.name.slice(0, 2)}/`, { waitUntil: 'commit' });
    await expect(page.getByTestId('todo-item').first()).toBeVisible({ timeout: 10_000 });
    const elapsed = Date.now() - started;
    test
      .info()
      .annotations.push({ type: 'first usable render (ms)', description: String(elapsed) });
    expect(elapsed).toBeLessThan(3000);
  });
});
