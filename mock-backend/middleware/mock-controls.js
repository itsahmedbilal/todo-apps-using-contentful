// Mock-only controls for testing loading and error states. A real API does not need these.
//
//   MOCK_DELAY_MS   adds this many milliseconds to every response
//   MOCK_FAIL_RATE  fraction between 0 and 1 of requests that fail with 500
//   X-Mock-Fail     request header: fails that single request with the given status (400-599)
//
// Settings are read when each request arrives, so they can change while the server runs.
// CORS preflight (OPTIONS) requests are never delayed or failed, otherwise the browser would report
// a network error instead of the status we want to simulate.

const ERROR_CODES = { 404: 'not_found' };

function parseForcedStatus(value) {
  if (typeof value !== 'string' || !/^\d{3}$/.test(value.trim())) return null;
  const status = Number(value);
  return status >= 400 && status <= 599 ? status : null;
}

function fail(res, status) {
  if (status === 400) return res.status(400).json({ error: 'validation_failed', fields: [] });
  return res.status(status).json({ error: ERROR_CODES[status] ?? 'server_error' });
}

function createMockControls({
  env = process.env,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
} = {}) {
  return async function mockControls(req, res, next) {
    if (req.method === 'OPTIONS') return next();

    const delay = Number(env.MOCK_DELAY_MS);
    if (Number.isFinite(delay) && delay > 0) await wait(delay);

    const forced = parseForcedStatus(req.headers['x-mock-fail']);
    if (forced) return fail(res, forced);

    const rate = Number(env.MOCK_FAIL_RATE);
    if (Number.isFinite(rate) && rate > 0 && random() < rate) return fail(res, 500);

    return next();
  };
}

module.exports = { createMockControls };
