import { useState, useEffect, useCallback, useRef } from "react";
import gamePanelBg from "../assets/game-panel.png";
import shell1 from "../assets/shell-1.png";
import shell2 from "../assets/shell-2.png";
import shell3 from "../assets/shell-3.png";
import shell4 from "../assets/shell-4.png";
import shell5 from "../assets/shell-5.png";
import shell6 from "../assets/shell-6.png";
import shell7 from "../assets/shell-7.png";
import {
  LEVELS_1_TO_20,
  getLevelConfig,
  createInitialBoard,
  getMatchedKeysForSwap,
  resolveSwapTurn,
  findBestHintPair,
  isAdjacent,
} from "./shellMatchEngine";
import { shellSound } from "./shellSoundEngine";

const SHELL_IMAGES = {
  "shell-1": shell1,
  "shell-2": shell2,
  "shell-3": shell3,
  "shell-4": shell4,
  "shell-5": shell5,
  "shell-6": shell6,
  "shell-7": shell7,
};

const TOTAL_LEVELS = 20;

const UNLOCKED_LEVEL_KEY = "bien_xanh_shell_unlocked_level";
const HINT_POINTS_KEY = "bien_xanh_shell_hint_points";
const HINT_NEXT_AT_KEY = "bien_xanh_shell_hint_next_at";
const SOUND_MUTED_KEY = "bien_xanh_shell_sound_muted";

const MAX_HINT_POINTS = 3;
const HINT_REGEN_MS = 15 * 60 * 1000;

const MATCH_FADEOUT_MS = 360;
const SHELL_DROP_MS = 460;
const INVALID_SHAKE_MS = 320;
const HINT_HIGHLIGHT_MS = 2600;

