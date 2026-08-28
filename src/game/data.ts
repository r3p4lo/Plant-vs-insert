// ============================================================
// Garden Guardians — Data & Balance (semua original)
// ============================================================

export type UnitSpecial =
  | "shooter"
  | "heavy"
  | "wall"
  | "frost"
  | "flame"
  | "chain"
  | "generator"
  | "bomb";

export interface UnitDef {
  id: string;
  name: string;
  tag: string;
  desc: string;
  cost: number;
  cooldown: number; // detik cooldown kartu setelah menanam
  hp: number;
  dmg: number;
  rate: number; // serangan per detik
  range: number; // dalam sel ke depan
  special: UnitSpecial;
  unlockLevel: number;
  body: string;
  accent: string;
  dark: string;
  projColor: string;
  genAmount?: number;
  genInterval?: number;
  slowFactor?: number;
  slowDur?: number;
  burnDps?: number;
  burnDur?: number;
  chainCount?: number;
  fuse?: number;
  blastRadius?: number;
}

export const UNITS: UnitDef[] = [
  {
    id: "sprout",
    name: "Sprout Shooter",
    tag: "Penembak",
    desc: "Menembakkan biji energi ke satu jalur. Cepat dan hemat.",
    cost: 50,
    cooldown: 5,
    hp: 80,
    dmg: 20,
    rate: 1.3,
    range: 9,
    special: "shooter",
    unlockLevel: 1,
    body: "#5cb85c",
    accent: "#8fd66a",
    dark: "#3c8a3f",
    projColor: "#b6ec7a",
  },
  {
    id: "sun",
    name: "Sun Sprout",
    tag: "Energi",
    desc: "Bunga matahari yang menghasilkan Energi secara berkala.",
    cost: 75,
    cooldown: 8,
    hp: 60,
    dmg: 0,
    rate: 0,
    range: 0,
    special: "generator",
    unlockLevel: 1,
    body: "#ffd23f",
    accent: "#ffe98a",
    dark: "#e6a817",
    projColor: "#ffd23f",
    genAmount: 25,
    genInterval: 6,
  },
  {
    id: "boulder",
    name: "Boulder Bulb",
    tag: "Berat",
    desc: "Melontarkan batu besar. Damage tinggi, tembakan lambat.",
    cost: 125,
    cooldown: 9,
    hp: 130,
    dmg: 70,
    rate: 0.42,
    range: 9,
    special: "heavy",
    unlockLevel: 2,
    body: "#9aa7b0",
    accent: "#c3cdd4",
    dark: "#5f6d77",
    projColor: "#b9c4cc",
  },
  {
    id: "bark",
    name: "Bark Guardian",
    tag: "Tembok",
    desc: "Pagar kayu kuno ber-HP raksasa. Menahan laju monster.",
    cost: 50,
    cooldown: 20,
    hp: 650,
    dmg: 0,
    rate: 0,
    range: 0,
    special: "wall",
    unlockLevel: 3,
    body: "#a9713a",
    accent: "#c98f52",
    dark: "#6b431d",
    projColor: "#a9713a",
  },
  {
    id: "frost",
    name: "Frost Blossom",
    tag: "Es",
    desc: "Serpihan esnya memperlambat monster 50% selama 3 detik.",
    cost: 75,
    cooldown: 8,
    hp: 85,
    dmg: 10,
    rate: 0.95,
    range: 9,
    special: "frost",
    unlockLevel: 5,
    body: "#7fd4f0",
    accent: "#c8f1ff",
    dark: "#3f93b5",
    projColor: "#bdeeff",
    slowFactor: 0.5,
    slowDur: 3,
  },
  {
    id: "ember",
    name: "Ember Chili",
    tag: "Api",
    desc: "Menyembur api ke area depan, meninggalkan luka bakar.",
    cost: 100,
    cooldown: 10,
    hp: 90,
    dmg: 14,
    rate: 1.5,
    range: 2.4,
    special: "flame",
    unlockLevel: 8,
    body: "#ff5a3c",
    accent: "#ff9d3c",
    dark: "#c22f1c",
    projColor: "#ff9d3c",
    burnDps: 8,
    burnDur: 2.2,
  },
  {
    id: "zap",
    name: "Zap Cactus",
    tag: "Listrik",
    desc: "Petirnya menyambar dan melompat hingga 3 target.",
    cost: 150,
    cooldown: 14,
    hp: 100,
    dmg: 45,
    rate: 0.36,
    range: 9,
    special: "chain",
    unlockLevel: 12,
    body: "#4fbf5e",
    accent: "#ffe14d",
    dark: "#2b8f3c",
    projColor: "#ffe14d",
    chainCount: 3,
  },
  {
    id: "boom",
    name: "Boom Berry",
    tag: "Bom",
    desc: "Meledak dahsyat di area 3×3 lalu gugur. Sekali pakai.",
    cost: 25,
    cooldown: 30,
    hp: 40,
    dmg: 380,
    rate: 0,
    range: 1.5,
    special: "bomb",
    unlockLevel: 16,
    body: "#c94f7c",
    accent: "#ff8fb0",
    dark: "#8c2c52",
    projColor: "#ff8fb0",
    fuse: 1.25,
    blastRadius: 1.6,
  },
];

