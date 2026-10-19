/* mj-chat Service Worker
 * 策略：联网时永远优先取最新（绕过浏览器 HTTP 缓存），断网时用缓存兜底。
 * 改了页面后不用手动改版本号也会更新；想强制清缓存可改下面的 CACHE。 */
const CACHE = "mj-chat-v4";
const SHELL = ["./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u =>
        fetch(new Request(u, { cache: "reload" }))
          .then(r => (r && r.ok) ? c.put(u, r) : null)
          .catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      // no-cache：每次都向服务器校验，保证联网时拿到最新文件
      const res = await fetch(new Request(req, { cache: "no-cache" }));
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") {
        return (await caches.match("./index.html")) ||
               (await caches.match("./")) ||
               new Response("离线中，且还没有缓存。请联网打开一次。",
                 { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      return Response.error();
    }
  })());
});
