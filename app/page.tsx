"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FALLBACK_AUDIO, getVietnamDate, selectDailyAudio } from "@/lib/weekly-audio";
import {
  clearSession, parseReading, readSession, readingParams, readingSource, writeSession,
  PRAYER_STAGE_DURATIONS as stageTimes, PRAYER_DURATION as totalDuration,
  type LiturgicalReading, type PrayerSession,
} from "@/lib/prayer-session";

type PrayerStatus = "idle" | "playing" | "paused" | "complete";

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
  sourceUrl?: string;
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
    theme: "Can đảm giữa sóng gió",
    verse: "“Cứ yên tâm, chính Thầy đây, đừng sợ!”",
    reference: "Tin Mừng theo thánh Mát-thêu 14,27",
    shortReference: "Mt 14,27",
    meditationTitle: "Chúa đang muốn nói gì với tôi?",
    meditation:
      "Trong những chao đảo gần đây, tôi đang nhìn vào sóng gió hay nhìn vào Chúa? Điều gì làm tôi sợ đến mức quên rằng Chúa đang ở rất gần?",
    prayerTitle: "Con trao nỗi sợ của con cho Chúa",
    prayer:
      "Lạy Chúa Giêsu, Chúa biết điều đang làm lòng con bất an. Xin đừng để con chỉ nhìn vào sức riêng mình. Xin cho con nhận ra tiếng Chúa giữa gió ngược và can đảm bước về phía Chúa.",
    echo: "“Chính Thầy đây. Đừng sợ.”",
    actionTitle: "Dừng lại trước nỗi lo",
    action:
      "Hôm nay, mỗi khi lo lắng xuất hiện, tôi sẽ dừng lại một nhịp, hít thở chậm và thầm gọi: “Lạy Chúa Giêsu, con tín thác nơi Ngài.”",
  },
  {
    theme: "Ở lại trong tình yêu",
    verse: "“Anh em hãy ở lại trong tình thương của Thầy.”",
    reference: "Tin Mừng theo thánh Gio-an 15,9",
    shortReference: "Ga 15,9",
    meditationTitle: "Tôi đang tìm giá trị của mình ở đâu?",
    meditation:
      "Tôi có đang cố chứng minh mình xứng đáng được yêu bằng thành công, sự hữu ích hay lời công nhận của người khác? Tôi có tin rằng tình yêu của Chúa đi trước mọi cố gắng của tôi không?",
    prayerTitle: "Xin giữ con ở lại trong tình yêu",
    prayer:
      "Lạy Chúa Giêsu, nhiều khi con tìm giá trị của mình nơi những điều chóng qua. Xin cho con thôi chạy trốn khỏi sự hiện diện của Chúa và bình an ở lại trong tình thương nhưng không Người dành cho con.",
    echo: "“Hãy ở lại trong tình thương của Thầy.”",
    actionTitle: "Yêu bằng sự hiện diện",
    action:
      "Hôm nay, tôi sẽ dành trọn sự chú ý cho một người đang cần được lắng nghe, không vội phán xét và không nhìn vào điện thoại.",
  },
  {
    theme: "Trao lại gánh nặng",
    verse:
      "“Tất cả những ai đang vất vả mang gánh nặng nề, hãy đến cùng tôi, tôi sẽ cho nghỉ ngơi bồi dưỡng.”",
    reference: "Tin Mừng theo thánh Mát-thêu 11,28",
    shortReference: "Mt 11,28",
    meditationTitle: "Gánh nặng nào tôi vẫn ôm chặt?",
    meditation:
      "Có điều gì tôi đã cố tự giải quyết quá lâu mà chưa một lần thật lòng trao cho Chúa? Tôi có để mình được nghỉ ngơi trong Chúa, hay luôn tin rằng dừng lại là yếu đuối?",
    prayerTitle: "Con đến với Chúa như con đang là",
    prayer:
      "Lạy Chúa Giêsu, con mang đến đây sự mệt mỏi, những việc chưa xong và cả giới hạn của mình. Xin đỡ lấy điều con không thể gánh một mình và dạy con biết nghỉ ngơi trong Chúa.",
    echo: "“Hãy đến cùng Thầy.”",
    actionTitle: "Trao phó một gánh nặng",
    action:
      "Hôm nay, tôi sẽ viết ra một điều đang đè nặng lòng mình, rồi chậm rãi dâng điều ấy cho Chúa trong một kinh Lạy Cha.",
  },
  {
    theme: "Đón nhận bình an",
    verse:
      "“Thầy để lại bình an cho anh em, Thầy ban cho anh em bình an của Thầy.”",
    reference: "Tin Mừng theo thánh Gio-an 14,27",
    shortReference: "Ga 14,27",
    meditationTitle: "Bình an của tôi đang tùy thuộc điều gì?",
    meditation:
      "Tôi chỉ bình an khi mọi việc diễn ra đúng ý mình, hay vẫn có thể tín thác khi chưa nhìn thấy câu trả lời? Có cuộc xung đột nào đang cần tôi bước vào với sự hiền hòa của Chúa?",
    prayerTitle: "Xin đặt bình an của Chúa trong con",
    prayer:
      "Lạy Chúa Giêsu, xin giải thoát con khỏi ảo tưởng phải kiểm soát mọi sự. Xin ban cho con bình an không trốn tránh sự thật, nhưng đủ sâu để con biết lắng nghe, tha thứ và bắt đầu lại.",
    echo: "“Thầy ban cho anh em bình an của Thầy.”",
    actionTitle: "Nói chậm và nghe kỹ",
    action:
      "Trước một cuộc trò chuyện khó hôm nay, tôi sẽ thinh lặng cầu xin bình an, rồi lắng nghe hết lời người kia trước khi trả lời.",
  },
  {
    theme: "Trở nên ánh sáng",
    verse: "“Chính anh em là ánh sáng cho trần gian.”",
    reference: "Tin Mừng theo thánh Mát-thêu 5,14",
    shortReference: "Mt 5,14",
    meditationTitle: "Ánh sáng nào Chúa đã đặt trong tôi?",
    meditation:
      "Tôi có đang che giấu một ân ban vì sợ bị đánh giá hay thất bại? Hôm nay, nơi nào đang cần sự tử tế, lòng can đảm hoặc niềm hy vọng mà Chúa đã trao cho tôi?",
    prayerTitle: "Xin dùng con như một ánh sáng nhỏ",
    prayer:
      "Lạy Chúa Giêsu là Ánh Sáng thật, xin thanh luyện ý hướng của con. Đừng để con tìm cách làm mình nổi bật, nhưng xin cho đời con âm thầm phản chiếu lòng nhân hậu của Chúa.",
    echo: "“Anh em là ánh sáng.”",
    actionTitle: "Thắp sáng một ngày của ai đó",
    action:
      "Hôm nay, tôi sẽ gửi một lời khích lệ chân thành hoặc thực hiện một việc tốt kín đáo cho người đang mỏi mệt.",
  },
  {
    theme: "Tín thác vào Chúa Cha",
    verse:
      "“Hỡi đoàn chiên nhỏ bé, đừng sợ, vì Cha anh em đã vui lòng ban Nước của Người cho anh em.”",
    reference: "Tin Mừng theo thánh Lu-ca 12,32",
    shortReference: "Lc 12,32",
    meditationTitle: "Tôi hình dung Chúa Cha như thế nào?",
    meditation:
      "Tôi có nhìn Chúa Cha như Đấng chỉ chờ xét lỗi, hay như Người Cha vui lòng trao ban Nước Trời? Nỗi sợ nào đang khiến tôi sống như thể mình phải tự bảo đảm mọi thứ?",
    prayerTitle: "Con chọn tin vào lòng nhân hậu của Cha",
    prayer:
      "Lạy Cha, xin chữa lành trong con những hình ảnh sai lệch về Cha. Khi con thấy mình bé nhỏ và bất lực, xin nhắc con rằng con thuộc về Cha và được gìn giữ trong tình yêu của Cha.",
    echo: "“Đừng sợ, hỡi đoàn chiên nhỏ bé.”",
    actionTitle: "Làm một việc với lòng tín thác",
    action:
      "Hôm nay, tôi sẽ bắt đầu một việc tốt mình vẫn trì hoãn vì sợ hãi, và phó dâng kết quả trong tay Chúa.",
  },
  {
    theme: "Phục vụ như Chúa",
    verse:
      "“Nếu Thầy là Chúa, là Thầy, mà còn rửa chân cho anh em, thì anh em cũng phải rửa chân cho nhau.”",
    reference: "Tin Mừng theo thánh Gio-an 13,14",
    shortReference: "Ga 13,14",
    meditationTitle: "Tôi đang né tránh việc phục vụ nào?",
    meditation:
      "Có người nào tôi thấy khó cúi xuống để phục vụ? Tôi có chỉ giúp khi được ghi nhận, hay có thể yêu bằng những việc nhỏ không ai nhìn thấy?",
    prayerTitle: "Xin cho con có trái tim của người phục vụ",
    prayer:
      "Lạy Chúa Giêsu hiền lành và khiêm nhường, xin cất khỏi con sự tự mãn và tính toán. Xin dạy con nhận ra Chúa nơi người đang cần một bàn tay, một khoảng thời gian hay một sự cảm thông.",
    echo: "“Anh em hãy rửa chân cho nhau.”",
    actionTitle: "Phục vụ trong âm thầm",
    action:
      "Hôm nay, tôi sẽ chủ động làm một việc phục vụ nhỏ trong gia đình hoặc cộng đoàn mà không chờ được nhắc và không tìm lời khen.",
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
      eyebrow: "Xin ơn Chúa Thánh Thần",
      title: "Con đặt mình trước mặt Chúa",
      body: "Lạy Chúa Thánh Thần, xin làm lắng yên những xao động trong con. Xin mở lòng con để con nghe được tiếng Chúa và sẵn sàng đón nhận Lời Người.",
      prompt: "Hít vào thật chậm. Thở ra thật nhẹ.",
    },
    {
      name: "Đọc",
      latin: "Lectio",
      duration: stageTimes[1],
      eyebrow: "Lắng nghe Lời Chúa",
      title: reading ? "Lắng nghe Tin Mừng" : "Đọc chậm. Đọc lại. Lắng nghe.",
      body: reading
        ? "Hãy đọc thật chậm. Đừng cố đọc cho hết; hãy để một lời dừng bạn lại."
        : "Đừng vội phân tích. Hãy để từng lời ở lại trong lòng và chú ý đến từ ngữ đang chạm đến bạn.",
      verse: reading ? undefined : prayer.verse,
      reference: reading
        ? `Tin Mừng • ${reading.gospelReference}`
        : prayer.reference,
      prompt: "Từ nào đang ở lại trong lòng tôi?",
      reading: reading?.gospelText,
      sourceUrl: reading?.sourceUrl,
    },
    {
      name: "Suy niệm",
      latin: "Meditatio",
      duration: stageTimes[2],
      eyebrow: "Để Lời Chúa soi chiếu",
      title: reading ? "Lời nào đang dừng tôi lại?" : prayer.meditationTitle,
      body: reading
        ? "Đoạn Tin Mừng cho tôi nhận ra điều gì về Chúa Giêsu? Lời này chạm đến hoàn cảnh nào trong đời tôi? Chúa đang mời tôi tin, buông bỏ hay thay đổi điều gì?"
        : prayer.meditation,
      prompt: "Ở lại với một câu hỏi. Không cần tìm câu trả lời thật nhanh.",
    },
    {
      name: "Cầu nguyện",
      latin: "Oratio",
      duration: stageTimes[3],
      eyebrow: "Thưa chuyện với Chúa",
      title: reading ? "Xin cho Lời này sinh hoa trái" : prayer.prayerTitle,
      body: reading
        ? "Lạy Chúa Giêsu, con cảm tạ Chúa vì Lời Chúa vừa nói với con. Xin đón nhận những tâm tình đang có trong con—niềm vui, sự kháng cự, nỗi sợ và ước muốn được đổi mới. Xin giúp con đáp lại Lời bằng cả cuộc đời."
        : prayer.prayer,
      prompt: "Hãy thưa với Chúa điều bạn chưa nói được với ai.",
    },
    {
      name: "Chiêm niệm",
      latin: "Contemplatio",
      duration: stageTimes[4],
      eyebrow: "Thinh lặng bên Chúa",
      title: "Không cần nói gì thêm",
      body: "Chỉ ở lại. Để Chúa nhìn bạn và để lòng bạn nghỉ yên trong sự hiện diện của Người.",
      verse: reading ? "“Lạy Chúa Giêsu, con ở đây với Chúa.”" : prayer.echo,
      prompt: "Lạy Chúa Giêsu, con ở đây với Chúa.",
    },
    {
      name: "Hành động",
      latin: "Actio",
      duration: stageTimes[5],
      eyebrow: "Mang Lời vào ngày sống",
      title: reading ? "Một điều tôi sẽ làm hôm nay" : prayer.actionTitle,
      body: reading
        ? "Từ lời mời gọi vừa nhận được, tôi chọn một hành động nhỏ, cụ thể và có thể thực hiện ngay hôm nay. Tôi sẽ gọi tên hành động ấy trước mặt Chúa và trung thành thực hiện."
        : prayer.action,
      prompt: "Xin cho Lời Chúa được tiếp tục trong việc con làm.",
    },
  ];
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function getStageIndex(elapsed: number) {
  let boundary = 0;
  for (let index = 0; index < stageTimes.length; index += 1) {
    boundary += stageTimes[index];
    if (elapsed < boundary) return index;
  }
  return stageTimes.length - 1;
}

