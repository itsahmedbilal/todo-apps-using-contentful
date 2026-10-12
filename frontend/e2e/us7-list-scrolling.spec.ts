import AxeBuilder from '@axe-core/playwright';
import { APIRequestContext, Locator, Page, expect, test } from '@playwright/test';
import { addTask, label, uniqueTitle } from './support';

const api = 'http://localhost:3000/todos';
const THRESHOLD = 10;

// Ten rows only fit when the screen is tall enough (the list is also capped by the viewport, FR-004),
// so these tests use a tall one. Tests about short screens set their own size.
test.use({ viewport: { width: 1280, height: 2400 } });

/** Creates `count` tasks that share a prefix, so a search shows only this test's tasks. */
async function seed(
  request: APIRequestContext,
  prefix: string,
  count: number,
  description?: string,
): Promise<void> {
  for (let index = 1; index <= count; index++) {
    const title = `${prefix} ${String(index).padStart(2, '0')}`;
    const response = await request.post(api, { data: { title, description } });
    expect(response.ok()).toBe(true);
  }
}

async function open(page: Page, prefix: string): Promise<void> {
  await page.goto('./');
  await expect(page.getByTestId('filters-bar')).toBeVisible();
  await page.getByTestId('filter-search').fill(prefix);
}

const region = (page: Page) => page.getByTestId('todo-scroll');

async function isScrollable(area: Locator): Promise<boolean> {
  return area.evaluate((element) => element.scrollHeight > element.clientHeight + 1);
}

/** True when the whole of `inner` lies inside the visible part of `outer`. */
async function fullyVisibleIn(inner: Locator, outer: Locator): Promise<boolean> {
  const [a, b] = await Promise.all([inner.boundingBox(), outer.boundingBox()]);
  if (!a || !b) return false;
  return a.y >= b.y - 1 && a.y + a.height <= b.y + b.height + 1;
}

async function inViewport(page: Page, target: Locator): Promise<boolean> {
  const box = await target.boundingBox();
  const size = page.viewportSize();
  return !!box && !!size && box.y >= 0 && box.y + box.height <= size.height;
}

test.describe('task list scrolling', () => {
  test('shows no scrolling with 10 tasks', async ({ page, request }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'ten');
    await seed(request, prefix, THRESHOLD);
    await open(page, prefix);
    await expect(page.getByTestId('todo-item')).toHaveCount(THRESHOLD);

    expect(await isScrollable(region(page))).toBe(false);
    await expect(region(page)).not.toHaveAttribute('role', /.*/);
    await expect(region(page)).not.toHaveAttribute('tabindex', /.*/);
  });

  test('limits the list to 10 rows and scrolls the rest with 11 tasks', async ({
    page,
    request,
  }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'eleven');
    await seed(request, prefix, THRESHOLD + 1);
    await open(page, prefix);
    const items = page.getByTestId('todo-item');
    await expect(items).toHaveCount(THRESHOLD + 1);

    expect(await isScrollable(region(page))).toBe(true);
    expect(await fullyVisibleIn(items.nth(THRESHOLD - 1), region(page))).toBe(true);
    expect(await fullyVisibleIn(items.nth(THRESHOLD), region(page))).toBe(false);

    await region(page).evaluate((element) => element.scrollTo(0, element.scrollHeight));
    expect(await fullyVisibleIn(items.nth(THRESHOLD), region(page))).toBe(true);
    // The controls above the list are still on screen after scrolling the list to the end.
    await expect(page.getByTestId('todo-page-heading')).toBeInViewport();
    await expect(page.getByTestId('filters-bar')).toBeInViewport();
  });

  test('scrolls with the mouse wheel', async ({ page, request }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'wheel');
    await seed(request, prefix, THRESHOLD + 3);
    await open(page, prefix);
    await expect(page.getByTestId('todo-item')).toHaveCount(THRESHOLD + 3);

    await region(page).hover();
    await page.mouse.wheel(0, 200);
    await expect
      .poll(() => region(page).evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test('loses the scrolling once a filter leaves 10 or fewer tasks', async ({
    page,
    request,
  }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'narrow');
    await seed(request, prefix, THRESHOLD + 2);
    await open(page, prefix);
    await expect(region(page)).toHaveAttribute('role', 'region');

    // Tasks are titled "<prefix> 01" and so on; this matches the nine whose number starts with 0.
    await page.getByTestId('filter-search').fill(`${prefix} 0`);
    await expect(page.getByTestId('todo-item')).toHaveCount(9);
    await expect(region(page)).not.toHaveAttribute('role', /.*/);
    expect(await isScrollable(region(page))).toBe(false);

    await page.getByTestId('filter-search').fill(prefix);
    await expect(region(page)).toHaveAttribute('role', 'region');
  });

  test('keeps the form and the list reachable on a short screen with the form open', async ({
    page,
    request,
  }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'short');
    await seed(request, prefix, THRESHOLD + 2);
    await page.setViewportSize({ width: 360, height: 480 });
    await open(page, prefix);
    await expect(page.getByTestId('todo-item')).toHaveCount(THRESHOLD + 2);

    await page.getByTestId('todo-add-button').click();
    await expect(page.getByTestId('todo-save')).toBeVisible();
    // Every task stays reachable by scrolling the page and the list.
    const last = page.getByTestId('todo-item').last();
    await region(page).evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    expect(await isScrollable(region(page))).toBe(true);
  });
});

