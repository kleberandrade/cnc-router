/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'og-image.png', 'robots.txt', 'sitemap.xml', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Oficina CNC',
        short_name: 'Oficina CNC',
        description: 'Editor 2D com importação SVG/DXF, gerador de G-code GRBL e simulador 3D para router CNC — 100% no navegador, instalável como PWA.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f7f7f5',
        theme_color: '#16283d',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
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
