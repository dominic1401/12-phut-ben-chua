export const SESSION_KEY = "12-phut-ben-chua:session:v1";
export const SESSION_LIFETIME = 7 * 24 * 60 * 60 * 1000;
export const PRAYER_STAGE_DURATIONS = [60, 210, 135, 105, 135, 75];
export const PRAYER_DURATION = PRAYER_STAGE_DURATIONS.reduce((sum, time) => sum + time, 0);

export type LiturgicalReading = {
  ok: true;
  date: string;
  liturgicalDay: string;
  gospelReference: string;
  gospelText: string;
  meditationText?: string;
  sourceName: string;
  sourceUrl: string;
};

export type PrayerSession = {
  version: 1;
  savedAt: number;
  dateKey: string;
  elapsed: number;
  audioSource: string;
  musicEnabled: boolean;
  volume: number;
  reading: LiturgicalReading | null;
  scrollY: number;
};

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readingParams(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  return new URLSearchParams({ d, m, y }).toString();
}

export function readingSource(dateKey: string) {
  return `https://augustino.net/loi-chua-hom-nay?${readingParams(dateKey)}`;
}

function validDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00+07:00`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseReading(value: unknown, dateKey: string): LiturgicalReading | null {
  if (!value || typeof value !== "object" || !validDateKey(dateKey)) return null;
  const r = value as Record<string, unknown>;
  const [year, month, day] = dateKey.split("-");
  if (r.ok !== true || r.date !== `${day}/${month}/${year}`) return null;
  for (const field of ["liturgicalDay", "gospelReference", "gospelText", "sourceName"]) {
    if (typeof r[field] !== "string" || !(r[field] as string).trim()
      || (r[field] as string).length > 60_000) return null;
  }
  return {
    ok: true, date: r.date as string,
    liturgicalDay: r.liturgicalDay as string,
    gospelReference: r.gospelReference as string,
    gospelText: r.gospelText as string,
    ...(typeof r.meditationText === "string" && r.meditationText.trim()
      && r.meditationText.length <= 60_000
      ? { meditationText: r.meditationText.trim() } : {}),
    sourceName: r.sourceName as string,
    // Derive this URL instead of trusting a link stored in the browser.
    sourceUrl: readingSource(dateKey),
  };
}

export function parseSession(raw: string | null, now = Date.now()): PrayerSession | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !validDateKey(s.dateKey)
      || !Number.isFinite(s.savedAt) || s.savedAt > now + 60_000
      || now - s.savedAt > SESSION_LIFETIME
      || !Number.isFinite(s.elapsed) || s.elapsed < 0 || s.elapsed >= PRAYER_DURATION
      || typeof s.musicEnabled !== "boolean"
      || !Number.isFinite(s.volume) || s.volume < 0 || s.volume > 1
      || typeof s.audioSource !== "string"
      || !/^(\/audio\/taize-(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\.mp3|\/taize-prayer-12-min\.mp3)$/.test(s.audioSource)) return null;
    const reading = s.reading === null ? null : parseReading(s.reading, s.dateKey);
    if (s.reading !== null && !reading) return null;
    return {
      version: 1, savedAt: s.savedAt, dateKey: s.dateKey, elapsed: s.elapsed,
      audioSource: s.audioSource, musicEnabled: s.musicEnabled, volume: s.volume,
      reading, scrollY: Number.isFinite(s.scrollY) ? Math.max(0, Math.min(s.scrollY, 100_000)) : 0,
    };
  } catch {
    return null;
  }
}

export function readSession(storage: SessionStorage | null, now = Date.now()) {
  try { return parseSession(storage?.getItem(SESSION_KEY) ?? null, now); }
  catch { return null; }
}

export function writeSession(storage: SessionStorage | null, session: PrayerSession) {
  try { storage?.setItem(SESSION_KEY, JSON.stringify(session)); }
  catch { /* Prayer remains usable when storage is disabled or full. */ }
}

export function clearSession(storage: SessionStorage | null) {
  try { storage?.removeItem(SESSION_KEY); }
  catch { /* Storage access is optional. */ }
}