export const UNIT_MAP: Record<string, UnitDef> = Object.fromEntries(
  UNITS.map((u) => [u.id, u])
);

// ---------- Monster ----------

export type MonsterSpecial =
  | "shield"
  | "armor"
  | "jump"
  | "swarm"
  | "heal"
  | "ranged"
  | "elite";

export interface MonsterDef {
  id: string;
  name: string;
  desc: string;
  hp: number;
  speed: number; // sel per detik
  dmg: number;
  def: number; // pengurangan damage flat
  atkRate: number;
  size: number; // pengali radius
  body: string;
  belly: string;
  dark: string;
  unlockLevel: number; // -1 = hanya spawn
  coins: number;
  exp: number;
  special?: MonsterSpecial;
  shieldHp?: number;
  healRate?: number;
  healRadius?: number;
  spawnId?: string;
  spawnInterval?: number;
  spawnCount?: number;
  projColor?: string;
  boss?: boolean;
  ability?: "summon" | "devour" | "sludge" | "hive" | "rage";
  abilityCd?: number;
  title?: string;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: "nibbler",
    name: "Nibbler",
    desc: "Pemakan daun rakus. Lambat dan lemah, tapi datang beramai-ramai.",
    hp: 60,
    speed: 0.36,
    dmg: 10,
    def: 0,
    atkRate: 1,
    size: 1,
    body: "#7ec850",
    belly: "#c9eaa8",
    dark: "#4c8a2e",
    unlockLevel: 1,
    coins: 2,
    exp: 2,
  },
  {
    id: "sprinter",
    name: "Sprinter",
    desc: "Kumbang pelari super cepat. HP rendah, tapi sulit dikejar.",
    hp: 45,
    speed: 0.78,
    dmg: 8,
    def: 0,
    atkRate: 1.2,
    size: 0.85,
    body: "#e8b23c",
    belly: "#ffe3a1",
    dark: "#a87a1c",
    unlockLevel: 2,
    coins: 3,
    exp: 3,
  },
  {
    id: "shellback",
    name: "Shellback",
    desc: "Siput perisai. Cangkangnya menyerap damage sebelum HP-nya.",
    hp: 80,
    speed: 0.3,
    dmg: 12,
    def: 0,
    atkRate: 0.9,
    size: 1.05,
    body: "#5fb9a3",
    belly: "#c6ece1",
    dark: "#2f7f6c",
    unlockLevel: 4,
    coins: 4,
    exp: 4,
    special: "shield",
    shieldHp: 70,
  },
  {
    id: "rockhide",
    name: "Rockhide",
    desc: "Berkulit batu. Mengurangi semua damage yang diterima.",
    hp: 150,
    speed: 0.28,
    dmg: 14,
    def: 8,
    atkRate: 0.9,
    size: 1.1,
    body: "#9b9284",
    belly: "#d6cfc2",
    dark: "#5f584c",
    unlockLevel: 6,
    coins: 5,
    exp: 5,
    special: "armor",
  },
  {
    id: "hopper",
    name: "Hopper",
    desc: "Belalang pelompat. Bisa melompati satu unit pertahanan!",
    hp: 70,
    speed: 0.42,
    dmg: 12,
    def: 0,
    atkRate: 1,
    size: 0.95,
    body: "#a3d14c",
    belly: "#e0f3b8",
    dark: "#6c9a2a",
    unlockLevel: 8,
    coins: 5,
    exp: 5,
    special: "jump",
  },
  {
    id: "spitter",
    name: "Spitter",
    desc: "Menyemburkan lendir asam dari jarak jauh ke unitmu.",
    hp: 95,
    speed: 0.3,
    dmg: 12,
    def: 0,
    atkRate: 0.55,
    size: 1,
    body: "#b76ec9",
    belly: "#e6c6f0",
    dark: "#7c3f8f",
    unlockLevel: 10,
    coins: 6,
    exp: 6,
    special: "ranged",
    projColor: "#c86ee0",
  },
  {
    id: "brood",
    name: "Broodmother",
    desc: "Induk koloni. Terus menetaskan Mite selama ia hidup.",
    hp: 210,
    speed: 0.24,
    dmg: 14,
    def: 0,
    atkRate: 0.8,
    size: 1.3,
    body: "#d98a4e",
    belly: "#f6d3ae",
    dark: "#96552a",
    unlockLevel: 12,
    coins: 8,
    exp: 8,
    special: "swarm",
    spawnId: "mite",
    spawnInterval: 8,
    spawnCount: 2,
  },
  {
    id: "dewdrop",
    name: "Dewdrop Fairy",
    desc: "Peri embun. Menyembuhkan monster di sekitarnya.",
    hp: 110,
    speed: 0.3,
    dmg: 6,
    def: 0,
    atkRate: 0.8,
    size: 0.9,
    body: "#6ec9e8",
    belly: "#d9f4ff",
    dark: "#3a8cad",
    unlockLevel: 14,
    coins: 7,
    exp: 7,
    special: "heal",
    healRate: 9,
    healRadius: 1.7,
  },
  {
    id: "brute",
    name: "Chomper Brute",
    desc: "Raksasa rahang besi. Sangat lambat, HP dan damage mengerikan.",
    hp: 360,
    speed: 0.18,
    dmg: 35,
    def: 2,
    atkRate: 0.7,
    size: 1.45,
    body: "#c96a5f",
    belly: "#f0c4bd",
    dark: "#8a3a32",
    unlockLevel: 16,
    coins: 10,
    exp: 10,
  },
  {
    id: "gloom",
    name: "Gloom Elite",
    desc: "Bayangan elit. Mengamuk: makin cepat & ganas saat HP rendah.",
    hp: 520,
    speed: 0.3,
    dmg: 26,
    def: 4,
    atkRate: 0.9,
    size: 1.3,
    body: "#5c6b7d",
    belly: "#a8b8c9",
    dark: "#333f4d",
    unlockLevel: 20,
    coins: 14,
    exp: 14,
    special: "elite",
  },
  {
    id: "mite",
    name: "Mite",
    desc: "Kutu kecil hasil tetasan Broodmother. Cepat tapi rapuh.",
    hp: 22,
    speed: 0.62,
    dmg: 4,
    def: 0,
    atkRate: 1.2,
    size: 0.55,
    body: "#d9b03c",
    belly: "#f5e0a8",
    dark: "#96771f",
    unlockLevel: -1,
    coins: 1,
    exp: 1,
  },
];

