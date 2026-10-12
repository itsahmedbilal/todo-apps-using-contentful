// Runs every migration in contentful/migrations in filename order.
// Reads CONTENTFUL_SPACE_ID, CONTENTFUL_ENVIRONMENT_ID and CONTENTFUL_MANAGEMENT_TOKEN from the
// environment. The token is never written to disk or printed.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigration } from 'contentful-migration';

const names = ['CONTENTFUL_SPACE_ID', 'CONTENTFUL_ENVIRONMENT_ID', 'CONTENTFUL_MANAGEMENT_TOKEN'];
const missing = names.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.js'))
  .sort();

for (const file of files) {
  console.log(`Running ${file}`);
  await runMigration({
    filePath: join(dir, file),
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
    yes: true,
  });
}
