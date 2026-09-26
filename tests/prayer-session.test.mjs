import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSession, parseReading, readSession, writeSession, clearSession,
  SESSION_KEY, SESSION_LIFETIME,
} from "../lib/prayer-session.ts";

const now = Date.parse("2026-09-27T01:00:00+07:00");
const reading = {
  ok: true, date: "26/09/2026", liturgicalDay: "Thứ Bảy Tuần 25 Thường Niên",
  gospelReference: "Lc 9,43b-45", gospelText: "Hãy lắng tai nghe cho kỹ những lời sau đây.",
  sourceName: "Augustinô", sourceUrl: "https://augustino.net/loi-chua-hom-nay?d=26&m=09&y=2026",
};
const session = {
  version: 1, savedAt: now - 60_000, dateKey: "2026-09-26", elapsed: 143.25,
  audioSource: "/audio/taize-saturday.mp3", musicEnabled: true, volume: 0.4,
  reading, scrollY: 412,
};

test("a saved session retains its original reading, audio and position across Vietnam midnight", () => {
  const restored = parseSession(JSON.stringify(session), now);
  assert.deepEqual(restored, session);
  assert.equal(restored.elapsed, 143.25, "time away must not advance the prayer");
  assert.equal("playing" in restored, false, "restoration cannot request autoplay");
});

test("completed, stale, malformed and unsupported sessions are discarded", () => {
  for (const patch of [
    { version: 2 }, { elapsed: 720 }, { elapsed: -1 }, { elapsed: "60" },
    { savedAt: now - SESSION_LIFETIME - 1 }, { savedAt: now + 120_000 },
    { dateKey: "2026-02-30" }, { dateKey: "invalid" },
    { audioSource: "https://example.com/track.mp3" }, { audioSource: "/audio/../../file" },
    { volume: 5 }, { musicEnabled: "true" },
    { reading: { ...reading, date: "27/09/2026" } },
  ]) assert.equal(parseSession(JSON.stringify({ ...session, ...patch }), now), null, JSON.stringify(patch));
  for (const raw of [null, "{broken", "null", "[]", "x".repeat(100_001)]) {
    assert.equal(parseSession(raw, now), null);
  }
});

test("fallback sessions restore without a fabricated reading; saved links are constrained to the reading source", () => {
  assert.equal(parseSession(JSON.stringify({ ...session, reading: null }), now).reading, null);
  const result = parseReading({ ...reading, sourceUrl: "javascript:alert(1)" }, session.dateKey);
  assert.equal(result.sourceUrl, reading.sourceUrl);
  assert.equal(parseReading({ ...reading, gospelText: "" }, session.dateKey), null);
  assert.equal(parseReading({ ok: false, error: "unavailable" }, session.dateKey), null);
});

test("saving, reading and clearing work, while denied storage never breaks prayer", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  writeSession(storage, session);
  assert.ok(values.has(SESSION_KEY));
  assert.deepEqual(readSession(storage, now), session);
  clearSession(storage);
  assert.equal(readSession(storage, now), null);
  const blocked = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("denied"); },
  };
  assert.equal(readSession(blocked), null);
  assert.doesNotThrow(() => writeSession(blocked, session));
  assert.doesNotThrow(() => clearSession(blocked));
});

test("optional meditation survives resume; older readings and malformed optional content stay usable", () => {
  const withMeditation = { ...session, reading: { ...reading, meditationText: "Đoạn một.\n\nĐoạn hai." } };
  assert.deepEqual(parseSession(JSON.stringify(withMeditation), now), withMeditation);
  assert.deepEqual(parseReading(reading, session.dateKey), reading);
  for (const meditationText of [null, 42, "", " ", "x".repeat(60_001)]) {
    assert.deepEqual(parseReading({ ...reading, meditationText }, session.dateKey), reading);
  }
});
