// Runs the Playwright suite on Chromium, Firefox and WebKit, each in English and French.
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CROSS_BROWSER: '1' },
});
process.exit(result.status ?? 1);
