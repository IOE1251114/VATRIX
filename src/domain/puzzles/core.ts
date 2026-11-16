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

/** A row of labelled boxes (array slots, list nodes, tokens…). `caption` is shown under each. */
export type CellsBoard = {
  kind: "cells";
  values: string[];
  captions?: string[];
};

/** A rows × cols grid of clickable squares (e.g. an adjacency matrix). Pick = r * cols + c. */
export type GridBoard = {
  kind: "grid";
  rows: number;
  cols: number;
  rowHeads: string[];
  colHeads: string[];
};

/** How a box looks while playing: done (greyed), active (highlighted), later (not yet usable). */
export type CellMark = "done" | "active" | "later" | "fixed";

/** A line of status text shown under a board; ok colours it green/red. */
export type StatusLine = { text: string; ok?: boolean };

export type Vec = [number, number];

// ---------- Puzzle families ----------

/**
 * Click things in the right order (nodes, edges or bars). The first wrong click ends the attempt.
 * A pick is a node index, an edge index or a bar position.
 */
export type OrderPuzzle = {
  family: "order";
  board: GraphBoard | BarsBoard | CellsBoard;
  pick: "node" | "edge" | "bar" | "cell";
  /** The line that describes this particular board, e.g. "Start at C." */
  task: string;
  /** Picks already made for the student (e.g. the start vertex). */
  given: number[];
  /** Picks needed in all, including `given`. */
  length: number;
  /** Don't show how many picks are needed (when the count would give the answer away). */
  hideCount?: boolean;
  /** null if `pick` is a correct next move after `prefix`, otherwise the likely misconception. */
  check: (prefix: number[], pick: number) => string | null;
  /** A correct next move after `prefix` (used for hints and the worked answer). */
  next: (prefix: number[]) => number;
  /** How a pick is written, e.g. "C" or "A–D" (`prefix`: the picks made before it). */
  name: (pick: number, prefix: number[]) => string;
  /** For bar boards: the array after the picks so far, and how many places are final. */
  bars?: (prefix: number[]) => { values: number[]; fixed: number };
  /** For cell boards: the boxes after the picks so far (values, captions and marks). */
  cells?: (prefix: number[]) => {
    values: string[];
    captions?: string[];
    marks?: Record<number, CellMark>;
  };
  /** The instruction for the next pick, e.g. "Insert 23". */
  step?: (prefix: number[]) => string;
  /** Fixed text shown above the board (code, a list of operations…). */
  lines?: string[];
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
  /** Weighted (travelling salesperson): the cycle must also have this smallest total weight. */
  best?: number;
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
  /** Dashed lines that need not pass through the origin: through `p`, along `d`. */
  offsetLines?: { p: Vec; d: Vec }[];
  /** Axis names, e.g. ["Re", "Im"] for the complex plane. */
  axes?: [string, string];
  /** Extra arrows shown once the hint is on (e.g. the columns of A). */
  hintVectors?: { v: Vec; label: string; tone: "cyan" | "violet" | "gold" }[];
  /** With the hint on: an arrow drawn for the point under the pointer (e.g. A·x). */
  preview?: (pt: Vec) => Vec;
  hint?: string;
  explain: string;
};

/**
 * Choose a set of things (vertices, edges, boxes or grid squares), then press Check.
 * A pick is a node index, an edge index, a box position or r * cols + c on a grid.
 */
export type SelectPuzzle = {
  family: "select";
  board: GraphBoard | CellsBoard | GridBoard;
  pick: "node" | "edge" | "cell";
  /** A picture shown beside the board (not clickable), e.g. the graph for its matrix. */
  show?: GraphBoard;
  /** Things drawn highlighted from the start (e.g. a given independent set). */
  marked?: number[];
  task: string;
  lines?: string[];
  /** Live feedback while choosing, e.g. "Sum: 17 (target 23)" or which clauses are true. */
  status?: (chosen: number[]) => StatusLine[];
  /** null if the choice is correct, otherwise the likely misconception. */
  check: (chosen: number[]) => string | null;
  /** One correct choice (shown afterwards). */
  answer: number[];
  explain: string;
};

