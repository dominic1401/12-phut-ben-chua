"use client";

import { BrandMark } from "./brand-mark";

export function PrayerCompletion({ onQuiet, onRestart }: {
  onQuiet: () => void; onRestart: () => void;
}) {
  return (
    <div className="complete-panel">
      <div className="completion-brand"><BrandMark large /></div>
      <p className="kicker">Tạ ơn Chúa</p>
      <h1>Xin Chúa ban bình an.</h1>
      <p className="intro-copy">Giờ cầu nguyện đã kết thúc. Hãy giữ Lời Chúa trong lòng và đem ra thực hành.</p>
      <button className="primary-action" type="button" onClick={onQuiet}>Tiếp tục thinh lặng</button>
      <button className="new-session-action" type="button" onClick={onRestart}>Về trang đầu</button>
      <details className="after-prayer">
        <summary>Đọc thêm sau giờ cầu nguyện</summary>
        <p>Tìm hiểu thêm về đức tin Công giáo tại <a href="https://substack.com/@hoclaideyeuhon" target="_blank" rel="noreferrer">Học lại để yêu hơn</a>.</p>
      </details>
    </div>
  );
}
