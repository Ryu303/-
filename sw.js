const CACHE_NAME = 'faww-workspace-v72';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // 즉시 새 버전 설치
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // 이전 버전 캐시 삭제
                    }
                })
            );
        }).then(() => self.clients.claim()) // 즉시 새 서비스 워커 제어권 획득
    );
});

self.addEventListener('fetch', event => {
    // 외부 도메인(네이버 지도, 파이어베이스 등)은 서비스 워커가 개입하지 않고 브라우저가 직접 처리하도록 통과(Bypass)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => response)
            .catch(err => {
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    return new Response('', { status: 404, statusText: 'Not Found' });
                });
            })
    );
});