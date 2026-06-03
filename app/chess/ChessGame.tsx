"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square, PieceSymbol, Color } from "chess.js";

type Difficulty = "easy" | "medium" | "hard";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Positional bonus tables for pawns, knights, bishops, rooks, queens, kings (white perspective)
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];
const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];
const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];
const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];
const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];
const KING_MID_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

const TABLES: Record<PieceSymbol, number[]> = {
  p: PAWN_TABLE, n: KNIGHT_TABLE, b: BISHOP_TABLE,
  r: ROOK_TABLE, q: QUEEN_TABLE, k: KING_MID_TABLE,
};

function squareIndex(square: Square, color: Color): number {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1]);
  const idx = rank * 8 + file;
  return color === "w" ? idx : 63 - idx;
}

function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === "w" ? -99999 : 99999;
  if (game.isDraw()) return 0;

  let score = 0;
  const board = game.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const val = PIECE_VALUES[cell.type] + TABLES[cell.type][squareIndex(cell.square, cell.color)];
      score += cell.color === "w" ? val : -val;
    }
  }
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (depth === 0 || game.isGameOver()) return evaluateBoard(game);

  const moves = game.moves({ verbose: true });
  if (isMax) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBotMove(game: Chess, difficulty: Difficulty): ReturnType<Chess["moves"]>[0] | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  if (difficulty === "easy") {
    // Random move with slight preference for captures
    const captures = moves.filter((m) => m.flags.includes("c") || m.flags.includes("e"));
    const pool = captures.length > 0 && Math.random() > 0.6 ? captures : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const depth = difficulty === "medium" ? 2 : 3;
  let bestScore = -Infinity;
  let bestMove = moves[0];

  // Shuffle for variety at equal scores
  const shuffled = [...moves].sort(() => Math.random() - 0.5);
  for (const move of shuffled) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, false);
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

