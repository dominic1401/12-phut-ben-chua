/* Keep this cache name aligned with lib/prayer-offline.ts. */
const OFFLINE_CACHE = "12phut-offline-v1";
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

async function audioResponse(request, cached) {
  const range = request.headers.get("range");
  if (!range) return cached;
  const bytes = await cached.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const invalid = () => new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes.byteLength}` } });
  if (!match || (!match[1] && !match[2])) return invalid();
  const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
  if (start > end || start >= bytes.byteLength) return invalid();
  return new Response(bytes.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${bytes.byteLength}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.status >= 500) throw new Error("Server unavailable");
        return response;
      } catch {
        const cache = await caches.open(OFFLINE_CACHE);
        return await cache.match("/") || Response.error();
      }
    })());
    return;
  }
  const isAudio = /^\/audio\/taize-[a-z]+\.mp3$/.test(url.pathname) || url.pathname === "/taize-prayer-12-min.mp3";
  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname === "/favicon.svg"
    || url.pathname === "/manifest.webmanifest" || url.pathname === "/api/app-icon";
  if (!isAudio && !isStatic) return;
  event.respondWith((async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    const cached = await cache.match(url.pathname + url.search);
    if (cached) return isAudio ? audioResponse(request, cached) : cached;
    return fetch(request);
  })());
});
