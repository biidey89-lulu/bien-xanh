import React from "react";

export default function MyBottlesModal({ bottles, loading, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 30, 58, 0.55)",
        backdropFilter: "blur(3px)",
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
          color: "#2b1d12",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "82dvh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "16px",
          boxSizing: "border-box",
          boxShadow: "0 14px 36px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h3 style={{ margin: 0, color: "#0f3460" }}>Thư đã thả của tôi</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#ef4444",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b" }}>
            Đang tải thư của bạn...
          </p>
        ) : bottles.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b" }}>
            Bạn chưa thả chiếc chai nào từ trình duyệt này.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {bottles.map((b) => (
              <div
                key={b.id}
                style={{
                  backgroundColor: "#fefce8",
                  border: "1px solid #fde047",
                  borderRadius: "10px",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#854d0e",
                    marginBottom: "4px",
                  }}
                >
                  Gửi bởi: <strong>{b.nickname || "Ẩn danh"}</strong>
                </div>
                <div
                  style={{
                    fontFamily: '"Patrick Hand", "Mali", cursive, sans-serif',
                    fontSize: "15px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {b.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}