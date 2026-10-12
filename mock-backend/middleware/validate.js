// Validates todo input for POST, PUT and PATCH. Mirrors the rules in
// specs/001-bilingual-todo-app/data-model.md and contracts/todos-api.openapi.yaml.
// Failures return 400 { error: "validation_failed", fields: [{ field, code }] } using the codes
// required | tooLong | invalid. The backend never returns user-facing text; the app maps the codes
// to messages from Contentful.

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 500;
const DEFAULT_PRIORITY = 'medium';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validate(req, res, next) {
  const isCreateOrReplace = req.method === 'POST' || req.method === 'PUT';
  if (!isCreateOrReplace && req.method !== 'PATCH') return next();

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const has = (name) => Object.prototype.hasOwnProperty.call(body, name);
  const fields = [];
  const problem = (field, code) => fields.push({ field, code });

  // title: required on create/replace, trimmed length 1-120
  if (isCreateOrReplace || has('title')) {
    if (body.title === undefined || body.title === null) {
      problem('title', 'required');
    } else if (typeof body.title !== 'string') {
      problem('title', 'invalid');
    } else {
      const title = body.title.trim();
      if (title.length === 0) problem('title', 'required');
      else if (title.length > TITLE_MAX) problem('title', 'tooLong');
      else body.title = title;
    }
  }

  // description: optional, up to 500 characters
  if (has('description') && body.description !== null) {
    if (typeof body.description !== 'string') problem('description', 'invalid');
    else if (body.description.length > DESCRIPTION_MAX) problem('description', 'tooLong');
  }

  // completed: boolean
  if (has('completed') && typeof body.completed !== 'boolean') problem('completed', 'invalid');

  // categorySlug: optional string or null
  if (has('categorySlug') && body.categorySlug !== null && typeof body.categorySlug !== 'string') {
    problem('categorySlug', 'invalid');
  }

  // prioritySlug: required, defaults to medium on create/replace
  if (isCreateOrReplace) {
    if (body.prioritySlug === undefined || body.prioritySlug === null || body.prioritySlug === '') {
      body.prioritySlug = DEFAULT_PRIORITY;
    } else if (typeof body.prioritySlug !== 'string') {
      problem('prioritySlug', 'invalid');
    }
  } else if (has('prioritySlug')) {
    if (body.prioritySlug === null || body.prioritySlug === '') problem('prioritySlug', 'required');
    else if (typeof body.prioritySlug !== 'string') problem('prioritySlug', 'invalid');
  }

  // dueDate: optional ISO date (YYYY-MM-DD) or null; past dates are allowed
  if (has('dueDate') && body.dueDate !== null && !isRealIsoDate(body.dueDate)) {
    problem('dueDate', 'invalid');
  }

  if (fields.length > 0) {
    return res.status(400).json({ error: 'validation_failed', fields });
  }

  req.body = body;
  return next();
}

module.exports = { validate };
