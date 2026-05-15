import { defineConfig } from 'vitest/config'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/.env.example'],
    },
  },
  plugins: [
    devtools(),
    // cloudflare({ viteEnvironment: { name: 'ssr' } }), // Disabled for local dev
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

export default config
