import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import beachBg from "./assets/beach-bg.png";
import bottleImg from "./assets/bottle.png";
import letterImg from "./assets/letter.png";
import wave1 from "./assets/wave-1.png";
import wave2 from "./assets/wave-2.png";
import wave3 from "./assets/wave-3.png";
import wave4 from "./assets/wave-4.png";
import wave5 from "./assets/wave-5.png";
import wave6 from "./assets/wave-6.png";

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

  const waveFrames = [wave1, wave2, wave3, wave4, wave5, wave6];
  const [activeWaveIndex, setActiveWaveIndex] = useState(0);

  useEffect(() => {
    if (waveFrames.length <= 1) return;
    const timer = setInterval(() => {
      setActiveWaveIndex((prev) => (prev + 1) % waveFrames.length);
    }, WAVE_FRAME_DURATION_MS);
    return () => clearInterval(timer);
  }, [waveFrames.length]);

  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const handlePickBottle = async () => {
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
    alert("🌊 Chiếc chai của bạn đã được thả trôi ra biển!");
  };

  const handleOpenMyBottles = async () => {
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
            📜 Thư tôi thả
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
            onClick={() => {
              setStatusMsg("");
              setModalMode("write");
            }}
            aria-label="Thả chai xuống biển"
            title="Thả chai xuống biển"
            style={{
              position: "absolute",
              bottom: "18px",
              left: "50%",
              transform: "translateX(-50%)",
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
              maxWidth: "420px",
              width: "100%",
              maxHeight: "82vh",
              overflowY: "auto",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              ✉️ Thư từ {currentBottle?.nickname || "một người lạ"}
            </h3>
            {loading ? (
              <p>Đang mở nút bần...</p>
            ) : (
              <p style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {currentBottle?.content}
              </p>
            )}
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
              Đóng thư
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
            backgroundColor: "rgba(9, 30, 58, 0.52)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 30,
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleDropBottle}
            style={{
              backgroundColor: "#fffdf7",
              color: "#1e293b",
              maxWidth: "420px",
              width: "100%",
              maxHeight: "86vh",
              overflowY: "auto",
              borderRadius: "20px",
              padding: "22px",
              border: "1px solid rgba(2, 132, 199, 0.22)",
              boxShadow: "0 18px 42px rgba(9, 30, 58, 0.28)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                marginBottom: "14px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "19px",
                  color: "#0f3460",
                  fontWeight: 700,
                }}
              >
                🌊 Gửi tâm sự vào chai
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                aria-label="Đóng"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor: "rgba(15, 52, 96, 0.08)",
                  color: "#475569",
                  fontSize: "15px",
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Biệt danh (bỏ trống để ẩn danh)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 13px",
                marginBottom: "12px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                fontSize: "14.5px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <textarea
              rows={5}
              maxLength={500}
              required
              placeholder="Viết điều bạn muốn gửi ra biển (tối đa 500 ký tự)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 13px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                fontSize: "14.5px",
                lineHeight: 1.55,
                resize: "vertical",
                minHeight: "110px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                textAlign: "right",
                marginTop: "6px",
                marginBottom: "14px",
              }}
            >
              {content.length} / 500
            </div>

            {statusMsg && (
              <p
                style={{
                  color: "#dc2626",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  fontSize: "13.5px",
                  marginTop: 0,
                  marginBottom: "12px",
                }}
              >
                {statusMsg}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor: loading ? "#7dd3fc" : "#0284c7",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 6px 16px rgba(2, 132, 199, 0.3)",
                }}
              >
                {loading ? "Đang thả..." : "Thả xuống biển"}
              </button>
            </div>
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