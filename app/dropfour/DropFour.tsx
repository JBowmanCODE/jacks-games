"use client";

import { useState, useCallback } from "react";

const ROWS = 6;
const COLS = 7;
type Cell  = 0 | 1 | 2; // 0=empty, 1=white, 2=green
type Board = Cell[][];
type Phase = "setup" | "playing" | "won" | "draw";

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

function dropPiece(board: Board, col: number, player: 1 | 2): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      const next = board.map(row => [...row]) as Board;
      next[r][col] = player;
      return next;
    }
  }
  return null; // column full
}

function checkWinner(board: Board): Cell {
  const check = (r: number, c: number, dr: number, dc: number): Cell => {
    const p = board[r]?.[c];
    if (!p) return 0;
    for (let i = 1; i < 4; i++) {
      if (board[r + dr * i]?.[c + dc * i] !== p) return 0;
    }
    return p;
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const w = check(r, c, 0, 1) || check(r, c, 1, 0) ||
                check(r, c, 1, 1) || check(r, c, 1, -1);
      if (w) return w;
    }
  }
  return 0;
}

function getWinningCells(board: Board): [number, number][] {
  const dirs: [number, number][] = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (board[nr]?.[nc] === p) cells.push([nr, nc]);
          else break;
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return [];
}

function isDraw(board: Board) {
  return board[0].every(c => c !== 0);
}

// ── Bot AI (minimax depth 5) ──────────────────────────────────────────────────
function scoreBoard(board: Board, bot: 2 | 1): number {
  const w = checkWinner(board);
  if (w === bot)   return  1000;
  if (w && w !== bot) return -1000;
  return 0;
}

