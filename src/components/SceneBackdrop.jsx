import React from "react";
import { CLOUD_FRAMES, WAVE_FRAMES, BIRD_FRAMES } from "../constants/sceneAssets";

export default function SceneBackdrop({
  beachBg,
  bottleImg,
  cloudFlock,
  cloudDrifting,
  cloudVisible,
  cloudMoveDurationMs,
  activeWaveIndex,
  activeBirdIndex,
  bottleVisible,
  onPickBottle,
}) {
  return (
    <>
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
              ? `transform ${cloudMoveDurationMs}ms linear, opacity 0.75s ease-in-out`
              : "transform 0s linear, opacity 0.75s ease-in-out",
          }}
        >
          <img
            src={CLOUD_FRAMES[cloud.frameIndex]}
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
        {WAVE_FRAMES.map((frameSrc, idx) => (
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
        {BIRD_FRAMES.map((frameSrc, idx) => (
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
        className="floating-bottle"
        onClick={onPickBottle}
        disabled={!bottleVisible}
        aria-hidden={!bottleVisible}
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
          cursor: bottleVisible ? "pointer" : "default",
          opacity: bottleVisible ? 1 : 0,
          pointerEvents: bottleVisible ? "auto" : "none",
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
    </>
  );
}