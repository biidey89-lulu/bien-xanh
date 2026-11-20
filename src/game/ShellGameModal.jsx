import { useState, useEffect, useCallback } from "react";
import gamePanelBg from "../assets/game-panel.png";
import shell1 from "../assets/shell-1.png";
import shell2 from "../assets/shell-2.png";
import shell3 from "../assets/shell-3.png";
import shell4 from "../assets/shell-4.png";
import shell5 from "../assets/shell-5.png";
import shell6 from "../assets/shell-6.png";
import shell7 from "../assets/shell-7.png";
import {
  LEVELS_1_TO_10,
  getLevelConfig,
  createInitialBoard,
  resolveSwapTurn,
  isAdjacent,
} from "./shellMatchEngine";

const SHELL_IMAGES = {
  "shell-1": shell1,
  "shell-2": shell2,
  "shell-3": shell3,
  "shell-4": shell4,
  "shell-5": shell5,
  "shell-6": shell6,
  "shell-7": shell7,
};

const UNLOCKED_LEVEL_KEY = "bien_xanh_shell_unlocked_level";

function getUnlockedLevel() {
  try {
    const raw = Number(localStorage.getItem(UNLOCKED_LEVEL_KEY) || "1");
    return Math.min(10, Math.max(1, raw));
  } catch {
    return 1;
  }
}

