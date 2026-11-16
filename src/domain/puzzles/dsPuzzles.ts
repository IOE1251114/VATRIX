/* Data-structure puzzles: tree traversal orders, BST search paths, selection sort passes,
 * N-Queens, mazes and the Tower of Hanoi. */
import {
  int,
  opt,
  pick,
  shuffle,
  type GraphBoard,
  type HanoiPuzzle,
  type MazePuzzle,
  type OrderPuzzle,
  type QueensPuzzle,
  type Rng,
  type Settings,
  type Vec,
} from "./core";

// ---------- Binary search trees ----------

type Bst = {
  keys: number[];
  left: number[];
  right: number[];
  parent: number[];
  depth: number[];
};

/** Insert distinct keys in the given order (index 0 is the root). */
export function buildBst(keys: number[]): Bst {
  const n = keys.length;
  const t: Bst = {
    keys,
    left: Array(n).fill(-1),
    right: Array(n).fill(-1),
    parent: Array(n).fill(-1),
    depth: Array(n).fill(0),
  };
  for (let i = 1; i < n; i++) {
    let cur = 0;
    for (;;) {
      const side = keys[i] < keys[cur] ? t.left : t.right;
      if (side[cur] < 0) {
        side[cur] = i;
        t.parent[i] = cur;
        t.depth[i] = t.depth[cur] + 1;
        break;
      }
      cur = side[cur];
    }
  }
  return t;
}

/** Random distinct keys whose BST is no deeper than `maxDepth` (so it fits on screen). */
function randomBst(r: Rng, n: number, maxDepth = 3): Bst {
  let best: Bst | null = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const keys = shuffle(
      r,
      Array.from({ length: 89 }, (_, i) => i + 10),
    ).slice(0, n);
    const t = buildBst(keys);
    if (!best || Math.max(...t.depth) < Math.max(...best.depth)) best = t;
    if (Math.max(...t.depth) <= maxDepth) return t;
  }
  return best!;
}

function treeBoard(t: Bst): GraphBoard {
  const n = t.keys.length;
  const inorder = traverse(t, "inorder");
  const xIndex = Array(n).fill(0);
  inorder.forEach((v, i) => (xIndex[v] = i));
  const levels = Math.max(...t.depth) + 1;
  const height = 60 + (levels - 1) * 80 + 40;
  const edges: { a: number; b: number }[] = [];
  for (let v = 0; v < n; v++)
    if (t.parent[v] >= 0) edges.push({ a: t.parent[v], b: v });
  return {
    kind: "graph",
    nodes: t.keys.map((k, v) => ({
      label: String(k),
      x: Math.round(((xIndex[v] + 1) * 600) / (n + 1)),
      y: 40 + t.depth[v] * 80,
    })),
    edges,
    directed: false,
    width: 600,
    height,
  };
}

export const ORDERS = ["preorder", "inorder", "postorder", "level"] as const;
type Order = (typeof ORDERS)[number];
const ORDER_NAME: Record<Order, string> = {
  preorder: "preorder",
  inorder: "inorder",
  postorder: "postorder",
  level: "level order",
};

export function traverse(t: Bst, order: Order): number[] {
  const out: number[] = [];
  if (order === "level") {
    const q = [0];
    while (q.length) {
      const v = q.shift()!;
      out.push(v);
      if (t.left[v] >= 0) q.push(t.left[v]);
      if (t.right[v] >= 0) q.push(t.right[v]);
    }
    return out;
  }
  const go = (v: number) => {
    if (v < 0) return;
    if (order === "preorder") out.push(v);
    go(t.left[v]);
    if (order === "inorder") out.push(v);
    go(t.right[v]);
    if (order === "postorder") out.push(v);
  };
  go(0);
  return out;
}

const RULE: Record<Order, string> = {
  preorder:
    "Preorder visits a node, then its left subtree, then its right subtree.",
  inorder:
    "Inorder visits the left subtree, then the node, then the right subtree (for a BST that gives the keys in increasing order).",
  postorder:
    "Postorder visits the left subtree, then the right subtree, and the node last.",
  level: "Level order visits the tree row by row, left to right (a queue).",
};

export function treeOrderPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 7, 4, 12);
  const order = pick(s, "order", ORDERS, "inorder");
  const t = randomBst(r, n);
  const b = treeBoard(t);
  const want = traverse(t, order);
  const others = ORDERS.filter((o) => o !== order).map(
    (o) => [o, traverse(t, o)] as const,
  );
  const L = t.keys.map(String);
  return {
    family: "order",
    board: b,
    pick: "node",
    task: `Click the nodes in ${ORDER_NAME[order]}.`,
    given: [],
    length: n,
    check: (prefix, p) => {
      const k = prefix.length;
      if (p === want[k]) return null;
      if (prefix.includes(p)) return "Visited a node twice";
      for (const [o, seq] of others)
        if (seq[k] === p && prefix.every((v, i) => seq[i] === v))
          return `Followed ${ORDER_NAME[o]} instead of ${ORDER_NAME[order]}`;
      return "Lost track of which subtree comes next";
    },
    next: (prefix) => want[prefix.length],
    name: (p) => L[p],
    explain: `${RULE[order]} Order: ${want.map((v) => L[v]).join(", ")}.`,
  };
}

