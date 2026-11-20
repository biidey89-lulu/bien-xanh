import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import beachBg from "./assets/beach-bg.png";
import bottleImg from "./assets/bottle.png";
import letterImg from "./assets/letter.png";
import writePanelImg from "./assets/write-panel.png";
import dropImg from "./assets/drop.png";
import wave1 from "./assets/wave-1.png";
import wave2 from "./assets/wave-2.png";
import wave3 from "./assets/wave-3.png";
import wave4 from "./assets/wave-4.png";
import wave5 from "./assets/wave-5.png";
import wave6 from "./assets/wave-6.png";
import ambientSeaAudio from "./assets/ambient-sea.mp3";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SEEN_BOTTLES_KEY = "bien_xanh_seen_bottle_ids";
const MY_BOTTLES_KEY = "bien_xanh_my_bottle_ids";

const WAVE_FRAME_DURATION_MS = 2000;

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

export default function App() {
  const [modalMode, setModalMode] = useState(null);
  const [currentBottle, setCurrentBottle] = useState(null);
  const [myBottles, setMyBottles] = useState([]);
  const [loading, setLoading] = useState(false);

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const waveFrames = [wave1, wave2, wave3, wave4, wave5, wave6];
  const [activeWaveIndex, setActiveWaveIndex] = useState(0);

  useEffect(() => {
    if (waveFrames.length <= 1) return;
    const timer = setInterval(() => {
      setActiveWaveIndex((prev) => (prev + 1) % waveFrames.length);
    }, WAVE_FRAME_DURATION_MS);
    return () => clearInterval(timer);
  }, [waveFrames.length]);

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

          <button
            type="button"
            onClick={toggleMusic}
            aria-label={isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền"}
            title={isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền"}
            style={{
              position: "absolute",
              top: "14px",
              left: "14px",
              padding: "8px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(15, 52, 96, 0.18)",
              backgroundColor: "rgba(255, 253, 247, 0.88)",
              color: "#0f3460",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.14)",
              zIndex: 20,
            }}
          >
            {isPlaying ? "🔊 Nhạc" : "🔇 Nhạc"}
          </button>

          <button
            type="button"
            onClick={handleOpenMyBottles}
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              padding: "8px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(15, 52, 96, 0.18)",
              backgroundColor: "rgba(255, 253, 247, 0.88)",
              color: "#0f3460",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.14)",
              zIndex: 20,
            }}
          >
            📜 Thư của tôi
          </button>

          <button
            type="button"
            className="floating-bottle"
            onClick={handlePickBottle}
            title="Nhặt chai lên đọc"
            style={{
              position: "absolute",
              left: "40%",
              top: "73%",
              minWidth: "64px",
              minHeight: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              zIndex: 15,
            }}
          >
            <img
              src={bottleImg}
              alt="Chai thư"
              style={{
                position: "relative",
                width: "100px",
                height: "auto",
                display: "block",
              }}
            />
          </button>

          <button
            type="button"
            onClick={async () => {
              await ensureMusicPlaying();
              setStatusMsg("");
              setModalMode("write");
            }}
            aria-label="Thả chai xuống biển"
            title="Thả chai xuống biển"
            style={{
              position: "absolute",
              bottom: "18px",
              right: "14px",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
            }}
          >
            <img
              src={letterImg}
              alt="Thả chai xuống biển"
              style={{
                width: "120px",
                height: "auto",
                display: "block",
              }}
            />
          </button>
        </div>
      </div>

      {modalMode === "read" && (
        <div
          onClick={() => !loading && setModalMode(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(9, 30, 58, 0.45)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            zIndex: 30,
          }}
        >
          <style>{`
            .read-sheet {
              position: relative;
              color-scheme: light;
              background-image: url(${writePanelImg});
              background-size: 100% 100%;
              background-repeat: no-repeat;
              background-position: center;
              background-color: transparent;
              color: #3b2818;
              width: 100%;
              max-width: 520px;
              min-height: 460px;
              max-height: 92dvh;
              overflow-y: auto;
              padding: 72px 86px 126px 86px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .read-title {
              margin: 0 0 14px 0;
              text-align: center;
              font-size: 16px;
              color: #0f3460;
              font-weight: 700;
              flex-shrink: 0;
            }
            .read-body {
              margin: 0;
              font-size: 13.5px;
              line-height: 1.6;
              color: #2b1d12;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .read-close-btn {
              position: absolute;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              padding: 0;
              border: none;
              background: transparent;
              -webkit-appearance: none;
              appearance: none;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              transition: opacity 0.2s ease, transform 0.15s ease;
              z-index: 5;
            }
            .read-close-btn:hover {
              transform: translateX(-50%) scale(1.04);
            }
            .read-close-img {
              width: 108px;
              height: auto;
              display: block;
            }
            @media (max-width: 600px) {
              .read-sheet {
                max-width: 440px;
                min-height: 420px;
                padding: 66px 66px 104px 66px;
              }
              .read-close-btn {
                bottom: 22px;
                left: 50%;
                transform: translateX(-50%);
              }
              .read-close-img {
                width: 94px;
              }
            }
          `}</style>

          <div className="read-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="read-title">
              Thư từ {currentBottle?.nickname || "một người lạ"}
            </h3>
            {loading ? (
              <p className="read-body" style={{ textAlign: "center" }}>
                Đang mở nút bần...
              </p>
            ) : (
              <p className="read-body">{currentBottle?.content}</p>
            )}

            <button
              type="button"
              onClick={() => setModalMode(null)}
              aria-label="Đóng thư"
              title="Đóng thư"
              className="read-close-btn"
            >
              <img
                src={dropImg}
                alt="Đóng thư"
                className="read-close-img"
              />
            </button>
          </div>
        </div>
      )}

      {modalMode === "write" && (
        <div
          onClick={() => !loading && setModalMode(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(9, 30, 58, 0.45)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            zIndex: 30,
          }}
        >
          <style>{`
            .write-sheet {
              position: relative;
              color-scheme: light;
              background-image: url(${writePanelImg});
              background-size: 100% 100%;
              background-repeat: no-repeat;
              background-position: center;
              background-color: transparent;
              color: #3b2818;
              width: 100%;
              max-width: 520px;
              min-height: 460px;
              max-height: 92dvh;
              overflow-y: auto;
              padding: 68px 84px 126px 84px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .write-title {
              margin: 0 0 12px 0;
              text-align: center;
              font-size: 16px;
              color: #0f3460;
              font-weight: 700;
              flex-shrink: 0;
            }
            .write-close-btn {
              position: absolute;
              top: 56px;
              right: 68px;
              width: 28px;
              height: 28px;
              min-width: 28px;
              max-width: 28px;
              flex: 0 0 28px;
              padding: 0;
              border-radius: 999px;
              border: 1px solid rgba(59, 40, 24, 0.35);
              background-color: rgba(255, 250, 238, 0.85);
              -webkit-appearance: none;
              appearance: none;
              color: #3b2818;
              font-size: 13px;
              line-height: 1;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              z-index: 5;
            }
            .write-input {
              width: 100%;
              padding: 7px 10px;
              margin-bottom: 8px;
              border-radius: 7px;
              border: 1px solid rgba(59, 40, 24, 0.3);
              background-color: rgba(255, 252, 244, 0.65);
              -webkit-appearance: none;
              appearance: none;
              color: #2b1d12;
              font-size: 12.5px;
              outline: none;
              box-sizing: border-box;
              flex-shrink: 0;
            }
            .write-input::placeholder,
            .write-textarea::placeholder {
              color: rgba(59, 40, 24, 0.65);
            }
            .write-textarea {
              width: 100%;
              padding: 8px 10px;
              border-radius: 8px;
              border: 1px solid rgba(59, 40, 24, 0.3);
              background-color: rgba(255, 252, 244, 0.65);
              -webkit-appearance: none;
              appearance: none;
              color: #2b1d12;
              font-size: 12.5px;
              line-height: 1.45;
              resize: none;
              min-height: 110px;
              outline: none;
              box-sizing: border-box;
              flex-shrink: 0;
            }
            .write-counter {
              font-size: 11px;
              color: #5c4632;
              text-align: right;
              margin-top: 4px;
              flex-shrink: 0;
            }
            .write-submit-btn {
              position: absolute;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              padding: 0;
              border: none;
              background: transparent;
              -webkit-appearance: none;
              appearance: none;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              transition: opacity 0.2s ease, transform 0.15s ease;
              z-index: 5;
            }
            .write-submit-btn:hover {
              transform: translateX(-50%) scale(1.04);
            }
            .write-submit-btn:disabled {
              opacity: 0.55;
              cursor: not-allowed;
              transform: translateX(-50%);
            }
            .write-submit-img {
              width: 108px;
              height: auto;
              display: block;
            }
            @media (max-width: 600px) {
              .write-sheet {
                max-width: 440px;
                min-height: 440px;
                padding: 64px 66px 106px 66px;
              }
              .write-close-btn {
                top: 52px;
                right: 54px;
              }
              .write-submit-btn {
                bottom: 22px;
                left: 50%;
                transform: translateX(-50%);
              }
              .write-submit-img {
                width: 94px;
              }
            }
          `}</style>

          <form
            className="write-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleDropBottle}
          >
            <button
              type="button"
              onClick={() => setModalMode(null)}
              aria-label="Đóng"
              className="write-close-btn"
            >
              ✕
            </button>

            <h3 className="write-title">Gửi tâm sự vào chai</h3>

            <input
              type="text"
              placeholder="Thư từ: (bỏ trống để ẩn danh)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="write-input"
            />

            <textarea
              rows={4}
              maxLength={500}
              required
              placeholder="Gửi tâm tư ra biển (tối đa 500 ký tự)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="write-textarea"
            />

            <div className="write-counter">{content.length} / 500</div>

            {statusMsg && (
              <p
                style={{
                  color: "#b91c1c",
                  backgroundColor: "transparent",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  marginTop: "4px",
                  marginBottom: 0,
                }}
              >
                {statusMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-label="Thả xuống biển"
              title="Thả xuống biển"
              className="write-submit-btn"
            >
              <img
                src={dropImg}
                alt="Thả xuống biển"
                className="write-submit-img"
              />
            </button>
          </form>
        </div>
      )}

      {modalMode === "mine" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 30,
          }}
        >
          <div
            style={{
              backgroundColor: "#fffdf7",
              color: "#1f2937",
              maxWidth: "440px",
              width: "100%",
              maxHeight: "82vh",
              overflowY: "auto",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ marginTop: 0 }}>📜 Những chiếc chai bạn đã thả</h3>

            {loading ? (
              <p>Đang tìm lại thư của bạn...</p>
            ) : myBottles.length === 0 ? (
              <p style={{ color: "#64748b" }}>
                Bạn chưa thả chiếc chai nào trên trình duyệt này.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {myBottles.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#475569",
                        marginBottom: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <strong>{item.nickname || "Ẩn danh"}</strong>
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("vi-VN")
                          : ""}
                      </span>
                    </div>
                    <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{
                  padding: "9px 18px",
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
        </div>
      )}
    </div>
  );
}