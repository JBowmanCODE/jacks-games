"use client";

import { useState, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID  = 10;
const SHIPS = [
  { name: "Carrier",    size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser",    size: 3 },
  { name: "Submarine",  size: 3 },
  { name: "Destroyer",  size: 2 },
];

type Cell = { ship: number | null; hit: boolean; miss: boolean };
type Grid = Cell[][];
type Orientation = "H" | "V";
type Phase = "place" | "battle" | "won" | "lost";

function emptyGrid(): Grid {
  return Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => ({ ship: null, hit: false, miss: false }))
  );
}

function canPlace(grid: Grid, row: number, col: number, size: number, dir: Orientation) {
  for (let i = 0; i < size; i++) {
    const r = dir === "V" ? row + i : row;
    const c = dir === "H" ? col + i : col;
    if (r >= GRID || c >= GRID) return false;
    if (grid[r][c].ship !== null) return false;
  }
  return true;
}

function placeShip(grid: Grid, shipIdx: number, row: number, col: number, size: number, dir: Orientation): Grid {
  const next = grid.map(r => r.map(c => ({ ...c })));
  for (let i = 0; i < size; i++) {
    const r = dir === "V" ? row + i : row;
    const c = dir === "H" ? col + i : col;
    next[r][c].ship = shipIdx;
  }
  return next;
}

function randomPlaceAll(): Grid {
  let grid = emptyGrid();
  SHIPS.forEach((ship, idx) => {
    let placed = false;
    while (!placed) {
      const dir = Math.random() > 0.5 ? "H" : "V";
      const row = Math.floor(Math.random() * GRID);
      const col = Math.floor(Math.random() * GRID);
      if (canPlace(grid, row, col, ship.size, dir)) {
        grid = placeShip(grid, idx, row, col, ship.size, dir);
        placed = true;
      }
    }
  });
  return grid;
}

function isFleetSunk(grid: Grid) {
  return grid.every(row => row.every(c => c.ship === null || c.hit));
}

function cellLabel(c: number) { return String.fromCharCode(65 + c); }
function rowLabel(r: number)  { return String(r + 1); }

