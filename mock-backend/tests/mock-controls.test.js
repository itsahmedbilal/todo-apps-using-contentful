const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMockControls } = require('../middleware/mock-controls');
const { run } = require('./helpers');

function controls(env = {}, extra = {}) {
  const waited = [];
  const middleware = createMockControls({
    env,
    wait: async (ms) => {
      waited.push(ms);
    },
    random: () => 0.5,
    ...extra,
  });
  return { middleware, waited };
}

test('with no settings every request passes straight through', async () => {
  const { middleware, waited } = controls();
  const result = await run(middleware, { method: 'GET', url: '/todos' });
  assert.equal(result.nextCalled, true);
  assert.deepEqual(waited, []);
});

test('MOCK_DELAY_MS delays every request by that long', async () => {
  const { middleware, waited } = controls({ MOCK_DELAY_MS: '800' });
  const result = await run(middleware, { method: 'GET', url: '/todos' });
  assert.equal(result.nextCalled, true);
  assert.deepEqual(waited, [800]);
});

test('an invalid MOCK_DELAY_MS is ignored', async () => {
  const { middleware, waited } = controls({ MOCK_DELAY_MS: 'soon' });
  await run(middleware, { method: 'GET', url: '/todos' });
  assert.deepEqual(waited, []);
});

test('X-Mock-Fail forces that status with a machine-readable error', async () => {
  const { middleware } = controls();
  const serverError = await run(middleware, { method: 'GET', url: '/todos', headers: { 'X-Mock-Fail': '500' } });
  assert.equal(serverError.nextCalled, false);
  assert.equal(serverError.res.statusCode, 500);
  assert.deepEqual(serverError.res.body, { error: 'server_error' });

  const notFound = await run(middleware, { method: 'GET', url: '/todos/1', headers: { 'X-Mock-Fail': '404' } });
  assert.equal(notFound.res.statusCode, 404);
  assert.deepEqual(notFound.res.body, { error: 'not_found' });
});

test('an unusable X-Mock-Fail value is ignored', async () => {
  const { middleware } = controls();
  const result = await run(middleware, { method: 'GET', url: '/todos', headers: { 'X-Mock-Fail': 'banana' } });
  assert.equal(result.nextCalled, true);
});

test('MOCK_FAIL_RATE fails requests whose random draw falls under the rate', async () => {
  const failing = controls({ MOCK_FAIL_RATE: '0.3' }, { random: () => 0.1 });
  const failed = await run(failing.middleware, { method: 'GET', url: '/todos' });
  assert.equal(failed.nextCalled, false);
  assert.equal(failed.res.statusCode, 500);
  assert.deepEqual(failed.res.body, { error: 'server_error' });

  const passing = controls({ MOCK_FAIL_RATE: '0.3' }, { random: () => 0.9 });
  const passed = await run(passing.middleware, { method: 'GET', url: '/todos' });
  assert.equal(passed.nextCalled, true);
});

test('MOCK_FAIL_RATE=1 fails every request', async () => {
  const { middleware } = controls({ MOCK_FAIL_RATE: '1' }, { random: () => 0.999 });
  const result = await run(middleware, { method: 'GET', url: '/todos' });
  assert.equal(result.res.statusCode, 500);
});

test('CORS preflight requests are never delayed or failed', async () => {
  const { middleware, waited } = controls({ MOCK_DELAY_MS: '800', MOCK_FAIL_RATE: '1' });
  const result = await run(middleware, { method: 'OPTIONS', url: '/todos', headers: { 'X-Mock-Fail': '500' } });
  assert.equal(result.nextCalled, true);
  assert.deepEqual(waited, []);
});

test('settings are read when each request arrives, so they can change while running', async () => {
  const env = {};
  const { middleware } = controls(env);
  assert.equal((await run(middleware, { method: 'GET', url: '/todos' })).nextCalled, true);
  env.MOCK_FAIL_RATE = '1';
  assert.equal((await run(middleware, { method: 'GET', url: '/todos' })).res.statusCode, 500);
});
