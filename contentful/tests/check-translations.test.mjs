import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries } from '../seed/import.mjs';
import {
  findFieldGaps,
  findMissingKeys,
  hasValue,
  loadRequiredKeys,
  main,
  readEnv,
} from '../scripts/check-translations.mjs';

const seedDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'seed');
const seed = buildEntries(
  JSON.parse(readFileSync(join(seedDir, 'ui-labels.json'), 'utf8')),
  JSON.parse(readFileSync(join(seedDir, 'content.json'), 'utf8')),
);

// Entries as the Delivery API returns them with `locale=*`.
const delivered = () =>
  structuredClone(
    seed.map(({ contentType, id, fields }) => ({
      sys: { id, contentType: { sys: { id: contentType } } },
      fields,
    })),
  );
const find = (entries, id) => entries.find((entry) => entry.sys.id === id);
const pairs = (gaps) => gaps.map((gap) => [gap.field, gap.locale]);
const link = (id) => ({ 'en-CA': { sys: { type: 'Link', linkType: 'Asset', id } } });
const env = {
  CONTENTFUL_SPACE_ID: 's',
  CONTENTFUL_ENVIRONMENT_ID: 'master',
  CONTENTFUL_DELIVERY_TOKEN: 'secret-token',
};

function deliver(entries) {
  return async () => ({ ok: true, status: 200, json: async () => ({ items: entries, total: entries.length }) });
}

test('the seed content has no gaps and defines every required key', () => {
  const entries = delivered();
  assert.deepEqual(findFieldGaps(entries), []);
  assert.deepEqual(findMissingKeys(entries, loadRequiredKeys()), []);
});

test('required-keys.json lists every key of the content-model contract', () => {
  assert.equal(loadRequiredKeys().length, 67);
});

test('reports a missing French value that a fallback read would hide', () => {
  const entries = delivered();
  delete find(entries, 'uiLabel-button.save').fields.value['fr-CA'];
  assert.deepEqual(findFieldGaps(entries), [
    { entry: 'uiLabel uiLabel-button.save', field: 'value', locale: 'fr-CA', problem: 'missing' },
  ]);
});

test('reports a missing English value and a blank French value', () => {
  const entries = delivered();
  const category = find(entries, 'category-work');
  delete category.fields.name['en-CA'];
  category.fields.name['fr-CA'] = '   ';
  assert.deepEqual(pairs(findFieldGaps(entries)), [['name', 'en-CA'], ['name', 'fr-CA']]);
});

test('reports empty rich text in one language', () => {
  const entries = delivered();
  const faq = entries.find((entry) => entry.sys.contentType.sys.id === 'faqItem');
  faq.fields.answer['fr-CA'] = { nodeType: 'document', data: {}, content: [] };
  assert.deepEqual(pairs(findFieldGaps(entries)), [['answer', 'fr-CA']]);
});

test('an optional field with one language is a gap, with neither it is not', () => {
  const entries = delivered();
  const settings = find(entries, 'appSettings');
  delete settings.fields.tagline['fr-CA'];
  settings.fields.footerText = {};
  assert.deepEqual(pairs(findFieldGaps(entries)), [['tagline', 'fr-CA']]);
});

test('an image without alt text in both languages is reported', () => {
  const entries = delivered();
  find(entries, 'appSettings').fields.logo = link('logo');
  assert.deepEqual(
    findFieldGaps(entries).map((gap) => [gap.field, gap.locale, gap.problem]),
    [
      ['logoAlt', 'en-CA', 'missing-alt-text'],
      ['logoAlt', 'fr-CA', 'missing-alt-text'],
    ],
  );

  find(entries, 'appSettings').fields.logoAlt = { 'en-CA': 'Logo', 'fr-CA': 'Logo' };
  entries.find((entry) => entry.sys.contentType.sys.id === 'emptyState').fields.illustration = link('pic');
  assert.deepEqual(findFieldGaps(entries).map((gap) => gap.field), ['illustrationAlt', 'illustrationAlt']);
});

test('reports a uiLabel key that is missing entirely', () => {
  const entries = delivered().filter((entry) => entry.sys.id !== 'uiLabel-nav.help');
  assert.deepEqual(findMissingKeys(entries, loadRequiredKeys()), [
    { key: 'nav.help', problem: 'missing-key' },
  ]);
});

test('hasValue treats blank text and empty rich text as missing', () => {
  assert.equal(hasValue(''), false);
  assert.equal(hasValue(undefined), false);
  assert.equal(hasValue('x'), true);
  const blank = {
    nodeType: 'document',
    content: [{ nodeType: 'paragraph', content: [{ nodeType: 'text', value: ' ' }] }],
  };
  assert.equal(hasValue(blank), false);
});

test('main exits 0 for complete content, asking for every locale with the Delivery token', async () => {
  let requested;
  const fetchImpl = async (url, options) => {
    requested = { url, options };
    return deliver(delivered())();
  };
  assert.equal(await main(env, { fetchImpl, log: () => {} }), 0);
  assert.match(requested.url, /locale=\*/);
  assert.equal(requested.options.headers.Authorization, 'Bearer secret-token');
});

test('main exits non-zero and lists each gap without printing the token', async () => {
  const entries = delivered();
  delete find(entries, 'uiLabel-button.save').fields.value['fr-CA'];
  const lines = [];
  const code = await main(env, { fetchImpl: deliver(entries), log: (line) => lines.push(line) });
  assert.equal(code, 1);
  assert.ok(lines.some((line) => line.includes('button.save') && line.includes('fr-CA')));
  assert.ok(lines.every((line) => !line.includes('secret-token')));
});

test('main fails clearly when a variable is missing or Contentful rejects the call', async () => {
  assert.throws(() => readEnv({}), /CONTENTFUL_SPACE_ID.*CONTENTFUL_DELIVERY_TOKEN/);
  await assert.rejects(
    main(env, { fetchImpl: async () => ({ ok: false, status: 401 }), log: () => {} }),
    /status 401/,
  );
});
