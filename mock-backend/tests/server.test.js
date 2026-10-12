const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

const seedPath = path.join(__dirname, '..', 'db.seed.json');
const seedCount = JSON.parse(fs.readFileSync(seedPath, 'utf8')).todos.length;

const running = [];
const tempDirs = [];

async function start(env = {}, runtimePath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-mock-'));
  tempDirs.push(dir);
  const instance = createServer({ seedPath, runtimePath: runtimePath ?? path.join(dir, 'db.runtime.json'), env });
  const { server, port } = await instance.start(0);
  running.push(server);
  return { ...instance, server, base: `http://127.0.0.1:${port}` };
}

afterEach(async () => {
  for (const server of running.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const json = (method, body, headers = {}) => ({
  method,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

test('GET /todos serves at least 5 seed tasks', async () => {
  const { base } = await start();
  const response = await fetch(`${base}/todos`);
  assert.equal(response.status, 200);
  const todos = await response.json();
  assert.ok(todos.length >= 5);
  assert.equal(todos.length, seedCount);
});

function newRuntimePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-mock-'));
  tempDirs.push(dir);
  return path.join(dir, 'db.runtime.json');
}

async function stop(instance) {
  instance.server.closeAllConnections();
  await new Promise((resolve) => instance.server.close(resolve));
  running.splice(running.indexOf(instance.server), 1);
}

const listTodos = async (base) => (await fetch(`${base}/todos`)).json();

test('the first start copies the seed to the runtime file', async () => {
  const runtimePath = newRuntimePath();
  assert.equal(fs.existsSync(runtimePath), false);

  const instance = await start({}, runtimePath);

  assert.equal(instance.seeded, true);
  assert.equal(fs.existsSync(runtimePath), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(runtimePath, 'utf8')), JSON.parse(fs.readFileSync(seedPath, 'utf8')));
});

test('tasks added, changed and deleted before a restart are still that way after it', async () => {
  const runtimePath = newRuntimePath();

  const first = await start({}, runtimePath);
  const created = await (await fetch(`${first.base}/todos`, json('POST', { title: 'Keep me' }))).json();
  await fetch(`${first.base}/todos/1`, json('PATCH', { completed: true }));
  await fetch(`${first.base}/todos/2`, { method: 'DELETE' });
  await stop(first);

  const second = await start({}, runtimePath);
  assert.equal(second.seeded, false);
  const todos = await listTodos(second.base);
  assert.equal(todos.length, seedCount, 'one added and one deleted');
  assert.ok(todos.some((todo) => todo.id === created.id && todo.title === 'Keep me'));
  assert.equal(todos.find((todo) => todo.id === 1).completed, true);
  assert.equal(todos.some((todo) => todo.id === 2), false);
});

test('an existing runtime file is used as it is and the seed is not copied over it', async () => {
  const runtimePath = newRuntimePath();
  const custom = { todos: [{ id: 42, title: 'Only task', completed: false, prioritySlug: 'low', createdAt: 'a', updatedAt: 'a' }] };
  fs.writeFileSync(runtimePath, JSON.stringify(custom));

  const instance = await start({}, runtimePath);

  assert.equal(instance.seeded, false);
  const todos = await listTodos(instance.base);
  assert.deepEqual(todos.map((todo) => todo.id), [42]);
  assert.deepEqual(JSON.parse(fs.readFileSync(runtimePath, 'utf8')).todos.map((todo) => todo.id), [42]);
});

test('deleting the runtime file resets the data to the seed on the next start', async () => {
  const runtimePath = newRuntimePath();

  const first = await start({}, runtimePath);
  await fetch(`${first.base}/todos`, json('POST', { title: 'Temporary task' }));
  assert.equal((await listTodos(first.base)).length, seedCount + 1);
  await stop(first);

  fs.rmSync(runtimePath);

  const second = await start({}, runtimePath);
  assert.equal(second.seeded, true);
  assert.equal((await listTodos(second.base)).length, seedCount);
});

test('the seed file itself is never modified', async () => {
  const before = fs.readFileSync(seedPath, 'utf8');
  const { base } = await start();
  await fetch(`${base}/todos`, json('POST', { title: 'Another task' }));
  assert.equal(fs.readFileSync(seedPath, 'utf8'), before);
});

test('status codes: 201 on create, 200 on read and update, 204 on delete, 404 afterwards', async () => {
  const { base } = await start();

  const created = await fetch(`${base}/todos`, json('POST', { title: 'Write tests' }));
  assert.equal(created.status, 201);
  const todo = await created.json();
  assert.ok(todo.id !== undefined);
  assert.equal(todo.completed, false);
  assert.equal(todo.prioritySlug, 'medium');
  assert.ok(todo.createdAt && todo.updatedAt);

  assert.equal((await fetch(`${base}/todos/${todo.id}`)).status, 200);

  const patched = await fetch(`${base}/todos/${todo.id}`, json('PATCH', { completed: true }));
  assert.equal(patched.status, 200);
  const patchedTodo = await patched.json();
  assert.equal(patchedTodo.completed, true);
  assert.equal(patchedTodo.createdAt, todo.createdAt);
  assert.ok(patchedTodo.updatedAt >= todo.updatedAt);

  const replaced = await fetch(`${base}/todos/${todo.id}`, json('PUT', { title: 'Write more tests', prioritySlug: 'high' }));
  assert.equal(replaced.status, 200);
  const replacedTodo = await replaced.json();
  assert.equal(replacedTodo.title, 'Write more tests');
  assert.equal(replacedTodo.createdAt, todo.createdAt);
  assert.equal(replacedTodo.completed, false);

  const deleted = await fetch(`${base}/todos/${todo.id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');
  assert.equal((await fetch(`${base}/todos/${todo.id}`)).status, 404);
});

test('an unknown id returns 404 with a machine-readable error', async () => {
  const { base } = await start();
  for (const request of [
    fetch(`${base}/todos/9999`),
    fetch(`${base}/todos/9999`, json('PATCH', { completed: true })),
    fetch(`${base}/todos/9999`, { method: 'DELETE' }),
  ]) {
    const response = await request;
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'not_found' });
  }
});

test('invalid input returns 400 with field codes and creates nothing', async () => {
  const { base } = await start();
  const response = await fetch(`${base}/todos`, json('POST', { title: '', dueDate: 'nope' }));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, 'validation_failed');
  assert.deepEqual(
    body.fields.map((f) => `${f.field}:${f.code}`).sort(),
    ['dueDate:invalid', 'title:required'],
  );
  assert.equal((await (await fetch(`${base}/todos`)).json()).length, seedCount);
});

test('a forced failure returns 500 with a machine-readable error', async () => {
  const { base } = await start();
  const response = await fetch(`${base}/todos`, { headers: { 'X-Mock-Fail': '500' } });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'server_error' });
});

test('middlewares run in the order mock-controls, validate, stamp', async () => {
  const instance = await start();
  assert.deepEqual(instance.middlewareNames, ['mock-controls', 'validate', 'stamp']);

  // mock-controls runs before validate: a forced failure wins over a validation error.
  const forced = await fetch(`${instance.base}/todos`, json('POST', { title: '' }, { 'X-Mock-Fail': '500' }));
  assert.equal(forced.status, 500);

  // validate runs before stamp: an invalid request is rejected before anything is stamped or stored.
  const invalid = await fetch(`${instance.base}/todos`, json('POST', { title: '' }));
  assert.equal(invalid.status, 400);
  assert.equal((await (await fetch(`${instance.base}/todos`)).json()).length, seedCount);
});

test('MOCK_FAIL_RATE=1 fails every request, and the delay setting delays responses', async () => {
  const failing = await start({ MOCK_FAIL_RATE: '1' });
  assert.equal((await fetch(`${failing.base}/todos`)).status, 500);

  const slow = await start({ MOCK_DELAY_MS: '150' });
  const startedAt = Date.now();
  await fetch(`${slow.base}/todos`);
  assert.ok(Date.now() - startedAt >= 140);
});

test('CORS: preflight for the mock header succeeds and failures still carry CORS headers', async () => {
  const { base } = await start();
  const preflight = await fetch(`${base}/todos`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:4200',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'x-mock-fail',
    },
  });
  assert.ok(preflight.status === 204 || preflight.status === 200);
  assert.match(preflight.headers.get('access-control-allow-headers') ?? '', /x-mock-fail/i);

  const failed = await fetch(`${base}/todos`, {
    headers: { origin: 'http://localhost:4200', 'X-Mock-Fail': '500' },
  });
  assert.equal(failed.status, 500);
  assert.ok(failed.headers.get('access-control-allow-origin'));
});

test('json-server list parameters still work for convenience', async () => {
  const { base } = await start();
  const active = await (await fetch(`${base}/todos?completed=false`)).json();
  assert.ok(active.length > 0 && active.every((t) => t.completed === false));
  const found = await (await fetch(`${base}/todos?title_like=groceries`)).json();
  assert.equal(found.length, 1);
});
