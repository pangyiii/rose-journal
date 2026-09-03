/* 行测研习手札 · 离线全量缓存与后台服务 */
const CACHE_NAME = 'atelier-journal-offline-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    './icon-192.png',
    './icon-512.png'
];

// 首次安装时：强制把主页和静态资源全部下载到 iPhone 本地
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// 激活时：清理旧缓存并接管控制权
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => clients.claim())
    );
});

// 核心网络拦截策略：离线缓存优先（Cache-First）
// 只要本地有缓存，根本不走外网解析，关掉梯子也能秒开！
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // 网络不通时回退到本地主页
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// 系统级 Web Push 推送事件
self.addEventListener('push', (event) => {
    let payload = {
        title: '行测研习手札 · 督导',
        body: '案前墨香正浓，今日行测研习手札尚待展卷归档。',
        url: './index.html'
    };

    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [100, 50, 100],
        data: { url: payload.url || './index.html' }
    };

    event.waitUntil(self.registration.showNotification(payload.title, options));
});

// 点击通知唤醒手札
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (let client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url || './index.html');
            }
        })
    );
});
