// json-server mock backend for the todo app. Implements specs/001-bilingual-todo-app/contracts/todos-api.openapi.yaml.
//
// Tasks are kept across restarts. db.seed.json is copied to db.runtime.json only when the runtime file
// does not exist yet (first start, or after `npm run reset`); every later start reuses the runtime
// file as it was. db.seed.json itself is never modified.
//
//   npm start            -> http://localhost:3000   (PORT overrides the port)
//   npm run reset        -> deletes db.runtime.json, so the next start reseeds
//   MOCK_DELAY_MS, MOCK_FAIL_RATE, X-Mock-Fail: see middleware/mock-controls.js
const fs = require('node:fs');
const path = require('node:path');
const jsonServer = require('json-server');
const { createMockControls } = require('./middleware/mock-controls');
const { validate } = require('./middleware/validate');
const { createStamp } = require('./middleware/stamp');

const DEFAULT_PORT = 3000;

function createServer({
  seedPath = path.join(__dirname, 'db.seed.json'),
  runtimePath = path.join(__dirname, 'db.runtime.json'),
  env = process.env,
  now,
  logger = false,
} = {}) {
  const seeded = !fs.existsSync(runtimePath);
  if (seeded) fs.copyFileSync(seedPath, runtimePath);

  const app = jsonServer.create();
  const router = jsonServer.router(runtimePath);
  const db = { findById: (id) => router.db.get('todos').getById(id).value() };

  // Error bodies and the 204 on delete follow the contract; everything else is json-server's default.
  router.render = (req, res) => {
    if (res.statusCode === 404) return res.json({ error: 'not_found' });
    if (req.method === 'DELETE') return res.status(204).end();
    return res.jsonp(res.locals.data);
  };

  // CORS and (optionally) request logging, then JSON body parsing. The body must be parsed before
  // our middlewares run because they read and change req.body (json-server's router would only
  // parse it later).
  app.use(jsonServer.defaults({ logger }));
  app.use(jsonServer.bodyParser);

  const middlewares = [
    ['mock-controls', createMockControls({ env })],
    ['validate', validate],
    ['stamp', createStamp({ db, now })],
  ];
  for (const [, middleware] of middlewares) app.use(middleware);
  const middlewareNames = middlewares.map(([name]) => name);

  app.use(router);

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => res.status(500).json({ error: 'server_error' }));

  function start(port = Number(env.PORT) || DEFAULT_PORT) {
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => resolve({ server, port: server.address().port }));
      server.on('error', reject);
    });
  }

  return { app, router, middlewareNames, seeded, start };
}

if (require.main === module) {
  createServer({ logger: true })
    .start()
    .then(({ port }) => console.log(`Mock backend listening on http://localhost:${port}`))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = { createServer };
