// Tiny stand-ins for Express request and response objects, enough to drive a middleware directly.
function makeReq({ method = 'GET', url = '/todos', body, headers = {} } = {}) {
  const lower = {};
  for (const [name, value] of Object.entries(headers)) lower[name.toLowerCase()] = value;
  return {
    method,
    url,
    path: url.split('?')[0],
    body,
    headers: lower,
    get: (name) => lower[name.toLowerCase()],
  };
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

// Runs a middleware and reports whether it called next() or answered the request itself.
async function run(middleware, reqOptions) {
  const req = makeReq(reqOptions);
  const res = makeRes();
  let nextCalled = false;
  await middleware(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
}

module.exports = { makeReq, makeRes, run };
