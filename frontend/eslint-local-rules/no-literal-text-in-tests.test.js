const { describe, it } = require('node:test');
const { RuleTester } = require('eslint');
const tsParser = require('typescript-eslint').parser;
const rule = require('./no-literal-text-in-tests');

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });
const filename = 'example.spec.ts';
const bad = { messageId: 'literalText' };

tester.run('no-literal-text-in-tests', rule, {
  valid: [
    // Locators that do not use wording
    { filename, code: `page.getByTestId('save-button');` },
    { filename, code: `page.getByRole('button');` },
    { filename, code: `page.getByRole('button', { name: labels.save });` },
    { filename, code: `page.getByRole('heading', { level: 1 });` },
    { filename, code: `page.locator('li.todo');` },
    // Text taken from fixtures or variables
    { filename, code: `page.getByText(content.label('button.save'));` },
    { filename, code: `expect(button).toHaveText(sentinel('button.save', 'en-CA'));` },
    { filename, code: `expect(row).toContainText(fixture.title);` },
    { filename, code: `page.locator('li', { hasText: fixture.title });` },
    { filename, code: `expect(el).toHaveAttribute('aria-label', labels.nav);` },
    // Assertions about things that are not UI wording
    { filename, code: `expect(el).toHaveAttribute('href', '/en');` },
    { filename, code: `expect(el).toHaveAttribute('lang', 'en-CA');` },
    { filename, code: `expect(link.getAttribute('href')).toBe('/fr');` },
    { filename, code: `page.locator('li', { has: other });` },
    // Strings with no wording
    { filename, code: `page.getByText('/');` },
  ],

  invalid: [
    { filename, code: `page.getByText('Save');`, errors: [bad] },
    { filename, code: `page.getByText(/save/i);`, errors: [bad] },
    { filename, code: 'page.getByText(`Save`);', errors: [bad] },
    { filename, code: 'page.getByText(`${count} items`);', errors: [bad] },
    { filename, code: `page.getByLabel('Title');`, errors: [bad] },
    { filename, code: `page.getByPlaceholder('Search');`, errors: [bad] },
    { filename, code: `page.getByAltText('Logo');`, errors: [bad] },
    { filename, code: `page.getByTitle('Help');`, errors: [bad] },
    { filename, code: `page.getByRole('button', { name: 'Save' });`, errors: [bad] },
    { filename, code: `page.getByRole('button', { name: /save/i });`, errors: [bad] },
    { filename, code: `expect(heading).toHaveText('My tasks');`, errors: [bad] },
    { filename, code: `expect(row).toContainText('Buy milk');`, errors: [bad] },
    { filename, code: `expect(el).toHaveTextContent('Done');`, errors: [bad] },
    { filename, code: `expect(el).toHaveAccessibleName('Close');`, errors: [bad] },
    { filename, code: `expect(el).toHaveAttribute('aria-label', 'Close');`, errors: [bad] },
    { filename, code: `expect(img).toHaveAttribute('alt', 'Logo');`, errors: [bad] },
    { filename, code: `page.locator('li', { hasText: 'Buy milk' });`, errors: [bad] },
    { filename, code: `page.locator('li').filter({ hasNotText: 'Done' });`, errors: [bad] },
    { filename, code: `page.getByText('One'); page.getByText('Two');`, errors: [bad, bad] },
  ],
});