export const MONSTER_MAP: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);

export const BOSSES: MonsterDef[] = [
  {
    id: "grubking",
    name: "Grub King",
    title: "Raja Ulat Rakus",
    desc: "Raja para Nibbler. Memanggil pengawal dari liang tanah.",
    hp: 1600,
    speed: 0.16,
    dmg: 40,
    def: 3,
    atkRate: 0.8,
    size: 2.1,
    body: "#8fd14f",
    belly: "#dcf3b6",
    dark: "#547f24",
    unlockLevel: 5,
    coins: 60,
    exp: 40,
    boss: true,
    ability: "summon",
    abilityCd: 9,
  },
  {
    id: "mawzilla",
    name: "Mawzilla",
    title: "Rahang Penghancur",
    desc: "Melahap unit pertahananmu bulat-bulat. Tembok pun remuk.",
    hp: 3000,
    speed: 0.13,
    dmg: 60,
    def: 5,
    atkRate: 0.7,
    size: 2.3,
    body: "#d95f4f",
    belly: "#f7c8c0",
    dark: "#8f2e24",
    unlockLevel: 10,
    coins: 90,
    exp: 60,
    boss: true,
    ability: "devour",
    abilityCd: 11,
  },
  {
    id: "sludgelord",
    name: "Sludgelord",
    title: "Penguasa Lumpur",
    desc: "Meludahi petak kebun dengan lendir: unit terkejang, lahan terkunci.",
    hp: 4400,
    speed: 0.14,
    dmg: 50,
    def: 6,
    atkRate: 0.75,
    size: 2.2,
    body: "#6fae4e",
    belly: "#c0e8a0",
    dark: "#3e6e26",
    unlockLevel: 15,
    coins: 120,
    exp: 80,
    boss: true,
    ability: "sludge",
    abilityCd: 13,
  },
  {
    id: "hivequeen",
    name: "Hive Queen",
    title: "Ratu Sarang",
    desc: "Mengerahkan gelombang serbuk dan serangga tanpa henti.",
    hp: 5600,
    speed: 0.15,
    dmg: 45,
    def: 6,
    atkRate: 0.8,
    size: 2.2,
    body: "#e0a83c",
    belly: "#ffe9b8",
    dark: "#96691c",
    unlockLevel: 20,
    coins: 150,
    exp: 100,
    boss: true,
    ability: "hive",
    abilityCd: 8,
  },
  {
    id: "rockjaw",
    name: "Rockjaw",
    title: "Rahang Batu Purba",
    desc: "Golem batu purba. Mengamuk dan melesat saat HP-nya menipis.",
    hp: 7200,
    speed: 0.12,
    dmg: 70,
    def: 12,
    atkRate: 0.7,
    size: 2.4,
    body: "#8f8a7d",
    belly: "#d0cab8",
    dark: "#55503f",
    unlockLevel: 25,
    coins: 200,
    exp: 130,
    boss: true,
    ability: "rage",
    abilityCd: 0,
  },
];

