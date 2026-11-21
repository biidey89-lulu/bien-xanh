import React, { useState } from "react";
import { linkEmailAccount, loginWithEmail } from "../services/shellAuthService";

export default function AccountSyncModal({
  isOpen,
  onClose,
  currentUser,
  onAccountUpdated,
}) {
  const isLinked = Boolean(currentUser?.email);
  const [mode, setMode] = useState(isLinked ? "login" : "link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || password.length < 6) {
      setStatusMessage({
        type: "error",
        text: "Vui lòng nhập email hợp lệ và mật khẩu tối thiểu 6 ký tự.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "link") {
        const { error } = await linkEmailAccount(cleanEmail, password);
        if (error) {
          setStatusMessage({
            type: "error",
            text: error.message || "Không thể liên kết tài khoản.",
          });
          return;
        }

        setStatusMessage({
          type: "success",
          text: "Đã gửi yêu cầu liên kết! Hãy kiểm tra email (nếu bật xác thực) rồi đăng nhập ở thiết bị mới.",
        });
        await onAccountUpdated?.();
      } else {
        const { data, error } = await loginWithEmail(cleanEmail, password);
        if (error) {
          setStatusMessage({
            type: "error",
            text: error.message || "Đăng nhập thất bại. Kiểm tra lại email hoặc mật khẩu.",
          });
          return;
        }

        setStatusMessage({
          type: "success",
          text: `Đăng nhập thành công! Điểm sò hiện tại: ${data?.shells ?? 0}.`,
        });
        await onAccountUpdated?.();
        setTimeout(() => {
          onClose?.();
        }, 700);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "390px",
          borderRadius: "16px",
          backgroundColor: "#0f2942",
          color: "#fffdf7",
          border: "1px solid rgba(186, 230, 253, 0.3)",
          padding: "20px",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.45)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "17px", color: "#bae6fd" }}>
            Liên kết tài khoản &amp; Đổi thiết bị
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              fontSize: "18px",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5 }}>
          {isLinked
            ? `Tài khoản hiện tại đã gắn email: ${currentUser.email}`
            : "Bạn đang chơi ẩn danh. Liên kết email + mật khẩu để giữ điểm sò khi sang thiết bị khác."}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            backgroundColor: "#091929",
            padding: "4px",
            borderRadius: "10px",
            marginBottom: "14px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("link");
              setStatusMessage(null);
            }}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: mode === "link" ? "#38bdf8" : "transparent",
              color: mode === "link" ? "#061826" : "#cbd5e1",
            }}
          >
            Lưu tài khoản này
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStatusMessage(null);
            }}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: mode === "login" ? "#38bdf8" : "transparent",
              color: mode === "login" ? "#061826" : "#cbd5e1",
            }}
          >
            Đăng nhập thiết bị khác
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#e2e8f0" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1px solid #334155",
                backgroundColor: "#071524",
                color: "#fff",
                fontSize: "13px",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "#e2e8f0" }}>
              Mật khẩu (tối thiểu 6 ký tự)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1px solid #334155",
                backgroundColor: "#071524",
                color: "#fff",
                fontSize: "13px",
              }}
            />
          </div>

          {statusMessage && (
            <div
              style={{
                marginBottom: "12px",
                padding: "8px 10px",
                borderRadius: "8px",
                fontSize: "12px",
                backgroundColor:
                  statusMessage.type === "error"
                    ? "rgba(244, 63, 94, 0.2)"
                    : "rgba(16, 185, 129, 0.2)",
                color: statusMessage.type === "error" ? "#fecdd3" : "#a7f3d0",
                border:
                  statusMessage.type === "error"
                    ? "1px solid rgba(244, 63, 94, 0.45)"
                    : "1px solid rgba(16, 185, 129, 0.45)",
              }}
            >
              {statusMessage.text}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #475569",
                backgroundColor: "transparent",
                color: "#e2e8f0",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#38bdf8",
                color: "#061826",
                fontSize: "13px",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.65 : 1,
              }}
            >
              {submitting
                ? "Đang xử lý..."
                : mode === "link"
                ? "Liên kết & Giữ điểm"
                : "Đăng nhập đồng bộ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}