test.describe('keyboard and assistive technology', () => {
  test('names the region and lets the keyboard scroll to every task', async ({
    page,
    request,
  }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'keys');
    await seed(request, prefix, 50);
    await open(page, prefix);
    await expect(page.getByTestId('todo-item')).toHaveCount(50);

    const named = page.getByRole('region', { name: label('list.region.label', testInfo) });
    await expect(named).toBeVisible();

    await named.focus();
    await expect(named).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => named.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('End');
    await expect
      .poll(() =>
        named.evaluate(
          (element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1,
        ),
      )
      .toBe(true);
    await page.keyboard.press('Home');
    await expect.poll(() => named.evaluate((element) => element.scrollTop)).toBe(0);
    await page.keyboard.press('PageDown');
    await expect.poll(() => named.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  });

  test('scrolls a focused task into view', async ({ page, request }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'focus');
    await seed(request, prefix, 50);
    await open(page, prefix);
    await expect(page.getByTestId('todo-item')).toHaveCount(50);

    await region(page).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('todo-item').first().locator('button').first()).toBeFocused();

    // Moving focus deep into the list brings that task into the visible area.
    const deep = page.getByTestId('todo-item').nth(30).locator('button').first();
    await deep.focus();
    expect(await fullyVisibleIn(page.getByTestId('todo-item').nth(30), region(page))).toBe(true);
  });

  test('is not a region or a tab stop with 10 or fewer tasks', async ({
    page,
    request,
  }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'plain');
    await seed(request, prefix, 3);
    await open(page, prefix);
    await expect(page.getByTestId('todo-item')).toHaveCount(3);
    await expect(
      page.getByRole('region', { name: label('list.region.label', testInfo) }),
    ).toHaveCount(0);
  });

  for (const [name, size] of [
    ['360px', { width: 360, height: 700 }],
    ['desktop', { width: 1280, height: 800 }],
  ] as const) {
    test(`has no accessibility violations with a scrolling list at ${name}`, async ({
      page,
      request,
    }, testInfo) => {
      const prefix = uniqueTitle(testInfo, 'axe');
      await seed(request, prefix, THRESHOLD + 2);
      await page.setViewportSize(size);
      await open(page, prefix);
      await expect(region(page)).toHaveAttribute('role', 'region');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('staying in place', () => {
  test('keeps the scroll position after completing a task, editing one and switching language', async ({
    page,
    request,
  }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'place');
    await seed(request, prefix, 15);
    await open(page, prefix);
    await expect(page.getByTestId('todo-item')).toHaveCount(15);

    const scrollTop = () => region(page).evaluate((element) => element.scrollTop);
    const rowHeight = await page
      .getByTestId('todo-item')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);

    await region(page).evaluate((element) => element.scrollTo(0, element.scrollHeight));
    const before = await scrollTop();
    expect(before).toBeGreaterThan(0);

    await page.getByTestId('todo-item').nth(12).getByTestId('todo-toggle').click();
    expect(Math.abs((await scrollTop()) - before)).toBeLessThanOrEqual(rowHeight);

    await page.getByTestId('todo-item').nth(13).getByTestId('todo-edit').click();
    await page.getByTestId('todo-title-input').fill(`${prefix} edited`);
    await page.getByTestId('todo-save').click();
    await expect(page.getByTestId('todo-save')).toHaveCount(0);
    await expect(region(page)).toHaveAttribute('role', 'region');
    const afterEdit = await scrollTop();
    expect(Math.abs(afterEdit - before)).toBeLessThanOrEqual(rowHeight * 2);

    await page.getByTestId('language-switcher').click();
    await expect(region(page)).toHaveAttribute('role', 'region');
    expect(Math.abs((await scrollTop()) - afterEdit)).toBeLessThanOrEqual(rowHeight);
  });

  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`shows a task added while the list is scrolled (${reducedMotion} motion)`, async ({
      page,
      request,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion });
      const prefix = uniqueTitle(testInfo, 'added');
      await seed(request, prefix, 15);
      await open(page, prefix);
      await expect(page.getByTestId('todo-item')).toHaveCount(15);
      await region(page).evaluate((element) => element.scrollTo(0, element.scrollHeight));

      const title = `${prefix} brand new`;
      await addTask(page, title);
      const added = page.getByTestId('todo-item').filter({ hasText: title });
      await expect(added).toBeVisible();
      await expect.poll(() => fullyVisibleIn(added, region(page))).toBe(true);
    });
  }
});

test.describe('edge cases', () => {
  test('still fits exactly 10 rows when rows are tall', async ({ page, request }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'tall');
    const long = 'A long description that wraps onto several lines in both languages. '.repeat(4);
    await seed(request, prefix, THRESHOLD + 2, long);
    await page.setViewportSize({ width: 360, height: 2000 });
    await open(page, prefix);
    const items = page.getByTestId('todo-item');
    await expect(items).toHaveCount(THRESHOLD + 2);

    expect(await fullyVisibleIn(items.nth(THRESHOLD - 1), region(page))).toBe(true);
    expect(await fullyVisibleIn(items.nth(THRESHOLD), region(page))).toBe(false);
  });

  test('reaches every task on a short screen', async ({ page, request }, testInfo) => {
    const prefix = uniqueTitle(testInfo, 'zoom');
    await seed(request, prefix, THRESHOLD + 5);
    await page.setViewportSize({ width: 360, height: 480 });
    await open(page, prefix);
    const last = page.getByTestId('todo-item').last();
    await region(page).evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await last.scrollIntoViewIfNeeded();
    expect(await inViewport(page, last)).toBe(true);
  });
});