export const BOSS_MAP: Record<string, MonsterDef> = Object.fromEntries(
  BOSSES.map((b) => [b.id, b])
);

// ---------- Upgrade ----------

export const MAX_UPGRADE = 10;

export function upgradeCost(def: UnitDef, currentLevel: number): number {
  return Math.max(60, Math.round(def.cost * 1.2 * Math.pow(1.55, currentLevel - 1)));
}

export interface UnitStats {
  dmg: number;
  hp: number;
  rate: number;
  gen: number;
}

export function unitStats(def: UnitDef, lvl: number): UnitStats {
  const l = Math.max(1, Math.min(MAX_UPGRADE, lvl));
  return {
    dmg: Math.round(def.dmg * Math.pow(1.25, l - 1)),
    hp: Math.round(def.hp * (1 + 0.22 * (l - 1))),
    rate: +(def.rate * (1 + 0.05 * (l - 1))).toFixed(2),
    gen: Math.round((def.genAmount ?? 0) * Math.pow(1.18, l - 1)),
  };
}

// ---------- Level generation (endless) ----------

export interface SpawnEntry {
  t: number;
  type: string; // monster id atau "boss:<id>"
  lane: number;
}
export interface WaveDef {
  entries: SpawnEntry[];
}
export interface LevelDef {
  n: number;
  tier: string;
  tierColor: string;
  waves: WaveDef[];
  hpMul: number;
  dmgMul: number;
  spdMul: number;
  isBoss: boolean;
  bossId: string | null;
  startEnergy: number;
  baseHp: number;
  rewardCoins: number;
  rewardExp: number;
}

