import React, { useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  DEFAULT_LETTER_REWARD_POINTS,
  MIN_LETTER_CHARS,
  evaluateLetterContent,
  evaluateSubmissionSafety,
  processSeaLetterSubmission,
} from "../game/seaLetterRewardEngine";

export default function WriteBottleModal({
  writePanelImg,
  dropImg,
  rewardState,
  onClose,
  onBottleSaved,
  onRewardUpdated,
}) {
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const safetyCheck = useMemo(
    () => evaluateSubmissionSafety({ content, nickname }),
    [content, nickname]
  );

  const contentCheck = useMemo(
    () => evaluateLetterContent(content, rewardState.recentLetterFingerprints),
    [content, rewardState.recentLetterFingerprints]
  );

  const isLetterValid = contentCheck.eligible && safetyCheck.ok;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedContent = content.trim();
    const trimmedNickname = nickname.trim();
    if (!trimmedContent) return;

    const safety = evaluateSubmissionSafety({
      content: trimmedContent,
      nickname: trimmedNickname,
    });
    if (!safety.ok) {
      setStatusMsg(`Không thể thả chai: ${safety.reason}`);
      return;
    }

    const validation = evaluateLetterContent(
      trimmedContent,
      rewardState.recentLetterFingerprints
    );
    if (!validation.eligible) {
      setStatusMsg(`Chưa thể thả chai: ${validation.reason}`);
      return;
    }

    setLoading(true);
    setStatusMsg("");

    const { data, error } = await supabase
      .from("bottles")
      .insert([
        {
          content: trimmedContent,
          nickname: trimmedNickname || null,
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      setStatusMsg("Có lỗi khi thả chai: " + error.message);
      return;
    }

    if (data?.id && onBottleSaved) {
      onBottleSaved(data.id);
    }

    const now = Date.now();
    const rewardRes = processSeaLetterSubmission({
      content: trimmedContent,
      nickname: trimmedNickname,
      rewardPoints: DEFAULT_LETTER_REWARD_POINTS,
      nowMs: now,
    });

    if (onRewardUpdated) {
      onRewardUpdated(rewardRes.state, now);
    }

    setContent("");
    setNickname("");
    onClose();

    if (rewardRes.awarded) {
      alert(
        `Chiếc chai của bạn đã được thả trôi ra biển!\n${rewardRes.reason} (Tổng: ${rewardRes.state.shellPoints})`
      );
    } else {
      alert(
        `Chiếc chai của bạn đã được thả trôi ra biển!\n(Chưa cộng điểm: ${rewardRes.reason})`
      );
    }
  };

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
          padding: 72px 84px 126px 84px;
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
          border-radius: 8px;
          border: 1px solid rgba(92, 64, 40, 0.35);
          background-color: rgba(255, 252, 244, 0.85);
          color: #2b1d12;
          font-family: "Patrick Hand", "Mali", cursive, sans-serif;
          font-size: 14px;
          box-sizing: border-box;
        }
        .write-textarea {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(92, 64, 40, 0.35);
          background-color: rgba(255, 252, 244, 0.85);
          color: #2b1d12;
          font-family: "Patrick Hand", "Mali", cursive, sans-serif;
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          box-sizing: border-box;
        }
        .write-hint-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
          margin-top: 5px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          line-height: 1.3;
        }
        .write-submit-btn {
          position: absolute;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, opacity 0.2s ease;
          z-index: 5;
        }
        .write-submit-btn:hover:not(:disabled) {
          transform: translateX(-50%) scale(1.04);
        }
        .write-submit-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .write-submit-img {
          width: 108px;
          height: auto;
          display: block;
        }
        @media (max-width: 600px) {
          .write-sheet {
            max-width: 440px;
            min-height: 420px;
            padding: 66px 66px 104px 66px;
          }
          .write-close-btn {
            top: 50px;
            right: 52px;
          }
          .write-submit-btn {
            bottom: 20px;
          }
          .write-submit-img {
            width: 94px;
          }
        }
      `}</style>

      <form
        className="write-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Đóng"
          className="write-close-btn"
        >
          ✕
        </button>

        <h3 className="write-title">Thả thư xuống biển</h3>

        <input
          type="text"
          className="write-input"
          placeholder="Biệt danh của bạn (không bắt buộc)..."
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            if (statusMsg) setStatusMsg("");
          }}
          maxLength={40}
        />

        <textarea
          rows={5}
          className="write-textarea"
          placeholder="Viết đôi dòng gửi ra biển khơi..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (statusMsg) setStatusMsg("");
          }}
          required
        />

        <div
          className="write-hint-row"
          style={{ color: isLetterValid ? "#15803d" : "#78350f" }}
        >
          <span>
            {!safetyCheck.ok
              ? safetyCheck.reason
              : isLetterValid
              ? `✓ Thư hợp lệ (+${DEFAULT_LETTER_REWARD_POINTS} xu)`
              : contentCheck.reason}
          </span>
          <span style={{ whiteSpace: "nowrap", fontWeight: 700 }}>
            {content.trim().length}/{MIN_LETTER_CHARS}+
          </span>
        </div>

        {statusMsg && (
          <p
            style={{
              color: "#b91c1c",
              fontSize: "12px",
              margin: "6px 0 0 0",
            }}
          >
            {statusMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !isLetterValid}
          aria-label="Thả chai xuống biển"
          title="Thả chai xuống biển"
          className="write-submit-btn"
        >
          <img src={dropImg} alt="Thả chai" className="write-submit-img" />
        </button>
      </form>
    </div>
  );
}