function getInitialMuted() {
  try {
    return localStorage.getItem(SOUND_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function getUnlockedLevel() {
  try {
    const raw = Number(localStorage.getItem(UNLOCKED_LEVEL_KEY) || "1");
    return Math.min(TOTAL_LEVELS, Math.max(1, raw));
  } catch {
    return 1;
  }
}

function saveUnlockedLevel(levelNum) {
  try {
    const current = getUnlockedLevel();
    if (levelNum > current) {
      localStorage.setItem(
        UNLOCKED_LEVEL_KEY,
        String(Math.min(TOTAL_LEVELS, levelNum))
      );
    }
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
}

function syncHintState(now = Date.now()) {
  try {
    const rawPoints = Number(localStorage.getItem(HINT_POINTS_KEY));
    let points = Number.isFinite(rawPoints)
      ? Math.min(MAX_HINT_POINTS, Math.max(0, Math.floor(rawPoints)))
      : MAX_HINT_POINTS;

    const rawNextAt = Number(localStorage.getItem(HINT_NEXT_AT_KEY) || "0");
    let nextAt = Number.isFinite(rawNextAt) && rawNextAt > 0 ? rawNextAt : 0;

    if (points >= MAX_HINT_POINTS) {
      points = MAX_HINT_POINTS;
      nextAt = 0;
    } else if (nextAt > 0 && now >= nextAt) {
      const elapsed = now - nextAt;
      const recovered = 1 + Math.floor(elapsed / HINT_REGEN_MS);
      points = Math.min(MAX_HINT_POINTS, points + recovered);
      if (points >= MAX_HINT_POINTS) {
        points = MAX_HINT_POINTS;
        nextAt = 0;
      } else {
        nextAt = nextAt + recovered * HINT_REGEN_MS;
      }
    } else if (points < MAX_HINT_POINTS && nextAt === 0) {
      nextAt = now + HINT_REGEN_MS;
    }

    localStorage.setItem(HINT_POINTS_KEY, String(points));
    if (nextAt > 0) {
      localStorage.setItem(HINT_NEXT_AT_KEY, String(nextAt));
    } else {
      localStorage.removeItem(HINT_NEXT_AT_KEY);
    }

    return { points, nextAt };
  } catch {
    return { points: MAX_HINT_POINTS, nextAt: 0 };
  }
}

function formatCountdown(msRemaining) {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ShellGameModal({ onClose }) {
  const [isMuted, setIsMuted] = useState(() => getInitialMuted());
  const [unlockedLevel, setUnlockedLevel] = useState(() => getUnlockedLevel());
  const [currentLevelNum, setCurrentLevelNum] = useState(() => getUnlockedLevel());
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const levelConfig = getLevelConfig(currentLevelNum);

  const [board, setBoard] = useState(() =>
    createInitialBoard(levelConfig, { dropIn: true })
  );
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(levelConfig.moves);
  const [selectedPos, setSelectedPos] = useState(null);
  const [gameStatus, setGameStatus] = useState("playing");
  const [toastText, setToastText] = useState("");
  const [turnAnimId, setTurnAnimId] = useState(1);
  const [clearingKeys, setClearingKeys] = useState(() => new Set());
  const [invalidKeys, setInvalidKeys] = useState(() => new Set());
  const [hintKeys, setHintKeys] = useState(() => new Set());
  const [isAnimatingTurn, setIsAnimatingTurn] = useState(false);

  const [hintState, setHintState] = useState(() => syncHintState());
  const [nowTick, setNowTick] = useState(() => Date.now());

  const animTimerRef = useRef(null);
  const shakeTimerRef = useRef(null);
  const hintTimerRef = useRef(null);

  useEffect(() => {
    shellSound.setMuted(isMuted);
    try {
      localStorage.setItem(SOUND_MUTED_KEY, isMuted ? "1" : "0");
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
  }, [isMuted]);

  const clearTimers = useCallback(() => {
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    const refreshHints = () => {
      const now = Date.now();
      setNowTick(now);
      setHintState(syncHintState(now));
    };

    refreshHints();
    const interval = setInterval(refreshHints, 1000);
    return () => clearInterval(interval);
  }, []);

  const startLevel = useCallback(
    (lvlNum) => {
      clearTimers();
      const maxAllowed = getUnlockedLevel();
      const safeLvl = Math.min(
        TOTAL_LEVELS,
        Math.max(1, Math.min(lvlNum, maxAllowed))
      );
      const cfg = getLevelConfig(safeLvl);
      setUnlockedLevel(maxAllowed);
      setCurrentLevelNum(cfg.level);
      setShowLevelPicker(false);
      setBoard(createInitialBoard(cfg, { dropIn: true }));
      setScore(0);
      setMovesLeft(cfg.moves);
      setSelectedPos(null);
      setGameStatus("playing");
      setClearingKeys(new Set());
      setInvalidKeys(new Set());
      setHintKeys(new Set());
      setIsAnimatingTurn(false);
      setTurnAnimId((prev) => prev + 1);
      setHintState(syncHintState());
      setToastText(
        `Level ${cfg.level}: Đạt ${cfg.targetScore} điểm trong ${cfg.moves} lượt`
      );
    },
    [clearTimers]
  );

  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(""), 1800);
    return () => clearTimeout(t);
  }, [toastText]);

  const handleUseHint = () => {
    if (gameStatus !== "playing" || isAnimatingTurn) return;

    const now = Date.now();
    const synced = syncHintState(now);
    setHintState(synced);
    setNowTick(now);

    if (synced.points <= 0) {
      shellSound.playInvalid();
      const remain =
        synced.nextAt > now ? formatCountdown(synced.nextAt - now) : "15:00";
      setToastText(`Hết lượt — hồi 1 sau ${remain}`);
      return;
    }

    const pair = findBestHintPair(board);
    if (!pair) {
      shellSound.playInvalid();
      setToastText("Không tìm thấy nước đi hợp lệ trên bàn");
      return;
    }

    shellSound.playHint();

    const nextPoints = Math.max(0, synced.points - 1);
    const nextAt = synced.nextAt > now ? synced.nextAt : now + HINT_REGEN_MS;

    try {
      localStorage.setItem(HINT_POINTS_KEY, String(nextPoints));
      localStorage.setItem(HINT_NEXT_AT_KEY, String(nextAt));
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }

    setHintState({ points: nextPoints, nextAt });
    setHintKeys(
      new Set([
        `${pair.posA.r},${pair.posA.c}`,
        `${pair.posB.r},${pair.posB.c}`,
      ])
    );
    setToastText(`Còn ${nextPoints}/${MAX_HINT_POINTS}`);

    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = setTimeout(() => {
      setHintKeys(new Set());
      hintTimerRef.current = null;
    }, HINT_HIGHLIGHT_MS);
  };

  const triggerInvalidSwapFeedback = useCallback((posA, posB) => {
    shellSound.playInvalid();
    const pairKeys = new Set([`${posA.r},${posA.c}`, `${posB.r},${posB.c}`]);
    setInvalidKeys(pairKeys);
    setToastText("Chưa tạo chuỗi 3 vỏ sò giống nhau");

    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
    }
    shakeTimerRef.current = setTimeout(() => {
      setInvalidKeys(new Set());
      shakeTimerRef.current = null;
    }, INVALID_SHAKE_MS);
  }, []);

  const handleCellClick = (r, c) => {
    if (gameStatus !== "playing" || isAnimatingTurn) return;

    const clicked = { r, c };
    if (!selectedPos) {
      shellSound.playSelect();
      setSelectedPos(clicked);
      return;
    }

    if (selectedPos.r === r && selectedPos.c === c) {
      shellSound.playSelect();
      setSelectedPos(null);
      return;
    }

    if (!isAdjacent(selectedPos, clicked)) {
      shellSound.playSelect();
      setSelectedPos(clicked);
      return;
    }

    const posA = selectedPos;
    const preview = getMatchedKeysForSwap(board, posA, clicked);
    setSelectedPos(null);
    setHintKeys(new Set());

    if (!preview) {
      triggerInvalidSwapFeedback(posA, clicked);
      return;
    }

    shellSound.playSwap();

    setIsAnimatingTurn(true);
    setInvalidKeys(new Set());
    setBoard(preview.swappedGrid);
    setClearingKeys(preview.clearingKeys);

    clearTimers();
    animTimerRef.current = setTimeout(() => {
      const result = resolveSwapTurn(board, posA, clicked, levelConfig);
      setClearingKeys(new Set());

      if (!result.valid) {
        setIsAnimatingTurn(false);
        return;
      }

      const nextScore = score + result.scoreGain;
      const nextMoves = Math.max(0, movesLeft - 1);

      const maxGroupLen = Math.max(
        3,
        ...result.steps.flatMap((s) => s.groups.map((g) => g.length))
      );

      if (result.steps.length > 1) {
        shellSound.playCombo(result.steps.length);
      } else if (maxGroupLen >= 5) {
        shellSound.playMatch5();
      } else if (maxGroupLen === 4) {
        shellSound.playMatch4();
      } else {
        shellSound.playMatch3();
      }

      if (result.reshuffled) {
        setTimeout(() => shellSound.playShuffle(), 160);
      }

      setBoard(result.grid);
      setTurnAnimId((prev) => prev + 1);
      setScore(nextScore);
      setMovesLeft(nextMoves);
      setIsAnimatingTurn(false);

      if (nextScore >= levelConfig.targetScore) {
        setGameStatus("won");
        if (currentLevelNum < TOTAL_LEVELS) {
          const nextLvl = currentLevelNum + 1;
          saveUnlockedLevel(nextLvl);
          setUnlockedLevel(getUnlockedLevel());
        }
        setTimeout(() => shellSound.playWin(), 220);
        setToastText(`Qua Level ${currentLevelNum}!`);
      } else if (nextMoves <= 0) {
        setGameStatus("lost");
        setTimeout(() => shellSound.playLose(), 220);
        setToastText("Hết lượt đi rồi!");
      } else if (result.reshuffled) {
        setToastText("Hết nước đi — đã tự xáo trộn bàn!");
      } else if (result.steps.length > 1) {
        setToastText(`Combo x${result.steps.length}! +${result.scoreGain}đ`);
      } else if (maxGroupLen >= 5) {
        setToastText(`Ghép ${maxGroupLen} vỏ sò! +${result.scoreGain}đ`);
      } else if (maxGroupLen === 4) {
        setToastText(`Ghép 4 vỏ sò (x1.5)! +${result.scoreGain}đ`);
      }
    }, MATCH_FADEOUT_MS);
  };

  const isHintFull = hintState.points >= MAX_HINT_POINTS;
  const hintCountdownText =
    !isHintFull && hintState.nextAt > nowTick
      ? formatCountdown(hintState.nextAt - nowTick)
      : !isHintFull
      ? "15:00"
      : "";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 30, 58, 0.62)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
        zIndex: 40,
      }}
    >
      <style>{`
        .shell-modal-box {
          width: 100%;
          max-width: 420px;
          max-height: 95dvh;
          overflow-y: auto;
          background-color: #fffdf7;
          color: #2b1d12;
          border-radius: 18px;
          padding: 12px;
          box-sizing: border-box;
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .shell-game-title {
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #164e63;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 6px rgba(14, 116, 144, 0.14);
          line-height: 1.2;
          padding-top: 2px;
        }
        .shell-hud-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .shell-hint-btn {
          padding: 6px 9px;
          border-radius: 10px;
          border: 1px solid #f59e0b;
          background-color: #fef3c7;
          color: #78350f;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .shell-hint-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .shell-level-picker-btn {
          padding: 6px 9px;
          border-radius: 10px;
          border: 1px solid #bae6fd;
          background-color: #e0f2fe;
          color: #0369a1;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        .shell-level-picker-btn.active {
          background-color: #0284c7;
          border-color: #0284c7;
          color: #fff;
        }
        .shell-icon-circle-btn {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background-color: #f1f5f9;
          color: #0f3460;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .shell-icon-circle-btn.active {
          background-color: #0284c7;
          border-color: #0284c7;
          color: #fff;
        }
        .shell-level-modal {
          position: absolute;
          inset: 0;
          background-color: rgba(11, 37, 69, 0.78);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 20;
        }
        .shell-level-card {
          width: 100%;
          max-width: 330px;
          max-height: 86%;
          overflow-y: auto;
          background-color: #fffdf7;
          color: #2b1d12;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 12px;
          line-height: 1.45;
        }
        .shell-guide-list {
          margin: 0;
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .shell-level-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 7px;
        }
        .shell-lvl-item-btn {
          height: 36px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background-color: #f8fafc;
          color: #1e293b;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .shell-lvl-item-btn.current {
          background-color: #0284c7;
          border-color: #0284c7;
          color: #fff;
        }
        .shell-lvl-item-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .shell-close-x-btn {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: none;
          background-color: #ef4444;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .shell-stats-bar {
          position: absolute;
          left: 7%;
          right: 7%;
          bottom: 2.2%;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          background-color: rgba(254, 243, 199, 0.88);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(245, 158, 11, 0.55);
          border-radius: 12px;
          padding: 7px 8px;
          text-align: center;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(15, 52, 96, 0.22);
          z-index: 8;
        }
        .shell-board-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 9 / 14.5;
          background-image: url(${gamePanelBg});
          background-size: 100% 100%;
          background-repeat: no-repeat;
          background-position: center;
          border-radius: 14px;
          overflow: hidden;
        }
        .shell-grid-5x8 {
          position: absolute;
          left: 7%;
          right: 7%;
          top: 6%;
          bottom: 15.3%;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          grid-template-rows: repeat(8, minmax(0, 1fr));
          gap: 3px;
        }
        .shell-cell-btn {
          position: relative;
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
        }
        .shell-cell-btn.selected {
          border-color: #0284c7;
          background-color: rgba(2, 132, 199, 0.22);
          transform: scale(1.05);
          z-index: 2;
        }
        @keyframes shellHintPulse {
          0%, 100% {
            transform: scale(1);
            border-color: #f59e0b;
            background-color: rgba(251, 191, 36, 0.25);
          }
          50% {
            transform: scale(1.08);
            border-color: #fef08a;
            background-color: rgba(251, 191, 36, 0.45);
          }
        }
        .shell-cell-btn.shell-hint {
          animation: shellHintPulse 0.75s ease-in-out infinite;
          z-index: 4;
        }
        @keyframes shellInvalidShake {
          0%, 100% {
            transform: translateX(0);
            border-color: rgba(239, 68, 68, 0.85);
            background-color: rgba(239, 68, 68, 0.18);
          }
          25% {
            transform: translateX(-5px);
            border-color: rgba(239, 68, 68, 0.95);
            background-color: rgba(239, 68, 68, 0.26);
          }
          50% {
            transform: translateX(5px);
            border-color: rgba(239, 68, 68, 0.65);
            background-color: rgba(239, 68, 68, 0.12);
          }
          75% {
            transform: translateX(-3px);
            border-color: rgba(239, 68, 68, 0.9);
            background-color: rgba(239, 68, 68, 0.22);
          }
        }
        .shell-cell-btn.shell-invalid {
          animation: shellInvalidShake ${INVALID_SHAKE_MS}ms ease-in-out;
          z-index: 3;
        }
        @keyframes shellMatchPopOut {
          0% {
            transform: scale(1);
            opacity: 1;
            filter: drop-shadow(0 0 6px rgba(255, 224, 102, 0.85));
          }
          50% {
            transform: scale(1.14);
            opacity: 0.65;
            filter: drop-shadow(0 0 10px rgba(255, 240, 150, 0.95));
          }
          100% {
            transform: scale(0.35);
            opacity: 0;
            filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
          }
        }
        @keyframes shellDropIn {
          0% {
            transform: translateY(-38px) scale(0.92);
            opacity: 0.35;
          }
          72% {
            transform: translateY(4px) scale(1.03);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .shell-cell-btn img {
          width: 82%;
          height: 82%;
          object-fit: contain;
          pointer-events: none;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22));
          transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .shell-cell-btn.shell-clearing img {
          animation: shellMatchPopOut ${MATCH_FADEOUT_MS}ms cubic-bezier(0.35, 0, 0.25, 1) forwards;
          pointer-events: none;
        }
        .shell-cell-btn.shell-dropped img {
          animation: shellDropIn ${SHELL_DROP_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .shell-toast {
          position: absolute;
          left: 50%;
          top: 10px;
          transform: translateX(-50%);
          background-color: rgba(15, 52, 96, 0.9);
          color: #fffdf7;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
        }
        .shell-end-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(11, 37, 69, 0.72);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px;
          text-align: center;
          color: #fffdf7;
          z-index: 15;
        }
        .shell-action-btn {
          padding: 6px 10px;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
      `}</style>

      <div className="shell-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="shell-game-title">Vỏ Sò</div>

        <div className="shell-hud-bar">
          <button
            type="button"
            onClick={handleUseHint}
            disabled={
              hintState.points <= 0 ||
              gameStatus !== "playing" ||
              isAnimatingTurn
            }
            className="shell-hint-btn"
            title={`Tối đa ${MAX_HINT_POINTS} · Hồi 1 mỗi 15 phút`}
          >
            <span>
              💡 {hintState.points}/{MAX_HINT_POINTS}
            </span>
            {!isHintFull && (
              <span style={{ fontSize: "11px", opacity: 0.85 }}>
                ({hintCountdownText})
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => startLevel(currentLevelNum)}
            className="shell-action-btn"
            style={{ backgroundColor: "#e2e8f0", color: "#1e293b" }}
          >
            Chơi lại
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGuideModal(false);
              setShowLevelPicker((prev) => !prev);
            }}
            className={`shell-level-picker-btn ${
              showLevelPicker ? "active" : ""
            }`}
            title="Chọn màn chơi"
          >
            Màn {currentLevelNum}
          </button>
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className={`shell-icon-circle-btn ${isMuted ? "active" : ""}`}
            aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            title={
              isMuted ? "Đang tắt âm (bấm để bật)" : "Đang bật âm (bấm để tắt)"
            }
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLevelPicker(false);
              setShowGuideModal((prev) => !prev);
            }}
            className={`shell-icon-circle-btn ${showGuideModal ? "active" : ""}`}
            aria-label="Hướng dẫn cách chơi và tính điểm"
            title="Cách chơi & tính điểm"
          >
            ?
          </button>
          <button
            type="button"
            onClick={onClose}
            className="shell-close-x-btn"
            aria-label="Đóng"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="shell-board-wrap">
          {toastText && <div className="shell-toast">{toastText}</div>}

          <div className="shell-grid-5x8">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const cellKey = `${r},${c}`;
                const isSelected =
                  selectedPos?.r === r && selectedPos?.c === c;
                const isClearing = clearingKeys.has(cellKey);
                const isInvalid = !isClearing && invalidKeys.has(cellKey);
                const isHinted = !isClearing && hintKeys.has(cellKey);
                const isDropped =
                  !isClearing && Boolean(cell.piece?.justDropped);
                const kind = cell.piece?.kind;
                const imgSrc = kind ? SHELL_IMAGES[kind] : null;
                const baseId = cell.piece?.id || `${r}-${c}`;
                const animKey = isDropped
                  ? `${baseId}-d${turnAnimId}`
                  : baseId;

                return (
                  <button
                    key={animKey}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    className={`shell-cell-btn ${isSelected ? "selected" : ""} ${
                      isHinted ? "shell-hint" : ""
                    } ${isInvalid ? "shell-invalid" : ""} ${
                      isClearing ? "shell-clearing" : ""
                    } ${isDropped ? "shell-dropped" : ""}`}
                    aria-label={`Ô hàng ${r + 1} cột ${c + 1}`}
                  >
                    {imgSrc && <img src={imgSrc} alt={kind} />}
                  </button>
                );
              })
            )}
          </div>

          <div className="shell-stats-bar">
            <div>
              <div>Level {currentLevelNum}</div>
              <strong>{levelConfig.shellCount} loại vỏ</strong>
            </div>
            <div>
              <div>Điểm / Mục tiêu</div>
              <strong>
                {score} / {levelConfig.targetScore}
              </strong>
            </div>
            <div>
              <div>Lượt còn lại</div>
              <strong>{movesLeft}</strong>
            </div>
          </div>

          {showGuideModal && (
            <div
              className="shell-level-modal"
              onClick={() => setShowGuideModal(false)}
            >
              <div
                className="shell-level-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <strong>Cách chơi & Tính điểm</strong>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(false)}
                    className="shell-close-x-btn"
                    style={{ width: "26px", height: "26px", fontSize: "12px" }}
                    aria-label="Đóng hướng dẫn"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <strong>Cách chơi:</strong>
                  <ul className="shell-guide-list">
                    <li>
                      Chạm 2 vỏ sò kề nhau (ngang hoặc dọc) để đổi chỗ và tạo
                      chuỗi từ <strong>3 vỏ sò giống nhau</strong> trở lên.
                    </li>
                    <li>
                      Đạt đủ điểm mục tiêu trước khi hết lượt để mở khóa màn
                      tiếp theo (tổng <strong>20 màn</strong>).
                    </li>
                    <li>
                      Nếu không còn nước đi hợp lệ, bàn chơi sẽ tự động xáo
                      trộn.
                    </li>
                  </ul>
                </div>

                <div>
                  <strong>Cách tính điểm:</strong>
                  <ul className="shell-guide-list">
                    <li>
                      <strong>Ghép 3 vỏ sò:</strong> 30 điểm cơ bản (
                      <strong>1x</strong>).
                    </li>
                    <li>
                      <strong>Ghép 4 vỏ sò:</strong> nhân <strong>1.5x</strong>{" "}
                      (45 điểm).
                    </li>
                    <li>
                      <strong>Ghép 5+ vỏ sò:</strong> nhân <strong>2.5x</strong>{" "}
                      (75 điểm cho 5 ô), cộng thêm <strong>+0.5x</strong> mỗi ô
                      vượt quá 5.
                    </li>
                    <li>
                      <strong>Combo rơi liên hoàn:</strong> mỗi chuỗi rơi tự động
                      tiếp theo tăng thêm <strong>+25%</strong> điểm của bước
                      đó.
                    </li>
                  </ul>
                </div>

                <div>
                  <strong>Gợi ý:</strong> Tối đa <strong>3 điểm</strong>, tự
                  hồi <strong>1 điểm mỗi 15 phút</strong> khi chưa đầy.
                </div>
              </div>
            </div>
          )}

          {showLevelPicker && (
            <div
              className="shell-level-modal"
              onClick={() => setShowLevelPicker(false)}
            >
              <div
                className="shell-level-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <strong>Chọn màn chơi</strong>
                  <button
                    type="button"
                    onClick={() => setShowLevelPicker(false)}
                    className="shell-close-x-btn"
                    style={{ width: "26px", height: "26px", fontSize: "12px" }}
                    aria-label="Đóng bảng chọn màn"
                  >
                    ✕
                  </button>
                </div>

                <div className="shell-level-grid">
                  {LEVELS_1_TO_20.map((lvl) => {
                    const isLocked = lvl.level > unlockedLevel;
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        disabled={isLocked}
                        onClick={() => startLevel(lvl.level)}
                        className={`shell-lvl-item-btn ${
                          lvl.level === currentLevelNum ? "current" : ""
                        }`}
                        title={
                          isLocked
                            ? `Hoàn thành Level ${lvl.level - 1} để mở khóa`
                            : `Level ${lvl.level} · Mục tiêu ${lvl.targetScore}đ · ${lvl.shellCount} loại vỏ`
                        }
                      >
                        {isLocked ? "🔒" : lvl.level}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    textAlign: "center",
                  }}
                >
                  Đã mở khóa {unlockedLevel}/{TOTAL_LEVELS} màn
                </div>
              </div>
            </div>
          )}

          {gameStatus !== "playing" && (
            <div className="shell-end-overlay">
              <h3 style={{ margin: 0 }}>
                {gameStatus === "won"
                  ? `Hoàn thành Level ${currentLevelNum}!`
                  : `Chưa đạt ${levelConfig.targetScore} điểm`}
              </h3>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Điểm đạt được: <strong>{score}</strong> /{" "}
                {levelConfig.targetScore}
              </p>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => startLevel(currentLevelNum)}
                  className="shell-action-btn"
                  style={{ backgroundColor: "#f8fafc", color: "#0f3460" }}
                >
                  Chơi lại màn
                </button>
                {gameStatus === "won" && currentLevelNum < TOTAL_LEVELS && (
                  <button
                    type="button"
                    onClick={() => startLevel(currentLevelNum + 1)}
                    className="shell-action-btn"
                    style={{ backgroundColor: "#0ea5e9", color: "#fff" }}
                  >
                    Level {currentLevelNum + 1} →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}