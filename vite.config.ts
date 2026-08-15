/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/main.tsx',
        'e2e/',
        '**/*.d.ts',
        'src/vite-env.d.ts',
        // Canvas (Konva) / WebGL (Three.js) rendering components: jsdom cannot
        // produce real canvas/WebGL output, so these are covered by the
        // Playwright e2e + smoke suite instead of unit tests. See README.
        'src/components/Editor.tsx',
        'src/components/Simulator.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
