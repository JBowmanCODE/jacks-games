"use client";

import React, { useEffect, useRef, useState } from "react";
import { CHARACTERS, CharacterId, getCharacter, randomFrom } from "../characters";
import { drawCharacter } from "../drawCharacter";
import { sound } from "../sound";
import { MiniGameProps } from "./RobloxRivalsGame";

const W = 800;
const H = 480;
const DURATION = 38;

interface PopcornItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "normal" | "golden" | "burnt";
  rot: number;
  size: number;
}

const YT_VIDEOS = [
  { title: "TOP 10 ROBLOX RIVALS FAILS 😂", channel: "RivalBlox TV", views: "4.2M views", color: "#7c3aed" },
  { title: "INSANE BACKYARD GOALS!! ⚽🔥", channel: "TopBinsFC", views: "1.9M views", color: "#15803d" },
  { title: "WATERGUN PRANK GONE WILD 🔫💦", channel: "SplashSquad", views: "6.8M views", color: "#0284c7" },
  { title: "TRY NOT TO LAUGH (IMPOSSIBLE) 😭", channel: "MegaLaughs", views: "9.1M views", color: "#dc2626" },
];

export default function YouTubePopcornGame({
  playerId,
  onFinish,
  onShout,
  onExit,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState({
    time: DURATION,
    eaten: 0,
    hype: 25,
    hypeMoment: false,
    videoTitle: YT_VIDEOS[0].title,
  });

  const shoutReactRef = useRef<() => void>(() => {});
  const clickPopcornRef = useRef<(x: number, y: number) => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let timeLeft = DURATION;
    let eaten = 0;
    let score = 0;
    let hype = 25;
    let hypeMomentTimer = 0;
    let nextHypeIn = 6.5;
    let videoIdx = 0;
    let videoTimer = 9;
    let spawnTimer = 0.4;
    let nextId = 1;
    let shake = 0;
    let chaosAdded = 10;
    let hudTick = 0;

    const kernels: PopcornItem[] = [];
    const popTexts: { x: number; y: number; text: string; color: string; life: number }[] = [];
    const speeches: Record<CharacterId, { text: string; timer: number }> = {
      jackb: { text: "PASS THE POPCORN!", timer: 2.2 },
      jacky: { text: "OHH PUT YOUTUBE ON!", timer: 0 },
      harrison: { text: "", timer: 0 },
      ryan: { text: "", timer: 0 },
      emma: { text: "I GOT THE BIG BOWL!", timer: 2.5 },
    };

    const spawnKernel = () => {
      const r = Math.random();
      const kind: PopcornItem["kind"] = r < 0.14 ? "burnt" : r < 0.34 ? "golden" : "normal";
      kernels.push({
        id: nextId++,
        x: W / 2 + (Math.random() - 0.5) * 70,
        y: 418,
        vx: (Math.random() - 0.5) * 340,
        vy: -(330 + Math.random() * 170),
        kind,
        rot: Math.random() * Math.PI * 2,
        size: kind === "golden" ? 21 : 17,
      });
    };

    clickPopcornRef.current = (cx: number, cy: number) => {
      for (let i = kernels.length - 1; i >= 0; i--) {
        const k = kernels[i];
        if (Math.hypot(cx - k.x, cy - k.y) < k.size + 22) {
          kernels.splice(i, 1);
          if (k.kind === "burnt") {
            score = Math.max(0, score - 25);
            sound.buzzer();
            popTexts.push({ x: k.x, y: k.y, text: "EW BURNT! -25", color: "#f87171", life: 0.9 });
            speeches[playerId] = { text: "BLEURGH BURNT ONE!!", timer: 1.5 };
          } else {
            const pts = k.kind === "golden" ? 45 : 20;
            eaten += 1;
            score += pts;
            hype = Math.min(100, hype + (k.kind === "golden" ? 7 : 3));
            sound.crunch();
            popTexts.push({
              x: k.x,
              y: k.y,
              text: k.kind === "golden" ? "✨ BUTTERED +45!" : "🍿 CRUNCH +20!",
              color: k.kind === "golden" ? "#fde047" : "#fef9c3",
              life: 0.85,
            });
          }
          return;
        }
      }
    };

    shoutReactRef.current = () => {
      const def = getCharacter(playerId);
      sound.shout(def.voicePitch);
      onShout(9);
      chaosAdded += 9;
      shake = 8;
      speeches[playerId] = { text: randomFrom(def.youtubeShouts), timer: 1.8 };
      // Random friend also screams along!
      const friend = randomFrom(CHARACTERS.filter((c) => c.id !== playerId));
      speeches[friend.id] = { text: randomFrom(friend.youtubeShouts), timer: 1.6 };

      if (hypeMomentTimer > 0) {
        score += 55;
        hype = Math.min(100, hype + 14);
        sound.ding();
        popTexts.push({ x: W / 2, y: 140, text: "🔥 HYPE SCREAM +55!", color: "#fde047", life: 0.9 });
      } else {
        score += 10;
        hype = Math.min(100, hype + 4);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        shoutReactRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    let last = performance.now();
    let raf = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!finishedRef.current) {
        timeLeft = Math.max(0, timeLeft - dt);
        if (timeLeft <= 0) {
          finishedRef.current = true;
          const stars = score >= 650 ? 3 : score >= 360 ? 2 : 1;
          onFinish({
            score,
            stars,
            headline: `${getCharacter(playerId).name} munched ${eaten} popcorns & hit ${Math.round(hype)}% YouTube Hype!`,
            chaosAdded,
          });
          return;
        }
      }

      shake = Math.max(0, shake - dt * 22);

      // Cycle YouTube videos
      videoTimer -= dt;
      if (videoTimer <= 0) {
        videoTimer = 9;
        videoIdx = (videoIdx + 1) % YT_VIDEOS.length;
        const randomKid = randomFrom(CHARACTERS);
        speeches[randomKid.id] = { text: randomFrom(randomKid.youtubeShouts), timer: 2.0 };
      }

      // Hype moments
      if (hypeMomentTimer > 0) {
        hypeMomentTimer -= dt;
      } else {
        nextHypeIn -= dt;
        if (nextHypeIn <= 0) {
          hypeMomentTimer = 3.5;
          nextHypeIn = 7 + Math.random() * 3;
          sound.ding();
        }
      }

      // Spawn flying popcorn from the big living room bowl
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = hypeMomentTimer > 0 ? 0.28 : 0.48;
        spawnKernel();
      }

      for (let i = kernels.length - 1; i >= 0; i--) {
        const k = kernels[i];
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        k.vy += 380 * dt; // gravity
        k.rot += dt * 4;
        if (k.y > H + 30) kernels.splice(i, 1);
      }

      for (let i = popTexts.length - 1; i >= 0; i--) {
        popTexts[i].y -= 38 * dt;
        popTexts[i].life -= dt;
        if (popTexts[i].life <= 0) popTexts.splice(i, 1);
      }

      for (const c of CHARACTERS) {
        if (speeches[c.id].timer > 0) {
          speeches[c.id].timer -= dt;
          if (speeches[c.id].timer <= 0) speeches[c.id].text = "";
        }
      }

      // Render Living Room TV + Sofa + Characters eating popcorn!
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      // Cozy living room wall
      ctx.fillStyle = "#1e1b2e";
      ctx.fillRect(0, 0, W, H);
      // Warm living room floor rug
      ctx.fillStyle = "#312e81";
      ctx.fillRect(0, 320, W, H - 320);

      // Big Living Room TV
      const tvX = 165, tvY = 22, tvW = 470, tvH = 212;
      ctx.fillStyle = "#09090b";
      ctx.strokeStyle = hypeMomentTimer > 0 ? "#fde047" : "#475569";
      ctx.lineWidth = hypeMomentTimer > 0 ? 6 : 5;
      ctx.beginPath();
      ctx.roundRect(tvX, tvY, tvW, tvH, 12);
      ctx.fill();
      ctx.stroke();

      // Animated YouTube screen inside TV
      const vid = YT_VIDEOS[videoIdx];
      ctx.fillStyle = vid.color;
      ctx.fillRect(tvX + 10, tvY + 10, tvW - 20, tvH - 52);

      // Silly animated stick/action scene on TV
      const animT = now / 220;
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (let s = 0; s < 5; s++) {
        ctx.beginPath();
        ctx.arc(
          tvX + 70 + ((s * 95 + animT * 35) % (tvW - 100)),
          tvY + 60 + Math.sin(animT + s) * 26,
          16 + (s % 2) * 8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // YouTube Red Logo badge
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.roundRect(tvX + 20, tvY + 20, 88, 24, 6);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 12px 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("▶ YouTube", tvX + 30, tvY + 36);

      // Video Title on screen
      ctx.font = "900 20px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(vid.title, W / 2, tvY + 95 + Math.sin(animT) * 4);
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`${vid.channel} · ${vid.views} · 👍 LIKE & SUBSCRIBE`, W / 2, tvY + 124);

      // Hype moment flash banner inside TV
      if (hypeMomentTimer > 0) {
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.roundRect(tvX + 95, tvY + 136, tvW - 190, 28, 8);
        ctx.fill();
        ctx.fillStyle = "#991b1b";
        ctx.font = "900 14px 'Segoe UI', sans-serif";
        ctx.fillText("📢 HYPE MOMENT! MASH SHOUT / SPACE!!", W / 2, tvY + 155);
      }

      // YouTube red progress bar
      ctx.fillStyle = "#334155";
      ctx.fillRect(tvX + 14, tvY + tvH - 34, tvW - 28, 6);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(tvX + 14, tvY + tvH - 34, ((9 - videoTimer) / 9) * (tvW - 28), 6);

      // Living room sofa silhouette behind the kids
      ctx.fillStyle = "#4c1d95";
      ctx.strokeStyle = "#2e1065";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(70, 272, 660, 112, 22);
      ctx.fill();
      ctx.stroke();

      // Draw all 5 kids watching TV & eating popcorn (all 5 fully visible!)
      const seats = [130, 265, 400, 535, 670];
      CHARACTERS.forEach((c, idx) => {
        drawCharacter(ctx, c, {
          x: seats[idx],
          y: idx === 4 ? 388 : 374, // Emma (shortest) right up front!
          scale: 1.02,
          facing: idx < 2 ? 1 : -1,
          walkPhase: hypeMomentTimer > 0 ? now / 80 : 0,
          shouting: speeches[c.id].timer > 0 || hypeMomentTimer > 0,
          holding: "popcorn",
          isPlayer: c.id === playerId,
          speech: speeches[c.id].text || undefined,
        });
      });

      // Giant Popcorn Bowl on coffee table in front (below everyone's faces!)
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 46, 418);
      ctx.lineTo(W / 2 + 46, 418);
      ctx.lineTo(W / 2 + 34, 468);
      ctx.lineTo(W / 2 - 34, 468);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // White bowl stripes
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(W / 2 - 21, 420, 9, 46);
      ctx.fillRect(W / 2 + 12, 420, 9, 46);
      ctx.font = "900 11px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#fef08a";
      ctx.textAlign = "center";
      ctx.fillText("POPCORN", W / 2, 448);

      // Flying popcorn kernels (clickable!)
      for (const k of kernels) {
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.rot);
        ctx.fillStyle =
          k.kind === "burnt" ? "#27272a" : k.kind === "golden" ? "#facc15" : "#fef08a";
        ctx.strokeStyle = k.kind === "burnt" ? "#ef4444" : "#ca8a04";
        ctx.lineWidth = 2;
        const r = k.size * 0.55;
        ctx.beginPath();
        ctx.arc(-r * 0.5, 0, r * 0.75, 0, Math.PI * 2);
        ctx.arc(r * 0.5, -r * 0.2, r * 0.75, 0, Math.PI * 2);
        ctx.arc(0, -r * 0.65, r * 0.75, 0, Math.PI * 2);
        ctx.arc(0, r * 0.45, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Floating score popups
      for (const pt of popTexts) {
        ctx.font = "900 15px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.min(1, pt.life * 1.5);
        ctx.fillText(pt.text, pt.x, pt.y);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      hudTick += dt;
      if (hudTick >= 0.1) {
        hudTick = 0;
        setHud({
          time: Math.ceil(timeLeft),
          eaten,
          hype: Math.round(hype),
          hypeMoment: hypeMomentTimer > 0,
          videoTitle: YT_VIDEOS[videoIdx].title,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [playerId, onFinish, onShout]);

  const handleTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    clickPopcornRef.current(x, y);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-700/70 bg-[#231810] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-amber-300">🍿 YOUTUBE & POPCORN</span>
          <span className="rounded-full bg-amber-950 px-3 py-0.5 text-sm font-bold text-yellow-300">
            ⏱ {hud.time}s
          </span>
          <span className="rounded-full bg-red-600 px-3 py-0.5 text-sm font-black text-white">
            🍿 Eaten: {hud.eaten}
          </span>
          <span className="rounded-full bg-purple-700 px-3 py-0.5 text-xs font-bold text-white">
            🔥 Hype: {hud.hype}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shoutReactRef.current()}
            className={`rounded-xl px-4 py-1.5 text-xs font-black active:scale-95 transition ${
              hud.hypeMoment
                ? "animate-bounce bg-yellow-400 text-black shadow-lg shadow-yellow-400/50"
                : "bg-red-500 text-white hover:bg-red-400"
            }`}
          >
            📢 SCREAM AT TV!
          </button>
          <button
            onClick={onExit}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700"
          >
            Back
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-amber-500/80 bg-black shadow-2xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto block cursor-pointer touch-none"
          onPointerDown={handleTap}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#16162a] p-3 text-xs text-gray-300">
        <span>
          <strong className="text-amber-300">How to play:</strong> Click or Tap flying popcorn to eat it! Avoid dark burnt kernels! When YouTube flashes <strong>HYPE MOMENT</strong>, mash <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Space</kbd> or <strong>SCREAM AT TV!</strong>
        </span>
      </div>
    </div>
  );
}