/** Fill in the blank cells of a table (numbers or fractions such as 3/4), then press Check. */
export type TablePuzzle = {
  family: "table";
  task: string;
  /** Fixed text shown above the table (code, the matrices involved…). */
  lines?: string[];
  /** A picture shown above the table (not clickable). */
  show?: GraphBoard;
  corner?: string;
  rowHeads?: string[];
  colHeads?: string[];
  /** Given cells as text; null marks a blank the student fills in; "" is an empty cell. */
  cells: (string | null)[][];
  /** The correct value for each blank (ignored elsewhere). */
  answers: (number | null)[][];
  /** Likely misconception for a wrong value in one cell (default: the puzzle's tag). */
  why?: (r: number, c: number, given: number) => string | null;
  explain: string;
};

export type Puzzle =
  | OrderPuzzle
  | SelectPuzzle
  | TablePuzzle
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

// ---------- Tables ----------

/** Read a typed number: "-3", "−3", "2.5" or a fraction "3/4". NaN if it isn't one. */
export function parseNum(text: string): number {
  const t = text.trim().replace(/−/g, "-").replace(/\s+/g, "");
  if (!t) return NaN;
  const m = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(t);
  if (m) return Number(m[2]) === 0 ? NaN : Number(m[1]) / Number(m[2]);
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

/** The blanks of a table puzzle that are wrong, and the misconception for the first one. */
export function gradeTable(
  pz: TablePuzzle,
  values: (number | null)[][],
): { wrong: Vec[]; why: string | null } {
  const wrong: Vec[] = [];
  let why: string | null = null;
  pz.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell !== null) return;
      const want = pz.answers[r]?.[c];
      const got = values[r]?.[c];
      if (want == null) return;
      if (got == null || !Number.isFinite(got) || Math.abs(got - want) > 1e-9) {
        wrong.push([r, c]);
        if (!why && got != null && Number.isFinite(got))
          why = pz.why?.(r, c, got) ?? null;
      }
    }),
  );
  return { wrong, why };
}

/** Write a number for display: whole numbers as is, others as a short fraction when possible. */
export function fmtNum(x: number): string {
  if (Number.isInteger(x)) return String(x).replace("-", "−");
  for (let d = 2; d <= 12; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-9) return `${n}/${d}`.replace("-", "−");
  }
  return String(Math.round(x * 1000) / 1000).replace("-", "−");
}

// ---------- Trees ----------

/**
 * Lay out a rooted tree (children listed left to right): leaves get evenly spaced columns,
 * each parent sits above the middle of its children.
 */
export function treeLayout(
  children: number[][],
  root: number,
  labels: string[],
  width = 600,
): GraphBoard {
  const n = labels.length;
  const x = Array(n).fill(0),
    depth = Array(n).fill(0);
  let leaf = 0,
    maxDepth = 0;
  const place = (v: number, d: number) => {
    depth[v] = d;
    maxDepth = Math.max(maxDepth, d);
    if (!children[v].length) x[v] = leaf++;
    else {
      children[v].forEach((c) => place(c, d + 1));
      const kids = children[v];
      x[v] = (x[kids[0]] + x[kids[kids.length - 1]]) / 2;
    }
  };
  place(root, 0);
  const edges: { a: number; b: number }[] = [];
  children.forEach((kids, v) =>
    kids.forEach((c) => edges.push({ a: v, b: c })),
  );
  const gap = Math.min(80, 280 / Math.max(1, maxDepth));
  return {
    kind: "graph",
    nodes: labels.map((label, v) => ({
      label,
      x: Math.round(((x[v] + 1) * width) / (leaf + 1)),
      y: Math.round(40 + depth[v] * gap),
    })),
    edges,
    directed: false,
    width,
    height: Math.round(40 + maxDepth * gap + 40),
  };
}

/** Reachability from `s` (directed if `directed`). */
export function reachable(
  n: number,
  edges: { a: number; b: number }[],
  s: number,
  directed = false,
  skip = -1,
  skipEdge = -1,
): Set<number> {
  const seen = new Set<number>([s]);
  const stack = [s];
  while (stack.length) {
    const v = stack.pop()!;
    edges.forEach((e, i) => {
      if (i === skipEdge) return;
      const nexts = directed
        ? e.a === v
          ? [e.b]
          : []
        : e.a === v
          ? [e.b]
          : e.b === v
            ? [e.a]
            : [];
      for (const w of nexts)
        if (w !== skip && !seen.has(w)) {
          seen.add(w);
          stack.push(w);
        }
    });
  }
  return seen;
}

/** Compare two choices as sets. */
export const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
