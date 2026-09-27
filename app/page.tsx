"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FALLBACK_AUDIO, getVietnamDate, selectDailyAudio } from "@/lib/weekly-audio";
import {
  clearSession, parseReading, readSession, readingParams, writeSession,
  cacheReading, readCachedReading, prayerPosition, getStageIndex,
  PRAYER_STAGE_DURATIONS as stageTimes, PRAYER_DURATION as totalDuration,
  type LiturgicalReading, type PrayerSession, type PaceMode,
} from "@/lib/prayer-session";

import { DEFAULT_PREFERENCES, PREFERENCES_KEY, parsePreferences, type Preferences } from "@/lib/prayer-preferences";
import { PaceSelector, DisplayOptions } from "./prayer-options";
import { PrayerCompletion } from "./prayer-completion";
import { OfflineOptions } from "./prayer-offline";
import { MusicIcon } from "./music-icon";
import { BrandMark } from "./brand-mark";

type PrayerStatus = "idle" | "playing" | "paused" | "complete" | "quiet";

type PrayerStage = {
  name: string;
  latin: string;
  duration: number;
  eyebrow: string;
  title: string;
  body: string;
  verse?: string;
  reference?: string;
  prompt?: string;
  reading?: string;
};

type DailyPrayer = {
  theme: string;
  verse: string;
  reference: string;
  shortReference: string;
  meditationTitle: string;
  meditation: string;
  prayerTitle: string;
  prayer: string;
  echo: string;
  actionTitle: string;
  action: string;
};

