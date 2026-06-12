"use client";

import { useState, useCallback, useEffect } from "react";

// ── Board data ─────────────────────────────────────────────────────────────────
const LADDERS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
};
const SNAKES: Record<number, number> = {
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78,
};

const PLAYER_COLORS  = ["#a855f7", "#ef4444", "#3b82f6", "#22c55e"];
const PLAYER_LABELS  = ["Player 1", "Player 2", "Player 3", "Player 4"];
const BOT_COLOR      = "#f59e0b";
const CELL           = 42; // px — 420px board

// ── Coordinate helper ─────────────────────────────────────────────────────────
function sqCoord(n: number) {
  const i           = n - 1;
  const rowFromBot  = Math.floor(i / 10);
  const visualRow   = 9 - rowFromBot;
  const col         = rowFromBot % 2 === 0 ? i % 10 : 9 - (i % 10);
  return { x: col * CELL + CELL / 2, y: visualRow * CELL + CELL / 2 };
}

function getSquareNum(visualRow: number, col: number) {
  const rowFromBot = 9 - visualRow;
  const c          = rowFromBot % 2 === 0 ? col : 9 - col;
  return rowFromBot * 10 + c + 1;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Player = { name: string; color: string; pos: number; isBot: boolean };

// ── Dice face ────────────────────────────────────────────────────────────────
const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DICE_DOTS[value] ?? [];
  return (
    <svg viewBox="0 0 100 100" className={`w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg ${rolling ? "animate-spin" : ""}`}>
      <rect x="5" y="5" width="90" height="90" rx="16" fill="#1a1a2e" stroke="#7c3aed" strokeWidth="4" />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill="#c084fc" />
      ))}
    </svg>
  );
}

