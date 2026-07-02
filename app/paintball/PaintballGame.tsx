"use client";

import { useEffect, useRef, useState } from "react";
import { PaintballEngine, HudState } from "./game/engine";

type Phase = "menu" | "playing" | "paused" | "over";

interface FeedLine {
  id: number;
  text: string;
  isCan: boolean;
}

const EMPTY_HUD: HudState = {
  hp: 100, shield: 0, red: 0, blue: 0, time: 600, prompt: "", carrying: false, carryingBomb: false,
  dead: false, respawnIn: 0, onRoof: false, weapon: "Splat Marker", weaponIcon: "🔫", gPaint: 0, gSmoke: 0, fx: [],
};

interface Praise {
  id: number;
  text: string;
}

export default function PaintballGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PaintballEngine | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const feedId = useRef(0);

  const [phase, setPhaseState] = useState<Phase>("menu");
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [flash, setFlash] = useState(0);
  const [result, setResult] = useState<{ winner: string; red: number; blue: number } | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  useEffect(() => {
    setIsTouch("ontouchstart" in window);
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;

    const engine = new PaintballEngine(canvas, {
      onHud: (h) => setHud(h),
      onKill: (text, isCan) => {
        const id = ++feedId.current;
        setFeed((f) => [...f.slice(-4), { id, text, isCan }]);
        setTimeout(() => setFeed((f) => f.filter((l) => l.id !== id)), 4500);
      },
      onGameOver: (winner, red, blue) => {
        setResult({ winner, red, blue });
        setPhase("over");
      },
      onDamage: () => {
        setFlash(1);
        setTimeout(() => setFlash(0), 220);
      },
      onPraise: (text) => {
        const id = ++feedId.current;
        setPraises((p) => [...p.slice(-2), { id, text }]);
        setTimeout(() => setPraises((p) => p.filter((x) => x.id !== id)), 2200);
      },
    });
    engineRef.current = engine;
    (window as unknown as { __pbEngine?: PaintballEngine }).__pbEngine = engine;

    const onLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      if (locked) {
        if (phaseRef.current === "playing") engine.setRunning(true);
      } else if (phaseRef.current === "playing") {
        engine.setRunning(false);
        setPhase("paused");
      }
    };
    document.addEventListener("pointerlockchange", onLockChange);

    const ro = new ResizeObserver(() => {
      engine.resize(wrap.clientWidth, wrap.clientHeight);
    });
    ro.observe(wrap);

    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const enterGame = () => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;
    setPhase("playing");
    engine.setRunning(true);
    canvas.requestPointerLock?.();
  };

  const rematch = () => {
    engineRef.current?.reset();
    setResult(null);
    setFeed([]);
    setHud(EMPTY_HUD);
    enterGame();
  };

  const mins = Math.floor(hud.time / 60);
  const secs = String(hud.time % 60).padStart(2, "0");

  return (
    <div ref={wrapRef} className="fixed inset-0 z-50 overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* damage flash */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{ opacity: flash * 0.45, background: "radial-gradient(ellipse at center, transparent 40%, #ff0033 100%)" }}
      />

      {/* in-game HUD */}
      {(phase === "playing" || phase === "paused") && (
        <>
          {/* crosshair */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-thin text-white/90 drop-shadow">
            +
          </div>
          {/* scoreboard */}
          <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-black/45 px-4 py-1.5 font-mono text-lg font-bold backdrop-blur-sm">
            <span className="text-red-400">RED {hud.red}</span>
            <span className="text-white/70">{mins}:{secs}</span>
            <span className="text-blue-400">{hud.blue} BLU</span>
          </div>
          {/* health + shield + weapon */}
          <div className="pointer-events-none absolute bottom-5 left-5 w-56">
            <div className="mb-1.5 inline-flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1 font-mono text-sm font-bold text-white backdrop-blur-sm">
              <span className="text-lg">{hud.weaponIcon}</span> {hud.weapon}
            </div>
            {hud.shield > 0 && (
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-black/50">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${hud.shield}%` }} />
              </div>
            )}
            <div className="mb-1 font-mono text-xs font-bold tracking-widest text-white/80">HEALTH</div>
            <div className="h-3.5 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${hud.hp}%`,
                  background: hud.hp > 60 ? "#4ade80" : hud.hp > 30 ? "#facc15" : "#ef4444",
                }}
              />
            </div>
          </div>
          {/* grenades */}
          <div className="pointer-events-none absolute bottom-5 right-5 flex flex-col items-end gap-2">
            {hud.onRoof && (
              <div className="rounded-lg bg-yellow-400/90 px-3 py-1 font-mono text-sm font-black text-black shadow-lg">
                🏆 ON TOP OF THE CAGE
              </div>
            )}
            <div className="flex gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold backdrop-blur-sm ${
                  hud.gPaint === 0 ? "bg-pink-500/85 text-white" : "bg-black/50 text-white/50"
                }`}
              >
                🎨 {hud.gPaint === 0 ? "G" : `${hud.gPaint}s`}
              </div>
              <div
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold backdrop-blur-sm ${
                  hud.gSmoke === 0 ? "bg-slate-400/85 text-black" : "bg-black/50 text-white/50"
                }`}
              >
                💨 {hud.gSmoke === 0 ? "H" : `${hud.gSmoke}s`}
              </div>
            </div>
          </div>
          {/* active skill effects */}
          {hud.fx.length > 0 && (
            <div className="pointer-events-none absolute left-5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
              {hud.fx.map((e) => (
                <div key={e.name} className="flex items-center gap-2 rounded-lg bg-black/55 px-3 py-1.5 font-mono text-sm font-bold text-yellow-200 backdrop-blur-sm">
                  <span className="text-lg">{e.icon}</span> {e.name} <span className="text-white/70">{e.sec}s</span>
                </div>
              ))}
            </div>
          )}
          {/* interaction prompt */}
          {hud.prompt && !hud.dead && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 font-mono text-sm font-bold text-yellow-300 backdrop-blur-sm">
              {hud.prompt}
            </div>
          )}
          {/* carrying banner */}
          {hud.carrying && (
            <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 font-mono text-sm font-bold text-yellow-300 drop-shadow">
              🗑️ TRASH CAN ARMED
            </div>
          )}
          {hud.carryingBomb && (
            <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 animate-pulse font-mono text-base font-black text-red-400 drop-shadow">
              💣 BIG BOMB ARMED — THROW IT AND RUN!!
            </div>
          )}
          {/* kill feed */}
          <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1">
            {feed.map((l) => (
              <div
                key={l.id}
                className={`rounded px-2.5 py-1 font-mono text-xs font-bold backdrop-blur-sm ${
                  l.isCan ? "bg-yellow-400/90 text-black" : "bg-black/50 text-white/90"
                }`}
              >
                {l.text}
              </div>
            ))}
          </div>
          {/* kill praise alerts */}
          <div className="pointer-events-none absolute right-5 top-28 flex flex-col items-end gap-2">
            {praises.map((p) => (
              <div
                key={p.id}
                className="-rotate-2 text-3xl font-black italic tracking-wide text-yellow-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]"
                style={{ animation: "pbpop 0.35s ease-out" }}
              >
                {p.text}
              </div>
            ))}
          </div>
          <style>{`@keyframes pbpop { 0% { transform: scale(0.3) rotate(-8deg); opacity: 0; } 60% { transform: scale(1.25) rotate(-2deg); } 100% { transform: scale(1) rotate(-2deg); opacity: 1; } }`}</style>
          {/* death overlay */}
          {hud.dead && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-red-950/40">
              <div className="text-5xl font-black tracking-wider text-white drop-shadow-lg">SPLATTED!</div>
              <div className="mt-2 font-mono text-lg text-white/85">respawning in {hud.respawnIn.toFixed(1)}s</div>
            </div>
          )}
        </>
      )}

      {/* pause overlay */}
      {phase === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/70">
          <div className="text-4xl font-black tracking-widest text-white">PAUSED</div>
          <button
            onClick={enterGame}
            className="rounded-xl bg-green-500 px-8 py-3 text-xl font-black text-black transition hover:scale-105 hover:bg-green-400"
          >
            RESUME
          </button>
          <a href="/" className="font-mono text-sm text-white/60 hover:text-white">← quit to all games</a>
        </div>
      )}

      {/* start menu */}
      {phase === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-green-950/85 via-black/70 to-black/85 p-6 text-center">
          <h1 className="bg-gradient-to-r from-lime-300 via-yellow-300 to-orange-400 bg-clip-text text-5xl font-black tracking-tight text-transparent drop-shadow sm:text-6xl">
            PAINTBALL
          </h1>
          <h2 className="-mt-3 text-2xl font-black tracking-[0.35em] text-white/90">JUNGLE RUMBLE</h2>
          <p className="max-w-md text-sm text-lime-100/80">
            5v5 paintball deep in an overgrown jungle. A steel cage ring sits in the clearing —
            fight inside it, <b>climb on top of it</b>, and hurl <b>trash cans</b> off the roof.
            First team to 10 splats wins!
          </p>
          <div className="grid max-w-md grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-black/40 p-4 text-left font-mono text-xs text-white/80">
            <span><b className="text-lime-300">WASD</b> — move</span>
            <span><b className="text-lime-300">MOUSE</b> — aim</span>
            <span><b className="text-lime-300">CLICK</b> — shoot / throw</span>
            <span><b className="text-lime-300">SPACE</b> — jump</span>
            <span><b className="text-lime-300">SHIFT</b> — sprint</span>
            <span><b className="text-lime-300">E</b> — climb cage / grab can</span>
            <span><b className="text-pink-300">G</b> — paint grenade</span>
            <span><b className="text-slate-300">H</b> — smoke grenade</span>
          </div>
          <p className="max-w-md text-xs text-lime-100/70">
            Hunt for glowing pickups: <b className="text-yellow-300">10 upgrade weapons</b> (bazooka, minigun,
            homing hornet…) and <b className="text-cyan-300">crazy skills</b> — speed boost, GIANT mode, tiny mode,
            invincibility, moon boots and more! Eat a <b className="text-amber-300">🫓 Colombian arepa</b> to heal
            back to 100%. And on top of the cage sits the <b className="text-red-400">💣 BIG BOMB</b> — it splats
            EVERYONE near the blast, even your own team. Throw it and RUN!
          </p>
          {isTouch && (
            <p className="max-w-sm rounded-lg bg-yellow-500/20 px-3 py-2 text-xs text-yellow-200">
              ⚠️ This game needs a keyboard and mouse — play it on a computer!
            </p>
          )}
          <button
            onClick={enterGame}
            className="mt-2 rounded-2xl bg-gradient-to-r from-lime-400 to-green-500 px-12 py-4 text-2xl font-black text-black shadow-lg shadow-lime-500/30 transition hover:scale-105"
          >
            ▶ PLAY
          </button>
          <a href="/" className="font-mono text-sm text-white/50 hover:text-white">← all games</a>
        </div>
      )}

      {/* game over */}
      {phase === "over" && result && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 text-center">
          <div
            className={`text-6xl font-black tracking-wider drop-shadow-lg ${
              result.winner === "red" ? "text-red-400" : result.winner === "blue" ? "text-blue-400" : "text-white"
            }`}
          >
            {result.winner === "draw" ? "DRAW!" : result.winner === "red" ? "RED TEAM WINS!" : "BLUE TEAM WINS!"}
          </div>
          <div className="font-mono text-2xl text-white/90">
            <span className="text-red-400">{result.red}</span> — <span className="text-blue-400">{result.blue}</span>
          </div>
          {result.winner === "red" && <div className="text-lg text-lime-300">Your team took the jungle! 🎉</div>}
          <button
            onClick={rematch}
            className="mt-2 rounded-xl bg-green-500 px-10 py-3 text-xl font-black text-black transition hover:scale-105 hover:bg-green-400"
          >
            REMATCH
          </button>
          <a href="/" className="font-mono text-sm text-white/60 hover:text-white">← all games</a>
        </div>
      )}
    </div>
  );
}
