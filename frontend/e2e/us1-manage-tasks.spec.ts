import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addTask, label, row, uniqueTitle } from './support';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('todo-page-heading')).toBeVisible();
});

test.describe('manage tasks', () => {
  test('AC-03: a valid task is added, announced in the active language and stored', async ({
    page,
  }, testInfo) => {
    const title = uniqueTitle(testInfo, 'Add');
    const description = uniqueTitle(testInfo, 'Details');
    await addTask(page, title, description);

    await expect(row(page, title)).toBeVisible();
    await expect(page.getByTestId('status-message')).toHaveText(
      label('message.itemSaved', testInfo),
    );
    await expect(page.getByTestId('todo-form')).toHaveCount(0);

    // The backend stored it: it is still there after a reload.
    await page.reload();
    await expect(row(page, title)).toBeVisible();
    await expect(row(page, title).getByTestId('todo-description')).toHaveText(description);
  });

  test('AC-04: an empty title cannot be saved and shows the required message from Contentful', async ({
    page,
  }, testInfo) => {
    await page
      .getByTestId('todo-add-button')
      .or(page.getByTestId('todo-empty-action'))
      .first()
      .click();
    await page.getByTestId('todo-save').click();

    await expect(page.getByTestId('todo-title-error')).toHaveText(
      label('validation.title.required', testInfo),
    );
    await expect(page.getByTestId('todo-form')).toBeVisible();
  });

  test('a title that is too long is blocked with the too-long message', async ({
    page,
  }, testInfo) => {
    await page
      .getByTestId('todo-add-button')
      .or(page.getByTestId('todo-empty-action'))
      .first()
      .click();
    await page.getByTestId('todo-title-input').fill('x'.repeat(121));
    await page.getByTestId('todo-save').click();
    await expect(page.getByTestId('todo-title-error')).toHaveText(
      label('validation.title.tooLong', testInfo),
    );
  });

  test('a task can be edited', async ({ page }, testInfo) => {
    const title = uniqueTitle(testInfo, 'Edit');
    const renamed = uniqueTitle(testInfo, 'Renamed');
    await addTask(page, title);
    await expect(row(page, title)).toBeVisible();

    await row(page, title).getByTestId('todo-edit').click();
    await expect(page.getByTestId('todo-title-input')).toHaveValue(title);
    await page.getByTestId('todo-title-input').fill(renamed);
    await page.getByTestId('todo-save').click();

    await expect(row(page, renamed)).toBeVisible();
    await expect(row(page, title)).toHaveCount(0);
    await expect(page.getByTestId('status-message')).toHaveText(
      label('message.itemSaved', testInfo),
    );
  });

  test('a task can be marked complete and active again', async ({ page }, testInfo) => {
    const title = uniqueTitle(testInfo, 'Toggle');
    await addTask(page, title);
    const item = row(page, title);
    await expect(item).toBeVisible();
    await expect(item.getByTestId('todo-completed')).toHaveCount(0);
    await expect(item.getByTestId('todo-toggle')).toHaveText(
      label('button.markComplete', testInfo),
    );

    await item.getByTestId('todo-toggle').click();
    await expect(item.getByTestId('todo-completed')).toHaveText(
      label('status.completed', testInfo),
    );
    await expect(item.getByTestId('todo-toggle')).toHaveText(
      label('button.markIncomplete', testInfo),
    );

    await item.getByTestId('todo-toggle').click();
    await expect(item.getByTestId('todo-completed')).toHaveCount(0);
  });

  test('deleting asks first and only deletes after confirm', async ({ page }, testInfo) => {
    const title = uniqueTitle(testInfo, 'Delete');
    await addTask(page, title);
    const item = row(page, title);
    await expect(item).toBeVisible();

    // Cancel keeps the task.
    await item.getByTestId('todo-delete').click();
    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog.getByRole('heading')).toHaveText(label('dialog.delete.heading', testInfo));
    await page.getByTestId('confirm-cancel').click();
    await expect(dialog).toHaveCount(0);
    await expect(item).toBeVisible();

    // Escape also cancels.
    await item.getByTestId('todo-delete').click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(item).toBeVisible();

    // Confirm deletes it and announces it.
    await item.getByTestId('todo-delete').click();
    await page.getByTestId('confirm-ok').click();
    await expect(row(page, title)).toHaveCount(0);
    await expect(page.getByTestId('status-message')).toHaveText(
      label('message.itemDeleted', testInfo),
    );
  });

  test('AC-06: a backend failure shows a friendly error with a retry that works', async ({
    page,
  }, testInfo) => {
    const failList = (route: import('@playwright/test').Route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 500, json: { error: 'server_error' } })
        : route.continue();
    await page.route('**/todos', failList);
    await page.reload();

    const panel = page.getByTestId('todo-error');
    await expect(panel).toContainText(label('message.error.load', testInfo));
    await expect(panel.getByRole('button')).toHaveText(label('button.retry', testInfo));

    await page.unroute('**/todos', failList);
    await panel.getByRole('button').click();
    await expect(panel).toHaveCount(0);
    await expect(page.getByTestId('todo-list').or(page.getByTestId('todo-empty'))).toBeVisible();
  });
});

test.describe('accessibility', () => {
  // Axe scans every task on the page, and the shared backend grows during a run.
  test.setTimeout(120_000);

  test('the list page has no axe violations', async ({ page }, testInfo) => {
    await addTask(page, uniqueTitle(testInfo, 'Axe'));
    await expect(page.getByTestId('todo-list')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('the add form, with errors showing, has no axe violations', async ({ page }) => {
    await page
      .getByTestId('todo-add-button')
      .or(page.getByTestId('todo-empty-action'))
      .first()
      .click();
    await page.getByTestId('todo-save').click();
    await expect(page.getByTestId('todo-title-error')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('the delete dialog has no axe violations', async ({ page }, testInfo) => {
    const title = uniqueTitle(testInfo, 'AxeDialog');
    await addTask(page, title);
    await row(page, title).getByTestId('todo-delete').click();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