const dailyPrayers: DailyPrayer[] = [
  {
    theme: "Vững tin giữa thử thách",
    verse: "“Cứ yên tâm, chính Thầy đây, đừng sợ!”",
    reference: "Tin Mừng theo thánh Mát-thêu 14,27",
    shortReference: "Mt 14,27",
    meditationTitle: "Tôi có tín thác vào Chúa không?",
    meditation:
      "Điều gì đang làm tôi lo sợ? Giữa những khó khăn ấy, tôi có nhớ cầu xin Chúa và tin rằng Người luôn ở cùng tôi không?",
    prayerTitle: "Xin giúp con vững tin",
    prayer:
      "Lạy Chúa Giêsu, Chúa biết những điều đang làm con lo lắng. Xin nâng đỡ đức tin yếu kém của con, để con biết cậy dựa vào Chúa và can đảm chu toàn bổn phận.",
    echo: "“Chính Thầy đây. Đừng sợ.”",
    actionTitle: "Cầu nguyện khi lo lắng",
    action:
      "Hôm nay, mỗi khi lo lắng, tôi sẽ dừng lại giây lát và thưa với Chúa: “Lạy Chúa Giêsu, con tín thác vào Chúa.”",
  },
  {
    theme: "Ở lại trong tình yêu Chúa",
    verse: "“Anh em hãy ở lại trong tình thương của Thầy.”",
    reference: "Tin Mừng theo thánh Gio-an 15,9",
    shortReference: "Ga 15,9",
    meditationTitle: "Tôi đón nhận tình yêu Chúa thế nào?",
    meditation:
      "Tôi có nhận ra những ơn Chúa ban trong cuộc sống hằng ngày không? Tôi đã đáp lại tình yêu của Người bằng việc yêu thương những người chung quanh thế nào?",
    prayerTitle: "Xin giữ con trong tình yêu Chúa",
    prayer:
      "Lạy Chúa Giêsu, con cảm tạ Chúa đã yêu thương con. Xin giúp con biết đón nhận tình yêu ấy, trung thành giữ lời Chúa và hết lòng yêu thương anh chị em.",
    echo: "“Hãy ở lại trong tình thương của Thầy.”",
    actionTitle: "Lắng nghe với lòng yêu thương",
    action:
      "Hôm nay, tôi sẽ dành thời gian lắng nghe một người trong gia đình hoặc cộng đoàn, kiên nhẫn để họ nói hết và không vội xét đoán.",
  },
  {
    theme: "Phó thác những lo toan",
    verse:
      "“Tất cả những ai đang vất vả mang gánh nặng nề, hãy đến cùng tôi, tôi sẽ cho nghỉ ngơi bồi dưỡng.”",
    reference: "Tin Mừng theo thánh Mát-thêu 11,28",
    shortReference: "Mt 11,28",
    meditationTitle: "Tôi muốn dâng lên Chúa điều gì?",
    meditation:
      "Điều gì đang làm tôi mệt mỏi, nặng lòng? Tôi có sẵn lòng dâng những lo toan ấy cho Chúa và khiêm tốn đón nhận sự giúp đỡ của người khác không?",
    prayerTitle: "Xin Chúa nâng đỡ con",
    prayer:
      "Lạy Chúa Giêsu, con xin dâng lên Chúa những lo toan và vất vả của con. Xin ban sức mạnh để con chu toàn bổn phận, và cho con biết nghỉ ngơi trong tình yêu Chúa.",
    echo: "“Hãy đến cùng Thầy.”",
    actionTitle: "Dâng những lo toan cho Chúa",
    action:
      "Hôm nay, tôi sẽ dành ít phút dâng lên Chúa điều đang làm mình nặng lòng, rồi đọc một kinh Lạy Cha với lòng tín thác.",
  },
  {
    theme: "Bình an trong Chúa",
    verse:
      "“Thầy để lại bình an cho anh em, Thầy ban cho anh em bình an của Thầy.”",
    reference: "Tin Mừng theo thánh Gio-an 14,27",
    shortReference: "Ga 14,27",
    meditationTitle: "Tôi có biết gìn giữ bình an không?",
    meditation:
      "Khi gặp điều trái ý, tôi có biết bình tĩnh và cậy trông vào Chúa không? Trong gia đình hay nơi làm việc, tôi cần làm gì để góp phần gìn giữ sự hòa thuận?",
    prayerTitle: "Xin ban bình an cho con",
    prayer:
      "Lạy Chúa Giêsu, xin ban bình an cho tâm hồn con. Xin giúp con biết kiên nhẫn, lắng nghe và tha thứ, để con góp phần đem lại sự hòa thuận nơi gia đình và cộng đoàn.",
    echo: "“Thầy ban cho anh em bình an của Thầy.”",
    actionTitle: "Kiên nhẫn lắng nghe",
    action:
      "Hôm nay, trước khi trao đổi một chuyện khó nói, tôi sẽ cầu xin Chúa giúp mình bình tĩnh và lắng nghe hết lời người kia.",
  },
  {
    theme: "Làm chứng cho Chúa",
    verse: "“Chính anh em là ánh sáng cho trần gian.”",
    reference: "Tin Mừng theo thánh Mát-thêu 5,14",
    shortReference: "Mt 5,14",
    meditationTitle: "Tôi làm chứng cho Chúa bằng cách nào?",
    meditation:
      "Qua lời nói và cách cư xử, tôi có giúp người khác nhận ra lòng nhân hậu của Chúa không? Hôm nay, tôi có thể dùng khả năng Chúa ban để giúp đỡ ai?",
    prayerTitle: "Xin giúp con làm chứng cho Chúa",
    prayer:
      "Lạy Chúa Giêsu, xin giúp con sống ngay thẳng và bác ái. Xin cho những việc con làm đều vì lòng yêu mến Chúa và anh chị em, chứ không để tìm lời khen cho mình.",
    echo: "“Anh em là ánh sáng.”",
    actionTitle: "Làm một việc bác ái",
    action:
      "Hôm nay, tôi sẽ hỏi thăm, khích lệ hoặc giúp đỡ một người đang gặp khó khăn bằng một việc cụ thể.",
  },
  {
    theme: "Tín thác vào Chúa Cha",
    verse:
      "“Hỡi đoàn chiên nhỏ bé, đừng sợ, vì Cha anh em đã vui lòng ban Nước của Người cho anh em.”",
    reference: "Tin Mừng theo thánh Lu-ca 12,32",
    shortReference: "Lc 12,32",
    meditationTitle: "Tôi có tin vào sự quan phòng của Chúa không?",
    meditation:
      "Tôi có tin Chúa Cha biết rõ những nhu cầu của mình không? Khi chưa biết phải làm gì, tôi có cầu nguyện, tìm sự hướng dẫn và phó thác cho Người không?",
    prayerTitle: "Xin dạy con biết cậy trông",
    prayer:
      "Lạy Cha, con cảm tạ Cha luôn yêu thương và chăm sóc con. Xin dạy con biết cậy trông vào Cha, hết lòng làm điều phải làm và phó thác những điều ngoài khả năng của con.",
    echo: "“Đừng sợ, hỡi đoàn chiên nhỏ bé.”",
    actionTitle: "Chu toàn bổn phận với lòng tín thác",
    action:
      "Hôm nay, tôi sẽ bắt đầu một việc tốt mình còn chần chừ, cầu xin Chúa giúp sức và phó thác kết quả cho Người.",
  },
  {
    theme: "Noi gương Chúa phục vụ",
    verse:
      "“Nếu Thầy là Chúa, là Thầy, mà còn rửa chân cho anh em, thì anh em cũng phải rửa chân cho nhau.”",
    reference: "Tin Mừng theo thánh Gio-an 13,14",
    shortReference: "Ga 13,14",
    meditationTitle: "Tôi có sẵn lòng phục vụ không?",
    meditation:
      "Tôi có ngại giúp đỡ những người mình không hợp ý không? Tôi có sẵn lòng làm những việc âm thầm, không được ai biết đến hay cảm ơn không?",
    prayerTitle: "Xin dạy con khiêm nhường phục vụ",
    prayer:
      "Lạy Chúa Giêsu hiền lành và khiêm nhường, xin dạy con noi gương Chúa phục vụ anh chị em. Xin giúp con bớt nghĩ đến mình, biết quan tâm và sẵn lòng giúp đỡ người khác.",
    echo: "“Anh em hãy rửa chân cho nhau.”",
    actionTitle: "Âm thầm phục vụ",
    action:
      "Hôm nay, tôi sẽ tự nguyện làm một việc trong gia đình hoặc cộng đoàn, không chờ được nhắc và không tìm lời khen.",
  },
];

