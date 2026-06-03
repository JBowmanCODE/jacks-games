"use client";

import { useState, useCallback } from "react";
import { getTwoPlayers, STAT_LABELS, STAT_EMOJI, type Player } from "./players";

const ROUNDS = 10;
type StatKey = keyof Player["stats"];
type RoundPhase = "pick" | "reveal" | "done";

function StatRow({
  statKey,
  value,
  highlight,
  winner,
  onClick,
  clickable,
}: {
  statKey: StatKey;
  value: number;
  highlight: boolean;
  winner?: boolean | null;
  onClick?: () => void;
  clickable: boolean;
}) {
  const base =
    "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-all border select-none";
  const style = highlight
    ? winner === true
      ? `${base} bg-green-800/60 border-green-600 text-green-200`
      : winner === false
      ? `${base} bg-red-800/50 border-red-700 text-red-300`
      : `${base} bg-purple-700/60 border-purple-500 text-white`
    : clickable
    ? `${base} bg-gray-800/60 border-gray-700 text-gray-200 hover:bg-purple-800/50 hover:border-purple-600 cursor-pointer active:scale-95`
    : `${base} bg-gray-800/40 border-gray-800 text-gray-400`;

  return (
    <button
      type="button"
      className={`${style} w-full text-left`}
      onClick={onClick}
      disabled={!clickable}
    >
      <span className="text-xs sm:text-sm">
        {STAT_EMOJI[statKey]} {STAT_LABELS[statKey]}
      </span>
      <span className="font-bold text-sm sm:text-base shrink-0">{value.toLocaleString()}</span>
    </button>
  );
}

