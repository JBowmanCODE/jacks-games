export type Difficulty = "easy" | "medium" | "hard";
export type Board = (number | null)[][];

// Base valid Sudoku solution (rows cycle by +3)
const BASE: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSolution(): number[][] {
  let grid = BASE.map((row) => [...row]);

  // Shuffle rows within each row-band (preserves validity)
  for (let band = 0; band < 3; band++) {
    const perm = shuffle([0, 1, 2]);
    const rows = perm.map((i) => grid[band * 3 + i]);
    grid[band * 3] = rows[0];
    grid[band * 3 + 1] = rows[1];
    grid[band * 3 + 2] = rows[2];
  }

  // Shuffle row-bands
  const bandPerm = shuffle([0, 1, 2]);
  const banded: number[][] = [];
  for (const b of bandPerm) {
    banded.push(grid[b * 3], grid[b * 3 + 1], grid[b * 3 + 2]);
  }
  grid = banded;

  // Shuffle columns within each col-stack
  for (let stack = 0; stack < 3; stack++) {
    const perm = shuffle([0, 1, 2]);
    for (const row of grid) {
      const cols = perm.map((i) => row[stack * 3 + i]);
      row[stack * 3] = cols[0];
      row[stack * 3 + 1] = cols[1];
      row[stack * 3 + 2] = cols[2];
    }
  }

  // Shuffle col-stacks
  const stackPerm = shuffle([0, 1, 2]);
  for (const row of grid) {
    const newRow: number[] = [];
    for (const s of stackPerm) {
      newRow.push(row[s * 3], row[s * 3 + 1], row[s * 3 + 2]);
    }
    row.splice(0, 9, ...newRow);
  }

  // Relabel numbers (e.g. every 1 → 7, every 2 → 3, etc.)
  const numMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return grid.map((row) => row.map((n) => numMap[n - 1]));
}

// Cells to REMOVE per difficulty
const REMOVE: Record<Difficulty, number> = {
  easy: 35,    // ~46 given — lots of clues for 8 year olds
  medium: 46,  // ~35 given — standard Sudoku
  hard: 56,    // ~25 given — tough for 16+
};

export function generatePuzzle(difficulty: Difficulty): {
  puzzle: Board;
  solution: number[][];
} {
  const solution = generateSolution();
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  const puzzle: Board = solution.map((row) => [...row]);
  for (let i = 0; i < REMOVE[difficulty]; i++) {
    const row = Math.floor(positions[i] / 9);
    const col = positions[i] % 9;
    puzzle[row][col] = null;
  }
  return { puzzle, solution };
}

export function isBoardComplete(board: Board, solution: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}