function minimax(board: Board, depth: number, isMax: boolean, bot: 2 | 1, alpha: number, beta: number): number {
  const score = scoreBoard(board, bot);
  if (Math.abs(score) === 1000 || depth === 0 || isDraw(board)) return score;

  const human = bot === 2 ? 1 : 2;
  if (isMax) {
    let best = -Infinity;
    for (let c = 0; c < COLS; c++) {
      const next = dropPiece(board, c, bot as 1 | 2);
      if (!next) continue;
      best = Math.max(best, minimax(next, depth - 1, false, bot, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let c = 0; c < COLS; c++) {
      const next = dropPiece(board, c, human as 1 | 2);
      if (!next) continue;
      best = Math.min(best, minimax(next, depth - 1, true, bot, alpha, beta));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBotMove(board: Board): number {
  let best = -Infinity, bestCol = 3;
  for (let c = 0; c < COLS; c++) {
    const next = dropPiece(board, c, 2);
    if (!next) continue;
    const score = minimax(next, 5, false, 2, -Infinity, Infinity);
    if (score > best) { best = score; bestCol = c; }
  }
  return bestCol;
}

// ── Cell styling ──────────────────────────────────────────────────────────────
function cellStyle(val: Cell, isWin: boolean) {
  const base = "w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 transition-all";
  if (isWin) return `${base} border-yellow-300 shadow-lg shadow-yellow-400/50 scale-110`;
  if (val === 1) return `${base} bg-white border-gray-300`;
  if (val === 2) return `${base} bg-green-500 border-green-400`;
  return `${base} bg-[#0f0f1a] border-gray-700`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DropFour() {
  const [phase,      setPhase]      = useState<Phase>("setup");
  const [vsBot,      setVsBot]      = useState(false);
  const [p1Name,     setP1Name]     = useState("");
  const [p2Name,     setP2Name]     = useState("");
  const [board,      setBoard]      = useState<Board>(emptyBoard());
  const [turn,       setTurn]       = useState<1 | 2>(1);
  const [winCells,   setWinCells]   = useState<[number, number][]>([]);
  const [winner,     setWinner]     = useState<Cell>(0);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [botBusy,    setBotBusy]    = useState(false);

  const p1 = p1Name.trim() || "White";
  const p2 = vsBot ? "Bot 🤖" : (p2Name.trim() || "Green");

  function startGame() {
    setBoard(emptyBoard());
    setTurn(1);
    setWinCells([]);
    setWinner(0);
    setBotBusy(false);
    setPhase("playing");
  }

  const doMove = useCallback((b: Board, col: number, player: 1 | 2): boolean => {
    const next = dropPiece(b, col, player);
    if (!next) return false;
    const w = checkWinner(next);
    if (w) {
      setBoard(next);
      setWinner(w);
      setWinCells(getWinningCells(next));
      setPhase("won");
      return true;
    }
    if (isDraw(next)) {
      setBoard(next);
      setPhase("draw");
      return true;
    }
    setBoard(next);
    setTurn(player === 1 ? 2 : 1);
    return true;
  }, []);

  function handleColClick(col: number) {
    if (phase !== "playing" || botBusy) return;
    if (turn === 2 && vsBot) return;

    const moved = doMove(board, col, turn);
    if (!moved) return;

    // Bot responds
    if (vsBot && turn === 1 && phase === "playing") {
      setBotBusy(true);
      setTimeout(() => {
        setBoard(prev => {
          const botCol = getBotMove(prev);
          doMove(prev, botCol, 2);
          setBotBusy(false);
          return prev;
        });
      }, 500);
    }
  }

  function reset() {
    setBoard(emptyBoard());
    setTurn(1);
    setWinCells([]);
    setWinner(0);
    setBotBusy(false);
    setPhase("playing");
  }

  const isWinCell = (r: number, c: number) => winCells.some(([wr, wc]) => wr === r && wc === c);
  const currentName = turn === 1 ? p1 : p2;
  const winnerName  = winner === 1 ? p1 : winner === 2 ? p2 : "";

  // ── Setup screen ──────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="flex flex-col items-center gap-6 px-4 max-w-sm mx-auto w-full">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">🟢 Drop Four</h1>
          <p className="text-gray-400 text-sm">Connect four in a row — horizontally, vertically or diagonally!</p>
        </div>

        <div className="w-full rounded-2xl border border-purple-800 bg-[#1a1a2e] p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {[false, true].map((bot) => (
              <button key={String(bot)} onClick={() => setVsBot(bot)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${vsBot === bot ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {bot ? "vs Bot 🤖" : "2 Players 👥"}
              </button>
            ))}
          </div>

          {/* Player names */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 shrink-0" />
              <input type="text" value={p1Name} onChange={e => setP1Name(e.target.value)} placeholder="Player 1 (White)"
                className="flex-1 rounded-lg border border-gray-700 bg-[#0f0f1a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
            {!vsBot && (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-400 shrink-0" />
                <input type="text" value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder="Player 2 (Green)"
                  className="flex-1 rounded-lg border border-gray-700 bg-[#0f0f1a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500" />
              </div>
            )}
            {vsBot && (
              <div className="flex items-center gap-2 opacity-50">
                <span className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-400 shrink-0" />
                <span className="text-sm text-gray-400 px-3">Bot 🤖 (Green)</span>
              </div>
            )}
          </div>
        </div>

        <button onClick={startGame} className="w-full rounded-xl bg-purple-600 py-4 text-lg font-extrabold text-white hover:bg-purple-500 active:scale-95 transition-all">
          Start Game →
        </button>
        <a href="/" className="text-xs text-gray-600 hover:text-gray-400">← Back to Games</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 max-w-md mx-auto w-full">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-white">🟢 Drop Four</h1>
      </div>

      {/* Status */}
      {phase === "playing" && (
        <div className={`rounded-xl px-5 py-2 text-sm font-bold border ${turn === 1 ? "border-gray-400 bg-gray-800/40 text-white" : "border-green-600 bg-green-900/30 text-green-200"}`}>
          {botBusy ? "Bot is thinking..." : `${currentName}'s turn`}
        </div>
      )}
      {phase === "won" && (
        <div className="rounded-xl px-5 py-2 text-sm font-bold border border-yellow-500 bg-yellow-900/30 text-yellow-200 animate-bounce">
          🎉 {winnerName} wins!
        </div>
      )}
      {phase === "draw" && (
        <div className="rounded-xl px-5 py-2 text-sm font-bold border border-gray-500 bg-gray-800 text-gray-200">
          🤝 It's a draw!
        </div>
      )}

      {/* Column hover arrows */}
      <div className="flex gap-1">
        {Array.from({ length: COLS }, (_, c) => (
          <button key={c} className={`w-9 sm:w-11 h-5 flex items-center justify-center text-sm transition-opacity ${hoveredCol === c && phase === "playing" && !botBusy ? "opacity-100" : "opacity-0"}`}
            onClick={() => handleColClick(c)}>
            ▼
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="rounded-2xl bg-purple-900/40 border-2 border-purple-700 p-2 shadow-xl shadow-purple-900/30">
        <div className="flex flex-col gap-1">
          {board.map((row, r) => (
            <div key={r} className="flex gap-1">
              {row.map((cell, c) => (
                <button
                  key={c}
                  onClick={() => handleColClick(c)}
                  onMouseEnter={() => setHoveredCol(c)}
                  onMouseLeave={() => setHoveredCol(null)}
                  disabled={phase !== "playing" || botBusy || (turn === 2 && vsBot)}
                  className={`${cellStyle(cell, isWinCell(r, c))} touch-manipulation`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Players legend */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-white border border-gray-300" />
          <span className="text-gray-300">{p1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-green-500 border border-green-400" />
          <span className="text-gray-300">{p2}</span>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={reset} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-500 active:scale-95 transition-all">
          New Game
        </button>
        <button onClick={() => setPhase("setup")} className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors">
          Change Mode
        </button>
        <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
          ← Games
        </a>
      </div>
    </div>
  );
}
