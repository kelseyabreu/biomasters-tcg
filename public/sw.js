// Service Worker for Biomasters TCG
// Provides offline functionality and caching

const CACHE_NAME = 'biomasters-tcg-v1';
const STATIC_CACHE_NAME = 'biomasters-tcg-static-v1';
const DYNAMIC_CACHE_NAME = 'biomasters-tcg-dynamic-v1';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/species/manifest.json',
  // Add other static assets as needed
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached files when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', request.url);
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response
            const responseToCache = networkResponse.clone();
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                console.log('Service Worker: Caching dynamic content', request.url);
                cache.put(request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('Service Worker: Network request failed', error);
            
            // Return offline fallback for navigation requests
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // Return a generic offline response for other requests
            return new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for game data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'game-data-sync') {
    event.waitUntil(syncGameData());
  }
});

// Sync game data when online
async function syncGameData() {
  try {
    console.log('Service Worker: Syncing game data...');
    
    // Get stored game data from IndexedDB or localStorage
    const gameData = await getStoredGameData();
    
    if (gameData && gameData.needsSync) {
      // Send data to server when online
      const response = await fetch('/api/sync-game-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gameData)
      });
      
      if (response.ok) {
        // Mark as synced
        await markGameDataAsSynced();
        console.log('Service Worker: Game data synced successfully');
      }
    }
  } catch (error) {
    console.error('Service Worker: Error syncing game data', error);
  }
}

// Get stored game data (placeholder - implement based on your storage strategy)
async function getStoredGameData() {
  try {
    // This would typically read from IndexedDB or localStorage
    const data = localStorage.getItem('biomasters-tcg-storage');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Service Worker: Error reading stored game data', error);
    return null;
  }
}

// Mark game data as synced (placeholder)
async function markGameDataAsSynced() {
  try {
    const data = await getStoredGameData();
    if (data) {
      data.needsSync = false;
      localStorage.setItem('biomasters-tcg-storage', JSON.stringify(data));
    }
  } catch (error) {
    console.error('Service Worker: Error marking data as synced', error);
  }
}

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'New features available in Species Combat TCG!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Play Now',
        icon: '/favicon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Species Combat TCG', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_GAME_DATA') {
    // Cache important game data
    caches.open(DYNAMIC_CACHE_NAME)
      .then((cache) => {
        const response = new Response(JSON.stringify(event.data.gameData), {
          headers: { 'Content-Type': 'application/json' }
        });
        return cache.put('/game-data', response);
      });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered', event.tag);
  
  if (event.tag === 'game-data-backup') {
    event.waitUntil(backupGameData());
  }
});

// Backup game data periodically
async function backupGameData() {
  try {
    console.log('Service Worker: Backing up game data...');
    
    const gameData = await getStoredGameData();
    if (gameData) {
      // Store backup in cache
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const response = new Response(JSON.stringify({
        ...gameData,
        backupTimestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      await cache.put('/game-data-backup', response);
      console.log('Service Worker: Game data backed up');
    }
  } catch (error) {
    console.error('Service Worker: Error backing up game data', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error occurred', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection', event.reason);
});
