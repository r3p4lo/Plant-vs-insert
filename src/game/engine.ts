// ============================================================
// Garden Guardians — Game Engine (canvas, object pooling, waves, boss)
// ============================================================
import {
  UNIT_MAP,
  MONSTER_MAP,
  BOSS_MAP,
  unitStats,
  upgradeCost,
  MAX_UPGRADE,
  bossHpMul,
} from "./data";
import type { LevelDef, UnitDef, MonsterDef } from "./data";
import type { AudioMan } from "./audio";

// ---------- layout logis ----------
export const W = 1280;
export const H = 720;
export const COLS = 9;
export const ROWS = 5;
const SKY = 150;
const BASE_W = 142;
const SPAWN_W = 74;
const GRID_X0 = BASE_W + 10;
const GRID_X1 = W - SPAWN_W - 8;
const GRID_Y0 = SKY + 14;
const GRID_Y1 = H - 8;
const CELL_W = (GRID_X1 - GRID_X0) / COLS;
const CELL_H = (GRID_Y1 - GRID_Y0) / ROWS;
const BASE_X = GRID_X0 - 6;
const ENERGY_MAX = 2000;

const cellX = (c: number) => GRID_X0 + CELL_W * (c + 0.5);
const laneY = (r: number) => GRID_Y0 + CELL_H * (r + 0.5);

// ---------- pools ----------
class Pool<T> {
  private items: T[] = [];
  constructor(private factory: () => T) {}
  get(): T {
    return this.items.pop() ?? this.factory();
  }
  release(v: T) {
    if (this.items.length < 400) this.items.push(v);
  }
}

interface Projectile {
  kind: "seed" | "stone" | "frost" | "gunk";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  row: number;
  slowDur: number;
  splash: number;
  color: string;
  r: number;
}
interface Particle {
  kind: "circle" | "spark" | "smoke" | "confetti" | "bubble" | "butterfly" | "ring";
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
}
interface FloatText {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  str: string;
  color: string;
  size: number;
}
interface Beam {
  pts: { x: number; y: number }[];
  ttl: number;
  max: number;
  color: string;
}

// ---------- entities ----------
interface UnitEnt {
  def: UnitDef;
  row: number;
  col: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atkCd: number;
  genT: number;
  fuseT: number;
  recoil: number;
  stunT: number;
  hitT: number;
  charge: number;
  pulse: number;
}
interface MonsterEnt {
  def: MonsterDef;
  row: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  slowT: number;
  burnT: number;
  burnDps: number;
  hitT: number;
  atkCd: number;
  attackT: number;
  jumped: boolean;
  jumpT: number;
  jumpFromX: number;
  jumpToX: number;
  abilityT: number;
  enraged: boolean;
  dead: boolean;
  dieT: number;
  seed: number;
  boss: boolean;
  dmgMul: number;
  spdMul: number;
  hpMul: number;
}
interface Taint {
  row: number;
  col: number;
  t: number;
}

// ---------- HUD snapshot ----------
export interface CardInfo {
  id: string;
  name: string;
  tag: string;
  cost: number;
  unlocked: boolean;
  affordable: boolean;
  cdFrac: number; // 0 = siap
  cdLeft: number;
}
export interface SelUnitInfo {
  row: number;
  col: number;
  id: string;
  name: string;
  tag: string;
  lvl: number;
  hp: number;
  maxHp: number;
  dmg: number;
  rate: number;
  range: number;
  gen: number;
  upCost: number;
  maxed: boolean;
}
export interface HudSnapshot {
  energy: number;
  baseHp: number;
  baseMax: number;
  wave: number;
  totalWaves: number;
  state: "prep" | "wave" | "won" | "lost";
  countdown: number;
  cards: CardInfo[];
  kills: number;
  boss: { name: string; title: string; hp: number; max: number } | null;
  speed: number;
  paused: boolean;
  selected: string | null;
  shovel: boolean;
  selUnit: SelUnitInfo | null;
  banner: { text: string; sub: string; key: number } | null;
  level: number;
  tier: string;
  tierColor: string;
}
export interface EndResult {
  win: boolean;
  level: number;
  kills: number;
  sessionCoins: number;
  coinsEarned: number;
  expEarned: number;
  nodmg: boolean;
  stars: number;
  baseHpLeft: number;
}
export interface EngineCallbacks {
  onHud: (h: HudSnapshot) => void;
  onEnd: (r: EndResult) => void;
}

