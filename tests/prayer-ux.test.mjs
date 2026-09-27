import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { prayerPosition, getStageIndex, PRAYER_STAGE_DURATIONS, cacheReading, readCachedReading, parseSession } from "../lib/prayer-session.ts";
import { parsePreferences, DEFAULT_PREFERENCES } from "../lib/prayer-preferences.ts";
import { prepareOffline, OFFLINE_CACHE } from "../lib/prayer-offline.ts";

const now = Date.parse("2026-09-27T12:00:00+07:00");
const reading = {
  ok: true, date: "27/09/2026", liturgicalDay: "Ngày kiểm tra", gospelReference: "Mt 1,1",
  gospelText: "Bản văn kiểm tra", meditationText: "Suy niệm kiểm tra", sourceName: "Augustinô", sourceUrl: "https://augustino.net/loi-chua-hom-nay?d=27&m=09&y=2026",
};
function storage() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
}

test("manual pacing holds every stage, even after a long background interval; automatic mode finishes", () => {
  let start = 0;
  PRAYER_STAGE_DURATIONS.forEach((duration, stage) => {
    const held = prayerPosition(start, 3600, "manual");
    assert.equal(getStageIndex(held), stage);
    assert.ok(held < start + duration);
    assert.equal(prayerPosition(held, 60, "manual"), held, "resuming a held stage does not advance it");
    start += duration;
  });
  assert.equal(prayerPosition(0, 3600, "auto"), 720);
  assert.equal(prayerPosition(270, 15, "manual"), 285);
  assert.equal(getStageIndex(prayerPosition(59.999, 1, "auto")), 1, "switching back to auto advances normally");
});

test("a manual session keeps its pace and held stage when restored", () => {
  const restored = parseSession(JSON.stringify({
    version: 1, savedAt: now, dateKey: "2026-09-27", elapsed: 269.999, paceMode: "manual",
    audioSource: "/audio/taize-sunday.mp3", musicEnabled: true, volume: 0.3, reading, scrollY: 150,
  }), now);
  assert.equal(restored.paceMode, "manual");
  assert.equal(getStageIndex(restored.elapsed), 1);
  assert.equal(prayerPosition(restored.elapsed, 5000, restored.paceMode), 269.999);
});

test("display and music preferences validate independently, with safe defaults", () => {
  for (const raw of [null, "null", "broken", "{}", JSON.stringify({ volume: -1, theme: "pink", musicEnabled: "yes" })]) {
    assert.deepEqual(parsePreferences(raw), DEFAULT_PREFERENCES);
  }
  const wanted = { theme: "dark", fontSize: "largest", paceMode: "manual", volume: 0, musicEnabled: false };
  assert.deepEqual(parsePreferences(JSON.stringify(wanted)), wanted);
});

test("cached readings match the exact date and do not replace today's Gospel with another day", () => {
  const local = storage();
  cacheReading(local, "2026-09-27", reading);
  assert.deepEqual(readCachedReading(local, "2026-09-27"), reading);
  assert.equal(readCachedReading(local, "2026-09-28"), null);
  cacheReading(local, "2026-09-28", reading);
  assert.equal(readCachedReading(local, "2026-09-28"), null);
  for (let day = 20; day <= 28; day++) cacheReading(local, `2026-09-${day}`, { ...reading, date: `${day}/09/2026` });
  assert.equal(readCachedReading(local, "2026-09-20"), null, "keep only seven most recently stored readings");
  assert.ok(readCachedReading(local, "2026-09-28"));
  const denied = { getItem() { throw Error("denied"); }, setItem() { throw Error("quota"); } };
  assert.equal(readCachedReading(denied, "2026-09-27"), null);
  assert.doesNotThrow(() => cacheReading(denied, "2026-09-27", reading));
});

