export const DEFAULT_LETTER_REWARD_POINTS = 10;
export const DEFAULT_DAILY_LOGIN_POINTS = 15;
export const MIN_LETTER_CHARS = 50;
export const MAX_DAILY_REWARDED_LETTERS = 5;
export const LETTER_COOLDOWN_MS = 60 * 1000; // 60 giây giữa các thư được tính thưởng
export const MAX_RECENT_FINGERPRINTS = 25;

const REWARD_STORAGE_KEY = "bien_xanh_shell_reward_v1";

// Danh sách từ cấm & từ nhạy cảm tiếng Việt (bạn có thể bổ sung thêm trực tiếp tại đây)
export const BLOCKED_TERMS_VI = [
  "dm",
  "dmm",
  "dml",
  "vcl",
  "vl",
  "dit me",
  "du ma",
  "do mat",
  "mat day",
  "oc cho",
  "ngu si",
  "chet tieng",
  "chet di",
  "tu sat",
  "khieu dam",
  "sex",
  "loz",
  "cac",
  "buoi",
  "lon",
  "chim",
  "nha cai",
  "ca do",
  "lo de",
  "tai xiu",
  "no hu",
  "keo nha cai",
  "hack",
  "cheat",
  "lua dao",
];

// Danh sách từ cấm & từ nhạy cảm tiếng Anh (bạn có thể bổ sung thêm trực tiếp tại đây)
export const BLOCKED_TERMS_EN = [
  "fuck",
  "fucker",
  "fucking",
  "fck",
  "shit",
  "shitty",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "whore",
  "slut",
  "porn",
  "pornhub",
  "xvideos",
  "xnxx",
  "nsfw",
  "nude",
  "nudes",
  "rape",
  "suicide",
  "kill yourself",
  "kys",
  "scam",
  "gambling",
  "casino",
  "betting",
  "onlyfans",
];

