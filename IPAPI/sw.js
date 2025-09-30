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

// 拦截网络请求
self.addEventListener('fetch', event => {
    // 对于API请求和外部服务，跳过Service Worker处理（iOS兼容性）
    if (event.request.url.includes('api.ipify.org') || 
        event.request.url.includes('ip-api.com') ||
        event.request.url.includes('/api/')) {
        // 让这些请求直接通过，不使用Service Worker
        return;
    }

    // 对于其他资源，使用缓存优先策略
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果缓存中有，直接返回
                if (response) {
                    return response;
                }

                // 否则从网络获取
                return fetch(event.request)
                    .then(response => {
                        // 确保响应有效
                        if (!response) {
                            throw new Error('No response received');
                        }

                        // 检查响应是否可缓存
                        if (response.status === 200 && response.type === 'basic') {
                            // 克隆响应用于缓存
                            const responseToCache = response.clone();
                            
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(error => {
                                    console.log('缓存失败:', error);
                                });
                        }

                        return response;
                    })
                    .catch(error => {
                        console.log('网络请求失败:', error);
                        // 网络请求失败时的降级处理
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html').then(fallbackResponse => {
                                return fallbackResponse || new Response('离线模式', {
                                    status: 200,
                                    headers: { 'Content-Type': 'text/html' }
                                });
                            });
                        }
                        // 对于其他资源，返回一个基本的错误响应
                        return new Response('资源不可用', {
                            status: 404,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
            .catch(error => {
                console.log('缓存匹配失败:', error);
                // 如果缓存匹配也失败，直接网络请求
                return fetch(event.request).catch(() => {
                    return new Response('服务不可用', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
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