export default function ChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState("start");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("Your turn");
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);

  const updateStatus = useCallback((g: Chess) => {
    if (g.isCheckmate()) {
      const winner = g.turn() === "w" ? "Black" : "White";
      setStatus(`Checkmate! ${winner} wins!`);
    } else if (g.isDraw()) {
      setStatus("Draw!");
    } else if (g.isCheck()) {
      setStatus(g.turn() === "w" ? "White is in check!" : "Black is in check!");
    } else {
      const botColor = playerColor === "white" ? "black" : "white";
      const isPlayerTurn =
        (g.turn() === "w" && playerColor === "white") ||
        (g.turn() === "b" && playerColor === "black");
      setStatus(isPlayerTurn ? "Your turn" : `${botColor.charAt(0).toUpperCase() + botColor.slice(1)} (bot) is thinking…`);
    }
  }, [playerColor]);

  const runBotMove = useCallback(
    (g: Chess) => {
      const botTurn =
        (g.turn() === "w" && playerColor === "black") ||
        (g.turn() === "b" && playerColor === "white");

      if (!botTurn || g.isGameOver()) return;

      setThinking(true);
      setTimeout(() => {
        const move = getBotMove(g, difficulty);
        if (move) {
          const newGame = new Chess(g.fen());
          const result = newGame.move(move);
          setGame(newGame);
          setFen(newGame.fen());
          setMoveHistory((h) => [...h, result.san]);
          updateStatus(newGame);
        }
        setThinking(false);
      }, 300);
    },
    [difficulty, playerColor, updateStatus]
  );

  useEffect(() => {
    if (started) runBotMove(game);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [moveHistory]);

  function onDrop(sourceSquare: Square, targetSquare: Square, piece: string) {
    if (thinking || game.isGameOver()) return false;

    const isPlayerTurn =
      (game.turn() === "w" && playerColor === "white") ||
      (game.turn() === "b" && playerColor === "black");
    if (!isPlayerTurn) return false;

    const promotion = piece[1]?.toLowerCase() === "p" &&
      ((targetSquare[1] === "8" && playerColor === "white") ||
       (targetSquare[1] === "1" && playerColor === "black"))
      ? "q"
      : undefined;

    try {
      const newGame = new Chess(game.fen());
      const move = newGame.move({ from: sourceSquare, to: targetSquare, promotion });
      if (!move) return false;

      setGame(newGame);
      setFen(newGame.fen());
      setMoveHistory((h) => [...h, move.san]);
      updateStatus(newGame);

      if (!newGame.isGameOver()) {
        setTimeout(() => runBotMove(newGame), 100);
      }
      return true;
    } catch {
      return false;
    }
  }

  function resetGame() {
    const newGame = new Chess();
    setGame(newGame);
    setFen("start");
    setMoveHistory([]);
    setThinking(false);
    setStarted(false);
    setStatus("Your turn");
  }

  function startGame() {
    setStarted(true);
    if (playerColor === "black") {
      setStatus("Bot is thinking…");
      runBotMove(game);
    } else {
      setStatus("Your turn");
    }
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-extrabold text-white">♟️ Chess vs Bot</h1>
          <p className="text-gray-400">Set your options and start playing</p>
        </div>

        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-purple-800 bg-[#1a1a2e] p-8">
          <div>
            <label className="mb-2 block text-sm font-semibold text-purple-300 uppercase tracking-wider">Difficulty</label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                    difficulty === d
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-purple-300 uppercase tracking-wider">Play as</label>
            <div className="flex gap-2">
              {(["white", "black"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setPlayerColor(c)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                    playerColor === c
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {c === "white" ? "⬜ White" : "⬛ Black"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full rounded-xl bg-purple-600 py-3 text-lg font-bold text-white hover:bg-purple-500 transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  const gameOver = game.isGameOver();

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="mb-1 text-3xl font-extrabold text-white">♟️ Chess vs Bot</h1>
        <p className="text-sm text-gray-400 capitalize">
          Playing as {playerColor} · {difficulty} difficulty
        </p>
      </div>

      <div
        className={`rounded-lg px-6 py-2 text-sm font-semibold ${
          gameOver
            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-600"
            : thinking
            ? "bg-blue-500/20 text-blue-300 border border-blue-700"
            : game.isCheck()
            ? "bg-red-500/20 text-red-300 border border-red-700"
            : "bg-purple-500/20 text-purple-200 border border-purple-700"
        }`}
      >
        {status}
      </div>

      <div className="flex gap-8 flex-wrap justify-center">
        <div className="w-[min(90vw,480px)]">
          <Chessboard
            id="chess-board"
            position={fen}
            onPieceDrop={onDrop}
            boardOrientation={playerColor}
            areArrowsAllowed={true}
            customBoardStyle={{
              borderRadius: "8px",
              boxShadow: "0 4px 40px rgba(124, 58, 237, 0.3)",
            }}
            customDarkSquareStyle={{ backgroundColor: "#4c1d95" }}
            customLightSquareStyle={{ backgroundColor: "#ede9fe" }}
          />
        </div>

        <div className="flex flex-col gap-4 min-w-[160px]">
          <div className="rounded-xl border border-purple-800 bg-[#1a1a2e] p-4">
            <h3 className="mb-3 text-xs font-semibold text-purple-400 uppercase tracking-widest">Move History</h3>
            <div
              ref={historyRef}
              className="max-h-64 overflow-y-auto space-y-1 pr-1"
            >
              {moveHistory.length === 0 && (
                <p className="text-xs text-gray-600">No moves yet</p>
              )}
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-300">
                  <span className="w-5 text-gray-600 shrink-0">{i + 1}.</span>
                  <span className="w-12">{moveHistory[i * 2]}</span>
                  <span className="w-12 text-gray-400">{moveHistory[i * 2 + 1] ?? ""}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="rounded-xl border border-purple-700 bg-[#1a1a2e] px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-900/40 transition-colors"
          >
            New Game
          </button>

          <a
            href="/"
            className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-center text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
          >
            ← Games
          </a>
        </div>
      </div>
    </div>
  );
}
