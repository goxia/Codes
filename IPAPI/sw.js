const CACHE_NAME = 'ip-query-v1.0.1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安装事件
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存已打开');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.log('缓存文件时出错:', error);
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 拦截网络请求 - 简化版本，只缓存静态资源
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 只处理同源的静态资源，所有API请求都不拦截
    if (url.origin !== location.origin || 
        event.request.url.includes('/api/') ||
        event.request.url.includes('api.ipify.org') || 
        event.request.url.includes('ip-api.com') ||
        event.request.method !== 'GET') {
        // 完全不处理这些请求，让它们自然通过
        return;
    }

    // 只对本地静态文件使用缓存
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
            .catch(() => {
                // 简单的fallback
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            })
    );
});

// 后台同步
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    // 这里可以实现后台数据同步逻辑
    console.log('执行后台同步');
    return Promise.resolve();
}

// 推送通知
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : '您有新的IP查询结果',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '查看详情',
                icon: './icons/checkmark.png'
            },
            {
                action: 'close',
                title: '关闭',
                icon: './icons/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('IP查询工具', options)
    );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        // 打开应用
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// 消息事件处理
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// 错误处理
self.addEventListener('error', event => {
    console.log('Service Worker错误:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.log('未处理的Promise拒绝:', event.reason);
    event.preventDefault();
});