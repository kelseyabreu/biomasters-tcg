import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import path from 'path'
import fs from 'fs'

// Custom plugin to process Service Worker with build-time variables
function serviceWorkerPlugin() {
  return {
    name: 'service-worker',
    buildStart() {
      // Add the service worker as a watched file
      this.addWatchFile('public/sw.js');
    },
    generateBundle() {
      // Read the service worker template
      const swTemplate = fs.readFileSync('public/sw.js', 'utf-8');

      // Get package.json version (force fresh read)
      const packagePath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const appVersion = packageJson.version || '0.0.1';
      const buildTimestamp = Date.now();

      console.log(`🔧 Processing Service Worker: v${appVersion} (${buildTimestamp})`);

      // Replace build-time variables
      let processedSW = swTemplate;

      // Replace APP_VERSION
      const appVersionPattern = "const APP_VERSION = '__APP_VERSION__';";
      const appVersionReplacement = `const APP_VERSION = '${appVersion}';`;
      processedSW = processedSW.replace(appVersionPattern, appVersionReplacement);

      // Replace BUILD_TIMESTAMP
      const buildTimestampPattern = "const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__';";
      const buildTimestampReplacement = `const BUILD_TIMESTAMP = '${buildTimestamp}';`;
      processedSW = processedSW.replace(buildTimestampPattern, buildTimestampReplacement);

      // Emit the processed service worker
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: processedSW
      });

      console.log('✅ Service Worker processed and emitted');
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    serviceWorkerPlugin(),
    // legacy() // Temporarily disabled due to core-js issue
  ],
  define: {
    // Provide browser-safe process global for shared package compatibility
    'process.env': 'import.meta.env',
    // Build-time variables for Service Worker cache busting
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.1'),
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now())
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
