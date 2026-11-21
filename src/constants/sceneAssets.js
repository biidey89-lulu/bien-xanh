import beachBg from "../assets/beach-bg.png";
import bottleImg from "../assets/bottle.png";
import letterImg from "../assets/letter.png";
import writePanelImg from "../assets/write-panel.png";
import dropImg from "../assets/drop.png";
import sonImg from "../assets/son.png";
import soffImg from "../assets/soff.png";
import storageImg from "../assets/storage.png";
import gameImg from "../assets/game.png";
import coinImg from "../assets/coin.png";
import menuImg from "../assets/menu.png";
import wave1 from "../assets/wave-1.png";
import wave2 from "../assets/wave-2.png";
import wave3 from "../assets/wave-3.png";
import wave4 from "../assets/wave-4.png";
import wave5 from "../assets/wave-5.png";
import wave6 from "../assets/wave-6.png";
import bird1 from "../assets/bird-1.png";
import bird2 from "../assets/bird-2.png";
import bird3 from "../assets/bird-3.png";
import bird4 from "../assets/bird-4.png";
import bird5 from "../assets/bird-5.png";
import cloud1 from "../assets/cloud-1.png";
import cloud2 from "../assets/cloud-2.png";
import cloud3 from "../assets/cloud-3.png";
import cloud4 from "../assets/cloud-4.png";
import ambientSeaAudio from "../assets/ambient-sea.mp3";

export const SCENE_IMAGES = {
  beachBg,
  bottleImg,
  letterImg,
  writePanelImg,
  dropImg,
  sonImg,
  soffImg,
  storageImg,
  gameImg,
  coinImg,
  menuImg,
};

export const AMBIENT_SEA_AUDIO = ambientSeaAudio;

export const WAVE_FRAMES = [wave1, wave2, wave3, wave4, wave5, wave6];
export const BIRD_FRAMES = [bird1, bird2, bird3, bird4, bird5];
export const CLOUD_FRAMES = [cloud1, cloud2, cloud3, cloud4];

export const WAVE_FRAME_DURATION_MS = 2000;
export const BIRD_FRAME_DURATION_MS = 550;
export const CLOUD_MOVE_DURATION_MS = 87000;
export const CLOUD_CYCLE_MS = 88800;

export const BOTTLE_INITIAL_DELAY_MS = 5000;
export const BOTTLE_VISIBLE_DURATION_MS = 15000;
export const BOTTLE_RESPAWN_DELAY_MS = 30000;
export const READ_AUTO_CLOSE_MS = 180000;