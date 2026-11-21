import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  SCENE_IMAGES,
  AMBIENT_SEA_AUDIO,
  WAVE_FRAMES,
  BIRD_FRAMES,
  CLOUD_FRAMES,
  WAVE_FRAME_DURATION_MS,
  BIRD_FRAME_DURATION_MS,
  CLOUD_MOVE_DURATION_MS,
  CLOUD_CYCLE_MS,
  BOTTLE_INITIAL_DELAY_MS,
  BOTTLE_VISIBLE_DURATION_MS,
  BOTTLE_RESPAWN_DELAY_MS,
  READ_AUTO_CLOSE_MS,
} from "./constants/sceneAssets";
import SceneBackdrop from "./components/SceneBackdrop";
import WriteBottleModal from "./components/WriteBottleModal";
import ReadBottleModal from "./components/ReadBottleModal";
import MyBottlesModal from "./components/MyBottlesModal";
import MenuModal from "./components/MenuModal";
import AccountSyncModal from "./components/AccountSyncModal";
import ShellGameModal from "./game/ShellGameModal";
import { claimDailyLoginBonus, loadRewardState } from "./game/seaLetterRewardEngine";
import {
  changeShells,
  claimDailyShells,
  fetchMyShells,
} from "./services/shellAuthService";
import { pruneOldBottles, MAX_SEA_BOTTLES } from "./utils/bottleRetention";

const SEEN_BOTTLES_KEY = "bien_xanh_seen_bottle_ids";
const MY_BOTTLES_KEY = "bien_xanh_my_bottle_ids";
const VOLUME_STORAGE_KEY = "bien_xanh_sea_volume_v1";
const DAILY_FIVE_SHELL_CLAIMED_KEY = "bien_xanh_daily_5_shell_claimed_day";
const DEFAULT_SEA_VOLUME = 0.28;
const MINIGAME_BG_VOLUME = 0.15;
const DAILY_WELCOME_SHELL_POINTS = 5;

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
    localStorage.setItem(key, JSON.stringify([id, ...current]));
  }
}

function clearIdList(key) {
  localStorage.removeItem(key);
}

