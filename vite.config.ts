import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

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
})

export default config
