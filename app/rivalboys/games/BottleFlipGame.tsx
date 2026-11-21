"use client";

import React, { useEffect, useRef, useState } from "react";
import { CHARACTERS, CharacterId, getCharacter, randomFrom } from "../characters";
import { drawCharacter } from "../drawCharacter";
import { sound } from "../sound";
import { MiniGameProps } from "./RobloxRivalsGame";

const W = 800;
const H = 480;
const DURATION = 45;
const TABLE_Y = 342;

type BottleId = "classic" | "sports" | "mini" | "jug" | "golden";

interface BottleSpec {
  id: BottleId;
  name: string;
  emoji: string;
  width: number;
  height: number;
  waterColor: string;
  bodyColor: string;
  labelColor: string;
  capColor: string;
  greenCenter: number; // 0..1 position of green upright zone on bar
  goldCenter: number;  // 0..1 position of gold cap-flip zone on bar
  barSpeed: number;    // gauge oscillation speed
  pointsMult: number;
  desc: string;
}

const GREEN_HALF = 0.085;
const GOLD_HALF = 0.055;

const BOTTLES: BottleSpec[] = [
  {
    id: "classic",
    name: "500ml Water",
    emoji: "💧",
    width: 34,
    height: 82,
    waterColor: "#38bdf8",
    bodyColor: "rgba(224, 242, 254, 0.72)",
    labelColor: "#0284c7",
    capColor: "#0369a1",
    greenCenter: 0.56,
    goldCenter: 0.87,
    barSpeed: 1.25,
    pointsMult: 1.0,
    desc: "Balanced & smooth!",
  },
  {
    id: "sports",
    name: "Neon Hydration",
    emoji: "⚡",
    width: 40,
    height: 86,
    waterColor: "#a3e635",
    bodyColor: "rgba(236, 252, 203, 0.85)",
    labelColor: "#16a34a",
    capColor: "#111827",
    greenCenter: 0.5,
    goldCenter: 0.84,
    barSpeed: 1.4,
    pointsMult: 1.25,
    desc: "Fast sports spin (+25%)",
  },
  {
    id: "mini",
    name: "Mini Bottle",
    emoji: "🍼",
    width: 26,
    height: 58,
    waterColor: "#67e8f9",
    bodyColor: "rgba(207, 250, 254, 0.78)",
    labelColor: "#ec4899",
    capColor: "#be185d",
    greenCenter: 0.44,
    goldCenter: 0.79,
    barSpeed: 1.6,
    pointsMult: 1.5,
    desc: "Tiny & speedy (+50%)",
  },
  {
    id: "jug",
    name: "2L Mega Jug",
    emoji: "🛢️",
    width: 54,
    height: 104,
    waterColor: "#0ea5e9",
    bodyColor: "rgba(186, 230, 253, 0.72)",
    labelColor: "#7c3aed",
    capColor: "#f59e0b",
    greenCenter: 0.62,
    goldCenter: 0.9,
    barSpeed: 1.1,
    pointsMult: 1.75,
    desc: "Heavy slow flip (+75%)",
  },
  {
    id: "golden",
    name: "Golden Bottle",
    emoji: "🏆",
    width: 36,
    height: 86,
    waterColor: "#fef08a",
    bodyColor: "rgba(250, 204, 21, 0.88)",
    labelColor: "#b45309",
    capColor: "#fde047",
    greenCenter: 0.52,
    goldCenter: 0.86,
    barSpeed: 1.55,
    pointsMult: 2.0,
    desc: "Double points! (2x)",
  },
];

const FLIP_SHOUTS = [
  "OHHHHHHH!!",
  "NO WAY YOU LANDED THAT!!",
  "BOTTLE FLIP KING!!",
  "CLIP THAT RIGHT NOW!!",
  "SHEEEEESH!!",
  "DO IT AGAIN!!",
];

const MISS_SHOUTS = [
  "SO CLOSE!!",
  "HAHAHA IT FELL!!",
  "TRY AGAIN BRO!!",
  "ALMOST HAD IT!!",
];

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