function PlayerCard({
  player,
  chosenStat,
  revealed,
  isWinner,
  onStatPick,
  isPlayerCard,
}: {
  player: Player;
  chosenStat: StatKey | null;
  revealed: boolean;
  isWinner: boolean | null;
  onStatPick: (s: StatKey) => void;
  isPlayerCard: boolean;
}) {
  const statKeys = Object.keys(player.stats) as StatKey[];
  const cardBorder =
    revealed && isWinner === true
      ? "border-green-500 shadow-green-900/40"
      : revealed && isWinner === false
      ? "border-red-600 shadow-red-900/40"
      : "border-purple-800";

  return (
    <div
      className={`flex-1 min-w-0 rounded-2xl border-2 ${cardBorder} bg-[#1a1a2e] p-4 shadow-xl transition-all`}
    >
      {/* Player header */}
      <div className="mb-3 text-center">
        <div className="text-3xl sm:text-4xl mb-1">{player.flag}</div>
        <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight">
          {player.name}
        </h3>
        <p className="text-xs text-gray-400">{player.nationality}</p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
            player.era === "Current"
              ? "bg-blue-900/60 text-blue-300"
              : "bg-amber-900/60 text-amber-300"
          }`}
        >
          {player.era}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-1.5">
        {statKeys.map((key) => {
          const isChosen = chosenStat === key;
          const showValue = isPlayerCard || revealed;
          const winner =
            isChosen && revealed ? isWinner : null;
          return (
            <StatRow
              key={key}
              statKey={key}
              value={showValue ? player.stats[key] : 0}
              highlight={isChosen}
              winner={winner}
              onClick={isPlayerCard && !chosenStat ? () => onStatPick(key) : undefined}
              clickable={isPlayerCard && !chosenStat}
            />
          );
        })}
        {/* Hidden opponent stats placeholder */}
        {!isPlayerCard && !revealed && (
          <div className="mt-1 text-center text-xs text-gray-600 italic">
            Stats hidden — pick a stat to reveal!
          </div>
        )}
      </div>

      {/* Result badge */}
      {revealed && isWinner !== null && (
        <div
          className={`mt-3 rounded-xl py-1.5 text-center text-sm font-bold ${
            isWinner
              ? "bg-green-700/50 text-green-200"
              : "bg-red-800/50 text-red-300"
          }`}
        >
          {isWinner ? "✅ Wins!" : "❌ Loses"}
        </div>
      )}
    </div>
  );
}

function getVerdict(score: number) {
  if (score === 10) return "⭐ PERFECT! You're a football genius!";
  if (score >= 8)   return "🔥 Excellent! You really know your players!";
  if (score >= 6)   return "👍 Good game! You know your stuff!";
  if (score >= 4)   return "💪 Not bad — keep playing to improve!";
  return              "😅 Tough one! Have another go!";
}

export default function FootballGame() {
  const [phase,        setPhase]        = useState<RoundPhase>("pick");
  const [round,        setRound]        = useState(1);
  const [score,        setScore]        = useState(0);
  const [playerCard,   setPlayerCard]   = useState<Player>(() => getTwoPlayers()[0]);
  const [opponentCard, setOpponentCard] = useState<Player>(() => getTwoPlayers()[1]);
  const [chosenStat,   setChosenStat]   = useState<StatKey | null>(null);
  const [playerWon,    setPlayerWon]    = useState<boolean | null>(null);
  const [gameOver,     setGameOver]     = useState(false);

  const pickStat = useCallback(
    (stat: StatKey) => {
      const pVal = playerCard.stats[stat];
      const oVal = opponentCard.stats[stat];
      const won = pVal > oVal;
      const draw = pVal === oVal;
      setChosenStat(stat);
      setPlayerWon(draw ? null : won);
      if (!draw && won) setScore((s) => s + 1);
      setPhase("reveal");
    },
    [playerCard, opponentCard]
  );

  const nextRound = useCallback(() => {
    if (round >= ROUNDS) {
      setGameOver(true);
      return;
    }
    const [p, o] = getTwoPlayers();
    setPlayerCard(p);
    setOpponentCard(o);
    setChosenStat(null);
    setPlayerWon(null);
    setPhase("pick");
    setRound((r) => r + 1);
  }, [round]);

  const restart = useCallback(() => {
    const [p, o] = getTwoPlayers();
    setPlayerCard(p);
    setOpponentCard(o);
    setChosenStat(null);
    setPlayerWon(null);
    setScore(0);
    setRound(1);
    setPhase("pick");
    setGameOver(false);
  }, []);

  // ── Game Over ─────────────────────────────────────────────────────
  if (gameOver) {
    return (
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Full Time!</h1>
          <p className="text-base font-semibold text-purple-300">{getVerdict(score)}</p>
        </div>
        <div className="rounded-2xl border border-purple-700 bg-[#1a1a2e] px-10 py-6 text-center">
          <p className="text-5xl font-extrabold text-white">
            {score}<span className="text-2xl text-gray-400">/{ROUNDS}</span>
          </p>
          <p className="mt-1 text-gray-400 text-sm">rounds won</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={restart}
            className="rounded-xl bg-purple-600 px-8 py-3 text-base font-bold text-white hover:bg-purple-500 active:scale-95 transition-all"
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

  const isDrawRound = phase === "reveal" && playerWon === null;

  return (
    <div className="flex flex-col items-center gap-5 px-4 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">⚽ Football Top Trumps</h1>
        <p className="text-sm text-gray-400 mt-1">Round {round}/{ROUNDS} · Score: {score}</p>
      </div>

      {/* Instruction */}
      <div className="rounded-xl border border-purple-800 bg-purple-900/20 px-5 py-2.5 text-sm text-purple-200 text-center w-full max-w-md">
        {phase === "pick"
          ? "👇 Tap a stat on YOUR card to play it against the opponent"
          : isDrawRound
          ? "🤝 It's a draw — no point scored!"
          : playerWon
          ? "✅ Your stat was higher — you win this round!"
          : "❌ Opponent's stat was higher — they win this round!"}
      </div>

      {/* Cards */}
      <div className="flex gap-3 sm:gap-4 w-full">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="text-xs text-center font-semibold text-green-400">YOUR CARD</p>
          <PlayerCard
            player={playerCard}
            chosenStat={chosenStat}
            revealed={phase === "reveal"}
            isWinner={playerWon}
            onStatPick={pickStat}
            isPlayerCard={true}
          />
        </div>
        <div className="flex items-center justify-center text-gray-600 font-bold text-lg pt-6">
          VS
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="text-xs text-center font-semibold text-red-400">OPPONENT</p>
          <PlayerCard
            player={opponentCard}
            chosenStat={chosenStat}
            revealed={phase === "reveal"}
            isWinner={playerWon === null ? null : !playerWon}
            onStatPick={() => {}}
            isPlayerCard={false}
          />
        </div>
      </div>

      {/* Next round button */}
      {phase === "reveal" && (
        <button
          onClick={nextRound}
          className="rounded-xl bg-purple-600 px-8 py-3 text-base font-bold text-white hover:bg-purple-500 active:scale-95 transition-all touch-manipulation w-full max-w-xs"
        >
          {round >= ROUNDS ? "See Final Score →" : "Next Round →"}
        </button>
      )}

      <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
        ← Back to Games
      </a>
    </div>
  );
}
