"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Phase = "entry" | "testing" | "results";
type WordResult = { word: string; typed: string; correct: boolean };

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 180 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * -canvas.height,
      w:    6 + Math.random() * 10,
      h:    10 + Math.random() * 14,
      r:    Math.random() * Math.PI * 2,
      dr:   (Math.random() - 0.5) * 0.2,
      vy:   3 + Math.random() * 4,
      vx:   (Math.random() - 0.5) * 3,
      color: `hsl(${Math.random() * 360},90%,60%)`,
    }));

    let raf: number;
    function draw() {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x  += p.vx;
        p.y  += p.vy;
        p.r  += p.dr;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}

// ── TTS helper ────────────────────────────────────────────────────────────────
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.name.includes("Libby"))                                     ||
    voices.find((v) => v.name.includes("Hazel"))                                     ||
    voices.find((v) => v.name.includes("Serena"))                                    ||
    voices.find((v) => v.lang === "en-GB" && /female|woman/i.test(v.name))           ||
    voices.find((v) => v.lang === "en-GB")                                           ||
    voices.find((v) => v.lang.startsWith("en") && /female|woman/i.test(v.name))     ||
    voices.find((v) => v.lang.startsWith("en"))                                      ||
    null
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SpellingGame() {
  const [phase,        setPhase]        = useState<Phase>("entry");
  const [rawInputs,    setRawInputs]    = useState<string[]>(Array(10).fill(""));
  const [words,        setWords]        = useState<string[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [typed,        setTyped]        = useState("");
  const [results,      setResults]      = useState<WordResult[]>([]);
  const [speaking,     setSpeaking]     = useState(false);
  const [voicesReady,  setVoicesReady]  = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load voices (they load async in most browsers)
  useEffect(() => {
    function onVoicesChanged() { setVoicesReady(true); }
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  }, []);

  const speak = useCallback((word: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.rate   = 0.82;
    utter.pitch  = 1.05;
    utter.volume = 1;
    const voice  = getBestVoice();
    if (voice) utter.voice = voice;
    setSpeaking(true);
    utter.onend  = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  // Auto-speak + focus when question changes
  useEffect(() => {
    if (phase === "testing" && words[currentIdx]) {
      speak(words[currentIdx]);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [phase, currentIdx, words, speak]);

  // Stop speech when leaving test
  useEffect(() => {
    if (phase !== "testing") window.speechSynthesis?.cancel();
  }, [phase]);

  // ── Entry helpers ──────────────────────────────────────────────────
  function updateWord(idx: number, val: string) {
    setRawInputs((prev) => {
      const next = [...prev];
      next[idx] = val.replace(/[^a-zA-Z\s'-]/g, ""); // letters only
      return next;
    });
  }

  function addMoreWords() {
    setRawInputs((prev) => [...prev, ...Array(5).fill("")].slice(0, 30));
  }

  const validWords = rawInputs.map((w) => w.trim()).filter(Boolean);

  function beginTest(wordList: string[]) {
    setWords(wordList);
    setCurrentIdx(0);
    setResults([]);
    setTyped("");
    setShowConfetti(false);
    setPhase("testing");
  }

  // ── Submit a guess ────────────────────────────────────────────────
  function submitWord() {
    const answer = typed.trim();
    if (!answer) return;

    const word    = words[currentIdx];
    const correct = answer.toLowerCase() === word.toLowerCase();
    const next    = [...results, { word, typed: answer, correct }];
    setResults(next);
    setTyped("");

    if (currentIdx + 1 >= words.length) {
      const allCorrect = next.every((r) => r.correct);
      setShowConfetti(allCorrect);
      setPhase("results");
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  // ── Entry screen ───────────────────────────────────────────────────
  if (phase === "entry") {
    return (
      <div className="flex flex-col items-center gap-6 px-4 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">✏️ Spelling Test</h1>
          <p className="text-gray-400 text-sm">Type up to 30 words, then press Start. The computer will read each word out loud!</p>
        </div>

        <div className="w-full space-y-2">
          {rawInputs.map((val, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 text-right text-sm font-bold text-gray-500 shrink-0">{i + 1}.</span>
              <input
                type="text"
                value={val}
                onChange={(e) => updateWord(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = document.getElementById(`word-input-${i + 1}`);
                    if (next) (next as HTMLInputElement).focus();
                  }
                }}
                id={`word-input-${i}`}
                placeholder={`Word ${i + 1}`}
                className="flex-1 rounded-xl border border-gray-700 bg-[#1a1a2e] px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          ))}
        </div>

        {rawInputs.length < 30 && (
          <button onClick={addMoreWords} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            + Add 5 more word slots ({rawInputs.length}/30)
          </button>
        )}

        <div className="flex flex-wrap gap-3 justify-center w-full mt-2">
          <button
            onClick={() => beginTest(validWords)}
            disabled={validWords.length === 0}
            className="rounded-xl bg-purple-600 px-8 py-3 text-base font-bold text-white hover:bg-purple-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Test ({validWords.length} word{validWords.length !== 1 ? "s" : ""}) →
          </button>
          <button
            onClick={() => setRawInputs(Array(10).fill(""))}
            className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Clear All
          </button>
        </div>

        <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Back to Games</a>
      </div>
    );
  }

  // ── Testing screen ────────────────────────────────────────────────
  if (phase === "testing") {
    const progress = ((currentIdx) / words.length) * 100;

    return (
      <div className="flex flex-col items-center gap-6 px-4 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">✏️ Spelling Test</h1>
          <p className="text-sm text-gray-400 mt-1">Word {currentIdx + 1} of {words.length}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-gray-800 overflow-hidden">
          <div className="h-full rounded-full bg-purple-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Speaker card */}
        <div className="w-full rounded-2xl border-2 border-purple-700 bg-[#1a1a2e] p-8 flex flex-col items-center gap-5">
          <p className="text-gray-400 text-sm">Listen carefully and spell the word!</p>

          {/* Big play button */}
          <button
            onClick={() => speak(words[currentIdx])}
            disabled={speaking}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg transition-all active:scale-90 touch-manipulation
              ${speaking
                ? "bg-purple-800 border-2 border-purple-500 animate-pulse cursor-wait"
                : "bg-purple-600 hover:bg-purple-500 border-2 border-purple-400"}`}
          >
            {speaking ? "🔊" : "🔊"}
          </button>

          <p className="text-sm text-gray-500">
            {speaking ? "Listening..." : "Tap to hear the word again"}
          </p>
        </div>

        {/* Type answer */}
        <div className="w-full space-y-3">
          <label className="block text-sm font-semibold text-purple-300 text-center">
            Type the word you heard:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitWord(); }}
            placeholder="Type here..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-xl border-2 border-gray-700 bg-[#1a1a2e] px-5 py-4 text-white text-xl text-center tracking-widest placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={submitWord}
            disabled={!typed.trim()}
            className="w-full rounded-xl bg-purple-600 py-3.5 text-base font-bold text-white hover:bg-purple-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
          >
            Submit →
          </button>
        </div>

        <p className="text-xs text-gray-600">Don&apos;t worry about capital letters — only spelling counts!</p>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────
  const correct = results.filter((r) => r.correct);
  const wrong   = results.filter((r) => !r.correct);
  const score   = correct.length;
  const total   = results.length;
  const perfect = score === total;

  const verdict =
    perfect              ? "🎊 PERFECT SCORE! You're a spelling superstar!" :
    score / total >= 0.8 ? "⭐ Brilliant! Nearly perfect!" :
    score / total >= 0.6 ? "👍 Good effort! Keep practising!" :
    score / total >= 0.4 ? "💪 Not bad — let's practise those tricky ones!" :
                           "📚 Keep going — practise makes perfect!";

  return (
    <div className={`flex flex-col items-center gap-6 px-4 max-w-lg mx-auto w-full ${perfect ? "animate-bounce-once" : ""}`}>
      {showConfetti && <Confetti />}

      {/* Score */}
      <div className={`text-center w-full rounded-2xl p-6 border-2 ${perfect ? "border-yellow-400 bg-yellow-900/30" : "border-purple-700 bg-[#1a1a2e]"}`}>
        {perfect && <p className="text-4xl mb-2 animate-spin-slow">🏆</p>}
        <h1 className={`text-3xl sm:text-4xl font-extrabold mb-1 ${perfect ? "text-yellow-300" : "text-white"}`}>
          {score} / {total}
        </h1>
        <p className={`font-bold text-base ${perfect ? "text-yellow-200" : "text-purple-300"}`}>{verdict}</p>
      </div>

      {/* Word list */}
      <div className="w-full space-y-2">
        {results.map((r, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
              r.correct
                ? "bg-green-900/30 border-green-800"
                : "bg-red-900/30 border-red-800"
            }`}
          >
            <span className="text-lg">{r.correct ? "✅" : "❌"}</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-white capitalize">{r.word}</span>
              {!r.correct && (
                <span className="ml-2 text-sm text-red-400">
                  — you typed: <span className="italic">{r.typed}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center w-full">
        <button
          onClick={() => beginTest(words)}
          className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white hover:bg-purple-500 active:scale-95 transition-all"
        >
          Retest All {total} Words
        </button>
        {wrong.length > 0 && (
          <button
            onClick={() => beginTest(wrong.map((r) => r.word))}
            className="rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white hover:bg-red-600 active:scale-95 transition-all"
          >
            Retest {wrong.length} Wrong Word{wrong.length !== 1 ? "s" : ""}
          </button>
        )}
        <button
          onClick={() => { setPhase("entry"); setRawInputs(words.map((w) => w)); }}
          className="rounded-xl border border-gray-600 bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Edit Word List
        </button>
        <button
          onClick={() => { setPhase("entry"); setRawInputs(Array(10).fill("")); }}
          className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
        >
          New Word List
        </button>
      </div>

      <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Back to Games</a>
    </div>
  );
}
