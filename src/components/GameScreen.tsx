// ============================================================
// Garden Guardians — Layar permainan + HUD sentuh
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Game } from "../game/engine";
import type { EndResult, HudSnapshot } from "../game/engine";
import { makeLevel, UNIT_MAP } from "../game/data";
import type { SaveData } from "../game/save";
import { audio } from "../game/audio";
import {
  GButton,
  UnitIcon,
  CoinIcon,
  BoltIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  FfIcon,
  ShovelIcon,
  StarIcon,
  SkullIcon,
  LockIcon,
} from "./Screens";

export default function GameScreen({
  levelNum,
  save,
  onResult,
  onUpgrade,
  onNext,
  onRetry,
  onExit,
}: {
  levelNum: number;
  save: SaveData;
  onResult: (r: EndResult) => void;
  onUpgrade: (id: string) => void;
  onNext: () => void;
  onRetry: () => void;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [end, setEnd] = useState<EndResult | null>(null);
  const [tutorial, setTutorial] = useState(!save.seenTutorial && levelNum === 1);
  const [portrait] = useState(() => window.innerHeight > window.innerWidth * 1.05);

  const levelDef = useMemo(() => makeLevel(levelNum, save.playerLv), [levelNum, save.playerLv]);

  useEffect(() => {
    const g = new Game(canvasRef.current!, levelDef, save.upgrades, audio, {
      onHud: setHud,
      onEnd: (r) => {
        setEnd(r);
        onResult(r);
      },
    });
    gameRef.current = g;
    return () => {
      g.destroy();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelDef]);

  useEffect(() => {
    gameRef.current?.refreshUpgrades(save.upgrades);
  }, [save.upgrades]);

  const hpFrac = hud ? hud.baseHp / hud.baseMax : 1;
  const bannerDanger = hud?.banner ? /BOSS|AWAS|TERAKHIR|HANCUR/i.test(hud.banner.text + hud.banner.sub) : false;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#123d1c] select-none">
      {/* kanvas permainan */}
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      </div>

      {hud && (
        <>
          {/* ===== HUD atas ===== */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-1.5 sm:gap-2 p-2 flex-wrap pointer-events-none">
            <div className="hud-chip flex items-center gap-1.5 px-2 py-1.5 pointer-events-auto">
              <HeartIcon size={18} />
              <div className="w-16 sm:w-24 h-3.5 rounded-full bg-black/55 border border-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${hpFrac * 100}%`,
                    background: hpFrac > 0.5 ? "#7ee081" : hpFrac > 0.25 ? "#ffd23f" : "#ff5a4e",
                  }}
                />
              </div>
              <span className="font-display text-white text-xs sm:text-sm leading-none">{hud.baseHp}</span>
            </div>
            <div className="hud-chip flex items-center gap-1 px-2 py-1.5">
              <BoltIcon size={16} />
              <span className="font-display text-[#ffe14d] text-sm sm:text-lg leading-none">{hud.energy}</span>
            </div>
            <div className="hud-chip flex items-center gap-1 px-2 py-1.5">
              <CoinIcon size={16} />
              <span className="font-display text-white text-sm sm:text-lg leading-none">{save.coins}</span>
            </div>
            <div className="hud-chip px-2 py-1.5">
              <span className="font-display text-white text-[11px] sm:text-sm leading-none">
                WAVE <span className="text-[#ffe14d]">{hud.wave}</span>/{hud.totalWaves}
              </span>
            </div>
            <div
              className="hud-chip px-2 py-1.5 hidden md:block"
            >
              <span className="font-display text-[11px] leading-none" style={{ color: hud.tierColor }}>
                LV {hud.level} • {hud.tier}
              </span>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                audio.play("click");
                gameRef.current?.toggleSpeed();
              }}
              className="hud-chip pointer-events-auto flex items-center gap-1 px-2.5 py-2 text-[#ffe14d]"
            >
              <FfIcon size={15} />
              <span className="font-display text-sm leading-none">x{hud.speed}</span>
            </button>
            <button
              onClick={() => {
                audio.play("click");
                gameRef.current?.setPaused(true);
              }}
              className="hud-chip pointer-events-auto px-2.5 py-2 text-white"
            >
              <PauseIcon size={16} />
            </button>
          </div>

          {/* ===== Bar HP Boss ===== */}
          {hud.boss && (
            <div className="absolute left-1/2 top-[52px] sm:top-14 z-20 -translate-x-1/2 w-[min(92%,540px)] anim-slide-down pointer-events-none">
              <div className="wood-panel px-3 py-1.5">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-display text-white text-xs sm:text-base leading-tight">{hud.boss.name}</span>
                  <span className="text-[10px] text-amber-100 font-black truncate">{hud.boss.title}</span>
                </div>
                <div className="mt-1 h-3.5 sm:h-4 rounded-full bg-black/60 border-2 border-[#3d2410] overflow-hidden">
                  <div
                    className="boss-bar-fill h-full"
                    style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.max) * 100)}%`, transition: "width 0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== Banner ===== */}
          {hud.banner && !end && (
            <div key={hud.banner.key} className="pointer-events-none absolute inset-x-0 top-[22%] z-20 text-center anim-banner px-2">
              <div className={`font-display text-outline text-4xl sm:text-6xl ${bannerDanger ? "text-[#ff5a4e]" : "text-[#ffd23f]"}`}>
                {hud.banner.text}
              </div>
              {hud.banner.sub && (
                <div className="font-display text-outline-sm text-base sm:text-2xl text-white mt-1">{hud.banner.sub}</div>
              )}
            </div>
          )}

          {/* ===== Hitung mundur wave ===== */}
          {hud.state === "prep" && !hud.paused && !end && (
            <div className="absolute inset-x-0 top-[36%] sm:top-[40%] z-10 flex flex-col items-center gap-2 pointer-events-none">
              <div className="hud-chip px-4 py-2 flex items-center gap-3 pointer-events-auto">
                <span className="font-display text-white text-sm sm:text-base">
                  WAVE {hud.wave}/{hud.totalWaves}
                </span>
                <span className="font-display text-[#ffe14d] text-3xl w-9 text-center leading-none">{hud.countdown}</span>
                <button
                  onClick={() => {
                    audio.play("click");
                    gameRef.current?.skipCountdown();
                  }}
                  className="btn3d bg-[#ffd23f] text-[#5f3a17] px-3 py-1.5 text-xs sm:text-sm"
                >
                  MULAI!
                </button>
              </div>
              <span className="text-white/85 text-[11px] font-bold text-outline-sm">Susun pertahananmu!</span>
            </div>
          )}

          {/* ===== Tutorial level 1 ===== */}
          {tutorial && !end && (
            <div className="absolute inset-x-0 bottom-[118px] sm:bottom-[126px] z-20 flex justify-center px-3 pointer-events-none">
              <div className="wood-panel px-4 py-2.5 max-w-md text-center pointer-events-auto anim-slide-up">
                <p className="text-white text-[11.5px] font-bold leading-snug">
                  Ketuk kartu unit di bawah, lalu ketuk petak rumput untuk menanam. Monster datang dari kanan —
                  lindungi rumah pohonmu! Sun Sprout menambah Energi.
                </p>
                <button
                  onClick={() => {
                    audio.play("click");
                    setTutorial(false);
                  }}
                  className="btn3d bg-[#ffd23f] text-[#5f3a17] px-4 py-1 text-xs mt-1.5"
                >
                  MENGERTI
                </button>
              </div>
            </div>
          )}

          {portrait && !end && (
            <div className="absolute top-[46px] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <span className="hud-chip px-3 py-1 text-white text-[10px] font-black">
                Putar perangkat ke lanskap untuk arena lebih luas
              </span>
            </div>
          )}

          {/* ===== Panel kartu unit ===== */}
          {!end && (
            <div className="absolute inset-x-0 bottom-0 z-20 p-1.5 sm:p-2">
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto hide-scroll justify-start sm:justify-center pb-0.5">
                {hud.cards.map((c) => {
                  const def = UNIT_MAP[c.id];
                  const usable = c.unlocked && c.cdFrac === 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        audio.ensure();
                        audio.play("click");
                        gameRef.current?.selectCard(c.id);
                      }}
                      className={`card-slot shrink-0 w-[68px] h-[92px] sm:w-[76px] sm:h-[98px] flex flex-col items-center pt-1 ${
                        hud.selected === c.id ? "selected" : ""
                      }`}
                    >
                      <div className={usable && !c.affordable ? "grayscale opacity-70" : ""}>
                        <UnitIcon id={c.id} size={44} />
                      </div>
                      <div className="text-[8.5px] sm:text-[9px] font-black text-[#1d4a22] leading-[1.05] text-center px-0.5 mt-0.5">
                        {c.name}
                      </div>
                      <div
                        className={`mt-auto mb-1 flex items-center gap-0.5 font-display text-[12px] sm:text-[13px] ${
                          c.affordable ? "text-[#1d5c2e]" : "text-[#c22f1c]"
                        }`}
                      >
                        <BoltIcon size={11} />
                        {c.cost}
                      </div>
                      {c.cdFrac > 0 && (
                        <div
                          className="absolute top-0 left-0 right-0 bg-[#123d1c]/75 flex items-center justify-center"
                          style={{ height: `${c.cdFrac * 100}%` }}
                        >
                          <span className="font-display text-white text-base drop-shadow">{Math.ceil(c.cdLeft)}</span>
                        </div>
                      )}
                      {!c.unlocked && (
                        <div className="absolute inset-0 bg-[#123d1c]/85 rounded-[9px] flex flex-col items-center justify-center gap-1">
                          <LockIcon size={16} />
                          <span className="font-display text-white text-[9px]">LV {def.unlockLevel}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
                {/* sekop */}
                <button
                  onClick={() => {
                    audio.ensure();
                    audio.play("click");
                    gameRef.current?.toggleShovel();
                  }}
                  className={`card-slot shrink-0 w-[58px] h-[92px] sm:h-[98px] flex flex-col items-center justify-center gap-1 !bg-gradient-to-b !from-[#c98f52] !to-[#a9713a] ${
                    hud.shovel ? "selected" : ""
                  }`}
                >
                  <ShovelIcon size={26} />
                  <span className="text-[8.5px] font-black text-white text-outline-sm">GALI</span>
                  <span className="text-[7.5px] font-bold text-amber-100/90 leading-none">kembali 30%</span>
                </button>
              </div>
            </div>
          )}

          {/* ===== Popup unit terpilih ===== */}
          {hud.selUnit && !hud.paused && !end && (
            <div className="absolute bottom-[112px] sm:bottom-[122px] left-1/2 z-30 -translate-x-1/2 w-[min(94%,380px)] anim-slide-up">
              <div className="wood-panel p-3">
                <div className="flex items-center gap-2.5">
                  <UnitIcon id={hud.selUnit.id} size={46} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-white text-sm sm:text-base leading-tight">{hud.selUnit.name}</div>
                    <div className="text-[10px] font-black text-[#ffd23f]">LEVEL {hud.selUnit.lvl}/10</div>
                  </div>
                  <button
                    onClick={() => {
                      audio.play("click");
                      gameRef.current?.selectCard(null);
                    }}
                    className="btn3d bg-[#37474f] text-white px-2.5 py-1 text-xs"
                  >
                    TUTUP
                  </button>
                </div>
                <div className="mt-2 h-3 rounded-full bg-black/55 border border-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(hud.selUnit.hp / hud.selUnit.maxHp) * 100}%`,
                      background: "#7ee081",
                    }}
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap mt-1.5 text-[10px] font-black">
                  <span className="hud-chip px-2 py-0.5 text-white">HP {hud.selUnit.hp}/{hud.selUnit.maxHp}</span>
                  {hud.selUnit.dmg > 0 && <span className="hud-chip px-2 py-0.5 text-white">DMG {hud.selUnit.dmg}</span>}
                  {hud.selUnit.rate > 0 && <span className="hud-chip px-2 py-0.5 text-white">SPD {hud.selUnit.rate}/s</span>}
                  {hud.selUnit.gen > 0 && <span className="hud-chip px-2 py-0.5 text-[#ffe14d]">+{hud.selUnit.gen} ENERGI</span>}
                </div>
                <div className="mt-2">
                  {hud.selUnit.maxed ? (
                    <span className="font-display text-[#ffd23f] text-sm">LEVEL MAKSIMUM!</span>
                  ) : (
                    <GButton
                      color="yellow"
                      small
                      disabled={save.coins < hud.selUnit.upCost}
                      onClick={() => onUpgrade(hud.selUnit!.id)}
                      className="!py-1.5 !text-xs w-full"
                    >
                      UPGRADE UNIT <CoinIcon size={14} /> {hud.selUnit.upCost}
                    </GButton>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== Menu jeda ===== */}
          {hud.paused && !end && (
            <div className="absolute inset-0 z-40 bg-black/65 flex items-center justify-center p-4">
              <div className="wood-panel p-6 w-[min(94%,340px)] text-center anim-pop">
                <h2 className="font-display text-4xl text-white text-outline-sm">JEDA</h2>
                <p className="text-amber-100/80 text-xs font-bold mt-1">
                  Level {hud.level} • Wave {hud.wave}/{hud.totalWaves} • {hud.kills} monster tumbang
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <GButton color="green" onClick={() => gameRef.current?.setPaused(false)}>
                    <PlayIcon size={18} /> LANJUTKAN
                  </GButton>
                  <GButton color="yellow" onClick={onRetry}>
                    ULANGI LEVEL
                  </GButton>
                  <GButton color="wood" onClick={onExit}>
                    MENU UTAMA
                  </GButton>
                </div>
              </div>
            </div>
          )}

          {/* ===== Layar akhir ===== */}
          {end && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: end.win ? "rgba(18,61,28,0.82)" : "rgba(43,10,8,0.86)" }}
            >
              <div className="wood-panel p-5 sm:p-6 w-[min(94%,400px)] text-center anim-pop">
                {end.win ? (
                  <>
                    <h2 className="font-display text-outline text-4xl sm:text-5xl text-[#ffd23f]">MENANG!</h2>
                    <div className="flex justify-center gap-2 mt-2">
                      {[0, 1, 2].map((i) => (
                        <StarIcon key={i} size={38} filled={i < end.stars} delay={0.15 + i * 0.18} />
                      ))}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm font-bold">
                      <div className="hud-chip px-3 py-1.5 text-white flex justify-between">
                        <span>Monster tumbang</span>
                        <span className="font-display text-[#ffe14d]">{end.kills}</span>
                      </div>
                      <div className="hud-chip px-3 py-1.5 text-white flex justify-between items-center">
                        <span>Hadiah koin</span>
                        <span className="flex items-center gap-1 font-display text-[#ffd23f]">
                          <CoinIcon size={15} /> +{end.coinsEarned}
                        </span>
                      </div>
                      <div className="hud-chip px-3 py-1.5 text-white flex justify-between">
                        <span>EXP didapat</span>
                        <span className="font-display text-[#7ee081]">+{end.expEarned}</span>
                      </div>
                      {end.nodmg && (
                        <div className="hud-chip px-3 py-1.5 text-[#ffd23f] font-display text-xs">
                          BONUS TANPA LUKA! Markas utuh
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2.5">
                      <GButton color="green" onClick={onNext}>
                        <PlayIcon size={18} /> LEVEL BERIKUTNYA
                      </GButton>
                      <div className="flex gap-2.5">
                        <GButton color="yellow" className="flex-1" small onClick={onRetry}>
                          ULANGI
                        </GButton>
                        <GButton color="wood" className="flex-1" small onClick={onExit}>
                          MENU
                        </GButton>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <SkullIcon size={54} />
                    </div>
                    <h2 className="font-display text-outline text-3xl sm:text-4xl text-[#ff5a4e] mt-1">MARKAS HANCUR!</h2>
                    <p className="text-amber-100/85 text-xs sm:text-sm font-bold mt-2">
                      Monster menembus pertahanan kebunmu di Level {end.level}. Coba susun tembok Bark Guardian lebih awal!
                    </p>
                    <div className="hud-chip px-3 py-1.5 text-white flex justify-between mt-3">
                      <span>Monster tumbang</span>
                      <span className="font-display text-[#ffe14d]">{end.kills}</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2.5">
                      <GButton color="red" onClick={onRetry}>
                        COBA LAGI
                      </GButton>
                      <GButton color="wood" small onClick={onExit}>
                        MENU UTAMA
                      </GButton>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
