"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getRandomQuestions, shuffleAnswers, type Question } from "./questions";

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 15;

type AnswerState = "unanswered" | "correct" | "wrong";

const CATEGORY_COLORS: Record<string, string> = {
  "Finishing Moves":  "bg-red-900/50 text-red-300 border-red-800",
  "Catchphrases":     "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  "Nicknames":        "bg-blue-900/50 text-blue-300 border-blue-800",
  "Tag Teams":        "bg-green-900/50 text-green-300 border-green-800",
  "Real Names":       "bg-purple-900/50 text-purple-300 border-purple-800",
  "Championships":    "bg-orange-900/50 text-orange-300 border-orange-800",
  "Origins":          "bg-teal-900/50 text-teal-300 border-teal-800",
};

function getVerdict(score: number) {
  if (score === 10) return { text: "PERFECT! You're a wrestling legend! 🏆", color: "text-yellow-300" };
  if (score >= 8)  return { text: "Excellent! You really know your wrestling! 🔥", color: "text-green-300" };
  if (score >= 6)  return { text: "Good effort! You know your stuff! 👍", color: "text-blue-300" };
  if (score >= 4)  return { text: "Not bad — keep watching and try again! 💪", color: "text-purple-300" };
  return            { text: "Time to hit the rewatch! You'll get there! 😅", color: "text-gray-400" };
}

