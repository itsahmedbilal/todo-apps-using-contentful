const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStamp } = require('../middleware/stamp');
const { run } = require('./helpers');

const NOW = new Date('2026-10-12T15:00:00.000Z');
const existing = {
  id: 7,
  title: 'Old',
  completed: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};
const db = { findById: (id) => (String(id) === '7' ? existing : undefined) };
const stamp = createStamp({ db, now: () => NOW });

test('create sets createdAt and updatedAt and defaults completed to false', async () => {
  const { req, nextCalled } = await run(stamp, { method: 'POST', url: '/todos', body: { title: 't' } });
  assert.equal(nextCalled, true);
  assert.equal(req.body.createdAt, NOW.toISOString());
  assert.equal(req.body.updatedAt, NOW.toISOString());
  assert.equal(req.body.completed, false);
});

test('create keeps an explicit completed value', async () => {
  const { req } = await run(stamp, { method: 'POST', url: '/todos', body: { title: 't', completed: true } });
  assert.equal(req.body.completed, true);
});

test('create ignores client-supplied id and timestamps', async () => {
  const { req } = await run(stamp, {
    method: 'POST',
    url: '/todos',
    body: { id: 999, title: 't', createdAt: '2000-01-01T00:00:00.000Z', updatedAt: '2000-01-01T00:00:00.000Z' },
  });
  assert.equal(req.body.id, undefined);
  assert.equal(req.body.createdAt, NOW.toISOString());
  assert.equal(req.body.updatedAt, NOW.toISOString());
});

test('replace keeps id and createdAt, refreshes updatedAt, defaults completed to false', async () => {
  const { req } = await run(stamp, {
    method: 'PUT',
    url: '/todos/7',
    body: { title: 'New', createdAt: '1999-01-01T00:00:00.000Z' },
  });
  assert.equal(req.body.id, 7);
  assert.equal(req.body.createdAt, existing.createdAt);
  assert.equal(req.body.updatedAt, NOW.toISOString());
  assert.equal(req.body.completed, false);
});

test('patch refreshes updatedAt and never changes id or createdAt', async () => {
  const { req } = await run(stamp, {
    method: 'PATCH',
    url: '/todos/7',
    body: { completed: false, id: 1, createdAt: '1999-01-01T00:00:00.000Z' },
  });
  assert.equal(req.body.updatedAt, NOW.toISOString());
  assert.equal(req.body.id, undefined);
  assert.equal(req.body.createdAt, undefined);
  assert.equal(req.body.completed, false);
});

test('updating an unknown id still passes through so the router can answer 404', async () => {
  const { nextCalled } = await run(stamp, { method: 'PUT', url: '/todos/404', body: { title: 't' } });
  assert.equal(nextCalled, true);
});

test('GET and DELETE are untouched', async () => {
  const get = await run(stamp, { method: 'GET', url: '/todos' });
  assert.equal(get.nextCalled, true);
  const del = await run(stamp, { method: 'DELETE', url: '/todos/7' });
  assert.equal(del.nextCalled, true);
  assert.equal(del.req.body, undefined);
});