// ── Smart bot logic ────────────────────────────────────────────────────────────
function botShoot(playerGrid: Grid, botMemory: { hits: [number, number][]; lastHit: [number, number] | null }): [number, number] {
  // If there's a last hit, try adjacent unsearched cells first
  if (botMemory.lastHit) {
    const [lr, lc] = botMemory.lastHit;
    const adjacent: [number, number][] = [
      [lr - 1, lc], [lr + 1, lc], [lr, lc - 1], [lr, lc + 1],
    ];
    for (const [r, c] of adjacent) {
      if (r >= 0 && r < GRID && c >= 0 && c < GRID && !playerGrid[r][c].hit && !playerGrid[r][c].miss) {
        return [r, c];
      }
    }
  }
  // Random untried cell
  const candidates: [number, number][] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (!playerGrid[r][c].hit && !playerGrid[r][c].miss) {
        candidates.push([r, c]);
      }
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OceanBattle() {
  const [phase,         setPhase]         = useState<Phase>("place");
  const [playerGrid,    setPlayerGrid]    = useState<Grid>(emptyGrid());
  const [botGrid,       setBotGrid]       = useState<Grid>(randomPlaceAll());
  const [shipIdx,       setShipIdx]       = useState(0);     // which ship we're placing
  const [orientation,   setOrientation]   = useState<Orientation>("H");
  const [hoverCells,    setHoverCells]    = useState<[number, number][]>([]);
  const [message,       setMessage]       = useState("Place your Carrier (5)");
  const [botMemory,     setBotMemory]     = useState<{ hits: [number, number][]; lastHit: [number, number] | null }>({ hits: [], lastHit: null });
  const [playerSunk,    setPlayerSunk]    = useState<boolean[]>(SHIPS.map(() => false));
  const [botSunk,       setBotSunk]       = useState<boolean[]>(SHIPS.map(() => false));
  const [botThinking,   setBotThinking]   = useState(false);

  // ── Placement ──────────────────────────────────────────────────────
  const ship = SHIPS[shipIdx];

  function getHoverCells(row: number, col: number): [number, number][] {
    if (!ship) return [];
    const cells: [number, number][] = [];
    for (let i = 0; i < ship.size; i++) {
      const r = orientation === "V" ? row + i : row;
      const c = orientation === "H" ? col + i : col;
      cells.push([r, c]);
    }
    return cells;
  }

  function handlePlaceClick(row: number, col: number) {
    if (phase !== "place" || !ship) return;
    if (!canPlace(playerGrid, row, col, ship.size, orientation)) return;
    const next = placeShip(playerGrid, shipIdx, row, col, ship.size, orientation);
    setPlayerGrid(next);
    if (shipIdx + 1 >= SHIPS.length) {
      setPhase("battle");
      setMessage("All ships placed! Fire at the enemy grid →");
    } else {
      setShipIdx(shipIdx + 1);
      setMessage(`Place your ${SHIPS[shipIdx + 1].name} (${SHIPS[shipIdx + 1].size})`);
    }
    setHoverCells([]);
  }

  function autoPlace() {
    setPlayerGrid(randomPlaceAll());
    setShipIdx(SHIPS.length);
    setPhase("battle");
    setMessage("All ships placed! Fire at the enemy grid →");
  }

  // ── Battle ─────────────────────────────────────────────────────────
  const fireAt = useCallback((row: number, col: number) => {
    if (phase !== "battle" || botThinking) return;
    const cell = botGrid[row][col];
    if (cell.hit || cell.miss) return;

    const nextBotGrid = botGrid.map(r => r.map(c => ({ ...c })));
    const isHit = cell.ship !== null;
    if (isHit) {
      nextBotGrid[row][col].hit = true;
      // Check if ship sunk
      const sunkIdx = cell.ship!;
      const sunk = nextBotGrid.every(r => r.every(c => c.ship !== sunkIdx || c.hit));
      const newBotSunk = [...botSunk];
      if (sunk) newBotSunk[sunkIdx] = true;
      setBotSunk(newBotSunk);
      setBotGrid(nextBotGrid);

      if (isFleetSunk(nextBotGrid)) {
        setPhase("won");
        setMessage("🎉 You sank the entire enemy fleet! YOU WIN!");
        return;
      }
      setMessage(sunk ? `Hit! You sank their ${SHIPS[sunkIdx].name}! 💥` : "Direct hit! 💥");
    } else {
      nextBotGrid[row][col].miss = true;
      setBotGrid(nextBotGrid);
      setMessage("Miss! 💧");
    }

    // Bot's turn
    setBotThinking(true);
    setTimeout(() => {
      const [br, bc] = botShoot(playerGrid, botMemory);
      const nextPlayerGrid = playerGrid.map(r => r.map(c => ({ ...c })));
      const botHit = playerGrid[br][bc].ship !== null;

      let newMemory = { ...botMemory };
      if (botHit) {
        nextPlayerGrid[br][bc].hit = true;
        newMemory = { hits: [...botMemory.hits, [br, bc]], lastHit: [br, bc] };
        // Check player ship sunk
        const sunkIdx = playerGrid[br][bc].ship!;
        const sunk = nextPlayerGrid.every(r => r.every(c => c.ship !== sunkIdx || c.hit));
        const newPlayerSunk = [...playerSunk];
        if (sunk) { newPlayerSunk[sunkIdx] = true; newMemory.lastHit = null; }
        setPlayerSunk(newPlayerSunk);
        setPlayerGrid(nextPlayerGrid);
        setMessage(sunk ? `Bot sank your ${SHIPS[sunkIdx].name}! 😱` : "Bot hit one of your ships! 😬");
        if (isFleetSunk(nextPlayerGrid)) {
          setPhase("lost");
          setMessage("💀 Bot sank your entire fleet! Game over.");
          setBotThinking(false);
          return;
        }
      } else {
        nextPlayerGrid[br][bc].miss = true;
        newMemory = { ...botMemory, lastHit: null };
        setPlayerGrid(nextPlayerGrid);
        setMessage("Bot missed. Your turn!");
      }

      setBotMemory(newMemory);
      setBotThinking(false);
    }, 800);
  }, [phase, botThinking, botGrid, playerGrid, botMemory, botSunk, playerSunk]);

  function resetGame() {
    setPhase("place");
    setPlayerGrid(emptyGrid());
    setBotGrid(randomPlaceAll());
    setShipIdx(0);
    setOrientation("H");
    setHoverCells([]);
    setMessage(`Place your ${SHIPS[0].name} (${SHIPS[0].size})`);
    setBotMemory({ hits: [], lastHit: null });
    setPlayerSunk(SHIPS.map(() => false));
    setBotSunk(SHIPS.map(() => false));
    setBotThinking(false);
  }

  // ── Render helpers ─────────────────────────────────────────────────
  function playerCellStyle(r: number, c: number) {
    const cell = playerGrid[r][c];
    const inHover = hoverCells.some(([hr, hc]) => hr === r && hc === c);
    const validHover = hoverCells.length === (ship?.size ?? 0);

    if (cell.hit)  return "bg-red-600 border-red-500";
    if (cell.miss) return "bg-blue-900/40 border-blue-800";
    if (inHover)   return validHover ? "bg-green-600/60 border-green-400 cursor-pointer" : "bg-red-700/50 border-red-600 cursor-not-allowed";
    if (cell.ship !== null) return "bg-gray-500 border-gray-400";
    return "bg-blue-950 border-blue-800/50 hover:bg-blue-900";
  }

  function botCellStyle(r: number, c: number) {
    const cell = botGrid[r][c];
    if (cell.hit)  return "bg-red-600 border-red-500 cursor-default";
    if (cell.miss) return "bg-blue-900/40 border-blue-800 cursor-default";
    return "bg-blue-950 border-blue-800/50 hover:bg-red-800/50 cursor-crosshair";
  }

  const canFire = phase === "battle" && !botThinking;

  return (
    <div className="flex flex-col items-center gap-5 px-4 max-w-3xl mx-auto w-full">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">⚓ Ocean Battle</h1>
        <p className="text-sm text-gray-400 mt-1">Sink the enemy fleet before they sink yours!</p>
      </div>

      {/* Status message */}
      <div className={`rounded-xl px-5 py-2.5 text-sm font-bold border text-center w-full max-w-md ${
        phase === "won"  ? "bg-green-900/40 border-green-600 text-green-200" :
        phase === "lost" ? "bg-red-900/40 border-red-600 text-red-200" :
        "bg-purple-900/30 border-purple-700 text-purple-200"
      }`}>
        {message}
      </div>

      {/* Placement controls */}
      {phase === "place" && (
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => setOrientation(o => o === "H" ? "V" : "H")}
            className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Rotate: {orientation === "H" ? "Horizontal →" : "Vertical ↓"}
          </button>
          <button
            onClick={autoPlace}
            className="rounded-xl border border-purple-700 bg-purple-900/30 px-4 py-2 text-sm font-semibold text-purple-200 hover:bg-purple-800/40 transition-colors"
          >
            Auto-Place All
          </button>
        </div>
      )}

      {/* Fleet status */}
      <div className="flex flex-wrap gap-3 justify-center text-xs">
        <div className="space-y-1">
          <p className="text-gray-500 font-semibold uppercase tracking-wide text-center">Your Fleet</p>
          {SHIPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-1.5 ${playerSunk[i] ? "opacity-30 line-through" : "text-gray-300"}`}>
              <span>{"▪".repeat(s.size)}</span><span>{s.name}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-gray-500 font-semibold uppercase tracking-wide text-center">Enemy Fleet</p>
          {SHIPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-1.5 ${botSunk[i] ? "opacity-30 line-through text-red-400" : "text-gray-300"}`}>
              <span>{"▪".repeat(s.size)}</span><span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grids */}
      <div className="flex flex-wrap gap-6 justify-center w-full">
        {/* Player grid */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-1 text-center">YOUR OCEAN</p>
          <div className="flex">
            <div className="flex flex-col mr-1">
              <div className="w-5 h-5" />
              {Array.from({ length: GRID }, (_, r) => (
                <div key={r} className="w-5 h-[26px] flex items-center justify-center text-[9px] text-gray-600">{rowLabel(r)}</div>
              ))}
            </div>
            <div>
              <div className="flex mb-0.5">
                {Array.from({ length: GRID }, (_, c) => (
                  <div key={c} className="w-[26px] h-5 flex items-center justify-center text-[9px] text-gray-600">{cellLabel(c)}</div>
                ))}
              </div>
              <div className="border border-blue-800">
                {Array.from({ length: GRID }, (_, r) => (
                  <div key={r} className="flex">
                    {Array.from({ length: GRID }, (_, c) => (
                      <div
                        key={c}
                        className={`w-[26px] h-[26px] border ${
                          phase === "place" ? playerCellStyle(r, c) : (
                            playerGrid[r][c].hit  ? "bg-red-600 border-red-500" :
                            playerGrid[r][c].miss ? "bg-blue-900/40 border-blue-800" :
                            playerGrid[r][c].ship !== null ? "bg-gray-500 border-gray-400" :
                            "bg-blue-950 border-blue-800/50"
                          )
                        } transition-colors`}
                        onMouseEnter={() => {
                          if (phase === "place") setHoverCells(getHoverCells(r, c));
                        }}
                        onMouseLeave={() => phase === "place" && setHoverCells([])}
                        onClick={() => phase === "place" && handlePlaceClick(r, c)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bot grid */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-1 text-center">ENEMY OCEAN {botThinking ? "⏳" : ""}</p>
          <div className="flex">
            <div className="flex flex-col mr-1">
              <div className="w-5 h-5" />
              {Array.from({ length: GRID }, (_, r) => (
                <div key={r} className="w-5 h-[26px] flex items-center justify-center text-[9px] text-gray-600">{rowLabel(r)}</div>
              ))}
            </div>
            <div>
              <div className="flex mb-0.5">
                {Array.from({ length: GRID }, (_, c) => (
                  <div key={c} className="w-[26px] h-5 flex items-center justify-center text-[9px] text-gray-600">{cellLabel(c)}</div>
                ))}
              </div>
              <div className="border border-blue-800">
                {Array.from({ length: GRID }, (_, r) => (
                  <div key={r} className="flex">
                    {Array.from({ length: GRID }, (_, c) => (
                      <div
                        key={c}
                        className={`w-[26px] h-[26px] border ${botCellStyle(r, c)} transition-colors`}
                        onClick={() => canFire && fireAt(r, c)}
                      >
                        {botGrid[r][c].hit  && <span className="flex items-center justify-center w-full h-full text-[10px]">💥</span>}
                        {botGrid[r][c].miss && <span className="flex items-center justify-center w-full h-full text-[10px]">·</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(phase === "won" || phase === "lost") && (
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={resetGame} className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500 active:scale-95 transition-all">
            Play Again
          </button>
          <a href="/" className="rounded-xl border border-gray-700 bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
            ← Games
          </a>
        </div>
      )}
      {phase === "battle" && (
        <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Back to Games</a>
      )}
    </div>
  );
}