export function bstSearchPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 8, 4, 12);
  const t = randomBst(r, n);
  const b = treeBoard(t);
  const present = r() < 0.5;
  let target: number;
  if (present) target = t.keys[int(r, 1, n - 1)];
  else
    do target = int(r, 10, 98);
    while (t.keys.includes(target));
  const path: number[] = [];
  const steps: string[] = [];
  for (let cur = 0; cur >= 0;) {
    path.push(cur);
    const k = t.keys[cur];
    if (k === target) {
      steps.push(`found ${k}`);
      break;
    }
    const goLeft = target < k;
    const nextNode = goLeft ? t.left[cur] : t.right[cur];
    steps.push(
      `${target} ${goLeft ? "<" : ">"} ${k} → ${goLeft ? "left" : "right"}`,
    );
    if (nextNode < 0)
      steps.push(
        `empty: ${target} is not in the tree (it would be inserted here)`,
      );
    cur = nextNode;
  }
  const L = t.keys.map(String);
  return {
    family: "order",
    board: b,
    pick: "node",
    task: `Search for ${target}: click every node the search compares ${target} with, from the root down.`,
    given: [],
    length: path.length,
    check: (prefix, p) => {
      const k = prefix.length;
      if (p === path[k]) return null;
      if (k === 0) return "A search always starts at the root";
      const prev = path[k - 1];
      if (p === t.left[prev] || p === t.right[prev])
        return "Went the wrong way: smaller keys are on the left, larger on the right";
      let a = t.parent[p];
      while (a >= 0 && a !== prev) a = t.parent[a];
      if (a === prev)
        return "Skipped a level: the search compares with every node on the way down";
      return "Left the search path";
    },
    next: (prefix) => path[prefix.length],
    name: (p) => L[p],
    explain: `At each node, go left if the key is smaller and right if it is larger: ${steps.join("; ")}.`,
  };
}

// ---------- Selection sort ----------

export function selectionPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "size", 7, 4, 10);
  const values = shuffle(
    r,
    Array.from({ length: 30 }, (_, i) => i + 1),
  ).slice(0, n);
  const state = (prefix: number[]) => {
    const a = [...values];
    prefix.forEach((p, i) => ([a[i], a[p]] = [a[p], a[i]]));
    return { values: a, fixed: prefix.length };
  };
  const argmin = (a: number[], from: number) => {
    let m = from;
    for (let i = from + 1; i < a.length; i++) if (a[i] < a[m]) m = i;
    return m;
  };
  const picks: number[] = [];
  while (picks.length < n - 1)
    picks.push(argmin(state(picks).values, picks.length));
  return {
    family: "order",
    board: { kind: "bars", values },
    pick: "bar",
    task: "Selection sort, smallest first. In each pass, click the bar that gets swapped into the first unsorted place.",
    given: [],
    length: n - 1,
    check: (prefix, p) => {
      const { values: a } = state(prefix);
      const i = prefix.length;
      if (p === argmin(a, i)) return null;
      if (p < i) return "Picked a value that is already in its sorted place";
      if (a[p] === Math.max(...a.slice(i)))
        return "Picked the largest value (that sorts in descending order)";
      if (p === i)
        return "Took the first unsorted value instead of searching for the smallest";
      return "Didn't scan the whole unsorted part for the smallest value";
    },
    next: (prefix) => argmin(state(prefix).values, prefix.length),
    name: (p, prefix) => String(state(prefix).values[p]),
    bars: state,
    explain: `Each pass scans the unsorted part for its smallest value and swaps it to the front: ${picks.map((p, i) => state(picks.slice(0, i)).values[p]).join(", ")}. That is n − 1 passes and about n²/2 comparisons, whatever the input.`,
  };
}

// ---------- N-Queens ----------

export function solveQueens(n: number, r?: Rng): number[] | null {
  const cols: number[] = [];
  const order = Array.from({ length: n }, (_, i) => i);
  const safe = (row: number, c: number) =>
    cols.every((cc, rr) => cc !== c && Math.abs(cc - c) !== row - rr);
  const go = (row: number): boolean => {
    if (row === n) return true;
    for (const c of r ? shuffle(r, order) : order)
      if (safe(row, c)) {
        cols.push(c);
        if (go(row + 1)) return true;
        cols.pop();
      }
    return false;
  };
  return go(0) ? cols : null;
}

export function queensPuzzle(s: Settings, r: Rng): QueensPuzzle {
  const n = opt(s, "n", 6, 4, 8);
  const solution = solveQueens(n, r)!;
  return {
    family: "queens",
    n,
    task: `Place ${n} queens so that no two share a row, a column or a diagonal. Click a square to add or remove a queen.`,
    check: (queens: Vec[]) => {
      if (queens.length !== n)
        return `Place exactly ${n} queens (you placed ${queens.length})`;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const [r1, c1] = queens[i],
            [r2, c2] = queens[j];
          if (r1 === r2) return "Two queens share a row";
          if (c1 === c2) return "Two queens share a column";
          if (Math.abs(r1 - r2) === Math.abs(c1 - c2))
            return "Two queens share a diagonal";
        }
      return null;
    },
    solution,
    explain: `Backtracking places one queen per row on a safe square; when a row has no safe square left, it goes back a row and moves that queen on. One solution (column in each row, from 1): ${solution.map((c) => c + 1).join(", ")}.`,
  };
}

