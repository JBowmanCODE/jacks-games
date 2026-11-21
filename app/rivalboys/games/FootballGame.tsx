"use client";

import React, { useEffect, useRef, useState } from "react";
import { CHARACTERS, CharacterId, getCharacter, randomFrom } from "../characters";
import { drawCharacter } from "../drawCharacter";
import { sound } from "../sound";
import { MiniGameProps } from "./RobloxRivalsGame";

const W = 800;
const H = 480;
const DURATION = 45;

interface PitchPlayer {
  id: CharacterId;
  team: "blue" | "red" | "ref";
  x: number;
  y: number;
  facing: 1 | -1;
  walkPhase: number;
  isPlayer: boolean;
  shoutTimer: number;
  speech: string;
}

export default function FootballGame({
  playerId,
  onFinish,
  onShout,
  onExit,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const touchDirRef = useRef({ dx: 0, dy: 0 });
  const finishedRef = useRef(false);

  const [hud, setHud] = useState({
    time: DURATION,
    myScore: 0,
    oppScore: 0,
    banner: "⚽ KICKOFF! Score into the RIGHT goal!",
  });

  const kickTriggerRef = useRef<() => void>(() => {});
  const shoutTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Assign teams: player + 1 buddy on Blue (left attacking right), 2 on Red (right attacking left), 5th is hyped Ref!
    const others = CHARACTERS.filter((c) => c.id !== playerId);
    const teammate = others[0];
    const opp1 = others[1];
    const opp2 = others[2];
    const refChar = others[3];

    const players: PitchPlayer[] = [
      { id: playerId, team: "blue", x: 240, y: 240, facing: 1, walkPhase: 0, isPlayer: true, shoutTimer: 2, speech: "PASS TO ME!!" },
      { id: teammate.id, team: "blue", x: 150, y: 150, facing: 1, walkPhase: 0, isPlayer: false, shoutTimer: 0, speech: "" },
      { id: opp1.id, team: "red", x: 560, y: 200, facing: -1, walkPhase: 0, isPlayer: false, shoutTimer: 0, speech: "" },
      { id: opp2.id, team: "red", x: 640, y: 310, facing: -1, walkPhase: 0, isPlayer: false, shoutTimer: 0, speech: "" },
      { id: refChar.id, team: "ref", x: 400, y: 85, facing: 1, walkPhase: 0, isPlayer: false, shoutTimer: 2, speech: "PLAY ON!!" },
    ];

    const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, golden: false };
    let timeLeft = DURATION;
    let myScore = 0;
    let oppScore = 0;
    let banner = `⚽ ${getCharacter(playerId).name} & ${teammate.name} vs ${opp1.name} & ${opp2.name}!`;
    let goalFreeze = 0;
    let shake = 0;
    let chaosAdded = 12;
    let hudTick = 0;

    const resetPositions = () => {
      players[0].x = 240; players[0].y = 240;
      players[1].x = 160; players[1].y = 150;
      players[2].x = 560; players[2].y = 200;
      players[3].x = 640; players[3].y = 310;
      ball.x = W / 2;
      ball.y = H / 2;
      ball.vx = 0;
      ball.vy = 0;
      ball.golden = Math.random() < 0.35;
      if (ball.golden) {
        players[4].shoutTimer = 2.4;
        players[4].speech = "GOLDEN BALL = 2 GOALS!!";
      }
    };

    kickTriggerRef.current = () => {
      const p = players[0];
      const d = Math.hypot(ball.x - p.x, ball.y - (p.y - 10));
      if (d < 56) {
        // Kick toward right goal with aim influenced by vertical position
        const targetX = W - 20;
        const targetY = H / 2 + (p.y - H / 2) * 0.45;
        const ang = Math.atan2(targetY - ball.y, targetX - ball.x);
        ball.vx = Math.cos(ang) * 520;
        ball.vy = Math.sin(ang) * 520;
        sound.kick();
        p.shoutTimer = 1.4;
        p.speech = randomFrom(getCharacter(p.id).footballShouts);
      }
    };

    shoutTriggerRef.current = () => {
      const p = players[0];
      const def = getCharacter(p.id);
      p.shoutTimer = 1.9;
      p.speech = randomFrom(def.footballShouts);
      shake = 6;
      chaosAdded += 8;
      sound.shout(def.voicePitch);
      onShout(8);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " ") {
        e.preventDefault();
        kickTriggerRef.current();
      }
      if (e.key.toLowerCase() === "e") {
        shoutTriggerRef.current();
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
          const won = myScore > oppScore;
          const stars = myScore >= 4 || (won && myScore >= 2) ? 3 : won || myScore >= 2 ? 2 : 1;
          onFinish({
            score: myScore * 150 + (won ? 200 : 50),
            stars,
            headline: `Final Score ${myScore}–${oppScore}! ${won ? "BACKYARD CHAMPIONS!" : "WHAT A MATCH!"}`,
            chaosAdded,
          });
          return;
        }
      }

      shake = Math.max(0, shake - dt * 20);
      if (goalFreeze > 0) {
        goalFreeze -= dt;
        if (goalFreeze <= 0) resetPositions();
      }

      // Move players
      for (const pl of players) {
        if (pl.shoutTimer > 0) {
          pl.shoutTimer -= dt;
          if (pl.shoutTimer <= 0) pl.speech = "";
        }

        if (pl.team === "ref") {
          // Ref trots along top sideline cheering!
          pl.x = W / 2 + Math.sin(now / 900) * 180;
          pl.facing = Math.cos(now / 900) >= 0 ? 1 : -1;
          pl.walkPhase += dt * 7;
          continue;
        }

        if (goalFreeze > 0) continue;

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
          pl.x = Math.max(46, Math.min(W - 46, pl.x + mx * 240 * dt));
          pl.y = Math.max(105, Math.min(H - 32, pl.y + my * 240 * dt));
          if (Math.abs(mx) > 0.1) pl.facing = mx > 0 ? 1 : -1;
        } else {
          // Smart casual AI
          const isBlue = pl.team === "blue";
          const targetX = isBlue
            ? Math.min(ball.x - 40, W - 120)
            : pl.id === opp2.id
            ? Math.max(W - 115, ball.x + 25) // keeper-ish defender
            : ball.x + 15;
          const targetY =
            pl.id === opp2.id
              ? Math.max(170, Math.min(310, ball.y))
              : ball.y + (isBlue ? -25 : 15);
          const dx = targetX - pl.x;
          const dy = targetY - pl.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 8) {
            mx = dx / dist;
            my = dy / dist;
            const spd = isBlue ? 148 : 138;
            pl.x = Math.max(48, Math.min(W - 48, pl.x + mx * spd * dt));
            pl.y = Math.max(105, Math.min(H - 32, pl.y + my * spd * dt));
            pl.facing = mx >= 0 ? 1 : -1;
          }
        }

        if (Math.hypot(mx, my) > 0.1) pl.walkPhase += dt * 12;

        // Ball collision / dribble
        const bdx = ball.x - pl.x;
        const bdy = ball.y - (pl.y - 10);
        const bdist = Math.hypot(bdx, bdy);
        if (bdist < 28) {
          const ang = Math.atan2(bdy, bdx);
          const kickPower = pl.isPlayer ? 275 : pl.team === "blue" ? 260 : 250;
          // Push ball forward toward opponent goal
          const goalAng =
            pl.team === "blue"
              ? Math.atan2(H / 2 - ball.y, W - 30 - ball.x)
              : Math.atan2(H / 2 - ball.y, 30 - ball.x);
          const mixAng = pl.isPlayer ? ang : goalAng + (Math.random() - 0.5) * 0.35;
          ball.vx = Math.cos(mixAng) * kickPower;
          ball.vy = Math.sin(mixAng) * kickPower;
          ball.x = pl.x + Math.cos(ang) * 29;
          ball.y = pl.y - 10 + Math.sin(ang) * 29;
          if (!pl.isPlayer && Math.random() < 0.08) sound.kick();
        }
      }

      // Ball physics
      if (goalFreeze <= 0) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.vx *= Math.pow(0.24, dt);
        ball.vy *= Math.pow(0.24, dt);

        // Top & bottom walls
        if (ball.y < 100) { ball.y = 100; ball.vy = Math.abs(ball.vy) * 0.8; }
        if (ball.y > H - 24) { ball.y = H - 24; ball.vy = -Math.abs(ball.vy) * 0.8; }

        const inGoalY = ball.y > 180 && ball.y < 320;
        if (ball.x > W - 32) {
          if (inGoalY) {
            const pts = ball.golden ? 2 : 1;
            myScore += pts;
            goalFreeze = 1.5;
            shake = 12;
            chaosAdded += 10;
            sound.goal();
            sound.shout(getCharacter(playerId).voicePitch);
            banner = ball.golden ? "🌟 GOLDEN GOAL!! +2!!" : "⚽ GOALAZO!! SIUUUU!!";
            players[0].shoutTimer = 1.8;
            players[0].speech = "SIUUUUU!! TOP BINS!!";
          } else {
            ball.x = W - 32;
            ball.vx = -Math.abs(ball.vx) * 0.8;
          }
        } else if (ball.x < 32) {
          if (inGoalY) {
            const pts = ball.golden ? 2 : 1;
            oppScore += pts;
            goalFreeze = 1.5;
            shake = 9;
            sound.buzzer();
            banner = `😱 ${opp1.name} & ${opp2.name} scored! Fight back!`;
            players[2].shoutTimer = 1.8;
            players[2].speech = "LET'S GOOO!!";
          } else {
            ball.x = 32;
            ball.vx = Math.abs(ball.vx) * 0.8;
          }
        }
      }

      // Draw pitch
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      // Backyard fence sky strip at top
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(0, 0, W, 86);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(0, 56, W, 30);
      for (let fx = 0; fx < W; fx += 24) {
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, 56);
        ctx.lineTo(fx, 86);
        ctx.stroke();
      }

      // Striped grass pitch
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#16a34a" : "#15803d";
        ctx.fillRect(i * (W / 10), 86, W / 10 + 1, H - 86);
      }

      // Pitch markings
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeRect(32, 98, W - 64, H - 118);
      ctx.beginPath();
      ctx.moveTo(W / 2, 98);
      ctx.lineTo(W / 2, H - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, (98 + H - 20) / 2, 54, 0, Math.PI * 2);
      ctx.stroke();

      // Goals
      ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.fillRect(6, 180, 26, 140);
      ctx.strokeRect(6, 180, 26, 140);

      ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
      ctx.fillRect(W - 32, 180, 26, 140);
      ctx.strokeRect(W - 32, 180, 26, 140);

      // Shoot arrow label on right goal
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#fef08a";
      ctx.textAlign = "right";
      ctx.fillText("SCORE HERE ▶", W - 38, 174);

      // Draw players sorted by Y
      const sorted = [...players].sort((a, b) => a.y - b.y);
      for (const pl of sorted) {
        const def = getCharacter(pl.id);
        drawCharacter(ctx, def, {
          x: pl.x,
          y: pl.y,
          facing: pl.facing,
          walkPhase: pl.walkPhase,
          shouting: pl.shoutTimer > 0,
          isPlayer: pl.isPlayer,
          speech: pl.speech || undefined,
        });
        // Team pip
        if (pl.team !== "ref") {
          ctx.fillStyle = pl.team === "blue" ? "#38bdf8" : "#f87171";
          ctx.beginPath();
          ctx.arc(pl.x, pl.y - 68 * def.heightScale, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw football
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(0, 9, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ball.golden ? "#facc15" : "#ffffff";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ball.golden ? "#b45309" : "#111827";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      hudTick += dt;
      if (hudTick >= 0.1) {
        hudTick = 0;
        setHud({ time: Math.ceil(timeLeft), myScore, oppScore, banner });
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-700/70 bg-[#0f2419] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-emerald-300">⚽ BACKYARD FOOTBALL</span>
          <span className="rounded-full bg-emerald-950 px-3 py-0.5 text-sm font-bold text-yellow-300">
            ⏱ {hud.time}s
          </span>
          <span className="rounded-full bg-sky-600 px-3 py-0.5 text-sm font-black text-white">
            YOU {hud.myScore} – {hud.oppScore} RIVALS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shoutTriggerRef.current()}
            className="rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black hover:bg-yellow-300 active:scale-95"
          >
            📢 SIUUU!
          </button>
          <button
            onClick={onExit}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700"
          >
            Back
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-emerald-950/70 px-3 py-1.5 text-center text-xs font-bold text-emerald-200">
        {hud.banner}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-emerald-500/80 bg-black shadow-2xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto block touch-none"
          onPointerDown={() => kickTriggerRef.current()}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#16162a] p-3 text-xs text-gray-300">
        <div>
          <strong className="text-emerald-300">Controls:</strong> WASD / Arrows to run & dribble ·{" "}
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Space</kbd> or Click/Tap to SHOOT ·{" "}
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">E</kbd> Shout!
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              onPointerDown={() => (touchDirRef.current.dy = -1)}
              onPointerUp={() => (touchDirRef.current.dy = 0)}
              onPointerLeave={() => (touchDirRef.current.dy = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-emerald-600"
            >
              ▲
            </button>
            <div />
            <button
              onPointerDown={() => (touchDirRef.current.dx = -1)}
              onPointerUp={() => (touchDirRef.current.dx = 0)}
              onPointerLeave={() => (touchDirRef.current.dx = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-emerald-600"
            >
              ◀
            </button>
            <button
              onPointerDown={() => (touchDirRef.current.dy = 1)}
              onPointerUp={() => (touchDirRef.current.dy = 0)}
              onPointerLeave={() => (touchDirRef.current.dy = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-emerald-600"
            >
              ▼
            </button>
            <button
              onPointerDown={() => (touchDirRef.current.dx = 1)}
              onPointerUp={() => (touchDirRef.current.dx = 0)}
              onPointerLeave={() => (touchDirRef.current.dx = 0)}
              className="h-9 w-9 rounded-lg bg-slate-800 font-bold text-white active:bg-emerald-600"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => kickTriggerRef.current()}
            className="rounded-xl bg-emerald-500 px-4 py-2 font-black text-black active:scale-95"
          >
            ⚽ SHOOT!
          </button>
        </div>
      </div>
    </div>
  );
}
