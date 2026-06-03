"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generatePuzzle, isBoardComplete, type Board, type Difficulty } from "./sudokuGenerator";

const DIFF_CONFIG = {
  easy:   { label: "Easy",   emoji: "😊", hint: "Age 8+  · Lots of clues",      colors: "border-green-700 from-green-900 to-green-800 hover:from-green-800 hover:to-green-700" },
  medium: { label: "Medium", emoji: "🤔", hint: "Age 10+ · Standard challenge", colors: "border-yellow-700 from-yellow-900 to-yellow-800 hover:from-yellow-800 hover:to-yellow-700" },
  hard:   { label: "Hard",   emoji: "💀", hint: "Age 16+ · Fewer clues",        colors: "border-red-700 from-red-900 to-red-800 hover:from-red-800 hover:to-red-700" },
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function SudokuGame() {
  const [difficulty, setDifficulty]   = useState<Difficulty>("medium");
  const [puzzle,    setPuzzle]        = useState<Board | null>(null);
  const [board,     setBoard]         = useState<Board | null>(null);
  const [solution,  setSolution]      = useState<number[][] | null>(null);
  const [selected,  setSelected]      = useState<[number, number] | null>(null);
  const [errors,    setErrors]        = useState<Set<string>>(new Set());
  const [won,       setWon]           = useState(false);
  const [started,   setStarted]       = useState(false);
  const [timer,     setTimer]         = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback((diff: Difficulty) => {
    const { puzzle: p, solution: s } = generatePuzzle(diff);
    setPuzzle(p);
    setBoard(p.map((row) => [...row]));
    setSolution(s);
    setSelected(null);
    setErrors(new Set());
    setWon(false);
    setTimer(0);
    setDifficulty(diff);
    setStarted(true);
  }, []);

  // Timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!started || won) return;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, won]);

  // Enter a number into the selected cell
  const enterNumber = useCallback((num: number | null) => {
    setBoard((prev) => {
      if (!prev || !puzzle || !solution || !selected) return prev;
      const [r, c] = selected;
      if (puzzle[r][c] !== null) return prev; // given cell
      const next = prev.map((row) => [...row]);
      next[r][c] = num;

      // Update errors
      setErrors((prevErr) => {
        const key = `${r}-${c}`;
        const e = new Set(prevErr);
        if (num !== null && num !== solution[r][c]) e.add(key);
        else e.delete(key);
        return e;
      });

      // Win check
      if (isBoardComplete(next, solution)) setWon(true);
      return next;
    });
  }, [puzzle, solution, selected]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!started || won) return;
      if (e.key >= "1" && e.key <= "9") { enterNumber(parseInt(e.key)); return; }
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { enterNumber(null); return; }
      setSelected((sel) => {
        if (!sel) return sel;
        const [r, c] = sel;
        if (e.key === "ArrowUp"    && r > 0) return [r - 1, c];
        if (e.key === "ArrowDown"  && r < 8) return [r + 1, c];
        if (e.key === "ArrowLeft"  && c > 0) return [r, c - 1];
        if (e.key === "ArrowRight" && c < 8) return [r, c + 1];
        return sel;
      });
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, won, enterNumber]);

  function cellBg(r: number, c: number): string {
    if (!board || !puzzle) return "";
    const isSelected  = selected?.[0] === r && selected?.[1] === c;
    const isError     = errors.has(`${r}-${c}`);
    const selVal      = selected && board[selected[0]][selected[1]];
    const cellVal     = board[r][c];
    const sameNumber  = !isSelected && selVal && cellVal && selVal === cellVal;
    const inGroup     = selected && (
      selected[0] === r ||
      selected[1] === c ||
      (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
       Math.floor(selected[1] / 3) === Math.floor(c / 3))
    );

    if (isSelected)  return "bg-purple-600 text-white";
    if (isError)     return "bg-red-900/70 text-red-300";
    if (sameNumber)  return "bg-purple-800/70 text-white";
    if (inGroup)     return "bg-[#252540] text-white";
    if (puzzle[r][c] !== null) return "bg-[#1e1e38] text-purple-200";
    return "bg-[#16162a] text-white";
  }

  function cellBorder(r: number, c: number): string {
    const t = r % 3 === 0 ? "border-t-2 border-t-purple-500" : "border-t border-t-gray-700/60";
    const l = c % 3 === 0 ? "border-l-2 border-l-purple-500" : "border-l border-l-gray-700/60";
    const b = r === 8     ? "border-b-2 border-b-purple-500" : "";
    const right = c === 8 ? "border-r-2 border-r-purple-500" : "";
    return `${t} ${l} ${b} ${right}`;
  }

  // --- Difficulty picker ---
  if (!started) {
    return (
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <h1 className="mb-2 text-3xl sm:text-4xl font-extrabold text-white">🔢 Sudoku</h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xs mx-auto">
            Fill every row, column, and 3×3 box with the numbers 1–9
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const cfg = DIFF_CONFIG[d];
            return (
              <button
                key={d}
                onClick={() => startGame(d)}
                className={`w-full rounded-2xl border bg-gradient-to-r ${cfg.colors} p-4 sm:p-5 text-left transition-all active:scale-95`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">{cfg.emoji} {cfg.label}</p>
                    <p className="text-sm text-gray-300">{cfg.hint}</p>
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

  if (!board || !puzzle) return null;

  return (
    <div className="flex flex-col items-center gap-5 px-4">
      <div className="text-center">
        <h1 className="mb-1 text-2xl sm:text-3xl font-extrabold text-white">🔢 Sudoku</h1>
        <p className="text-sm text-gray-400">
          {DIFF_CONFIG[difficulty].emoji} {DIFF_CONFIG[difficulty].label} · {formatTime(timer)}
        </p>
      </div>

      {won && (
        <div className="rounded-lg bg-green-500/20 border border-green-600 px-6 py-2 text-sm font-bold text-green-300">
          🎉 Brilliant — puzzle solved in {formatTime(timer)}!
        </div>
      )}

      {/* Board — touch-friendly tap targets */}
      <div className="inline-block rounded-xl overflow-hidden shadow-xl shadow-purple-900/30 touch-manipulation">
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => {
              const isGiven = puzzle[r][c] !== null;
              return (
                <button
                  key={c}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault(); // prevent iOS double-tap zoom
                    if (!won) setSelected([r, c]);
                  }}
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11
                    flex items-center justify-center
                    text-sm sm:text-base font-semibold
                    select-none transition-colors
                    ${cellBg(r, c)}
                    ${cellBorder(r, c)}
                    ${isGiven ? "font-bold" : ""}
                  `}
                >
                  {cell ?? ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Number pad — large touch targets */}
      <div className="flex gap-2 flex-wrap justify-center touch-manipulation">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onPointerDown={(e) => { e.preventDefault(); enterNumber(n); }}
            className="w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl bg-gray-800 text-white font-bold text-lg hover:bg-purple-700 active:scale-90 transition-all border border-gray-700 touch-manipulation"
            style={{ minWidth: "2.75rem", minHeight: "2.75rem" }}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); enterNumber(null); }}
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-gray-800 text-gray-400 font-bold text-base hover:bg-red-900/60 active:scale-90 transition-all border border-gray-700 touch-manipulation"
          style={{ minWidth: "2.75rem", minHeight: "2.75rem" }}
        >
          ✕
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3 mt-1">
        <button
          onClick={() => startGame(difficulty)}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-500 transition-colors"
        >
          New Puzzle
        </button>
        <button
          onClick={() => setStarted(false)}
          className="rounded-xl border border-gray-600 bg-[#1a1a2e] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Change Difficulty
        </button>
        <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
          ← Games
        </a>
      </div>

      <p className="text-xs text-gray-600">Tap a cell then tap a number · Wrong entries show in red</p>
    </div>
  );
}
