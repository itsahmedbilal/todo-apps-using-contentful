import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, importAll, main, readEnv } from '../seed/import.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const seedDir = join(here, '..', 'seed');
const uiLabels = JSON.parse(readFileSync(join(seedDir, 'ui-labels.json'), 'utf8'));
const content = JSON.parse(readFileSync(join(seedDir, 'content.json'), 'utf8'));
const entries = buildEntries(uiLabels, content);

// Minimal stand-in for a contentful-management environment.
function fakeEnvironment(store = new Map()) {
  const calls = [];
  const wrap = (entry) => ({
    sys: entry.sys,
    fields: entry.fields,
    async update() {
      calls.push(['update', entry.sys.id]);
      store.set(entry.sys.id, { sys: entry.sys, fields: this.fields });
      return this;
    },
    async publish() {
      calls.push(['publish', entry.sys.id]);
      return this;
    },
  });
  return {
    store,
    calls,
    async getEntry(id) {
      const found = store.get(id);
      if (!found) {
        const error = new Error('not found');
        error.name = 'NotFound';
        throw error;
      }
      return wrap(found);
    },
    async createEntryWithId(contentType, id, data) {
      calls.push(['create', id]);
      const entry = { sys: { id, contentType }, fields: data.fields };
      store.set(id, entry);
      return wrap(entry);
    },
  };
}

test('creates then publishes every seeded entry', async () => {
  const environment = fakeEnvironment();
  const result = await importAll(environment, entries, () => {});

  assert.equal(result.created, entries.length);
  assert.equal(result.updated, 0);
  assert.equal(environment.store.size, entries.length);
  for (const { id } of entries) {
    const createdAt = environment.calls.findIndex(([action, target]) => action === 'create' && target === id);
    const publishedAt = environment.calls.findIndex(([action, target]) => action === 'publish' && target === id);
    assert.ok(createdAt >= 0, `${id} was created`);
    assert.ok(publishedAt > createdAt, `${id} was published after it was created`);
  }
});

test('a second run upserts by key and slug without duplicates', async () => {
  const environment = fakeEnvironment();
  await importAll(environment, entries, () => {});
  const sizeAfterFirstRun = environment.store.size;
  environment.calls.length = 0;

  const result = await importAll(environment, entries, () => {});

  assert.equal(result.created, 0);
  assert.equal(result.updated, entries.length);
  assert.equal(environment.store.size, sizeAfterFirstRun);
  assert.equal(environment.calls.filter(([action]) => action === 'create').length, 0);
});

test('entry ids are derived from key and slug, so reruns map to the same entries', () => {
  const ids = entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('uiLabel-button.addTodo'));
  assert.ok(ids.includes('category-personal'));
  assert.ok(ids.includes('page-home'));
});

test('referenced entries are published before the entries that link to them', async () => {
  const environment = fakeEnvironment();
  await importAll(environment, entries, () => {});
  const order = environment.calls.filter(([action]) => action === 'publish').map(([, id]) => id);
  assert.ok(order.indexOf('emptyState-home') < order.indexOf('page-home'));
});

test('localized fields keep both locales and shared fields use the default locale only', () => {
  const home = entries.find((entry) => entry.id === 'page-home');
  assert.deepEqual(Object.keys(home.fields.title).sort(), ['en-CA', 'fr-CA']);
  assert.deepEqual(home.fields.slug, { 'en-CA': 'home' });
  assert.deepEqual(home.fields.emptyState, {
    'en-CA': { sys: { type: 'Link', linkType: 'Entry', id: 'emptyState-home' } },
  });
});

test('rich text fields become rich text documents in both locales', () => {
  const faq = entries.find((entry) => entry.id === 'faqItem-1');
  for (const locale of ['en-CA', 'fr-CA']) {
    const document = faq.fields.answer[locale];
    assert.equal(document.nodeType, 'document');
    assert.equal(document.content[0].nodeType, 'paragraph');
    assert.equal(document.content[0].content[0].nodeType, 'text');
    assert.ok(document.content[0].content[0].value.length > 0);
  }
});

test('fails clearly when an environment variable is missing, naming it without leaking values', () => {
  const env = { CONTENTFUL_SPACE_ID: 'space123', CONTENTFUL_MANAGEMENT_TOKEN: 'secret-token-value' };
  assert.throws(
    () => readEnv(env),
    (error) => {
      assert.match(error.message, /CONTENTFUL_ENVIRONMENT_ID/);
      assert.doesNotMatch(error.message, /secret-token-value/);
      assert.doesNotMatch(error.message, /space123/);
      return true;
    },
  );
  assert.throws(() => readEnv({}), /CONTENTFUL_SPACE_ID.*CONTENTFUL_ENVIRONMENT_ID.*CONTENTFUL_MANAGEMENT_TOKEN/);
});

test('never logs the token', async () => {
  const token = 'secret-token-value-123';
  const environment = fakeEnvironment();
  const logged = [];
  const createClient = ({ accessToken }) => {
    assert.equal(accessToken, token);
    return { getSpace: async () => ({ getEnvironment: async () => environment }) };
  };

  await main(
    { CONTENTFUL_SPACE_ID: 's', CONTENTFUL_ENVIRONMENT_ID: 'master', CONTENTFUL_MANAGEMENT_TOKEN: token },
    { createClient, log: (line) => logged.push(String(line)) },
  );

  assert.ok(logged.length > 0);
  assert.ok(logged.every((line) => !line.includes(token)));
});

test('the script never writes files, so a token cannot reach disk', () => {
  const source = readFileSync(join(seedDir, 'import.mjs'), 'utf8');
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream|writeSync/);
});
