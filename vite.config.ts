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
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  assetsInclude: ['**/*.json'],
  json: {
    stringify: false
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/server/**', // Exclude server tests (they use Jest)
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ]
  }
})
