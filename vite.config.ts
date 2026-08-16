/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Build-time product info: version from package.json, git sha (Vercel env or local git), build date,
// and the latest CHANGELOG sections for the in-app "Novidades" dialog.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const gitSha = (() => {
  const env = process.env.VERCEL_GIT_COMMIT_SHA
  if (env) return env.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return 'dev' }
})()
const changelogEntries = (() => {
  try {
    const md = readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf8')
    const parts = md.split(/^## /m).slice(1)
    return parts.slice(0, 6).map((p) => {
      const [head, ...rest] = p.split('\n')
      const m = head.match(/^\[(.+?)\](?:\s*—\s*(\S+))?/)
      return { title: m?.[1] ?? head.trim(), date: m?.[2] ?? '', body: rest.join('\n').trim() }
    })
  } catch { return [] }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_SHA__: JSON.stringify(gitSha),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __CHANGELOG__: JSON.stringify(changelogEntries),
  },
  build: {
    // Three.js minificado fica ~560 kB; o limite padrão (500) só gerava ruído no CI.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'konva', test: /node_modules[\\/](?:konva|react-konva)[\\/]/ },
            { name: 'clipper', test: /node_modules[\\/]clipper-lib[\\/]/ },
            { name: 'react', test: /node_modules[\\/](?:react|react-dom)[\\/]/ },
            { name: 'opentype', test: /node_modules[\\/]opentype\.js[\\/]/ },
          ],
        },
      },
    },
  },
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
