import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { AUDIO_DAYS, FALLBACK_AUDIO, getVietnamDate, selectDailyAudio } from "../lib/weekly-audio.ts";

test("all seven Vietnamese weekdays select distinct bundled audio files", () => {
  const selected = new Set();
  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.UTC(2026, 8, 20+i, 5));
    const source = selectDailyAudio(date);
    assert.equal(source, `/audio/taize-${AUDIO_DAYS[i]}.mp3`);
    assert.ok(existsSync(new URL(`../public${source}`, import.meta.url)));
    selected.add(source);
  }
  assert.equal(selected.size, 7);
  assert.ok(existsSync(new URL(`../public${FALLBACK_AUDIO}`, import.meta.url)));
});

test("Vietnam midnight and month/year rollover do not depend on the device timezone", () => {
  assert.equal(selectDailyAudio(new Date("2026-09-20T16:59:59Z")), "/audio/taize-sunday.mp3");
  assert.equal(selectDailyAudio(new Date("2026-09-20T17:00:00Z")), "/audio/taize-monday.mp3");
  const date = getVietnamDate(new Date("2026-12-31T17:00:00Z"));
  assert.deepEqual([date.day,date.month,date.year,date.weekdayIndex], ["01","01","2027",5]);
});

test("preview can inspect each day but production and unrecognized parameters use today's audio", () => {
  const date = new Date("2026-09-23T12:00:00Z");
  for (const day of AUDIO_DAYS) {
    assert.equal(selectDailyAudio(date, `?audioDay=${day}`, true), `/audio/taize-${day}.mp3`);
  }
  assert.equal(selectDailyAudio(date, "?audioDay=monday", false), "/audio/taize-wednesday.mp3");
  for (const query of ["?audioDay=../secret", "?audioDay=https://example.com/a.mp3", "?audioDay=noday"]) {
    assert.equal(selectDailyAudio(date, query, true), "/audio/taize-wednesday.mp3");
  }
});
