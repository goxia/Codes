// Service Worker for PWA functionality
const CACHE_NAME = 'cmd-powershell-converter-v1.0.1'; // Increment version for updates
const STATIC_CACHE_NAME = 'cmd-ps-static-v2'; // Updated cache version
const DYNAMIC_CACHE_NAME = 'cmd-ps-dynamic-v2'; // Updated cache version

// Service Worker is now always active

// Files to cache for offline functionality
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/styles/main.css',
    '/js/commands.js',
    '/js/storage.js',
    '/js/converter.js',
    '/js/ui.js',
    '/js/app.js',
    // External resources that should be cached
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Dynamic content patterns to cache
const DYNAMIC_CACHE_PATTERNS = [
    /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
    /^https:\/\/cdnjs\.cloudflare\.com\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                // Silent fail in production
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
                        // Delete old cache versions
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const request = event.request;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        handleFetch(request)
    );
});

// Handle fetch requests with different strategies
async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // Strategy 1: Cache First for static assets
        if (isStaticAsset(request)) {
            return await cacheFirstStrategy(request);
        }
        
        // Strategy 2: Network First for dynamic content
        if (isDynamicContent(request)) {
            return await networkFirstStrategy(request);
        }
        
        // Strategy 3: Stale While Revalidate for external resources
        if (isExternalResource(request)) {
            return await staleWhileRevalidateStrategy(request);
        }
        
        // Default: Network First
        return await networkFirstStrategy(request);
        
    } catch (error) {
        console.error('Service Worker: Fetch failed', error);
        
        // Return offline fallback if available
        return await getOfflineFallback(request);
    }
}

// Cache First Strategy - for static assets
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Not in cache, fetch from network and cache
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Network fetch failed for static asset', error);
        throw error;
    }
}

// Network First Strategy - for dynamic content
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok && shouldCache(request)) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Stale While Revalidate Strategy - for external resources
async function staleWhileRevalidateStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    // Always try to fetch fresh version in background
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            const cache = caches.open(DYNAMIC_CACHE_NAME);
            cache.then(c => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
    }).catch(() => {
        // Network failed, but we might have cached version
        return cachedResponse;
    });
    
    // Return cached version immediately if available, otherwise wait for network
    return cachedResponse || fetchPromise;
}

// Check if request is for static asset
function isStaticAsset(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    return pathname === '/' ||
           pathname === '/index.html' ||
           pathname.startsWith('/styles/') ||
           pathname.startsWith('/js/') ||
           pathname === '/manifest.json';
}

// Check if request is for dynamic content
function isDynamicContent(request) {
    const url = new URL(request.url);
    
    // Add patterns for dynamic content
    return false; // No dynamic server content in this app
}

// Check if request is for external resource
function isExternalResource(request) {
    const url = new URL(request.url);
    
    return DYNAMIC_CACHE_PATTERNS.some(pattern => 
        pattern.test(request.url)
    ) || url.origin !== self.location.origin;
}

// Check if response should be cached
function shouldCache(request) {
    const url = new URL(request.url);
    
    // Don't cache POST requests or other methods
    if (request.method !== 'GET') {
        return false;
    }
    
    // Don't cache requests with query parameters (except fonts)
    if (url.search && !url.pathname.includes('fonts')) {
        return false;
    }
    
    return true;
}

// Get offline fallback
async function getOfflineFallback(request) {
    const url = new URL(request.url);
    
    // For HTML requests, return cached index.html
    if (request.headers.get('Accept')?.includes('text/html')) {
        const cachedResponse = await caches.match('/index.html');
        if (cachedResponse) {
            return cachedResponse;
        }
    }
    
    // For other requests, try to find in any cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Return a generic offline response
    return new Response(
        JSON.stringify({
            error: 'Offline',
            message: 'You are currently offline and the requested resource is not cached.'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('Service Worker: Performing background sync');
    
    try {
        // Sync any pending data when connection is restored
        // This would be used for uploading cached form data, etc.
        
        // For now, just log that sync is available
        console.log('Service Worker: Background sync completed');
        
        // Notify all clients that sync completed
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETED',
                timestamp: Date.now()
            });
        });
        
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
        throw error;
    }
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received', event);
    
    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'cmd-powershell-converter',
        actions: [
            {
                action: 'open',
                title: '打开应用',
                icon: '/icons/icon-72x72.png'
            },
            {
                action: 'dismiss',
                title: '忽略',
                icon: '/icons/icon-72x72.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('CMD PowerShell 转换器', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        // Open or focus the app
        event.waitUntil(
            self.clients.matchAll({ type: 'window' })
                .then((clients) => {
                    // Check if app is already open
                    for (const client of clients) {
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // If not open, open new window
                    if (self.clients.openWindow) {
                        return self.clients.openWindow('/');
                    }
                })
        );
    }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_NAME
            });
            break;
        
        case 'CLEAN_CACHE':
            cleanOldCaches();
            break;
        
        default:
            console.log('Service Worker: Unknown message type', event.data.type);
    }
});

// Clean old caches
async function cleanOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name !== STATIC_CACHE_NAME && 
            name !== DYNAMIC_CACHE_NAME &&
            name !== CACHE_NAME
        );
        
        await Promise.all(
            oldCaches.map(name => caches.delete(name))
        );
        
        console.log('Service Worker: Old caches cleaned');
    } catch (error) {
        console.error('Service Worker: Failed to clean old caches', error);
    }
}

// Periodic background sync (for future use)
self.addEventListener('periodicsync', (event) => {
    console.log('Service Worker: Periodic sync triggered', event.tag);
    
    if (event.tag === 'content-sync') {
        event.waitUntil(doPeriodicSync());
    }
});

async function doPeriodicSync() {
    console.log('Service Worker: Performing periodic sync');
    
    try {
        // Update cached content periodically
        // For now, just refresh critical assets
        
        const criticalAssets = ['/', '/styles/main.css', '/js/app.js'];
        const cache = await caches.open(STATIC_CACHE_NAME);
        
        for (const asset of criticalAssets) {
            try {
                const response = await fetch(asset);
                if (response.ok) {
                    await cache.put(asset, response);
                }
            } catch (error) {
                console.warn('Service Worker: Failed to update asset', asset, error);
            }
        }
        
        console.log('Service Worker: Periodic sync completed');
    } catch (error) {
        console.error('Service Worker: Periodic sync failed', error);
    }
}