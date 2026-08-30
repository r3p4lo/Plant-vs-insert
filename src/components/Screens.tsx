// ============================================================
// Garden Guardians — Menu, Koleksi, Pengaturan & komponen bersama
// ============================================================
import { useEffect, useRef, useState } from "react";
import {
  UNITS,
  MONSTERS,
  BOSSES,
  TIERS,
  unitStats,
  upgradeCost,
  MAX_UPGRADE,
} from "../game/data";
import type { SaveData, Settings } from "../game/save";
import { upgradeLevel } from "../game/save";
import { paintUnitPortrait, paintMonsterPortrait } from "../game/engine";
import { audio } from "../game/audio";

// ---------- tombol & ikon ----------
const BTN_COLORS: Record<string, string> = {
  green: "bg-[#5cb85c] text-white",
  yellow: "bg-[#ffd23f] text-[#5f3a17]",
  red: "bg-[#ff5a4e] text-white",
  wood: "bg-[#a9713a] text-white",
  blue: "bg-[#4fb3e0] text-white",
  dark: "bg-[#37474f] text-white",
};

export function GButton({
  children,
  onClick,
  color = "green",
  className = "",
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        audio.ensure();
        audio.play("click");
        onClick?.();
      }}
      className={`btn3d flex items-center justify-center gap-2 ${BTN_COLORS[color] ?? BTN_COLORS.green} ${
        small ? "px-4 py-2 text-sm" : "px-6 py-3 text-lg"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#e6a817" stroke="#7a4d22" strokeWidth="2" />
      <circle cx="12" cy="12" r="6.5" fill="#ffd23f" />
      <path d="M12 8.5l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4z" fill="#e6a817" />
    </svg>
  );
}
export function BoltIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M13 2 5 13h5l-2 9 9-12h-5l1-8z" fill="#ffe14d" stroke="#a87a1c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
export function HeartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 5 6 5c2.2 0 3.7 1.2 4.5 2.4h3C14.3 6.2 15.8 5 18 5c3.6 0 5.6 3.6 4 6.7-2.5 4.6-10 9.3-10 9.3z"
        fill="#ff5a4e"
        stroke="#8f2e24"
        strokeWidth="1.6"
      />
    </svg>
  );
}
export function StarIcon({ size = 28, filled = true, delay = 0 }: { size?: number; filled?: boolean; delay?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="anim-star" style={{ animationDelay: `${delay}s` }}>
      <path
        d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8-5.1-4.7 6.9-.8z"
        fill={filled ? "#ffd23f" : "rgba(0,0,0,0.35)"}
        stroke={filled ? "#a87a1c" : "rgba(0,0,0,0.4)"}
        strokeWidth="1.4"
      />
    </svg>
  );
}
export function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="5" y="10" width="14" height="10" rx="2.5" fill="#c3cdd4" stroke="#37474f" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#37474f" strokeWidth="2.4" />
      <circle cx="12" cy="15" r="1.8" fill="#37474f" />
    </svg>
  );
}
export function PauseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="6" y="4" width="4.5" height="16" rx="1.6" fill="currentColor" />
      <rect x="13.5" y="4" width="4.5" height="16" rx="1.6" fill="currentColor" />
    </svg>
  );
}
export function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
    </svg>
  );
}
export function FfIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M3 5v14l8-7zM13 5v14l8-7z" fill="currentColor" />
    </svg>
  );
}
export function ShovelIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M14.5 3.5l6 6-3 3-6-6z" fill="#a9713a" stroke="#5f3a17" strokeWidth="1.4" />
      <path d="M11.5 6.5 4 14c-1.5 1.5-1.5 4.5 0 6s4.5 1.5 6 0l7.5-7.5" fill="#c3cdd4" stroke="#37474f" strokeWidth="1.4" />
    </svg>
  );
}
export function BackIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function SkullIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2a8.5 8.5 0 0 0-8.5 8.5c0 3 .9 4.7 2.5 6v3.5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3.5c1.6-1.3 2.5-3 2.5-6A8.5 8.5 0 0 0 12 2z"
        fill="#e8e0d0"
        stroke="#5f584c"
        strokeWidth="1.4"
      />
      <circle cx="8.6" cy="10.5" r="2.4" fill="#333f4d" />
      <circle cx="15.4" cy="10.5" r="2.4" fill="#333f4d" />
      <path d="M12 13.5l1.2 2.5h-2.4z" fill="#333f4d" />
      <rect x="9" y="18" width="1.6" height="3" fill="#5f584c" />
      <rect x="11.5" y="18" width="1.6" height="3" fill="#5f584c" />
      <rect x="14" y="18" width="1.6" height="3" fill="#5f584c" />
    </svg>
  );
}
export function DownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 3v11m0 0 4.5-4.5M12 14 7.5 9.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
export function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="6.5" y="2.5" width="11" height="19" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M10.5 5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1.4" fill="currentColor" />
    </svg>
  );
}
export function LeafBadge({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z" fill="#6cc24a" stroke="#2e7d32" strokeWidth="1.6" />
      <path d="M6 18C10 14 14 10 18 6" fill="none" stroke="#2e7d32" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function UnitIcon({ id, size = 64 }: { id: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintUnitPortrait(ref.current, id);
  }, [id]);
  return <canvas ref={ref} width={96} height={96} style={{ width: size, height: size }} />;
}
export function MonsterIcon({ id, size = 64 }: { id: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintMonsterPortrait(ref.current, id);
  }, [id]);
  return <canvas ref={ref} width={96} height={96} style={{ width: size, height: size }} />;
}

// ---------- Splash ----------
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [w, setW] = useState(4);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(100));
    const t = setTimeout(onDone, 2500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [onDone]);
  return (
    <div
      className="relative h-full w-full cursor-pointer overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(circle at 50% 30%, #2f7d38 0%, #173d1e 70%, #0d2913 100%)" }}
      onClick={() => {
        audio.ensure();
        audio.play("click");
        onDone();
      }}
    >
      <div className="anim-pop flex flex-col items-center">
        <LeafBadge size={64} />
        <div className="font-display text-outline text-5xl sm:text-6xl text-[#ffd23f] mt-3">GARDEN</div>
        <div className="font-display text-outline text-5xl sm:text-6xl text-[#7ee081]">GUARDIANS</div>
        <p className="mt-3 text-emerald-100 font-bold text-sm">Studio Kebun Original • Tower Defense</p>
      </div>
      <div className="absolute bottom-24 w-64 h-4 rounded-full bg-black/50 border-2 border-white/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6cc24a] to-[#ffd23f] transition-all ease-out"
          style={{ width: `${w}%`, transitionDuration: "2100ms" }}
        />
      </div>
      <p className="absolute bottom-10 text-emerald-200/80 text-xs font-bold">Menanam benih... ketuk untuk lanjut</p>
    </div>
  );
}

// ---------- Main Menu ----------
export function MainMenu({
  save,
  onPlay,
  onCollection,
  onSettings,
  canInstall,
  onInstall,
  isStandalone,
}: {
  save: SaveData;
  onPlay: () => void;
  onCollection: () => void;
  onSettings: () => void;
  canInstall: boolean;
  onInstall: () => void;
  isStandalone: boolean;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "linear-gradient(180deg,#5db9ec 0%,#a5e0fb 55%,#c9edff 100%)" }}>
      {/* matahari */}
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full" style={{ background: "radial-gradient(circle,#fff3b0 0%,#ffe14d 55%,rgba(255,225,77,0) 72%)" }} />
      {/* awan */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/85"
          style={{
            width: 120 + i * 40,
            height: 34 + i * 8,
            top: `${8 + i * 9}%`,
            animation: `gg-cloud ${46 + i * 18}s linear infinite`,
            animationDelay: `${-i * 17}s`,
            boxShadow: "0 10px 0 -4px rgba(255,255,255,0.7)",
          }}
        />
      ))}
      {/* daun melayang */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: `${12 + i * 22}%`,
            background: i % 2 ? "#6cc24a" : "#ffd23f",
            animation: `gg-leaf-fall ${9 + i * 2.5}s linear infinite`,
            animationDelay: `${-i * 3.4}s`,
          }}
        />
      ))}
      {/* bukit */}
      <div className="absolute -bottom-24 -left-24 w-[70%] h-64 rounded-[50%] bg-[#6cc24a]" />
      <div className="absolute -bottom-32 -right-20 w-[80%] h-72 rounded-[50%] bg-[#4c8a2e]" />
      <div className="absolute -bottom-40 left-[20%] w-[90%] h-72 rounded-[50%] bg-[#3e7527]" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <div className="anim-bob text-center">
          <div className="flex items-center justify-center gap-3">
            <LeafBadge size={44} />
            <div className="font-display text-outline text-6xl sm:text-7xl text-[#ffd23f] leading-none">GARDEN</div>
          </div>
          <div className="font-display text-outline text-6xl sm:text-7xl text-[#7ee081] leading-none mt-1">GUARDIANS</div>
          <div className="mt-3 inline-block hud-chip px-4 py-1.5 text-white font-bold text-xs sm:text-sm">
            Pertahankan kebunmu dari serbuan monster!
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 w-72 max-w-[86vw]">
          <GButton color="yellow" className="shine text-2xl py-4" onClick={onPlay}>
            <PlayIcon size={22} /> MAINKAN
          </GButton>
          <GButton color="green" onClick={onCollection}>
            KOLEKSI & UPGRADE
          </GButton>
          <GButton color="wood" onClick={onSettings}>
            PENGATURAN
          </GButton>
          {canInstall && (
            <GButton color="blue" onClick={onInstall} className="shine">
              <DownloadIcon size={20} /> PASANG APLIKASI
            </GButton>
          )}
          {isStandalone && (
            <div className="hud-chip px-4 py-2 flex items-center justify-center gap-2 text-[#a8dd8a] font-display text-sm">
              <PhoneIcon size={18} /> MODE APLIKASI AKTIF
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <div className="hud-chip px-3 py-1.5 flex items-center gap-2 text-white font-display text-sm">
            <LeafBadge size={16} /> LV {save.playerLv}
          </div>
          <div className="hud-chip px-3 py-1.5 flex items-center gap-2 text-white font-display text-sm">
            <CoinIcon size={17} /> {save.coins}
          </div>
          <div className="hud-chip px-3 py-1.5 flex items-center gap-2 text-white font-display text-sm">
            LEVEL {save.unlocked}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Level Select ----------
export function LevelSelect({
  save,
  onBack,
  onPick,
}: {
  save: SaveData;
  onBack: () => void;
  onPick: (n: number) => void;
}) {
  const maxShown = Math.max(60, save.unlocked + 11);
  const levels = Array.from({ length: maxShown }, (_, i) => i + 1);
  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg,#2f7d38,#173d1e)" }}>
      <div className="p-3 flex items-center gap-3 flex-wrap">
        <GButton color="wood" small onClick={onBack}>
          <BackIcon size={16} /> MENU
        </GButton>
        <h1 className="font-display text-outline text-2xl sm:text-3xl text-white">PILIH LEVEL</h1>
        <div className="flex-1" />
        <div className="hud-chip px-3 py-1.5 flex items-center gap-2 text-white font-display text-sm">
          <CoinIcon size={16} /> {save.coins}
        </div>
      </div>
      <div className="px-3 pb-2 flex gap-2 flex-wrap">
        {TIERS.map((t) => (
          <div key={t.name} className="hud-chip px-2.5 py-1 flex items-center gap-1.5 text-white text-[11px] font-bold">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: t.color }} />
            {t.name} <span className="opacity-70">{t.range}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 mx-3 mb-3 leaf-panel p-3 overflow-y-auto hide-scroll">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {levels.map((n) => {
            const unlocked = n <= save.unlocked;
            const best = save.best[n];
            const tier = TIERS[n <= 10 ? 0 : n <= 20 ? 1 : n <= 40 ? 2 : n <= 60 ? 3 : 4];
            const isCurrent = n === save.unlocked;
            return (
              <button
                key={n}
                disabled={!unlocked}
                onClick={() => {
                  audio.ensure();
                  audio.play("click");
                  onPick(n);
                }}
                className={`relative aspect-square rounded-xl border-[3px] font-display text-lg sm:text-xl flex flex-col items-center justify-center transition-transform active:scale-90 ${
                  isCurrent ? "anim-pulse-ring" : ""
                }`}
                style={{
                  background: unlocked ? (best?.clear ? "#4c8a2e" : "#ffd23f") : "rgba(20,40,24,0.6)",
                  borderColor: unlocked ? (best?.clear ? "#2e5c1a" : "#a87a1c") : "rgba(255,255,255,0.12)",
                  color: unlocked ? (best?.clear ? "#fff" : "#5f3a17") : "rgba(255,255,255,0.4)",
                  boxShadow: "0 3px 0 rgba(0,0,0,0.3)",
                }}
              >
                {unlocked ? (
                  <>
                    <span>{n}</span>
                    <span className="flex gap-[3px] mt-0.5">
                      {[0, 1, 2].map((s) => (
                        <span
                          key={s}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background:
                              best?.clear && (s === 0 || (s === 1 && true) || (s === 2 && best.nodmg))
                                ? "#ffe14d"
                                : "rgba(0,0,0,0.3)",
                          }}
                        />
                      ))}
                    </span>
                  </>
                ) : (
                  <LockIcon size={18} />
                )}
                {unlocked && n % 5 === 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-display flex items-center justify-center text-white border-2 border-[#7c1f10]"
                    style={{ background: "#ff5a4e" }}
                  >
                    B
                  </span>
                )}
                <span className="absolute bottom-0.5 left-0 right-0 text-[7px] font-bold opacity-60" style={{ color: unlocked ? tier.color : "transparent" }}>
                  {unlocked ? "" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-emerald-100/80 text-xs font-bold mt-3">
          Level 61+ dibuat tanpa batas — semakin jauh, semakin ganas! Huruf B = level Boss.
        </p>
      </div>
    </div>
  );
}

// ---------- Koleksi & Upgrade ----------
export function CollectionScreen({
  save,
  onUpgrade,
  onBack,
}: {
  save: SaveData;
  onUpgrade: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg,#2f7d38,#173d1e)" }}>
      <div className="p-3 flex items-center gap-3 flex-wrap">
        <GButton color="wood" small onClick={onBack}>
          <BackIcon size={16} /> MENU
        </GButton>
        <h1 className="font-display text-outline text-2xl sm:text-3xl text-white">KOLEKSI & UPGRADE</h1>
        <div className="flex-1" />
        <div className="hud-chip px-3 py-1.5 flex items-center gap-2 text-white font-display text-sm">
          <CoinIcon size={16} /> {save.coins}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scroll px-3 pb-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          {UNITS.map((u) => {
            const lvl = upgradeLevel(save, u.id);
            const st = unitStats(u, lvl);
            const locked = u.unlockLevel > save.unlocked;
            const cost = upgradeCost(u, lvl);
            const maxed = lvl >= MAX_UPGRADE;
            return (
              <div key={u.id} className={`leaf-panel p-3 flex gap-3 ${locked ? "opacity-70" : ""}`}>
                <div className={`shrink-0 rounded-xl bg-[#173d1e]/40 p-1 ${locked ? "grayscale" : ""}`}>
                  <UnitIcon id={u.id} size={72} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-[#eaffd9] text-base leading-tight">{u.name}</span>
                    <span className="text-[10px] font-black bg-[#173d1e]/60 text-[#a8dd8a] px-2 py-0.5 rounded-full">{u.tag}</span>
                  </div>
                  <p className="text-[11px] text-emerald-50/90 font-semibold leading-snug mt-0.5">{u.desc}</p>
                  <div className="flex gap-2 flex-wrap mt-1.5 text-[10px] font-black">
                    {u.special === "generator" ? (
                      <span className="hud-chip px-2 py-0.5 text-[#ffe14d]">+{st.gen} ENERGI / 6s</span>
                    ) : u.special === "wall" ? (
                      <span className="hud-chip px-2 py-0.5 text-white">HP {st.hp}</span>
                    ) : (
                      <>
                        <span className="hud-chip px-2 py-0.5 text-white">DMG {st.dmg}</span>
                        <span className="hud-chip px-2 py-0.5 text-white">SPD {st.rate}/s</span>
                      </>
                    )}
                    {u.special !== "generator" && u.special !== "wall" && u.special !== "bomb" && (
                      <span className="hud-chip px-2 py-0.5 text-white">HP {st.hp}</span>
                    )}
                    {u.special === "bomb" && <span className="hud-chip px-2 py-0.5 text-white">DMG {st.dmg} AREA</span>}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {Array.from({ length: MAX_UPGRADE }).map((_, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full border border-black/40"
                        style={{ background: i < lvl ? "#ffd23f" : "rgba(0,0,0,0.35)" }}
                      />
                    ))}
                    <span className="ml-1 text-[10px] font-black text-[#eaffd9]">Lv {lvl}</span>
                  </div>
                  <div className="mt-2">
                    {locked ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-white/70">
                        <LockIcon size={14} /> Terbuka di Level {u.unlockLevel}
                      </span>
                    ) : maxed ? (
                      <span className="font-display text-[#ffd23f] text-sm">LEVEL MAKSIMUM!</span>
                    ) : (
                      <GButton color="yellow" small disabled={save.coins < cost} onClick={() => onUpgrade(u.id)} className="!py-1.5 !text-xs">
                        UPGRADE <CoinIcon size={14} /> {cost}
                      </GButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="font-display text-outline-sm text-xl text-white pt-2">BESTIARI MONSTER</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {MONSTERS.filter((m) => m.unlockLevel > 0).map((m) => (
            <div key={m.id} className="hud-chip p-2 flex items-center gap-2">
              <MonsterIcon id={m.id} size={46} />
              <div className="min-w-0">
                <div className="font-display text-white text-[12px] leading-tight">{m.name}</div>
                <div className="text-[9.5px] text-emerald-100/80 font-bold leading-tight">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <h2 className="font-display text-outline-sm text-xl text-[#ff8f7a] pt-2">LIMA BOS PENJAGA LIAR</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {BOSSES.map((b) => (
            <div key={b.id} className="wood-panel p-2.5 flex items-center gap-3">
              <MonsterIcon id={b.id} size={62} />
              <div className="min-w-0">
                <div className="font-display text-white text-sm leading-tight">{b.name}</div>
                <div className="text-[10px] font-black text-[#ffb347]">{b.title}</div>
                <div className="text-[10.5px] text-amber-50/90 font-bold leading-tight mt-0.5">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Pengaturan ----------
export function SettingsScreen({
  save,
  onChange,
  onReset,
  onBack,
}: {
  save: SaveData;
  onChange: (s: Settings) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const st = save.settings;
  return (
    <div className="h-full w-full flex items-center justify-center p-4 overflow-y-auto" style={{ background: "linear-gradient(180deg,#2f7d38,#173d1e)" }}>
      <div className="wood-panel p-5 w-[min(96%,420px)] my-4">
        <div className="flex items-center gap-3">
          <GButton color="dark" small onClick={onBack}>
            <BackIcon size={14} />
          </GButton>
          <h1 className="font-display text-outline-sm text-2xl text-white">PENGATURAN</h1>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-display text-white text-sm">MUSIK</span>
              <button
                onClick={() => {
                  audio.ensure();
                  audio.play("click");
                  onChange({ ...st, musicOn: !st.musicOn });
                  if (!st.musicOn) audio.startMusic();
                  else audio.stopMusic();
                }}
                className={`btn3d px-4 py-1 text-sm ${st.musicOn ? "bg-[#5cb85c] text-white" : "bg-[#37474f] text-white/70"}`}
              >
                {st.musicOn ? "NYALA" : "MATI"}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(st.musicVol * 100)}
              disabled={!st.musicOn}
              onChange={(e) => onChange({ ...st, musicVol: +e.target.value / 100 })}
              className="w-full mt-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="font-display text-white text-sm">EFEK SUARA</span>
              <button
                onClick={() => {
                  audio.ensure();
                  onChange({ ...st, sfxOn: !st.sfxOn });
                  if (!st.sfxOn) setTimeout(() => audio.play("coin"), 30);
                  else audio.play("click");
                }}
                className={`btn3d px-4 py-1 text-sm ${st.sfxOn ? "bg-[#5cb85c] text-white" : "bg-[#37474f] text-white/70"}`}
              >
                {st.sfxOn ? "NYALA" : "MATI"}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(st.sfxVol * 100)}
              disabled={!st.sfxOn}
              onChange={(e) => {
                onChange({ ...st, sfxVol: +e.target.value / 100 });
                audio.play("hit");
              }}
              className="w-full mt-2"
            />
            <button
              onClick={() => {
                audio.ensure();
                audio.play("coin");
              }}
              className="mt-2 text-[11px] font-black text-[#ffe9b8] underline"
            >
              Uji efek suara
            </button>
          </div>

          <div className="border-t-2 border-black/30 pt-4">
            {!armed ? (
              <GButton color="red" small onClick={() => setArmed(true)}>
                HAPUS SEMUA DATA
              </GButton>
            ) : (
              <div className="flex gap-2 items-center flex-wrap">
                <GButton color="red" small onClick={() => { onReset(); setArmed(false); }}>
                  YAKIN? HAPUS!
                </GButton>
                <GButton color="dark" small onClick={() => setArmed(false)}>
                  BATAL
                </GButton>
              </div>
            )}
            <p className="text-[11px] text-amber-100/70 font-bold mt-2">
              Progress, koin, dan upgrade tersimpan otomatis di perangkat ini.
            </p>
          </div>

          <p className="text-center text-[10.5px] text-amber-100/60 font-bold">
            Garden Guardians — semua karakter, nama, gambar & suara dibuat original.
          </p>
        </div>
      </div>
    </div>
  );
}
