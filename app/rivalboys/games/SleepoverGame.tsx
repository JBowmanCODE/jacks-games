"use client";

import React, { useEffect, useRef, useState } from "react";
import { BOYS, CharacterId, getCharacter, randomFrom } from "../characters";
import { drawCharacter, drawSleepingBoy } from "../drawCharacter";
import { sound } from "../sound";
import { MiniGameProps } from "./RobloxRivalsGame";

const W = 800;
const H = 480;
const DURATION = 38;

type BoyActivity = "none" | "popcorn" | "roblox" | "pillow" | "shout";

/**
 * Living Room Sleepover!
 * EXACT arrangement requested:
 * - 2 boys sleeping on the SOFA
 * - 2 boys sleeping on the FLOOR (in sleeping bags on the rug)
 * - Emma (shortest, dark brown bob & fringe) watching with a flashlight & sneaky grin!
 * Gameplay: Sneak popcorn, play secret Roblox, toss pillows & shout while the hallway is dark —
 * then HOLD "PRETEND TO SLEEP!" (or Space) whenever footsteps approach the door!
 */
export default function SleepoverGame({
  playerId,
  onFinish,
  onShout,
  onExit,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);

  // Rotate which 2 boys are on the sofa vs 2 boys on the floor!
  const [sofaOrder, setSofaOrder] = useState<CharacterId[]>([
    "jackb",
    "harrison",
    "jacky",
    "ryan",
  ]);
  const sofaOrderRef = useRef<CharacterId[]>(sofaOrder);
  sofaOrderRef.current = sofaOrder;

  const pretendRef = useRef(false);
  const actionRef = useRef<(kind: BoyActivity) => void>(() => {});

  const [hud, setHud] = useState({
    time: DURATION,
    funPoints: 0,
    hearts: 3,
    doorState: "safe" as "safe" | "warning" | "checking",
    pretending: false,
    status: "🌙 1:00 AM! 2 boys on the sofa, 2 boys on the floor — sneak fun before footsteps come!",
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let timeLeft = DURATION;
    let funPoints = 0;
    let hearts = 3;
    let doorState: "safe" | "warning" | "checking" = "safe";
    let doorTimer = 4.5;
    let caughtCooldown = 0;
    let chaosAdded = 10;
    let shake = 0;
    let status = "🌙 1:00 AM! Sneak Popcorn, Secret Roblox, or Pillow Fight — FREEZE when footsteps come!";
    let hudTick = 0;

    const boyStates: Record<
      string,
      { awakeTimer: number; activity: BoyActivity; speech: string }
    > = {
      jackb: { awakeTimer: 0, activity: "none", speech: "" },
      jacky: { awakeTimer: 0, activity: "none", speech: "" },
      harrison: { awakeTimer: 0, activity: "none", speech: "" },
      ryan: { awakeTimer: 0, activity: "none", speech: "" },
    };
    let emmaSpeech = "SHHH! GO TO SLEEP BOYS!";
    let emmaSpeechTimer = 3;

    actionRef.current = (kind: BoyActivity) => {
      if (pretendRef.current || finishedRef.current) return;
      const order = sofaOrderRef.current;
      // Pick 2 boys to wake up and do the sneaky midnight activity!
      const chosen = [order[Math.floor(Math.random() * 2)], order[2 + Math.floor(Math.random() * 2)]];
      for (const id of chosen) {
        const def = getCharacter(id);
        boyStates[id].awakeTimer = 2.0;
        boyStates[id].activity = kind;
        boyStates[id].speech =
          kind === "popcorn"
            ? "CRUNCHY POPCORN!"
            : kind === "roblox"
            ? "SECRET ROBLOX!!"
            : kind === "pillow"
            ? "PILLOW FIGHT!!"
            : randomFrom(def.sleepShouts);
      }

      if (kind === "popcorn") {
        funPoints += 35;
        sound.crunch();
      } else if (kind === "roblox") {
        funPoints += 45;
        sound.laser();
      } else if (kind === "pillow") {
        funPoints += 40;
        sound.kick();
      } else if (kind === "shout") {
        funPoints += 65;
        chaosAdded += 10;
        shake = 7;
        sound.shout(getCharacter(playerId).voicePitch);
        onShout(10);
      }
      emmaSpeech = kind === "shout" ? "SHHH YOU'LL WAKE EVERYONE!!" : "HEHEHE DON'T GET CAUGHT!";
      emmaSpeechTimer = 2.0;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        if (!pretendRef.current) {
          pretendRef.current = true;
          sound.snore();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        pretendRef.current = false;
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
        if (timeLeft <= 0 || hearts <= 0) {
          finishedRef.current = true;
          const stars = hearts === 3 && funPoints >= 350 ? 3 : hearts >= 2 && funPoints >= 180 ? 2 : 1;
          onFinish({
            score: funPoints + hearts * 100,
            stars,
            headline:
              hearts > 0
                ? `Survived the 2 AM Sleepover with ${funPoints} Midnight Fun points!`
                : `Caught awake at 1:30 AM! "WE WERE ASLEEP!!"`,
            chaosAdded,
          });
          return;
        }
      }

      shake = Math.max(0, shake - dt * 20);
      if (caughtCooldown > 0) caughtCooldown -= dt;
      if (emmaSpeechTimer > 0) {
        emmaSpeechTimer -= dt;
        if (emmaSpeechTimer <= 0) emmaSpeech = "";
      }

      // If player holds PRETEND TO SLEEP, snap all 4 boys peacefully asleep immediately!
      for (const b of BOYS) {
        const st = boyStates[b.id];
        if (pretendRef.current) {
          st.awakeTimer = 0;
          st.activity = "none";
          st.speech = "";
        } else if (st.awakeTimer > 0) {
          st.awakeTimer -= dt;
          if (st.awakeTimer <= 0) {
            st.activity = "none";
            st.speech = "";
          }
        }
      }

      // Hallway parent check cycle
      doorTimer -= dt;
      if (doorTimer <= 0) {
        if (doorState === "safe") {
          doorState = "warning";
          doorTimer = 1.85;
          sound.footsteps();
          status = "👣 FOOTSTEPS IN THE HALLWAY!! HOLD 'PRETEND TO SLEEP' NOW!!";
          emmaSpeech = "SHHH!! SOMEONE'S COMING!!";
          emmaSpeechTimer = 2.0;
        } else if (doorState === "warning") {
          doorState = "checking";
          doorTimer = 2.1;
          status = "🚪 DOOR OPENED!! STAY ASLEEP ON THE SOFA & FLOOR (Zzz...)!";
        } else {
          doorState = "safe";
          doorTimer = 3.6 + Math.random() * 2.2;
          status = "✅ Coast is clear! Sneak popcorn, Roblox, or pillows!";
          if (pretendRef.current) {
            funPoints += 50;
            sound.ding();
          }
        }
      }

      // Check if caught awake while door is open!
      if (doorState === "checking" && caughtCooldown <= 0) {
        const anyAwake = BOYS.some((b) => boyStates[b.id].awakeTimer > 0);
        if (anyAwake || !pretendRef.current) {
          // If nobody is awake AND not pressing hold, only catch if someone IS visibly awake!
          if (anyAwake) {
            hearts -= 1;
            caughtCooldown = 2.5;
            shake = 14;
            sound.buzzer();
            status = "😱 CAUGHT AWAKE!! 'WE WERE ASLEEP, PROMISE!!' (-1 ❤️)";
            for (const b of BOYS) {
              boyStates[b.id].speech = "WE WERE ASLEEP!!";
              boyStates[b.id].awakeTimer = 0.8;
            }
          }
        }
      }

      // Render Cozy Nighttime Living Room!
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      // Dark cozy living room wall
      ctx.fillStyle = "#0f1024";
      ctx.fillRect(0, 0, W, H);

      // Moonlit living room window (left wall)
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.fillRect(36, 28, 125, 95);
      ctx.strokeRect(36, 28, 125, 95);
      // Crescent moon & stars
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(82, 66, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(89, 62, 14, 0, Math.PI * 2);
      ctx.fill();
      // Window crossbars
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(98, 28);
      ctx.lineTo(98, 123);
      ctx.moveTo(36, 75);
      ctx.lineTo(161, 75);
      ctx.stroke();

      // Living Room TV (dim night screensaver glow)
      ctx.fillStyle = "#09090b";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(225, 22, 230, 102, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#172554";
      ctx.fillRect(233, 30, 214, 86);
      ctx.fillStyle = "rgba(147, 197, 253, 0.7)";
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🌙 1:42 AM · SLEEP MODE", 340, 68);
      ctx.fillStyle = "rgba(147, 197, 253, 0.45)";
      ctx.font = "11px 'Segoe UI', sans-serif";
      ctx.fillText("YouTube paused · Roblox Rivals standby", 340, 88);

      // Hallway Door (top right — glows amber on warning, bright light beam when checking!)
      const doorX = 635, doorY = 20, doorW = 115, doorH = 148;
      ctx.fillStyle =
        doorState === "checking"
          ? "#fef08a"
          : doorState === "warning"
          ? "#92400e"
          : "#27273a";
      ctx.strokeStyle =
        doorState === "checking"
          ? "#facc15"
          : doorState === "warning"
          ? "#f59e0b"
          : "#475569";
      ctx.lineWidth = 4;
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.strokeRect(doorX, doorY, doorW, doorH);

      ctx.fillStyle = doorState === "checking" ? "#78350f" : "#e2e8f0";
      ctx.font = "900 12px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        doorState === "checking"
          ? "👀 CHECKING!!"
          : doorState === "warning"
          ? "👣 FOOTSTEPS!"
          : "🚪 HALLWAY",
        doorX + doorW / 2,
        doorY + 78
      );

      // Floor & big living room rug
      ctx.fillStyle = "#1e1b2e";
      ctx.fillRect(0, 168, W, H - 168);
      ctx.fillStyle = "#312e81";
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(65, 310, 560, 150, 18);
      ctx.fill();
      ctx.stroke();

      // Label for Floor Sleeping Area
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#a5b4fc";
      ctx.textAlign = "left";
      ctx.fillText("🛏️ LIVING ROOM FLOOR (2 BOYS)", 82, 330);

      // BIG LIVING ROOM SOFA (holds EXACTLY 2 boys!)
      const sofaX = 75, sofaY = 175, sofaW = 520, sofaH = 118;
      ctx.fillStyle = "#4c1d95";
      ctx.strokeStyle = "#2e1065";
      ctx.lineWidth = 4;
      // Backrest
      ctx.beginPath();
      ctx.roundRect(sofaX, sofaY, sofaW, 56, 16);
      ctx.fill();
      ctx.stroke();
      // Seat cushions
      ctx.fillStyle = "#5b21b6";
      ctx.beginPath();
      ctx.roundRect(sofaX + 18, sofaY + 42, sofaW - 36, 70, 14);
      ctx.fill();
      ctx.stroke();
      // Armrests
      ctx.fillStyle = "#3b0764";
      ctx.beginPath();
      ctx.roundRect(sofaX - 10, sofaY + 26, 30, 86, 12);
      ctx.roundRect(sofaX + sofaW - 20, sofaY + 26, 30, 86, 12);
      ctx.fill();
      ctx.stroke();

      // Label for Sofa Sleeping Area
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#ddd6fe";
      ctx.textAlign = "left";
      ctx.fillText("🛋️ LIVING ROOM SOFA (2 BOYS)", sofaX + 26, sofaY + 22);

      // Draw the 4 boys: 2 on the SOFA, 2 on the FLOOR!
      const order = sofaOrderRef.current;
      const sofaBoys = [order[0], order[1]];
      const floorBoys = [order[2], order[3]];
      const snorePhase = now / 420;

      const blanketColors: Record<string, string> = {
        jackb: "#dc2626",
        jacky: "#16a34a",
        harrison: "#0284c7",
        ryan: "#9333ea",
      };

      // 2 Boys on Sofa
      sofaBoys.forEach((id, i) => {
        const c = getCharacter(id);
        const st = boyStates[id];
        drawSleepingBoy(ctx, c, {
          x: 205 + i * 245,
          y: 252,
          blanketColor: blanketColors[id] ?? "#6366f1",
          awake: st.awakeTimer > 0,
          activity: st.activity,
          snorePhase: snorePhase + i * 1.4,
          speech: st.speech || undefined,
        });
      });

      // 2 Boys on Floor (in cozy sleeping bags!)
      floorBoys.forEach((id, i) => {
        const c = getCharacter(id);
        const st = boyStates[id];
        // Sleeping mat underneath
        ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
        ctx.beginPath();
        ctx.roundRect(142 + i * 265, 362, 152, 54, 14);
        ctx.fill();

        drawSleepingBoy(ctx, c, {
          x: 210 + i * 265,
          y: 388,
          blanketColor: blanketColors[id] ?? "#0ea5e9",
          awake: st.awakeTimer > 0,
          activity: st.activity,
          snorePhase: snorePhase + 2.5 + i * 1.3,
          speech: st.speech || undefined,
        });
      });

      // Empty popcorn bowl & watergun left on floor for living-room detail!
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(36, 422, 34, 24);
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(48, 420, 4, 0, Math.PI * 2);
      ctx.arc(58, 419, 4, 0, Math.PI * 2);
      ctx.fill();

      // Emma (shortest, dark brown bob & fringe!) hanging out on her beanbag keeping watch!
      ctx.fillStyle = "#be185d";
      ctx.strokeStyle = "#831843";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(700, 395, 44, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const emmaDef = getCharacter("emma");
      drawCharacter(ctx, emmaDef, {
        x: 700,
        y: 386,
        scale: 1.05,
        facing: -1,
        walkPhase: 0,
        shouting: doorState === "warning",
        holding: pretendRef.current ? "none" : "popcorn",
        isPlayer: playerId === "emma",
        speech: emmaSpeech || undefined,
      });

      // Hallway flashlight beam across room when checking!
      if (doorState === "checking") {
        const grad = ctx.createLinearGradient(doorX + 30, doorY + 140, 220, 430);
        grad.addColorStop(0, "rgba(254, 240, 138, 0.45)");
        grad.addColorStop(1, "rgba(254, 240, 138, 0.04)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(doorX, doorY + doorH);
        ctx.lineTo(doorX + doorW, doorY + doorH);
        ctx.lineTo(440, H);
        ctx.lineTo(80, H);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      hudTick += dt;
      if (hudTick >= 0.1) {
        hudTick = 0;
        setHud({
          time: Math.ceil(timeLeft),
          funPoints,
          hearts,
          doorState,
          pretending: pretendRef.current,
          status,
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

  const swapSofaFloor = () => {
    setSofaOrder((prev) => [prev[2], prev[3], prev[0], prev[1]]);
    sound.ding();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-600/70 bg-[#12122b] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-indigo-300">🛋️ LIVING ROOM SLEEPOVER</span>
          <span className="rounded-full bg-indigo-950 px-3 py-0.5 text-sm font-bold text-yellow-300">
            ⏱ {hud.time}s
          </span>
          <span className="rounded-full bg-purple-700 px-3 py-0.5 text-sm font-black text-white">
            🎉 Fun: {hud.funPoints}
          </span>
          <span className="text-sm">{"❤️".repeat(Math.max(0, hud.hearts))}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={swapSofaFloor}
            className="rounded-xl bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-600"
          >
            🔄 Swap Sofa / Floor
          </button>
          <button
            onClick={onExit}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700"
          >
            Back
          </button>
        </div>
      </div>

      <div
        className={`rounded-xl px-3 py-2 text-center text-xs font-black transition-colors ${
          hud.doorState === "checking"
            ? "bg-red-600 text-white animate-pulse"
            : hud.doorState === "warning"
            ? "bg-amber-500 text-black animate-bounce"
            : "bg-indigo-950/80 text-indigo-200"
        }`}
      >
        {hud.status}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-indigo-500/80 bg-black shadow-2xl">
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto block" />
      </div>

      {/* Action buttons for midnight chaos + giant PRETEND TO SLEEP hold button */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => actionRef.current("popcorn")}
          disabled={hud.pretending}
          className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black text-black hover:bg-amber-400 active:scale-95 disabled:opacity-40"
        >
          🍿 Sneak Popcorn (+35)
        </button>
        <button
          onClick={() => actionRef.current("roblox")}
          disabled={hud.pretending}
          className="rounded-xl bg-purple-600 px-3 py-3 text-xs font-black text-white hover:bg-purple-500 active:scale-95 disabled:opacity-40"
        >
          🎮 Secret Roblox (+45)
        </button>
        <button
          onClick={() => actionRef.current("pillow")}
          disabled={hud.pretending}
          className="rounded-xl bg-sky-500 px-3 py-3 text-xs font-black text-black hover:bg-sky-400 active:scale-95 disabled:opacity-40"
        >
          🛏️ Pillow Fight (+40)
        </button>
        <button
          onClick={() => actionRef.current("shout")}
          disabled={hud.pretending}
          className="rounded-xl bg-rose-500 px-3 py-3 text-xs font-black text-white hover:bg-rose-400 active:scale-95 disabled:opacity-40"
        >
          📢 Loud Shout (+65)
        </button>
        <button
          onPointerDown={() => {
            pretendRef.current = true;
            sound.snore();
          }}
          onPointerUp={() => {
            pretendRef.current = false;
          }}
          onPointerLeave={() => {
            pretendRef.current = false;
          }}
          className={`col-span-2 sm:col-span-1 rounded-xl px-3 py-3 text-xs font-black transition select-none touch-none ${
            hud.pretending
              ? "bg-emerald-400 text-black scale-95 ring-4 ring-emerald-300"
              : "bg-indigo-500 text-white hover:bg-indigo-400"
          }`}
        >
          {hud.pretending ? "💤 SNORING Zzz..." : "💤 HOLD: PRETEND TO SLEEP (Space)"}
        </button>
      </div>
    </div>
  );
}
