import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import beachBg from "./assets/beach-bg.png";
import bottleImg from "./assets/bottle.png";
import letterImg from "./assets/letter.png";
import writePanelImg from "./assets/write-panel.png";
import dropImg from "./assets/drop.png";
import sonImg from "./assets/son.png";
import soffImg from "./assets/soff.png";
import storageImg from "./assets/storage.png";
import gameImg from "./assets/game.png";
import wave1 from "./assets/wave-1.png";
import wave2 from "./assets/wave-2.png";
import wave3 from "./assets/wave-3.png";
import wave4 from "./assets/wave-4.png";
import wave5 from "./assets/wave-5.png";
import wave6 from "./assets/wave-6.png";
import bird1 from "./assets/bird-1.png";
import bird2 from "./assets/bird-2.png";
import bird3 from "./assets/bird-3.png";
import bird4 from "./assets/bird-4.png";
import bird5 from "./assets/bird-5.png";
import cloud1 from "./assets/cloud-1.png";
import cloud2 from "./assets/cloud-2.png";
import cloud3 from "./assets/cloud-3.png";
import cloud4 from "./assets/cloud-4.png";
import ambientSeaAudio from "./assets/ambient-sea.mp3";
import ShellGameModal from "./game/ShellGameModal";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SEEN_BOTTLES_KEY = "bien_xanh_seen_bottle_ids";
const MY_BOTTLES_KEY = "bien_xanh_my_bottle_ids";

const WAVE_FRAME_DURATION_MS = 2000;
const BIRD_FRAME_DURATION_MS = 550;
const CLOUD_MOVE_DURATION_MS = 87000;
const CLOUD_CYCLE_MS = 88800;

// Cấu hình thời gian xuất hiện / chìm của chai đọc thư và tự đóng thư
const BOTTLE_INITIAL_DELAY_MS = 5000; // Vào bãi biển 5s thì chai xuất hiện
const BOTTLE_VISIBLE_DURATION_MS = 15000; // Không vớt thì 15s sau chìm đi
const BOTTLE_RESPAWN_DELAY_MS = 30000; // Ẩn/chìm xong thì 30s sau hiện lại
const READ_AUTO_CLOSE_MS = 180000; // Mở thư đọc không bấm đóng thì sau 180s tự đóng

function getIdList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addIdToList(key, id) {
  if (!id) return;
  const current = getIdList(key);
  if (!current.includes(id)) {
    const updated = [id, ...current];
    localStorage.setItem(key, JSON.stringify(updated));
  }
}

function clearIdList(key) {
  localStorage.removeItem(key);
}

function createRandomCloudFlock(frameCount) {
  const count = Math.random() < 0.5 ? 2 : 3;
  const minTop = 3;
  const maxTop = 20;

  const slotRanges =
    count === 2
      ? [
          [6, 33],
          [38, 62],
        ]
      : [
          [4, 23],
          [26, 44],
          [46, 63],
        ];

  const shuffledSlots = [...slotRanges].sort(() => Math.random() - 0.5);

  return Array.from({ length: count }, (_, idx) => {
    const [slotMin, slotMax] = shuffledSlots[idx] || [8, 58];
    const leftNum = Math.random() * (slotMax - slotMin) + slotMin;
    const topNum = Math.random() * (maxTop - minTop) + minTop;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = Math.random() * 18 + 14;
    const scale = Number((Math.random() * 0.4 + 0.78).toFixed(2));

    return {
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      frameIndex: Math.floor(Math.random() * frameCount),
      left: `${leftNum.toFixed(1)}%`,
      top: `${topNum.toFixed(1)}%`,
      driftPx: direction * distance,
      scale,
    };
  });
}