// ---------- Maze ----------

export function makeMaze(r: Rng, rooms: number): boolean[][] {
  const size = rooms * 2 + 1;
  const open = Array.from({ length: size }, () => Array(size).fill(false));
  const stack: Vec[] = [[1, 1]];
  open[1][1] = true;
  const dirs: Vec[] = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ];
  while (stack.length) {
    const [y, x] = stack[stack.length - 1];
    const options = shuffle(r, dirs).filter(([dy, dx]) => {
      const ny = y + dy,
        nx = x + dx;
      return (
        ny > 0 && nx > 0 && ny < size - 1 && nx < size - 1 && !open[ny][nx]
      );
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dy, dx] = options[0];
    open[y + dy / 2][x + dx / 2] = true;
    open[y + dy][x + dx] = true;
    stack.push([y + dy, x + dx]);
  }
  return open;
}

/** Shortest route between two open cells (the only one, in a perfect maze). */
export function mazeRoute(open: boolean[][], a: Vec, b: Vec): Vec[] {
  const size = open.length;
  const prev = new Map<string, string>();
  const key = (v: Vec) => `${v[0]},${v[1]}`;
  const q: Vec[] = [a];
  prev.set(key(a), "");
  while (q.length) {
    const v = q.shift()!;
    if (v[0] === b[0] && v[1] === b[1]) break;
    for (const [dy, dx] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const w: Vec = [v[0] + dy, v[1] + dx];
      if (w[0] < 0 || w[1] < 0 || w[0] >= size || w[1] >= size) continue;
      if (!open[w[0]][w[1]] || prev.has(key(w))) continue;
      prev.set(key(w), key(v));
      q.push(w);
    }
  }
  const out: Vec[] = [];
  for (let k = key(b); k; k = prev.get(k) ?? "")
    out.unshift(k.split(",").map(Number) as Vec);
  return out;
}

export function mazePuzzle(s: Settings, r: Rng): MazePuzzle {
  const rooms = opt(s, "size", 6, 3, 10);
  const open = makeMaze(r, rooms);
  const size = rooms * 2 + 1;
  const start: Vec = [1, 1],
    end: Vec = [size - 2, size - 2];
  const solution = mazeRoute(open, start, end);
  return {
    family: "maze",
    size,
    open,
    start,
    end,
    solution,
    task: "Find the way from the green entrance to the gold exit. Click the next open square to step forward; click a square on your path to back up to it.",
    explain: `Solving a maze is backtracking: follow a corridor, and at a dead end go back to the last junction that still has an untried way. The route is ${solution.length - 1} steps long.`,
  };
}

// ---------- Tower of Hanoi ----------

/** Pegs hold disk sizes bottom to top (1 is the smallest). */
export type Pegs = [number[], number[], number[]];

export const hanoiStart = (disks: number): Pegs => [
  Array.from({ length: disks }, (_, i) => disks - i),
  [],
  [],
];

/** Can the top disk of `from` go onto `to`? */
export function hanoiLegal(pegs: Pegs, from: number, to: number): boolean {
  const a = pegs[from],
    b = pegs[to];
  if (from === to || !a.length) return false;
  return !b.length || b[b.length - 1] > a[a.length - 1];
}

export function hanoiMove(pegs: Pegs, from: number, to: number): Pegs {
  const next = pegs.map((p) => [...p]) as Pegs;
  next[to].push(next[from].pop()!);
  return next;
}

/** The first move of the shortest way from `pegs` to having every disk on `target`. */
export function hanoiBest(pegs: Pegs, target = 2): Vec | null {
  const where = (d: number) => pegs.findIndex((p) => p.includes(d));
  const first = (k: number, to: number): Vec | null => {
    if (k === 0) return null;
    const at = where(k);
    if (at === to) return first(k - 1, to);
    const spare = 3 - at - to;
    return first(k - 1, spare) ?? [at, to];
  };
  return first(pegs.flat().length, target);
}

export function hanoiPuzzle(s: Settings): HanoiPuzzle {
  const disks = opt(s, "disks", 3, 2, 6);
  const min = 2 ** disks - 1;
  return {
    family: "hanoi",
    disks,
    task: `Move all ${disks} disks from peg A to peg C. Click a peg to lift its top disk, then click where to put it. A disk can never sit on a smaller one. Use the fewest moves you can.`,
    min,
    explain: `Move the top ${disks - 1} disks out of the way to B, move the largest disk to C, then move the ${disks - 1} disks back on top of it. Doing that recursively takes 2ⁿ − 1 = ${min} moves.`,
  };
}
