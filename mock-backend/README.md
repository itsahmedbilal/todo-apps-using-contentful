# Mock backend

A json-server stand-in for the todo API. It implements
`specs/001-bilingual-todo-app/contracts/todos-api.openapi.yaml`, so the Angular app can later talk to a real
API by changing only its base URL.

```powershell
cd mock-backend
npm install
npm start          # http://localhost:3000   (set PORT to change it)
npm test           # validation, stamping, mock controls and server tests
npm run reset      # delete the saved data so the next start reseeds
```

## Data is kept across restarts

| File | Role |
|------|------|
| `db.seed.json` | The starting data (6 sample tasks). Never modified by the server. |
| `db.runtime.json` | The live data. Gitignored. Every create, update and delete is saved here. |

- **First start:** `db.runtime.json` does not exist yet, so the server copies `db.seed.json` to it.
- **Every later start:** the server uses `db.runtime.json` exactly as it was. Tasks you added, changed or
  deleted are still that way after a restart. The seed file is not copied over it.
- **To get back to the sample tasks:** run `npm run reset` (or delete `db.runtime.json` yourself), then start
  the server again.
- **If you edit `db.seed.json`:** the change only appears after a reset, because an existing runtime file wins.

## Endpoints

`GET /todos`, `GET /todos/:id`, `POST /todos`, `PUT /todos/:id`, `PATCH /todos/:id`, `DELETE /todos/:id`.
Status codes: 200, 201, 204 (delete), 400 (validation), 404, 500. Errors are machine-readable
(`{ "error": "not_found" }`, `{ "error": "validation_failed", "fields": [{ "field": "title", "code": "required" }] }`);
the app turns the codes into messages from Contentful.

Rules applied by the server: `title` is required, trimmed, 1-120 characters; `description` up to 500;
`prioritySlug` defaults to `medium`; `dueDate` is `YYYY-MM-DD` and may be in the past; `id`, `createdAt` and
`updatedAt` are set by the server and cannot be chosen by the client.

json-server's list parameters also work, for example `GET /todos?completed=false&title_like=milk`.
The app itself requests the full list and filters on the client.

## Testing loading and error states

| Setting | Effect |
|---------|--------|
| `MOCK_DELAY_MS=800` | Adds 800 ms to every response. |
| `MOCK_FAIL_RATE=0.3` | 30% of requests fail with 500. `1` fails every request. |
| `X-Mock-Fail: 500` request header | Fails that one request with the given status (400-599). |

```powershell
$env:MOCK_DELAY_MS = 800
npm start
```

CORS preflight requests are never delayed or failed, so a simulated failure reaches the browser as a real
HTTP status and not as a CORS error. The settings are read on each request.