function buildStages(
  prayer: DailyPrayer,
  reading: LiturgicalReading | null,
): PrayerStage[] {
  return [
    {
      name: "Chuẩn bị",
      latin: "Preparatio",
      duration: stageTimes[0],
      eyebrow: "Dọn lòng cầu nguyện",
      title: "Xin Chúa Thánh Thần hướng dẫn",
      body: "Lạy Chúa Thánh Thần, xin giúp con lắng lòng, gác lại những lo toan và mở lòng đón nhận Lời Chúa.",
      prompt: "Thinh lặng giây lát và ý thức Chúa đang hiện diện.",
    },
    {
      name: "Đọc Lời Chúa",
      latin: "Lectio",
      duration: stageTimes[1],
      eyebrow: "Lắng nghe Lời Chúa",
      title: reading ? "Lắng nghe Tin Mừng" : "Đọc và lắng nghe Lời Chúa",
      body: reading
        ? "Đọc chậm rãi đoạn Tin Mừng. Có thể đọc lại một câu hoặc một ý để suy niệm."
        : "Hãy đọc chậm câu Lời Chúa sau đây, rồi thinh lặng giây lát.",
      verse: reading ? undefined : prayer.verse,
      reference: reading
        ? `Tin Mừng • ${reading.gospelReference}`
        : prayer.reference,
      prompt: "Lời nào giúp tôi nhận ra điều Chúa muốn dạy?",
      reading: reading?.gospelText,
    },
    {
      name: "Suy niệm",
      latin: "Meditatio",
      duration: stageTimes[2],
      eyebrow: "Suy niệm Lời Chúa",
      title: reading ? "Chúa đang nói gì với tôi?" : prayer.meditationTitle,
      body: reading
        ? "Qua đoạn Tin Mừng, tôi hiểu thêm điều gì về Chúa? Lời Chúa giúp tôi nhận ra điều gì cần sửa đổi trong cách sống?"
        : prayer.meditation,
      prompt: "Xin cho con biết lắng nghe và đáp lại Lời Chúa.",
    },
    {
      name: "Cầu nguyện",
      latin: "Oratio",
      duration: stageTimes[3],
      eyebrow: "Thưa chuyện với Chúa",
      title: reading ? "Xin giúp con sống theo Lời Chúa" : prayer.prayerTitle,
      body: reading
        ? "Lạy Chúa Giêsu, con cảm tạ Chúa đã dạy dỗ con qua Lời Chúa. Con xin dâng lên Chúa những niềm vui, nỗi lo và điều con đang trăn trở. Xin giúp con vững tin và sống theo ý Chúa."
        : prayer.prayer,
      prompt: "Hãy thưa với Chúa lời tạ ơn, xin lỗi hoặc cầu xin từ chính lòng mình.",
    },
    {
      name: "Chiêm niệm",
      latin: "Contemplatio",
      duration: stageTimes[4],
      eyebrow: "Thinh lặng bên Chúa",
      title: "Thinh lặng trước Chúa",
      body: "Thinh lặng giây lát, hướng lòng về Chúa và nghỉ ngơi trong tình yêu của Người.",
      verse: reading ? "“Lạy Chúa Giêsu, con ở đây với Chúa.”" : prayer.echo,
      prompt: "Xin cho con được ở lại trong tình yêu Chúa.",
    },
    {
      name: "Sống Lời Chúa",
      latin: "Actio",
      duration: stageTimes[5],
      eyebrow: "Đem Lời Chúa ra thực hành",
      title: reading ? "Hôm nay, tôi sẽ sống Lời Chúa thế nào?" : prayer.actionTitle,
      body: reading
        ? "Chọn một việc cụ thể để thực hành Lời Chúa hôm nay: biết lắng nghe, sẵn lòng tha thứ, giúp đỡ một người hoặc chu toàn bổn phận."
        : prayer.action,
      prompt: "Xin Chúa giúp con trung thành với điều đã quyết tâm.",
    },
  ];
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function prayerStorage() {
  try { return window.localStorage; } catch { return null; }
}

function vietnamDateKey(now = new Date()) {
  const date = getVietnamDate(now);
  return `${date.year}-${date.month}-${date.day}`;
}

function ReadingNotice({ state, retry }: {
  state: "loading" | "ready" | "error" | "cached"; retry: () => void;
}) {
  if (state === "ready") return null;
  return (
    <div className={`reading-notice ${state === "error" ? "is-fallback" : ""}`}>
      <p role="status">
        {state === "loading"
          ? "Đang tải Tin Mừng. Trong lúc chờ, bạn có thể cầu nguyện với câu Lời Chúa thay thế."
          : state === "cached" ? "Đang dùng bản Tin Mừng đã lưu của ngày này."
          : "Chưa tải được Tin Mừng của ngày này. Câu Lời Chúa dưới đây được dùng thay thế, không phải bài Tin Mừng theo ngày."}
      </p>
      {state === "error" && <button type="button" onClick={retry}>Thử tải lại Tin Mừng</button>}
    </div>
  );
}

export default function Home() {
  const [status, setStatus] = useState<PrayerStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  const [dateLabel, setDateLabel] = useState("Hôm nay");
  const [dateKey, setDateKey] = useState("");
  const [savedSession, setSavedSession] = useState<PrayerSession | null>(null);
  const [reading, setReading] = useState<LiturgicalReading | null>(null);
  const [readingState, setReadingState] = useState<"loading" | "ready" | "error" | "cached">(
    "loading",
  );
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const [volume, setVolume] = useState(0.42);
  const [paceMode, setPaceMode] = useState<PaceMode>("auto");
  const [theme, setTheme] = useState<Preferences["theme"]>("system");
  const [fontSize, setFontSize] = useState<Preferences["fontSize"]>("normal");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [online, setOnline] = useState(true);
  const settingsRef = useRef<HTMLDialogElement>(null);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const startedAtRef = useRef(0);
  const elapsedAtStartRef = useRef(0);
  const sourceRef = useRef<string | null>(null);
  const pendingSeekRef = useRef(0);
  const playAttemptRef = useRef(0);
  const readingRequestRef = useRef<{ id: number; controller: AbortController | null }>({ id: 0, controller: null });
  const snapshotRef = useRef<{ session: PrayerSession; playing: boolean } | null>(null);
  const restoredScrollRef = useRef<number | null>(null);

  const dailyPrayer = dailyPrayers[dayIndex];
  const stages = useMemo(
    () => buildStages(dailyPrayer, reading),
    [dailyPrayer, reading],
  );
  const stageIndex = getStageIndex(elapsed);
  const stage = stages[stageIndex];
  const progress = Math.min(1, elapsed / totalDuration);
  const remaining = totalDuration - elapsed;


  const stageProgress = useMemo(() => {
    const stageStart = stages
      .slice(0, stageIndex)
      .reduce((total, item) => total + item.duration, 0);
    return Math.min(1, Math.max(0, (elapsed - stageStart) / stage.duration));
  }, [elapsed, stage.duration, stageIndex, stages]);

  const loadReading = useCallback((key: string) => {
    readingRequestRef.current.controller?.abort();
    const id = ++readingRequestRef.current.id;
    const controller = new AbortController();
    readingRequestRef.current.controller = controller;
    setReading(null);
    setReadingState("loading");
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void fetch(`/api/reading?${readingParams(key)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = parseReading(await response.json(), key);
        if (!response.ok || !payload) throw new Error("Reading unavailable");
        if (id !== readingRequestRef.current.id) return;
        cacheReading(prayerStorage(), key, payload);
        setReading(payload);
        setReadingState("ready");
      })
      .catch(() => {
        if (id !== readingRequestRef.current.id) return;
        const cached = readCachedReading(prayerStorage(), key);
        setReading(cached);
        setReadingState(cached ? "cached" : "error");
      })
      .finally(() => window.clearTimeout(timeout));
  }, []);

  useEffect(() => {
    const now = new Date();
    const vietnamDate = getVietnamDate(now);
    const key = vietnamDateKey(now);
    let preferences = DEFAULT_PREFERENCES;
    try { preferences = parsePreferences(prayerStorage()?.getItem(PREFERENCES_KEY) ?? null); } catch { /* Optional storage. */ }
    setTheme(preferences.theme);
    setFontSize(preferences.fontSize);
    setPaceMode(preferences.paceMode);
    setVolume(preferences.volume);
    setMusicEnabled(preferences.musicEnabled);
    setPreferencesReady(true);
    setSavedSession(readSession(prayerStorage()));
    setDateKey(key);
    setDayIndex(vietnamDate.weekdayIndex);
    setDateLabel(vietnamDate.label);
    selectMusicForToday();
    loadReading(key);
    return () => {
      readingRequestRef.current.id += 1;
      readingRequestRef.current.controller?.abort();
    };
  }, [loadReading]);

  const persistCurrentSession = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    const position = snapshot.playing
      ? prayerPosition(elapsedAtStartRef.current, (Date.now() - startedAtRef.current) / 1000, snapshot.session.paceMode)
      : snapshot.session.elapsed;
    if (position >= totalDuration) { clearSession(prayerStorage()); return; }
    writeSession(prayerStorage(), {
      ...snapshot.session, elapsed: Math.max(0, position), savedAt: Date.now(),
      audioSource: sourceRef.current ?? snapshot.session.audioSource,
      scrollY: window.scrollY,
    });
  }, []);

  useEffect(() => {
    if ((status === "playing" || status === "paused") && dateKey) {
      snapshotRef.current = {
        playing: status === "playing",
        session: {
          version: 1, savedAt: Date.now(), dateKey, elapsed,
          audioSource: sourceRef.current ?? FALLBACK_AUDIO,
          musicEnabled, volume, reading, paceMode, scrollY: window.scrollY,
        },
      };
    } else {
      snapshotRef.current = null;
      if (status === "complete") clearSession(prayerStorage());
    }
  }, [status, dateKey, elapsed, musicEnabled, volume, reading, paceMode]);

  useEffect(() => {
    if (status === "playing" || status === "paused") persistCurrentSession();
  }, [status, stageIndex, reading, musicEnabled, volume, paceMode, persistCurrentSession]);

  useEffect(() => {
    const timer = window.setInterval(persistCurrentSession, 5000);
    const onHidden = () => { if (document.visibilityState === "hidden") persistCurrentSession(); };
    window.addEventListener("pagehide", persistCurrentSession);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", persistCurrentSession);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [persistCurrentSession]);

  useEffect(() => {
    if (status !== "playing" && status !== "paused") return;
    const scrollY = restoredScrollRef.current ?? 0;
    restoredScrollRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "instant" });
      stageHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [status === "idle", stageIndex]);

  useEffect(() => {
    if (status !== "playing") return;

    const tick = () => {
      const nextElapsed = prayerPosition(
        elapsedAtStartRef.current, (Date.now() - startedAtRef.current) / 1000, paceMode,
      );

      if (nextElapsed >= totalDuration) {
        setElapsed(totalDuration);
        setStatus("complete");
        audioRef.current?.pause();
        return;
      }

      setElapsed(nextElapsed);
    };

    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [status, paceMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!preferencesReady) return;
    try { prayerStorage()?.setItem(PREFERENCES_KEY, JSON.stringify({ theme, fontSize, paceMode, volume, musicEnabled })); }
    catch { /* Preferences remain usable for this visit. */ }
  }, [preferencesReady, theme, fontSize, paceMode, volume, musicEnabled]);

  useEffect(() => {
    if (!preferencesReady) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.fontSize = fontSize;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preferencesReady, theme, fontSize]);

  useEffect(() => {
    const dialog = settingsRef.current;
    if (musicOpen && !dialog?.open) dialog?.showModal();
    if (!musicOpen && dialog?.open) dialog.close();
  }, [musicOpen]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Keep one media element: source changes occur only before a new session or on failure.
  const setMusicSource = (source: string) => {
    const audio = audioRef.current;
    if (!audio || sourceRef.current === source) return;
    playAttemptRef.current += 1;
    sourceRef.current = source;
    audio.src = source;
    audio.volume = volume;
    audio.load();
  };

  const selectMusicForToday = () => {
    setMusicSource(selectDailyAudio(
      new Date(), window.location.search,
      process.env.NEXT_PUBLIC_AUDIO_PREVIEW === "true",
    ));
  };

  const currentPrayerTime = () => status === "quiet" ? (audioRef.current?.currentTime ?? 0)
    : status === "playing"
      ? prayerPosition(elapsedAtStartRef.current, (Date.now() - startedAtRef.current) / 1000, paceMode)
      : elapsed;

  const changePaceMode = (next: PaceMode) => {
    const position = currentPrayerTime();
    if (status === "playing" || status === "paused") {
      setElapsed(position);
      elapsedAtStartRef.current = position;
      startedAtRef.current = Date.now();
    }
    setPaceMode(next);
  };

  const syncMusicTo = (position: number) => {
    const audio = audioRef.current;
    pendingSeekRef.current = Math.min(Math.max(position, 0), totalDuration - 0.1);
    if (audio && audio.readyState > 0
      && Math.abs(audio.currentTime - pendingSeekRef.current) > 0.35) {
      audio.currentTime = pendingSeekRef.current;
    }
  };

  const playMusicFrom = (position: number, enabled = musicEnabled, level = volume) => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;
    const attempt = ++playAttemptRef.current;
    syncMusicTo(position);
    audio.volume = level;
    setMusicError(false);
    void audio.play().catch((error: Error) => {
      // A pause/source change may cancel an older play request. It is not a playback error.
      if (attempt !== playAttemptRef.current || error.name === "AbortError" || audio.error) return;
      setIsMusicPlaying(false);
      setMusicError(true);
    });
  };

  const begin = () => {
    clearSession(prayerStorage());
    setSavedSession(null);
    const now = new Date();
    const todayKey = vietnamDateKey(now);
    if (dateKey !== todayKey) {
      const today = getVietnamDate(now);
      setDateKey(todayKey);
      setDayIndex(today.weekdayIndex);
      setDateLabel(today.label);
      loadReading(todayKey);
    }
    selectMusicForToday();
    pendingSeekRef.current = 0;
    setElapsed(0);
    elapsedAtStartRef.current = 0;
    startedAtRef.current = Date.now();
    playMusicFrom(0);
    setMusicOpen(false);
    setStatus("playing");
  };

  const restoreSession = () => {
    if (!savedSession) return;
    const saved = savedSession;
    readingRequestRef.current.id += 1;
    readingRequestRef.current.controller?.abort();
    const date = getVietnamDate(new Date(`${saved.dateKey}T12:00:00+07:00`));
    setDateKey(saved.dateKey);
    setDateLabel(date.label);
    setDayIndex(date.weekdayIndex);
    setReading(saved.reading);
    setReadingState(saved.reading ? "ready" : "error");
    setElapsed(saved.elapsed);
    setPaceMode(saved.paceMode ?? "auto");
    setMusicEnabled(saved.musicEnabled);
    setVolume(saved.volume);
    setMusicOpen(false);
    setMusicError(false);
    setSavedSession(null);
    restoredScrollRef.current = saved.scrollY;
    elapsedAtStartRef.current = saved.elapsed;
    startedAtRef.current = Date.now();
    setMusicSource(saved.audioSource);
    syncMusicTo(saved.elapsed);
    playMusicFrom(saved.elapsed, saved.musicEnabled, saved.volume);
    setStatus("playing");
  };

  const pause = () => {
    const position = currentPrayerTime();
    playAttemptRef.current += 1;
    setElapsed(position);
    elapsedAtStartRef.current = position;
    audioRef.current?.pause();
    setStatus("paused");
  };

  const resume = () => {
    startedAtRef.current = Date.now();
    elapsedAtStartRef.current = elapsed;
    playMusicFrom(elapsed);
    setStatus("playing");
  };

  const restart = () => {
    clearSession(prayerStorage());
    setSavedSession(null);
    playAttemptRef.current += 1;
    pendingSeekRef.current = 0;
    const audio = audioRef.current;
    audio?.pause();
    if (audio && audio.readyState > 0) audio.currentTime = 0;
    setElapsed(0);
    setStatus("idle");
    setMusicError(false);
    selectMusicForToday();
    setMusicOpen(false);
    const today = getVietnamDate(new Date());
    const key = vietnamDateKey();
    setDateKey(key);
    setDateLabel(today.label);
    setDayIndex(today.weekdayIndex);
    loadReading(key);
  };

  const toggleMusic = () => {
    const audio = audioRef.current;

    if (musicEnabled) {
      playAttemptRef.current += 1;
      audio?.pause();
      setMusicEnabled(false);
      setMusicError(false);
      return;
    }

    setMusicEnabled(true);
    setMusicError(false);

    if (audio && (status === "playing" || status === "quiet")) playMusicFrom(currentPrayerTime(), true);
  };

  const changeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    if (audioRef.current) audioRef.current.volume = nextVolume;
  };

  const skipToNextStage = () => {
    if (stageIndex >= stages.length - 1) {
      audioRef.current?.pause();
      setElapsed(totalDuration);
      setStatus("complete");
      return;
    }
    const nextElapsed = stages
      .slice(0, stageIndex + 1)
      .reduce((total, item) => total + item.duration, 0);
    setElapsed(nextElapsed);
    elapsedAtStartRef.current = nextElapsed;
    startedAtRef.current = Date.now();
    syncMusicTo(nextElapsed);
  };

  const previousStage = () => {
    if (stageIndex === 0) return;
    const position = stageTimes.slice(0, stageIndex - 1).reduce((a, b) => a + b, 0);
    setElapsed(position);
    elapsedAtStartRef.current = position;
    startedAtRef.current = Date.now();
    syncMusicTo(position);
  };

  const enterQuiet = () => {
    setStatus("quiet");
    playMusicFrom(0);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const leaveQuiet = () => {
    playAttemptRef.current += 1;
    audioRef.current?.pause();
    setStatus("complete");
  };

  return (
    <main className="prayer-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <audio
        ref={audioRef}
        preload="metadata"
        loop={paceMode === "manual" || status === "quiet"}
        onPlaying={() => setIsMusicPlaying(true)}
        onPause={() => setIsMusicPlaying(false)}
        onEnded={() => setIsMusicPlaying(false)}
        onLoadedMetadata={() => syncMusicTo(status === "playing" ? currentPrayerTime() : pendingSeekRef.current)}
        onCanPlay={() => {
          if (audioRef.current) audioRef.current.volume = volume;
          if ((status === "playing" || status === "quiet") && musicEnabled && audioRef.current?.paused) {
            playMusicFrom(currentPrayerTime());
          }
        }}
        onError={() => {
          setIsMusicPlaying(false);
          if (sourceRef.current !== FALLBACK_AUDIO) {
            syncMusicTo(currentPrayerTime());
            setMusicSource(FALLBACK_AUDIO);
            setMusicError(false);
            if (status === "playing" || status === "quiet") playMusicFrom(currentPrayerTime());
            return;
          }
          setMusicError(true);
        }}
      />

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="12 Phút Bên Chúa">
          <BrandMark />
          <span className="brand-name"><span>12 Phút</span>{" "}<span>Bên Chúa</span></span>
        </a>
        <button
          className="sound-button"
          type="button"
          onClick={() => setMusicOpen((value) => !value)}
          aria-expanded={musicOpen}
          aria-controls="taize-music"
          aria-label="Tùy chỉnh cầu nguyện"
        >
          <span
            className={`sound-waves ${isMusicPlaying ? "is-on" : ""}`}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </span>
          <span>Tùy chỉnh</span>
        </button>
      </header>

      <dialog ref={settingsRef} className="preferences-dialog" id="taize-music"
        aria-label="Tùy chỉnh cầu nguyện" onClose={() => setMusicOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) setMusicOpen(false); }}>
        <div className="preferences-content">
        <div className="music-heading">
          <div>
            <span>Tùy chỉnh cầu nguyện</span>
            <strong>Nhạc, cách chuyển bước và hiển thị</strong>
          </div>
          <button
            type="button"
            onClick={() => setMusicOpen(false)}
            aria-label="Đóng tùy chỉnh"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="direct-player">
          <button
            className={`music-toggle ${musicEnabled ? "is-enabled" : ""}`}
            type="button"
            onClick={toggleMusic}
            aria-pressed={musicEnabled}
            aria-label={musicEnabled ? "Tắt nhạc nền" : "Bật nhạc nền"}
          >
            <span className="music-note" aria-hidden="true">
              <MusicIcon muted={!musicEnabled} />
            </span>
          </button>
          <div className="music-status">
            <strong>
              {!musicEnabled
                ? "Nhạc đang tắt"
                : isMusicPlaying
                  ? "Đang phát cùng giờ cầu nguyện"
                  : "Sẵn sàng phát"}
            </strong>
            <span>
              {status === "idle"
                ? "Tự phát khi bạn bắt đầu"
                  : status === "quiet" ? "Không hẹn giờ"
                    : paceMode === "manual" ? `Bước ${stageIndex + 1}/6 · Tôi tự chuyển`
                      : `${formatTime(Math.min(elapsed, totalDuration))} / 12:00`}
            </span>
          </div>
        </div>
        <div className="music-progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <label className="volume-control">
          <span>Âm lượng</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            aria-label="Âm lượng nhạc nền"
          />
        </label>
        {musicError && (
          <p className="music-error">
            Chưa thể phát nhạc. Bạn có thể tiếp tục cầu nguyện trong thinh lặng.
          </p>
        )}
        <PaceSelector value={paceMode} onChange={changePaceMode} />
        <DisplayOptions theme={theme} fontSize={fontSize} onTheme={setTheme} onFontSize={setFontSize} />
        <OfflineOptions dateKey={dateKey} readingReady={!!reading} audioSource={sourceRef.current ?? selectDailyAudio(new Date())} />
        </div>
      </dialog>

      {!online && <p className="connection-notice" role="status">Hiện không có kết nối mạng. Bạn vẫn có thể dùng những nội dung đã lưu trên thiết bị.</p>}
      <section className="prayer-stage" id="top">
        {status === "idle" ? (
          <div className="intro-panel">
            {savedSession ? (
              <div className="resume-card">
                <p className="kicker">Giờ cầu nguyện chưa kết thúc</p>
                <h1>Tiếp tục giờ cầu nguyện.</h1>
                <p className="intro-copy">
                  Ngày {savedSession.dateKey.split("-").reverse().join("/")}
                  {" · "}Bước {getStageIndex(savedSession.elapsed) + 1}/6
                  {" · "}{savedSession.paceMode === "manual" ? "Tôi tự chuyển" : `Còn ${formatTime(totalDuration - savedSession.elapsed)}`}
                </p>
                <button className="primary-action" type="button" onClick={restoreSession}>
                  <span className="play-icon" aria-hidden="true" />
                  Tiếp tục cầu nguyện
                </button>
                <button className="new-session-action" type="button" onClick={begin}>
                  Bắt đầu giờ cầu nguyện mới
                </button>
                <p className="quiet-note">Nhạc chỉ phát khi bạn chọn tiếp tục.</p>
              </div>
            ) : (
              <>
                <p className="kicker">{dateLabel}</p>
                <h1>Cầu nguyện với Lời Chúa.</h1>
                <p className="intro-copy">
                  Dành 12 phút để lắng nghe Lời Chúa, suy niệm và thưa chuyện với Người.
                </p>
                <div className="intro-actions">
                  <button className="primary-action" type="button" onClick={begin}>
                    <span className="play-icon" aria-hidden="true" />
                    Bắt đầu cầu nguyện
                  </button>
                  <p className="quiet-note">Có thể bật, tắt nhạc Taizé hoặc đổi âm lượng trong mục Tùy chỉnh.</p>
                </div>
              </>
            )}

            <PaceSelector value={paceMode} onChange={changePaceMode} />
            <div className="verse-preview">
              <span>{readingState === "error" ? "Câu Lời Chúa thay thế" : "Tin Mừng hôm nay"}</span>
              {readingState === "loading" ? (
                <p className="reading-loading" role="status">Đang tải Tin Mừng…</p>
              ) : reading ? (
                <>
                  <blockquote className="liturgical-title">
                    {reading.liturgicalDay}
                  </blockquote>
                  <cite>Tin Mừng · {reading.gospelReference}</cite>
                  {readingState === "cached" && <ReadingNotice state="cached" retry={() => loadReading(dateKey)} />}
                </>
              ) : (
                <>
                  <blockquote>{dailyPrayer.verse}</blockquote>
                  <cite>{dailyPrayer.shortReference}</cite>
                  <ReadingNotice state={readingState} retry={() => loadReading(dateKey || vietnamDateKey())} />
                </>
              )}
            </div>
          </div>
        ) : status === "complete" ? (
          <PrayerCompletion onQuiet={enterQuiet} onRestart={restart} />
        ) : status === "quiet" ? (
          <div className="quiet-panel">
            <p className="kicker">Ở lại với Chúa</p>
            <h1>Thinh lặng bên Chúa.</h1>
            <p className="body-copy">Lạy Chúa Giêsu, con ở đây với Chúa.</p>
            <p className="quiet-note">Bạn có thể tiếp tục thinh lặng và kết thúc khi muốn.</p>
            <button className="secondary-action" type="button" onClick={leaveQuiet}>Kết thúc thinh lặng</button>
          </div>
        ) : (
          <div className="session-panel">
            <div className="session-topline">
              <div>
                <span className="step-count" aria-live="polite">Bước {stageIndex + 1} / {stages.length}</span>
                <strong>{stage.name}</strong>
                <em>{stage.latin}</em>
              </div>
              <div className="session-time">
                <time aria-label={paceMode === "auto" ? `${formatTime(remaining)} còn lại` : "Thời gian gợi ý còn lại của bước"}>
                  {formatTime(paceMode === "auto" ? remaining : stageProgress >= 0.9999 ? 0 : stage.duration * (1 - stageProgress))}
                </time>
                <button type="button" onClick={() => setMusicOpen(true)}>{paceMode === "auto" ? "Tự động" : "Tôi tự chuyển"}</button>
              </div>
            </div>

            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} />
            </div>

            <article
              className={`prayer-copy ${stage.reading ? "has-reading" : ""}`}
              key={stage.latin}
            >
              <p className="kicker">{stage.eyebrow}</p>
              <h2 ref={stageHeadingRef} tabIndex={-1}>{stage.title}</h2>
              {stage.verse && <blockquote>{stage.verse}</blockquote>}
              {stage.reference && <cite>{stage.reference}</cite>}
              {stageIndex === 1 && <ReadingNotice state={readingState} retry={() => loadReading(dateKey || vietnamDateKey())} />}
              <p className={`body-copy ${stage.reading ? "reading-instruction" : ""}`}>
                {stage.body}
              </p>
              {stage.reading && (
                <div
                  className="reading-text"
                  aria-label={`Bản văn ${stage.reference}`}
                >
                  {stage.reading.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
              {stage.prompt && <p className="reflection-prompt">{stage.prompt}</p>}
              {paceMode === "manual" && stageProgress >= 0.9999 && (
                <p className="pace-note" role="status">Bạn có thể tiếp tục cầu nguyện ở bước này. Chọn Bước tiếp khi muốn sang phần kế tiếp.</p>
              )}
              {stageIndex === 2 && (
                <details className="meditation-details">
                  <summary><span>{reading ? "Xem lại Tin Mừng" : "Xem lại câu Lời Chúa"} <small>{reading?.gospelReference ?? dailyPrayer.shortReference}</small></span><span className="meditation-chevron" aria-hidden="true" /></summary>
                  <div className="meditation-text">
                    {(reading?.gospelText ?? dailyPrayer.verse).split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                  </div>
                </details>
              )}
              {stageIndex === 2 && reading?.meditationText && (
                <details className="meditation-details">
                  <summary>
                    <span>Đọc bài suy niệm <small>Tùy chọn</small></span>
                    <span className="meditation-chevron" aria-hidden="true" />
                  </summary>
                  <div className="meditation-text">
                    {reading.meditationText.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              )}
            </article>

            <div className="session-controls" role="group" aria-label="Điều khiển cầu nguyện">
              <div className="stage-timer" aria-hidden="true"><span style={{ width: `${stageProgress * 100}%` }} /></div>
              <button className="dock-button" type="button" onClick={previousStage} disabled={stageIndex === 0} aria-label="Bước trước" title="Bước trước">‹</button>
              <button className="dock-button" type="button" onClick={status === "playing" ? pause : resume}
                aria-label={status === "playing" ? "Tạm dừng" : "Tiếp tục"} title={status === "playing" ? "Tạm dừng" : "Tiếp tục"}>
                <span className={status === "playing" ? "pause-icon" : "play-icon"} aria-hidden="true" />
              </button>
              <button className="dock-next" type="button" onClick={skipToNextStage}>{stageIndex >= stages.length - 1 ? "Kết thúc" : "Bước tiếp"}</button>
              <button className="dock-button" type="button" onClick={toggleMusic} aria-pressed={musicEnabled} aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"} title={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}><MusicIcon muted={!musicEnabled} /></button>
              <button className="dock-button dock-settings" type="button" onClick={() => setMusicOpen(true)} aria-label="Tùy chỉnh chữ, giao diện và âm lượng" title="Tùy chỉnh">Aa</button>
            </div>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>Preparatio</span><i />
        <span>Lectio</span><i />
        <span>Meditatio</span><i />
        <span>Oratio</span><i />
        <span>Contemplatio</span><i />
        <span>Actio</span>
      </footer>
    </main>
  );
}
