import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/renderer/src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build']
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src/renderer/src'),
      '@': path.resolve(__dirname, './src/renderer/src')
    }
  }
})
