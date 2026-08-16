import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // The first-run tour is opt-in for tests: mark it done everywhere (onboarding.spec clears it).
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'oficina-cnc:tour-done', value: '1' }, { name: 'oficina-cnc:storage-notice', value: '1' }] }] },
    // Optional: point at a pre-installed Chromium (e.g. sandboxes) instead of downloading one.
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
    { name: 'tablet-chrome', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' }, testMatch: /mobile\.spec\.ts/ },
  ],
})
