# Deployment Guide - Biomasters TCG

This guide covers deploying the Biomasters Trading Card Game to various platforms including web, iOS, and Android.

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Git
- For iOS: Xcode 14+ and macOS
- For Android: Android Studio and Java 11+

## 🌐 Web Deployment

### Development Build

```bash
# Start development server
npm run dev

# Access at http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Deploy automatically on push to main branch

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

### Deploy to GitHub Pages

1. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add deploy script to package.json**
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

## 📱 Mobile Deployment

### Initial Setup

1. **Build the web app**
   ```bash
   npm run build
   ```

2. **Add mobile platforms**
   ```bash
   # Add iOS platform
   npx cap add ios

   # Add Android platform  
   npx cap add android
   ```

3. **Sync web assets**
   ```bash
   npx cap sync
   ```

## 🍎 iOS Deployment

### Development Setup

1. **Requirements**
   - macOS with Xcode 14+
   - Apple Developer Account (for device testing and App Store)
   - iOS device or simulator

2. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

3. **Configure App Settings**
   - Set Bundle Identifier in Xcode
   - Configure signing certificates
   - Set deployment target (iOS 13+)

### Testing on Device

1. **Connect iOS device**
2. **Select device in Xcode**
3. **Build and run** (Cmd+R)

### App Store Deployment

1. **Archive the app**
   - Product → Archive in Xcode
   - Wait for archive to complete

2. **Upload to App Store Connect**
   - Window → Organizer
   - Select archive and click "Distribute App"
   - Choose "App Store Connect"
   - Follow upload wizard

3. **Configure in App Store Connect**
   - Add app metadata
   - Upload screenshots
   - Set pricing and availability
   - Submit for review

### iOS Build Configuration

Update `ios/App/App/Info.plist`:

```xml
<key>CFBundleDisplayName</key>
<string>Species TCG</string>
<key>CFBundleVersion</key>
<string>1.0.0</string>
<key>NSCameraUsageDescription</key>
<string>This app uses camera for AR features</string>
```

## 🤖 Android Deployment

### Development Setup

1. **Requirements**
   - Android Studio
   - Java 11+
   - Android SDK

2. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

3. **Configure App Settings**
   - Update `android/app/build.gradle`
   - Set application ID
   - Configure signing

### Testing on Device

1. **Enable Developer Options** on Android device
2. **Enable USB Debugging**
3. **Connect device via USB**
4. **Run from Android Studio**

### Google Play Store Deployment

1. **Generate signed APK/AAB**
   - Build → Generate Signed Bundle/APK
   - Create or use existing keystore
   - Build release version

2. **Upload to Google Play Console**
   - Create app in Play Console
   - Upload AAB file
   - Complete store listing
   - Submit for review

### Android Build Configuration

Update `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.biomasters.tcg"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

## 🔧 Build Optimization

### Performance Optimization

1. **Bundle Analysis**
   ```bash
   npm run build -- --analyze
   ```

2. **Code Splitting**
   - Lazy load routes
   - Split vendor bundles
   - Optimize images

3. **PWA Optimization**
   - Minimize service worker cache
   - Optimize manifest.json
   - Compress assets

### Environment Configuration

Create environment files:

```bash
# .env.production
VITE_API_URL=https://api.speciestcg.com
VITE_ANALYTICS_ID=your-analytics-id

# .env.development  
VITE_API_URL=http://localhost:3000
VITE_ANALYTICS_ID=dev-analytics-id
```

## 🚀 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

## 📊 Monitoring & Analytics

### Error Tracking

1. **Sentry Integration**
   ```bash
   npm install @sentry/react
   ```

2. **Configure in main.tsx**
   ```typescript
   import * as Sentry from "@sentry/react";
   
   Sentry.init({
     dsn: "your-sentry-dsn"
   });
   ```

### Performance Monitoring

1. **Web Vitals**
   ```bash
   npm install web-vitals
   ```

2. **Google Analytics**
   ```typescript
   // Add GA4 tracking
   gtag('config', 'GA_MEASUREMENT_ID');
   ```

## 🔒 Security Considerations

### Content Security Policy

Add to `index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline';">
```

### HTTPS Configuration

- Enable HTTPS in production
- Use secure cookies
- Implement HSTS headers

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify environment variables

2. **iOS Build Issues**
   - Update Xcode and iOS SDK
   - Clean build folder
   - Check provisioning profiles

3. **Android Build Issues**
   - Update Android SDK
   - Check Java version
   - Verify signing configuration

### Debug Commands

```bash
# Clear all caches
npm run clean
rm -rf node_modules package-lock.json
npm install

# Capacitor debugging
npx cap doctor
npx cap sync --deployment

# Build with verbose output
npm run build -- --verbose
```

## 📈 Performance Benchmarks

Target metrics for production:
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 3s
- Time to Interactive: < 4s
- Bundle size: < 1MB gzipped

## 🎯 Release Checklist

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Version numbers incremented
- [ ] Changelog updated
- [ ] Backup created
- [ ] Deployment tested in staging
- [ ] Monitoring configured
- [ ] Rollback plan prepared

---

For additional support, check the [main README](README.md) or open an issue in the repository.
