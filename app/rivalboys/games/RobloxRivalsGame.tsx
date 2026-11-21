"use client";

import React, { useEffect, useRef, useState } from "react";
import { CHARACTERS, CharacterId, getCharacter, randomFrom } from "../characters";
import { drawCharacter } from "../drawCharacter";
import { sound } from "../sound";

export interface MiniGameProps {
  playerId: CharacterId;
  onFinish: (result: {
    score: number;
    stars: number;
    headline: string;
    chaosAdded: number;
  }) => void;
  onShout: (amount?: number) => void;
  onExit: () => void;
}

interface Fighter {
  id: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  aimAngle: number;
  walkPhase: number;
  fireCd: number;
  dashCd: number;
  respawnTimer: number;
  shoutTimer: number;
  speech: string;
  elims: number;
  isPlayer: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: CharacterId;
  color: string;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

const W = 800;
const H = 480;
const DURATION = 45;

const OBSTACLES = [
  { x: 180, y: 120, w: 90, h: 36 },
  { x: 530, y: 120, w: 90, h: 36 },
  { x: 355, y: 210, w: 90, h: 60 },
  { x: 180, y: 330, w: 90, h: 36 },
  { x: 530, y: 330, w: 90, h: 36 },
];

export default function RobloxRivalsGame({
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
    elims: 0,
    streak: 0,
    hp: 100,
    feed: [] as string[],
  });

  const shoutTriggerRef = useRef<() => void>(() => {});
  const dashTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spawns = [
      { x: 90, y: 240 },
      { x: 710, y: 100 },
      { x: 710, y: 380 },
      { x: 400, y: 70 },
      { x: 400, y: 410 },
    ];

    const fighters: Fighter[] = CHARACTERS.map((c, idx) => ({
      id: c.id,
      x: spawns[idx].x,
      y: spawns[idx].y,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      facing: idx === 0 ? 1 : -1,
      aimAngle: 0,
      walkPhase: 0,
      fireCd: 0.4 + Math.random() * 0.5,
      dashCd: 0,
      respawnTimer: 0,
      shoutTimer: idx === 0 ? 2 : 0,
      speech: idx === 0 ? "ROBLOX RIVALS TIME!!" : "",
      elims: 0,
      isPlayer: c.id === playerId,
    }));

    const bullets: Bullet[] = [];
    const particles: Particle[] = [];
    let timeLeft = DURATION;
    let playerElims = 0;
    let streak = 0;
    let shake = 0;
    let chaosAdded = 15;
    let feed: string[] = ["🎮 ROBLOX RIVALS ARENA STARTED!"];
    let hudTick = 0;

    const pushFeed = (msg: string) => {
      feed = [msg, ...feed].slice(0, 3);
    };

