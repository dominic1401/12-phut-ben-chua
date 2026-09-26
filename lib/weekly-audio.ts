export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const FALLBACK_AUDIO = "/taize-prayer-12-min.mp3";
export const AUDIO_DAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

export function getVietnamDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIME_ZONE,
    weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"));
  return {
    day: part("day"), month: part("month"), year: part("year"), weekdayIndex,
    label: new Intl.DateTimeFormat("vi-VN", {
      timeZone: VIETNAM_TIME_ZONE, weekday: "long", day: "2-digit", month: "2-digit",
    }).format(now).replace("Chủ Nhật", "Chúa Nhật"),
  };
}

/** Preview overrides select only bundled files and are ignored in production. */
export function selectDailyAudio(now: Date, search = "", allowPreview = false) {
  const override = allowPreview ? new URLSearchParams(search).get("audioDay") : null;
  const day = AUDIO_DAYS.find((item) => item === override)
    ?? AUDIO_DAYS[getVietnamDate(now).weekdayIndex];
  return `/audio/taize-${day}.mp3`;
}