export const TIERS = [
  { name: "Easy", range: "1–10", color: "#6cc24a" },
  { name: "Normal", range: "11–20", color: "#ffd23f" },
  { name: "Hard", range: "21–40", color: "#ff9f43" },
  { name: "Very Hard", range: "41–60", color: "#ff5a4e" },
  { name: "Endless", range: "61+", color: "#4ecdc4" },
];

export function tierOf(n: number) {
  if (n <= 10) return TIERS[0];
  if (n <= 20) return TIERS[1];
  if (n <= 40) return TIERS[2];
  if (n <= 60) return TIERS[3];
  return TIERS[4];
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bossForLevel(n: number): string {
  const k = Math.floor(n / 5); // 1,2,3...
  const idx = (k - 1) % BOSSES.length;
  return BOSSES[idx].id;
}

export function bossHpMul(n: number): number {
  const k = Math.max(0, Math.floor(n / 5) - 1);
  return 1 + k * 0.55;
}

export function makeLevel(n: number, playerLevel = 1): LevelDef {
  const rng = mulberry32(n * 9973 + 137);
  const tier = tierOf(n);
  const totalWaves = Math.min(3 + Math.floor((n - 1) / 5), 10);
  const isBoss = n % 5 === 0;
  const hpMul = Math.pow(1.085, n - 1);
  const dmgMul = 1 + (n - 1) * 0.1;
  const spdMul = Math.min(1 + (n - 1) * 0.008, 1.8);

  const pool = MONSTERS.filter((m) => m.unlockLevel > 0 && m.unlockLevel <= n);
  const waves: WaveDef[] = [];
  for (let w = 0; w < totalWaves; w++) {
    const progress = w / Math.max(1, totalWaves - 1);
    const isLast = w === totalWaves - 1;
    let count = Math.round(3 + n * 0.45 + w * 1.15);
    if (isBoss && isLast) count = Math.min(count, 8);
    count = Math.min(count, 22);
    const dur = 10 + Math.min(n * 0.25, 8) + w;
    const entries: SpawnEntry[] = [];
    for (let i = 0; i < count; i++) {
      // bobot: tipe awal dominan, tipe kuat muncul belakangan
      let pick = 0;
      let bestW = -1;
      for (let p = 0; p < pool.length; p++) {
        const recency = p / Math.max(1, pool.length - 1);
        const wgt = Math.max(
          0.12,
          1 - recency * 1.1 + progress * recency * 1.9 + (rng() - 0.5) * 0.5
        );
        if (wgt > bestW) {
          bestW = wgt;
          pick = p;
        }
      }
      entries.push({
        t: (i * dur) / count + rng() * 0.6,
        type: pool[pick].id,
        lane: Math.floor(rng() * 5),
      });
    }
    if (isBoss && isLast) {
      entries.push({ t: 2.5, type: "boss:" + bossForLevel(n), lane: 2 });
    }
    entries.sort((a, b) => a.t - b.t);
    waves.push({ entries });
  }

  return {
    n,
    tier: tier.name,
    tierColor: tier.color,
    waves,
    hpMul,
    dmgMul,
    spdMul,
    isBoss,
    bossId: isBoss ? bossForLevel(n) : null,
    startEnergy: Math.min(150 + (playerLevel - 1) * 6, 320),
    baseHp: 100,
    rewardCoins: Math.round(30 + n * 8 + (isBoss ? 50 : 0)),
    rewardExp: 20 + n * 6,
  };
}

export function expNeed(playerLv: number) {
  return 80 + playerLv * 40;
}
