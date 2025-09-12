import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { configureMobileAuth } from './utils/mobileAuth';
import useHybridGameStore from './state/hybridGameStore';
import { unifiedGameService } from './services/UnifiedGameService';



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

// Expose store and service to window for testing (development only)
if (process.env.NODE_ENV === 'development') {
  (window as any).useHybridGameStore = useHybridGameStore;
  (window as any).unifiedGameService = unifiedGameService;
  console.log('🧪 Development mode: Store and service exposed to window for testing');
}



const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);