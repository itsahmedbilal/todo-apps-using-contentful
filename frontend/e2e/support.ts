import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Locator, Page, TestInfo } from '@playwright/test';

type ContentLocale = 'en-CA' | 'fr-CA';

interface SeedLabel {
  key: string;
  value: Record<ContentLocale, string>;
}

const seedLabels: SeedLabel[] = JSON.parse(
  readFileSync(join(__dirname, '../../contentful/seed/ui-labels.json'), 'utf8'),
);

/** The locale of the Playwright project running this test (`en` or `fr`). */
export function localeOf(testInfo: TestInfo): ContentLocale {
  return testInfo.project.name.startsWith('fr') ? 'fr-CA' : 'en-CA';
}

/**
 * The published wording for a label key, read from the Contentful seed files. Tests compare against this
 * instead of typing the wording themselves (constitution, Principle II).
 */
export function label(
  key: string,
  testInfo: TestInfo,
  locale: ContentLocale = localeOf(testInfo),
): string {
  const found = seedLabels.find((entry) => entry.key === key);
  if (!found) throw new Error(`Label "${key}" is not in the seed data.`);
  return found.value[locale];
}

/** A task title that no other test (or other language project) uses, because the backend is shared. */
export function uniqueTitle(testInfo: TestInfo, name: string): string {
  return `${name} ${testInfo.project.name} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** The list row for a task, found by its title. */
export function row(page: Page, title: string): Locator {
  return page.getByTestId('todo-item').filter({
    has: page.getByTestId('todo-title').filter({ hasText: title }),
  });
}

/** Opens the add form, fills the title (and optional description) and saves. */
export async function addTask(page: Page, title: string, description?: string): Promise<void> {
  await page
    .getByTestId('todo-add-button')
    .or(page.getByTestId('todo-empty-action'))
    .first()
    .click();
  await page.getByTestId('todo-title-input').fill(title);
  if (description) await page.getByTestId('todo-description-input').fill(description);
  await page.getByTestId('todo-save').click();
}

/** Every piece of published wording for a locale in the seed files (labels, categories, pages, FAQ...). */
export function seedTexts(locale: ContentLocale): Set<string> {
  const texts = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === 'string') texts.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
  };
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === locale) collect(value);
        else walk(value);
      }
    }
  };
  walk(seedLabels);
  walk(JSON.parse(readFileSync(join(__dirname, '../../contentful/seed/content.json'), 'utf8')));
  return texts;
}

interface SeedNamed {
  localized: Record<string, Record<ContentLocale, string>>;
  shared: { slug?: string };
}

function seedEntries(group: 'categories' | 'priorities'): SeedNamed[] {
  return JSON.parse(readFileSync(join(__dirname, '../../contentful/seed/content.json'), 'utf8'))[
    group
  ];
}

/** The seeded wording for a category (`name`) or priority (`label`) in one locale. */
export function seedName(
  group: 'categories' | 'priorities',
  slug: string,
  locale: ContentLocale,
): string {
  const field = group === 'categories' ? 'name' : 'label';
  const entry = seedEntries(group).find((item) => item.shared.slug === slug);
  if (!entry) throw new Error(`No seeded ${group} entry with slug "${slug}".`);
  return entry.localized[field][locale];
}

interface SeedLocalized {
  id: string;
  localized: Record<string, Record<ContentLocale, string | string[]>>;
}

function seedLocalized(group: 'pages' | 'faqItems', id: string): SeedLocalized {
  const items: SeedLocalized[] = JSON.parse(
    readFileSync(join(__dirname, '../../contentful/seed/content.json'), 'utf8'),
  )[group];
  const item = items.find((entry) => entry.id === id);
  if (!item) throw new Error(`No seeded ${group} entry "${id}".`);
  return item;
}

/** The seeded text of a page field (for example `title`) in one locale. */
export function seedPageText(slug: string, field: string, locale: ContentLocale): string {
  return String(seedLocalized('pages', `page-${slug}`).localized[field][locale]);
}

/** The seeded FAQ questions in `sortOrder` (the seed lists them in that order), for one locale. */
export function seedFaqQuestions(locale: ContentLocale): string[] {
  const items: SeedLocalized[] = JSON.parse(
    readFileSync(join(__dirname, '../../contentful/seed/content.json'), 'utf8'),
  ).faqItems;
  return items.map((item) => String(item.localized['question'][locale]));
}