function worker(fetchImpl = () => Promise.reject(new Error("offline"))) {
  const events = {};
  const entries = new Map();
  const context = vm.createContext({ URL, Request, Response, TextEncoder, TextDecoder,
    self: { location: { origin: "https://prayer.test" }, clients: { claim() {} }, addEventListener: (name, fn) => events[name] = fn },
    caches: { open: async () => ({ match: async key => entries.get(key)?.clone() }) }, fetch: fetchImpl,
  });
  vm.runInContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), context);
  return { events, entries, context };
}

test("offline audio supports mobile byte ranges, suffixes, invalid ranges and full playback", async () => {
  const { context } = worker();
  const audio = () => new Response(new Uint8Array([0, 1, 2, 3, 4, 5]), { headers: { "Content-Type": "audio/mpeg" } });
  for (const [range, expected, contentRange] of [["bytes=1-3", [1, 2, 3], "bytes 1-3/6"], ["bytes=4-", [4, 5], "bytes 4-5/6"], ["bytes=-2", [4, 5], "bytes 4-5/6"]]) {
    const response = await context.audioResponse(new Request("https://prayer.test/audio/taize-sunday.mp3", { headers: { range } }), audio());
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), contentRange);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], expected);
  }
  const invalid = await context.audioResponse(new Request("https://prayer.test/audio/taize-sunday.mp3", { headers: { range: "bytes=99-" } }), audio());
  assert.equal(invalid.status, 416);
  const full = await context.audioResponse(new Request("https://prayer.test/audio/taize-sunday.mp3"), audio());
  assert.equal(full.status, 200);
});

test("offline navigation uses the saved page while API readings always retain date-specific client handling", async () => {
  const { events, entries } = worker();
  entries.set("/", new Response("saved prayer app"));
  let response;
  events.fetch({ request: { method: "GET", url: "https://prayer.test/", mode: "navigate" }, respondWith: value => response = value });
  assert.equal(await (await response).text(), "saved prayer app");
  let intercepted = false;
  events.fetch({ request: new Request("https://prayer.test/api/reading?d=28&m=09&y=2026"), respondWith: () => intercepted = true });
  assert.equal(intercepted, false, "never serve an arbitrary cached API date");
});

test("offline preparation commits the page only after all assets and the complete audio succeed", async () => {
  const globals = ["navigator", "window", "caches", "fetch"];
  const before = Object.fromEntries(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const entries = new Map();
  let failAsset = false;
  const page = '<html><link href="/_next/static/style.css"/><script src="/_next/static/app.js"></script></html>';
  const replacements = {
    navigator: { serviceWorker: { register: async () => {}, ready: Promise.resolve({}) } },
    window: { isSecureContext: true, caches: {}, setTimeout, clearTimeout },
    caches: { open: async name => {
      assert.equal(name, OFFLINE_CACHE);
      return { match: async key => entries.get(key)?.clone(), put: async (key, response) => entries.set(key, response) };
    } },
    fetch: async url => {
      if (failAsset && url.endsWith(".js")) throw new Error("connection interrupted");
      return new Response(url === "/" ? page : "downloaded content");
    },
  };
  try {
    for (const key of globals) Object.defineProperty(globalThis, key, { value: replacements[key], configurable: true, writable: true });
    failAsset = true;
    await assert.rejects(prepareOffline("/audio/taize-sunday.mp3"), /interrupted/);
    assert.equal(entries.has("/"), false, "a partial download must not replace the saved page");
    failAsset = false;
    await prepareOffline("/audio/taize-sunday.mp3");
    assert.equal(await entries.get("/").clone().text(), page);
    for (const asset of ["/_next/static/app.js", "/_next/static/style.css", "/audio/taize-sunday.mp3", "/manifest.webmanifest"]) assert.ok(entries.has(asset));
    await assert.rejects(prepareOffline("https://other.test/audio.mp3"), /Nhạc/);
  } finally {
    for (const key of globals) {
      if (before[key]) Object.defineProperty(globalThis, key, before[key]);
      else delete globalThis[key];
    }
  }
});
