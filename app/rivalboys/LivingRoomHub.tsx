"use client";

import React, { useEffect, useRef } from "react";
import {
  ACTIVITIES,
  ActivityId,
  CHARACTERS,
  CharacterId,
  getCharacter,
  randomFrom,
} from "./characters";
import { drawCharacter } from "./drawCharacter";
import { sound } from "./sound";

const W = 800;
const H = 430;

interface HubProps {
  playerId: CharacterId;
  completed: Record<ActivityId, number>;
  onSelectActivity: (id: ActivityId) => void;
  onShout: (amount?: number) => void;
}

interface StationZone {
  id: ActivityId;
  label: string;
  emoji: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const STATIONS: StationZone[] = [
  { id: "roblox", label: "Roblox Rivals TV", emoji: "🎮", x: 38, y: 32, w: 195, h: 105, color: "#7c3aed" },
  { id: "youtube", label: "YouTube & Popcorn", emoji: "🍿", x: 295, y: 32, w: 210, h: 105, color: "#d97706" },
  { id: "sleepover", label: "Sleepover Sofa/Floor", emoji: "🛋️", x: 565, y: 32, w: 198, h: 105, color: "#4f46e5" },
  { id: "football", label: "Backyard Football", emoji: "⚽", x: 38, y: 292, w: 220, h: 105, color: "#15803d" },
  { id: "waterguns", label: "Watergun Yard", emoji: "🔫", x: 540, y: 292, w: 222, h: 105, color: "#0284c7" },
];

/**
 * Interactive animated Living Room & Backyard Hub!
 * All 5 characters (JackB, JackY, Harrison, Ryan & Emma) run around, eat popcorn,
 * squirt waterguns, and scream hilarious speech bubbles.
 * Click any station on the canvas (or use the quick-play cards below) to jump right in!
 */
export default function LivingRoomHub({
  playerId,
  completed,
  onSelectActivity,
  onShout,
}: HubProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const shoutAllRef = useRef<() => void>(() => {});
  const selectRef = useRef(onSelectActivity);
  selectRef.current = onSelectActivity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const actors = CHARACTERS.map((c, i) => ({
      id: c.id,
      x: 200 + i * 100,
      y: 230 + (i % 2) * 35,
      tx: 200 + i * 100,
      ty: 230,
      facing: (i % 2 === 0 ? 1 : -1) as 1 | -1,
      walkPhase: 0,
      holding: (i === 0 ? "controller" : i === 4 ? "popcorn" : i === 2 ? "watergun" : "none") as
        | "none"
        | "watergun"
        | "popcorn"
        | "controller",
      shoutTimer: i === 0 ? 2.4 : 0,
      speech: i === 0 ? "WHAT SHOULD WE PLAY FIRST?!" : "",
      aiTimer: 1.5 + Math.random() * 2,
    }));

    let shake = 0;

    shoutAllRef.current = () => {
      shake = 9;
      onShout(12);
      const pDef = getCharacter(playerId);
      sound.shout(pDef.voicePitch);
      actors.forEach((a) => {
        const def = getCharacter(a.id);
        a.shoutTimer = 2.2;
        a.speech = randomFrom(def.shouts);
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " ") {
        e.preventDefault();
        shoutAllRef.current();
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
      shake = Math.max(0, shake - dt * 24);

      for (const a of actors) {
        if (a.shoutTimer > 0) {
          a.shoutTimer -= dt;
          if (a.shoutTimer <= 0) a.speech = "";
        }

        if (a.id === playerId) {
          let mx = 0, my = 0;
          const k = keysRef.current;
          if (k.has("w") || k.has("arrowup")) my -= 1;
          if (k.has("s") || k.has("arrowdown")) my += 1;
          if (k.has("a") || k.has("arrowleft")) mx -= 1;
          if (k.has("d") || k.has("arrowright")) mx += 1;
          const len = Math.hypot(mx, my);
          if (len > 0) {
            mx /= len;
            my /= len;
            a.x = Math.max(36, Math.min(W - 36, a.x + mx * 210 * dt));
            a.y = Math.max(150, Math.min(H - 24, a.y + my * 210 * dt));
            a.facing = mx >= 0 ? 1 : -1;
            a.walkPhase += dt * 12;
          }
        } else {
          a.aiTimer -= dt;
          if (a.aiTimer <= 0) {
            a.aiTimer = 2 + Math.random() * 2.8;
            a.tx = 110 + Math.random() * (W - 220);
            a.ty = 165 + Math.random() * 140;
            if (Math.random() < 0.45) {
              const def = getCharacter(a.id);
              a.shoutTimer = 2.0;
              a.speech = randomFrom(def.shouts);
            }
          }
          const dx = a.tx - a.x;
          const dy = a.ty - a.y;
          const d = Math.hypot(dx, dy);
          if (d > 8) {
            a.x += (dx / d) * 75 * dt;
            a.y += (dy / d) * 75 * dt;
            a.facing = dx >= 0 ? 1 : -1;
            a.walkPhase += dt * 8;
          }
        }
      }

      // Draw Living Room + Backyard Hub!
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      // Upper Living Room wooden floor
      ctx.fillStyle = "#261f3d";
      ctx.fillRect(0, 0, W, 275);
      // Center plush living room rug
      ctx.fillStyle = "#3b2c63";
      ctx.strokeStyle = "#6d28d9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(140, 158, 520, 102, 16);
      ctx.fill();
      ctx.stroke();

      // Lower Backyard lawn strip
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, 275, W, H - 275);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(0, 270, W, 10);

      // Draw clickable Activity Stations
      for (const st of STATIONS) {
        ctx.fillStyle = st.color;
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(st.x, st.y, st.w, st.h, 14);
        ctx.fill();
        ctx.stroke();

        ctx.font = "28px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(st.emoji, st.x + st.w / 2, st.y + 44);

        ctx.font = "900 13px 'Segoe UI', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(st.label, st.x + st.w / 2, st.y + 70);

        const stars = completed[st.id] ?? 0;
        ctx.font = "bold 11px 'Segoe UI', sans-serif";
        ctx.fillStyle = "#fef08a";
        ctx.fillText(
          stars > 0 ? `${"⭐".repeat(stars)} CLICK TO PLAY` : "▶ CLICK TO PLAY",
          st.x + st.w / 2,
          st.y + 92
        );
      }

      // Big Popcorn Bowl in the center of the rug
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(W / 2 - 18, 200, 36, 22);
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(W / 2 - 7, 198, 6, 0, Math.PI * 2);
      ctx.arc(W / 2 + 7, 198, 6, 0, Math.PI * 2);
      ctx.arc(W / 2, 194, 7, 0, Math.PI * 2);
      ctx.fill();

      // Draw all 5 kids sorted by Y!
      const sorted = [...actors].sort((a, b) => a.y - b.y);
      for (const a of sorted) {
        const def = getCharacter(a.id);
        drawCharacter(ctx, def, {
          x: a.x,
          y: a.y,
          facing: a.facing,
          walkPhase: a.walkPhase,
          shouting: a.shoutTimer > 0,
          holding: a.holding,
          isPlayer: a.id === playerId,
          speech: a.speech || undefined,
        });
      }

      ctx.restore();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [playerId, completed, onShout]);

  const handleCanvasClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    for (const st of STATIONS) {
      if (x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h) {
        sound.ding();
        selectRef.current(st.id);
        return;
      }
    }
    // Clicking anywhere else makes everyone scream & shout!
    shoutAllRef.current();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            🏠 Living Room & Backyard Hub
          </h2>
          <p className="text-xs text-gray-400">
            Click any activity station below (or walk around with WASD!) — hit{" "}
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-yellow-300">Space</kbd> to make everyone SCREAM!
          </p>
        </div>
        <button
          onClick={() => shoutAllRef.current()}
          className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg hover:bg-yellow-300 active:scale-95 transition"
        >
          📢 EVERYONE SCREAM!!
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-purple-600/80 bg-black shadow-2xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={handleCanvasClick}
          className="w-full h-auto block cursor-pointer"
        />
      </div>

      {/* Quick-launch activity cards (super easy for kids & tablets!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ACTIVITIES.map((act) => {
          const stars = completed[act.id] ?? 0;
          return (
            <button
              key={act.id}
              onClick={() => {
                sound.ding();
                onSelectActivity(act.id);
              }}
              className={`group text-left rounded-2xl border border-white/15 bg-gradient-to-br ${act.color} p-3.5 shadow-lg transition hover:-translate-y-1 hover:border-yellow-300`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl">{act.emoji}</span>
                <span className="text-xs font-bold text-yellow-300">
                  {stars > 0 ? "⭐".repeat(stars) : "NEW"}
                </span>
              </div>
              <div className="font-black text-sm text-white">{act.shortTitle}</div>
              <p className="mt-1 text-[11px] leading-snug text-white/80">{act.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
