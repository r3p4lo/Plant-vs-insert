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

type ScreenId = "splash" | "menu" | "levels" | "collection" | "settings" | "game";

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("splash");
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [levelNum, setLevelNum] = useState(1);
  const [gameKey, setGameKey] = useState(0);

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
