// Save system — localStorage (setara local save Android saat di-wrap WebView/Capacitor)
import { expNeed } from "./data";

export interface Settings {
  musicVol: number; // 0..1
  sfxVol: number; // 0..1
  musicOn: boolean;
  sfxOn: boolean;
}

export interface SaveData {
  coins: number;
  exp: number;
  playerLv: number;
  unlocked: number; // level tertinggi yang terbuka
  best: Record<number, { clear: boolean; nodmg: boolean }>;
  upgrades: Record<string, number>;
  settings: Settings;
  kills: number;
  seenTutorial: boolean;
}

const KEY = "garden-guardians-save-v1";

export const DEFAULT_SAVE: SaveData = {
  coins: 150,
  exp: 0,
  playerLv: 1,
  unlocked: 1,
  best: {},
  upgrades: {},
  settings: { musicVol: 0.55, sfxVol: 0.8, musicOn: true, sfxOn: true },
  kills: 0,
  seenTutorial: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw);
    const merged: SaveData = {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings ?? {}) },
      best: parsed.best ?? {},
      upgrades: parsed.upgrades ?? {},
    };
    return merged;
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function persistSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage penuh / private mode — abaikan */
  }
}

export function resetSave(): SaveData {
  const fresh = structuredClone(DEFAULT_SAVE);
  persistSave(fresh);
  return fresh;
}

export function upgradeLevel(s: SaveData, unitId: string): number {
  return Math.max(1, s.upgrades[unitId] ?? 1);
}

/** Tambah exp, kembalikan save baru dengan playerLv yang sudah naik level. */
export function addExp(s: SaveData, amount: number): SaveData {
  let exp = s.exp + amount;
  let lv = s.playerLv;
  while (exp >= expNeed(lv)) {
    exp -= expNeed(lv);
    lv++;
  }
  return { ...s, exp, playerLv: lv };
}
