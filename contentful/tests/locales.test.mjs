import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureLocales, readEnv } from '../scripts/locales.mjs';

const ids = { spaceId: 's', environmentId: 'master' };

function fakeClient({ locales, total = 0 }) {
  const calls = { update: [], create: [] };
  return {
    calls,
    locale: {
      getMany: async () => ({ items: locales }),
      update: async (params, body) => (calls.update.push({ params, body }), body),
      create: async (params, body) => (calls.create.push(body), body),
    },
    entry: { getMany: async () => ({ total }) },
  };
}

test('renames an en-US default and creates fr-CA', async () => {
  const client = fakeClient({ locales: [{ code: 'en-US', default: true, sys: { id: 'abc' } }] });
  await ensureLocales(client, ids, () => {});
  assert.equal(client.calls.update[0].params.localeId, 'abc');
  assert.equal(client.calls.update[0].body.code, 'en-CA');
  assert.equal(client.calls.create[0].code, 'fr-CA');
  assert.equal(client.calls.create[0].fallbackCode, 'en-CA');
  assert.equal(client.calls.create[0].optional, true);
});

test('does nothing when both locales exist', async () => {
  const client = fakeClient({
    locales: [
      { code: 'en-CA', default: true, sys: { id: 'a' } },
      { code: 'fr-CA', sys: { id: 'b' } },
    ],
  });
  await ensureLocales(client, ids, () => {});
  assert.equal(client.calls.update.length, 0);
  assert.equal(client.calls.create.length, 0);
});

test('refuses to rename the default locale when entries exist', async () => {
  const client = fakeClient({ locales: [{ code: 'en-US', default: true, sys: { id: 'abc' } }], total: 3 });
  await assert.rejects(ensureLocales(client, ids, () => {}), /already has entries/);
  assert.equal(client.calls.update.length, 0);
});

test('names missing environment variables', () => {
  assert.throws(() => readEnv({}), /CONTENTFUL_SPACE_ID.*CONTENTFUL_MANAGEMENT_TOKEN/);
});
