"use client";

import { useState, useEffect, useCallback } from "react";
import { getRandomWord, isValidGuess, DIFF_CONFIG, type Difficulty } from "./words";

type TileState = "correct" | "present" | "absent" | "empty" | "active";

function evaluateGuess(guess: string, target: string): TileState[] {
  const result: TileState[] = Array(target.length).fill("absent");
  const targetArr = target.split("");
  const guessArr  = guess.split("");

  // First pass — correct positions (green)
  const targetUsed = targetArr.map(() => false);
  const guessUsed  = guessArr.map(() => false);
  for (let i = 0; i < target.length; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i]     = "correct";
      targetUsed[i] = true;
      guessUsed[i]  = true;
    }
  }

  // Second pass — wrong position (yellow)
  for (let i = 0; i < target.length; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < target.length; j++) {
      if (!targetUsed[j] && guessArr[i] === targetArr[j]) {
        result[i]     = "present";
        targetUsed[j] = true;
        break;
      }
    }
  }

  return result;
}

function tileStyle(state: TileState, revealed: boolean): string {
  const base = "flex items-center justify-center rounded-lg font-extrabold text-white uppercase select-none transition-all duration-300";
  if (!revealed) {
    if (state === "active")  return `${base} border-2 border-purple-500 bg-[#1a1a2e]`;
    if (state === "empty")   return `${base} border-2 border-gray-700 bg-[#0f0f1a]`;
    return `${base} border-2 border-gray-600 bg-gray-800`; // filled not yet submitted
  }
  if (state === "correct") return `${base} bg-green-700 border-2 border-green-600`;
  if (state === "present") return `${base} bg-yellow-600 border-2 border-yellow-500`;
  return `${base} bg-gray-700 border-2 border-gray-600`;
}

