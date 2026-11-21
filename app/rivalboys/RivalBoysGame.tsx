"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import {
  ACTIVITIES,
  ActivityId,
  CHARACTERS,
  CharacterId,
  getCharacter,
  randomFrom,
} from "./characters";
import CharacterPortrait from "./CharacterPortrait";
import LivingRoomHub from "./LivingRoomHub";
import RobloxRivalsGame from "./games/RobloxRivalsGame";
import FootballGame from "./games/FootballGame";
import YouTubePopcornGame from "./games/YouTubePopcornGame";
import WatergunGame from "./games/WatergunGame";
import BottleFlipGame from "./games/BottleFlipGame";
import SleepoverGame from "./games/SleepoverGame";
import { sound } from "./sound";

type Screen =
  | { type: "select" }
  | { type: "hub" }
  | { type: "activity"; id: ActivityId }
  | {
      type: "roundResult";
      id: ActivityId;
      score: number;
      stars: number;
      headline: string;
    }
  | { type: "finale" };

const STORY_ORDER: ActivityId[] = [
  "roblox",
  "football",
  "youtube",
  "waterguns",
  "bottleflip",
  "sleepover",
];

export default function RivalBoysGame() {
  const [playerId, setPlayerId] = useState<CharacterId>("jackb");
  const [screen, setScreen] = useState<Screen>({ type: "select" });
  const [storyMode, setStoryMode] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [chaos, setChaos] = useState(20);
  const [muted, setMuted] = useState(false);
  const [previewShout, setPreviewShout] = useState<{ id: CharacterId; text: string } | null>(null);
  const [completed, setCompleted] = useState<Record<ActivityId, number>>({
    roblox: 0,
    football: 0,
    youtube: 0,
    waterguns: 0,
    bottleflip: 0,
    sleepover: 0,
  });

  const player = getCharacter(playerId);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sound.muted = next;
  };

  const handleShout = useCallback((amount = 8) => {
    setChaos((prev) => Math.min(200, prev + amount));
  }, []);

  const triggerPreviewShout = (id: CharacterId) => {
    const c = getCharacter(id);
    sound.shout(c.voicePitch);
    setPreviewShout({ id, text: randomFrom(c.shouts) });
    setTimeout(() => {
      setPreviewShout((cur) => (cur?.id === id ? null : cur));
    }, 1600);
  };

  const handleFinishActivity = useCallback(
    (
      id: ActivityId,
      result: { score: number; stars: number; headline: string; chaosAdded: number }
    ) => {
      setTotalScore((s) => s + result.score);
      setChaos((c) => Math.min(200, c + result.chaosAdded));
      setCompleted((prev) => ({
        ...prev,
        [id]: Math.max(prev[id] ?? 0, result.stars),
      }));
      sound.goal();
      setScreen({
        type: "roundResult",
        id,
        score: result.score,
        stars: result.stars,
        headline: result.headline,
      });
    },
    []
  );

  const totalStars = Object.values(completed).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* Persistent Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-700/80 bg-[#17162c] px-4 py-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 p-1">
            <CharacterPortrait
              character={player}
              size={44}
              expression={previewShout?.id === player.id ? "shouting" : "happy"}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                RIVAL BOYS
              </h1>
              <span className="rounded-full bg-yellow-400/20 border border-yellow-400/40 px-2 py-0.5 text-[11px] font-bold text-yellow-300">
                Playing as {player.name}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
              <span>🏆 Score: <strong className="text-white">{totalScore}</strong></span>
              <span>⭐ Stars: <strong className="text-yellow-300">{totalStars}/18</strong></span>
              <span>
                🔊 Noise:{" "}
                <strong className={chaos >= 100 ? "text-red-400" : "text-cyan-300"}>
                  {chaos}%
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {screen.type !== "select" && (
            <button
              onClick={() => setScreen({ type: "hub" })}
              className="rounded-xl bg-purple-700/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-600"
            >
              🏠 Hub
            </button>
          )}
          {screen.type !== "select" && (
            <button
              onClick={() => setScreen({ type: "select" })}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-slate-700"
            >
              👥 Characters
            </button>
          )}
          <button
            onClick={toggleMute}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-slate-700"
          >
            {muted ? "🔇 Muted" : "🔊 Sound On"}
          </button>
          <Link
            href="/"
            className="rounded-xl border border-purple-700/70 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-900/40"
          >
            ← All Games
          </Link>
        </div>
      </div>

      {/* SCREEN 1: CHARACTER SELECT & TITLE */}
      {screen.type === "select" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-purple-600/60 bg-gradient-to-br from-[#231647] via-[#1a1536] to-[#12162e] p-6 text-center shadow-2xl">
            <div className="inline-block rounded-full bg-yellow-400/20 px-4 py-1 text-xs font-black uppercase tracking-widest text-yellow-300 mb-2">
              🎮 Roblox Rivals · ⚽ Football · 🍿 YouTube · 🔫 Waterguns · 🍾 Bottle Flip · 🛋️ Sleepover
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              RIVAL <span className="text-yellow-400">BOYS</span>
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-base text-gray-300">
              Pick your character! Hang out with <strong>JackB</strong>, <strong>JackY</strong>,{" "}
              <strong>Harrison</strong>, <strong>Ryan</strong> &amp; <strong>Emma</strong> (the shortest!).
              Play Roblox Rivals, kick goals, eat popcorn watching YouTube, soak each other with waterguns,
              scream &amp; shout a lot, and survive the living room sleepover (2 boys on the sofa, 2 boys on the floor)!
            </p>

            {/* Full 5-Character Height-Accurate Lineup */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CHARACTERS.map((c) => {
                const selected = c.id === playerId;
                const shouting = previewShout?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setPlayerId(c.id);
                      triggerPreviewShout(c.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setPlayerId(c.id);
                        triggerPreviewShout(c.id);
                      }
                    }}
                    className={`relative cursor-pointer rounded-2xl border-2 p-3 transition flex flex-col items-center justify-end ${
                      selected
                        ? "border-yellow-400 bg-white/15 scale-[1.03] shadow-xl shadow-yellow-400/20"
                        : "border-white/15 bg-black/25 hover:border-purple-400 hover:bg-white/10"
                    }`}
                  >
                    {shouting && previewShout && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border-2 border-red-600 bg-yellow-300 px-2 py-0.5 text-[11px] font-black text-red-900 shadow-lg z-10">
                        {previewShout.text}
                      </div>
                    )}
                    {selected && (
                      <span className="absolute top-2 right-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-black">
                        PICKED
                      </span>
                    )}
                    <div className="h-[118px] flex items-end justify-center">
                      <CharacterPortrait
                        character={c}
                        size={92}
                        showFullHeight
                        expression={shouting ? "shouting" : selected ? "hyped" : "happy"}
                      />
                    </div>
                    <div className="mt-2 font-black text-base text-white">{c.name}</div>
                    <div className="text-[11px] font-bold text-yellow-300">{c.tagline}</div>
                    <div className="mt-0.5 text-[10px] text-gray-300">{c.appearanceNote}</div>
                  </div>
                );
              })}
            </div>

            {/* Play Mode Buttons */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setStoryMode(true);
                  sound.shout(player.voicePitch);
                  setScreen({ type: "activity", id: "roblox" });
                }}
                className="rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 px-7 py-3.5 text-base font-black text-black shadow-xl hover:brightness-110 active:scale-95 transition"
              >
                🎉 Start Full Sleepover Day → Night!
              </button>
              <button
                onClick={() => {
                  setStoryMode(false);
                  sound.ding();
                  setScreen({ type: "hub" });
                }}
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5 text-base font-black text-white shadow-xl hover:brightness-110 active:scale-95 transition"
              >
                🏠 Jump into Living Room Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 2: LIVING ROOM & BACKYARD HUB */}
      {screen.type === "hub" && (
        <LivingRoomHub
          playerId={playerId}
          completed={completed}
          onSelectActivity={(id) => {
            setStoryMode(false);
            setScreen({ type: "activity", id });
          }}
          onShout={handleShout}
        />
      )}

      {/* SCREEN 3: PLAYABLE MINI-GAMES */}
      {screen.type === "activity" && screen.id === "roblox" && (
        <RobloxRivalsGame
          playerId={playerId}
          onFinish={(res) => handleFinishActivity("roblox", res)}
          onShout={handleShout}
          onExit={() => setScreen({ type: "hub" })}
        />
      )}
      {screen.type === "activity" && screen.id === "football" && (
        <FootballGame
          playerId={playerId}
          onFinish={(res) => handleFinishActivity("football", res)}
          onShout={handleShout}
          onExit={() => setScreen({ type: "hub" })}
        />
      )}
      {screen.type === "activity" && screen.id === "youtube" && (
        <YouTubePopcornGame
          playerId={playerId}
          onFinish={(res) => handleFinishActivity("youtube", res)}
          onShout={handleShout}
          onExit={() => setScreen({ type: "hub" })}
        />
      )}
      {screen.type === "activity" && screen.id === "waterguns" && (
        <WatergunGame
          playerId={playerId}
          onFinish={(res) => handleFinishActivity("waterguns", res)}
          onShout={handleShout}
          onExit={() => setScreen({ type: "hub" })}
        />
      )}
      {screen.type === "activity" && screen.id === "bottleflip" && (
        <BottleFlipGame
          playerId={playerId}
          onFinish={(res) => handleFinishActivity("bottleflip", res)}
          onShout={handleShout}
          onExit={() => setScreen({ type: "hub" })}
        />
      )}
      {screen.type === "activity" && screen.id === "sleepover" && (
        <SleepoverGame
          playerId={playerId}
          onFinish={(res) => handleFinishActivity("sleepover", res)}
          onShout={handleShout}
          onExit={() => setScreen({ type: "hub" })}
        />
      )}

      {/* SCREEN 4: ROUND RESULT */}
      {screen.type === "roundResult" && (
        <div className="mx-auto max-w-xl rounded-3xl border-2 border-yellow-400/70 bg-gradient-to-b from-[#231942] to-[#131224] p-7 text-center shadow-2xl space-y-4">
          <div className="flex justify-center">
            <CharacterPortrait character={player} size={104} expression="hyped" />
          </div>
          <div className="text-4xl">{"⭐".repeat(screen.stars)}{"☆".repeat(3 - screen.stars)}</div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {ACTIVITIES.find((a) => a.id === screen.id)?.title} Complete!
          </h2>
          <p className="text-base font-bold text-yellow-300">{screen.headline}</p>
          <div className="inline-block rounded-2xl bg-black/35 px-5 py-2 text-lg font-black text-emerald-300">
            +{screen.score} Points!
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {storyMode && (() => {
              const idx = STORY_ORDER.indexOf(screen.id);
              const nextId = STORY_ORDER[idx + 1];
              if (nextId) {
                const nextMeta = ACTIVITIES.find((a) => a.id === nextId);
                return (
                  <button
                    onClick={() => setScreen({ type: "activity", id: nextId })}
                    className="rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-3 text-sm font-black text-black hover:brightness-110 active:scale-95"
                  >
                    Next: {nextMeta?.emoji} {nextMeta?.title} →
                  </button>
                );
              }
              return (
                <button
                  onClick={() => setScreen({ type: "finale" })}
                  className="rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-3 text-sm font-black text-black hover:brightness-110 active:scale-95"
                >
                  🏆 See Sleepover Trophy! →
                </button>
              );
            })()}
            <button
              onClick={() => setScreen({ type: "activity", id: screen.id })}
              className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white hover:bg-purple-500"
            >
              🔁 Play Again
            </button>
            <button
              onClick={() => setScreen({ type: "hub" })}
              className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-bold text-gray-200 hover:bg-slate-700"
            >
              🏠 Living Room Hub
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 5: FULL SLEEPOVER FINALE */}
      {screen.type === "finale" && (
        <div className="mx-auto max-w-2xl rounded-3xl border-2 border-yellow-400 bg-gradient-to-b from-[#2a174f] to-[#121226] p-7 text-center shadow-2xl space-y-5">
          <div className="text-5xl">🏆🌙🛋️</div>
          <h2 className="text-3xl sm:text-4xl font-black text-yellow-300">
            ULTIMATE RIVAL BOYS SLEEPOVER CHAMPIONS!
          </h2>
          <p className="text-sm sm:text-base text-gray-200">
            JackB, JackY, Harrison, Ryan &amp; Emma crushed Roblox Rivals, scored backyard screamers,
            devoured the popcorn watching YouTube, drenched each other with waterguns, shouted at{" "}
            <strong className="text-yellow-300">{chaos}% volume</strong>, and finally crashed out in the
            living room (2 boys on the sofa, 2 boys on the floor)!
          </p>
          <div className="flex justify-center items-end gap-2 py-2">
            {CHARACTERS.map((c) => (
              <div key={c.id} className="flex flex-col items-center">
                <CharacterPortrait character={c} size={68} showFullHeight expression="hyped" />
                <span className="text-xs font-bold text-white">{c.name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="rounded-2xl bg-black/40 p-3">
              <div className="text-xs text-gray-400">TOTAL SCORE</div>
              <div className="text-2xl font-black text-emerald-300">{totalScore}</div>
            </div>
            <div className="rounded-2xl bg-black/40 p-3">
              <div className="text-xs text-gray-400">STARS EARNED</div>
              <div className="text-2xl font-black text-yellow-300">{totalStars} / 18 ⭐</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setScreen({ type: "hub" })}
              className="rounded-2xl bg-yellow-400 px-6 py-3 text-sm font-black text-black hover:bg-yellow-300"
            >
              🏠 Back to Living Room Hub
            </button>
            <button
              onClick={() => setScreen({ type: "select" })}
              className="rounded-2xl bg-purple-600 px-6 py-3 text-sm font-black text-white hover:bg-purple-500"
            >
              👥 Pick Another Character
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
