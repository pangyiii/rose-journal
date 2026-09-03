/* 行测研习手札 · 后台推送与离线服务 */
const CACHE_NAME = 'atelier-journal-v1';

// 安装与跳过等待
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 激活时接管所有客户端
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// 监听系统级 Web Push 推送事件（15:00 / 18:00 / 21:00 唤醒）
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
        data: {
            url: payload.url || './index.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// 点击锁屏通知直接进入手札应用
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