"use client";

import type { Preferences } from "@/lib/prayer-preferences";

export function PaceSelector({ value, onChange }: {
  value: Preferences["paceMode"]; onChange: (value: Preferences["paceMode"]) => void;
}) {
  return (
    <fieldset className="preference-group pace-selector">
      <legend>Cách chuyển bước</legend>
      <div className="choice-row">
        <button type="button" aria-pressed={value === "auto"} onClick={() => onChange("auto")}>Tự động · 12 phút</button>
        <button type="button" aria-pressed={value === "manual"} onClick={() => onChange("manual")}>Tôi tự chuyển</button>
      </div>
      <p>{value === "auto" ? "Tự động chuyển qua sáu bước trong 12 phút." : "Chọn Bước tiếp khi bạn đã sẵn sàng. Thời gian chỉ để tham khảo."}</p>
    </fieldset>
  );
}

export function DisplayOptions({ theme, fontSize, onTheme, onFontSize }: {
  theme: Preferences["theme"]; fontSize: Preferences["fontSize"];
  onTheme: (value: Preferences["theme"]) => void;
  onFontSize: (value: Preferences["fontSize"]) => void;
}) {
  return (
    <>
      <fieldset className="preference-group">
        <legend>Giao diện</legend>
        <div className="choice-row">
          {([["system", "Theo máy"], ["light", "Sáng"], ["dark", "Tối"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={theme === value} onClick={() => onTheme(value)}>{label}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="preference-group">
        <legend>Cỡ chữ bản văn</legend>
        <div className="choice-row">
          {([["normal", "Vừa"], ["large", "Lớn"], ["largest", "Rất lớn"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={fontSize === value} onClick={() => onFontSize(value)}>{label}</button>
          ))}
        </div>
      </fieldset>
    </>
  );
}
