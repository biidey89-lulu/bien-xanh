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
  const [extraNote, setExtraNote] = useState("");

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
      .limit(60);

    setLoading(false);

    if (error) {
      setCurrentBottle({
        nickname: "Biển cả",
        content: "Không thể vớt chai lúc này: " + error.message,
      });
      return;
    }

    if (!data || data.length === 0) {
      setCurrentBottle({
        nickname: "Biển cả",
        content:
          "Chưa có lá thư nào trôi dạt hôm nay. Hãy là người đầu tiên thả một chiếc chai nhé!",
      });
      return;
    }

    let seenIds = getIdList(SEEN_BOTTLES_KEY);
    let unseenBottles = data.filter((item) => !seenIds.includes(item.id));

    if (unseenBottles.length === 0) {
      clearIdList(SEEN_BOTTLES_KEY);
      seenIds = [];
      unseenBottles = data;
    }

    const newestPool = unseenBottles.slice(0, 10);
    const olderPool = unseenBottles.slice(10);

    let chosenPool = newestPool;
    if (olderPool.length > 0 && Math.random() >= 0.75) {
      chosenPool = olderPool;
    }

    const chosen = chosenPool[Math.floor(Math.random() * chosenPool.length)];
    addIdToList(SEEN_BOTTLES_KEY, chosen.id);
    setCurrentBottle(chosen);
  };

  const handleDropBottle = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setStatusMsg("");

    const { data, error } = await supabase
      .from("bottles")
      .insert([
        {
          content: content.trim(),
          nickname: nickname.trim() || null,
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      setStatusMsg("Có lỗi khi thả chai: " + error.message);
      return;
    }

    if (data?.id) {
      addIdToList(MY_BOTTLES_KEY, data.id);
    }

    setContent("");
    setNickname("");
    setModalMode(null);
    alert("Chiếc chai của bạn đã được thả trôi ra biển!");
  };

  const handleOpenMyBottles = async () => {
    await ensureMusicPlaying();
    setModalMode("mine");
    setLoading(true);
    setMyBottles([]);

    const myIds = getIdList(MY_BOTTLES_KEY);
    if (myIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("bottles")
      .select("*")
      .in("id", myIds)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (!error && data) {
      setMyBottles(data);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "#0b2545",
      }}
    >
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .scene-frame {
          position: relative;
          width: 100%;
          max-width: 56.25dvh;
          height: 100%;
          max-height: 100dvh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        }
        @media (max-aspect-ratio: 9/16) {
          .scene-frame {
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 100dvh;
            aspect-ratio: 9 / 16;
          }
        }
        .sky-clouds-layer {
          position: absolute;
          width: 33.33%;
          height: 12%;
          pointer-events: none;
          overflow: hidden;
          transform-origin: center center;
          will-change: transform, opacity;
          z-index: 4;
        }
        .wave-overlay {
          position: absolute;
          left: -6%;
          top: 37.5%;
          width: 108%;
          height: 61.5%;
          pointer-events: none;
          overflow: hidden;
          z-index: 5;
        }
        @keyframes flockDrift {
          0%, 100% {
            transform: translate(0px, 0px);
          }
          50% {
            transform: translate(6px, -4px);
          }
        }
        .sky-birds-layer {
          position: absolute;
          left: 6%;
          top: 4%;
          width: 88%;
          aspect-ratio: 1 / 1;
          pointer-events: none;
          overflow: hidden;
          animation: flockDrift 14s ease-in-out infinite;
          z-index: 6;
        }
        @keyframes bottleFloat {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(-5deg);
          }
          50% {
            transform: translate(-50%, calc(-50% - 8px)) rotate(5deg);
          }
        }
        .floating-bottle {
          animation: bottleFloat 3.2s ease-in-out infinite;
        }
        .bottom-dock {
          position: absolute;
          bottom: 44px;
          left: 6px;
          right: 6px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          align-items: center;
          justify-items: center;
          gap: 4px;
          z-index: 20;
        }
        .dock-slot-btn {
          width: 112px;
          height: 112px;
          max-width: 100%;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease;
        }
        .dock-slot-btn:hover {
          transform: scale(1.06);
        }
        .dock-slot-btn img {
          width: 108px;
          height: 108px;
          max-width: 100%;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.28));
        }
        .dock-extra-slot {
          width: 96px;
          height: 96px;
          max-width: 100%;
          border-radius: 16px;
          border: 1.5px dashed rgba(255, 253, 247, 0.65);
          background-color: rgba(11, 37, 69, 0.28);
          color: rgba(255, 253, 247, 0.9);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.2;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4px;
          backdrop-filter: blur(4px);
          transition: transform 0.15s ease, background-color 0.2s ease;
        }
        .dock-extra-slot:hover {
          transform: scale(1.05);
          background-color: rgba(11, 37, 69, 0.45);
        }
      `}</style>

      <img
        src={beachBg}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-24px",
          width: "calc(100% + 48px)",
          height: "calc(100% + 48px)",
          objectFit: "cover",
          filter: "blur(22px) brightness(0.88)",
          transform: "scale(1.06)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <div className="scene-frame">
          <img
            src={beachBg}
            alt="Bãi biển"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />

          {cloudFlock.map((cloud) => (
            <div
              key={cloud.id}
              aria-hidden="true"
              className="sky-clouds-layer"
              style={{
                left: cloud.left,
                top: cloud.top,
                opacity: cloudVisible ? 0.92 : 0,
                transform: `translateX(${cloudDrifting ? cloud.driftPx : 0}px) scale(${cloud.scale})`,
                transition: cloudDrifting
                  ? `transform ${CLOUD_MOVE_DURATION_MS}ms linear, opacity 0.75s ease-in-out`
                  : "transform 0s linear, opacity 0.75s ease-in-out",
              }}
            >
              <img
                src={cloudFrames[cloud.frameIndex]}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          ))}

          <div aria-hidden="true" className="wave-overlay">
            {waveFrames.map((frameSrc, idx) => (
              <img
                key={idx}
                src={frameSrc}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  opacity: idx === activeWaveIndex ? 1 : 0,
                  transition: "opacity 0.35s ease-in-out",
                }}
              />
            ))}
          </div>

          <div aria-hidden="true" className="sky-birds-layer">
            {birdFrames.map((frameSrc, idx) => (
              <img
                key={idx}
                src={frameSrc}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  opacity: idx === activeBirdIndex ? 1 : 0,
                  transition: "opacity 0.08s linear",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            className="floating-bottle