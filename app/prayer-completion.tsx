"use client";

import { useEffect, useState } from "react";

export function PrayerCompletion({ dateKey, onQuiet, onRestart }: {
  dateKey: string; onQuiet: () => void; onRestart: () => void;
}) {
  const [intention, setIntention] = useState("");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("");
  const key = `12-phut-ben-chua:intention:${dateKey}`;
  useEffect(() => {
    try { setIntention((localStorage.getItem(key) ?? "").slice(0, 600)); } catch { /* Optional storage. */ }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(() => {
      try {
        if (intention.trim()) localStorage.setItem(key, intention);
        else localStorage.removeItem(key);
        setSaveState(intention.trim() ? "Đã lưu trên thiết bị này." : "Chỉ lưu trên thiết bị này.");
      } catch { setSaveState("Thiết bị chưa cho phép lưu. Bạn vẫn có thể viết tại đây."); }
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [intention, key, ready]);
  return (
    <div className="complete-panel">
      <div className="complete-symbol" aria-hidden="true"><span /></div>
      <p className="kicker">Bình an của Chúa ở cùng bạn</p>
      <h1>Giờ cầu nguyện đã khép lại.<br />Lời Chúa vẫn tiếp tục.</h1>
      <p className="intro-copy">Hãy mang Lời Chúa vào một việc nhỏ, cụ thể trong ngày sống.</p>
      <div className="intention-card">
        <label htmlFor="daily-intention">Một điều tôi muốn sống hôm nay</label>
        <textarea id="daily-intention" rows={3} maxLength={600} value={intention}
          placeholder="Hôm nay, tôi sẽ…"
          onChange={event => { setIntention(event.target.value); setSaveState("Đang lưu…"); }} />
        <p role="status">{saveState || "Tùy chọn · Chỉ lưu trên thiết bị này."}</p>
      </div>
      <button className="primary-action" type="button" onClick={onQuiet}>Ở lại thinh lặng</button>
      <button className="new-session-action" type="button" onClick={onRestart}>Trở về trang đầu</button>
      <details className="after-prayer">
        <summary>Đọc thêm sau giờ cầu nguyện</summary>
        <p>Đào sâu đức tin qua các bài viết giáo lý tại <a href="https://substack.com/@hoclaideyeuhon" target="_blank" rel="noreferrer">Học lại để yêu hơn ↗</a>.</p>
      </details>
    </div>
  );
}
