const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../middleware/validate');
const { run } = require('./helpers');

const post = (body) => run(validate, { method: 'POST', url: '/todos', body });
const patch = (body) => run(validate, { method: 'PATCH', url: '/todos/1', body });

function codesFor(result, field) {
  return (result.res.body?.fields ?? []).filter((f) => f.field === field).map((f) => f.code);
}

test('a valid todo passes through', async () => {
  const result = await post({ title: 'Buy milk' });
  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test('title: missing, empty and whitespace-only are rejected as required', async () => {
  for (const body of [{}, { title: '' }, { title: '   ' }, { title: null }]) {
    const result = await post(body);
    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 400);
    assert.equal(result.res.body.error, 'validation_failed');
    assert.deepEqual(codesFor(result, 'title'), ['required']);
  }
});

test('title: 1 and 120 characters are accepted, 121 is too long', async () => {
  assert.equal((await post({ title: 'a' })).nextCalled, true);
  assert.equal((await post({ title: 'a'.repeat(120) })).nextCalled, true);
  const tooLong = await post({ title: 'a'.repeat(121) });
  assert.equal(tooLong.res.statusCode, 400);
  assert.deepEqual(codesFor(tooLong, 'title'), ['tooLong']);
});

test('title is trimmed before it is measured and stored', async () => {
  const result = await post({ title: `  ${'a'.repeat(120)}  ` });
  assert.equal(result.nextCalled, true);
  assert.equal(result.req.body.title, 'a'.repeat(120));
});

test('description: 500 characters are accepted, 501 is too long', async () => {
  assert.equal((await post({ title: 't', description: 'd'.repeat(500) })).nextCalled, true);
  const tooLong = await post({ title: 't', description: 'd'.repeat(501) });
  assert.equal(tooLong.res.statusCode, 400);
  assert.deepEqual(codesFor(tooLong, 'description'), ['tooLong']);
});

test('dueDate: a valid ISO date and null are accepted, bad dates are invalid', async () => {
  assert.equal((await post({ title: 't', dueDate: '2026-10-12' })).nextCalled, true);
  assert.equal((await post({ title: 't', dueDate: '2020-01-01' })).nextCalled, true, 'past dates are allowed');
  assert.equal((await post({ title: 't', dueDate: null })).nextCalled, true);
  for (const dueDate of ['12/10/2026', '2026-13-01', '2026-02-30', 'tomorrow', 20261012]) {
    const result = await post({ title: 't', dueDate });
    assert.equal(result.res.statusCode, 400, String(dueDate));
    assert.deepEqual(codesFor(result, 'dueDate'), ['invalid']);
  }
});

test('prioritySlug defaults to medium on create when missing or empty', async () => {
  const missing = await post({ title: 't' });
  assert.equal(missing.req.body.prioritySlug, 'medium');
  const empty = await post({ title: 't', prioritySlug: '' });
  assert.equal(empty.req.body.prioritySlug, 'medium');
  const given = await post({ title: 't', prioritySlug: 'high' });
  assert.equal(given.req.body.prioritySlug, 'high');
});

test('completed and categorySlug must have the right type', async () => {
  const badCompleted = await post({ title: 't', completed: 'yes' });
  assert.deepEqual(codesFor(badCompleted, 'completed'), ['invalid']);
  const badCategory = await post({ title: 't', categorySlug: 5 });
  assert.deepEqual(codesFor(badCategory, 'categorySlug'), ['invalid']);
  assert.equal((await post({ title: 't', categorySlug: null })).nextCalled, true);
});

test('all problems are reported together', async () => {
  const result = await post({ title: '', description: 'd'.repeat(501), dueDate: 'nope' });
  assert.equal(result.res.statusCode, 400);
  assert.deepEqual(
    result.res.body.fields.map((f) => `${f.field}:${f.code}`).sort(),
    ['description:tooLong', 'dueDate:invalid', 'title:required'],
  );
});

test('PATCH only validates the fields that are present', async () => {
  assert.equal((await patch({ completed: true })).nextCalled, true);
  assert.equal((await patch({ completed: true })).req.body.prioritySlug, undefined, 'no defaults on PATCH');
  const emptyTitle = await patch({ title: '' });
  assert.deepEqual(codesFor(emptyTitle, 'title'), ['required']);
  const emptyPriority = await patch({ prioritySlug: '' });
  assert.deepEqual(codesFor(emptyPriority, 'prioritySlug'), ['required']);
});

test('GET and DELETE are not validated', async () => {
  assert.equal((await run(validate, { method: 'GET', url: '/todos' })).nextCalled, true);
  assert.equal((await run(validate, { method: 'DELETE', url: '/todos/1' })).nextCalled, true);
});
