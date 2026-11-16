/* Shared pieces for the interactive puzzles: a seeded random generator, setting readers and the
 * shapes of each puzzle family. Every puzzle is rebuilt from (settings, seed), so the same seed
 * always gives the same board. */

export type Rng = () => number;

/** mulberry32: small, fast, good enough for drawing boards. */
export function makeRng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from lo to hi, both included. */
export const int = (r: Rng, lo: number, hi: number) =>
  lo + Math.floor(r() * (hi - lo + 1));

export function shuffle<T>(r: Rng, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const newSeed = () => Math.floor(Math.random() * 1_000_000_000);

/** Settings as stored in the problems table's `puzzle` column, e.g. {"type": "bfs", "nodes": 7}. */
export type Settings = { type: string; [key: string]: unknown };

/** Read a whole-number setting, falling back to `def` and keeping it within lo..hi. */
export function opt(
  s: Settings,
  key: string,
  def: number,
  lo: number,
  hi: number,
): number {
  const v = Number(s[key]);
  if (!Number.isFinite(v)) return def;
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

/** Read a text setting that must be one of `choices`. */
export function pick<T extends string>(
  s: Settings,
  key: string,
  choices: readonly T[],
  def: T,
): T {
  const v = s[key];
  return typeof v === "string" && (choices as readonly string[]).includes(v)
    ? (v as T)
    : def;
}

export const LETTERS = "ABCDEFGHIJKLMNOP";

// ---------- Boards ----------

export type GraphBoard = {
  kind: "graph";
  nodes: { label: string; x: number; y: number }[];
  edges: { a: number; b: number; w?: number }[];
  directed: boolean;
  /** SVG view size. */
  width: number;
  height: number;
};

export type BarsBoard = { kind: "bars"; values: number[] };

export type Vec = [number, number];

// ---------- Puzzle families ----------

/**
 * Click things in the right order (nodes, edges or bars). The first wrong click ends the attempt.
 * A pick is a node index, an edge index or a bar position.
 */
export type OrderPuzzle = {
  family: "order";
  board: GraphBoard | BarsBoard;
  pick: "node" | "edge" | "bar";
  /** The line that describes this particular board, e.g. "Start at C." */
  task: string;
  /** Picks already made for the student (e.g. the start vertex). */
  given: number[];
  /** Picks needed in all, including `given`. */
  length: number;
  /** null if `pick` is a correct next move after `prefix`, otherwise the likely misconception. */
  check: (prefix: number[], pick: number) => string | null;
  /** A correct next move after `prefix` (used for hints and the worked answer). */
  next: (prefix: number[]) => number;
  /** How a pick is written, e.g. "C" or "A–D" (`prefix`: the picks made before it). */
  name: (pick: number, prefix: number[]) => string;
  /** For bar boards: the array after the picks so far, and how many places are final. */
  bars?: (prefix: number[]) => { values: number[]; fixed: number };
  /** Why the correct order is what it is. */
  explain: string;
};

/** Build a cycle through every vertex (backtracking allowed: click the last vertex to undo). */
export type CyclePuzzle = {
  family: "cycle";
  board: GraphBoard;
  start: number;
  task: string;
  solution: number[];
  explain: string;
};

/** Place n queens so that none attack each other. */
export type QueensPuzzle = {
  family: "queens";
  n: number;
  task: string;
  /** null if the queens solve the puzzle, otherwise what is wrong. Cells are [row, col]. */
  check: (queens: Vec[]) => string | null;
  /** One solution: solution[row] = column. */
  solution: number[];
  explain: string;
};

/** Walk from the entrance to the exit; click a cell on your path to step back to it. */
export type MazePuzzle = {
  family: "maze";
  size: number;
  /** open[r][c] is true for a corridor cell. */
  open: boolean[][];
  start: Vec;
  end: Vec;
  /** The only route without dead ends, entrance to exit. */
  solution: Vec[];
  task: string;
  explain: string;
};

/** Move the tower from peg A to peg C. */
export type HanoiPuzzle = {
  family: "hanoi";
  disks: number;
  task: string;
  min: number;
  explain: string;
};

/** Click one point of the integer grid. */
export type PlanePuzzle = {
  family: "plane";
  /** The grid runs from -range to range on both axes. */
  range: number;
  vectors: { v: Vec; label: string; tone: "cyan" | "violet" | "gold" }[];
  /** A 2×2 matrix shown beside the grid, rows first. */
  matrix?: [Vec, Vec];
  task: string;
  /** null if the point is correct, otherwise the likely misconception. */
  check: (pt: Vec) => string | null;
  /** A correct point (shown afterwards). */
  answer: Vec;
  /** Dashed lines through the origin along these directions (e.g. the line to project onto). */
  lines?: Vec[];
  /** Extra arrows shown once the hint is on (e.g. the columns of A). */
  hintVectors?: { v: Vec; label: string; tone: "cyan" | "violet" | "gold" }[];
  /** With the hint on: an arrow drawn for the point under the pointer (e.g. A·x). */
  preview?: (pt: Vec) => Vec;
  hint?: string;
  explain: string;
};

export type Puzzle =
  | OrderPuzzle
  | CyclePuzzle
  | QueensPuzzle
  | MazePuzzle
  | HanoiPuzzle
  | PlanePuzzle;

// ---------- Graph helpers ----------

/** Node positions on an ellipse, in a shuffled order so letters don't simply go round it. */
export function ringLayout(
  r: Rng,
  n: number,
  width = 600,
  height = 340,
): { x: number; y: number }[] {
  const slots = shuffle(
    r,
    Array.from({ length: n }, (_, i) => i),
  );
  const cx = width / 2,
    cy = height / 2,
    rx = width / 2 - 50,
    ry = height / 2 - 40;
  return slots.map((k) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
    return {
      x: Math.round(cx + rx * Math.cos(a)),
      y: Math.round(cy + ry * Math.sin(a)),
    };
  });
}

/** Neighbours of every vertex in alphabetical (index) order. Undirected unless `directed`. */
export function neighbours(
  n: number,
  edges: { a: number; b: number }[],
  directed = false,
): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    adj[e.a].push(e.b);
    if (!directed) adj[e.b].push(e.a);
  }
  adj.forEach((l) => l.sort((x, y) => x - y));
  return adj;
}

/** A random connected undirected graph: a random spanning tree plus `extra` more edges. */
export function connectedEdges(
  r: Rng,
  n: number,
  extra: number,
): { a: number; b: number }[] {
  const order = shuffle(
    r,
    Array.from({ length: n }, (_, i) => i),
  );
  const seen = new Set<string>();
  const edges: { a: number; b: number }[] = [];
  const add = (a: number, b: number) => {
    const k = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || seen.has(k)) return false;
    seen.add(k);
    edges.push({ a: Math.min(a, b), b: Math.max(a, b) });
    return true;
  };
  for (let i = 1; i < n; i++) add(order[i], order[int(r, 0, i - 1)]);
  const maxEdges = (n * (n - 1)) / 2;
  let tries = 0;
  while (edges.length < Math.min(n - 1 + extra, maxEdges) && tries++ < 500)
    add(int(r, 0, n - 1), int(r, 0, n - 1));
  return edges;
}

export const arrow = (labels: string[]) => labels.join(" → ");
