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
    const pieces = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 6 + Math.random() * 10,
      h: 10 + Math.random() * 14,
      r: Math.random() * Math.PI * 2,
      dr: (Math.random() - 0.5) * 0.2,
      vy: 3 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 3,
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
        p.x += p.vx; p.y += p.vy; p.r += p.dr;
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

// ── Voice selection — prioritise neural/natural sounding voices ───────────────
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const find = (test: (v: SpeechSynthesisVoice) => boolean) => voices.find(test) ?? null;

  return (
    // Chrome desktop – most natural
    find((v) => v.name === "Google UK English Female")                                    ||
    // Edge neural voices (very natural)
    find((v) => /Sonia.*Natural/i.test(v.name))                                          ||
    find((v) => /Libby.*Natural/i.test(v.name))                                          ||
    find((v) => /Mia.*Natural/i.test(v.name))                                            ||
    find((v) => /Natural/i.test(v.name) && v.lang.startsWith("en"))                      ||
    // Google fallback
    find((v) => /Google.*English.*Female/i.test(v.name))                                 ||
    // Apple voices (natural sounding)
    find((v) => v.name === "Samantha" && v.lang.startsWith("en"))                        ||
    find((v) => v.name === "Karen")                                                       ||
    // Any en-GB
    find((v) => v.lang === "en-GB")                                                       ||
    // Any English
    find((v) => v.lang.startsWith("en"))                                                  ||
    null
  );
}

