// Makes sure the space has the locales the content model expects: en-CA (default) and fr-CA (fallback en-CA,
// optional). contentful-migration cannot manage locales, so this uses the Management client directly.
// Safe to re-run. Reads CONTENTFUL_SPACE_ID, CONTENTFUL_ENVIRONMENT_ID and CONTENTFUL_MANAGEMENT_TOKEN
// from the environment. The token is never written to disk or printed.
import { pathToFileURL } from 'node:url';

const DEFAULT_CODE = 'en-CA';
const FRENCH_CODE = 'fr-CA';
const ENV_NAMES = ['CONTENTFUL_SPACE_ID', 'CONTENTFUL_ENVIRONMENT_ID', 'CONTENTFUL_MANAGEMENT_TOKEN'];

export function readEnv(env) {
  const missing = ENV_NAMES.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  return {
    spaceId: env.CONTENTFUL_SPACE_ID,
    environmentId: env.CONTENTFUL_ENVIRONMENT_ID,
    accessToken: env.CONTENTFUL_MANAGEMENT_TOKEN,
  };
}

export async function ensureLocales(client, { spaceId, environmentId }, log = console.log) {
  const scope = { spaceId, environmentId };
  const { items } = await client.locale.getMany(scope);
  const byCode = new Map(items.map((locale) => [locale.code, locale]));

  if (!byCode.has(DEFAULT_CODE)) {
    const current = items.find((locale) => locale.default);
    if (!current) throw new Error('The space has no default locale.');
    // Renaming the default locale re-keys existing entries, so only do it while the space has none.
    const { total } = await client.entry.getMany({ ...scope, query: { limit: 1 } });
    if (total > 0) {
      throw new Error(
        `The default locale is ${current.code} and the space already has entries. ` +
          `Change the default locale to ${DEFAULT_CODE} by hand in Settings > Locales.`,
      );
    }
    // internal_code is read-only, so it is left out of the update body.
    const { internal_code: _internalCode, ...editable } = current;
    const renamed = await client.locale.update(
      { ...scope, localeId: current.sys.id },
      { ...editable, code: DEFAULT_CODE, name: 'English (Canada)' },
    );
    byCode.delete(current.code);
    byCode.set(DEFAULT_CODE, renamed);
    log(`Renamed default locale ${current.code} to ${DEFAULT_CODE}`);
  }

  if (!byCode.has(FRENCH_CODE)) {
    await client.locale.create(scope, {
      code: FRENCH_CODE,
      name: 'French (Canada)',
      fallbackCode: DEFAULT_CODE,
      optional: true,
      contentDeliveryApi: true,
      contentManagementApi: true,
    });
    log(`Created locale ${FRENCH_CODE}`);
  }

  log(`Locales ready: ${DEFAULT_CODE} (default), ${FRENCH_CODE} (fallback ${DEFAULT_CODE}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { accessToken, ...ids } = readEnv(process.env);
    const { createClient } = await import('contentful-management');
    await ensureLocales(createClient({ accessToken }, { type: 'plain' }), ids);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
