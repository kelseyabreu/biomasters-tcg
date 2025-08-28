import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { configureMobileAuth } from './utils/mobileAuth';

// Import remaining test systems for development
import { testD100System } from './utils/d100ProbabilitySystem';

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Configure mobile authentication
configureMobileAuth();

// Make test functions available globally for development
if (process.env.NODE_ENV === 'development') {
  (window as any).testD100System = testD100System;
  console.log('🎮 Development mode: Test functions available globally');
  console.log('  - Run testD100System(cards) to test probability system');
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);