// ── Parse pasted / typed word list ────────────────────────────────────────────
function parseWords(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)           // split on newlines, commas, semicolons
    .map((w) => w.trim().replace(/[^a-zA-Z'\-\s]/g, "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SpellingGame() {
  const [phase,         setPhase]         = useState<Phase>("entry");
  const [rawText,       setRawText]       = useState("");
  const [words,         setWords]         = useState<string[]>([]);   // current test list
  const [originalWords, setOriginalWords] = useState<string[]>([]);   // full list from entry
  const [currentIdx,    setCurrentIdx]    = useState(0);
  const [typed,         setTyped]         = useState("");
  const [results,       setResults]       = useState<WordResult[]>([]);
  const [speaking,      setSpeaking]      = useState(false);
  const [showConfetti,  setShowConfetti]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure voices are loaded
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const speak = useCallback((word: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter       = new SpeechSynthesisUtterance(word);
    utter.rate        = 0.88;
    utter.pitch       = 1.05;
    utter.volume      = 1;
    const voice       = getBestVoice();
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

  useEffect(() => {
    if (phase !== "testing") window.speechSynthesis?.cancel();
  }, [phase]);

  // ── Start a test ──────────────────────────────────────────────────
  function beginTest(wordList: string[], keepOriginal?: string[]) {
    setWords(wordList);
    if (keepOriginal) setOriginalWords(keepOriginal);
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
      setShowConfetti(next.every((r) => r.correct));
      setPhase("results");
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  const parsedWords = parseWords(rawText);

  // ── Entry screen ───────────────────────────────────────────────────
  if (phase === "entry") {
    return (
      <div className="flex flex-col items-center gap-6 px-4 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">✏️ Spelling Test</h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Type or paste your words below — one per line, or separated by commas. Up to 30 words.
          </p>
        </div>

        <div className="w-full">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"happy\nwhat\nhello\n\nOr paste a comma list: happy, what, hello"}
            rows={10}
            className="w-full rounded-2xl border-2 border-gray-700 bg-[#1a1a2e] px-5 py-4 text-white text-base placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
          />
          <p className={`mt-1.5 text-right text-xs font-semibold transition-colors ${
            parsedWords.length === 0 ? "text-gray-600" :
            parsedWords.length >= 30 ? "text-yellow-400" : "text-purple-400"
          }`}>
            {parsedWords.length}/30 words detected
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center w-full">
          <button
            onClick={() => { beginTest(parsedWords, parsedWords); }}
            disabled={parsedWords.length === 0}
            className="rounded-xl bg-purple-600 px-8 py-3 text-base font-bold text-white hover:bg-purple-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Test ({parsedWords.length} word{parsedWords.length !== 1 ? "s" : ""}) →
          </button>
          <button
            onClick={() => setRawText("")}
            className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>
        </div>

        <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Back to Games</a>
      </div>
    );
  }

  // ── Testing screen ────────────────────────────────────────────────
  if (phase === "testing") {
    const progress = (currentIdx / words.length) * 100;
    return (
      <div className="flex flex-col items-center gap-6 px-4 max-w-md mx-auto w-full">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">✏️ Spelling Test</h1>
          <p className="text-sm text-gray-400 mt-1">Word {currentIdx + 1} of {words.length}</p>
        </div>

        <div className="w-full h-2.5 rounded-full bg-gray-800 overflow-hidden">
          <div className="h-full rounded-full bg-purple-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="w-full rounded-2xl border-2 border-purple-700 bg-[#1a1a2e] p-8 flex flex-col items-center gap-5">
          <p className="text-gray-400 text-sm">Listen carefully and spell the word!</p>
          <button
            onClick={() => speak(words[currentIdx])}
            disabled={speaking}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg transition-all active:scale-90 touch-manipulation
              ${speaking ? "bg-purple-800 border-2 border-purple-500 animate-pulse cursor-wait" : "bg-purple-600 hover:bg-purple-500 border-2 border-purple-400"}`}
          >
            🔊
          </button>
          <p className="text-sm text-gray-500">{speaking ? "Listening..." : "Tap to hear the word again"}</p>
        </div>

        <div className="w-full space-y-3">
          <label className="block text-sm font-semibold text-purple-300 text-center">Type the word you heard:</label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitWord(); }}
            placeholder="Type here..."
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
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

  // Show "retest full list" button only when we tested a subset (e.g. wrong words only)
  const testedSubset = originalWords.length > words.length;

  const verdict =
    perfect              ? "🎊 PERFECT SCORE! You&apos;re a spelling superstar!" :
    score / total >= 0.8 ? "⭐ Brilliant! Nearly perfect!" :
    score / total >= 0.6 ? "👍 Good effort! Keep practising!" :
    score / total >= 0.4 ? "💪 Not bad — let&apos;s practise those tricky ones!" :
                           "📚 Keep going — practise makes perfect!";

  return (
    <div className="flex flex-col items-center gap-6 px-4 max-w-lg mx-auto w-full">
      {showConfetti && <Confetti />}

      {/* Score card */}
      <div className={`text-center w-full rounded-2xl p-6 border-2 ${perfect ? "border-yellow-400 bg-yellow-900/30" : "border-purple-700 bg-[#1a1a2e]"}`}>
        {perfect && <p className="text-4xl mb-2 animate-spin-slow">🏆</p>}
        <h1 className={`text-4xl sm:text-5xl font-extrabold mb-2 ${perfect ? "text-yellow-300" : "text-white"}`}>
          {score} / {total}
        </h1>
        <p className={`font-bold text-base ${perfect ? "text-yellow-200" : "text-purple-300"}`}>
          {perfect              ? "🎊 PERFECT SCORE! You're a spelling superstar!" :
           score / total >= 0.8 ? "⭐ Brilliant! Nearly perfect!" :
           score / total >= 0.6 ? "👍 Good effort! Keep practising!" :
           score / total >= 0.4 ? "💪 Not bad — let's practise those tricky ones!" :
                                  "📚 Keep going — practise makes perfect!"}
        </p>
      </div>

      {/* Word results list */}
      <div className="w-full space-y-2">
        {results.map((r, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${r.correct ? "bg-green-900/30 border-green-800" : "bg-red-900/30 border-red-800"}`}>
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

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center w-full">
        {/* Retest the current set */}
        <button
          onClick={() => beginTest(words, originalWords)}
          className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white hover:bg-purple-500 active:scale-95 transition-all"
        >
          Retest All {total} Words
        </button>

        {/* Retest wrong words only (shown if there are any) */}
        {wrong.length > 0 && (
          <button
            onClick={() => beginTest(wrong.map((r) => r.word), originalWords)}
            className="rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white hover:bg-red-600 active:scale-95 transition-all"
          >
            Retest {wrong.length} Wrong Word{wrong.length !== 1 ? "s" : ""}
          </button>
        )}

        {/* Retest full original list (shown when we tested a subset) */}
        {testedSubset && (
          <button
            onClick={() => beginTest(originalWords, originalWords)}
            className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-600 active:scale-95 transition-all"
          >
            Retest Full List ({originalWords.length} Words)
          </button>
        )}

        <button
          onClick={() => { setPhase("entry"); setRawText(originalWords.join("\n")); }}
          className="rounded-xl border border-gray-600 bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Edit Word List
        </button>
        <button
          onClick={() => { setPhase("entry"); setRawText(""); }}
          className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
        >
          New Word List
        </button>
      </div>

      <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Back to Games</a>
    </div>
  );
}
