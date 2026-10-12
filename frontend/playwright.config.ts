import { defineConfig, devices } from '@playwright/test';

// Every e2e spec runs twice, once per language. Each project starts at its language path,
// so specs navigate with relative URLs (for example page.goto('./')) and never a leading slash.
const origin = 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Firefox and WebKit start slowly against the dev server, so they get longer limits.
  timeout: process.env['CROSS_BROWSER'] ? 90_000 : 30_000,
  expect: { timeout: process.env['CROSS_BROWSER'] ? 15_000 : 5_000 },
  retries: process.env['CROSS_BROWSER'] ? 1 : 0,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
  // Chromium by default. `npm run e2e:cross` (CROSS_BROWSER=1) adds Firefox and WebKit, each in both languages.
  projects: [
    { name: 'en', use: { baseURL: `${origin}/en/`, locale: 'en-CA' } },
    { name: 'fr', use: { baseURL: `${origin}/fr/`, locale: 'fr-CA' } },
    ...(process.env['CROSS_BROWSER']
      ? (['firefox', 'webkit'] as const).flatMap((browser) =>
          (['en', 'fr'] as const).map((lang) => ({
            name: `${lang}-${browser}`,
            use: {
              ...devices[browser === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari'],
              baseURL: `${origin}/${lang}/`,
              locale: `${lang}-CA`,
            },
          })),
        )
      : []),
  ],
  webServer: [
    {
      command: 'npm start',
      url: origin,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // The mock todo backend. It resets to its seed data every time it starts.
      command: 'npm start --prefix ../mock-backend',
      url: 'http://localhost:3000/todos',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