export default function App() {
  const [modalMode, setModalMode] = useState(null);
  const [currentBottle, setCurrentBottle] = useState(null);
  const [myBottles, setMyBottles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extraNote, setExtraNote] = useState("");

  // Quản lý vòng đời xuất hiện / chìm của chai
  const [bottleVisible, setBottleVisible] = useState(false);
  const bottleTimerRef = useRef(null);
  const pickedInCurrentCycleRef = useRef(false);
  const prevModalModeRef = useRef(null);

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const waveFrames = [wave1, wave2, wave3, wave4, wave5, wave6];
  const [activeWaveIndex, setActiveWaveIndex] = useState(0);

  const birdFrames = [bird1, bird2, bird3, bird4, bird5];
  const [activeBirdIndex, setActiveBirdIndex] = useState(0);

  const cloudFrames = [cloud1, cloud2, cloud3, cloud4];
  const [cloudFlock, setCloudFlock] = useState(() =>
    createRandomCloudFlock(cloudFrames.length)
  );
  const [cloudDrifting, setCloudDrifting] = useState(false);
  const [cloudVisible, setCloudVisible] = useState(true);

  const clearBottleTimer = useCallback(() => {
    if (bottleTimerRef.current) {
      clearTimeout(bottleTimerRef.current);
      bottleTimerRef.current = null;
    }
  }, []);

  // Lên lịch: chai nổi lên trong 15s, nếu không vớt thì chìm đi và 30s sau hiện lại
  const scheduleVisibleThenSinkAndRespawn = useCallback(() => {
    clearBottleTimer();
    pickedInCurrentCycleRef.current = false;
    setBottleVisible(true);

    bottleTimerRef.current = setTimeout(() => {
      if (pickedInCurrentCycleRef.current) return;
      setBottleVisible(false);

      bottleTimerRef.current = setTimeout(() => {
        if (pickedInCurrentCycleRef.current) return;
        scheduleVisibleThenSinkAndRespawn();
      }, BOTTLE_RESPAWN_DELAY_MS);
    }, BOTTLE_VISIBLE_DURATION_MS);
  }, [clearBottleTimer]);

  // Lên lịch: chai đang ẩn, chờ `delayMs` rồi nổi lên và chạy chu kỳ 15s hiện -> 30s ẩn
  const scheduleHiddenThenAppear = useCallback(
    (delayMs) => {
      clearBottleTimer();
      pickedInCurrentCycleRef.current = false;
      setBottleVisible(false);

      bottleTimerRef.current = setTimeout(() => {
        scheduleVisibleThenSinkAndRespawn();
      }, delayMs);
    },
    [clearBottleTimer, scheduleVisibleThenSinkAndRespawn]
  );

  // Vào bãi biển: chờ 5s đầu rồi chai xuất hiện
  useEffect(() => {
    scheduleHiddenThenAppear(BOTTLE_INITIAL_DELAY_MS);
    return () => {
      clearBottleTimer();
    };
  }, [scheduleHiddenThenAppear, clearBottleTimer]);

  // Tự đóng thư sau 180s nếu đang mở modal đọc thư mà không bấm đóng
  useEffect(() => {
    if (modalMode !== "read") return;

    const autoCloseTimer = setTimeout(() => {
      setModalMode(null);
    }, READ_AUTO_CLOSE_MS);

    return () => {
      clearTimeout(autoCloseTimer);
    };
  }, [modalMode]);

  // Khi khung đọc thư đóng (dù tự đóng sau 180s hay bấm đóng): chờ 30s mới hiện lại chai
  useEffect(() => {
    const wasReading = prevModalModeRef.current === "read";
    prevModalModeRef.current = modalMode;

    if (wasReading && modalMode === null && pickedInCurrentCycleRef.current) {
      scheduleHiddenThenAppear(BOTTLE_RESPAWN_DELAY_MS);
    }
  }, [modalMode, scheduleHiddenThenAppear]);

  useEffect(() => {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Mali:wght@400;600&family=Patrick+Hand&display=swap";
    document.head.appendChild(fontLink);

    return () => {
      document.head.removeChild(fontLink);
    };
  }, []);

  useEffect(() => {
    if (waveFrames.length <= 1) return;
    const timer = setInterval(() => {
      setActiveWaveIndex((prev) => (prev + 1) % waveFrames.length);
    }, WAVE_FRAME_DURATION_MS);
    return () => clearInterval(timer);
  }, [waveFrames.length]);

  useEffect(() => {
    if (birdFrames.length <= 1) return;
    const