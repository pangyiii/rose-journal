/* 行测研习手札 · 离线全量缓存与后台服务 */
const CACHE_NAME = 'atelier-journal-offline-v4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    './icon-192.png',
    './icon-512.png'
];

// 首次安装时：把主页和静态资源下载到本地
// 注意：不用 cache.addAll —— 它是"全有或全无"，只要有一个文件 404，
// 整个安装就会失败，导致缓存永远是空的（这正是之前"第二次打开就报错"的根因）。
// 改成逐个尝试，单个资源失败不影响其它资源的缓存。
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                ASSETS_TO_CACHE.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn('缓存资源失败，已跳过：', url, err);
                    })
                )
            );
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
    // 只处理 GET 请求，避免拦截 POST 等请求导致异常响应
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request)
                .then((networkResponse) => {
                    // 顺手把新资源存入缓存，下次可离线使用
                    if (networkResponse && networkResponse.ok) {
                        const cloned = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    // 网络不通时：页面导航回退到本地主页，其余资源回退到一个安全的空响应
                    // 关键修复：绝不能返回 undefined，否则 Safari 会直接报错崩溃
                    if (event.request.mode === 'navigate') {
                        const fallback = await caches.match('./index.html');
                        if (fallback) return fallback;
                    }
                    return new Response('', { status: 504, statusText: 'Offline' });
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
