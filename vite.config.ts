import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // legacy() // Temporarily disabled due to core-js issue
  ],
  assetsInclude: ['**/*.json'],
  json: {
    stringify: false
  }
})
