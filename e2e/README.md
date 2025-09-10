# BioMasters TCG E2E Testing

This directory contains comprehensive end-to-end tests for the BioMasters TCG authentication system and user lifecycle management.

## Overview

The e2e tests cover:
- ✅ User registration with real Firebase Auth
- ✅ User sign-in with real Firebase Auth  
- ✅ Guest account creation and management
- ✅ Guest-to-registered account conversion
- ✅ Complete account deletion (Frontend + Backend + Firebase)
- ✅ Error handling and edge cases
- ✅ Cross-platform compatibility
- ✅ Network failure scenarios

## Test Architecture

### Real Firebase Integration
Unlike typical e2e tests that mock external services, these tests use **real Firebase Auth** to ensure complete integration testing. This provides:

- **Authentic Authentication Flow**: Tests actual Firebase Auth behavior
- **Real User Lifecycle**: Complete user creation, management, and deletion
- **Firebase Deletion Verification**: Confirms users are actually removed from Firebase
- **Production-Like Environment**: Tests behave like real user interactions

### Test Structure

```
e2e/
├── auth-and-deletion.spec.ts     # Main authentication and deletion tests
├── user-types-standardization.spec.ts  # User type system tests
├── config/
│   └── firebase-test-config.ts  # Firebase test configuration
├── utils/
│   ├── firebase-test-utils.ts   # Firebase testing utilities
│   └── test-data-manager.ts     # Test data management
├── global-setup.ts              # Test environment setup
├── global-teardown.ts           # Test environment cleanup
└── README.md                    # This file
```

## Setup and Configuration

### Prerequisites

1. **Firebase Project**: Set up a Firebase project for testing
2. **Environment Variables**: Configure Firebase credentials
3. **Backend Server**: Ensure backend is running with test endpoints
4. **Frontend Server**: Ensure frontend is running

### Environment Variables

Create a `.env.test` file or set these environment variables:

```bash
# Firebase Configuration
VITE_FIREBASE_PROJECT_ID=your-test-project-id
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:your-app-id

# Test Configuration
FIREBASE_USE_EMULATOR=true  # Use Firebase emulator for testing
PLAYWRIGHT_TEST=true        # Enable test mode
NODE_ENV=test              # Set test environment
```

### Firebase Emulator Setup (Recommended)

For safer testing, use Firebase emulators:

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Start Emulators**:
   ```bash
   npm run firebase:emulators
   # or with UI
   npm run firebase:emulators.ui
   ```

3. **Run Tests with Emulator**:
   ```bash
   FIREBASE_USE_EMULATOR=true npm run test.e2e.auth
   ```

## Running Tests

### Quick Start

```bash
# Run all authentication tests
npm run test.e2e.auth

# Run with browser visible (for debugging)
npm run test.e2e.auth.headed

# Run all e2e tests
npm run test.e2e

# Run with Playwright UI (interactive)
npm run test.e2e.ui
```

### Test Scenarios

#### 1. User Registration Flow
```bash
# Test new user registration with real Firebase
playwright test -g "should register new user with real Firebase"
```

#### 2. User Sign-In Flow  
```bash
# Test existing user sign-in
playwright test -g "should sign in existing user with real Firebase"
```

#### 3. Account Deletion Flow
```bash
# Test complete account deletion
playwright test -g "should delete registered user account completely"
```

#### 4. Guest Account Flow
```bash
# Test guest account creation and conversion
playwright test -g "Guest Account Flow"
```

## Test Data Management

### Automatic Cleanup
Tests automatically clean up created data:
- **Firebase Users**: Deleted via Firebase Admin SDK
- **Database Records**: Removed via test API endpoints
- **Browser Storage**: Cleared between tests

### Manual Cleanup
If tests fail and leave data behind:

```bash
# Clean up via API
curl -X DELETE http://localhost:3001/api/test/cleanup \
  -H "Content-Type: application/json" \
  -d '{"testRun": "manual-cleanup", "userPattern": "e2e-test-%"}'

# Clear Firebase emulator data
curl -X DELETE http://localhost:9099/emulator/v1/projects/your-project/accounts
```

## Debugging Tests

### Common Issues

1. **Firebase Connection Errors**
   - Check Firebase configuration
   - Verify emulator is running (if using emulator)
   - Check network connectivity

2. **Test Timeouts**
   - Increase timeout in test configuration
   - Check server response times
   - Verify database connectivity

3. **Element Not Found**
   - Check data-testid attributes in components
   - Verify component rendering
   - Use Playwright UI mode for debugging

### Debug Mode

```bash
# Run with browser visible and slow motion
playwright test --headed --slowMo=1000 e2e/auth-and-deletion.spec.ts

# Run with debug mode (pauses at breakpoints)
playwright test --debug e2e/auth-and-deletion.spec.ts

# Generate test report
playwright test --reporter=html
```

### Logging

Tests include comprehensive logging:
- 🔥 Firebase operations
- 📝 User creation/deletion
- 🧹 Cleanup operations
- ❌ Error details

## Test Configuration

### Playwright Configuration
See `playwright.config.ts` for:
- Browser settings
- Timeout configuration
- Test parallelization
- Reporter settings

### Firebase Test Configuration
See `e2e/config/firebase-test-config.ts` for:
- Firebase project settings
- Emulator configuration
- Test constants
- Selector definitions

## Contributing

### Adding New Tests

1. **Follow Naming Convention**:
   ```typescript
   test('should [action] [expected result]', async ({ page }) => {
     // Test implementation
   });
   ```

2. **Use Test Data Manager**:
   ```typescript
   const testUser = await testDataManager.createTestUser({
     email: 'test@example.com',
     password: 'TestPassword123!',
     displayName: 'Test User'
   });
   ```

3. **Include Cleanup**:
   ```typescript
   test.afterEach(async () => {
     await testDataManager.cleanupTestUsers();
   });
   ```

4. **Add Proper Assertions**:
   ```typescript
   // Verify Firebase deletion
   const firebaseDeleted = await testDataManager.verifyFirebaseUserDeleted(user.uid);
   expect(firebaseDeleted).toBe(true);
   
   // Verify database deletion
   const dbDeleted = await testDataManager.verifyUserNotInDatabase(user.email);
   expect(dbDeleted).toBe(true);
   ```

### Test Data Patterns

- **Email Pattern**: `e2e-test-{timestamp}@example.com`
- **Password Pattern**: `TestPassword{suffix}!`
- **Display Name Pattern**: `E2E Test User {suffix}`

### Selectors

Use data-testid attributes for reliable element selection:
```html
<button data-testid="delete-account-button">Delete Account</button>
```

```typescript
await page.click('[data-testid="delete-account-button"]');
```

## Security Considerations

- **Test Isolation**: Each test uses unique user data
- **Data Cleanup**: All test data is automatically removed
- **Firebase Security**: Uses test project or emulator
- **No Production Data**: Tests never touch production systems

## Performance

- **Parallel Execution**: Tests run in parallel when possible
- **Efficient Cleanup**: Batch operations for better performance
- **Smart Retries**: Automatic retry for flaky operations
- **Resource Management**: Proper cleanup of browser contexts

## Monitoring

Tests include monitoring for:
- **Test Duration**: Track slow tests
- **Failure Rates**: Identify flaky tests
- **Resource Usage**: Monitor memory and CPU
- **Firebase Quotas**: Track API usage

## Support

For issues with e2e tests:
1. Check the test logs for detailed error information
2. Verify all prerequisites are met
3. Try running tests in headed mode for visual debugging
4. Check Firebase emulator status if using emulators
5. Verify backend API endpoints are responding correctly
