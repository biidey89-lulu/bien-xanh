import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import beachBg from "./assets/beach-bg.png";
import bottleImg from "./assets/bottle.png";
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