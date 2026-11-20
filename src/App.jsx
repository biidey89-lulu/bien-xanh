import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import beachBg from "./assets/beach-bg.png";
import bottleImg from "./assets/bottle.png";
import letterImg from "./assets/letter.png";
import writePanelImg from "./assets/write-panel.png";
import dropImg from "./assets/drop.png";
import sonImg from "./assets/son.png";
import soffImg from "./assets/soff.png";
import storageImg from "./assets/storage.png";
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
    const timer = setInterval(() => {
      setActiveBirdIndex((prev) => (prev + 1) % birdFrames.length);
    }, BIRD_FRAME_DURATION_MS);
    return () => clearInterval(timer);
  }, [birdFrames.length]);

  useEffect(() => {
    if (cloudFrames.length <= 1) return;

    const pendingTimers = new Set();
    const schedule = (fn, delay) => {
      const id = setTimeout(() => {
        pendingTimers.delete(id);
        fn();
      }, delay);
      pendingTimers.add(id);
      return id;
    };

    const runCycle = () => {
      pendingTimers.forEach((id) => clearTimeout(id));
      pendingTimers.clear();

      setCloudDrifting(false);
      setCloudVisible(true);

      schedule(() => {
        setCloudDrifting(true);
      }, 150);

      schedule(() => {
        setCloudVisible(false);
      }, CLOUD_MOVE_DURATION_MS);

      schedule(() => {
        setCloudFlock(createRandomCloudFlock(cloudFrames.length));
        setCloudDrifting(false);
        setCloudVisible(true);
      }, CLOUD_CYCLE_MS - 500);
    };

    runCycle();

    const interval = setInterval(() => {
      runCycle();
    }, CLOUD_CYCLE_MS);

    return () => {
      clearInterval(interval);
      pendingTimers.forEach((id) => clearTimeout(id));
      pendingTimers.clear();
    };
  }, [cloudFrames.length]);

  useEffect(() => {
    const audio = new Audio(ambientSeaAudio);
    audio.loop = true;
    audio.volume = 0.28;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const ensureMusicPlaying = async () => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const handlePickBottle = async () => {
    await ensureMusicPlaying();
    setLoading(true);
    setModalMode("read");
    setCurrentBottle(null);

    const { data, error } = await supabase
      .from("bottles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6