    const hitsObstacle = (x: number, y: number, r: number) => {
      for (const o of OBSTACLES) {
        if (x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) {
          return true;
        }
      }
      return false;
    };

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 170;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color,
          life: 0.35 + Math.random() * 0.25,
          size: 3 + Math.random() * 4,
        });
      }
    };

    const fireFrom = (f: Fighter) => {
      const def = getCharacter(f.id);
      const spd = f.isPlayer ? 540 : 370;
      bullets.push({
        x: f.x + Math.cos(f.aimAngle) * 20,
        y: f.y - 26 + Math.sin(f.aimAngle) * 20,
        vx: Math.cos(f.aimAngle) * spd,
        vy: Math.sin(f.aimAngle) * spd,
        owner: f.id,
        color: def.ringColor,
        life: 1.4,
      });
      if (f.isPlayer) sound.laser();
    };

    shoutTriggerRef.current = () => {
      const p = fighters.find((f) => f.isPlayer);
      if (!p) return;
      const def = getCharacter(p.id);
      p.shoutTimer = 2.0;
      p.speech = randomFrom(def.robloxShouts);
      p.hp = Math.min(p.maxHp, p.hp + 12);
      shake = 7;
      chaosAdded += 8;
      sound.shout(def.voicePitch);
      onShout(8);
    };

    dashTriggerRef.current = () => {
      const p = fighters.find((f) => f.isPlayer);
      if (!p || p.dashCd > 0 || p.respawnTimer > 0) return;
      p.dashCd = 1.6;
      const a = p.aimAngle;
      const nx = Math.max(36, Math.min(W - 36, p.x + Math.cos(a) * 95));
      const ny = Math.max(60, Math.min(H - 28, p.y + Math.sin(a) * 95));
      if (!hitsObstacle(nx, ny, 16)) {
        spawnParticles(p.x, p.y - 25, "#38bdf8", 12);
        p.x = nx;
        p.y = ny;
        sound.laser();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " ") {
        e.preventDefault();
        shoutTriggerRef.current();
      }
      if (e.key === "Shift") {
        dashTriggerRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
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
          const stars = playerElims >= 9 ? 3 : playerElims >= 5 ? 2 : 1;
          onFinish({
            score: playerElims * 100 + streak * 25,
            stars,
            headline: `${getCharacter(playerId).name} racked up ${playerElims} Roblox Rivals elims!`,
            chaosAdded,
          });
          return;
        }
      }

      shake = Math.max(0, shake - dt * 22);

      // Update fighters
      for (const f of fighters) {
        if (f.shoutTimer > 0) {
          f.shoutTimer -= dt;
          if (f.shoutTimer <= 0) f.speech = "";
        }
        if (f.fireCd > 0) f.fireCd -= dt;
        if (f.dashCd > 0) f.dashCd -= dt;

        if (f.respawnTimer > 0) {
          f.respawnTimer -= dt;
          if (f.respawnTimer <= 0) {
            f.hp = f.maxHp;
            f.x = 80 + Math.random() * (W - 160);
            f.y = 90 + Math.random() * (H - 150);
            if (hitsObstacle(f.x, f.y, 20)) {
              f.x = 90;
              f.y = 240;
            }
          }
          continue;
        }

        let mx = 0;
        let my = 0;
        if (f.isPlayer) {
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
          const speed = 225;
          const nx = Math.max(30, Math.min(W - 30, f.x + mx * speed * dt));
          const ny = Math.max(60, Math.min(H - 24, f.y + my * speed * dt));
          if (!hitsObstacle(nx, f.y, 15)) f.x = nx;
          if (!hitsObstacle(f.x, ny, 15)) f.y = ny;

          f.aimAngle = Math.atan2(pointerRef.current.y - (f.y - 26), pointerRef.current.x - f.x);
          f.facing = Math.cos(f.aimAngle) >= 0 ? 1 : -1;

          if (pointerRef.current.down && f.fireCd <= 0) {
            f.fireCd = 0.22;
            fireFrom(f);
          }
        } else {
          // Bot AI: pick nearest alive target
          let target: Fighter | null = null;
          let bestDist = Infinity;
          for (const other of fighters) {
            if (other.id === f.id || other.respawnTimer > 0) continue;
            const d = Math.hypot(other.x - f.x, other.y - f.y);
            if (d < bestDist) {
              bestDist = d;
              target = other;
            }
          }
          if (target) {
            const ang = Math.atan2(target.y - f.y, target.x - f.x);
            f.aimAngle = ang + (Math.random() - 0.5) * 0.14;
            f.facing = Math.cos(f.aimAngle) >= 0 ? 1 : -1;
            const strafe = Math.sin(now / 700 + f.id.length * 2);
            const approach = bestDist > 190 ? 1 : bestDist < 110 ? -0.6 : 0;
            mx = Math.cos(ang) * approach - Math.sin(ang) * strafe * 0.7;
            my = Math.sin(ang) * approach + Math.cos(ang) * strafe * 0.7;
            const speed = 128;
            const nx = Math.max(30, Math.min(W - 30, f.x + mx * speed * dt));
            const ny = Math.max(60, Math.min(H - 24, f.y + my * speed * dt));
            if (!hitsObstacle(nx, f.y, 15)) f.x = nx;
            if (!hitsObstacle(f.x, ny, 15)) f.y = ny;

            if (f.fireCd <= 0 && bestDist < 420) {
              f.fireCd = 0.75 + Math.random() * 0.65;
              fireFrom(f);
            }
          }
        }

        if (Math.hypot(mx, my) > 0.1) {
          f.walkPhase += dt * 13;
        }
      }

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (
          b.life <= 0 ||
          b.x < 0 ||
          b.x > W ||
          b.y < 0 ||
          b.y > H ||
          hitsObstacle(b.x, b.y, 4)
        ) {
          spawnParticles(b.x, b.y, b.color, 4);
          bullets.splice(i, 1);
          continue;
        }

        // Hit fighters
        for (const f of fighters) {
          if (f.id === b.owner || f.respawnTimer > 0) continue;
          const dist = Math.hypot(b.x - f.x, b.y - (f.y - 26));
          if (dist < 22) {
            const dmg = b.owner === playerId ? 34 : 16;
            f.hp -= dmg;
            spawnParticles(b.x, b.y, b.color, 8);
            bullets.splice(i, 1);

            if (f.hp <= 0) {
              f.respawnTimer = 2.2;
              const attacker = fighters.find((a) => a.id === b.owner);
              const attDef = getCharacter(b.owner);
              const vicDef = getCharacter(f.id);
              spawnParticles(f.x, f.y - 25, "#fde047", 18);

              if (attacker) {
                attacker.elims += 1;
                attacker.shoutTimer = 1.9;
                attacker.speech = randomFrom(attDef.robloxShouts);
              }

              if (b.owner === playerId) {
                playerElims += 1;
                streak += 1;
                shake = 8;
                chaosAdded += 6;
                sound.elim();
                pushFeed(`💥 ${attDef.name} ELIMINATED ${vicDef.name}! (Streak x${streak})`);
              } else if (f.isPlayer) {
                streak = 0;
                shake = 10;
                sound.buzzer();
                pushFeed(`😵 ${attDef.name} got ${vicDef.name}! Respawning...`);
              } else {
                pushFeed(`⚡ ${attDef.name} bloxed ${vicDef.name}!`);
              }
            }
            break;
          }
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // Render Roblox Rivals Neon Arena
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      // Neon grid floor
      ctx.fillStyle = "#0b1024";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.2)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // "ROBLOX RIVALS" arena watermark
      ctx.font = "900 32px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(192, 132, 252, 0.14)";
      ctx.fillText("ROBLOX RIVALS ARENA", W / 2, H / 2 + 12);

      // Neon blocks (obstacles)
      for (const o of OBSTACLES) {
        ctx.fillStyle = "#1e1b4b";
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.w, o.h, 6);
        ctx.fill();
        ctx.stroke();
        // Roblox studs on top!
        ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
        for (let sx = o.x + 14; sx < o.x + o.w - 10; sx += 22) {
          ctx.beginPath();
          ctx.arc(sx, o.y + o.h / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Bullets
      for (const b of bullets) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Fighters sorted by Y
      const sorted = [...fighters].sort((a, b) => a.y - b.y);
      for (const f of sorted) {
        if (f.respawnTimer > 0) continue;
        const def = getCharacter(f.id);
        drawCharacter(ctx, def, {
          x: f.x,
          y: f.y,
          facing: f.facing,
          walkPhase: f.walkPhase,
          shouting: f.shoutTimer > 0,
          blocky: true,
          isPlayer: f.isPlayer,
          speech: f.speech || undefined,
        });
        // Laser blaster in hand
        ctx.save();
        ctx.translate(f.x, f.y - 27 * def.heightScale);
        ctx.rotate(f.aimAngle);
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = def.ringColor;
        ctx.lineWidth = 2;
        ctx.fillRect(8, -4, 18, 7);
        ctx.strokeRect(8, -4, 18, 7);
        ctx.restore();

        // HP bar
        ctx.fillStyle = "#111827";
        ctx.fillRect(f.x - 18, f.y - 72 * def.heightScale, 36, 5);
        ctx.fillStyle = f.hp > 40 ? "#4ade80" : "#ef4444";
        ctx.fillRect(f.x - 18, f.y - 72 * def.heightScale, (36 * Math.max(0, f.hp)) / f.maxHp, 5);
      }

      // Particles
      for (const pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life * 2);
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        ctx.globalAlpha = 1;
      }

      // Aim reticle
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pointerRef.current.x, pointerRef.current.y, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      hudTick += dt;
      if (hudTick >= 0.12) {
        hudTick = 0;
        const p = fighters.find((f) => f.isPlayer);
        setHud({
          time: Math.ceil(timeLeft),
          elims: playerElims,
          streak,
          hp: p ? Math.max(0, Math.round(p.hp)) : 0,
          feed: [...feed],
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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-purple-700/70 bg-[#141428] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-purple-300">🎮 ROBLOX RIVALS</span>
          <span className="rounded-full bg-purple-900/70 px-3 py-0.5 text-sm font-bold text-yellow-300">
            ⏱ {hud.time}s
          </span>
          <span className="rounded-full bg-fuchsia-900/70 px-3 py-0.5 text-sm font-bold text-white">
            💥 Elims: {hud.elims}
          </span>
          {hud.streak > 1 && (
            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-black text-black">
              🔥 x{hud.streak} STREAK
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shoutTriggerRef.current()}
            className="rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black hover:bg-yellow-300 active:scale-95 transition"
          >
            📢 SHOUT (+HP!)
          </button>
          <button
            onClick={onExit}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700"
          >
            Back
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/80 bg-black shadow-2xl">
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
        {/* Live kill feed */}
        <div className="pointer-events-none absolute top-2 left-2 space-y-1">
          {hud.feed.map((line, i) => (
            <div
              key={i}
              className="rounded-lg bg-black/70 px-2.5 py-1 text-xs font-bold text-purple-100 backdrop-blur-sm"
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Controls bar + Mobile pad */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#16162a] p-3 text-xs text-gray-300">
        <div>
          <strong className="text-purple-300">Controls:</strong> WASD / Arrows to move · Click/Hold canvas to shoot ·{" "}
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Shift</kbd> Dash ·{" "}
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Space</kbd> Shout!
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              onPointerDown={() => (touchDirRef.current.dy = -1)}
              onPointerUp={() => (touchDirRef.current.dy = 0)}
              onPointerLeave={() => (touchDirRef.current.dy = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-purple-600"
            >
              ▲
            </button>
            <div />
            <button
              onPointerDown={() => (touchDirRef.current.dx = -1)}
              onPointerUp={() => (touchDirRef.current.dx = 0)}
              onPointerLeave={() => (touchDirRef.current.dx = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-purple-600"
            >
              ◀
            </button>
            <button
              onPointerDown={() => (touchDirRef.current.dy = 1)}
              onPointerUp={() => (touchDirRef.current.dy = 0)}
              onPointerLeave={() => (touchDirRef.current.dy = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-purple-600"
            >
              ▼
            </button>
            <button
              onPointerDown={() => (touchDirRef.current.dx = 1)}
              onPointerUp={() => (touchDirRef.current.dx = 0)}
              onPointerLeave={() => (touchDirRef.current.dx = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-purple-600"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => dashTriggerRef.current()}
            className="rounded-xl bg-cyan-600 px-3 py-2 font-black text-white active:scale-95"
          >
            ⚡ DASH
          </button>
        </div>
      </div>
    </div>
  );
}
