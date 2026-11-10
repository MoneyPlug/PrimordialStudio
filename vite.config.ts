import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @ts-expect-error vitest config
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