function keyStyle(state: TileState | "unused"): string {
  const base = "rounded-lg font-bold uppercase text-white text-xs sm:text-sm transition-colors active:scale-90 touch-manipulation select-none";
  if (state === "correct") return `${base} bg-green-700`;
  if (state === "present") return `${base} bg-yellow-600`;
  if (state === "absent")  return `${base} bg-gray-700 text-gray-400`;
  return `${base} bg-gray-600 hover:bg-gray-500`;
}

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export default function WordleGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [started,    setStarted]    = useState(false);
  const [target,     setTarget]     = useState("");
  const [guesses,    setGuesses]    = useState<string[]>([]);
  const [states,     setStates]     = useState<TileState[][]>([]);
  const [current,    setCurrent]    = useState("");
  const [won,        setWon]        = useState(false);
  const [lost,       setLost]       = useState(false);
  const [shake,      setShake]      = useState(false);
  const [message,    setMessage]    = useState("");

  const cfg = DIFF_CONFIG[difficulty];

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setTarget(getRandomWord(diff));
    setGuesses([]);
    setStates([]);
    setCurrent("");
    setWon(false);
    setLost(false);
    setMessage("");
    setStarted(true);
  }, []);

  const showMessage = (msg: string, duration = 1800) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), duration);
  };

  const submitGuess = useCallback(() => {
    if (current.length !== cfg.length) {
      setShake(true);
      showMessage(`Word must be ${cfg.length} letters`);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (!isValidGuess(current, difficulty)) {
      setShake(true);
      showMessage("Not in word list");
      setTimeout(() => setShake(false), 500);
      return;
    }

    const result = evaluateGuess(current, target);
    const newGuesses = [...guesses, current];
    const newStates  = [...states, result];
    setGuesses(newGuesses);
    setStates(newStates);
    setCurrent("");

    if (current === target) {
      setWon(true);
      const msgs = ["Genius!", "Magnificent!", "Brilliant!", "Great job!", "Nicely done!", "Phew!"];
      showMessage(msgs[Math.min(newGuesses.length - 1, msgs.length - 1)], 3000);
    } else if (newGuesses.length >= cfg.guesses) {
      setLost(true);
      showMessage(`The word was ${target}`, 5000);
    }
  }, [current, cfg, difficulty, guesses, states, target]);

  // Keyboard input
  useEffect(() => {
    if (!started || won || lost) return;
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const k = e.key;
      if (k === "Enter")     { submitGuess(); return; }
      if (k === "Backspace") { setCurrent((c) => c.slice(0, -1)); return; }
      if (/^[a-zA-Z]$/.test(k) && current.length < cfg.length) {
        setCurrent((c) => c + k.toUpperCase());
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, won, lost, submitGuess, current, cfg.length]);

  // Letter → best known state map for keyboard colouring
  const letterStates = useCallback((): Record<string, TileState | "unused"> => {
    const map: Record<string, TileState | "unused"> = {};
    states.forEach((rowStates, ri) => {
      rowStates.forEach((state, ci) => {
        const letter = guesses[ri][ci];
        const current = map[letter];
        if (!current || current === "unused" || current === "absent" ||
           (current === "present" && state === "correct")) {
          map[letter] = state;
        }
      });
    });
    return map;
  }, [states, guesses]);

  function onKeyPress(key: string) {
    if (won || lost) return;
    if (key === "ENTER") { submitGuess(); return; }
    if (key === "⌫")     { setCurrent((c) => c.slice(0, -1)); return; }
    if (current.length < cfg.length) setCurrent((c) => c + key);
  }

  // ── Difficulty picker ─────────────────────────────────────────────
  if (!started) {
    return (
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <h1 className="mb-2 text-3xl sm:text-4xl font-extrabold text-white">🟩 Wordle</h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Guess the hidden word. Green = right place. Yellow = wrong place. Grey = not in word.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const c = DIFF_CONFIG[d];
            const colors = {
              easy:   "border-green-700 from-green-900 to-green-800 hover:from-green-800 hover:to-green-700",
              medium: "border-yellow-700 from-yellow-900 to-yellow-800 hover:from-yellow-800 hover:to-yellow-700",
              hard:   "border-red-700 from-red-900 to-red-800 hover:from-red-800 hover:to-red-700",
            }[d];
            return (
              <button key={d} onClick={() => startGame(d)}
                className={`w-full rounded-2xl border bg-gradient-to-r ${colors} p-4 text-left transition-all active:scale-95`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">{c.emoji} {c.label} — {c.length} letters</p>
                    <p className="text-sm text-gray-300">{c.age} · {c.guesses} guesses</p>
                  </div>
                  <span className="text-2xl opacity-60">→</span>
                </div>
              </button>
            );
          })}
        </div>
        <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-6 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
          ← Games
        </a>
      </div>
    );
  }

  const lMap = letterStates();
  const tileSize = cfg.length <= 4 ? "w-14 h-14 sm:w-16 sm:h-16 text-2xl"
                 : cfg.length === 5 ? "w-12 h-12 sm:w-14 sm:h-14 text-xl"
                 : "w-10 h-10 sm:w-12 sm:h-12 text-lg";

  return (
    <div className="flex flex-col items-center gap-4 px-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">🟩 Wordle</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {cfg.emoji} {cfg.label} · {cfg.length} letters · {guesses.length}/{cfg.guesses} guesses
        </p>
      </div>

      {/* Toast message */}
      <div className={`h-8 flex items-center justify-center transition-opacity ${message ? "opacity-100" : "opacity-0"}`}>
        <span className={`rounded-lg px-4 py-1 text-sm font-bold ${won ? "bg-green-700/80 text-green-100" : lost ? "bg-red-700/80 text-red-100" : "bg-gray-700 text-white"}`}>
          {message}
        </span>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: cfg.guesses }).map((_, rowIdx) => {
          const isSubmitted = rowIdx < guesses.length;
          const isActive    = rowIdx === guesses.length && !won && !lost;
          const rowWord     = isSubmitted ? guesses[rowIdx]
                            : isActive    ? current.padEnd(cfg.length)
                            : "".padEnd(cfg.length);
          const rowStates   = isSubmitted ? states[rowIdx]
                            : Array(cfg.length).fill(isActive ? "active" : "empty") as TileState[];

          return (
            <div key={rowIdx} className={`flex gap-1.5 ${isActive && shake ? "animate-bounce" : ""}`}>
              {Array.from({ length: cfg.length }).map((_, colIdx) => {
                const letter = rowWord[colIdx] ?? "";
                const state: TileState = isActive && letter && !isSubmitted
                  ? "active"
                  : rowStates[colIdx] ?? "empty";
                return (
                  <div key={colIdx} className={`${tileSize} ${tileStyle(state, isSubmitted)}`}>
                    {letter !== " " ? letter : ""}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* On-screen keyboard */}
      <div className="mt-2 space-y-1.5 w-full max-w-sm sm:max-w-md touch-manipulation">
        {KEYBOARD_ROWS.map((row) => (
          <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
            {row.split("").map((letter) => {
              const upper = letter.toUpperCase();
              const state = lMap[upper] ?? "unused";
              return (
                <button key={letter} onPointerDown={(e) => { e.preventDefault(); onKeyPress(upper); }}
                  className={`${keyStyle(state)} h-10 sm:h-12 flex-1 max-w-[2.5rem]`}>
                  {upper}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex justify-center gap-1 sm:gap-1.5">
          <button onPointerDown={(e) => { e.preventDefault(); onKeyPress("ENTER"); }}
            className="rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs sm:text-sm px-3 h-10 sm:h-12 active:scale-90 touch-manipulation">
            ENTER
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); onKeyPress("⌫"); }}
            className="rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-bold text-base px-4 h-10 sm:h-12 active:scale-90 touch-manipulation">
            ⌫
          </button>
        </div>
      </div>

      {/* Actions after game ends */}
      {(won || lost) && (
        <div className="flex flex-wrap gap-3 justify-center mt-1">
          <button onClick={() => startGame(difficulty)}
            className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-purple-500 active:scale-95 transition-all">
            New Word
          </button>
          <button onClick={() => setStarted(false)}
            className="rounded-xl border border-gray-600 bg-[#1a1a2e] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors">
            Change Difficulty
          </button>
          <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
            ← Games
          </a>
        </div>
      )}
    </div>
  );
}
