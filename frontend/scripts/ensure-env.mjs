// Creates src/environments/environment.local.ts from the example when it is missing, so a fresh
// clone can build and test. The copy has empty tokens; fill them in before running against Contentful.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'environments');
const local = join(dir, 'environment.local.ts');

if (!existsSync(local)) {
  copyFileSync(join(dir, 'environment.example.ts'), local);
  console.warn('Created src/environments/environment.local.ts from the example. Add your Contentful values.');
}
