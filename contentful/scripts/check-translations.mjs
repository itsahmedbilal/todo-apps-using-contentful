// Reports every missing English or French value in the published Contentful content and exits non-zero
// if there is any. It reads each entry with `locale=*`, so the raw value of every locale is returned and
// the English fallback can never hide a missing French value.
//
// Reads CONTENTFUL_SPACE_ID, CONTENTFUL_ENVIRONMENT_ID and CONTENTFUL_DELIVERY_TOKEN (read-only) from the
// environment. Nothing is written to disk and the token is never printed.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LOCALES = ['en-CA', 'fr-CA'];
const ENV_NAMES = ['CONTENTFUL_SPACE_ID', 'CONTENTFUL_ENVIRONMENT_ID', 'CONTENTFUL_DELIVERY_TOKEN'];

/**
 * Localized fields per content type, from contracts/content-model.md.
 * `required` fields need both languages. Optional fields need both or neither.
 * `altFor` makes a field required whenever the named image field is set.
 */
export const LOCALIZED_FIELDS = {
  appSettings: [
    { name: 'appTitle', required: true },
    { name: 'tagline' },
    { name: 'logoAlt', altFor: 'logo' },
    { name: 'footerText' },
    { name: 'languageSwitcherLabel', required: true },
  ],
  uiLabel: [{ name: 'value', required: true }],
  category: [{ name: 'name', required: true }],
  priority: [{ name: 'label', required: true }],
  emptyState: [
    { name: 'heading', required: true },
    { name: 'message', required: true },
    { name: 'illustrationAlt', altFor: 'illustration' },
    { name: 'callToActionLabel' },
  ],
  page: [
    { name: 'title', required: true },
    { name: 'intro' },
    { name: 'seoTitle' },
    { name: 'seoDescription' },
  ],
  faqItem: [
    { name: 'question', required: true },
    { name: 'answer', required: true },
  ],
};

export function readEnv(env) {
  const missing = ENV_NAMES.filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  return {
    spaceId: env.CONTENTFUL_SPACE_ID,
    environmentId: env.CONTENTFUL_ENVIRONMENT_ID,
    accessToken: env.CONTENTFUL_DELIVERY_TOKEN,
  };
}

/** True when a value has real content: text that is not blank, or rich text with any text in it. */
export function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'object' && value.nodeType === 'document') return richTextHasText(value);
  return true;
}

function richTextHasText(node) {
  if (typeof node.value === 'string' && node.value.trim() !== '') return true;
  return (node.content ?? []).some(richTextHasText);
}

function isSet(field) {
  return field !== undefined && Object.values(field).some((value) => value !== undefined && value !== null);
}

function label(entry) {
  return `${entry.sys.contentType.sys.id} ${entry.sys.id}`;
}

/**
 * Finds the gaps in a list of entries read with all locales. Returns `{ entry, field, locale, problem }`
 * rows, where `problem` is `missing` or `missing-alt-text`.
 */
export function findFieldGaps(entries) {
  const gaps = [];
  for (const entry of entries) {
    const specs = LOCALIZED_FIELDS[entry.sys.contentType.sys.id] ?? [];
    for (const spec of specs) {
      const values = entry.fields?.[spec.name] ?? {};
      const present = LOCALES.filter((locale) => hasValue(values[locale]));
      const altRequired = spec.altFor !== undefined && isSet(entry.fields?.[spec.altFor]);
      const needed = spec.required || altRequired || present.length > 0;
      if (!needed) continue;
      for (const locale of LOCALES) {
        if (present.includes(locale)) continue;
        gaps.push({
          entry: label(entry),
          field: spec.name,
          locale,
          problem: altRequired ? 'missing-alt-text' : 'missing',
        });
      }
    }
  }
  return gaps;
}

/** Keys that the app looks up but no uiLabel entry defines. */
export function findMissingKeys(entries, requiredKeys) {
  const defined = new Set(
    entries
      .filter((entry) => entry.sys.contentType.sys.id === 'uiLabel')
      .map((entry) => Object.values(entry.fields?.key ?? {})[0]),
  );
  return requiredKeys.filter((key) => !defined.has(key)).map((key) => ({ key, problem: 'missing-key' }));
}

export function formatReport({ fieldGaps, missingKeys }) {
  const lines = [];
  for (const key of missingKeys) lines.push(`uiLabel key "${key.key}" is missing entirely`);
  for (const gap of fieldGaps) {
    const what = gap.problem === 'missing-alt-text' ? 'image alt text' : 'value';
    lines.push(`${gap.entry}: ${gap.field} has no ${gap.locale} ${what}`);
  }
  return lines;
}

async function fetchAllEntries({ spaceId, environmentId, accessToken }, fetchImpl) {
  const entries = [];
  for (let skip = 0; ; ) {
    const url =
      `https://cdn.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries` +
      `?locale=*&limit=1000&skip=${skip}`;
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Contentful responded with status ${response.status}.`);
    const body = await response.json();
    entries.push(...body.items);
    skip += body.items.length;
    if (body.items.length === 0 || skip >= body.total) return entries;
  }
}

export function loadRequiredKeys() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const groups = JSON.parse(readFileSync(join(dir, 'required-keys.json'), 'utf8'));
  return Object.values(groups).flat();
}

/** Runs the check. Returns the exit code: 0 when complete, 1 when anything is missing. */
export async function main(
  env,
  { fetchImpl = fetch, requiredKeys = loadRequiredKeys(), log = console.log } = {},
) {
  const entries = await fetchAllEntries(readEnv(env), fetchImpl);
  const report = formatReport({
    fieldGaps: findFieldGaps(entries),
    missingKeys: findMissingKeys(entries, requiredKeys),
  });
  if (report.length === 0) {
    log(`Translations complete: ${entries.length} entries have English and French.`);
    return 0;
  }
  report.forEach((line) => log(line));
  log(`${report.length} translation gap${report.length === 1 ? '' : 's'} found.`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.env).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
