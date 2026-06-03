"use client";

import { useState, useEffect, useCallback } from "react";
import HangmanDrawing from "./HangmanDrawing";
import { getRandomWordAndCategory, DIFFICULTY_CONFIG, Difficulty } from "./words";

const MAX_WRONG = 6;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

export default function HangmanGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [word, setWord] = useState("");
  const [category, setCategory] = useState("");
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);

  const initGame = useCallback((diff: Difficulty) => {
    const { word: w, category: c } = getRandomWordAndCategory(diff);
    setWord(w);
    setCategory(c);
    setGuessed(new Set());
    setStarted(true);
  }, []);

  const wrongGuesses = ALPHABET.filter((l) => guessed.has(l) && !word.includes(l));
  const wrongCount = wrongGuesses.length;
  const won = word.length > 0 && word.split("").every((l) => guessed.has(l));
  const lost = wrongCount >= MAX_WRONG;
  const gameOver = won || lost;

  function guess(letter: string) {
    if (gameOver || guessed.has(letter)) return;
    setGuessed((prev) => new Set([...prev, letter]));
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const l = e.key.toLowerCase();
      if (/^[a-z]$/.test(l)) guess(l);
    }
    if (started) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  // Difficulty picker screen
  if (!started) {
    return (
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <h1 className="mb-2 text-3xl sm:text-4xl font-extrabold text-white">💀 Hangman</h1>
          <p className="text-gray-400 text-sm sm:text-base">Choose your difficulty to start</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const cfg = DIFFICULTY_CONFIG[d];
            const colors = {
              easy:   "border-green-700 bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700",
              medium: "border-yellow-700 bg-gradient-to-r from-yellow-900 to-yellow-800 hover:from-yellow-800 hover:to-yellow-700",
              hard:   "border-red-700 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700",
            }[d];
            return (
              <button
                key={d}
                onClick={() => {
                  setDifficulty(d);
                  initGame(d);
                }}
                className={`w-full rounded-2xl border ${colors} p-4 sm:p-5 text-left transition-all active:scale-95`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">
                      {cfg.emoji} {cfg.label}
                    </p>
                    <p className="text-sm text-gray-300">{cfg.age}</p>
                  </div>
                  <span className="text-2xl opacity-60">→</span>
                </div>
              </button>
            );
          })}
        </div>

        <a
          href="/"
          className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-6 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
        >
          ← Games
        </a>
      </div>
    );
  }

  const cfg = DIFFICULTY_CONFIG[difficulty];

  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="text-center">
        <h1 className="mb-1 text-3xl sm:text-4xl font-extrabold text-white">💀 Hangman</h1>
        <p className="text-sm text-gray-400">
          {cfg.emoji} {cfg.label} · {cfg.age}
        </p>
      </div>

      {/* Category badge */}
      <div className="rounded-full border border-purple-700 bg-purple-900/30 px-4 py-1 text-sm font-semibold text-purple-300">
        Category: {category}
      </div>

      {/* Status */}
      {gameOver && (
        <div
          className={`rounded-lg px-6 py-2 text-sm font-bold border ${
            won
              ? "bg-green-500/20 text-green-300 border-green-600"
              : "bg-red-500/20 text-red-300 border-red-600"
          }`}
        >
          {won ? "🎉 Well done! You got it!" : `💀 Game over! The word was: ${word.toUpperCase()}`}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-8 w-full max-w-2xl">
        {/* Drawing */}
        <div className="shrink-0">
          <HangmanDrawing wrongCount={wrongCount} />
          <p className="mt-1 text-center text-xs text-gray-500">
            {wrongCount} / {MAX_WRONG} wrong
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          {/* Word display */}
          <div className="flex flex-wrap justify-center gap-2">
            {word.split("").map((letter, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xl sm:text-2xl font-bold text-white min-w-[1.5rem] text-center">
                  {guessed.has(letter) ? letter.toUpperCase() : " "}
                </span>
                <span className="block w-6 h-0.5 bg-gray-400" />
              </div>
            ))}
          </div>

          {/* Wrong letters */}
          <div className="text-sm text-gray-400 text-center min-h-[1.5rem]">
            {wrongGuesses.length > 0 && (
              <>Wrong: {wrongGuesses.map((l) => l.toUpperCase()).join(", ")}</>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard */}
      <div className="w-full max-w-sm sm:max-w-md">
        {["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row) => (
          <div key={row} className="flex justify-center gap-1 sm:gap-1.5 mb-1.5">
            {row.split("").map((letter) => {
              const isGuessed = guessed.has(letter);
              const isWrong = isGuessed && !word.includes(letter);
              const isCorrect = isGuessed && word.includes(letter);
              return (
                <button
                  key={letter}
                  onClick={() => guess(letter)}
                  disabled={isGuessed || gameOver}
                  className={`w-8 h-9 sm:w-10 sm:h-11 rounded-lg text-sm sm:text-base font-bold uppercase transition-colors
                    ${isWrong ? "bg-red-900/60 text-red-400 border border-red-800 cursor-not-allowed" : ""}
                    ${isCorrect ? "bg-green-900/60 text-green-400 border border-green-800 cursor-not-allowed" : ""}
                    ${!isGuessed ? "bg-gray-800 text-white border border-gray-600 hover:bg-purple-800 hover:border-purple-600 active:scale-95" : ""}
                    ${gameOver && !isGuessed ? "opacity-30 cursor-not-allowed" : ""}
                  `}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <button
          onClick={() => initGame(difficulty)}
          className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-purple-500 transition-colors"
        >
          New Word
        </button>
        <button
          onClick={() => setStarted(false)}
          className="rounded-xl border border-gray-600 bg-[#1a1a2e] px-6 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Change Difficulty
        </button>
        <a
          href="/"
          className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-6 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
        >
          ← Games
        </a>
      </div>

      <p className="text-xs text-gray-600">You can also use your keyboard to guess letters</p>
    </div>
  );
}