export function getLocalDayKey(timestampMs = Date.now()) {
  const d = new Date(timestampMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultState(dayKey = getLocalDayKey()) {
  return {
    shellPoints: 0,
    daily: {
      dayKey,
      loginClaimed: false,
      lettersSentCount: 0,
      lastLetterRewardAt: 0,
    },
    recentLetterFingerprints: [],
  };
}

function normalizeState(raw, nowMs = Date.now()) {
  const todayKey = getLocalDayKey(nowMs);
  const base = createDefaultState(todayKey);

  if (!raw || typeof raw !== "object") {
    return base;
  }

  const shellPoints =
    typeof raw.shellPoints === "number" && Number.isFinite(raw.shellPoints)
      ? Math.max(0, Math.floor(raw.shellPoints))
      : 0;

  const rawDaily = raw.daily && typeof raw.daily === "object" ? raw.daily : {};
  const sameDay = rawDaily.dayKey === todayKey;

  const daily = {
    dayKey: todayKey,
    loginClaimed: sameDay ? Boolean(rawDaily.loginClaimed) : false,
    lettersSentCount: sameDay
      ? Math.max(0, Math.floor(Number(rawDaily.lettersSentCount) || 0))
      : 0,
    lastLetterRewardAt: sameDay
      ? Math.max(0, Number(rawDaily.lastLetterRewardAt) || 0)
      : 0,
  };

  const recentLetterFingerprints = Array.isArray(raw.recentLetterFingerprints)
    ? raw.recentLetterFingerprints
        .filter((x) => typeof x === "string" && x.trim().length > 0)
        .slice(0, MAX_RECENT_FINGERPRINTS)
    : [];

  return {
    shellPoints,
    daily,
    recentLetterFingerprints,
  };
}

export function loadRewardState(nowMs = Date.now()) {
  try {
    const rawStr = localStorage.getItem(REWARD_STORAGE_KEY);
    if (!rawStr) {
      return createDefaultState(getLocalDayKey(nowMs));
    }
    const parsed = JSON.parse(rawStr);
    return normalizeState(parsed, nowMs);
  } catch {
    return createDefaultState(getLocalDayKey(nowMs));
  }
}

export function saveRewardState(state, nowMs = Date.now()) {
  const normalized = normalizeState(state, nowMs);
  try {
    localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Bỏ qua nếu localStorage đầy hoặc bị chặn
  }
  return normalized;
}

export function claimDailyLoginBonus(
  nowMs = Date.now(),
  bonusPoints = DEFAULT_DAILY_LOGIN_POINTS
) {
  const current = loadRewardState(nowMs);
  if (current.daily.loginClaimed) {
    return {
      claimed: false,
      bonusPoints: 0,
      state: current,
    };
  }

  const safeBonus = Math.max(0, Math.floor(Number(bonusPoints) || 0));
  const updated = saveRewardState(
    {
      ...current,
      shellPoints: current.shellPoints + safeBonus,
      daily: {
        ...current.daily,
        loginClaimed: true,
      },
    },
    nowMs
  );

  return {
    claimed: safeBonus > 0,
    bonusPoints: safeBonus,
    state: updated,
  };
}

export function getLetterQuotaAndCooldown(state, nowMs = Date.now()) {
  const normalized = normalizeState(state, nowMs);
  const { lettersSentCount, lastLetterRewardAt } = normalized.daily;

  const remainingDailyLetters = Math.max(
    0,
    MAX_DAILY_REWARDED_LETTERS - lettersSentCount
  );
  const reachedDailyCap = remainingDailyLetters <= 0;

  const elapsedSinceLast =
    lastLetterRewardAt > 0 ? Math.max(0, nowMs - lastLetterRewardAt) : Infinity;
  const cooldownRemainingMs =
    lastLetterRewardAt > 0
      ? Math.max(0, LETTER_COOLDOWN_MS - elapsedSinceLast)
      : 0;

  return {
    lettersSentCount,
    maxDailyLetters: MAX_DAILY_REWARDED_LETTERS,
    remainingDailyLetters,
    reachedDailyCap,
    cooldownRemainingMs,
    canSendNow: !reachedDailyCap && cooldownRemainingMs <= 0,
  };
}

function normalizeLetterText(rawText) {
  return String(rawText || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildLetterFingerprint(normalizedText) {
  return normalizedText
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForModeration(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  const leetMap = {
    "@": "a",
    $: "s",
    "0": "o",
    "1": "i",
    "!": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "+": "t",
  };

  const lower = rawText
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .split("")
    .map((ch) => leetMap[ch] ?? ch)
    .join("");

  const collapsedRepeats = lower.replace(/([a-zđ])\1{2,}/g, "$1$1");
  const cleanPunct = collapsedRepeats.replace(
    /[^a-zđàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ\s]/g,
    " "
  );
  const spaced = cleanPunct.replace(/\s+/g, " ").trim();

  const noDiacritics = spaced
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return {
    withDiacritics: spaced,
    withoutDiacritics: noDiacritics.replace(/\s+/g, " ").trim(),
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesPhrase(text, term) {
  if (!text || !term) return false;
  const pattern = new RegExp(`(^|\\s)${escapeRegex(term)}(?=\\s|$)`, "i");
  return pattern.test(text);
}

/**
 * Kiểm tra link / URL hoặc biến thể giấu link.
 */
export function hasForbiddenLink(rawText) {
  if (!rawText || typeof rawText !== "string") return false;
  const text = rawText.trim();
  if (!text) return false;

  const directUrlRegex =
    /(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9-]+\.)+(?:com|vn|net|org|io|gg|me|xyz|shop|link|tk|ml|ga|cf|top|click|site|online|app|dev|co|tv|info|biz|edu|gov|uk|us|jp|kr)(?:\/[^\s<>"']*)?/i;

  if (directUrlRegex.test(text)) {
    return true;
  }

  const obfuscatedLinkRegex =
    /[a-z0-9_-]+\s*(?:\[\.\]|\(\.\)|\{dot\}|\(dot\)|\s+dot\s+)\s*(?:com|vn|net|org|io|gg|me|xyz|shop|link|tk|ml|ga|cf|top|click|site|online|app|dev|co|tv)\b/i;

  return obfuscatedLinkRegex.test(text.toLowerCase());
}

/**
 * Kiểm tra từ cấm / từ nhạy cảm tiếng Việt & tiếng Anh.
 */
export function findBlockedTerm(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { blocked: false, matchedTerm: "" };
  }

  const normalized = normalizeForModeration(rawText);
  if (!normalized) {
    return { blocked: false, matchedTerm: "" };
  }

  const allTerms = [...BLOCKED_TERMS_VI, ...BLOCKED_TERMS_EN];

  for (const rawTerm of allTerms) {
    const cleanTerm = rawTerm
      .toLowerCase()
      .replace(/đ/g, "d")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanTerm) continue;

    if (
      matchesPhrase(normalized.withDiacritics, rawTerm.toLowerCase()) ||
      matchesPhrase(normalized.withoutDiacritics, cleanTerm)
    ) {
      return { blocked: true, matchedTerm: rawTerm };
    }
  }

  return { blocked: false, matchedTerm: "" };
}

/**
 * Kiểm tra an toàn cho cả nickname lẫn content (link, từ cấm & nhạy cảm).
 */
export function evaluateSubmissionSafety({
  content,
  nickname = "",
}) {
  if (hasForbiddenLink(nickname) || hasForbiddenLink(content)) {
    return {
      ok: false,
      reason: "Không được chèn link hoặc đường dẫn vào thư hay biệt danh.",
    };
  }

  const nickCheck = findBlockedTerm(nickname);
  if (nickCheck.blocked) {
    return {
      ok: false,
      reason: "Biệt danh chứa từ ngữ cấm hoặc nhạy cảm.",
    };
  }

  const contentCheck = findBlockedTerm(content);
  if (contentCheck.blocked) {
    return {
      ok: false,
      reason: "Nội dung thư chứa từ ngữ cấm hoặc nhạy cảm.",
    };
  }

  return { ok: true, reason: "Hợp lệ." };
}

/**
 * Kiểm tra chất lượng nội dung thư để chống spam & cấp thưởng.
 */
export function evaluateLetterContent(content, recentFingerprints = []) {
  const normalized = normalizeLetterText(content);
  if (!normalized) {
    return {
      eligible: false,
      reason: "Nội dung thư đang trống.",
      fingerprint: "",
    };
  }

  if (normalized.length < MIN_LETTER_CHARS) {
    return {
      eligible: false,
      reason: `Thư cần tối thiểu ${MIN_LETTER_CHARS} ký tự để nhận thưởng (hiện có ${normalized.length}).`,
      fingerprint: "",
    };
  }

  const compactChars = normalized.replace(/\s+/g, "");
  if (/^(.)\1{9,}$/u.test(compactChars)) {
    return {
      eligible: false,
      reason: "Nội dung lặp ký tự đơn quá nhiều.",
      fingerprint: "",
    };
  }

  const words = normalized.split(" ").filter(Boolean);
  if (words.length >= 4) {
    const freq = new Map();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    const maxCount = Math.max(...freq.values());
    if (maxCount / words.length >= 0.65) {
      return {
        eligible: false,
        reason: "Nội dung lặp lại một từ quá nhiều lần.",
        fingerprint: "",
      };
    }
  }

  const fingerprint = buildLetterFingerprint(normalized);
  if (
    fingerprint &&
    Array.isArray(recentFingerprints) &&
    recentFingerprints.includes(fingerprint)
  ) {
    return {
      eligible: false,
      reason: "Nội dung thư trùng với thư bạn vừa gửi gần đây.",
      fingerprint,
    };
  }

  return {
    eligible: true,
    reason: "Đủ điều kiện nhận thưởng.",
    fingerprint,
  };
}

export function processSeaLetterSubmission({
  content,
  nickname = "",
  rewardPoints = DEFAULT_LETTER_REWARD_POINTS,
  nowMs = Date.now(),
}) {
  const current = loadRewardState(nowMs);
  const safety = evaluateSubmissionSafety({ content, nickname });

  if (!safety.ok) {
    return {
      awarded: false,
      pointsAwarded: 0,
      reason: safety.reason,
      state: current,
    };
  }

  const check = evaluateLetterContent(
    content,
    current.recentLetterFingerprints
  );
  const quota = getLetterQuotaAndCooldown(current, nowMs);

  const nextFingerprints = check.fingerprint
    ? [
        check.fingerprint,
        ...current.recentLetterFingerprints.filter(
          (fp) => fp !== check.fingerprint
        ),
      ].slice(0, MAX_RECENT_FINGERPRINTS)
    : current.recentLetterFingerprints;

  if (!check.eligible) {
    const updatedState = saveRewardState(
      {
        ...current,
        recentLetterFingerprints: nextFingerprints,
      },
      nowMs
    );
    return {
      awarded: false,
      pointsAwarded: 0,
      reason: check.reason,
      state: updatedState,
    };
  }

  if (quota.reachedDailyCap) {
    const updatedState = saveRewardState(
      {
        ...current,
        recentLetterFingerprints: nextFingerprints,
      },
      nowMs
    );
    return {
      awarded: false,
      pointsAwarded: 0,
      reason: `Bạn đã đạt giới hạn nhận thưởng ${MAX_DAILY_REWARDED_LETTERS} lá thư hôm nay.`,
      state: updatedState,
    };
  }

  if (quota.cooldownRemainingMs > 0) {
    const waitSec = Math.ceil(quota.cooldownRemainingMs / 1000);
    const updatedState = saveRewardState(
      {
        ...current,
        recentLetterFingerprints: nextFingerprints,
      },
      nowMs
    );
    return {
      awarded: false,
      pointsAwarded: 0,
      reason: `Vui lòng đợi ${waitSec} giây nữa để tính thưởng cho lá thư tiếp theo.`,
      state: updatedState,
    };
  }

  const safeReward = Math.max(0, Math.floor(Number(rewardPoints) || 0));
  const updatedState = saveRewardState(
    {
      ...current,
      shellPoints: current.shellPoints + safeReward,
      daily: {
        ...current.daily,
        lettersSentCount: current.daily.lettersSentCount + 1,
        lastLetterRewardAt: nowMs,
      },
      recentLetterFingerprints: nextFingerprints,
    },
    nowMs
  );

  return {
    awarded: true,
    pointsAwarded: safeReward,
    reason: `Thư hợp lệ! Bạn nhận được +${safeReward} xu.`,
    state: updatedState,
  };
}