function prayerStorage() {
  try { return window.localStorage; } catch { return null; }
}

function vietnamDateKey(now = new Date()) {
  const date = getVietnamDate(now);
  return `${date.year}-${date.month}-${date.day}`;
}

function ReadingNotice({ state, retry }: {
  state: "loading" | "ready" | "error"; retry: () => void;
}) {
  if (state === "ready") return null;
  return (
    <div className={`reading-notice ${state === "error" ? "is-fallback" : ""}`}>
      <p role="status">
        {state === "loading"
          ? "Đang tải Tin Mừng. Trong lúc chờ, bạn có thể cầu nguyện với đoạn dự phòng."
          : "Chưa tải được Tin Mừng của ngày này. Bạn đang dùng đoạn cầu nguyện dự phòng."}
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
  const [readingState, setReadingState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const [volume, setVolume] = useState(0.42);
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
        setReading(payload);
        setReadingState("ready");
      })
      .catch(() => {
        if (id === readingRequestRef.current.id) setReadingState("error");
      })
      .finally(() => window.clearTimeout(timeout));
  }, []);

  useEffect(() => {
    const now = new Date();
    const vietnamDate = getVietnamDate(now);
    const key = vietnamDateKey(now);
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
      ? elapsedAtStartRef.current + (Date.now() - startedAtRef.current) / 1000
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
          musicEnabled, volume, reading, scrollY: window.scrollY,
        },
      };
    } else {
      snapshotRef.current = null;
      if (status === "complete") clearSession(prayerStorage());
    }
  }, [status, dateKey, elapsed, musicEnabled, volume, reading]);

  useEffect(() => {
    if (status === "playing" || status === "paused") persistCurrentSession();
  }, [status, stageIndex, reading, musicEnabled, volume, persistCurrentSession]);

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
    if (status === "idle" || status === "complete") return;
    const scrollY = restoredScrollRef.current ?? 0;
    restoredScrollRef.current = null;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
    return () => window.cancelAnimationFrame(frame);
  }, [status === "idle", stageIndex]);

  useEffect(() => {
    if (status !== "playing") return;

    const tick = () => {
      const nextElapsed =
        elapsedAtStartRef.current +
        (Date.now() - startedAtRef.current) / 1000;

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
  }, [status]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

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

  const currentPrayerTime = () => status === "playing"
    ? Math.min(totalDuration, elapsedAtStartRef.current + (Date.now() - startedAtRef.current) / 1000)
    : elapsed;

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

    if (audio && status === "playing") playMusicFrom(currentPrayerTime(), true);
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

  return (
    <main className="prayer-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <audio
        ref={audioRef}
        preload="metadata"
        onPlaying={() => setIsMusicPlaying(true)}
        onPause={() => setIsMusicPlaying(false)}
        onEnded={() => setIsMusicPlaying(false)}
        onLoadedMetadata={() => syncMusicTo(status === "playing" ? currentPrayerTime() : pendingSeekRef.current)}
        onCanPlay={() => {
          if (audioRef.current) audioRef.current.volume = volume;
          if (status === "playing" && musicEnabled && audioRef.current?.paused) {
            playMusicFrom(currentPrayerTime());
          }
        }}
        onError={() => {
          setIsMusicPlaying(false);
          if (sourceRef.current !== FALLBACK_AUDIO) {
            syncMusicTo(currentPrayerTime());
            setMusicSource(FALLBACK_AUDIO);
            setMusicError(false);
            if (status === "playing") playMusicFrom(currentPrayerTime());
            return;
          }
          setMusicError(true);
        }}
      />

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="12 Phút Bên Chúa">
          <span className="cross-mark" aria-hidden="true" />
          <span>12 Phút Bên Chúa</span>
        </a>
        <button
          className="sound-button"
          type="button"
          onClick={() => setMusicOpen((value) => !value)}
          aria-expanded={musicOpen}
          aria-controls="taize-music"
          aria-label={musicOpen ? "Thu gọn nhạc Taizé" : "Mở nhạc Taizé"}
        >
          <span
            className={`sound-waves ${isMusicPlaying ? "is-on" : ""}`}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </span>
          <span>Nhạc Taizé</span>
        </button>
      </header>

      <aside
        className={`music-panel ${musicOpen ? "is-open" : ""}`}
        id="taize-music"
        aria-label="Nhạc nền cầu nguyện Taizé"
        aria-hidden={!musicOpen}
      >
        <div className="music-heading">
          <div>
            <span>Nhạc nền cầu nguyện</span>
            <strong>Nhạc Taizé</strong>
          </div>
          <button
            type="button"
            onClick={() => setMusicOpen(false)}
            aria-label="Thu gọn trình phát nhạc"
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
              {musicEnabled ? "♪" : "—"}
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
            Chưa thể phát nhạc. Hãy chạm Bật nhạc rồi thử lại.
          </p>
        )}
      </aside>

      <section className="prayer-stage" id="top">
        {status === "idle" ? (
          <div className="intro-panel">
            {savedSession ? (
              <div className="resume-card">
                <p className="kicker">Giờ cầu nguyện đang dở</p>
                <h1>Tiếp tục khoảng lặng.</h1>
                <p className="intro-copy">
                  Phiên ngày {savedSession.dateKey.split("-").reverse().join("/")}
                  {" · "}Nhịp {getStageIndex(savedSession.elapsed) + 1}/6
                  {" · "}Còn {formatTime(totalDuration - savedSession.elapsed)}
                </p>
                <button className="primary-action" type="button" onClick={restoreSession}>
                  <span className="play-icon" aria-hidden="true" />
                  Tiếp tục phiên đang dở
                </button>
                <button className="new-session-action" type="button" onClick={begin}>
                  Bắt đầu phiên mới hôm nay
                </button>
                <p className="quiet-note">Nhạc chỉ phát khi bạn chọn tiếp tục.</p>
              </div>
            ) : (
              <>
                <p className="kicker">{dateLabel}</p>
                <h1>Cho tâm hồn một khoảng lặng.</h1>
                <p className="intro-copy">
                  Mười hai phút. Một đoạn Lời Chúa. Một cuộc gặp gỡ thật riêng với Người.
                </p>
                <div className="intro-actions">
                  <button className="primary-action" type="button" onClick={begin}>
                    <span className="play-icon" aria-hidden="true" />
                    Bắt đầu 12 phút
                  </button>
                  <p className="quiet-note">Nhạc Taizé phát cùng giờ cầu nguyện. Bạn có thể tắt nhạc ở nút phía trên.</p>
                </div>
              </>
            )}

            <div className="verse-preview">
              <span>{readingState === "error" ? "Đoạn cầu nguyện dự phòng" : "Tin Mừng hôm nay"}</span>
              {readingState === "loading" ? (
                <p className="reading-loading" role="status">Đang tải Tin Mừng…</p>
              ) : reading ? (
                <>
                  <blockquote className="liturgical-title">
                    {reading.liturgicalDay}
                  </blockquote>
                  <cite>Tin Mừng · {reading.gospelReference}</cite>
                  <a className="source-link" href={reading.sourceUrl} target="_blank" rel="noreferrer">Nguồn bài đọc: {reading.sourceName} ↗</a>
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
          <div className="complete-panel">
            <div className="complete-symbol" aria-hidden="true">
              <span />
            </div>
            <p className="kicker">Bình an của Chúa ở cùng bạn</p>
            <h1>Mười hai phút đã khép lại.<br />Lời Chúa vẫn tiếp tục.</h1>
            <p className="intro-copy">
              Hãy mang câu Lời Chúa vừa chạm đến bạn vào trong mọi cuộc gặp gỡ hôm nay.
            </p>

            <a
              className="learning-card"
              href="https://substack.com/@hoclaideyeuhon"
              target="_blank"
              rel="noreferrer"
              aria-label="Học hiểu thêm giáo lý Công Giáo tại Học lại để yêu hơn"
            >
              <span className="learning-logo" aria-hidden="true">
                <img
                  src="/hoc-lai-de-yeu-hon.png"
                  alt=""
                  width="200"
                  height="200"
                  loading="lazy"
                />
              </span>
              <span className="learning-copy">
                <span className="learning-kicker">Gợi ý sau giờ cầu nguyện</span>
                <strong>Học lại để yêu hơn</strong>
                <span>
                  Tiếp tục đào sâu đức tin qua những bài viết giúp hiểu hơn giáo lý của Hội Thánh Công Giáo.
                </span>
                <em>Khám phá các bài viết <i aria-hidden="true">↗</i></em>
              </span>
            </a>

            <button className="secondary-action" type="button" onClick={restart}>
              Cầu nguyện lại
            </button>
          </div>
        ) : (
          <div className="session-panel">
            <div className="session-topline">
              <div>
                <span className="step-count" aria-live="polite">Nhịp {stageIndex + 1} / {stages.length}</span>
                <strong>{stage.name}</strong>
                <em>{stage.latin}</em>
              </div>
              <time aria-label={`${formatTime(remaining)} còn lại`}>
                {formatTime(remaining)}
              </time>
            </div>

            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} />
            </div>

            <article
              className={`prayer-copy ${stage.reading ? "has-reading" : ""}`}
              key={stage.latin}
            >
              <p className="kicker">{stage.eyebrow}</p>
              <h2>{stage.title}</h2>
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
                  {stage.reading.split(/\n{2,}/).map((paragraph) => (
                    <p key={paragraph.slice(0, 80)}>{paragraph}</p>
                  ))}
                </div>
              )}
              {stage.reading && reading && (
                <a className="source-link session-source" href={reading.sourceUrl} target="_blank" rel="noreferrer">
                  {reading.sourceName} · {reading.date} ↗
                </a>
              )}
              {stage.prompt && <p className="reflection-prompt">{stage.prompt}</p>}
            </article>

            <div className="session-controls">
              <button
                className="round-control"
                type="button"
                onClick={status === "playing" ? pause : resume}
                aria-label={status === "playing" ? "Tạm dừng" : "Tiếp tục"}
              >
                <span className={status === "playing" ? "pause-icon" : "play-icon"} aria-hidden="true" />
              </button>
              <div className="stage-timer" aria-label="Tiến độ của nhịp hiện tại">
                <span style={{ width: `${stageProgress * 100}%` }} />
              </div>
              <button
                className="text-control"
                type="button"
                onClick={skipToNextStage}
              >
                {stageIndex >= stages.length - 1 ? "Hoàn tất" : "Nhịp tiếp"}
              </button>
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