function loadInitialVolume() {
  try {
    const saved = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
    if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {
      return saved;
    }
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
  return DEFAULT_SEA_VOLUME;
}

function getLocalDayKey(now = Date.now()) {
  const d = new Date(now);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hasClaimedDailyFiveShells(dayKey) {
  try {
    return localStorage.getItem(DAILY_FIVE_SHELL_CLAIMED_KEY) === dayKey;
  } catch {
    return false;
  }
}

function markClaimedDailyFiveShells(dayKey) {
  try {
    localStorage.setItem(DAILY_FIVE_SHELL_CLAIMED_KEY, dayKey);
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
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

class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          onClick={this.props.onClose}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(9, 30, 58, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fffdf7",
              color: "#1f2937",
              maxWidth: "380px",
              width: "100%",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#b91c1c" }}>
              Lỗi mở mini game Vỏ sò
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#334155",
                wordBreak: "break-word",
              }}
            >
              {this.state.error?.message || "Không xác định được lỗi."}
            </p>
            <button
              type="button"
              onClick={this.props.onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#0284c7",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [modalMode, setModalMode] = useState(null);
  const [currentBottle, setCurrentBottle] = useState(null);
  const [myBottles, setMyBottles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extraNote, setExtraNote] = useState("");

  const [playerUser, setPlayerUser] = useState(null);
  const [rewardState, setRewardState] = useState(() =>
    claimDailyLoginBonus().state
  );
  const [dailyBonusToast, setDailyBonusToast] = useState("");

  const didDailyFiveCheckRef = useRef(false);
  const lastSyncedShellsRef = useRef(null);

  const [bottleVisible, setBottleVisible] = useState(false);
  const bottleTimerRef = useRef(null);
  const pickedInCurrentCycleRef = useRef(false);
  const prevModalModeRef = useRef(null);

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => loadInitialVolume());

  const [activeWaveIndex, setActiveWaveIndex] = useState(0);
  const [activeBirdIndex, setActiveBirdIndex] = useState(0);

  const [cloudFlock, setCloudFlock] = useState(() =>
    createRandomCloudFlock(CLOUD_FRAMES.length)
  );
  const [cloudDrifting, setCloudDrifting] = useState(false);
  const [cloudVisible, setCloudVisible] = useState(true);

  const syncServerShells = useCallback(async (showToastIfClaimed = false) => {
    const now = Date.now();
    const dayKey = getLocalDayKey(now);
    const localInit = claimDailyLoginBonus(now).state;
    const fallbackShells = localInit?.shellPoints ?? 0;

    const profile = await fetchMyShells(fallbackShells);
    if (profile?.user) {
      setPlayerUser(profile.user);
    }

    let authoritativeShells =
      typeof profile?.shells === "number" ? profile.shells : fallbackShells;

    const alreadyClaimedOnServer = profile?.lastDailyClaimDay === dayKey;
    const alreadyClaimedLocally = hasClaimedDailyFiveShells(dayKey);

    if (profile?.user && !alreadyClaimedOnServer && !alreadyClaimedLocally) {
      const serverClaimedShells = await claimDailyShells(
        dayKey,
        DAILY_WELCOME_SHELL_POINTS
      );
      if (typeof serverClaimedShells === "number") {
        authoritativeShells = serverClaimedShells;
        markClaimedDailyFiveShells(dayKey);
        if (showToastIfClaimed) {
          setDailyBonusToast(
            `Bạn nhận được +${DAILY_WELCOME_SHELL_POINTS} điểm sò hôm nay!`
          );
        }
      }
    } else if (alreadyClaimedOnServer) {
      markClaimedDailyFiveShells(dayKey);
    }

    lastSyncedShellsRef.current = authoritativeShells;
    setRewardState((prev) => ({
      ...prev,
      shellPoints: authoritativeShells,
    }));

    return authoritativeShells;
  }, []);

  useEffect(() => {
    const now = Date.now();
    const init = claimDailyLoginBonus(now);
    setRewardState(init.state);

    if (!didDailyFiveCheckRef.current) {
      didDailyFiveCheckRef.current = true;
      syncServerShells(true);
    }

    const interval = setInterval(() => {
      const tickNow = Date.now();
      setRewardState((prev) => {
        const latest = loadRewardState(tickNow);
        if (
          latest.daily.dayKey !== prev.daily.dayKey ||
          latest.daily.lettersSentCount !== prev.daily.lettersSentCount
        ) {
          return {
            ...latest,
            shellPoints: prev.shellPoints,
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [syncServerShells]);

  useEffect(() => {
    if (!dailyBonusToast) return;
    const t = setTimeout(() => setDailyBonusToast(""), 4000);
    return () => clearTimeout(t);
  }, [dailyBonusToast]);

  const handleRewardUpdated = useCallback(
    async (nextState) => {
      const prevShells = lastSyncedShellsRef.current ?? rewardState.shellPoints ?? 0;
      const candidateShells =
        typeof nextState?.shellPoints === "number"
          ? nextState.shellPoints
          : prevShells;
      const diff = Math.trunc(candidateShells - prevShells);

      setRewardState({
        ...nextState,
        shellPoints: prevShells,
      });

      if (diff !== 0) {
        const nextServerShells = await changeShells(diff, 200);
        if (typeof nextServerShells === "number") {
          lastSyncedShellsRef.current = nextServerShells;
          setRewardState((prev) => ({
            ...prev,
            shellPoints: nextServerShells,
          }));
        }
      }
    },
    [rewardState.shellPoints]
  );

  const clearBottleTimer = useCallback(() => {
    if (bottleTimerRef.current) {
      clearTimeout(bottleTimerRef.current);
      bottleTimerRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    scheduleHiddenThenAppear(BOTTLE_INITIAL_DELAY_MS);
    return () => clearBottleTimer();
  }, [scheduleHiddenThenAppear, clearBottleTimer]);

  useEffect(() => {
    if (modalMode !== "read") return;
    const autoCloseTimer = setTimeout(() => setModalMode(null), READ_AUTO_CLOSE_MS);
    return () => clearTimeout(autoCloseTimer);
  }, [modalMode]);

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
      if (fontLink.parentNode) {
        fontLink.parentNode.removeChild(fontLink);
      }
    };
  }, []);

  useEffect(() => {
    if (WAVE_FRAMES.length <= 1) return;
    const timer = setInterval(() => {
      setActiveWaveIndex((prev) => (prev + 1) % WAVE_FRAMES.length);
    }, WAVE_FRAME_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (BIRD_FRAMES.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBirdIndex((prev) => (prev + 1) % BIRD_FRAMES.length);
    }, BIRD_FRAME_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (CLOUD_FRAMES.length <= 1) return;

    let cancelled = false;
    let timerId = null;

    const runCycle = () => {
      if (cancelled) return;
      setCloudDrifting(false);
      setCloudVisible(true);

      timerId = setTimeout(() => {
        if (cancelled) return;
        setCloudDrifting(true);

        timerId = setTimeout(() => {
          if (cancelled) return;
          setCloudVisible(false);

          timerId = setTimeout(() => {
            if (cancelled) return;
            setCloudFlock(createRandomCloudFlock(CLOUD_FRAMES.length));
            setCloudDrifting(false);
            setCloudVisible(true);

            timerId = setTimeout(runCycle, 500);
          }, Math.max(0, CLOUD_CYCLE_MS - 500 - CLOUD_MOVE_DURATION_MS));
        }, Math.max(0, CLOUD_MOVE_DURATION_MS - 150));
      }, 150);
    };

    runCycle();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(AMBIENT_SEA_AUDIO);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // Bỏ qua nếu localStorage bị chặn
    }
    if (!audioRef.current) return;
    audioRef.current.volume =
      modalMode === "minigame" ? Math.min(volume, MINIGAME_BG_VOLUME) : volume;
  }, [volume, modalMode]);

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

  const handleChangeVolume = async (nextVolume) => {
    const clamped = Math.max(0, Math.min(1, Number(nextVolume) || 0));
    setVolume(clamped);

    const audio = audioRef.current;
    if (!audio) return;
    audio.volume =
      modalMode === "minigame" ? Math.min(clamped, MINIGAME_BG_VOLUME) : clamped;

    if (clamped > 0 && audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else if (clamped === 0 && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      const targetVol = volume > 0 ? volume : DEFAULT_SEA_VOLUME;
      if (volume === 0) {
        setVolume(targetVol);
        audio.volume =
          modalMode === "minigame"
            ? Math.min(targetVol, MINIGAME_BG_VOLUME)
            : targetVol;
      }
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

  const handlePickBottle = async () => {
    if (!bottleVisible) return;

    clearBottleTimer();
    pickedInCurrentCycleRef.current = true;
    setBottleVisible(false);

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
      unseenBottles = data;
    }

    const newestPool = unseenBottles.slice(0, 10);
    const olderPool = unseenBottles.slice(10);
    const chosenPool =
      olderPool.length > 0 && Math.random() >= 0.75 ? olderPool : newestPool;

    const chosen = chosenPool[Math.floor(Math.random() * chosenPool.length)];
    addIdToList(SEEN_BOTTLES_KEY, chosen.id);
    setCurrentBottle(chosen);
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

  const handleBottleSaved = async (id) => {
    addIdToList(MY_BOTTLES_KEY, id);
    await pruneOldBottles(MAX_SEA_BOTTLES);
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
        .coin-points-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
          color: #5c3214;
          padding: 0;
          font-family: "Patrick Hand", "Mali", cursive, sans-serif;
          font-size: 36px;
          line-height: 1;
          font-weight: 700;
          text-shadow: 0 2px 6px rgba(255, 253, 247, 0.85);
          z-index: 25;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .coin-points-badge img {
          width: 36px;
          height: 36px;
          object-fit: contain;
          display: block;
        }
        .daily-bonus-banner {
          position: absolute;
          top: 58px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(15, 52, 96, 0.92);
          color: #fffdf7;
          padding: 6px 14px;
          border-radius: 999px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
          z-index: 26;
          pointer-events: none;
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
          transition: opacity 0.45s ease;
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
        .dock-menu-btn img {
          width: 76px;
          height: 76px;
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
        src={SCENE_IMAGES.beachBg}
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
          <div className="coin-points-badge">
            <span>{rewardState.shellPoints}</span>
            <img src={SCENE_IMAGES.coinImg} alt="Coin" />
          </div>

          {dailyBonusToast && (
            <div className="daily-bonus-banner">{dailyBonusToast}</div>
          )}

          <SceneBackdrop
            beachBg={SCENE_IMAGES.beachBg}
            bottleImg={SCENE_IMAGES.bottleImg}
            cloudFlock={cloudFlock}
            cloudDrifting={cloudDrifting}
            cloudVisible={cloudVisible}
            cloudMoveDurationMs={CLOUD_MOVE_DURATION_MS}
            activeWaveIndex={activeWaveIndex}
            activeBirdIndex={activeBirdIndex}
            bottleVisible={bottleVisible}
            onPickBottle={handlePickBottle}
          />

          <div className="bottom-dock">
            <button
              type="button"
              onClick={() => setModalMode("menu")}
              aria-label="Mở menu"
              title="Menu"
              className="dock-slot-btn dock-menu-btn"
            >
              <img src={SCENE_IMAGES.menuImg} alt="Menu" />
            </button>

            <button
              type="button"
              onClick={handleOpenMyBottles}
              aria-label="Thư của tôi"
              title="Thư của tôi"
              className="dock-slot-btn"
            >
              <img src={SCENE_IMAGES.storageImg} alt="Thư của tôi" />
            </button>

            <button
              type="button"
              onClick={async () => {
                await ensureMusicPlaying();
                setModalMode("write");
              }}
              aria-label="Thả chai xuống biển"
              title="Thả chai xuống biển"
              className="dock-slot-btn"
            >
              <img src={SCENE_IMAGES.letterImg} alt="Thả chai xuống biển" />
            </button>

            <button
              type="button"
              onClick={async () => {
                await ensureMusicPlaying();
                setModalMode("minigame");
              }}
              aria-label="Mục 1 - Mini game Vỏ sò"
              title="Mục 1 - Mini game Vỏ sò"
              className="dock-slot-btn"
            >
              <img src={SCENE_IMAGES.gameImg} alt="Mục 1" />
            </button>

            <button
              type="button"
              onClick={() => {
                setExtraNote("Danh mục mới 2 đang chờ bạn đặt tên và tính năng.");
                setModalMode("extra");
              }}
              aria-label="Danh mục mới 2"
              title="Danh mục mới 2"
              className="dock-extra-slot"
            >
              Mục 2
            </button>
          </div>
        </div>
      </div>

      {modalMode === "sync" && (
        <AccountSyncModal
          isOpen={true}
          onClose={() => setModalMode(null)}
          currentUser={playerUser}
          onAccountUpdated={async () => {
            await syncServerShells(false);
          }}
        />
      )}

      {modalMode === "menu" && (
        <MenuModal
          isPlaying={isPlaying}
          volume={volume}
          sonImg={SCENE_IMAGES.sonImg}
          soffImg={SCENE_IMAGES.soffImg}
          accImg={SCENE_IMAGES.accImg}
          onToggleMusic={toggleMusic}
          onChangeVolume={handleChangeVolume}
          onOpenAccountSync={() => setModalMode("sync")}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === "minigame" && (
        <GameErrorBoundary onClose={() => setModalMode(null)}>
          <ShellGameModal onClose={() => setModalMode(null)} />
        </GameErrorBoundary>
      )}

      {modalMode === "extra" && (
        <div
          onClick={() => setModalMode(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 30,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fffdf7",
              color: "#1f2937",
              maxWidth: "360px",
              width: "100%",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#0f3460" }}>Danh mục mới</h3>
            <p style={{ color: "#475569", margin: "0 0 16px 0" }}>{extraNote}</p>
            <button
              type="button"
              onClick={() => setModalMode(null)}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#0284c7",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {modalMode === "read" && (
        <ReadBottleModal
          bottle={currentBottle}
          loading={loading}
          writePanelImg={SCENE_IMAGES.writePanelImg}
          dropImg={SCENE_IMAGES.dropImg}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === "write" && (
        <WriteBottleModal
          writePanelImg={SCENE_IMAGES.writePanelImg}
          dropImg={SCENE_IMAGES.dropImg}
          rewardState={rewardState}
          onClose={() => setModalMode(null)}
          onBottleSaved={handleBottleSaved}
          onRewardUpdated={handleRewardUpdated}
        />
      )}

      {modalMode === "mine" && (
        <MyBottlesModal
          bottles={myBottles}
          loading={loading}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}