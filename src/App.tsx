// ============================================================
// Garden Guardians — Root: routing layar, save, reward & upgrade
// ============================================================
import { useCallback, useEffect, useState } from "react";
import {
  SplashScreen,
  MainMenu,
  LevelSelect,
  CollectionScreen,
  SettingsScreen,
} from "./components/Screens";
import GameScreen from "./components/GameScreen";
import { loadSave, persistSave, resetSave, upgradeLevel, addExp } from "./game/save";
import type { SaveData, Settings } from "./game/save";
import { audio } from "./game/audio";
import { UNIT_MAP, MAX_UPGRADE, upgradeCost } from "./game/data";
import type { EndResult } from "./game/engine";
import { drawUnitShape } from "./game/engine";

type ScreenId = "splash" | "menu" | "levels" | "collection" | "settings" | "game";

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("splash");
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [levelNum, setLevelNum] = useState(1);
  const [gameKey, setGameKey] = useState(0);

  // ---- PWA: pasang sebagai aplikasi (Android: "Tambahkan ke layar utama") ----
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
  );
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const triggerInstall = useCallback(() => {
    const evt = installEvt as unknown as { prompt?: () => void; userChoice?: Promise<unknown> } | null;
    if (evt?.prompt) {
      evt.prompt();
      evt.userChoice?.then(() => setInstallEvt(null)).catch(() => {});
    }
  }, [installEvt]);

  // Render ikon aplikasi secara prosedural (100% original) → favicon & ikon layar utama
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const g = ctx.createRadialGradient(128, 104, 24, 128, 128, 195);
      g.addColorStop(0, "#ffe98a");
      g.addColorStop(0.55, "#ffd23f");
      g.addColorStop(1, "#f0a51b");
      ctx.fillStyle = g;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(0, 0, 256, 256, 46);
      else ctx.rect(0, 0, 256, 256);
      ctx.fill();
      ctx.save();
      ctx.translate(128, 114);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(180, -19);
        ctx.lineTo(180, 19);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(128, 234, 86, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(0, 0, 256, 256, 46);
      else ctx.rect(0, 0, 256, 256);
      ctx.clip();
      drawUnitShape(ctx, UNIT_MAP.seedling, 128, 188, 1.9, 1.4, { hpFrac: 1 });
      ctx.restore();
      const url = c.toDataURL("image/png");
      const fav = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (fav) fav.href = url;
      const at = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (at) at.href = url;
    } catch {
      /* ikon prosedural opsional */
    }
  }, []);

  // buka AudioContext pada gestur pertama + mulai musik
  useEffect(() => {
    const unlock = () => {
      audio.ensure();
      if (save.settings.musicOn) audio.startMusic();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    audio.setSettings(save.settings);
    if (!save.settings.musicOn) audio.stopMusic();
  }, [save.settings]);

  const mutate = useCallback((fn: (s: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = fn(prev);
      persistSave(next);
      return next;
    });
  }, []);

  const handleResult = useCallback(
    (r: EndResult) => {
      mutate((s) => {
        let n: SaveData = { ...s, coins: s.coins + r.coinsEarned, kills: s.kills + r.kills };
        n = addExp(n, r.expEarned);
        if (r.win) {
          n.unlocked = Math.max(n.unlocked, r.level + 1);
          n.best = {
            ...n.best,
            [r.level]: { clear: true, nodmg: r.nodmg || !!n.best[r.level]?.nodmg },
          };
        }
        if (r.level === 1) n.seenTutorial = true;
        return n;
      });
    },
    [mutate]
  );

  const handleUpgrade = useCallback(
    (id: string) => {
      const def = UNIT_MAP[id];
      if (!def) return;
      mutate((s) => {
        const lvl = upgradeLevel(s, id);
        if (lvl >= MAX_UPGRADE) return s;
        const cost = upgradeCost(def, lvl);
        if (s.coins < cost) {
          audio.play("error");
          return s;
        }
        audio.play("coin");
        return { ...s, coins: s.coins - cost, upgrades: { ...s.upgrades, [id]: lvl + 1 } };
      });
    },
    [mutate]
  );

  const startLevel = useCallback((n: number) => {
    setLevelNum(n);
    setGameKey((k) => k + 1);
    setScreen("game");
  }, []);

  return (
    <div className="h-full w-full">
      {screen === "splash" && <SplashScreen onDone={() => setScreen("menu")} />}
      {screen === "menu" && (
        <MainMenu
          save={save}
          onPlay={() => setScreen("levels")}
          onCollection={() => setScreen("collection")}
          onSettings={() => setScreen("settings")}
          canInstall={!!installEvt && !installed}
          onInstall={triggerInstall}
          isStandalone={installed}
        />
      )}
      {screen === "levels" && <LevelSelect save={save} onBack={() => setScreen("menu")} onPick={startLevel} />}
      {screen === "collection" && (
        <CollectionScreen save={save} onUpgrade={handleUpgrade} onBack={() => setScreen("menu")} />
      )}
      {screen === "settings" && (
        <SettingsScreen
          save={save}
          onChange={(st: Settings) => mutate((s) => ({ ...s, settings: st }))}
          onReset={() => setSave(resetSave())}
          onBack={() => setScreen("menu")}
        />
      )}
      {screen === "game" && (
        <GameScreen
          key={`${levelNum}-${gameKey}`}
          levelNum={levelNum}
          save={save}
          onResult={handleResult}
          onUpgrade={handleUpgrade}
          onNext={() => startLevel(levelNum + 1)}
          onRetry={() => setGameKey((k) => k + 1)}
          onExit={() => setScreen("menu")}
        />
      )}
    </div>
  );
}
