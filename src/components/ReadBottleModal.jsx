import React from "react";

export default function ReadBottleModal({
  bottle,
  loading,
  writePanelImg,
  dropImg,
  onClose,
}) {
  return (
    <div
      onClick={() => !loading && onClose()}
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
          font-family: "Patrick Hand", "Mali", cursive, sans-serif;
          font-size: 16px;
          line-height: 1.65;
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
          .read-body {
            font-size: 15.5px;
            line-height: 1.6;
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
          Thư từ {bottle?.nickname || "một người lạ"}
        </h3>
        {loading ? (
          <p className="read-body" style={{ textAlign: "center" }}>
            Đang mở nút bần...
          </p>
        ) : (
          <p className="read-body">{bottle?.content}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thư"
          title="Đóng thư"
          className="read-close-btn"
        >
          <img src={dropImg} alt="Đóng thư" className="read-close-img" />
        </button>
      </div>
    </div>
  );
}