// Bộ âm thanh tổng hợp đa tầng (Filter + Delay reverb nhẹ + Noise + Hợp âm) bằng Web Audio API

class ShellSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.delayNode = null;
    this.feedbackGain = null;
    this.wetGain = null;
    this.noiseBuffer = null;
  }

  ensureContext() {
    if (this.muted) return null;
    if (typeof window === "undefined") return null;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();

      // Master gain tổng
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);

      // Mạch echo / vang nhẹ cho cảm giác biển & lấp lánh
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.14;

      this.feedbackGain = this.ctx.createGain();
      this.feedbackGain.gain.value = 0.24;

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = 0.28;

      this.delayNode.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayNode);
      this.delayNode.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);

      // Tạo sẵn noise buffer 1 giây cho hiệu ứng nước / lướt / xáo trộn
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 1.0;
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  isMuted() {
    return this.muted;
  }

  // Nốt tổng hợp có filter + tùy chọn echo vang
  playSynth({
    freq = 440,
    endFreq = null,
    duration = 0.15,
    type = "sine",
    gain = 0.14,
    delay = 0,
    filterType = "lowpass",
    filterFreq = 2600,
    filterEndFreq = null,
    q = 1.2,
    reverb = false,
  }) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const startTime = ctx.currentTime + delay;
    const stopTime = startTime + duration;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(35, endFreq),
        stopTime
      );
    }

    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(filterFreq, startTime);
    if (filterEndFreq !== null) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(60, filterEndFreq),
        stopTime
      );
    }

    const attack = Math.min(0.018, duration * 0.2);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gain, startTime + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    if (reverb && this.delayNode) {
      env.connect(this.delayNode);
    }

    osc.start(startTime);
    osc.stop(stopTime + 0.02);
  }

  // Tiếng nhiễu lọc qua filter (giả lập bọt nước / lướt / xáo trộn)
  playFilteredNoise({
    duration = 0.12,
    gain = 0.08,
    delay = 0,
    filterType = "bandpass",
    startFreq = 700,
    endFreq = 1600,
    q = 3.5,
    reverb = false,
  }) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;

    const startTime = ctx.currentTime + delay;
    const stopTime = startTime + duration;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(80, endFreq),
      stopTime
    );

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gain, startTime + Math.min(0.015, duration * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    if (reverb && this.delayNode) {
      env.connect(this.delayNode);
    }

    src.start(startTime, Math.random() * 0.5, duration + 0.02);
  }

  // 1. Chạm chọn vỏ sò: bong bóng nước bật nhẹ
  playSelect() {
    this.playSynth({
      freq: 420,
      endFreq: 860,
      duration: 0.08,
      type: "sine",
      gain: 0.13,
      filterType: "bandpass",
      filterFreq: 900,
      filterEndFreq: 1800,
      q: 4,
    });
  }

  // 2. Đổi chỗ 2 vỏ sò: tiếng lướt + đổi vị trí
  playSwap() {
    this.playFilteredNoise({
      duration: 0.11,
      gain: 0.09,
      filterType: "bandpass",
      startFreq: 550,
      endFreq: 1350,
      q: 2.5,
    });
    this.playSynth({
      freq: 340,
      endFreq: 560,
      duration: 0.11,
      type: "triangle",
      gain: 0.11,
      filterFreq: 1900,
    });
  }

  // 3. Không ghép được: tiếng trầm êm + gõ nhẹ không chói
  playInvalid() {
    this.playSynth({
      freq: 195,
      endFreq: 145,
      duration: 0.13,
      type: "sawtooth",
      gain: 0.08,
      filterType: "lowpass",
      filterFreq: 520,
      filterEndFreq: 320,
      q: 2,
    });
    this.playSynth({
      freq: 165,
      endFreq: 120,
      duration: 0.14,
      type: "triangle",
      gain: 0.1,
      delay: 0.075,
      filterType: "lowpass",
      filterFreq: 450,
    });
  }

  // 4. Ghép 3 vỏ sò: tiếng bong bóng vỡ + nốt trong trẻo
  playMatch3() {
    this.playFilteredNoise({
      duration: 0.09,
      gain: 0.1,
      filterType: "bandpass",
      startFreq: 900,
      endFreq: 2200,
      q: 5,
    });
    this.playSynth({
      freq: 587.33, // D5
      endFreq: 783.99, // G5
      duration: 0.14,
      type: "sine",
      gain: 0.14,
      filterFreq: 2800,
      reverb: true,
    });
    this.playSynth({
      freq: 880, // A5
      endFreq: 1046.5, // C6
      duration: 0.16,
      type: "triangle",
      gain: 0.11,
      delay: 0.055,
      filterFreq: 3200,
      reverb: true,
    });
  }

  // 5. Ghép 4 vỏ sò (x1.5): hợp âm mở rộng + vang nhẹ
  playMatch4() {
    this.playFilteredNoise({
      duration: 0.12,
      gain: 0.11,
      filterType: "bandpass",
      startFreq: 1100,
      endFreq: 2600,
      q: 4.5,
      reverb: true,
    });

    const chord = [
      { f: 587.33, end: 659.25, d: 0 },
      { f: 880.0, end: 987.77, d: 0.05 },
      { f: 1174.66, end: 1318.51, d: 0.1 },
    ];

    chord.forEach((n) => {
      this.playSynth({
        freq: n.f,
        endFreq: n.end,
        duration: 0.2,
        type: "triangle",
        gain: 0.13,
        delay: n.d,
        filterType: "lowpass",
        filterFreq: 3600,
        reverb: true,
      });
      this.playSynth({
        freq: n.f * 2,
        endFreq: n.end * 2,
        duration: 0.14,
        type: "sine",
        gain: 0.05,
        delay: n.d + 0.02,
        filterType: "highpass",
        filterFreq: 1200,
        reverb: true,
      });
    });
  }

  // 6. Ghép 5+ vỏ sò (x2.5+): hợp âm rực rỡ + lớp shimmer cao
  playMatch5() {
    this.playFilteredNoise({
      duration: 0.16,
      gain: 0.13,
      filterType: "bandpass",
      startFreq: 1200,
      endFreq: 3400,
      q: 3.5,
      reverb: true,
    });

    const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D major 9th
    notes.forEach((freq, idx) => {
      const start = idx * 0.048;
      this.playSynth({
        freq,
        endFreq: freq * 1.04,
        duration: 0.24,
        type: "triangle",
        gain: 0.12,
        delay: start,
        filterType: "lowpass",
        filterFreq: 4200,
        reverb: true,
      });
      this.playSynth({
        freq: freq * 2,
        endFreq: freq * 2.05,
        duration: 0.18,
        type: "sine",
        gain: 0.06,
        delay: start + 0.02,
        filterType: "highpass",
        filterFreq: 1500,
        reverb: true,
      });
    });
  }

  // 7. Combo rơi liên hoàn: nâng cao độ + lớp cộng hưởng theo bậc combo
  playCombo(comboStep = 2) {
    const step = Math.max(2, comboStep);
    const ratio = Math.pow(1.08, Math.min(8, step - 1));
    const root = 523.25 * ratio;

    this.playFilteredNoise({
      duration: 0.1,
      gain: 0.09,
      filterType: "bandpass",
      startFreq: 900 * ratio,
      endFreq: 2100 * ratio,
      q: 4,
      reverb: true,
    });

    this.playSynth({
      freq: root,
      endFreq: root * 1.25,
      duration: 0.14,
      type: "triangle",
      gain: 0.14,
      delay: 0,
      reverb: true,
    });

    this.playSynth({
      freq: root * 1.25,
      endFreq: root * 1.5,
      duration: 0.18,
      type: "sine",
      gain: 0.13,
      delay: 0.065,
      reverb: true,
    });

    this.playSynth({
      freq: root * 2,
      endFreq: root * 2.25,
      duration: 0.16,
      type: "sine",
      gain: 0.06,
      delay: 0.11,
      filterType: "highpass",
      filterFreq: 1100,
      reverb: true,
    });
  }

  // 8. Tự xáo trộn bàn: sóng nước quét + chuỗi hạt rơi
  playShuffle() {
    this.playFilteredNoise({
      duration: 0.28,
      gain: 0.12,
      filterType: "bandpass",
      startFreq: 400,
      endFreq: 1800,
      q: 2.2,
      reverb: true,
    });

    const seq = [392.0, 493.88, 587.33, 783.99, 987.77];
    seq.forEach((f, idx) => {
      this.playSynth({
        freq: f,
        endFreq: f * 1.03,
        duration: 0.1,
        type: "sine",
        gain: 0.09,
        delay: idx * 0.05,
        reverb: true,
      });
    });
  }

  // 9. Bấm gợi ý: tiếng chuông thủy tinh / tia sáng dẫn đường
  playHint() {
    const notes = [783.99, 1046.5, 1318.51];
    notes.forEach((f, idx) => {
      this.playSynth({
        freq: f,
        endFreq: f * 1.02,
        duration: 0.18,
        type: "sine",
        gain: 0.12,
        delay: idx * 0.065,
        filterType: "bandpass",
        filterFreq: f * 1.8,
        q: 3,
        reverb: true,
      });
    });
  }

  // 10a. Thắng màn: hợp âm chiến thắng nhiều lớp + vang
  playWin() {
    const fanfare = [
      { f: 523.25, d: 0, dur: 0.15 },
      { f: 659.25, d: 0.09, dur: 0.15 },
      { f: 783.99, d: 0.18, dur: 0.16 },
      { f: 1046.5, d: 0.28, dur: 0.36 },
    ];

    fanfare.forEach((n) => {
      this.playSynth({
        freq: n.f,
        endFreq: n.f,
        duration: n.dur,
        type: "triangle",
        gain: 0.14,
        delay: n.d,
        reverb: true,
      });
      this.playSynth({
        freq: n.f * 1.5,
        endFreq: n.f * 1.5,
        duration: n.dur * 0.9,
        type: "sine",
        gain: 0.06,
        delay: n.d + 0.02,
        reverb: true,
      });
    });
  }

  // 10b. Thua màn: giai điệu xuống trầm có filter làm dịu
  playLose() {
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((f, idx) => {
      this.playSynth({
        freq: f,
        endFreq: f * 0.94,
        duration: idx === notes.length - 1 ? 0.3 : 0.14,
        type: "triangle",
        gain: 0.12,
        delay: idx * 0.11,
        filterType: "lowpass",
        filterFreq: 1400,
        filterEndFreq: 600,
        q: 1.8,
        reverb: true,
      });
    });
  }
}

export const shellSound = new ShellSoundEngine();