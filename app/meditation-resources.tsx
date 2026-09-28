"use client";

import { useRef, useState } from "react";

function ReadingDisclosure({ title, subtitle, text, onOpen }: {
  title: string; subtitle: string; text: string; onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const summaryRef = useRef<HTMLElement>(null);

  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => {
      summaryRef.current?.focus({ preventScroll: true });
      summaryRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  };

  return (
    <details className="meditation-details" open={open} onToggle={event => {
      const expanded = event.currentTarget.open;
      setOpen(expanded);
      if (expanded) onOpen();
    }}>
      <summary ref={summaryRef}>
        <span>{title}<small>{subtitle}</small></span>
        <span className="meditation-chevron" aria-hidden="true" />
      </summary>
      <div className="meditation-text">
        {text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <button className="reading-close" type="button" onClick={close} aria-label={`Thu gọn: ${title}`}>Thu gọn bản văn</button>
      </div>
    </details>
  );
}

export function MeditationResources({ gospelText, gospelReference, meditationText, fallback, onOpen }: {
  gospelText: string; gospelReference: string; meditationText?: string;
  fallback: boolean; onOpen: () => void;
}) {
  return (
    <section className="meditation-resources" aria-labelledby="meditation-resources-title">
      <h3 id="meditation-resources-title">Đọc thêm để suy niệm</h3>
      <p className="resources-hint">Bạn có thể mở bản văn khi cần. Giờ cầu nguyện sẽ tạm dừng để bạn đọc.</p>
      <div className="meditation-readings">
        <ReadingDisclosure
          title={fallback ? "Xem lại câu Lời Chúa" : "Xem lại Tin Mừng"}
          subtitle={`${gospelReference}${fallback ? " · Bản văn thay thế" : ""}`}
          text={gospelText} onOpen={onOpen}
        />
        {meditationText && <ReadingDisclosure title="Đọc bài suy niệm" subtitle="Gợi ý suy niệm · Tùy chọn" text={meditationText} onOpen={onOpen} />}
      </div>
    </section>
  );
}
