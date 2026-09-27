"use client";

import { useEffect, useRef, useState } from "react";
import { OFFLINE_CACHE, prepareOffline } from "@/lib/prayer-offline";
import { readCachedReading } from "@/lib/prayer-session";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function OfflineOptions({ dateKey, readingReady, audioSource }: {
  dateKey: string; readingReady: boolean; audioSource: string;
}) {
  const installRef = useRef<InstallEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      installRef.current = event as InstallEvent;
      setCanInstall(true);
    };
    const onInstalled = () => { setInstalled(true); setCanInstall(false); installRef.current = null; };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setMessage("");
    if ("caches" in window && readingReady) {
      void caches.open(OFFLINE_CACHE).then(async cache => {
        const [page, audio] = await Promise.all([cache.match("/"), cache.match(audioSource)]);
        if (active && page && audio && readCachedReading(localStorage, dateKey)) setMessage(`Đã có trang và nhạc trên thiết bị. Bài đọc ngày ${dateKey.split("-").reverse().join("/")} đã sẵn sàng.`);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [audioSource, dateKey, readingReady]);

  const install = async () => {
    const prompt = installRef.current;
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch { /* Native prompt can be dismissed or unavailable. */ }
    installRef.current = null;
    setCanInstall(false);
  };

  const save = async () => {
    setSaving(true);
    setMessage("Đang lưu trang và nhạc. Vui lòng giữ trang mở…");
    try {
      if (!readCachedReading(localStorage, dateKey)) throw new Error("Chưa lưu được bài đọc trên thiết bị này. Hãy cho phép lưu dữ liệu trang rồi thử lại.");
      await prepareOffline(audioSource);
      setMessage(`Đã lưu để cầu nguyện ngoại tuyến ngày ${dateKey.split("-").reverse().join("/")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa lưu được. Vui lòng thử lại khi có mạng.");
    } finally { setSaving(false); }
  };

  return (
    <div className="offline-options">
      <details>
        <summary>Dùng khi mất mạng</summary>
        <p>Lưu trang, bài đọc và nhạc của phiên này. Nhạc khoảng 12 MB. Ngày mới cần mở trang khi có mạng để lấy bài đọc mới.</p>
        <button className="settings-action" type="button" disabled={saving || !readingReady} onClick={save}>
          {saving ? "Đang lưu…" : "Lưu để dùng khi mất mạng"}
        </button>
        {!readingReady && <p>Cần tải được Tin Mừng trước khi lưu.</p>}
        <p role="status">{message}</p>
      </details>
      {!installed && <details>
        <summary>Thêm vào màn hình chính</summary>
        {canInstall ? <button className="settings-action" type="button" onClick={install}>Thêm 12 Phút Bên Chúa</button>
          : <p>{isIOS ? "Trong Safari, chạm Chia sẻ → Thêm vào Màn hình chính." : "Mở menu của trình duyệt và chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính nếu có."}</p>}
      </details>}
    </div>
  );
}