export default function WrestlingGame() {
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [qIndex,       setQIndex]       = useState(0);
  const [answers,      setAnswers]      = useState<{ text: string; correct: boolean }[]>([]);
  const [answerState,  setAnswerState]  = useState<AnswerState>("unanswered");
  const [chosenIdx,    setChosenIdx]    = useState<number | null>(null);
  const [score,        setScore]        = useState(0);
  const [timeLeft,     setTimeLeft]     = useState(TIME_PER_QUESTION);
  const [phase,        setPhase]        = useState<"intro" | "playing" | "result">("intro");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    const qs = getRandomQuestions(QUESTIONS_PER_ROUND);
    setQuestions(qs);
    setQIndex(0);
    setAnswers(shuffleAnswers(qs[0]));
    setAnswerState("unanswered");
    setChosenIdx(null);
    setScore(0);
    setTimeLeft(TIME_PER_QUESTION);
    setPhase("playing");
  }, []);

  // Advance to next question or end game
  const advance = useCallback(() => {
    setQIndex((prev) => {
      const next = prev + 1;
      if (next >= QUESTIONS_PER_ROUND) {
        setPhase("result");
        return prev;
      }
      setQuestions((qs) => {
        setAnswers(shuffleAnswers(qs[next]));
        return qs;
      });
      setAnswerState("unanswered");
      setChosenIdx(null);
      setTimeLeft(TIME_PER_QUESTION);
      return next;
    });
  }, []);

  // Timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phase !== "playing" || answerState !== "unanswered") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setAnswerState("wrong"); // timed out = wrong
          setTimeout(advance, 1500);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, answerState, qIndex, advance]);

  function pickAnswer(idx: number) {
    if (answerState !== "unanswered") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const correct = answers[idx].correct;
    setChosenIdx(idx);
    setAnswerState(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
    setTimeout(advance, 1600);
  }

  function buttonStyle(idx: number): string {
    const base = "w-full rounded-xl border px-4 py-3 text-left text-sm sm:text-base font-medium transition-all active:scale-95 touch-manipulation";
    if (answerState === "unanswered") {
      return `${base} border-gray-700 bg-gray-800/60 text-white hover:bg-purple-800/60 hover:border-purple-600`;
    }
    if (answers[idx].correct) {
      return `${base} border-green-600 bg-green-800/50 text-green-200`;
    }
    if (idx === chosenIdx && !answers[idx].correct) {
      return `${base} border-red-600 bg-red-800/50 text-red-200`;
    }
    return `${base} border-gray-700 bg-gray-800/30 text-gray-500`;
  }

  // ── Intro screen ──────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🤼</div>
          <h1 className="mb-2 text-3xl sm:text-4xl font-extrabold text-white">Wrestling Quiz</h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-sm mx-auto">
            10 questions on finishing moves, catchphrases, real names, tag teams and more.
            You have {TIME_PER_QUESTION} seconds per question!
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2 text-sm text-gray-400">
          {["Finishing Moves 🥊", "Catchphrases 🎤", "Nicknames 🏷️", "Tag Teams 👥", "Real Names 🪪", "Championships 🏆", "Origins 🌍"].map((c) => (
            <div key={c} className="flex items-center gap-2">
              <span className="text-purple-500">✓</span> {c}
            </div>
          ))}
        </div>
        <button
          onClick={startGame}
          className="rounded-2xl bg-purple-600 px-10 py-4 text-xl font-extrabold text-white hover:bg-purple-500 active:scale-95 transition-all touch-manipulation"
        >
          Start Quiz!
        </button>
        <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-6 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
          ← Games
        </a>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────
  if (phase === "result") {
    const { text, color } = getVerdict(score);
    return (
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <div className="text-6xl mb-3">🤼</div>
          <h1 className="mb-1 text-3xl sm:text-4xl font-extrabold text-white">Quiz Over!</h1>
          <p className={`mt-2 text-lg font-bold ${color}`}>{text}</p>
        </div>
        <div className="rounded-2xl border border-purple-700 bg-[#1a1a2e] px-10 py-6 text-center">
          <p className="text-5xl font-extrabold text-white">{score}<span className="text-2xl text-gray-400">/{QUESTIONS_PER_ROUND}</span></p>
          <p className="mt-1 text-gray-400 text-sm">correct answers</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={startGame}
            className="rounded-xl bg-purple-600 px-8 py-3 text-base font-bold text-white hover:bg-purple-500 active:scale-95 transition-all touch-manipulation"
          >
            Play Again
          </button>
          <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-6 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
            ← Games
          </a>
        </div>
      </div>
    );
  }

  // ── Playing screen ────────────────────────────────────────────────
  const q = questions[qIndex];
  if (!q) return null;
  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-yellow-500" : "bg-purple-500";

  return (
    <div className="flex flex-col items-center gap-5 px-4 w-full max-w-xl mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <span className="text-sm text-gray-400">Q {qIndex + 1}/{QUESTIONS_PER_ROUND}</span>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[q.category] ?? "bg-gray-800 text-gray-300 border-gray-700"}`}>
          {q.category}
        </span>
        <span className="text-sm font-bold text-purple-300">Score: {score}</span>
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 -mt-3">{timeLeft}s remaining</p>

      {/* Question */}
      <div className="w-full rounded-2xl border border-purple-800 bg-[#1a1a2e] p-5 sm:p-6">
        <p className="text-base sm:text-lg font-semibold text-white leading-snug">{q.question}</p>
      </div>

      {/* Answer buttons */}
      <div className="w-full space-y-2.5">
        {answers.map((a, i) => (
          <button
            key={i}
            onPointerDown={(e) => { e.preventDefault(); pickAnswer(i); }}
            disabled={answerState !== "unanswered"}
            className={buttonStyle(i)}
          >
            <span className="mr-2 text-gray-500 font-bold">{["A", "B", "C", "D"][i]}.</span>
            {a.text}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {answerState !== "unanswered" && (
        <div className={`rounded-lg px-5 py-2 text-sm font-bold border ${
          answerState === "correct"
            ? "bg-green-500/20 text-green-300 border-green-600"
            : "bg-red-500/20 text-red-300 border-red-600"
        }`}>
          {answerState === "correct" ? "✅ Correct!" : `❌ The answer was: ${answers.find((a) => a.correct)?.text}`}
        </div>
      )}
    </div>
  );
}