export default function BottleFlipGame({
  playerId,
  onFinish,
  onShout,
  onExit,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);

  const [bottleId, setBottleId] = useState<BottleId>("classic");
  const bottleRef = useRef<BottleSpec>(BOTTLES[0]);
  bottleRef.current = BOTTLES.find((b) => b.id === bottleId) ?? BOTTLES[0];

  const [hud, setHud] = useState({
    time: DURATION,
    score: 0,
    landed: 0,
    streak: 0,
    bestStreak: 0,
    banner: "🍾 Hold & Release (Click / Tap / Space) in the GREEN zone to flip the water bottle!",
  });

  const startChargeRef = useRef<() => void>(() => {});
  const releaseFlipRef = useRef<() => void>(() => {});
  const shoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let timeLeft = DURATION;
    let score = 0;
    let landed = 0;
    let streak = 0;
    let bestStreak = 0;
    let shake = 0;
    let chaosAdded = 10;
    let banner = "🍾 Hold & Release in the GREEN sweet spot to land the bottle flip!";
    let hudTick = 0;

    // Bottle physics state
    type Phase = "ready" | "charging" | "flying" | "settled";
    let phase: Phase = "ready";
    let charge = 0; // 0..1 oscillating smoothly while held
    let chargeDir = 1;
    let settleTimer = 0;
    let lastOutcome: "none" | "upright" | "cap" | "miss" = "none";

    const bottle = {
      x: W / 2,
      y: TABLE_Y - bottleRef.current.height / 2,
      angle: 0, // radians, 0 = upright, PI = cap upside-down
      flightElapsed: 0,
      flightDuration: 0.78,
      peakHeight: 190,
      targetAngle: Math.PI * 2,
      plannedOutcome: "miss" as "upright" | "cap" | "miss",
      driftX: 0,
    };

    const confetti: Confetti[] = [];
    const popups: { x: number; y: number; text: string; color: string; life: number }[] = [];
    const speeches: Record<CharacterId, { text: string; timer: number }> = {
      jackb: { text: "WATCH THIS FLIP!!", timer: 2.2 },
      jacky: { text: "", timer: 0 },
      harrison: { text: "", timer: 0 },
      ryan: { text: "", timer: 0 },
      emma: { text: "DO A CAP FLIP!", timer: 2.5 },
    };

    const resetBottle = () => {
      const spec = bottleRef.current;
      phase = "ready";
      charge = 0;
      chargeDir = 1;
      lastOutcome = "none";
      bottle.x = W / 2;
      bottle.y = TABLE_Y - spec.height / 2;
      bottle.angle = 0;
      bottle.flightElapsed = 0;
    };

    const burstConfetti = (x: number, y: number, count = 28) => {
      const colors = ["#fde047", "#38bdf8", "#f43f5e", "#4ade80", "#c084fc", "#fb923c"];
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 90 + Math.random() * 260;
        confetti.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 120,
          color: colors[i % colors.length],
          life: 0.7 + Math.random() * 0.5,
          size: 4 + Math.random() * 5,
        });
      }
    };

    startChargeRef.current = () => {
      if (finishedRef.current) return;
      if (phase === "settled") resetBottle();
      if (phase === "ready") {
        phase = "charging";
        charge = 0.05;
        chargeDir = 1;
      }
    };

    releaseFlipRef.current = () => {
      if (phase !== "charging") return;
      const spec = bottleRef.current;
      phase = "flying";
      bottle.flightElapsed = 0;
      bottle.x = W / 2;
      bottle.y = TABLE_Y - spec.height / 2;
      bottle.angle = 0;
      bottle.driftX = (Math.random() - 0.5) * 28;

      const inGold = Math.abs(charge - spec.goldCenter) <= GOLD_HALF;
      const inGreen = Math.abs(charge - spec.greenCenter) <= GREEN_HALF;

      if (inGold) {
        bottle.plannedOutcome = "cap";
        bottle.targetAngle = Math.PI * 3; // Clean 540° upside-down Cap Flip!
        bottle.peakHeight = 235;
        bottle.flightDuration = 0.88;
      } else if (inGreen) {
        bottle.plannedOutcome = "upright";
        bottle.targetAngle = Math.PI * 2; // Clean 360° upright flip!
        bottle.peakHeight = 195;
        bottle.flightDuration = 0.78;
      } else {
        bottle.plannedOutcome = "miss";
        bottle.peakHeight = 135 + charge * 105;
        bottle.flightDuration = 0.68 + charge * 0.22;
        // Visually land tilted/sideways (never accidentally upright or cap)
        const tilt = charge < spec.greenCenter ? Math.PI * 1.45 : Math.PI * 2.52;
        bottle.targetAngle = tilt;
      }

      sound.bottleWhoosh();
    };

    shoutRef.current = () => {
      const def = getCharacter(playerId);
      sound.shout(def.voicePitch);
      onShout(8);
      chaosAdded += 8;
      shake = 7;
      speeches[playerId] = { text: randomFrom(FLIP_SHOUTS), timer: 1.8 };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        startChargeRef.current();
      }
      if (e.key.toLowerCase() === "e") {
        shoutRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        releaseFlipRef.current();
      }
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
          const stars = landed >= 7 || score >= 900 ? 3 : landed >= 4 || score >= 450 ? 2 : 1;
          onFinish({
            score,
            stars,
            headline: `${getCharacter(playerId).name} landed ${landed} bottle flips (Best Streak x${bestStreak})!`,
            chaosAdded,
          });
          return;
        }
      }

      shake = Math.max(0, shake - dt * 24);
      const spec = bottleRef.current;

      // Update bottle if spec height changed while ready
      if (phase === "ready") {
        bottle.y = TABLE_Y - spec.height / 2;
      }

      if (phase === "charging") {
        charge += chargeDir * dt * spec.barSpeed;
        if (charge >= 1) {
          charge = 1;
          chargeDir = -1;
        } else if (charge <= 0.05) {
          charge = 0.05;
          chargeDir = 1;
        }
        // Slight squash anticipation
        bottle.y = TABLE_Y - spec.height / 2 + charge * 7;
      } else if (phase === "flying") {
        bottle.flightElapsed += dt;
        const t = Math.min(1, bottle.flightElapsed / bottle.flightDuration);
        const bottomY = TABLE_Y - spec.height / 2;
        bottle.x = W / 2 + bottle.driftX * t;
        bottle.y = bottomY - 4 * bottle.peakHeight * t * (1 - t);
        bottle.angle = bottle.targetAngle * t;

        if (t >= 1) {
          bottle.y = bottomY;
          phase = "settled";
          settleTimer = 1.05;

          if (bottle.plannedOutcome === "upright") {
            // LANDED UPRIGHT!!
            bottle.angle = 0;
            lastOutcome = "upright";
            landed += 1;
            streak += 1;
            if (streak > bestStreak) bestStreak = streak;
            const pts = Math.round((100 + streak * 30) * spec.pointsMult);
            score += pts;
            shake = 9;
            chaosAdded += 10;
            sound.bottleThud();
            sound.goal();
            sound.shout(getCharacter(playerId).voicePitch);
            onShout(10);
            burstConfetti(bottle.x, TABLE_Y - 30, 30);
            popups.push({
              x: bottle.x,
              y: TABLE_Y - 105,
              text: `🎉 LANDED!! +${pts} (x${streak}!)`,
              color: "#4ade80",
              life: 1.15,
            });
            banner = `🔥 ${spec.name} LANDED! Streak x${streak}! EVERYONE SCREAMED!!`;
            CHARACTERS.forEach((c) => {
              speeches[c.id] = { text: randomFrom(FLIP_SHOUTS), timer: 1.5 };
            });
          } else if (bottle.plannedOutcome === "cap") {
            // LEGENDARY CAP FLIP!!
            bottle.angle = Math.PI;
            lastOutcome = "cap";
            landed += 1;
            streak += 2;
            if (streak > bestStreak) bestStreak = streak;
            const pts = Math.round(300 * spec.pointsMult);
            score += pts;
            shake = 14;
            chaosAdded += 18;
            sound.bottleThud();
            sound.elim();
            sound.shout(getCharacter(playerId).voicePitch);
            onShout(16);
            burstConfetti(bottle.x, TABLE_Y - 40, 52);
            popups.push({
              x: bottle.x,
              y: TABLE_Y - 115,
              text: `🤯 INSANE CAP FLIP!! +${pts}!!`,
              color: "#fde047",
              life: 1.4,
            });
            banner = `🤯 LEGENDARY CAP FLIP WITH ${spec.name.toUpperCase()}!! +${pts}!!`;
            CHARACTERS.forEach((c) => {
              speeches[c.id] = { text: "CAP FLIP!! NO WAY!!", timer: 1.8 };
            });
          } else {
            // TIPPED OVER!
            bottle.angle = charge < spec.greenCenter ? -Math.PI / 2 : Math.PI / 2;
            bottle.y = TABLE_Y - spec.width / 2;
            lastOutcome = "miss";
            streak = 0;
            sound.bottleThud();
            sound.buzzer();
            popups.push({
              x: bottle.x,
              y: TABLE_Y - 70,
              text: "💦 TIPPED OVER!",
              color: "#f87171",
              life: 0.9,
            });
            banner = "😅 So close! Aim for GREEN (upright) or GOLD (Cap Flip)!";
            const randomKid = randomFrom(CHARACTERS);
            speeches[randomKid.id] = { text: randomFrom(MISS_SHOUTS), timer: 1.3 };
          }
        }
      } else if (phase === "settled") {
        settleTimer -= dt;
        if (settleTimer <= 0) {
          resetBottle();
        }
      }

      // Update confetti & popups & speeches
      for (let i = confetti.length - 1; i >= 0; i--) {
        const cf = confetti[i];
        cf.x += cf.vx * dt;
        cf.y += cf.vy * dt;
        cf.vy += 440 * dt;
        cf.life -= dt;
        if (cf.life <= 0) confetti.splice(i, 1);
      }
      for (let i = popups.length - 1; i >= 0; i--) {
        popups[i].y -= 42 * dt;
        popups[i].life -= dt;
        if (popups[i].life <= 0) popups.splice(i, 1);
      }
      for (const c of CHARACTERS) {
        if (speeches[c.id].timer > 0) {
          speeches[c.id].timer -= dt;
          if (speeches[c.id].timer <= 0) speeches[c.id].text = "";
        }
      }

      // RENDER LIVING ROOM BOTTLE FLIP STAGE!
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      // Bright cozy living room background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1e1b4b");
      bg.addColorStop(0.7, "#312e81");
      bg.addColorStop(1, "#1e1b2e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Spotlight behind bottle table
      const spot = ctx.createRadialGradient(W / 2, 220, 20, W / 2, 240, 240);
      spot.addColorStop(0, "rgba(56, 189, 248, 0.25)");
      spot.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);

      // Spectators! All 5 kids gathered around cheering & screaming!
      const crowdPos = [
        { x: 92, y: 352 },
        { x: 585, y: 348 },
        { x: 668, y: 354 },
        { x: 744, y: 362 },
        { x: 194, y: 364 }, // Emma (shortest) clearly visible up front-left!
      ];
      // Put Emma on the left or right clearly visible
      CHARACTERS.forEach((c, idx) => {
        const pos = crowdPos[idx];
        const hyped = lastOutcome === "upright" || lastOutcome === "cap";
        drawCharacter(ctx, c, {
          x: pos.x,
          y: pos.y,
          scale: 0.98,
          facing: pos.x < W / 2 ? 1 : -1,
          walkPhase: hyped ? now / 65 : 0,
          shouting: hyped || speeches[c.id].timer > 0,
          isPlayer: c.id === playerId,
          speech: speeches[c.id].text || undefined,
        });
      });

      // Living Room Coffee Table (landing platform!)
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 4;
      // Table legs
      ctx.fillRect(285, TABLE_Y + 14, 18, 100);
      ctx.strokeRect(285, TABLE_Y + 14, 18, 100);
      ctx.fillRect(497, TABLE_Y + 14, 18, 100);
      ctx.strokeRect(497, TABLE_Y + 14, 18, 100);
      // Table top
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.roundRect(260, TABLE_Y, 280, 22, 8);
      ctx.fill();
      ctx.stroke();

      // Target landing pad stripe
      ctx.fillStyle =
        lastOutcome === "upright" || lastOutcome === "cap"
          ? "#4ade80"
          : "rgba(255,255,255,0.22)";
      ctx.fillRect(340, TABLE_Y + 2, 120, 5);

      // Draw the Water Bottle!
      drawWaterBottle(ctx, bottle.x, bottle.y, bottle.angle, spec, phase === "charging" ? charge : 0);

      // Power / Flip Gauge (bottom center under table!)
      const barX = 250, barY = 408, barW = 300, barH = 24;
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 10);
      ctx.fill();
      ctx.stroke();

      // Sweet spot indicator (EXACT match with release logic!)
      const greenLeft = barX + (spec.greenCenter - GREEN_HALF) * barW;
      const greenWidth = GREEN_HALF * 2 * barW;
      ctx.fillStyle = "rgba(34, 197, 94, 0.65)";
      ctx.fillRect(greenLeft, barY + 3, greenWidth, barH - 6);

      const goldLeft = barX + (spec.goldCenter - GOLD_HALF) * barW;
      const goldWidth = GOLD_HALF * 2 * barW;
      ctx.fillStyle = "rgba(250, 204, 21, 0.85)";
      ctx.fillRect(goldLeft, barY + 3, goldWidth, barH - 6);

      // Current charge marker
      if (phase === "charging" || charge > 0) {
        const markerX = barX + charge * barW;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(markerX - 3, barY - 4, 6, barH + 8);
      }

      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("GREEN = UPRIGHT FLIP · GOLD = CAP FLIP!", W / 2, barY + 42);

      // Confetti
      for (const cf of confetti) {
        ctx.fillStyle = cf.color;
        ctx.globalAlpha = Math.max(0, cf.life);
        ctx.fillRect(cf.x, cf.y, cf.size, cf.size);
        ctx.globalAlpha = 1;
      }

      // Floating score popups
      for (const p of popups) {
        ctx.font = "900 18px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, p.life * 1.4);
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      hudTick += dt;
      if (hudTick >= 0.1) {
        hudTick = 0;
        setHud({
          time: Math.ceil(timeLeft),
          score,
          landed,
          streak,
          bestStreak,
          banner,
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-600/70 bg-[#0d1f33] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-sky-300">🍾 BOTTLE FLIP</span>
          <span className="rounded-full bg-sky-950 px-3 py-0.5 text-sm font-bold text-yellow-300">
            ⏱ {hud.time}s
          </span>
          <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-sm font-black text-white">
            Landed: {hud.landed}
          </span>
          <span className="rounded-full bg-purple-700 px-3 py-0.5 text-xs font-bold text-white">
            Score: {hud.score}
          </span>
          {hud.streak > 1 && (
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-black">
              🔥 x{hud.streak} STREAK
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shoutRef.current()}
            className="rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black active:scale-95"
          >
            📢 OHHHHH!!
          </button>
          <button
            onClick={onExit}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700"
          >
            Back
          </button>
        </div>
      </div>

      {/* Bottle Picker Bar — switch between 5 different water bottles anytime! */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {BOTTLES.map((b) => {
          const active = b.id === bottleId;
          return (
            <button
              key={b.id}
              onClick={() => {
                setBottleId(b.id);
                sound.ding();
              }}
              className={`rounded-xl border-2 px-2.5 py-2 text-left transition ${
                active
                  ? "border-yellow-400 bg-sky-900/80 shadow-lg"
                  : "border-white/10 bg-[#16162a] hover:border-sky-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{b.emoji}</span>
                <span className="text-[10px] font-black text-yellow-300">{b.pointsMult}x</span>
              </div>
              <div className="text-xs font-black text-white">{b.name}</div>
              <div className="text-[10px] text-gray-300">{b.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-sky-950/70 px-3 py-1.5 text-center text-xs font-bold text-sky-200">
        {hud.banner}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-sky-400/80 bg-black shadow-2xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto block cursor-pointer touch-none select-none"
          onPointerDown={() => startChargeRef.current()}
          onPointerUp={() => releaseFlipRef.current()}
          onPointerCancel={() => releaseFlipRef.current()}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#16162a] p-3">
        <div className="text-xs text-gray-300">
          <strong className="text-sky-300">How to play:</strong> Hold &amp; release on the canvas, the button, or{" "}
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Space</kbd> when the white bar hits{" "}
          <strong className="text-emerald-400">GREEN</strong> (upright) or{" "}
          <strong className="text-yellow-300">GOLD</strong> (legendary cap flip)!
        </div>
        <button
          onPointerDown={() => startChargeRef.current()}
          onPointerUp={() => releaseFlipRef.current()}
          onPointerLeave={() => releaseFlipRef.current()}
          className="rounded-2xl bg-gradient-to-r from-sky-400 to-teal-400 px-6 py-3 text-sm font-black text-black shadow-lg active:scale-95 select-none touch-none"
        >
          🍾 HOLD TO CHARGE → RELEASE TO FLIP!
        </button>
      </div>
    </div>
  );
}

function drawWaterBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  spec: BottleSpec,
  squash: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const scaleY = 1 - squash * 0.1;
  const scaleX = 1 + squash * 0.08;
  ctx.scale(scaleX, scaleY);

  const hw = spec.width / 2;
  const hh = spec.height / 2;
  const neckW = spec.width * 0.42;
  const neckH = spec.height * 0.16;

  // Bottle plastic body
  ctx.fillStyle = spec.bodyColor;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh + neckH, spec.width, spec.height - neckH, 9);
  ctx.fill();
  ctx.stroke();

  // Water inside bottom ~40% (classic bottle-flip water level!)
  const waterH = (spec.height - neckH) * 0.42;
  ctx.fillStyle = spec.waterColor;
  ctx.beginPath();
  ctx.roundRect(-hw + 3, hh - waterH - 2, spec.width - 6, waterH, [2, 2, 7, 7]);
  ctx.fill();

  // Bottle label band across middle
  ctx.fillStyle = spec.labelColor;
  ctx.fillRect(-hw + 1, -4, spec.width - 2, spec.height * 0.22);

  // Shiny highlight stripe
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-hw + 5, -hh + neckH + 6, 5, spec.height - neckH - 14);

  // Bottle neck
  ctx.fillStyle = spec.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-neckW / 2, -hh + 4, neckW, neckH, 3);
  ctx.fill();
  ctx.stroke();

  // Bottle cap on top
  ctx.fillStyle = spec.capColor;
  ctx.beginPath();
  ctx.roundRect(-neckW * 0.62, -hh - 3, neckW * 1.24, 10, 3);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