function saveUnlockedLevel(levelNum) {
  try {
    const current = getUnlockedLevel();
    if (levelNum > current) {
      localStorage.setItem(UNLOCKED_LEVEL_KEY, String(Math.min(10, levelNum)));
    }
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
}

export default function ShellGameModal({ onClose }) {
  const [unlockedLevel, setUnlockedLevel] = useState(() => getUnlockedLevel());
  const [currentLevelNum, setCurrentLevelNum] = useState(() => getUnlockedLevel());

  const levelConfig = getLevelConfig(currentLevelNum);

  const [board, setBoard] = useState(() => createInitialBoard(levelConfig));
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(levelConfig.moves);
  const [selectedPos, setSelectedPos] = useState(null);
  const [gameStatus, setGameStatus] = useState("playing"); // "playing" | "won" | "lost"
  const [toastText, setToastText] = useState("");

  const startLevel = useCallback((lvlNum) => {
    const maxAllowed = getUnlockedLevel();
    const safeLvl = Math.min(10, Math.max(1, Math.min(lvlNum, maxAllowed)));
    const cfg = getLevelConfig(safeLvl);
    setUnlockedLevel(maxAllowed);
    setCurrentLevelNum(cfg.level);
    setBoard(createInitialBoard(cfg));
    setScore(0);
    setMovesLeft(cfg.moves);
    setSelectedPos(null);
    setGameStatus("playing");
    setToastText(`Level ${cfg.level}: Đạt ${cfg.targetScore} điểm trong ${cfg.moves} lượt`);
  }, []);

  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(""), 1800);
    return () => clearTimeout(t);
  }, [toastText]);

  const handleCellClick = (r, c) => {
    if (gameStatus !== "playing") return;

    const clicked = { r, c };
    if (!selectedPos) {
      setSelectedPos(clicked);
      return;
    }

    if (selectedPos.r === r && selectedPos.c === c) {
      setSelectedPos(null);
      return;
    }

    if (!isAdjacent(selectedPos, clicked)) {
      setSelectedPos(clicked);
      return;
    }

    const result = resolveSwapTurn(board, selectedPos, clicked, levelConfig);
    setSelectedPos(null);

    if (!result.valid) {
      if (result.reason === "no_match") {
        setToastText("Chưa tạo chuỗi 3 vỏ sò giống nhau");
      }
      return;
    }

    const nextScore = score + result.scoreGain;
    const nextMoves = Math.max(0, movesLeft - 1);

    setBoard(result.grid);
    setScore(nextScore);
    setMovesLeft(nextMoves);

    if (nextScore >= levelConfig.targetScore) {
      setGameStatus("won");
      if (currentLevelNum < 10) {
        const nextLvl = currentLevelNum + 1;
        saveUnlockedLevel(nextLvl);
        setUnlockedLevel(getUnlockedLevel());
      }
      setToastText(`Qua Level ${currentLevelNum}!`);
    } else if (nextMoves <= 0) {
      setGameStatus("lost");
      setToastText("Hết lượt đi rồi!");
    } else if (result.reshuffled) {
      setToastText("Hết nước đi — đã tự xáo trộn bàn!");
    } else if (result.steps.length > 1) {
      setToastText(`Combo x${result.steps.length}! +${result.scoreGain}đ`);
    }
  };

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
          gap: 10px;
        }
        .shell-hud-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .shell-stats-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          background-color: #fef3c7;
          border: 1px solid #f59e0b66;
          border-radius: 12px;
          padding: 8px;
          text-align: center;
          font-size: 12px;
        }
        .shell-level-strip {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .shell-lvl-btn {
          min-width: 30px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #f8fafc;
          color: #1e293b;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
        }
        .shell-lvl-btn.active {
          background-color: #0284c7;
          border-color: #0284c7;
          color: #fff;
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
          left: 11.5%;
          right: 11.5%;
          top: 6.2%;
          bottom: 7.2%;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(8, 1fr);
          gap: 2px;
        }
        .shell-cell-btn {
          position: relative;
          width: 100%;
          height: 100%;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 10px;
          padding: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease, border-color 0.12s ease, background-color 0.12s ease;
        }
        .shell-cell-btn.selected {
          border-color: #0284c7;
          background-color: rgba(2, 132, 199, 0.22);
          transform: scale(1.06);
          z-index: 2;
        }
        .shell-cell-btn img {
          width: 86%;
          height: 86%;
          object-fit: contain;
          pointer-events: none;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22));
        }
        .shell-toast {
          position: absolute;
          left: 50%;
          top: 12px;
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
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
      `}</style>

      <div className="shell-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="shell-hud-top">
          <strong>🐚 Vỏ Sò Biển Xanh (10 Level)</strong>
          <div style={{ display: "flex", gap: "6px" }}>
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
              onClick={onClose}
              className="shell-action-btn"
              style={{ backgroundColor: "#ef4444", color: "#fff" }}
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="shell-level-strip">
          {LEVELS_1_TO_10.map((lvl) => {
            const isLocked = lvl.level > unlockedLevel;
            return (
              <button
                key={lvl.level}
                type="button"
                disabled={isLocked}
                onClick={() => startLevel(lvl.level)}
                className={`shell-lvl-btn ${
                  lvl.level === currentLevelNum ? "active" : ""
                }`}
                style={
                  isLocked
                    ? { opacity: 0.45, cursor: "not-allowed" }
                    : undefined
                }
                title={
                  isLocked
                    ? `Hoàn thành Level ${lvl.level - 1} để mở khóa`
                    : `Level ${lvl.level} - Mục tiêu ${lvl.targetScore}đ - ${lvl.shellCount} loại vỏ`
                }
              >
                {isLocked ? "🔒" : lvl.level}
              </button>
            );
          })}
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

        <div className="shell-board-wrap">
          {toastText && <div className="shell-toast">{toastText}</div>}

          <div className="shell-grid-5x8">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isSelected =
                  selectedPos?.r === r && selectedPos?.c === c;
                const kind = cell.piece?.kind;
                const imgSrc = kind ? SHELL_IMAGES[kind] : null;

                return (
                  <button
                    key={cell.piece?.id || `${r}-${c}`}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    className={`shell-cell-btn ${isSelected ? "selected" : ""}`}
                    aria-label={`Ô hàng ${r + 1} cột ${c + 1}`}
                  >
                    {imgSrc && <img src={imgSrc} alt={kind} />}
                  </button>
                );
              })
            )}
          </div>

          {gameStatus !== "playing" && (
            <div className="shell-end-overlay">
              <h3 style={{ margin: 0 }}>
                {gameStatus === "won"
                  ? `🎉 Hoàn thành Level ${currentLevelNum}!`
                  : `🌊 Chưa đạt ${levelConfig.targetScore} điểm`}
              </h3>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Điểm đạt được: <strong>{score}</strong> / {levelConfig.targetScore}
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
                {gameStatus === "won" && currentLevelNum < 10 && (
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

        <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center" }}>
          Đã mở khóa đến Level {unlockedLevel}/10 · Chạm 2 ô liền kề để đổi chỗ
        </div>
      </div>
    </div>
  );
}