// ============================================================
export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelDef;
  private upgrades: Record<string, number>;
  private audio: AudioMan;
  private cb: EngineCallbacks;

  private raf = 0;
  private last = 0;
  private dead = false;
  private animT = 0;
  private hudAcc = 0;

  private viewW = 0;
  private viewH = 0;
  private scale = 1;
  private ox = 0;
  private oy = 0;
  private dpr = 1;

  // state
  private state: "prep" | "wave" | "won" | "lost" = "prep";
  private waveIdx = 0;
  private countdown = 10;
  private waveTime = 0;
  private spawnPtr = 0;
  private endSent = false;
  private endT = 0;

  private energy: number;
  private baseHp: number;
  private baseMax: number;
  private baseHitT = 0;
  private paused = false;
  private speed = 1;
  private shake = 0;

  private units: UnitEnt[] = [];
  private monsters: MonsterEnt[] = [];
  private taints: Taint[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private beams: Beam[] = [];

  private pPool = new Pool<Projectile>(() => ({
    kind: "seed", x: 0, y: 0, vx: 0, vy: 0, dmg: 0, row: 0,
    slowDur: 0, splash: 0, color: "#fff", r: 5,
  }));
  private fxPool = new Pool<Particle>(() => ({
    kind: "circle", x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 0, maxLife: 1,
    size: 4, color: "#fff", rot: 0, vr: 0,
  }));
  private txPool = new Pool<FloatText>(() => ({
    x: 0, y: 0, life: 0, maxLife: 1, str: "", color: "#fff", size: 16,
  }));

  private cardCd: Record<string, number> = {};
  private selectedCard: string | null = null;
  private shovelMode = false;
  private selUnit: UnitEnt | null = null;
  private hover: { row: number; col: number } | null = null;

  private kills = 0;
  private sessionCoins = 0;
  private banner: { text: string; sub: string; key: number; t: number } | null = null;
  private bannerKey = 0;
  private ambientT = 0;
  private clouds = Array.from({ length: 5 }, (_, i) => ({
    x: (i * 300 + 80) % (W + 300),
    y: 26 + ((i * 53) % 70),
    sp: 9 + (i % 3) * 5,
    sc: 0.7 + (i % 3) * 0.25,
  }));

  private onResize: () => void;
  private onDown: (e: PointerEvent) => void;
  private onMove: (e: PointerEvent) => void;
  private onKey: (e: KeyboardEvent) => void;
  private onVis: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelDef,
    upgrades: Record<string, number>,
    audio: AudioMan,
    cb: EngineCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.level = level;
    this.upgrades = { ...upgrades };
    this.audio = audio;
    this.cb = cb;
    this.energy = level.startEnergy;
    this.baseHp = level.baseHp;
    this.baseMax = level.baseHp;

    this.onResize = () => this.resize();
    this.onDown = (e) => this.pointerDown(e);
    this.onMove = (e) => this.pointerMove(e);
    this.onKey = (e) => this.keyDown(e);
    this.onVis = () => {
      if (document.hidden && !this.dead && (this.state === "prep" || this.state === "wave")) {
        this.paused = true;
        this.emitHud();
      }
    };
    window.addEventListener("resize", this.onResize);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    window.addEventListener("keydown", this.onKey);
    document.addEventListener("visibilitychange", this.onVis);
    this.resize();
    this.showBanner(`LEVEL ${level.n}`, `${level.tier} • ${level.waves.length} gelombang`, 2.4);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.emitHud();
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("keydown", this.onKey);
    document.removeEventListener("visibilitychange", this.onVis);
  }

  // ---------- kontrol publik ----------
  setPaused(p: boolean) {
    this.paused = p;
    this.emitHud();
  }
  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.emitHud();
  }
  selectCard(id: string | null) {
    this.shovelMode = false;
    this.selUnit = null;
    this.selectedCard = id !== null && this.selectedCard === id ? null : id;
    this.emitHud();
  }
  toggleShovel() {
    this.selectedCard = null;
    this.selUnit = null;
    this.shovelMode = !this.shovelMode;
    this.emitHud();
  }
  skipCountdown() {
    if (this.state === "prep") this.countdown = 0;
  }
  refreshUpgrades(map: Record<string, number>) {
    this.upgrades = { ...map };
    for (const u of this.units) {
      const s = unitStats(u.def, this.lvlOf(u.def.id));
      const newMax = s.hp;
      u.hp = Math.min(newMax, Math.round((u.hp / u.maxHp) * newMax));
      u.maxHp = newMax;
    }
    this.emitHud();
  }
  private lvlOf(id: string) {
    return Math.max(1, this.upgrades[id] ?? 1);
  }

  // ---------- input ----------
  private toLogical(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - this.ox) / this.scale,
      y: (e.clientY - r.top - this.oy) / this.scale,
    };
  }
  private cellAt(x: number, y: number) {
    const col = Math.floor((x - GRID_X0) / CELL_W);
    const row = Math.floor((y - GRID_Y0) / CELL_H);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { row, col };
  }
  private pointerMove(e: PointerEvent) {
    const p = this.toLogical(e);
    this.hover = this.cellAt(p.x, p.y);
  }
  private pointerDown(e: PointerEvent) {
    if (this.state === "won" || this.state === "lost") return;
    const p = this.toLogical(e);
    const cell = this.cellAt(p.x, p.y);
    if (!cell) {
      this.selectedCard = null;
      this.selUnit = null;
      this.emitHud();
      return;
    }
    const unitHere = this.units.find((u) => u.row === cell.row && u.col === cell.col);
    if (this.shovelMode) {
      if (unitHere) this.shovelUnit(unitHere);
      else this.audio.play("error");
      return;
    }
    if (this.selectedCard) {
      this.tryPlace(this.selectedCard, cell.row, cell.col);
      return;
    }
    if (unitHere) {
      this.selUnit = unitHere;
      this.emitHud();
    } else {
      this.selUnit = null;
      this.emitHud();
    }
  }
  private keyDown(e: KeyboardEvent) {
    const idx = "12345678".indexOf(e.key);
    if (idx >= 0) {
      const unlocked = this.cardList().filter((c) => c.unlocked);
      if (unlocked[idx]) this.selectCard(unlocked[idx].id);
    } else if (e.key === " ") {
      e.preventDefault();
      this.setPaused(!this.paused);
    }
  }

  private cardList(): CardInfo[] {
    return Object.values(UNIT_MAP)
      .sort((a, b) => a.unlockLevel - b.unlockLevel)
      .map((def) => {
        const cd = this.cardCd[def.id] ?? 0;
        return {
          id: def.id,
          name: def.name,
          tag: def.tag,
          cost: def.cost,
          unlocked: def.unlockLevel <= this.level.n,
          affordable: this.energy >= def.cost,
          cdFrac: def.cooldown > 0 ? Math.min(1, cd / def.cooldown) : 0,
          cdLeft: cd,
        };
      });
  }

  private tainted(row: number, col: number) {
    return this.taints.some((t) => t.row === row && t.col === col);
  }

  private tryPlace(cardId: string, row: number, col: number) {
    const def = UNIT_MAP[cardId];
    if (!def || def.unlockLevel > this.level.n) return;
    const cd = this.cardCd[cardId] ?? 0;
    if (cd > 0 || this.energy < def.cost || this.units.some((u) => u.row === row && u.col === col) || this.tainted(row, col)) {
      this.audio.play("error");
      this.shakeIt(3);
      return;
    }
    const st = unitStats(def, this.lvlOf(def.id));
    const u: UnitEnt = {
      def, row, col,
      x: cellX(col), y: laneY(row),
      hp: st.hp, maxHp: st.hp,
      atkCd: 0.2,
      genT: def.genInterval ?? 0,
      fuseT: def.fuse ?? -1,
      recoil: 0, stunT: 0, hitT: 0, charge: 0, pulse: 0,
    };
    this.units.push(u);
    this.energy -= def.cost;
    this.cardCd[cardId] = def.cooldown;
    this.selectedCard = null;
    this.audio.play("place");
    this.burst(u.x, u.y + 10, 10, "#b6ec7a", "circle", 90);
    this.emitHud();
  }

  private shovelUnit(u: UnitEnt) {
    const refund = Math.round(u.def.cost * 0.3);
    this.energy = Math.min(ENERGY_MAX, this.energy + refund);
    this.addText(u.x, u.y - 30, `+${refund}`, "#7ee081", 15);
    this.burst(u.x, u.y, 12, "#a9713a", "smoke", 70);
    this.units = this.units.filter((x) => x !== u);
    if (this.selUnit === u) this.selUnit = null;
    this.audio.play("shovel");
    this.emitHud();
  }

  // ---------- spawning ----------
  private spawnMonster(id: string, row: number, opts?: { atX?: number; boss?: boolean }) {
    const def = MONSTER_MAP[id];
    if (!def || this.monsters.length > 80) return;
    const hpMul = this.level.hpMul * (opts?.boss ? bossHpMul(this.level.n) : 1);
    const m: MonsterEnt = {
      def, row,
      x: opts?.atX ?? W - 26,
      y: laneY(row),
      hp: Math.round(def.hp * hpMul),
      maxHp: Math.round(def.hp * hpMul),
      shield: def.shieldHp ? Math.round(def.shieldHp * hpMul) : 0,
      maxShield: def.shieldHp ? Math.round(def.shieldHp * hpMul) : 0,
      slowT: 0, burnT: 0, burnDps: 0, hitT: 0,
      atkCd: 0.4, attackT: 0,
      jumped: false, jumpT: 0, jumpFromX: 0, jumpToX: 0,
      abilityT: def.abilityCd ?? def.spawnInterval ?? 4,
      enraged: false, dead: false, dieT: 0,
      seed: Math.random() * 100,
      boss: !!def.boss,
      dmgMul: this.level.dmgMul,
      spdMul: this.level.spdMul,
      hpMul,
    };
    this.monsters.push(m);
    if (m.boss) {
      this.audio.play("roar");
      this.shakeIt(14);
      this.showBanner(`BOSS: ${def.name}`, def.title ?? "", 3);
    }
  }

  // ---------- efek ----------
  private shakeIt(a: number) {
    this.shake = Math.min(22, this.shake + a);
  }
  private showBanner(text: string, sub: string, t: number) {
    this.banner = { text, sub, key: ++this.bannerKey, t };
  }
  private burst(x: number, y: number, n: number, color: string, kind: Particle["kind"], speed = 120) {
    for (let i = 0; i < n; i++) {
      if (this.particles.length > 320) break;
      const p = this.fxPool.get();
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      p.kind = kind; p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 40;
      p.g = kind === "smoke" ? -30 : 260;
      p.maxLife = p.life = 0.4 + Math.random() * 0.4;
      p.size = kind === "smoke" ? 7 + Math.random() * 7 : 3 + Math.random() * 4;
      p.color = color; p.rot = Math.random() * 6; p.vr = (Math.random() - 0.5) * 8;
      this.particles.push(p);
    }
  }
  private explosion(x: number, y: number, radius: number) {
    for (let i = 0; i < 26; i++) {
      if (this.particles.length > 340) break;
      const p = this.fxPool.get();
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 260;
      p.kind = i % 3 === 0 ? "smoke" : "spark";
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 60;
      p.g = 200;
      p.maxLife = p.life = 0.5 + Math.random() * 0.5;
      p.size = 4 + Math.random() * 7;
      p.color = i % 2 ? "#ffb347" : i % 3 ? "#ff5a3c" : "#ffe14d";
      p.rot = 0; p.vr = 0;
      this.particles.push(p);
    }
    const ring = this.fxPool.get();
    ring.kind = "ring"; ring.x = x; ring.y = y; ring.vx = 0; ring.vy = 0;
    ring.g = 0; ring.maxLife = ring.life = 0.45; ring.size = radius;
    ring.color = "#ffd23f"; ring.rot = 0; ring.vr = 0;
    this.particles.push(ring);
  }
  private addText(x: number, y: number, str: string, color: string, size = 16) {
    if (this.texts.length > 60) {
      const old = this.texts.shift()!;
      this.txPool.release(old);
    }
    const t = this.txPool.get();
    t.x = x + (Math.random() - 0.5) * 14; t.y = y; t.life = t.maxLife = 0.9;
    t.str = str; t.color = color; t.size = size;
    this.texts.push(t);
  }

  // ---------- damage ----------
  private damageMonster(m: MonsterEnt, raw: number, srcY?: number) {
    if (m.dead) return;
    let dmg = Math.max(1, Math.round(raw) - m.def.def);
    if (m.shield > 0) {
      m.shield -= dmg;
      if (m.shield <= 0) {
        dmg = -m.shield;
        m.shield = 0;
        this.audio.play("shield");
        this.burst(m.x, m.y - 20, 8, "#bdeeff", "spark", 130);
        this.addText(m.x, m.y - 50, "PERISAI PECAH!", "#9fdcff", 13);
      } else {
        this.audio.play("hit");
        m.hitT = 0.12;
        this.addText(m.x, srcY ?? m.y - 40, `${dmg}`, "#9fdcff", 13);
        return;
      }
    }
    m.hp -= dmg;
    m.hitT = 0.12;
    this.audio.play("hit");
    if (dmg >= 10 || Math.random() < 0.4)
      this.addText(m.x, (srcY ?? m.y) - 44, `${dmg}`, m.def.special === "elite" ? "#ff8fb0" : "#ffffff", dmg >= 40 ? 19 : 14);
    if (m.hp <= 0) this.killMonster(m);
  }

  private killMonster(m: MonsterEnt) {
    if (m.dead) return;
    m.dead = true;
    m.dieT = 0.35;
    this.kills++;
    this.sessionCoins += m.def.coins;
    this.audio.play("die");
    this.audio.play("coin");
    this.burst(m.x, m.y - 14, m.boss ? 30 : 10, m.def.body, "circle", m.boss ? 220 : 110);
    this.addText(m.x, m.y - 52, `+${m.def.coins}`, "#ffd23f", m.boss ? 22 : 14);
    if (m.boss) {
      this.shakeIt(12);
      this.explosion(m.x, m.y - 20, CELL_W * 1.6);
      this.showBanner("BOSS TUMBANG!", `+${m.def.coins} koin`, 2.2);
    }
  }

  private damageUnit(u: UnitEnt, dmg: number) {
    u.hp -= dmg;
    u.hitT = 0.14;
    this.audio.play("thud");
    if (u.hp <= 0) {
      this.burst(u.x, u.y, 14, u.def.body, "smoke", 90);
      this.units = this.units.filter((x) => x !== u);
      if (this.selUnit === u) this.selUnit = null;
    }
  }

  // ---------- update ----------
  private frame = (ts: number) => {
    if (this.dead) return;
    const dtRaw = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    if (!this.paused) {
      const dt = dtRaw * this.speed;
      this.animT += dt;
      if (this.state === "prep" || this.state === "wave") this.update(dt);
      else if (this.state === "won" || this.state === "lost") {
        this.endT -= dt;
        if (this.endT <= 0 && !this.endSent) {
          this.endSent = true;
          this.cb.onEnd(this.buildResult(this.state === "won"));
        }
      }
      this.updateFx(dt);
    }
    this.draw();
    this.hudAcc += dtRaw;
    if (this.hudAcc > 0.12) {
      this.hudAcc = 0;
      this.emitHud();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    // energi pasif
    this.energy = Math.min(ENERGY_MAX, this.energy + 1.5 * dt);
    for (const k of Object.keys(this.cardCd))
      this.cardCd[k] = Math.max(0, this.cardCd[k] - dt);
    // taint
    for (const t of this.taints) t.t -= dt;
    this.taints = this.taints.filter((t) => t.t > 0);

    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.baseHitT = Math.max(0, this.baseHitT - dt);

    // gelombang
    if (this.state === "prep") {
      this.countdown -= dt;
      if (this.countdown <= 0) this.startWave();
    } else if (this.state === "wave") {
      this.waveTime += dt;
      const wave = this.level.waves[this.waveIdx];
      while (this.spawnPtr < wave.entries.length && wave.entries[this.spawnPtr].t <= this.waveTime) {
        const en = wave.entries[this.spawnPtr++];
        if (en.type.startsWith("boss:")) this.spawnMonster(en.type.slice(5), en.lane, { boss: true });
        else this.spawnMonster(en.type, en.lane);
      }
      if (this.spawnPtr >= wave.entries.length && this.monsters.length === 0) {
        if (this.waveIdx >= this.level.waves.length - 1) this.victory();
        else {
          this.waveIdx++;
          this.state = "prep";
          this.countdown = 5;
          const last = this.waveIdx === this.level.waves.length - 1;
          this.showBanner(
            `WAVE ${this.waveIdx + 1}/${this.level.waves.length}`,
            last ? (this.level.isBoss ? "AWAS! BOSS DATANG!" : "Gelombang terakhir!") : "Bersiap...",
            2
          );
          this.audio.play("wave");
        }
      }
    }

    this.updateUnits(dt);
    this.updateMonsters(dt);
    this.updateProjectiles(dt);

    // ambient kupu-kupu
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = 5 + Math.random() * 5;
      if (this.particles.length < 300) {
        const p = this.fxPool.get();
        p.kind = "butterfly";
        p.x = W + 20; p.y = 40 + Math.random() * 90;
        p.vx = -40 - Math.random() * 30; p.vy = 0; p.g = 0;
        p.maxLife = p.life = 20; p.size = 5 + Math.random() * 3;
        p.color = Math.random() < 0.5 ? "#ffd23f" : "#ff8fb0";
        p.rot = Math.random() * 6; p.vr = 0;
        this.particles.push(p);
      }
    }
  }

  private startWave() {
    this.state = "wave";
    this.waveTime = 0;
    this.spawnPtr = 0;
    const last = this.waveIdx === this.level.waves.length - 1;
    this.showBanner(
      `WAVE ${this.waveIdx + 1}/${this.level.waves.length}`,
      last ? (this.level.isBoss ? "AWAS! BOSS DATANG!" : "Gelombang terakhir!") : "Mereka datang!",
      2
    );
    this.audio.play("wave");
  }

  private updateUnits(dt: number) {
    for (const u of [...this.units]) {
      u.recoil = Math.max(0, u.recoil - dt * 5);
      u.hitT = Math.max(0, u.hitT - dt);
      u.stunT = Math.max(0, u.stunT - dt);
      u.pulse = Math.max(0, u.pulse - dt);
      if (u.stunT > 0) continue;
      const st = unitStats(u.def, this.lvlOf(u.def.id));

      switch (u.def.special) {
        case "generator": {
          u.genT -= dt;
          u.charge = 1 - Math.max(0, u.genT) / (u.def.genInterval ?? 6);
          if (u.genT <= 0) {
            u.genT = u.def.genInterval ?? 6;
            this.energy = Math.min(ENERGY_MAX, this.energy + st.gen);
            u.pulse = 0.6;
            this.addText(u.x, u.y - 46, `+${st.gen}`, "#ffd23f", 15);
            this.burst(u.x, u.y - 26, 6, "#ffe14d", "spark", 70);
            this.audio.play("gen");
          }
          break;
        }
        case "bomb": {
          if (u.fuseT > 0) {
            u.fuseT -= dt;
            if (Math.random() < dt * 22) this.burst(u.x + 6, u.y - 40, 1, "#ffe14d", "spark", 50);
            if (u.fuseT <= 0) this.explodeBomb(u);
          }
          break;
        }
        case "wall":
          break;
        case "flame": {
          u.atkCd -= dt;
          if (u.atkCd <= 0) {
            const rangePx = u.def.range * CELL_W;
            const targets = this.monsters.filter(
              (m) => !m.dead && m.row === u.row && m.x > u.x - 10 && m.x - u.x < rangePx
            );
            if (targets.length) {
              u.atkCd = 1 / st.rate;
              u.recoil = 1;
              this.audio.play("flame");
              for (let i = 0; i < 9; i++) {
                if (this.particles.length > 330) break;
                const p = this.fxPool.get();
                p.kind = "circle";
                p.x = u.x + 20; p.y = u.y - 22 + (Math.random() - 0.5) * 26;
                p.vx = 160 + Math.random() * 160; p.vy = (Math.random() - 0.5) * 60;
                p.g = -40; p.maxLife = p.life = 0.3 + Math.random() * 0.25;
                p.size = 6 + Math.random() * 7;
                p.color = i % 2 ? "#ff9d3c" : "#ffe14d"; p.rot = 0; p.vr = 0;
                this.particles.push(p);
              }
              for (const m of targets) {
                this.damageMonster(m, st.dmg, u.y);
                m.burnT = u.def.burnDur ?? 2;
                m.burnDps = (u.def.burnDps ?? 6) * (1 + 0.18 * (this.lvlOf(u.def.id) - 1));
              }
            }
          }
          break;
        }
        case "chain": {
          u.atkCd -= dt;
          u.charge = Math.min(1, 1 - Math.max(0, u.atkCd) * st.rate);
          if (u.atkCd <= 0) {
            const inLane = this.monsters
              .filter((m) => !m.dead && m.row === u.row && m.x > u.x - 10 && m.x - u.x < u.def.range * CELL_W)
              .sort((a, b) => a.x - b.x);
            const any = this.monsters
              .filter((m) => !m.dead)
              .map((m) => ({ m, d: Math.hypot(m.x - u.x, m.y - u.y) }))
              .filter((o) => o.d < 3.4 * CELL_W)
              .sort((a, b) => a.d - b.d);
            const first = inLane[0] ?? any[0]?.m;
            if (first) {
              u.atkCd = 1 / st.rate;
              u.recoil = 1;
              this.audio.play("zap");
              const hits: MonsterEnt[] = [first];
              let prev = first;
              for (let c = 1; c < (u.def.chainCount ?? 3); c++) {
                const next = this.monsters
                  .filter((m) => !m.dead && !hits.includes(m) && Math.hypot(m.x - prev.x, m.y - prev.y) < 2.4 * CELL_W)
                  .sort((a, b) => Math.hypot(a.x - prev.x, a.y - prev.y) - Math.hypot(b.x - prev.x, b.y - prev.y))[0];
                if (!next) break;
                hits.push(next);
                prev = next;
              }
              const pts = [{ x: u.x + 8, y: u.y - 34 }];
              let falloff = 1;
              for (const hm of hits) {
                pts.push({ x: hm.x, y: hm.y - 18 });
                this.damageMonster(hm, st.dmg * falloff, u.y);
                this.burst(hm.x, hm.y - 16, 5, "#ffe14d", "spark", 100);
                falloff *= 0.72;
              }
              this.beams.push({ pts, ttl: 0.16, max: 0.16, color: "#ffe14d" });
            }
          }
          break;
        }
        default: {
          // shooter / heavy / frost
          u.atkCd -= dt;
          if (u.atkCd <= 0) {
            const target = this.monsters
              .filter((m) => !m.dead && m.row === u.row && m.x > u.x - 10 && m.x - u.x < u.def.range * CELL_W)
              .sort((a, b) => a.x - b.x)[0];
            if (target) {
              u.atkCd = 1 / st.rate;
              u.recoil = 1;
              this.fireProjectile(u, st.dmg, target);
            }
          }
        }
      }
    }
  }

  private fireProjectile(u: UnitEnt, dmg: number, target: MonsterEnt) {
    const p = this.pPool.get();
    const heavy = u.def.special === "heavy";
    p.kind = u.def.special === "frost" ? "frost" : heavy ? "stone" : "seed";
    p.x = u.x + 22;
    p.y = u.y - 26;
    p.vx = (heavy ? 480 : 640);
    p.vy = heavy ? -60 : 0;
    p.dmg = dmg;
    p.row = u.row;
    p.slowDur = u.def.special === "frost" ? u.def.slowDur ?? 3 : 0;
    p.splash = heavy ? 0.7 * CELL_W : 0;
    p.color = u.def.projColor;
    p.r = heavy ? 11 : u.def.special === "frost" ? 7 : 6;
    this.projectiles.push(p);
    this.audio.play(heavy ? "heavy" : u.def.special === "frost" ? "frost" : "shoot");
    void target;
  }

  private explodeBomb(u: UnitEnt) {
    const st = unitStats(u.def, this.lvlOf(u.def.id));
    const radius = (u.def.blastRadius ?? 1.5) * CELL_W;
    this.explosion(u.x, u.y - 10, radius);
    this.audio.play("boom");
    this.shakeIt(16);
    for (const m of [...this.monsters]) {
      const d = Math.hypot(m.x - u.x, m.y - u.y);
      if (d < radius + 20) {
        const fall = 1 - 0.45 * Math.min(1, d / radius);
        this.damageMonster(m, st.dmg * fall, u.y);
      }
    }
    this.units = this.units.filter((x) => x !== u);
    if (this.selUnit === u) this.selUnit = null;
  }

  private updateMonsters(dt: number) {
    for (const m of [...this.monsters]) {
      if (m.dead) {
        m.dieT -= dt;
        if (m.dieT <= 0) this.monsters = this.monsters.filter((x) => x !== m);
        continue;
      }
      m.hitT = Math.max(0, m.hitT - dt);
      m.attackT = Math.max(0, m.attackT - dt);
      if (m.slowT > 0) m.slowT -= dt;
      if (m.burnT > 0) {
        m.burnT -= dt;
        m.hp -= m.burnDps * dt;
        if (Math.random() < dt * 10) this.burst(m.x, m.y - 20, 1, "#ff9d3c", "spark", 40);
        if (m.hp <= 0) {
          this.killMonster(m);
          continue;
        }
      }
      // enrage (elite & rockjaw)
      if ((m.def.special === "elite" || m.def.ability === "rage") && !m.enraged && m.hp / m.maxHp < 0.35) {
        m.enraged = true;
        this.audio.play("roar");
        this.burst(m.x, m.y - 20, 14, "#ff5a4e", "spark", 150);
        this.addText(m.x, m.y - 60, "MENGAMUK!", "#ff5a4e", 16);
      }

      // kemampuan khusus
      this.updateAbility(m, dt);

      // lompatan hopper
      if (m.jumpT > 0) {
        m.jumpT -= dt;
        const k = 1 - Math.max(0, m.jumpT) / 0.55;
        m.x = m.jumpFromX + (m.jumpToX - m.jumpFromX) * k;
        if (m.jumpT <= 0) this.burst(m.x, m.y + 8, 5, "#c9eaa8", "smoke", 40);
        continue;
      }

      // cari penghalang di jalur
      const blocker = this.findBlocker(m);
      const rangedDist = m.def.special === "ranged" ? 2.6 * CELL_W : 0;
      const stopDist = blocker ? m.x - blocker.x : Infinity;

      if (m.def.special === "ranged" && blocker && stopDist < rangedDist && stopDist > CELL_W * 0.5) {
        m.atkCd -= dt;
        if (m.atkCd <= 0) {
          m.atkCd = 1 / m.def.atkRate;
          m.attackT = 0.25;
          const p = this.pPool.get();
          p.kind = "gunk";
          p.x = m.x - 14; p.y = m.y - 22;
          p.vx = -330; p.vy = -40;
          p.dmg = m.def.dmg * m.dmgMul;
          p.row = m.row; p.slowDur = 0; p.splash = 0;
          p.color = m.def.projColor ?? "#c86ee0";
          p.r = 7;
          this.projectiles.push(p);
          this.audio.play("spit");
        }
        continue;
      }

      if (blocker && stopDist < CELL_W * 0.48) {
        // jump sekali
        if (m.def.special === "jump" && !m.jumped) {
          m.jumped = true;
          m.jumpT = 0.55;
          m.jumpFromX = m.x;
          m.jumpToX = blocker.x - CELL_W * 0.75;
          this.audio.play("jump");
          continue;
        }
        // serang unit
        m.atkCd -= dt;
        if (m.atkCd <= 0) {
          m.atkCd = 1 / m.def.atkRate;
          m.attackT = 0.22;
          this.damageUnit(blocker, m.def.dmg * m.dmgMul * (m.enraged ? 1.4 : 1));
        }
        continue;
      }

      // gerak ke kiri
      const slowMul = m.slowT > 0 ? 0.5 : 1;
      const rageMul = m.enraged ? (m.def.ability === "rage" ? 2.6 : 1.9) : 1;
      m.x -= m.def.speed * m.spdMul * slowMul * rageMul * CELL_W * dt;

      if (m.x <= BASE_X) {
        m.x = BASE_X;
        m.atkCd -= dt;
        if (m.atkCd <= 0) {
          m.atkCd = 1 / m.def.atkRate;
          m.attackT = 0.25;
          this.baseHp -= m.def.dmg * m.dmgMul * (m.enraged ? 1.4 : 1);
          this.baseHitT = 0.3;
          this.shakeIt(m.boss ? 8 : 3);
          this.audio.play("thud");
          if (this.baseHp <= 0) {
            this.baseHp = 0;
            this.defeat();
          }
        }
      }
    }
  }

  private findBlocker(m: MonsterEnt): UnitEnt | null {
    let best: UnitEnt | null = null;
    let bestD = Infinity;
    for (const u of this.units) {
      if (u.row !== m.row) continue;
      const d = m.x - u.x;
      if (d > -CELL_W * 0.2 && d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  private updateAbility(m: MonsterEnt, dt: number) {
    const cd = m.def.abilityCd ?? m.def.spawnInterval ?? (m.def.special === "heal" ? 1 : 0);
    if (cd <= 0) return;
    m.abilityT -= dt;
    if (m.abilityT > 0) return;
    m.abilityT = cd;
    switch (m.def.ability ?? m.def.special) {
      case "swarm": {
        const n = m.def.spawnCount ?? 2;
        for (let i = 0; i < n; i++)
          this.spawnMonster(m.def.spawnId ?? "mite", m.row, { atX: Math.min(W - 20, m.x + 30 + i * 22) });
        this.burst(m.x, m.y - 10, 8, "#f5e0a8", "circle", 70);
        this.addText(m.x, m.y - 50, "Menetas!", "#d9b03c", 13);
        break;
      }
      case "heal": {
        const r = (m.def.healRadius ?? 1.5) * CELL_W;
        let healed = false;
        for (const o of this.monsters) {
          if (o.dead || o === m) continue;
          if (Math.hypot(o.x - m.x, o.y - m.y) < r && o.hp < o.maxHp) {
            o.hp = Math.min(o.maxHp, o.hp + (m.def.healRate ?? 8));
            healed = true;
            this.burst(o.x, o.y - 20, 2, "#b8ffd9", "spark", 40);
          }
        }
        if (healed) {
          this.audio.play("heal");
          this.burst(m.x, m.y - 30, 5, "#b8ffd9", "spark", 60);
        }
        break;
      }
      case "summon": {
        for (let i = 0; i < 3; i++)
          this.spawnMonster("nibbler", (m.row + i - 1 + ROWS) % ROWS, { atX: Math.min(W - 20, m.x + 60) });
        this.addText(m.x, m.y - 70, "Pengawal datang!", "#8fd14f", 15);
        break;
      }
      case "hive": {
        for (let i = 0; i < 3; i++)
          this.spawnMonster("mite", Math.floor(Math.random() * ROWS), { atX: Math.min(W - 20, m.x + 50 + Math.random() * 60) });
        if (Math.random() < 0.6)
          this.spawnMonster("sprinter", Math.floor(Math.random() * ROWS), { atX: Math.min(W - 20, m.x + 90) });
        this.addText(m.x, m.y - 70, "Serbuan serbuk!", "#e0a83c", 15);
        break;
      }
      case "devour": {
        const targets = this.units
          .filter((u) => u.row === m.row && m.x - u.x > 0 && m.x - u.x < CELL_W * 1.7)
          .sort((a, b) => b.x - a.x);
        const t = targets[0];
        if (t) {
          this.audio.play("devour");
          this.shakeIt(9);
          if (t.def.special === "wall") {
            this.damageUnit(t, 320);
            this.addText(t.x, t.y - 50, "KRAUK!", "#ff5a4e", 17);
          } else {
            this.burst(t.x, t.y, 18, t.def.body, "smoke", 110);
            this.addText(t.x, t.y - 50, "DILAHAP!", "#ff5a4e", 17);
            this.units = this.units.filter((x) => x !== t);
            if (this.selUnit === t) this.selUnit = null;
          }
        }
        break;
      }
      case "sludge": {
        this.audio.play("sludge");
        for (let i = 0; i < 2; i++) {
          const withUnit = this.units.length > 0 && Math.random() < 0.5;
          let row = Math.floor(Math.random() * ROWS);
          let col = Math.floor(Math.random() * COLS);
          if (withUnit) {
            const pick = this.units[Math.floor(Math.random() * this.units.length)];
            row = pick.row; col = pick.col;
            pick.stunT = 12;
            this.addText(pick.x, pick.y - 50, "Terlumpur!", "#6fae4e", 14);
          }
          if (!this.tainted(row, col)) this.taints.push({ row, col, t: 12 });
        }
        break;
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (const p of [...this.projectiles]) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "stone" || p.kind === "gunk") p.vy += 260 * dt;
      if (p.x < -20 || p.x > W + 30 || p.y > H + 30) {
        this.projectiles = this.projectiles.filter((q) => q !== p);
        this.pPool.release(p);
        continue;
      }
      if (p.kind === "gunk") {
        const u = this.units.find((x) => x.row === p.row && Math.abs(x.x - p.x) < CELL_W * 0.32);
        if (u) {
          this.damageUnit(u, p.dmg);
          this.burst(p.x, p.y, 5, p.color, "circle", 60);
          this.projectiles = this.projectiles.filter((q) => q !== p);
          this.pPool.release(p);
        }
        continue;
      }
      // proyektil pemain: cari monster di baris
      let hit: MonsterEnt | null = null;
      for (const m of this.monsters) {
        if (m.dead || m.row !== p.row) continue;
        const mr = 20 * m.def.size;
        if (Math.abs(m.x - p.x) < mr + p.r && m.x > p.x - 30) {
          hit = m;
          break;
        }
      }
      if (hit) {
        if (p.splash > 0) {
          this.burst(p.x, p.y, 10, "#c3cdd4", "smoke", 90);
          this.shakeIt(3);
          for (const m of this.monsters) {
            if (m.dead) continue;
            const d = Math.hypot(m.x - p.x, m.y - p.y);
            if (d < p.splash) this.damageMonster(m, p.dmg * (m === hit ? 1 : 0.5), p.y);
          }
        } else {
          this.damageMonster(hit, p.dmg, p.y);
          if (p.slowDur > 0) {
            hit.slowT = p.slowDur;
            this.burst(hit.x, hit.y - 16, 6, "#bdeeff", "spark", 70);
          }
        }
        this.burst(p.x, p.y, 4, p.color, "circle", 50);
        this.projectiles = this.projectiles.filter((q) => q !== p);
        this.pPool.release(p);
      }
    }
  }

  private updateFx(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 26);
    for (const p of [...this.particles]) {
      p.life -= dt;
      if (p.life <= 0 || p.x < -60) {
        this.particles = this.particles.filter((q) => q !== p);
        this.fxPool.release(p);
        continue;
      }
      if (p.kind === "butterfly") {
        p.x += p.vx * dt;
        p.y += Math.sin(this.animT * 3 + p.rot) * 30 * dt;
      } else {
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
    }
    for (const t of [...this.texts]) {
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) {
        this.texts = this.texts.filter((q) => q !== t);
        this.txPool.release(t);
      }
    }
    for (const b of [...this.beams]) {
      b.ttl -= dt;
      if (b.ttl <= 0) this.beams = this.beams.filter((q) => q !== b);
    }
  }

  private victory() {
    this.state = "won";
    this.endT = 1.4;
    this.audio.play("win");
    for (let i = 0; i < 130; i++) {
      if (this.particles.length > 340) break;
      const p = this.fxPool.get();
      p.kind = "confetti";
      p.x = Math.random() * W;
      p.y = -20 - Math.random() * 160;
      p.vx = (Math.random() - 0.5) * 80;
      p.vy = 90 + Math.random() * 140;
      p.g = 40;
      p.maxLife = p.life = 2.5 + Math.random() * 1.5;
      p.size = 5 + Math.random() * 5;
      p.color = ["#ffd23f", "#ff5a4e", "#6cc24a", "#7fd4f0", "#ff8fb0"][i % 5];
      p.rot = Math.random() * 6;
      p.vr = (Math.random() - 0.5) * 10;
      this.particles.push(p);
    }
    this.showBanner("MENANG!", "Kebun aman!", 2);
    this.emitHud();
  }

  private defeat() {
    if (this.state === "lost") return;
    this.state = "lost";
    this.endT = 1.6;
    this.audio.play("lose");
    this.audio.play("boom");
    this.shakeIt(20);
    this.explosion(BASE_W * 0.5, laneY(2), CELL_W * 1.4);
    this.emitHud();
  }

  private buildResult(win: boolean): EndResult {
    const nodmg = this.baseHp >= this.baseMax;
    const coinsEarned = win
      ? this.level.rewardCoins + this.sessionCoins + (nodmg ? Math.round(this.level.rewardCoins * 0.5) : 0)
      : 0;
    const expEarned = win ? this.level.rewardExp + Math.floor(this.kills / 2) : Math.floor(this.kills / 4);
    const stars = !win ? 0 : nodmg ? 3 : this.baseHp >= this.baseMax * 0.5 ? 2 : 1;
    return {
      win,
      level: this.level.n,
      kills: this.kills,
      sessionCoins: this.sessionCoins,
      coinsEarned,
      expEarned,
      nodmg,
      stars,
      baseHpLeft: Math.max(0, Math.round(this.baseHp)),
    };
  }

  private emitHud() {
    const bossM = this.monsters.find((m) => m.boss && !m.dead);
    const su = this.selUnit;
    this.cb.onHud({
      energy: Math.floor(this.energy),
      baseHp: Math.max(0, Math.ceil(this.baseHp)),
      baseMax: this.baseMax,
      wave: Math.min(this.waveIdx + 1, this.level.waves.length),
      totalWaves: this.level.waves.length,
      state: this.state,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      cards: this.cardList(),
      kills: this.kills,
      boss: bossM
        ? { name: bossM.def.name, title: bossM.def.title ?? "", hp: Math.max(0, bossM.hp), max: bossM.maxHp }
        : null,
      speed: this.speed,
      paused: this.paused,
      selected: this.selectedCard,
      shovel: this.shovelMode,
      selUnit: su
        ? (() => {
            const st = unitStats(su.def, this.lvlOf(su.def.id));
            const lvl = this.lvlOf(su.def.id);
            return {
              row: su.row, col: su.col, id: su.def.id, name: su.def.name, tag: su.def.tag,
              lvl, hp: Math.max(0, Math.round(su.hp)), maxHp: st.hp,
              dmg: st.dmg, rate: st.rate, range: su.def.range, gen: st.gen,
              upCost: lvl >= MAX_UPGRADE ? 0 : upgradeCost(su.def, lvl),
              maxed: lvl >= MAX_UPGRADE,
            };
          })()
        : null,
      banner: this.banner ? { text: this.banner.text, sub: this.banner.sub, key: this.banner.key } : null,
      level: this.level.n,
      tier: this.level.tier,
      tierColor: this.level.tierColor,
    });
  }

  // ============================================================
  // DRAW
  // ============================================================
  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const r = parent.getBoundingClientRect();
    this.viewW = r.width;
    this.viewH = r.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.canvas.style.width = r.width + "px";
    this.canvas.style.height = r.height + "px";
    this.scale = Math.min(r.width / W, r.height / H);
    this.ox = (r.width - W * this.scale) / 2;
    this.oy = (r.height - H * this.scale) / 2;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // letterbox
    ctx.fillStyle = "#173d1e";
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.save();
    ctx.translate(this.ox + sx * this.scale, this.oy + sy * this.scale);
    ctx.scale(this.scale, this.scale);

    this.drawSky(ctx);
    this.drawGrid(ctx);
    this.drawBase(ctx);
    this.drawSpawn(ctx);

    // entitas per baris (depth)
    for (let r = 0; r < ROWS; r++) {
      for (const u of this.units) if (u.row === r) this.drawUnit(ctx, u);
      for (const m of this.monsters) if (m.row === r) this.drawMonster(ctx, m);
    }
    // taint overlay
    for (const t of this.taints) this.drawTaint(ctx, t);

    // proyektil
    for (const p of this.projectiles) this.drawProjectile(ctx, p);
    // beam petir
    for (const b of this.beams) {
      const a = b.ttl / b.max;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 7;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(b.pts[0].x, b.pts[0].y);
      for (let i = 1; i < b.pts.length; i++) {
        const p0 = b.pts[i - 1];
        const p1 = b.pts[i];
        const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 16;
        const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 16;
        ctx.lineTo(mx, my);
        ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // partikel
    for (const p of this.particles) this.drawParticle(ctx, p);
    // teks melayang
    for (const t of this.texts) {
      const a = Math.min(1, t.life / (t.maxLife * 0.4));
      ctx.globalAlpha = a;
      ctx.font = `${t.size}px "Titan One"`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(20,40,20,0.85)";
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, 0, 0, SKY);
    g.addColorStop(0, "#5db9ec");
    g.addColorStop(1, "#c9edff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, SKY + 4);
    // matahari
    const sunX = W - 160;
    ctx.save();
    ctx.translate(sunX, 62);
    ctx.rotate(this.animT * 0.1);
    ctx.fillStyle = "rgba(255,225,77,0.4)";
    for (let i = 0; i < 10; i++) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(58, -7);
      ctx.lineTo(58, 7);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#ffe14d";
    ctx.beginPath();
    ctx.arc(sunX, 62, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath();
    ctx.arc(sunX - 8, 54, 20, 0, Math.PI * 2);
    ctx.fill();
    // awan
    for (const c of this.clouds) {
      const cx = ((c.x + this.animT * c.sp) % (W + 260)) - 130;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(cx, c.y, 20 * c.sc, 0, Math.PI * 2);
      ctx.arc(cx + 22 * c.sc, c.y + 4, 16 * c.sc, 0, Math.PI * 2);
      ctx.arc(cx - 22 * c.sc, c.y + 5, 15 * c.sc, 0, Math.PI * 2);
      ctx.fill();
    }
    // rumah di latar
    this.drawHouse(ctx, 210, SKY + 2);
    this.drawHouse(ctx, 640, SKY + 2, 0.8);
    // pagar
    ctx.fillStyle = "#a9713a";
    for (let x = 150; x < W; x += 34) {
      ctx.fillRect(x, SKY - 34, 12, 40);
      ctx.beginPath();
      ctx.moveTo(x - 2, SKY - 34);
      ctx.lineTo(x + 6, SKY - 44);
      ctx.lineTo(x + 14, SKY - 34);
      ctx.fill();
    }
    ctx.fillRect(148, SKY - 26, W - 150, 6);
  }

  private drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, sc = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = "#e8d9a8";
    ctx.fillRect(-70, -62, 140, 62);
    ctx.fillStyle = "#c96a4f";
    ctx.beginPath();
    ctx.moveTo(-84, -62);
    ctx.lineTo(0, -110);
    ctx.lineTo(84, -62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7fd4f0";
    ctx.fillRect(-46, -46, 26, 22);
    ctx.fillRect(20, -46, 26, 22);
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(-12, -40, 24, 40);
    ctx.fillStyle = "#c96a4f";
    ctx.fillRect(34, -100, 16, 30);
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, SKY, 0, H);
    g.addColorStop(0, "#79c850");
    g.addColorStop(1, "#5ea83e");
    ctx.fillStyle = g;
    ctx.fillRect(0, SKY, W, H - SKY);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((r + c) % 2 === 0) continue;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(GRID_X0 + c * CELL_W, GRID_Y0 + r * CELL_H, CELL_W, CELL_H);
      }
    }
    // highlight saat memilih kartu / sekop
    if (this.selectedCard) {
      const pulse = 0.5 + Math.sin(this.animT * 5) * 0.2;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const occ = this.units.some((u) => u.row === r && u.col === c) || this.tainted(r, c);
          if (occ) continue;
          ctx.fillStyle = `rgba(255,255,255,${0.06 + pulse * 0.05})`;
          ctx.fillRect(GRID_X0 + c * CELL_W + 2, GRID_Y0 + r * CELL_H + 2, CELL_W - 4, CELL_H - 4);
        }
      if (this.hover) {
        const occ =
          this.units.some((u) => u.row === this.hover!.row && u.col === this.hover!.col) ||
          this.tainted(this.hover.row, this.hover.col);
        ctx.fillStyle = occ ? "rgba(255,90,78,0.4)" : "rgba(255,225,77,0.35)";
        ctx.fillRect(GRID_X0 + this.hover.col * CELL_W, GRID_Y0 + this.hover.row * CELL_H, CELL_W, CELL_H);
      }
    }
    if (this.shovelMode) {
      for (const u of this.units) {
        ctx.fillStyle = "rgba(255,90,78,0.25)";
        ctx.fillRect(GRID_X0 + u.col * CELL_W, GRID_Y0 + u.row * CELL_H, CELL_W, CELL_H);
      }
    }
    // ring unit terpilih
    if (this.selUnit) {
      const u = this.selUnit;
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -this.animT * 30;
      ctx.strokeRect(GRID_X0 + u.col * CELL_W + 3, GRID_Y0 + u.row * CELL_H + 3, CELL_W - 6, CELL_H - 6);
      ctx.setLineDash([]);
    }
  }

  private drawBase(ctx: CanvasRenderingContext2D) {
    // zona markas: rumah pohon
    ctx.fillStyle = "#b98a4e";
    ctx.fillRect(0, SKY, BASE_W, H - SKY);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = SKY; y < H; y += 34) ctx.fillRect(0, y, BASE_W, 3);
    const bx = BASE_W * 0.52;
    const by = SKY + (H - SKY) * 0.5;
    // batang
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(bx - 16, by - 40, 32, 130);
    // kanopi
    ctx.fillStyle = "#4c8a2e";
    ctx.beginPath();
    ctx.arc(bx, by - 60, 56, 0, Math.PI * 2);
    ctx.arc(bx - 40, by - 30, 38, 0, Math.PI * 2);
    ctx.arc(bx + 40, by - 30, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6cc24a";
    ctx.beginPath();
    ctx.arc(bx - 10, by - 72, 40, 0, Math.PI * 2);
    ctx.arc(bx + 30, by - 46, 28, 0, Math.PI * 2);
    ctx.fill();
    // wajah rumah
    ctx.fillStyle = "#5f3a17";
    ctx.beginPath();
    ctx.arc(bx, by + 26, 20, Math.PI, 0);
    ctx.fillRect(bx - 20, by + 26, 40, 30);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(bx - 14, by - 6, 7, 0, Math.PI * 2);
    ctx.arc(bx + 14, by - 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c3a22";
    ctx.beginPath();
    ctx.arc(bx - 12, by - 5, 3.4, 0, Math.PI * 2);
    ctx.arc(bx + 16, by - 5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    // bendera
    ctx.strokeStyle = "#5f3a17";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx, by - 116);
    ctx.lineTo(bx, by - 150);
    ctx.stroke();
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.moveTo(bx, by - 150);
    ctx.lineTo(bx + 30 + Math.sin(this.animT * 4) * 4, by - 142);
    ctx.lineTo(bx, by - 134);
    ctx.fill();
    // gerbang
    ctx.fillStyle = "#7a4d22";
    ctx.fillRect(BASE_W - 10, SKY + 8, 10, H - SKY - 12);
    // flash kena hit
    if (this.baseHitT > 0) {
      ctx.fillStyle = `rgba(255,60,40,${this.baseHitT * 0.9})`;
      ctx.fillRect(0, SKY, BASE_W, H - SKY);
    }
  }

  private drawSpawn(ctx: CanvasRenderingContext2D) {
    const x0 = GRID_X1 + 4;
    ctx.fillStyle = "#2f6b33";
    ctx.fillRect(x0, SKY, W - x0, H - SKY);
    for (let r = 0; r < ROWS; r++) {
      const y = laneY(r);
      ctx.fillStyle = "#1d4a22";
      ctx.beginPath();
      ctx.arc(W - 8, y, 40, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();
      ctx.fillStyle = "#123317";
      ctx.beginPath();
      ctx.arc(W - 8, y, 28, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();
      // mata menyala
      const blink = Math.sin(this.animT * 2 + r) > -0.6;
      if (blink) {
        ctx.fillStyle = "#ffe14d";
        ctx.beginPath();
        ctx.arc(W - 26, y - 6, 3.4, 0, Math.PI * 2);
        ctx.arc(W - 14, y - 6, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#3e8a43";
    for (let y = SKY; y < H; y += 46) {
      ctx.beginPath();
      ctx.arc(x0, y + 14, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTaint(ctx: CanvasRenderingContext2D, t: Taint) {
    const x = cellX(t.col);
    const y = laneY(t.row);
    const a = Math.min(1, t.t / 1.5);
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = "#4e7d2a";
    for (const [dx, dy, rr] of [[-16, 6, 20], [14, -4, 17], [0, 12, 15], [-4, -12, 13]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#77ad3f";
    for (const [dx, dy, rr] of [[-12, 2, 12], [12, -2, 10], [0, 10, 9]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    const bub = (this.animT * 2 + t.row + t.col) % 1;
    ctx.fillStyle = "#a8d96a";
    ctx.beginPath();
    ctx.arc(x + 6, y + 4 - bub * 16, 4 * (1 - bub * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === "stone") {
      ctx.rotate(p.x * 0.05);
      ctx.fillStyle = "#8d99a3";
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c3cdd4";
      ctx.beginPath();
      ctx.arc(-3, -3, p.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "frost") {
      ctx.rotate(this.animT * 8);
      ctx.fillStyle = p.color;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(3, -p.r);
        ctx.lineTo(-3, -p.r);
        ctx.fill();
      }
    } else if (p.kind === "gunk") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r + 2, p.r - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(-2, -2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r + 1, p.r - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(-1.6, -1.6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    const a = Math.max(0, Math.min(1, p.life / (p.maxLife * 0.5)));
    ctx.globalAlpha = a;
    if (p.kind === "ring") {
      const k = 1 - p.life / p.maxLife;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 6 * (1 - k) + 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === "confetti") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    } else if (p.kind === "butterfly") {
      const flap = Math.sin(this.animT * 18 + p.rot);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(-4, 0, 5, 3.4 * Math.abs(flap) + 1, -0.4, 0, Math.PI * 2);
      ctx.ellipse(4, 0, 5, 3.4 * Math.abs(flap) + 1, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a3520";
      ctx.fillRect(-1, -3, 2, 6);
      ctx.restore();
    } else if (p.kind === "smoke") {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "spark") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- gambar unit ----------
  private drawUnit(ctx: CanvasRenderingContext2D, u: UnitEnt) {
    const bob = Math.sin(this.animT * 2.4 + u.col + u.row) * 2.5;
    // bayangan
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 26, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    drawUnitShape(ctx, u.def, u.x, u.y + bob * 0.4, 1, this.animT + u.col * 0.7, {
      recoil: u.recoil,
      fuse: u.fuseT > 0 ? u.fuseT : -1,
      hpFrac: u.hp / u.maxHp,
      charge: u.charge,
      pulse: u.pulse,
      stun: u.stunT > 0,
    });
    if (u.hitT > 0) {
      ctx.globalAlpha = u.hitT * 4;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(u.x, u.y - 16, 24, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (u.stunT > 0) {
      ctx.fillStyle = "#6fae4e";
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y - 14, 26, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (u.hp < u.maxHp) {
      const wFrac = Math.max(0, u.hp / u.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(u.x - 20, u.y - 52, 40, 6);
      ctx.fillStyle = wFrac > 0.5 ? "#7ee081" : wFrac > 0.25 ? "#ffd23f" : "#ff5a4e";
      ctx.fillRect(u.x - 19, u.y - 51, 38 * wFrac, 4);
    }
  }

  // ---------- gambar monster ----------
  private drawMonster(ctx: CanvasRenderingContext2D, m: MonsterEnt) {
    const dieK = m.dead ? Math.max(0, m.dieT / 0.35) : 1;
    const walk = this.animT * (m.def.speed * 22 + 4) + m.seed;
    let yOff = 0;
    if (m.jumpT > 0) {
      const k = 1 - Math.max(0, m.jumpT) / 0.55;
      yOff = -Math.sin(k * Math.PI) * 70;
    }
    ctx.save();
    ctx.translate(m.x, m.y + yOff);
    ctx.scale(dieK, dieK);
    ctx.globalAlpha = m.dead ? dieK : 1;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 26, 24 * m.def.size, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    drawMonsterShape(ctx, m.def, 0, 0, m.def.size, this.animT + m.seed, {
      walk,
      hitT: m.hitT,
      slowT: m.slowT,
      enraged: m.enraged,
      attackT: m.attackT,
      shieldFrac: m.maxShield > 0 ? m.shield / m.maxShield : -1,
      hpFrac: m.hp / m.maxHp,
    });
    ctx.restore();
    // bar HP
    if (!m.dead && m.hp < m.maxHp) {
      const wFrac = Math.max(0, m.hp / m.maxHp);
      const bw = 44 * m.def.size;
      const byy = m.y + yOff - 52 * m.def.size;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(m.x - bw / 2, byy, bw, 7);
      ctx.fillStyle = wFrac > 0.5 ? "#7ee081" : wFrac > 0.25 ? "#ffd23f" : "#ff5a4e";
      ctx.fillRect(m.x - bw / 2 + 1, byy + 1, (bw - 2) * wFrac, 5);
      if (m.shield > 0) {
        ctx.fillStyle = "#9fdcff";
        ctx.fillRect(m.x - bw / 2 + 1, byy + 1, (bw - 2) * (m.shield / m.maxShield), 2);
      }
    }
  }
}

// ============================================================
// BENTUK UNIT (dipakai engine + potret koleksi)
// ============================================================
interface UnitDrawOpts {
  recoil?: number;
  fuse?: number;
  hpFrac?: number;
  charge?: number;
  pulse?: number;
  stun?: boolean;
}

export function drawUnitShape(
  ctx: CanvasRenderingContext2D,
  def: UnitDef,
  x: number,
  y: number,
  s: number,
  t: number,
  o: UnitDrawOpts = {}
) {
  const rec = o.recoil ?? 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const sway = Math.sin(t * 2.2) * 2;
  const blink = Math.sin(t * 1.7 + 1) > 0.985 ? 0.15 : 1;
  const eyes = (ex: number, ey: number, r: number, px = 1.6) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(ex - 6, ey, r, r * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(ex + 6, ey, r, r * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c3a22";
    ctx.beginPath();
    ctx.arc(ex - 6 + px, ey, r * 0.45, 0, Math.PI * 2);
    ctx.arc(ex + 6 + px, ey, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (def.special) {
    case "shooter":
    case "frost": {
      const icy = def.special === "frost";
      // gundukan tanah
      ctx.fillStyle = "#7a4d22";
      ctx.beginPath();
      ctx.ellipse(0, 22, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // batang
      ctx.strokeStyle = icy ? "#3f93b5" : def.dark;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.quadraticCurveTo(sway, -6, sway * 0.5, -26);
      ctx.stroke();
      // daun
      ctx.fillStyle = icy ? "#7fd4f0" : def.body;
      ctx.save();
      ctx.translate(-6, 12);
      ctx.rotate(-0.7 + Math.sin(t * 2.2) * 0.1);
      ctx.beginPath();
      ctx.ellipse(-8, 0, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // kepala
      const hx = sway * 0.5 + rec * 5;
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.arc(hx, -34, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(hx - 4, -39, 11, 0, Math.PI * 2);
      ctx.fill();
      // moncong
      ctx.fillStyle = def.dark;
      ctx.fillRect(hx + 10 - rec * 4, -40, 14, 11);
      ctx.fillStyle = icy ? "#e8fbff" : "#33241a";
      ctx.beginPath();
      ctx.arc(hx + 24 - rec * 4, -34.5, 4, 0, Math.PI * 2);
      ctx.fill();
      eyes(hx - 2, -38, 4.6);
      if (icy) {
        ctx.fillStyle = "#e8fbff";
        for (let i = 0; i < 3; i++) {
          const a = t * 1.5 + (i * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(hx + Math.cos(a) * 22, -34 + Math.sin(a) * 22, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "heavy": {
      ctx.fillStyle = "#7a4d22";
      ctx.beginPath();
      ctx.ellipse(0, 22, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      const sq = 1 - rec * 0.18;
      ctx.save();
      ctx.translate(0, -8);
      ctx.scale(1 + rec * 0.14, sq);
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.arc(0, -10, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(-6, -17, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 2);
      ctx.lineTo(-6, -4);
      ctx.moveTo(6, 8);
      ctx.lineTo(14, 0);
      ctx.stroke();
      // alis garang
      ctx.fillStyle = def.dark;
      ctx.fillRect(-14, -24, 10, 3.6);
      ctx.fillRect(4, -24, 10, 3.6);
      eyes(0, -16, 4.4);
      // mulut pelontar
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.arc(14 - rec * 5, -8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "wall": {
      const frac = o.hpFrac ?? 1;
      ctx.fillStyle = def.dark;
      ctx.fillRect(-26, -46, 52, 70);
      ctx.fillStyle = def.body;
      ctx.fillRect(-22, -42, 44, 64);
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 13, -42);
        ctx.lineTo(i * 13, 22);
        ctx.stroke();
      }
      // mata simpul kayu
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.ellipse(-9, -16, 5, 6.4 * blink, 0, 0, Math.PI * 2);
      ctx.ellipse(9, -16, 5, 6.4 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-8, -18, 1.8, 0, Math.PI * 2);
      ctx.arc(10, -18, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -2, 7, 0.2, Math.PI - 0.2);
      ctx.stroke();
      // retakan
      if (frac < 0.66) {
        ctx.strokeStyle = "rgba(40,22,8,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-16, -40);
        ctx.lineTo(-8, -26);
        ctx.lineTo(-15, -14);
        ctx.stroke();
      }
      if (frac < 0.33) {
        ctx.beginPath();
        ctx.moveTo(14, -36);
        ctx.lineTo(8, -20);
        ctx.lineTo(16, -6);
        ctx.moveTo(-4, 20);
        ctx.lineTo(2, 6);
        ctx.stroke();
      }
      break;
    }
    case "flame": {
      ctx.fillStyle = "#7a4d22";
      ctx.beginPath();
      ctx.ellipse(0, 22, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(sway * 0.4, 0);
      // tubuh cabai
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.ellipse(0, -14, 16, 24, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.ellipse(-5, -20, 8, 14, 0.25, 0, Math.PI * 2);
      ctx.fill();
      // tutup hijau
      ctx.fillStyle = "#3c8a3f";
      ctx.beginPath();
      ctx.ellipse(2, -38, 9, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // api di ujung
      const fl = Math.sin(t * 22) * 3;
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.moveTo(10, 6);
      ctx.quadraticCurveTo(20 + fl, 2, 16 + fl, -8);
      ctx.quadraticCurveTo(26, -2, 22, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff9d3c";
      ctx.beginPath();
      ctx.moveTo(12, 8);
      ctx.quadraticCurveTo(24 + fl, 6, 19 + fl, -2);
      ctx.quadraticCurveTo(26, 4, 20, 12);
      ctx.closePath();
      ctx.fill();
      // mata marah
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(-7, -20, 4.6, 4.6 * blink, 0, 0, Math.PI * 2);
      ctx.ellipse(3, -18, 4.6, 4.6 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c3a22";
      ctx.beginPath();
      ctx.arc(-5.6, -20, 2.1, 0, Math.PI * 2);
      ctx.arc(4.4, -18, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7c1f10";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-12, -27);
      ctx.lineTo(-3, -24);
      ctx.moveTo(8, -25);
      ctx.lineTo(0, -22);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "chain": {
      const ch = o.charge ?? 0;
      ctx.fillStyle = "#7a4d22";
      ctx.beginPath();
      ctx.ellipse(0, 22, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      if (ch > 0.55) {
        ctx.fillStyle = `rgba(255,225,77,${(ch - 0.55) * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, -20, 30 + Math.sin(t * 20) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // badan kaktus
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.ellipse(0, -14, 15, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.ellipse(-16, -18, 6.5, 13, 0.5, 0, Math.PI * 2);
      ctx.ellipse(16, -12, 6.5, 13, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.ellipse(-16, -20, 5.5, 11, 0.5, 0, Math.PI * 2);
      ctx.ellipse(16, -14, 5.5, 11, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // duri kuning
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = 2.4;
      for (const [dx, dy, a] of [[-8, -30, -0.7], [8, -34, 0.7], [-12, -8, -1.2], [12, -2, 1.2], [0, -42, 0]] as const) {
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx + Math.sin(a) * 8, dy - Math.cos(a) * 8);
        ctx.stroke();
      }
      eyes(0, -22, 4.4);
      break;
    }
    case "generator": {
      const pulse = o.pulse ?? 0;
      ctx.fillStyle = "#7a4d22";
      ctx.beginPath();
      ctx.ellipse(0, 22, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3c8a3f";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.quadraticCurveTo(sway, -2, sway * 0.4, -22);
      ctx.stroke();
      if (pulse > 0) {
        ctx.fillStyle = `rgba(255,225,77,${pulse})`;
        ctx.beginPath();
        ctx.arc(sway * 0.4, -34, 26 + (0.6 - pulse) * 30, 0, Math.PI * 2);
        ctx.fill();
      }
      // kelopak
      ctx.save();
      ctx.translate(sway * 0.4, -34);
      ctx.rotate(t * 0.35);
      ctx.fillStyle = def.body;
      for (let i = 0; i < 10; i++) {
        ctx.rotate(Math.PI / 5);
        ctx.beginPath();
        ctx.ellipse(0, -16, 6.5, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#8a5a2b";
      ctx.beginPath();
      ctx.arc(sway * 0.4, -34, 12, 0, Math.PI * 2);
      ctx.fill();
      eyes(sway * 0.4, -36, 3.6);
      ctx.strokeStyle = "#5f3a17";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sway * 0.4, -30, 5, 0.3, Math.PI - 0.3);
      ctx.stroke();
      break;
    }
    case "bomb": {
      const fuse = o.fuse ?? -1;
      ctx.fillStyle = "#7a4d22";
      ctx.beginPath();
      ctx.ellipse(0, 22, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      const wob = 1 + Math.sin(t * 14) * 0.06 * (fuse > 0 ? 1 : 0.2);
      ctx.save();
      ctx.scale(wob, 2 - wob);
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.arc(0, -14, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(-5, -20, 9, 0, Math.PI * 2);
      ctx.fill();
      if (fuse > 0 && Math.sin(t * 26) > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(0, -14, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // sumbu
      ctx.strokeStyle = "#5f3a17";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(2, -31);
      ctx.quadraticCurveTo(8, -40, 14, -38);
      ctx.stroke();
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.arc(14 + Math.sin(t * 30) * 2, -38, 3.4, 0, Math.PI * 2);
      ctx.fill();
      eyes(0, -16, 4);
      break;
    }
  }
  ctx.restore();
}

// ============================================================
// BENTUK MONSTER
// ============================================================
interface MonsterDrawOpts {
  walk?: number;
  hitT?: number;
  slowT?: number;
  enraged?: boolean;
  attackT?: number;
  shieldFrac?: number;
  hpFrac?: number;
}

export function drawMonsterShape(
  ctx: CanvasRenderingContext2D,
  def: MonsterDef,
  x: number,
  y: number,
  size: number,
  t: number,
  o: MonsterDrawOpts = {}
) {
  const walk = o.walk ?? t * 8;
  const atk = o.attackT ?? 0;
  const lunge = atk > 0 ? Math.sin((0.25 - atk) * 20) * 5 : 0;
  ctx.save();
  ctx.translate(x - lunge, y);
  ctx.scale(size, size);
  const bob = Math.abs(Math.sin(walk)) * 3;
  const squash = 1 + Math.sin(walk * 2) * 0.05;

  if (o.enraged) {
    ctx.fillStyle = "rgba(255,90,78,0.25)";
    ctx.beginPath();
    ctx.arc(0, -16, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // kaki
  ctx.fillStyle = def.dark;
  const step = Math.sin(walk) * 6;
  ctx.beginPath();
  ctx.ellipse(-9 + step, 22, 7, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(9 - step, 22, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // fitur belakang per jenis (cangkang, piring batu, sayap)
  if (def.special === "shield") {
    ctx.fillStyle = "#2f7f6c";
    ctx.beginPath();
    ctx.arc(4, -20, 24, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#1d5448";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(4, -20, 17, Math.PI * 1.1, -0.1);
    ctx.arc(4, -20, 10, Math.PI * 1.2, -0.2);
    ctx.stroke();
    if ((o.shieldFrac ?? -1) > 0) {
      ctx.strokeStyle = `rgba(159,220,255,${0.5 + Math.sin(t * 5) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -14, 31, Math.PI * 0.9, Math.PI * 2.05);
      ctx.stroke();
    }
  }
  if (def.special === "armor" || def.ability === "rage") {
    ctx.fillStyle = "#5f584c";
    for (const [px, py, wdt] of [[-10, -34, 14], [4, -38, 15], [-2, -22, 18]] as const) {
      ctx.beginPath();
      ctx.roundRect(px, py, wdt, 10, 4);
      ctx.fill();
    }
  }
  if (def.special === "heal") {
    const flap = Math.sin(t * 14) * 0.5 + 0.6;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.save();
    ctx.translate(2, -30);
    ctx.scale(1, flap);
    ctx.beginPath();
    ctx.ellipse(-14, -8, 13, 7, -0.5, 0, Math.PI * 2);
    ctx.ellipse(14, -8, 13, 7, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(184,255,217,0.4)";
    ctx.beginPath();
    ctx.arc(0, -16, 26 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // badan
  ctx.save();
  ctx.translate(0, -bob);
  ctx.scale(2 - squash, squash);
  ctx.fillStyle = def.body;
  ctx.beginPath();
  ctx.ellipse(0, -14, 22, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = def.belly;
  ctx.beginPath();
  ctx.ellipse(-4, -8, 13, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // detail kepala / fitur depan
  switch (def.id) {
    case "nibbler":
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, -36 - bob);
      ctx.quadraticCurveTo(-8, -46, -12, -48 - bob);
      ctx.moveTo(6, -36 - bob);
      ctx.quadraticCurveTo(8, -46, 12, -48 - bob);
      ctx.stroke();
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.arc(-12, -48 - bob, 3, 0, Math.PI * 2);
      ctx.arc(12, -48 - bob, 3, 0, Math.PI * 2);
      ctx.fill();
      // gigi seri
      ctx.fillStyle = "#fff";
      ctx.fillRect(-8, -6 - bob, 6, 7);
      ctx.fillRect(0, -6 - bob, 6, 7);
      break;
    case "sprinter":
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(24 + i * 7, -20 - bob + i * 6);
        ctx.lineTo(36 + i * 7, -20 - bob + i * 6);
        ctx.stroke();
      }
      break;
    case "hopper":
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 3;
      for (const sx of [-9, 9]) {
        ctx.beginPath();
        ctx.moveTo(sx, 20);
        ctx.lineTo(sx - 4, 14);
        ctx.lineTo(sx + 4, 10);
        ctx.lineTo(sx - 4, 6);
        ctx.stroke();
      }
      break;
    case "spitter":
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.ellipse(-20, -16 - bob, 12, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.arc(-30, -17 - bob, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.projColor ?? "#c86ee0";
      ctx.beginPath();
      ctx.arc(-30, -12 - bob + Math.sin(t * 6) * 2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "brood":
      ctx.fillStyle = def.belly;
      ctx.beginPath();
      ctx.ellipse(6, -4 - bob, 16, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.dark;
      for (const [dx, dy] of [[2, -6], [10, -2], [6, -10]] as const) {
        ctx.beginPath();
        ctx.arc(dx, dy - bob, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "dewdrop":
      ctx.fillStyle = "#ffe14d";
      ctx.save();
      ctx.translate(14, -26 - bob);
      ctx.rotate(t * 2);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(2, -6);
        ctx.lineTo(-2, -6);
        ctx.fill();
      }
      ctx.restore();
      break;
    case "brute":
      // rahang
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.roundRect(-24, -8 - bob, 26, 12, 5);
      ctx.fill();
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-21 + i * 6, -8 - bob);
        ctx.lineTo(-18 + i * 6, -2 - bob);
        ctx.lineTo(-15 + i * 6, -8 - bob);
        ctx.fill();
      }
      // tanduk
      ctx.fillStyle = "#e8d9a8";
      ctx.beginPath();
      ctx.moveTo(-8, -34 - bob);
      ctx.lineTo(-14, -46 - bob);
      ctx.lineTo(-2, -38 - bob);
      ctx.moveTo(8, -34 - bob);
      ctx.lineTo(14, -46 - bob);
      ctx.lineTo(2, -38 - bob);
      ctx.fill();
      break;
    case "gloom":
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.arc(0, -22 - bob, 23, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      // mata menyala
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.ellipse(-8, -20 - bob, 4.4, 5.6, 0, 0, Math.PI * 2);
      ctx.ellipse(6, -20 - bob, 4.4, 5.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "mite":
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 1.6;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 8, -8 - bob);
        ctx.lineTo(sx * 14, -4 - bob);
        ctx.moveTo(sx * 8, -14 - bob);
        ctx.lineTo(sx * 15, -15 - bob);
        ctx.stroke();
      }
      break;
    case "grubking":
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.moveTo(-14, -38 - bob);
      ctx.lineTo(-10, -50 - bob);
      ctx.lineTo(-4, -40 - bob);
      ctx.lineTo(0, -52 - bob);
      ctx.lineTo(4, -40 - bob);
      ctx.lineTo(10, -50 - bob);
      ctx.lineTo(14, -38 - bob);
      ctx.closePath();
      ctx.fill();
      break;
    case "mawzilla":
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.roundRect(-28, -10 - bob, 34, 16, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-25 + i * 7, -10 - bob);
        ctx.lineTo(-22 + i * 7, -1 - bob);
        ctx.lineTo(-19 + i * 7, -10 - bob);
        ctx.fill();
      }
      break;
    case "sludgelord":
      ctx.fillStyle = "#77ad3f";
      for (let i = 0; i < 3; i++) {
        const dy = ((t * 12 + i * 14) % 30);
        ctx.beginPath();
        ctx.arc(-14 + i * 14, -2 - bob + dy * 0.4, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "hivequeen":
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.moveTo(-12, -38 - bob);
      ctx.lineTo(-8, -48 - bob);
      ctx.lineTo(-3, -40 - bob);
      ctx.lineTo(0, -50 - bob);
      ctx.lineTo(3, -40 - bob);
      ctx.lineTo(8, -48 - bob);
      ctx.lineTo(12, -38 - bob);
      ctx.closePath();
      ctx.fill();
      const flap2 = Math.sin(t * 12) * 0.4 + 0.7;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.save();
      ctx.translate(4, -30 - bob);
      ctx.scale(1, flap2);
      ctx.beginPath();
      ctx.ellipse(-16, -8, 15, 8, -0.5, 0, Math.PI * 2);
      ctx.ellipse(16, -8, 15, 8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    case "rockjaw":
      ctx.fillStyle = "#55503f";
      ctx.beginPath();
      ctx.roundRect(-26, -12 - bob, 30, 15, 6);
      ctx.fill();
      ctx.fillStyle = "#d0cab8";
      ctx.fillRect(-24, -12 - bob, 26, 4);
      ctx.fillStyle = def.dark;
      ctx.fillRect(-14, -34 - bob, 26, 6);
      break;
  }

  // mata (kecuali gloom sudah custom)
  if (def.id !== "gloom") {
    const er = def.id === "mite" ? 3.4 : 5;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-9, -20 - bob, er, er, 0, 0, Math.PI * 2);
    ctx.ellipse(3, -20 - bob, er, er, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(-11, -20 - bob, er * 0.5, 0, Math.PI * 2);
    ctx.arc(1, -20 - bob, er * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // mulut serang
  if (atk > 0 && def.id !== "gloom") {
    ctx.fillStyle = "#7c1f10";
    ctx.beginPath();
    ctx.ellipse(-12, -10 - bob, 6, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // status efek
  if ((o.slowT ?? 0) > 0) {
    ctx.fillStyle = "rgba(159,220,255,0.35)";
    ctx.beginPath();
    ctx.arc(x, y - 16 * size, 26 * size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8fbff";
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 20 * size, y - 16 * size + Math.sin(a) * 20 * size);
      ctx.lineTo(x + Math.cos(a) * 20 * size + 3, y - 16 * size + Math.sin(a) * 20 * size - 7);
      ctx.lineTo(x + Math.cos(a) * 20 * size + 6, y - 16 * size + Math.sin(a) * 20 * size);
      ctx.fill();
    }
  }
  if ((o.hitT ?? 0) > 0) {
    ctx.globalAlpha = Math.min(0.65, (o.hitT ?? 0) * 5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y - 16 * size, 24 * size, 26 * size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------- potret untuk UI ----------
export function paintUnitPortrait(canvas: HTMLCanvasElement, id: string) {
  const def = UNIT_MAP[id];
  if (!def) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = canvas.width;
  ctx.clearRect(0, 0, s, canvas.height);
  ctx.save();
  ctx.scale(s / 96, canvas.height / 96);
  drawUnitShape(ctx, def, 48, 72, 0.92, 2.2, { hpFrac: 1, fuse: def.special === "bomb" ? 1 : -1, charge: 0.8 });
  ctx.restore();
}

export function paintMonsterPortrait(canvas: HTMLCanvasElement, id: string) {
  const def = MONSTER_MAP[id] ?? BOSS_MAP[id];
  if (!def) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(canvas.width / 96, canvas.height / 96);
  drawMonsterShape(ctx, def, 48, 66, def.boss ? 0.55 : 0.85, 2.2, {});
  ctx.restore();
}
