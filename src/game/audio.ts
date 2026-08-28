// AudioManager — semua musik & SFX disintesis original via WebAudio (royalty-free)
import type { Settings } from "./save";

export type SfxName =
  | "click"
  | "place"
  | "shoot"
  | "heavy"
  | "frost"
  | "flame"
  | "zap"
  | "boom"
  | "hit"
  | "thud"
  | "die"
  | "coin"
  | "heal"
  | "jump"
  | "spit"
  | "roar"
  | "wave"
  | "win"
  | "lose"
  | "error"
  | "gen"
  | "shield"
  | "sludge"
  | "devour"
  | "shovel";

export class AudioMan {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private settings: Settings = { musicVol: 0.55, sfxVol: 0.8, musicOn: true, sfxOn: true };
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private lastSfx: Record<string, number> = {};

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.applySettings();
    } catch {
      this.ctx = null;
    }
  }

  setSettings(s: Settings) {
    this.settings = { ...s };
    this.applySettings();
  }

  private applySettings() {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    this.musicGain.gain.value = this.settings.musicOn ? this.settings.musicVol * 0.5 : 0;
    this.sfxGain.gain.value = this.settings.sfxOn ? this.settings.sfxVol : 0;
  }

  // ---------- synth helpers ----------
  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    when = 0,
    dest?: AudioNode
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, filterFreq: number, when = 0, type: BiquadFilterType = "lowpass") {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  play(name: SfxName) {
    if (!this.ctx || !this.settings.sfxOn) return;
    const now = performance.now();
    if (this.lastSfx[name] && now - this.lastSfx[name] < 55) return;
    this.lastSfx[name] = now;
    switch (name) {
      case "click":
        this.tone(660, 0.07, "square", 0.12, 480);
        break;
      case "place":
        this.tone(300, 0.12, "sine", 0.25, 540);
        this.noise(0.08, 0.12, 1800, 0, "bandpass");
        break;
      case "shoot":
        this.tone(880, 0.07, "triangle", 0.14, 1400);
        break;
      case "heavy":
        this.tone(190, 0.2, "sine", 0.3, 60);
        this.noise(0.15, 0.18, 700);
        break;
      case "frost":
        this.tone(1300, 0.14, "sine", 0.12, 2500);
        break;
      case "flame":
        this.noise(0.24, 0.2, 900, 0, "bandpass");
        break;
      case "zap":
        this.tone(2300, 0.11, "sawtooth", 0.16, 220);
        this.noise(0.08, 0.12, 4000, 0, "highpass");
        break;
      case "boom":
        this.noise(0.5, 0.5, 420);
        this.tone(130, 0.45, "sine", 0.4, 38);
        break;
      case "hit":
        this.tone(220, 0.05, "square", 0.1);
        break;
      case "thud":
        this.tone(150, 0.09, "sine", 0.22, 70);
        break;
      case "die":
        this.tone(520, 0.16, "triangle", 0.16, 140);
        break;
      case "coin":
        this.tone(1320, 0.06, "sine", 0.14);
        this.tone(1760, 0.1, "sine", 0.14, undefined, 0.06);
        break;
      case "heal":
        this.tone(700, 0.13, "sine", 0.12, 1080);
        break;
      case "jump":
        this.tone(380, 0.13, "sine", 0.14, 820);
        break;
      case "spit":
        this.tone(520, 0.09, "triangle", 0.12, 280);
        break;
      case "roar":
        this.tone(95, 0.65, "sawtooth", 0.32, 48);
        this.noise(0.5, 0.25, 300);
        break;
      case "wave":
        this.tone(523, 0.1, "square", 0.12);
        this.tone(659, 0.12, "square", 0.12, undefined, 0.11);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.2, undefined, i * 0.13));
        this.tone(1319, 0.4, "triangle", 0.18, undefined, 0.55);
        break;
      case "lose":
        this.tone(400, 0.7, "sawtooth", 0.22, 90);
        this.tone(300, 0.8, "triangle", 0.18, 70, 0.1);
        break;
      case "error":
        this.tone(170, 0.13, "square", 0.16, 120);
        break;
      case "gen":
        this.tone(920, 0.09, "sine", 0.11, 1260);
        break;
      case "shield":
        this.tone(1250, 0.07, "square", 0.12, 900);
        break;
      case "sludge":
        this.tone(220, 0.3, "sine", 0.2, 90);
        this.noise(0.25, 0.15, 500);
        break;
      case "devour":
        this.tone(140, 0.3, "sawtooth", 0.28, 50);
        this.noise(0.2, 0.2, 600);
        break;
      case "shovel":
        this.noise(0.12, 0.2, 1200, 0, "bandpass");
        this.tone(240, 0.1, "sine", 0.14, 140);
        break;
    }
  }

  // ---------- musik loop (original, scheduler lookahead) ----------
  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 45);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private schedule() {
    if (!this.ctx || !this.musicGain) return;
    const spb = 60 / 116 / 2; // 116 bpm, not 1/8
    // progresi ceria: C - F - Am - G (2 bar tiap chord, 32 step)
    const bassNotes = [131, 131, 175, 175, 220, 220, 196, 196]; // per 4 step
    const melody = [
      523, 0, 659, 0, 784, 659, 523, 0, 587, 0, 698, 0, 880, 0, 698, 587,
      659, 0, 523, 0, 440, 0, 523, 0, 587, 659, 587, 0, 494, 0, 392, 0,
    ];
    while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
      const s = this.step % 32;
      const when = this.nextNoteTime - this.ctx.currentTime;
      if (s % 4 === 0) {
        const b = bassNotes[Math.floor(s / 4) % bassNotes.length];
        this.tone(b, spb * 3.4, "sine", 0.3, undefined, when, this.musicGain);
      }
      const m = melody[s];
      if (m > 0) this.tone(m, spb * 1.6, "triangle", 0.12, undefined, when, this.musicGain);
      if (s % 2 === 0) this.noise(0.03, 0.045, 7000, when, "highpass");
      this.nextNoteTime += spb;
      this.step++;
    }
  }
}

export const audio = new AudioMan();
