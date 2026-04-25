// 404 JS チャンクエラー対策のためのサービスワーカー
const CACHE_NAME = 'splitrip-v1';

self.addEventListener('fetch', (event) => {
  // JSファイルの404エラー対策
  if (event.request.url.includes('.js') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.log('JS fetch failed, falling back:', event.request.url);
        // 404の場合はページ全体をリロード
        if (event.request.url.includes('_next/static/chunks/')) {
          return new Response('window.location.reload();', {
            headers: { 'Content-Type': 'application/javascript' },
          });
        }
        throw error;
      })
    );
  }
});