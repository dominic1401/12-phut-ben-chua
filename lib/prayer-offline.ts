import { BRAND_OFFLINE_ASSETS } from "./brand.mjs";

export const OFFLINE_CACHE = "12phut-offline-v1";

export async function prepareOffline(audioSource: string) {
  if (!("serviceWorker" in navigator) || !("caches" in window) || !window.isSecureContext) {
    throw new Error("Trình duyệt này chưa hỗ trợ lưu để dùng khi không có mạng.");
  }
  if (!/^\/audio\/taize-(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\.mp3$/.test(audioSource)
    && audioSource !== "/taize-prayer-12-min.mp3") throw new Error("Nhạc chưa sẵn sàng.");
  await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  const cache = await caches.open(OFFLINE_CACHE);
  const download = async (url: string) => {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (response.status !== 200) throw new Error("Chưa tải đủ nội dung. Hãy kiểm tra kết nối và thử lại.");
    return response;
  };
  const page = await download("/");
  const html = await page.clone().text();
  const assets = new Set(Array.from(html.matchAll(/(?:src|href)="([^"<>]+)"/g), match => match[1])
    .filter(url => url.startsWith("/_next/static/")));
  if (!assets.size) throw new Error("Chưa lưu được trang để dùng khi không có mạng. Vui lòng thử lại.");
  assets.add("/manifest.webmanifest");
  for (const url of BRAND_OFFLINE_ASSETS) assets.add(url);
  assets.add(audioSource);
  await Promise.all(Array.from(assets, async url => {
    if (url !== "/manifest.webmanifest" && await cache.match(url)) return;
    await cache.put(url, await download(url));
  }));
  // Commit the page only once all of its assets are available.
  await cache.put("/", page);
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Trang đã tải xong. Hãy mở lại trang để hoàn tất việc lưu nội dung.")), 10_000);
    navigator.serviceWorker.ready.then(() => { window.clearTimeout(timeout); resolve(); }, error => { window.clearTimeout(timeout); reject(error); });
  });
}
