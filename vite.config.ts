import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // legacy() // Temporarily disabled due to core-js issue
  ],
  define: {
    // Provide browser-safe process global for shared package compatibility
    'process.env': 'import.meta.env'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@kelseyabreu/shared': path.resolve(__dirname, 'packages/shared/src/index.ts')
    }
  },
  assetsInclude: ['**/*.json'],
  json: {
    stringify: false
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/e2e/**', // Exclude e2e tests (they use Playwright)
      '**/server/**', // Exclude server tests (they use Jest)
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ]
  }
})
