"use client";

import React, { useEffect, useRef, useState } from "react";
import { CHARACTERS, CharacterId, getCharacter, randomFrom } from "../characters";
import { drawCharacter } from "../drawCharacter";
import { sound } from "../sound";
import { MiniGameProps } from "./RobloxRivalsGame";

const W = 800;
const H = 480;
const DURATION = 45;

interface Soaker {
  id: CharacterId;
  x: number;
  y: number;
  facing: 1 | -1;
  aimAngle: number;
  walkPhase: number;
  soaked: number; // 0..100
  waterTank: number; // 0..100
  wetTimer: number;
  sprayCd: number;
  shoutTimer: number;
  speech: string;
  isPlayer: boolean;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: CharacterId;
  size: number;
  life: number;
  balloon?: boolean;
}

const REFILL_POOL = { x: W / 2, y: H / 2, r: 44 };

export default function WatergunGame({
  playerId,
  onFinish,
  onShout,
  onExit,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const pointerRef = useRef({ x: W / 2, y: H / 2, down: false });
  const touchDirRef = useRef({ dx: 0, dy: 0 });
  const finishedRef = useRef(false);

  const [hud, setHud] = useState({
    time: DURATION,
    drenches: 0,
    tank: 100,
    balloons: 3,
    feed: "🔫 Hold click/tap to spray water! Run over the blue pool to refill!",
  });

  const balloonTriggerRef = useRef<() => void>(() => {});
  const shoutTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const starts = [
      { x: 110, y: 120 },
      { x: 690, y: 120 },
      { x: 110, y: 390 },
      { x: 690, y: 390 },
      { x: 400, y: 95 },
    ];

    const players: Soaker[] = CHARACTERS.map((c, idx) => ({
      id: c.id,
      x: starts[idx].x,
      y: starts[idx].y,
      facing: idx % 2 === 0 ? 1 : -1,
      aimAngle: 0,
      walkPhase: 0,
      soaked: 0,
      waterTank: 100,
      wetTimer: 0,
      sprayCd: 0.25 + Math.random() * 0.4,
      shoutTimer: c.id === playerId ? 2 : 0,
      speech: c.id === playerId ? "WATERGUN FIGHT!!" : "",
      isPlayer: c.id === playerId,
    }));

    const drops: Drop[] = [];
    const splashes: { x: number; y: number; r: number; life: number }[] = [];
    let timeLeft = DURATION;
    let drenches = 0;
    let balloons = 3;
    let balloonRegen = 6;
    let shake = 0;
    let chaosAdded = 15;
    let feed = "🔫 Soak everyone! Refill at the kiddie pool in the middle!";
    let hudTick = 0;

    const addSplash = (x: number, y: number, r = 24) => {
      splashes.push({ x, y, r, life: 0.35 });
    };

    balloonTriggerRef.current = () => {
      const p = players.find((pl) => pl.isPlayer);
      if (!p || balloons <= 0) return;
      balloons -= 1;
      drops.push({
        x: p.x + Math.cos(p.aimAngle) * 20,
        y: p.y - 26 + Math.sin(p.aimAngle) * 20,
        vx: Math.cos(p.aimAngle) * 390,
        vy: Math.sin(p.aimAngle) * 390,
        owner: p.id,
        size: 11,
        life: 0.9,
        balloon: true,
      });
      sound.splash();
      p.shoutTimer = 1.4;
      p.speech = "WATER BALLOON!!";
    };

    shoutTriggerRef.current = () => {
      const p = players.find((pl) => pl.isPlayer);
      if (!p) return;
      const def = getCharacter(p.id);
      p.shoutTimer = 1.9;
      p.speech = randomFrom(def.watergunShouts);
      p.waterTank = Math.min(100, p.waterTank + 25);
      shake = 7;
      chaosAdded += 8;
      sound.shout(def.voicePitch);
      onShout(8);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " ") {
        e.preventDefault();
        shoutTriggerRef.current();
      }
      if (e.key.toLowerCase() === "q" || e.key === "Shift") {
        balloonTriggerRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let last = performance.now();
    let raf = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!finishedRef.current) {
        timeLeft = Math.max(0, timeLeft - dt);
        if (timeLeft <= 0) {
          finishedRef.current = true;
          const stars = drenches >= 8 ? 3 : drenches >= 4 ? 2 : 1;
          onFinish({
            score: drenches * 120 + 60,
            stars,
            headline: `${getCharacter(playerId).name} drenched the squad ${drenches} times!`,
            chaosAdded,
          });
          return;
        }
      }

      shake = Math.max(0, shake - dt * 20);
      balloonRegen -= dt;
      if (balloonRegen <= 0) {
        balloonRegen = 6.5;
        if (balloons < 4) balloons += 1;
      }

      // Update characters
      for (const pl of players) {
        if (pl.shoutTimer > 0) {
          pl.shoutTimer -= dt;
          if (pl.shoutTimer <= 0) pl.speech = "";
        }
        if (pl.wetTimer > 0) pl.wetTimer -= dt;
        if (pl.sprayCd > 0) pl.sprayCd -= dt;

        // Refill near kiddie pool
        if (Math.hypot(pl.x - REFILL_POOL.x, pl.y - REFILL_POOL.y) < REFILL_POOL.r + 24) {
          pl.waterTank = Math.min(100, pl.waterTank + dt * 65);
        }

        let mx = 0;
        let my = 0;
        if (pl.isPlayer) {
          const k = keysRef.current;
          if (k.has("w") || k.has("arrowup")) my -= 1;
          if (k.has("s") || k.has("arrowdown")) my += 1;
          if (k.has("a") || k.has("arrowleft")) mx -= 1;
          if (k.has("d") || k.has("arrowright")) mx += 1;
          if (touchDirRef.current.dx || touchDirRef.current.dy) {
            mx = touchDirRef.current.dx;
            my = touchDirRef.current.dy;
          }
          const len = Math.hypot(mx, my);
          if (len > 0) {
            mx /= len;
            my /= len;
          }
          pl.x = Math.max(36, Math.min(W - 36, pl.x + mx * 230 * dt));
          pl.y = Math.max(82, Math.min(H - 28, pl.y + my * 230 * dt));
          pl.aimAngle = Math.atan2(pointerRef.current.y - (pl.y - 26), pointerRef.current.x - pl.x);
          pl.facing = Math.cos(pl.aimAngle) >= 0 ? 1 : -1;

          if (pointerRef.current.down && pl.sprayCd <= 0 && pl.waterTank > 2) {
            pl.sprayCd = 0.08;
            pl.waterTank = Math.max(0, pl.waterTank - 2.6);
            for (let s = 0; s < 2; s++) {
              const spread = (Math.random() - 0.5) * 0.14;
              drops.push({
                x: pl.x + Math.cos(pl.aimAngle) * 24,
                y: pl.y - 26 + Math.sin(pl.aimAngle) * 24,
                vx: Math.cos(pl.aimAngle + spread) * 480,
                vy: Math.sin(pl.aimAngle + spread) * 480,
                owner: pl.id,
                size: 5,
                life: 0.72,
              });
            }
            if (Math.random() < 0.35) sound.waterSpray();
          }
        } else {
          // AI runs around chasing rivals or refilling
          let targetX = REFILL_POOL.x;
          let targetY = REFILL_POOL.y;
          let targetPl: Soaker | null = null;
          if (pl.waterTank > 18) {
            let best = Infinity;
            for (const o of players) {
              if (o.id === pl.id) continue;
              const d = Math.hypot(o.x - pl.x, o.y - pl.y);
              if (d < best) {
                best = d;
                targetPl = o;
              }
            }
            if (targetPl) {
              const orbit = now / 900 + pl.id.length;
              targetX = targetPl.x + Math.cos(orbit) * 120;
              targetY = targetPl.y + Math.sin(orbit) * 110;
              pl.aimAngle = Math.atan2(targetPl.y - pl.y, targetPl.x - pl.x);
              pl.facing = Math.cos(pl.aimAngle) >= 0 ? 1 : -1;
              if (pl.sprayCd <= 0 && best < 300) {
                pl.sprayCd = 0.28 + Math.random() * 0.25;
                pl.waterTank = Math.max(0, pl.waterTank - 3);
                drops.push({
                  x: pl.x + Math.cos(pl.aimAngle) * 22,
                  y: pl.y - 26 + Math.sin(pl.aimAngle) * 22,
                  vx: Math.cos(pl.aimAngle) * 350,
                  vy: Math.sin(pl.aimAngle) * 350,
                  owner: pl.id,
                  size: 4.5,
                  life: 0.7,
                });
              }
            }
          }
          const dx = targetX - pl.x;
          const dy = targetY - pl.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            mx = dx / dist;
            my = dy / dist;
            pl.x = Math.max(36, Math.min(W - 36, pl.x + mx * 130 * dt));
            pl.y = Math.max(82, Math.min(H - 28, pl.y + my * 130 * dt));
          }
        }

        if (Math.hypot(mx, my) > 0.1) pl.walkPhase += dt * 12;
      }

      // Update drops
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.life -= dt;

        if (d.life <= 0 || d.x < 0 || d.x > W || d.y < 0 || d.y > H) {
          if (d.balloon) {
            addSplash(d.x, d.y, 70);
            sound.splash();
          }
          drops.splice(i, 1);
          continue;
        }

        let hit = false;
        for (const pl of players) {
          if (pl.id === d.owner) continue;
          const dist = Math.hypot(d.x - pl.x, d.y - (pl.y - 26));
          if (dist < (d.balloon ? 34 : 20)) {
            hit = true;
            const soakAmt = d.balloon ? 85 : d.owner === playerId ? 16 : 6;
            pl.soaked += soakAmt;
            pl.wetTimer = 2.5;
            addSplash(d.x, d.y, d.balloon ? 68 : 18);

            if (pl.soaked >= 100) {
              pl.soaked = 0;
              const vicDef = getCharacter(pl.id);
              const attDef = getCharacter(d.owner);
              pl.shoutTimer = 2.0;
              pl.speech = "AAAHHH I'M SOAKED!!";
              sound.splash();

              if (d.owner === playerId) {
                drenches += 1;
                shake = 7;
                chaosAdded += 7;
                sound.shout(vicDef.voicePitch);
                feed = `💦 ${attDef.name} DRENCHED ${vicDef.name}!! (${drenches} total!)`;
              } else if (pl.isPlayer) {
                feed = `🌊 ${attDef.name} splashed you! Spray 'em back!`;
              }
            }
            break;
          }
        }
        if (hit) drops.splice(i, 1);
      }

      for (let i = splashes.length - 1; i >= 0; i--) {
        splashes[i].life -= dt;
        if (splashes[i].life <= 0) splashes.splice(i, 1);
      }

      // Render sunny backyard watergun arena
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      // Patio + lawn
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(0, 0, W, H);
      // Patio tiles at top
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(0, 0, W, 68);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      for (let px = 0; px < W; px += 60) {
        ctx.strokeRect(px, 0, 60, 68);
      }

      // Kiddie Pool refill zone in center
      ctx.fillStyle = "#0284c7";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(REFILL_POOL.x, REFILL_POOL.y, REFILL_POOL.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "900 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💦 REFILL", REFILL_POOL.x, REFILL_POOL.y - 2);
      ctx.fillText("POOL", REFILL_POOL.x, REFILL_POOL.y + 12);

      // Splash rings
      for (const sp of splashes) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${sp.life * 2.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * (1.2 - sp.life * 2), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Characters sorted by Y
      const sorted = [...players].sort((a, b) => a.y - b.y);
      for (const pl of sorted) {
        const def = getCharacter(pl.id);
        drawCharacter(ctx, def, {
          x: pl.x,
          y: pl.y,
          facing: pl.facing,
          walkPhase: pl.walkPhase,
          shouting: pl.shoutTimer > 0,
          wet: pl.wetTimer > 0,
          holding: "watergun",
          aimAngle: pl.aimAngle,
          isPlayer: pl.isPlayer,
          speech: pl.speech || undefined,
        });

        // Soaked bar
        if (pl.soaked > 0) {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(pl.x - 18, pl.y - 72 * def.heightScale, 36, 5);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(pl.x - 18, pl.y - 72 * def.heightScale, (36 * pl.soaked) / 100, 5);
        }
      }

      // Water drops & balloons
      for (const d of drops) {
        if (d.balloon) {
          ctx.fillStyle = "#f43f5e";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      hudTick += dt;
      if (hudTick >= 0.1) {
        hudTick = 0;
        const p = players.find((pl) => pl.isPlayer);
        setHud({
          time: Math.ceil(timeLeft),
          drenches,
          tank: p ? Math.round(p.waterTank) : 0,
          balloons,
          feed,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [playerId, onFinish, onShout]);

  const updatePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * W;
    pointerRef.current.y = ((e.clientY - rect.top) / rect.height) * H;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-600/70 bg-[#0d2233] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-cyan-300">🔫 WATERGUN CHAOS</span>
          <span className="rounded-full bg-cyan-950 px-3 py-0.5 text-sm font-bold text-yellow-300">
            ⏱ {hud.time}s
          </span>
          <span className="rounded-full bg-sky-600 px-3 py-0.5 text-sm font-black text-white">
            💦 Drenches: {hud.drenches}
          </span>
          <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs font-bold text-cyan-300">
            Tank: {hud.tank}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => balloonTriggerRef.current()}
            disabled={hud.balloons <= 0}
            className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40 active:scale-95"
          >
            🎈 BALLOON ({hud.balloons})
          </button>
          <button
            onClick={() => shoutTriggerRef.current()}
            className="rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black active:scale-95"
          >
            📢 SHOUT (+WATER!)
          </button>
          <button
            onClick={onExit}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700"
          >
            Back
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-cyan-950/70 px-3 py-1.5 text-center text-xs font-bold text-cyan-200">
        {hud.feed}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-cyan-400/80 bg-black shadow-2xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto block cursor-crosshair touch-none"
          onPointerMove={updatePointer}
          onPointerDown={(e) => {
            updatePointer(e);
            pointerRef.current.down = true;
          }}
          onPointerUp={() => {
            pointerRef.current.down = false;
          }}
          onPointerLeave={() => {
            pointerRef.current.down = false;
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#16162a] p-3 text-xs text-gray-300">
        <div>
          <strong className="text-cyan-300">Controls:</strong> WASD / Arrows to run · Hold Click/Tap to spray water ·{" "}
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Q</kbd> Water Balloon ·{" "}
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Space</kbd> Shout!
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div />
          <button
            onPointerDown={() => (touchDirRef.current.dy = -1)}
            onPointerUp={() => (touchDirRef.current.dy = 0)}
            onPointerLeave={() => (touchDirRef.current.dy = 0)}
            className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-cyan-600"
          >
            ▲
          </button>
          <div />
          <button
            onPointerDown={() => (touchDirRef.current.dx = -1)}
            onPointerUp={() => (touchDirRef.current.dx = 0)}
            onPointerLeave={() => (touchDirRef.current.dx = 0)}
            className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-cyan-600"
          >
            ◀
          </button>
          <button
            onPointerDown={() => (touchDirRef.current.dy = 1)}
            onPointerUp={() => (touchDirRef.current.dy = 0)}
            onPointerLeave={() => (touchDirRef.current.dy = 0)}
            className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-cyan-600"
          >
            ▼
          </button>
          <button
            onPointerDown={() => (touchDirRef.current.dx = 1)}
            onPointerUp={() => (touchDirRef.current.dx = 0)}
            onPointerLeave={() => (touchDirRef.current.dx = 0)}
            className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-cyan-600"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