// ── SVG Snakes & Ladders overlay ──────────────────────────────────────────────
function BoardOverlay() {
  const boardSize = CELL * 10;
  return (
    <svg
      viewBox={`0 0 ${boardSize} ${boardSize}`}
      className="absolute inset-0 pointer-events-none"
      style={{ width: boardSize, height: boardSize }}
    >
      {/* Ladders */}
      {Object.entries(LADDERS).map(([from, to]) => {
        const a = sqCoord(Number(from));
        const b = sqCoord(Number(to));
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const angle = Math.atan2(dy, dx);
        const offset = 5;
        const ox = Math.sin(angle) * offset;
        const oy = -Math.cos(angle) * offset;
        // Rungs
        const len = Math.sqrt(dx * dx + dy * dy);
        const rungCount = Math.max(2, Math.floor(len / 30));
        const rungs = Array.from({ length: rungCount }, (_, i) => {
          const t = (i + 1) / (rungCount + 1);
          return { x: a.x + dx * t, y: a.y + dy * t };
        });
        return (
          <g key={`ladder-${from}`}>
            <line x1={a.x + ox} y1={a.y + oy} x2={b.x + ox} y2={b.y + oy} stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
            <line x1={a.x - ox} y1={a.y - oy} x2={b.x - ox} y2={b.y - oy} stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
            {rungs.map((r, i) => (
              <line key={i} x1={r.x + ox * 1.4} y1={r.y + oy * 1.4} x2={r.x - ox * 1.4} y2={r.y - oy * 1.4} stroke="#fde68a" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
            ))}
            <circle cx={a.x} cy={a.y} r="5" fill="#fbbf24" opacity="0.8" />
            <circle cx={b.x} cy={b.y} r="5" fill="#fbbf24" opacity="0.8" />
          </g>
        );
      })}

      {/* Snakes */}
      {Object.entries(SNAKES).map(([head, tail]) => {
        const h = sqCoord(Number(head));
        const t = sqCoord(Number(tail));
        const mx = (h.x + t.x) / 2 + (h.y - t.y) * 0.35;
        const my = (h.y + t.y) / 2 + (t.x - h.x) * 0.35;
        return (
          <g key={`snake-${head}`}>
            <path
              d={`M ${h.x} ${h.y} Q ${mx} ${my} ${t.x} ${t.y}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* Snake head circle */}
            <circle cx={h.x} cy={h.y} r="7" fill="#ef4444" opacity="0.9" />
            <circle cx={h.x} cy={h.y} r="3.5" fill="#fca5a5" />
            {/* Snake tail */}
            <circle cx={t.x} cy={t.y} r="4" fill="#b91c1c" opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SnakesGame() {
  const [phase,       setPhase]       = useState<"setup" | "playing" | "won">("setup");
  const [numHumans,   setNumHumans]   = useState(1);
  const [withBot,     setWithBot]     = useState(true);
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [players,     setPlayers]     = useState<Player[]>([]);
  const [turn,        setTurn]        = useState(0);
  const [diceVal,     setDiceVal]     = useState(1);
  const [rolling,     setRolling]     = useState(false);
  const [log,         setLog]         = useState<string[]>([]);
  const [winner,      setWinner]      = useState<Player | null>(null);
  const [waiting,     setWaiting]     = useState(false);

  const boardSize = CELL * 10;

  // ── Setup ──────────────────────────────────────────────────────────
  function startGame() {
    const ps: Player[] = [];
    for (let i = 0; i < numHumans; i++) {
      ps.push({
        name:  playerNames[i].trim() || PLAYER_LABELS[i],
        color: PLAYER_COLORS[i],
        pos:   0,
        isBot: false,
      });
    }
    if (numHumans === 1 && withBot) {
      ps.push({ name: "Bot", color: BOT_COLOR, pos: 0, isBot: true });
    }
    setPlayers(ps);
    setTurn(0);
    setDiceVal(1);
    setLog([]);
    setWinner(null);
    setWaiting(false);
    setPhase("playing");
  }

  // ── Move logic ─────────────────────────────────────────────────────
  const doMove = useCallback((ps: Player[], idx: number, roll: number) => {
    const p     = ps[idx];
    let newPos  = p.pos + roll;
    let msg     = `${p.name} rolled a ${roll}`;

    if (newPos > 100) {
      newPos = 100 - (newPos - 100); // bounce back
      msg += ` → bounced back to ${newPos}`;
    }

    if (newPos === 100) {
      const updated = ps.map((pl, i) => i === idx ? { ...pl, pos: 100 } : pl);
      setPlayers(updated);
      setLog((l) => [`${p.name} rolled ${roll} and WON! 🎉`, ...l].slice(0, 20));
      setWinner(updated[idx]);
      setPhase("won");
      return;
    }

    if (LADDERS[newPos]) {
      const top = LADDERS[newPos];
      msg += ` → landed on ${newPos}, climbed ladder to ${top}! 🪜`;
      newPos = top;
    } else if (SNAKES[newPos]) {
      const tail = SNAKES[newPos];
      msg += ` → landed on ${newPos}, bitten by snake! Slid to ${tail} 🐍`;
      newPos = tail;
    } else {
      msg += ` → moved to ${newPos}`;
    }

    const updated = ps.map((pl, i) => i === idx ? { ...pl, pos: newPos } : pl);
    setPlayers(updated);
    setLog((l) => [msg, ...l].slice(0, 20));

    const nextIdx = (idx + 1) % updated.length;
    setTurn(nextIdx);
    return updated;
  }, []);

  // ── Roll handler ──────────────────────────────────────────────────
  const roll = useCallback(() => {
    if (rolling || waiting) return;
    const r = Math.floor(Math.random() * 6) + 1;
    setDiceVal(r);
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      doMove(players, turn, r);
    }, 600);
  }, [rolling, waiting, players, turn, doMove]);

  // ── Bot auto-roll ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const currentPlayer = players[turn];
    if (!currentPlayer?.isBot) return;
    setWaiting(true);
    const t = setTimeout(() => {
      setWaiting(false);
      roll();
    }, 1200);
    return () => clearTimeout(t);
  }, [turn, phase, players, roll]);

  // ── Square background ──────────────────────────────────────────────
  function squareBg(n: number) {
    if (LADDERS[n]) return "bg-yellow-900/60 border-yellow-700/50";
    if (SNAKES[n])  return "bg-red-900/50 border-red-800/50";
    const row = Math.floor((n - 1) / 10);
    return (n + row) % 2 === 0
      ? "bg-[#1e1e38] border-gray-700/30"
      : "bg-[#252545] border-gray-700/30";
  }

  // ── Players on a square ────────────────────────────────────────────
  function tokensOnSquare(n: number) {
    return players.filter((p) => p.pos === n);
  }

  // ── Setup screen ───────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="flex flex-col items-center gap-6 px-4 max-w-md mx-auto w-full">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">🎲 Snakes & Ladders</h1>
          <p className="text-gray-400 text-sm">Up to 4 players — or play solo against a bot!</p>
        </div>

        {/* Number of human players */}
        <div className="w-full rounded-2xl border border-purple-800 bg-[#1a1a2e] p-5 space-y-4">
          <label className="block text-sm font-semibold text-purple-300 uppercase tracking-wider">
            How many players?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setNumHumans(n)}
                className={`flex-1 rounded-xl py-3 text-lg font-bold transition-colors ${
                  numHumans === n ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Bot toggle (only for 1 player) */}
          {numHumans === 1 && (
            <div className="flex items-center justify-between rounded-xl bg-gray-800/60 px-4 py-3">
              <span className="text-sm text-gray-200">Play vs Bot 🤖</span>
              <button
                onClick={() => setWithBot((b) => !b)}
                className={`w-12 h-6 rounded-full transition-colors relative ${withBot ? "bg-purple-600" : "bg-gray-600"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${withBot ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          )}

          {/* Player names */}
          <div className="space-y-2">
            {Array.from({ length: numHumans }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PLAYER_COLORS[i] }} />
                <input
                  type="text"
                  value={playerNames[i]}
                  onChange={(e) => {
                    const next = [...playerNames];
                    next[i] = e.target.value;
                    setPlayerNames(next);
                  }}
                  placeholder={PLAYER_LABELS[i]}
                  maxLength={16}
                  className="flex-1 rounded-lg border border-gray-700 bg-[#0f0f1a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            ))}
            {numHumans === 1 && withBot && (
              <div className="flex items-center gap-2 opacity-50">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: BOT_COLOR }} />
                <span className="text-sm text-gray-400 px-3">Bot 🤖</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full rounded-xl bg-purple-600 py-4 text-lg font-extrabold text-white hover:bg-purple-500 active:scale-95 transition-all"
        >
          Start Game 🎲
        </button>
        <a href="/" className="text-xs text-gray-600 hover:text-gray-400">← Back to Games</a>
      </div>
    );
  }

  // ── Won screen ─────────────────────────────────────────────────────
  if (phase === "won" && winner) {
    return (
      <div className="flex flex-col items-center gap-6 px-4 max-w-md mx-auto w-full text-center">
        <div className="text-6xl animate-bounce">🏆</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          <span style={{ color: winner.color }}>{winner.name}</span> Wins!
        </h1>
        <p className="text-gray-400">Congratulations! 🎉</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => setPhase("playing")} className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500 active:scale-95 transition-all">
            Play Again (same players)
          </button>
          <button onClick={() => setPhase("setup")} className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-6 py-3 font-semibold text-gray-300 hover:bg-gray-800 transition-colors">
            New Game
          </button>
        </div>
        <a href="/" className="text-xs text-gray-600 hover:text-gray-400">← Games</a>
      </div>
    );
  }

  // ── Playing screen ─────────────────────────────────────────────────
  const currentPlayer = players[turn];

  return (
    <div className="flex flex-col items-center gap-4 px-2 w-full max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-white">🎲 Snakes & Ladders</h1>

      {/* Player turn banner */}
      <div
        className="rounded-xl px-5 py-2 text-sm font-bold text-white border"
        style={{ borderColor: currentPlayer?.color, backgroundColor: `${currentPlayer?.color}22` }}
      >
        {currentPlayer?.isBot
          ? `🤖 ${currentPlayer.name} is thinking...`
          : `🎲 ${currentPlayer?.name}'s turn — roll the dice!`}
      </div>

      {/* Player positions */}
      <div className="flex flex-wrap gap-2 justify-center">
        {players.map((p, i) => (
          <div key={i} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${i === turn ? "border-white/40 bg-white/10" : "border-gray-700 bg-gray-800/40"}`}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-white">{p.name}</span>
            <span className="text-gray-400">{p.pos === 0 ? "Start" : p.pos}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="overflow-x-auto w-full flex justify-center">
        <div className="relative shrink-0 rounded-xl overflow-hidden border-2 border-purple-800 shadow-2xl shadow-purple-900/40"
          style={{ width: boardSize, height: boardSize }}>

          {/* Grid squares */}
          <div className="grid grid-cols-10 grid-rows-10 absolute inset-0">
            {Array.from({ length: 10 }).map((_, vRow) =>
              Array.from({ length: 10 }).map((_, col) => {
                const n        = getSquareNum(vRow, col);
                const tokens   = tokensOnSquare(n);
                const hasLadder = !!LADDERS[n];
                const hasSnake  = !!SNAKES[n];
                return (
                  <div
                    key={n}
                    className={`relative flex flex-col items-center justify-center border text-[8px] font-bold select-none ${squareBg(n)}`}
                    style={{ width: CELL, height: CELL }}
                  >
                    {/* Square number */}
                    <span className={`absolute top-0.5 left-1 text-[7px] font-semibold ${hasLadder ? "text-yellow-400" : hasSnake ? "text-red-400" : "text-gray-600"}`}>
                      {n}
                    </span>
                    {/* Icon */}
                    {hasLadder && <span className="text-[13px] opacity-70">🪜</span>}
                    {hasSnake  && <span className="text-[13px] opacity-70">🐍</span>}
                    {/* Player tokens */}
                    {tokens.length > 0 && (
                      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-px p-0.5">
                        {tokens.map((p, ti) => (
                          <span
                            key={ti}
                            className="w-4 h-4 rounded-full border-2 border-white/60 shadow"
                            style={{ backgroundColor: p.color, minWidth: 14, minHeight: 14 }}
                            title={p.name}
                          />
                        ))}
                      </div>
                    )}
                    {/* Square 100 */}
                    {n === 100 && <span className="text-base">⭐</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* SVG snakes & ladders overlay */}
          <BoardOverlay />
        </div>
      </div>

      {/* Dice + Roll button */}
      <div className="flex items-center gap-6">
        <DiceFace value={diceVal} rolling={rolling} />
        <button
          onClick={roll}
          disabled={rolling || waiting || currentPlayer?.isBot}
          className="rounded-2xl bg-purple-600 px-8 py-4 text-lg font-extrabold text-white hover:bg-purple-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          {rolling ? "Rolling..." : waiting ? "Bot thinking..." : "Roll Dice 🎲"}
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>🪜 Ladder — climb up!</span>
        <span>🐍 Snake — slide down!</span>
      </div>

      {/* Move log */}
      {log.length > 0 && (
        <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#1a1a2e] p-3 space-y-1 max-h-32 overflow-y-auto">
          {log.map((entry, i) => (
            <p key={i} className={`text-xs ${i === 0 ? "text-white" : "text-gray-500"}`}>{entry}</p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => { setPhase("setup"); setPlayers([]); }}
          className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
        >
          New Game
        </button>
        <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors">
          ← Games
        </a>
      </div>
    </div>
  );
}
