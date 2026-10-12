// Imports the seed content (ui-labels.json and content.json) into a Contentful space and publishes it.
//
// Reads CONTENTFUL_SPACE_ID, CONTENTFUL_ENVIRONMENT_ID and CONTENTFUL_MANAGEMENT_TOKEN from the
// environment. The token is passed straight to the client; it is never logged and this file never
// writes to disk. Safe to re-run: every entry has a deterministic id, so a second run updates
// the same entries instead of creating duplicates.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_LOCALE = 'en-CA';
const LOCALES = ['en-CA', 'fr-CA'];
const RICH_TEXT_FIELDS = new Set(['intro', 'answer']);
const LINK_FIELDS = new Set(['emptyState']);
const ENV_NAMES = ['CONTENTFUL_SPACE_ID', 'CONTENTFUL_ENVIRONMENT_ID', 'CONTENTFUL_MANAGEMENT_TOKEN'];

export function readEnv(env) {
  const missing = ENV_NAMES.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  return {
    spaceId: env.CONTENTFUL_SPACE_ID,
    environmentId: env.CONTENTFUL_ENVIRONMENT_ID,
    accessToken: env.CONTENTFUL_MANAGEMENT_TOKEN,
  };
}

function toRichText(paragraphs) {
  return {
    nodeType: 'document',
    data: {},
    content: paragraphs.map((text) => ({
      nodeType: 'paragraph',
      data: {},
      content: [{ nodeType: 'text', value: text, marks: [], data: {} }],
    })),
  };
}

function entryLink(id) {
  return { sys: { type: 'Link', linkType: 'Entry', id } };
}

function buildFields({ localized = {}, shared = {} }) {
  const fields = {};
  for (const [name, byLocale] of Object.entries(localized)) {
    fields[name] = {};
    for (const locale of LOCALES) {
      const value = byLocale[locale];
      if (value === undefined) continue;
      fields[name][locale] = RICH_TEXT_FIELDS.has(name) ? toRichText(value) : value;
    }
  }
  for (const [name, value] of Object.entries(shared)) {
    fields[name] = { [DEFAULT_LOCALE]: LINK_FIELDS.has(name) ? entryLink(value) : value };
  }
  return fields;
}

// Returns entries in publish order: anything that is linked to comes before the entry that links to it.
export function buildEntries(uiLabels, content) {
  const entries = [];
  const add = (contentType, items) => {
    for (const item of items) {
      entries.push({ contentType, id: item.id, fields: buildFields(item) });
    }
  };

  add('appSettings', content.appSettings);
  add('category', content.categories);
  add('priority', content.priorities);
  add('emptyState', content.emptyStates);
  add('page', content.pages);
  add('faqItem', content.faqItems);
  add(
    'uiLabel',
    uiLabels.map((label) => ({
      id: `uiLabel-${label.key}`,
      localized: { value: label.value },
      shared: { key: label.key, group: label.group },
    })),
  );
  return entries;
}

function isNotFound(error) {
  return error?.name === 'NotFound' || error?.sys?.id === 'NotFound' || error?.status === 404;
}

export async function importAll(environment, entries, log = console.log) {
  let created = 0;
  let updated = 0;

  for (const { contentType, id, fields } of entries) {
    let entry;
    try {
      entry = await environment.getEntry(id);
      entry.fields = fields;
      entry = await entry.update();
      updated += 1;
    } catch (error) {
      if (!isNotFound(error)) throw error;
      entry = await environment.createEntryWithId(contentType, id, { fields });
      created += 1;
    }
    await entry.publish();
    log(`Published ${contentType} ${id}`);
  }

  return { created, updated };
}

export async function main(env, { createClient, log = console.log } = {}) {
  const { spaceId, environmentId, accessToken } = readEnv(env);
  // contentful-management v12 defaults to the plain client; this script uses the nested (legacy) one.
  const client = createClient({ accessToken }, { type: 'legacy' });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  const dir = dirname(fileURLToPath(import.meta.url));
  const uiLabels = JSON.parse(readFileSync(join(dir, 'ui-labels.json'), 'utf8'));
  const content = JSON.parse(readFileSync(join(dir, 'content.json'), 'utf8'));

  const result = await importAll(environment, buildEntries(uiLabels, content), log);
  log(`Done: ${result.created} created, ${result.updated} updated.`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createClient } = await import('contentful-management');
  main(process.env, { createClient }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
