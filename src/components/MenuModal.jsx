import React, { useState } from "react";
import defaultAccImg from "../assets/acc.png";
import { SCENE_IMAGES } from "../constants/sceneAssets";

export default function MenuModal({
  isPlaying,
  volume,
  sonImg,
  soffImg,
  accImg,
  onToggleMusic,
  onChangeVolume,
  onOpenAccountSync,
  onClose,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedAccImg = accImg || SCENE_IMAGES?.accImg || defaultAccImg;

  const rowCardStyle = {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "12px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    color: "#0f3460",
    fontWeight: 700,
    fontSize: "15px",
  };

  const iconStyle = {
    width: "38px",
    height: "38px",
    objectFit: "contain",
    display: "block",
    flexShrink: 0,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 35,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fffdf7",
          color: "#1f2937",
          maxWidth: "350px",
          width: "100%",
          borderRadius: "18px",
          padding: "20px",
          boxShadow: "0 14px 34px rgba(0, 0, 0, 0.38)",
          fontFamily: '"Mali", system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Tiêu đề Menu to rõ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "24px",
              lineHeight: 1.2,
              fontWeight: 700,
              color: "#0f3460",
            }}
          >
            Menu
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng menu"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              lineHeight: 1,
              color: "#64748b",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Đồng bộ thẻ Nhạc nền biển */}
        <div style={{ ...rowCardStyle, marginBottom: "14px" }}>
          <span>Nhạc nền biển</span>
          <button
            type="button"
            onClick={onToggleMusic}
            aria-label={isPlaying ? "Tắt nhạc" : "Bật nhạc"}
            title={isPlaying ? "Tắt nhạc" : "Bật nhạc"}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={isPlaying ? sonImg : soffImg}
              alt={isPlaying ? "Bật nhạc" : "Tắt nhạc"}
              style={iconStyle}
            />
          </button>
        </div>

        {/* Thanh chỉnh âm lượng */}
        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "6px",
              color: "#334155",
            }}
          >
            <span>Âm lượng</span>
            <span>{Math.round((volume ?? 0) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        {/* Đồng bộ thẻ Liên kết tài khoản */}
        <div style={{ marginBottom: "18px" }}>
          <button
            type="button"
            onClick={() => {
              onClose?.();
              onOpenAccountSync?.();
            }}
            aria-label="Liên kết tài khoản"
            title="Liên kết tài khoản"
            style={{
              ...rowCardStyle,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span>Liên kết tài khoản</span>
            {!imgFailed && (
              <img
                src={resolvedAccImg}
                alt="Liên kết tài khoản"
                onError={() => setImgFailed(true)}
                style={iconStyle}
              />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#0284c7",
            color: "#fff",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}