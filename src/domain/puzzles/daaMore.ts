/* More algorithm puzzles, one family per DAA topic that had none: growth rates, operation
 * counts, counting sort, heaps, hashing, string matching, adjacency matrices, components,
 * articulation points, greedy knapsack, Huffman merges, DP tables, NP problems and TSP. */
import {
  arrow,
  connectedEdges,
  fmtNum,
  int,
  LETTERS,
  opt,
  pick,
  reachable,
  ringLayout,
  sameSet,
  shuffle,
  treeLayout,
  type CellMark,
  type CyclePuzzle,
  type GraphBoard,
  type OrderPuzzle,
  type Rng,
  type SelectPuzzle,
  type Settings,
  type TablePuzzle,
} from "./core";

const letters = (n: number) => LETTERS.slice(0, n).split("");
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function graphBoard(
  r: Rng,
  n: number,
  edges: { a: number; b: number; w?: number }[],
  directed = false,
): GraphBoard {
  const pos = ringLayout(r, n);
  const L = letters(n);
  return {
    kind: "graph",
    nodes: pos.map((p, i) => ({ label: L[i], ...p })),
    edges,
    directed,
    width: 600,
    height: 340,
  };
}

// ---------- Growth rates (asymptotic notation, and the cost of operations) ----------

const GROWTH = [
  { label: "1", name: "constant" },
  { label: "log n", name: "logarithmic" },
  { label: "log² n", name: "polylogarithmic" },
  { label: "√n", name: "square root" },
  { label: "n", name: "linear" },
  { label: "n log n", name: "linearithmic" },
  { label: "n^1.5", name: "n to the 1.5" },
  { label: "n²", name: "quadratic" },
  { label: "n³", name: "cubic" },
  { label: "2ⁿ", name: "exponential" },
  { label: "n!", name: "factorial" },
  { label: "nⁿ", name: "n to the n" },
];

const OPERATIONS = [
  { label: "read a[i] from an array", name: "Θ(1)" },
  { label: "binary search a sorted array", name: "Θ(log n)" },
  { label: "find the max of an unsorted array", name: "Θ(n)" },
  { label: "merge sort the array", name: "Θ(n log n)" },
  { label: "compare every pair of elements", name: "Θ(n²)" },
  { label: "multiply two n×n matrices (schoolbook)", name: "Θ(n³)" },
  { label: "try every subset of the elements", name: "Θ(2ⁿ)" },
  { label: "try every ordering of the elements", name: "Θ(n!)" },
];

/** Click functions (or operations) from slowest-growing to fastest. */
export function growthPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const set = pick(s, "set", ["functions", "operations"] as const, "functions");
  const pool = set === "functions" ? GROWTH : OPERATIONS;
  const k = opt(s, "count", 6, 4, pool.length);
  const ranks = shuffle(r, range(pool.length))
    .slice(0, k)
    .sort((a, b) => a - b);
  const shown = shuffle(r, ranks); // shown[i] = rank of box i
  const want = [...shown.keys()].sort((a, b) => shown[a] - shown[b]);
  const label = (i: number) => pool[shown[i]].label;
  return {
    family: "order",
    board: {
      kind: "cells",
      values: shown.map((x) => pool[x].label),
    },
    pick: "cell",
    task:
      set === "functions"
        ? "Click the functions from the slowest-growing to the fastest-growing (as n → ∞)."
        : "Click the operations from the cheapest to the most expensive for large n.",
    given: [],
    length: k,
    check: (prefix, p) => {
      const at = want[prefix.length];
      if (p === at) return null;
      if (prefix.includes(p)) return "Picked the same item twice";
      return `Ranked ${label(p)} before ${label(at)}, but ${label(at)} grows more slowly`;
    },
    next: (prefix) => want[prefix.length],
    name: (p) => label(p),
    cells: (prefix) => ({
      values: shown.map((x) => pool[x].label),
      marks: Object.fromEntries(prefix.map((i) => [i, "done" as CellMark])),
    }),
    explain:
      set === "functions"
        ? `From slowest to fastest: ${want.map(label).join(" ≺ ")}. Logs grow slower than any power of n, and any power grows slower than an exponential.`
        : `From cheapest to most expensive: ${want.map((i) => `${label(i)} ${pool[shown[i]].name}`).join(" ≺ ")}.`,
  };
}

// ---------- Counting primitive operations (RAM model) ----------

const PROGRAMS: {
  code: string[];
  times: (n: number, k: number) => number[];
  header: number[];
}[] = [
  {
    code: ["s ← 0", "for i ← 1 to n", "    s ← s + A[i]", "return s"],
    times: (n) => [1, n + 1, n, 1],
    header: [1],
  },
  {
    code: [
      "c ← 0",
      "for i ← 1 to n",
      "    for j ← 1 to i",
      "        c ← c + 1",
      "return c",
    ],
    times: (n) => [1, n + 1, (n * (n + 1)) / 2 + n, (n * (n + 1)) / 2, 1],
    header: [1, 2],
  },
  {
    code: [
      "m ← A[1]",
      "for i ← 2 to n",
      "    if A[i] > m",
      "        m ← A[i]   (runs k times)",
      "return m",
    ],
    times: (n, k) => [1, n, n - 1, k, 1],
    header: [1],
  },
];

/** Fill in how many times each line runs, then the total cost. */
export function ramPuzzle(s: Settings, r: Rng): TablePuzzle {
  const which = opt(
    s,
    "program",
    int(r, 0, PROGRAMS.length - 1),
    0,
    PROGRAMS.length - 1,
  );
  const prog = PROGRAMS[which];
  const n = opt(s, "n", int(r, 4, 7), 3, 9);
  const k = int(r, 1, n - 1);
  const times = prog.times(n, k);
  const costs = prog.code.map(() => int(r, 1, 3));
  const total = times.reduce((t, x, i) => t + x * costs[i], 0);
  return {
    family: "table",
    task: `With n = ${n}, fill in how many times each line runs and the total cost (cost × times, added up).`,
    corner: "line",
    colHeads: ["cost", "times", "cost × times"],
    rowHeads: [...prog.code, "total"],
    cells: [
      ...prog.code.map((_, i) => [String(costs[i]), null, null]),
      ["", "", null],
    ],
    answers: [
      ...prog.code.map((_, i) => [null, times[i], costs[i] * times[i]]),
      [null, null, total],
    ],
    why: (row, c, given) => {
      if (c === 1 && prog.header.includes(row) && given === times[row] - 1)
        return "Forgot the last loop test, the one that fails and ends the loop";
      if (row === prog.code.length)
        return "Add up cost × times over every line";
      return null;
    },
    explain: `Line counts: ${times.join(", ")}. A loop header runs once more than its body (the final test that exits). Total = ${times.map((t, i) => `${costs[i]}·${t}`).join(" + ")} = ${total}.`,
  };
}

// ---------- Loop counting (complexity analysis) ----------

const LOOPS = [
  {
    code: ["for i ← 1 to n", "    for j ← 1 to n", "        x ← x + 1"],
    count: (n: number) => n * n,
    cls: "Θ(n²)",
  },
  {
    code: ["for i ← 1 to n", "    for j ← i + 1 to n", "        x ← x + 1"],
    count: (n: number) => (n * (n - 1)) / 2,
    cls: "n(n − 1)/2 = Θ(n²)",
  },
  {
    code: ["k ← n", "while k > 1", "    k ← k / 2", "    x ← x + 1"],
    count: (n: number) => Math.log2(n),
    cls: "log₂ n = Θ(log n)",
  },
  {
    code: [
      "for i ← 1 to n",
      "    j ← 1",
      "    while j < n",
      "        j ← 2j",
      "        x ← x + 1",
    ],
    count: (n: number) => n * Math.log2(n),
    cls: "n log₂ n = Θ(n log n)",
  },
];

/** How many times does the innermost line run for n = 4, 8, 16? */
export function loopCountPuzzle(s: Settings, r: Rng): TablePuzzle {
  const which = opt(
    s,
    "program",
    int(r, 0, LOOPS.length - 1),
    0,
    LOOPS.length - 1,
  );
  const L = LOOPS[which];
  const ns = [4, 8, 16];
  return {
    family: "table",
    task: "Count how many times the line x ← x + 1 runs for each n. Watch how the count grows when n doubles.",
    lines: L.code,
    corner: "n",
    colHeads: ns.map(String),
    rowHeads: ["x ← x + 1 runs"],
    cells: [ns.map(() => null)],
    answers: [ns.map((n) => L.count(n))],
    why: (_r, c, given) =>
      given === ns[c] * ns[c] && which !== 0
        ? "Counted a full n × n square; the inner loop is shorter than that"
        : given === ns[c] && which !== 0
          ? "Counted only the outer loop"
          : null,
    explain: `Counts: ${ns.map((n) => `n = ${n}: ${L.count(n)}`).join(", ")}. In general ${L.cls}.`,
  };
}

// ---------- Counting sort ----------

export function countingSortPuzzle(s: Settings, r: Rng): TablePuzzle {
  const k = opt(s, "max", 5, 3, 7);
  const n = opt(s, "size", 8, 5, 12);
  const a = range(n).map(() => int(r, 0, k));
  const count = range(k + 1).map((v) => a.filter((x) => x === v).length);
  const pos = count.map((_, v) =>
    count.slice(0, v + 1).reduce((t, x) => t + x, 0),
  );
  return {
    family: "table",
    task: "Counting sort, step 1 and 2: count how often each value occurs, then the running total (where the last copy of each value goes, counting from 1).",
    lines: [`A = [${a.join(", ")}]`],
    corner: "value",
    colHeads: range(k + 1).map(String),
    rowHeads: ["C[v] = count", "C[v] = running total"],
    cells: [range(k + 1).map(() => null), range(k + 1).map(() => null)],
    answers: [count, pos],
    why: (row, c, given) =>
      row === 1 && given === pos[c] - count[c]
        ? "Took the running total before the value instead of including it"
        : row === 1 && given === count[c]
          ? "Copied the count instead of adding up the counts so far"
          : null,
    explain: `Counts: ${count.join(", ")}. Running totals: ${pos.join(", ")}. Walking A from the right, each value goes to position C[v], then C[v] goes down by one, which keeps the sort stable. Total time Θ(n + k), with no comparisons.`,
  };
}

// ---------- Heaps ----------

function heapChildren(n: number) {
  return range(n).map((i) => [2 * i + 1, 2 * i + 2].filter((c) => c < n));
}

function randomHeap(r: Rng, n: number, max: boolean): number[] {
  const keys = shuffle(
    r,
    range(89).map((i) => i + 10),
  ).slice(0, n);
  keys.sort((a, b) => (max ? b - a : a - b));
  // a sorted array is a heap; shuffle within levels a little by sifting random swaps that keep order
  const h = [...keys];
  for (let t = 0; t < n * 3; t++) {
    const i = int(r, 1, n - 1),
      j = int(r, 1, n - 1);
    const ok = (arr: number[]) =>
      arr.every(
        (v, x) =>
          x === 0 || (max ? arr[(x - 1) >> 1] >= v : arr[(x - 1) >> 1] <= v),
      );
    const trial = [...h];
    [trial[i], trial[j]] = [trial[j], trial[i]];
    if (ok(trial)) trial.forEach((v, x) => (h[x] = v));
  }
  return h;
}

/** Insert into, or extract the top of, a heap: click every node the moving key swaps with. */
export function heapPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const max = pick(s, "heap", ["max", "min"] as const, "max") === "max";
  const op = pick(s, "op", ["insert", "extract", "either"] as const, "either");
  const doInsert = op === "either" ? r() < 0.5 : op === "insert";
  const n = opt(s, "nodes", 9, 5, 14);
  const better = (a: number, b: number) => (max ? a > b : a < b);
  for (let attempt = 0; ; attempt++) {
    const h = randomHeap(r, doInsert ? n - 1 : n, max);
    let arr: number[], moving: number, path: number[], task: string;
    if (doInsert) {
      const used = new Set(h);
      // a key that beats its parent, so it moves at least one level
      const parent = h[(h.length - 1) >> 1];
      let x = max ? int(r, parent + 1, 99) : int(r, 1, parent - 1);
      while (used.has(x))
        x = max ? int(r, parent + 1, 99) : int(r, 1, parent - 1);
      arr = [...h, x];
      moving = x;
      path = [];
      for (
        let i = arr.length - 1;
        i > 0 && better(x, arr[(i - 1) >> 1]);
        i = (i - 1) >> 1
      )
        path.push((i - 1) >> 1);
      task = `${x} was added as the last node. Click every node it swaps with as it sifts up, in order.`;
    } else {
      const last = h[h.length - 1];
      arr = [last, ...h.slice(1, -1)];
      moving = last;
      path = [];
      const cur = [...arr];
      for (let i = 0; ;) {
        const kids = [2 * i + 1, 2 * i + 2].filter((c) => c < cur.length);
        if (!kids.length) break;
        const c = kids.reduce((a, b) => (better(cur[b], cur[a]) ? b : a));
        if (!better(cur[c], cur[i])) break;
        path.push(c);
        [cur[i], cur[c]] = [cur[c], cur[i]];
        i = c;
      }
      task = `The ${max ? "maximum" : "minimum"} ${h[0]} was removed and the last key ${last} moved to the root. Click every node ${last} swaps with as it sifts down, in order.`;
    }
    if (!path.length && attempt < 50) continue;
    const kids = heapChildren(arr.length);
    const board = treeLayout(kids, 0, arr.map(String));
    const L = arr.map(String);
    const where = (prefix: number[]) =>
      prefix.length ? prefix[prefix.length - 1] : doInsert ? arr.length - 1 : 0;
    return {
      family: "order",
      board,
      pick: "node",
      task,
      given: [],
      length: path.length,
      hideCount: true,
      check: (prefix, p) => {
        const want = path[prefix.length];
        if (p === want) return null;
        const at = where(prefix);
        if (!doInsert) {
          const sib = kids[at].find((c) => c !== want);
          if (p === sib)
            return `Swapped with the ${max ? "smaller" : "larger"} child: a ${max ? "max" : "min"}-heap swaps with the ${max ? "larger" : "smaller"} child`;
        }
        return doInsert
          ? "A key sifting up only ever swaps with its parent"
          : "A key sifting down only ever swaps with one of its children";
      },
      next: (prefix) => path[prefix.length],
      name: (p) => L[p],
      explain: `${moving} ${doInsert ? "moves up while it is " + (max ? "larger" : "smaller") + " than its parent" : "moves down, swapping with its " + (max ? "larger" : "smaller") + " child while that child is " + (max ? "larger" : "smaller")}: swaps with ${path.map((i) => L[i]).join(", ") || "nothing"}. That is at most the height of the tree, Θ(log n).`,
    };
  }
}

// ---------- Hashing ----------

const PRIMES = [7, 11, 13];

/** Insert keys into an open-addressing table: click the slot each key ends up in. */
export function hashingPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const probe = pick(s, "probe", ["linear", "quadratic"] as const, "linear");
  const want = opt(s, "size", 11, 7, 13);
  const m = PRIMES.reduce((b, p) =>
    Math.abs(p - want) < Math.abs(b - want) ? p : b,
  );
  const k = opt(s, "keys", Math.floor(m / 2), 3, Math.floor(m / 2));
  for (;;) {
    const keys = shuffle(
      r,
      range(90).map((i) => i + 10),
    ).slice(0, k);
    const table: (number | null)[] = Array(m).fill(null);
    const slots: number[] = [];
    const tries: number[][] = [];
    let collisions = 0;
    for (const key of keys) {
      const seq: number[] = [];
      for (let i = 0; i < m; i++) {
        const sl = (key + (probe === "linear" ? i : i * i)) % m;
        seq.push(sl);
        if (table[sl] === null) break;
      }
      const sl = seq[seq.length - 1];
      table[sl] = key;
      slots.push(sl);
      tries.push(seq);
      if (seq.length > 1) collisions++;
    }
    if (collisions < Math.min(2, k - 2)) continue;
    const state = (prefix: number[]) => {
      const t: (number | null)[] = Array(m).fill(null);
      prefix.forEach((sl, i) => (t[sl] = keys[i]));
      return t;
    };
    return {
      family: "order",
      board: {
        kind: "cells",
        values: Array(m).fill(""),
        captions: range(m).map(String),
      },
      pick: "cell",
      task: `Table of size ${m}, h(k) = k mod ${m}, ${probe} probing (${probe === "linear" ? "try h, h+1, h+2, …" : "try h, h+1, h+4, h+9, …"}, wrapping round). Click the slot each key ends up in.`,
      given: [],
      length: k,
      lines: [`Keys, in order: ${keys.join(", ")}`],
      step: (prefix) =>
        prefix.length < k
          ? `Insert ${keys[prefix.length]}`
          : "All keys inserted",
      check: (prefix, p) => {
        const i = prefix.length;
        if (p === slots[i]) return null;
        const t = state(prefix);
        const home = keys[i] % m;
        if (t[p] !== null) return "Put a key into a slot that is already taken";
        if (p === home) return "Wrong home slot";
        if (
          probe === "quadratic" &&
          tries[i].length > 1 &&
          p === (home + tries[i].length - 1) % m
        )
          return "Probed linearly (+1, +2…) instead of quadratically (+1, +4, +9…)";
        if (tries[i].length === 1)
          return `${keys[i]} mod ${m} = ${home}, and that slot is free`;
        return "Skipped past the first free slot in the probe sequence";
      },
      next: (prefix) => slots[prefix.length],
      name: (p, prefix) => `${keys[prefix.length]}→${p}`,
      cells: (prefix) => {
        const t = state(prefix);
        return {
          values: t.map((x) => (x === null ? "" : String(x))),
          captions: range(m).map(String),
          marks: Object.fromEntries(
            t.flatMap((x, i) => (x === null ? [] : [[i, "fixed" as CellMark]])),
          ),
        };
      },
      explain: `Final table: ${state(slots)
        .map((x, i) => `${i}:${x ?? "–"}`)
        .join("  ")}. ${keys
        .map((key, i) =>
          tries[i].length > 1
            ? `${key} collided and probed ${tries[i].join("→")}`
            : "",
        )
        .filter(Boolean)
        .join("; ")}.`,
    };
  }
}

// ---------- String matching ----------

/** Click every position in the text where the pattern starts. */
export function matchingPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const n = opt(s, "length", 16, 10, 22);
  const pm = opt(s, "pattern", 3, 2, 5);
  const alpha = "ab";
  for (;;) {
    const pat = range(pm)
      .map(() => alpha[int(r, 0, 1)])
      .join("");
    if (/^(.)\1*$/.test(pat) && pm > 2) continue;
    let text = range(n)
      .map(() => alpha[int(r, 0, 1)])
      .join("");
    const at = int(r, 0, n - pm);
    text = text.slice(0, at) + pat + text.slice(at + pm);
    const hits = range(n - pm + 1).filter((i) => text.startsWith(pat, i));
    if (hits.length < 2 || hits.length > 5) continue;
    const overlap = hits.some((h, i) => i > 0 && h - hits[i - 1] < pm);
    return {
      family: "select",
      board: {
        kind: "cells",
        values: text.split(""),
        captions: range(n).map(String),
      },
      pick: "cell",
      task: `Click every position where the pattern "${pat}" starts in the text (matches may overlap).`,
      check: (chosen) => {
        if (sameSet(chosen, hits)) return null;
        const extra = chosen.find((c) => !hits.includes(c));
        if (extra !== undefined)
          return `Marked position ${extra}, but "${text.slice(extra, extra + pm)}" isn't the pattern`;
        return overlap
          ? "Missed a match that overlaps another one"
          : "Missed a match";
      },
      answer: hits,
      explain: `The pattern starts at ${hits.join(", ")}. The naive matcher tries every shift (Θ(nm) worst case); KMP uses the pattern's prefix function so it never re-reads a text character, giving Θ(n + m)${overlap ? ". Note the overlapping matches: after a match, a matcher shifts by less than the pattern length." : "."}`,
    };
  }
}

// ---------- Adjacency matrix ----------

/** Click the 1s of the adjacency matrix of the graph shown. */
export function adjMatrixPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const n = opt(s, "nodes", 5, 3, 7);
  const directed = s.directed === true || s.directed === "true";
  const und = connectedEdges(r, n, opt(s, "extra", 2, 0, 8));
  const edges = directed
    ? und.map((e) => (r() < 0.5 ? e : { a: e.b, b: e.a }))
    : und;
  const show = graphBoard(r, n, edges, directed);
  const L = letters(n);
  const ones = new Set<number>();
  for (const e of edges) {
    ones.add(e.a * n + e.b);
    if (!directed) ones.add(e.b * n + e.a);
  }
  const answer = [...ones].sort((a, b) => a - b);
  return {
    family: "select",
    board: { kind: "grid", rows: n, cols: n, rowHeads: L, colHeads: L },
    pick: "cell",
    show,
    task: directed
      ? "Click every square of the adjacency matrix that holds a 1: row = where the arrow starts, column = where it ends."
      : "Click every square of the adjacency matrix that holds a 1 (row u, column v for each edge u–v).",
    check: (chosen) => {
      if (sameSet(chosen, answer)) return null;
      const extra = chosen.filter((c) => !ones.has(c));
      const missing = answer.filter((c) => !chosen.includes(c));
      if (
        directed &&
        extra.some((c) => ones.has((c % n) * n + Math.floor(c / n)))
      )
        return "Marked an arrow in both directions; a directed edge u → v sets only row u, column v";
      if (
        !directed &&
        missing.some((c) => chosen.includes((c % n) * n + Math.floor(c / n)))
      )
        return "An undirected edge u–v sets both A[u][v] and A[v][u]: the matrix is symmetric";
      if (extra.some((c) => c % n === Math.floor(c / n)))
        return "Marked the diagonal, but no vertex has a loop";
      return extra.length
        ? "Marked a pair that isn't joined by an edge"
        : "Missed an edge";
    },
    answer,
    explain: `${directed ? "Arrows" : "Edges"}: ${edges.map((e) => `${L[e.a]}${directed ? "→" : "–"}${L[e.b]}`).join(", ")}. The matrix uses n² = ${n * n} squares whatever the number of edges; an adjacency list stores only ${directed ? edges.length : 2 * edges.length} entries.${directed ? "" : " An undirected graph's matrix is symmetric."}`,
  };
}

// ---------- Connected and strongly connected components ----------

export function componentsPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const scc = pick(s, "mode", ["scc", "cc"] as const, "scc") === "scc";
  const n = opt(s, "nodes", 8, 5, 10);
  for (;;) {
    const groups = int(r, 2, 3);
    const perm = shuffle(r, range(n));
    const cut = [
      0,
      ...shuffle(
        r,
        range(n - 1).map((i) => i + 1),
      )
        .slice(0, groups - 1)
        .sort((a, b) => a - b),
      n,
    ];
    const comps = range(groups).map((g) => perm.slice(cut[g], cut[g + 1]));
    const edges: { a: number; b: number }[] = [];
    const seen = new Set<string>();
    const add = (a: number, b: number) => {
      const k = scc ? `${a}>${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (a === b || seen.has(k)) return;
      seen.add(k);
      edges.push({ a, b });
    };
    for (const c of comps) {
      if (c.length === 1) continue;
      if (scc) c.forEach((v, i) => add(v, c[(i + 1) % c.length]));
      else c.slice(1).forEach((v, i) => add(c[int(r, 0, i)], v));
      if (c.length > 3 && r() < 0.6) add(c[0], c[2]);
    }
    if (scc)
      for (let g = 0; g + 1 < groups; g++)
        for (let t = 0; t < 2; t++)
          add(
            comps[g][int(r, 0, comps[g].length - 1)],
            comps[g + 1][int(r, 0, comps[g + 1].length - 1)],
          );
    const target = comps.find((c) => c.length >= 2 && c.length < n) ?? comps[0];
    const x = target[int(r, 0, target.length - 1)];
    const reachFrom = reachable(n, edges, x, scc);
    const answer = scc
      ? [...reachFrom].filter((v) => reachable(n, edges, v, true).has(x))
      : [...reachFrom];
    if (answer.length < 2 || answer.length === n) continue;
    const board = graphBoard(r, n, edges, scc);
    const L = board.nodes.map((v) => v.label);
    return {
      family: "select",
      board,
      pick: "node",
      marked: [x],
      task: scc
        ? `Click every vertex in the same strongly connected component as ${L[x]} (including ${L[x]}): each must be reachable from ${L[x]} and able to reach ${L[x]} back.`
        : `Click every vertex in the same connected component as ${L[x]} (including ${L[x]}).`,
      check: (chosen) => {
        if (sameSet(chosen, answer)) return null;
        const extra = chosen.find((v) => !answer.includes(v));
        if (extra !== undefined)
          return scc && reachFrom.has(extra)
            ? `${L[extra]} is reachable from ${L[x]}, but there is no path back from ${L[extra]} to ${L[x]}`
            : `${L[extra]} can't be reached from ${L[x]}`;
        return scc
          ? "Missed a vertex that lies on a cycle through " + L[x]
          : "Missed a vertex connected to " + L[x];
      },
      answer,
      explain: scc
        ? `The component of ${L[x]} is {${answer
            .map((v) => L[v])
            .sort()
            .join(
              ", ",
            )}}. Kosaraju's algorithm finds all SCCs with two DFS passes: one on the graph, one on the reversed graph in decreasing finish time.`
        : `The component of ${L[x]} is {${answer
            .map((v) => L[v])
            .sort()
            .join(", ")}}: everything one BFS or DFS from ${L[x]} reaches.`,
    };
  }
}

// ---------- Articulation points and bridges ----------

export function articulationPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const bridges =
    pick(s, "find", ["points", "bridges"] as const, "points") === "bridges";
  const n = opt(s, "nodes", 8, 5, 10);
  for (;;) {
    const edges = connectedEdges(r, n, opt(s, "extra", 2, 0, 8));
    const answer = bridges
      ? range(edges.length).filter(
          (i) => reachable(n, edges, 0, false, -1, i).size < n,
        )
      : range(n).filter(
          (v) => reachable(n, edges, v === 0 ? 1 : 0, false, v).size < n - 1,
        );
    if (!answer.length || answer.length > (bridges ? edges.length - 2 : n - 3))
      continue;
    const board = graphBoard(r, n, edges);
    const L = board.nodes.map((v) => v.label);
    const name = (i: number) =>
      bridges ? `${L[edges[i].a]}–${L[edges[i].b]}` : L[i];
    return {
      family: "select",
      board,
      pick: bridges ? "edge" : "node",
      task: bridges
        ? "Click every bridge: an edge whose removal disconnects the graph."
        : "Click every articulation point: a vertex whose removal (with its edges) disconnects the graph.",
      check: (chosen) => {
        if (sameSet(chosen, answer)) return null;
        const extra = chosen.find((v) => !answer.includes(v));
        if (extra !== undefined)
          return `Removing ${name(extra)} leaves the graph connected${bridges ? " (that edge is on a cycle)" : ""}`;
        return bridges
          ? "Missed an edge that lies on no cycle"
          : "Missed a vertex that is the only link between two parts";
      },
      answer,
      explain: `${bridges ? "Bridges" : "Articulation points"}: ${answer.map(name).join(", ")}. ${bridges ? "An edge is a bridge exactly when it lies on no cycle." : "Tarjan's DFS finds them in one pass: a non-root vertex u is one when some child's subtree has no back edge climbing above u (low[child] ≥ disc[u]); the root is one when it has two or more DFS children."}`,
    };
  }
}

// ---------- Fractional knapsack ----------

export function fractionalKnapsackPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const k = opt(s, "items", 5, 3, 7);
  for (;;) {
    const items = range(k).map(() => ({ w: int(r, 1, 9), v: int(r, 2, 30) }));
    const ratio = items.map((it) => it.v / it.w);
    if (new Set(ratio.map((x) => x.toFixed(6))).size < k) continue;
    const order = range(k).sort((a, b) => ratio[b] - ratio[a]);
    const total = items.reduce((t, it) => t + it.w, 0);
    const cap = int(r, Math.ceil(total / 3), Math.floor((total * 2) / 3));
    const taken: number[] = [];
    let room = cap,
      value = 0;
    for (const i of order) {
      if (room <= 0) break;
      taken.push(i);
      const f = Math.min(1, room / items[i].w);
      value += f * items[i].v;
      room -= Math.min(room, items[i].w);
    }
    const byValue = [...range(k)].sort((a, b) => items[b].v - items[a].v);
    const byWeight = [...range(k)].sort((a, b) => items[a].w - items[b].w);
    const name = (i: number) => `${LETTERS[i]} (${items[i].v}/${items[i].w})`;
    return {
      family: "order",
      board: {
        kind: "cells",
        values: items.map((it, i) => `${LETTERS[i]}: v ${it.v}, w ${it.w}`),
      },
      pick: "cell",
      task: `Capacity ${cap}. Fractions of an item are allowed. Click the items in the order the greedy algorithm puts them in the bag, until it is full.`,
      given: [],
      length: taken.length,
      check: (prefix, p) => {
        const want = taken[prefix.length];
        if (p === want) return null;
        if (prefix.includes(p)) return "That item is already in the bag";
        const rest = byValue.filter((i) => !prefix.includes(i));
        if (p === rest[0])
          return "Took the most valuable item instead of the best value per unit of weight";
        const light = byWeight.filter((i) => !prefix.includes(i));
        if (p === light[0])
          return "Took the lightest item instead of the best value per unit of weight";
        return "Greedy takes the highest value / weight ratio first";
      },
      next: (prefix) => taken[prefix.length],
      name,
      cells: (prefix) => ({
        values: items.map((it, i) => `${LETTERS[i]}: v ${it.v}, w ${it.w}`),
        captions: items.map(
          (it) => `${fmtNum(Math.round((it.v / it.w) * 100) / 100)} per kg`,
        ),
        marks: Object.fromEntries(prefix.map((i) => [i, "done" as CellMark])),
      }),
      explain: `Value per weight: ${order.map((i) => `${LETTERS[i]} ${fmtNum(Math.round(ratio[i] * 100) / 100)}`).join(", ")}. Greedy takes ${taken.map((i) => LETTERS[i]).join(", ")} (the last one possibly only in part), for a total value of ${fmtNum(Math.round(value * 100) / 100)}. This is optimal for the fractional problem, but not for 0/1 knapsack.`,
    };
  }
}

// ---------- Huffman merges ----------

type Tree = { w: number; label: string };

/** Each round, click the two lightest trees; they merge into one. */
export function huffmanPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const k = opt(s, "symbols", 6, 3, 8);
  const weights = range(k).map(() => int(r, 1, 25));
  const start: Tree[] = weights.map((w, i) => ({
    w,
    label: LETTERS[i].toLowerCase(),
  }));
  const forest = (prefix: number[]) => {
    let f = start.map((t) => ({ ...t }));
    let first: number | null = null;
    for (const p of prefix) {
      if (first === null) first = p;
      else {
        const a = f[first],
          b = f[p];
        const merged = { w: a.w + b.w, label: `${a.label}${b.label}` };
        f = f.filter((_, i) => i !== first && i !== p);
        f.push(merged);
        first = null;
      }
    }
    return { f, first };
  };
  const next = (prefix: number[]) => {
    const { f, first } = forest(prefix);
    let best = -1;
    f.forEach((t, i) => {
      if (i !== first && (best < 0 || t.w < f[best].w)) best = i;
    });
    return best;
  };
  const merges: number[] = [];
  const all: number[] = [];
  while (all.length < 2 * (k - 1)) {
    all.push(next(all));
    if (all.length % 2 === 0) {
      const f = forest(all).f;
      merges.push(f[f.length - 1].w);
    }
  }
  const cost = merges.reduce((t, x) => t + x, 0);
  return {
    family: "order",
    board: { kind: "cells", values: start.map((t) => `${t.label}: ${t.w}`) },
    pick: "cell",
    task: "Huffman's algorithm: in each round click the two lightest trees (any order on a tie). They merge into one tree whose weight is their sum.",
    given: [],
    length: 2 * (k - 1),
    step: (prefix) =>
      prefix.length >= 2 * (k - 1)
        ? "One tree left: done"
        : `Round ${Math.floor(prefix.length / 2) + 1}: pick the ${prefix.length % 2 ? "second" : "first"} lightest tree`,
    check: (prefix, p) => {
      const { f, first } = forest(prefix);
      if (p >= f.length) return "That tree has already been merged";
      if (p === first) return "Picked the same tree twice";
      const want = f[next(prefix)].w;
      return f[p].w === want
        ? null
        : `Merged a tree of weight ${f[p].w}, but one of weight ${want} is lighter`;
    },
    next,
    name: (p, prefix) => {
      const t = forest(prefix).f[p];
      return `${t.label}:${t.w}`;
    },
    cells: (prefix) => {
      const { f, first } = forest(prefix);
      return {
        values: f.map((t) => `${t.label}: ${t.w}`),
        marks: first === null ? {} : { [first]: "active" as CellMark },
      };
    },
    explain: `Merge weights: ${merges.join(", ")}. Their sum, ${cost}, is the total cost Σ weight × code length: always merging the two lightest trees keeps rare symbols deep and frequent ones shallow, which is optimal.`,
  };
}

// ---------- Dynamic-programming tables ----------

const binom = (n: number, k: number): number => {
  let x = 1;
  for (let i = 1; i <= k; i++) x = (x * (n - k + i)) / i;
  return Math.round(x);
};

export function pascalPuzzle(s: Settings, r: Rng): TablePuzzle {
  const N = opt(s, "rows", 7, 4, 10);
  const blanks = opt(s, "blanks", 6, 2, 12);
  const spots = shuffle(
    r,
    range(N + 1).flatMap((n) =>
      n < 2 ? [] : range(n - 1).map((k) => [n, k + 1] as [number, number]),
    ),
  ).slice(0, blanks);
  const isBlank = (n: number, k: number) =>
    spots.some(([a, b]) => a === n && b === k);
  return {
    family: "table",
    task: "Fill in the missing entries of Pascal's triangle: C(n, k) = C(n − 1, k − 1) + C(n − 1, k).",
    corner: "n \\ k",
    rowHeads: range(N + 1).map(String),
    colHeads: range(N + 1).map(String),
    cells: range(N + 1).map((n) =>
      range(N + 1).map((k) =>
        k > n ? "" : isBlank(n, k) ? null : String(binom(n, k)),
      ),
    ),
    answers: range(N + 1).map((n) =>
      range(N + 1).map((k) => (k > n ? null : binom(n, k))),
    ),
    why: (n, k, given) =>
      given === binom(n - 1, k) || given === binom(n - 1, k - 1)
        ? "Copied one entry from the row above instead of adding the two"
        : null,
    explain: `Each entry is the sum of the one above and the one above-left. Filling the table bottom-up takes Θ(nk) additions, while the plain recursion recomputes the same entries exponentially often.`,
  };
}

export function matrixChainPuzzle(s: Settings, r: Rng): TablePuzzle {
  const k = opt(s, "matrices", 4, 3, 5);
  const d = range(k + 1).map(() => int(r, 1, 6));
  const m: number[][] = range(k).map(() => Array(k).fill(0));
  const split: number[][] = range(k).map(() => Array(k).fill(0));
  for (let len = 2; len <= k; len++)
    for (let i = 0; i + len - 1 < k; i++) {
      const j = i + len - 1;
      m[i][j] = Infinity;
      for (let t = i; t < j; t++) {
        const c = m[i][t] + m[t + 1][j] + d[i] * d[t + 1] * d[j + 1];
        if (c < m[i][j]) {
          m[i][j] = c;
          split[i][j] = t;
        }
      }
    }
  const paren = (i: number, j: number): string =>
    i === j
      ? `A${i + 1}`
      : `(${paren(i, split[i][j])}${paren(split[i][j] + 1, j)})`;
  return {
    family: "table",
    task: `Matrix-chain multiplication: Aᵢ is d${"ᵢ₋₁"} × dᵢ with d = (${d.join(", ")}). Fill in m[i][j], the fewest scalar multiplications for Aᵢ…Aⱼ.`,
    lines: range(k).map((i) => `A${i + 1}: ${d[i]} × ${d[i + 1]}`),
    corner: "i \\ j",
    rowHeads: range(k).map((i) => String(i + 1)),
    colHeads: range(k).map((i) => String(i + 1)),
    cells: range(k).map((i) =>
      range(k).map((j) => (j < i ? "" : j === i ? "0" : null)),
    ),
    answers: range(k).map((i) => range(k).map((j) => (j > i ? m[i][j] : null))),
    why: (i, j) =>
      j === i + 1
        ? `Two matrices: d${i}·d${i + 1}·d${i + 2} multiplications`
        : "Take the minimum over every split point k of m[i][k] + m[k+1][j] + dᵢ₋₁·d_k·dⱼ",
    explain: `m[1][${k}] = ${m[0][k - 1]}, with the bracketing ${paren(0, k - 1)}. The table has Θ(n²) entries and each tries Θ(n) splits: Θ(n³) time.`,
  };
}

export function lcsPuzzle(s: Settings, r: Rng): TablePuzzle {
  const a = opt(s, "length", 5, 3, 6);
  const alpha = "ABC";
  const X = range(a)
    .map(() => alpha[int(r, 0, 2)])
    .join("");
  const Y = range(a)
    .map(() => alpha[int(r, 0, 2)])
    .join("");
  const c = range(a + 1).map(() => Array(a + 1).fill(0));
  for (let i = 1; i <= a; i++)
    for (let j = 1; j <= a; j++)
      c[i][j] =
        X[i - 1] === Y[j - 1]
          ? c[i - 1][j - 1] + 1
          : Math.max(c[i - 1][j], c[i][j - 1]);
  const blankFrom = Math.max(1, a - 1);
  return {
    family: "table",
    task: `Longest common subsequence of X = ${X} and Y = ${Y}. Fill in the last ${a + 1 - blankFrom} rows of the table c[i][j] (length of the LCS of the first i letters of X and the first j of Y).`,
    corner: "X \\ Y",
    rowHeads: ["", ...X.split("")],
    colHeads: ["", ...Y.split("")],
    cells: range(a + 1).map((i) =>
      range(a + 1).map((j) =>
        i >= blankFrom && j > 0 ? null : String(c[i][j]),
      ),
    ),
    answers: c.map((row, i) =>
      row.map((v, j) => (i >= blankFrom && j > 0 ? v : null)),
    ),
    why: (i, j, given) =>
      X[i - 1] === Y[j - 1] && given === Math.max(c[i - 1][j], c[i][j - 1])
        ? "On a match, take the diagonal + 1"
        : X[i - 1] !== Y[j - 1] && given === c[i - 1][j - 1] + 1
          ? "Added 1 although the letters differ: take the larger of up and left"
          : null,
    explain: `c[${a}][${a}] = ${c[a][a]}. Matching letters extend the diagonal (+1); otherwise take the larger neighbour above or to the left. Θ(mn) time.`,
  };
}

export function knapsackPuzzle(s: Settings, r: Rng): TablePuzzle {
  const k = opt(s, "items", 3, 2, 4);
  const W = opt(s, "capacity", 6, 4, 8);
  const items = range(k).map(() => ({ w: int(r, 1, 4), v: int(r, 2, 9) }));
  const t = range(k + 1).map(() => Array(W + 1).fill(0));
  for (let i = 1; i <= k; i++)
    for (let w = 0; w <= W; w++) {
      t[i][w] = t[i - 1][w];
      if (items[i - 1].w <= w)
        t[i][w] = Math.max(
          t[i][w],
          t[i - 1][w - items[i - 1].w] + items[i - 1].v,
        );
    }
  return {
    family: "table",
    task: `0/1 knapsack. Row i allows the first i items; column w is the capacity. Fill in the last row: T[i][w] = max(T[i−1][w], T[i−1][w − wᵢ] + vᵢ).`,
    lines: items.map((it, i) => `item ${i + 1}: weight ${it.w}, value ${it.v}`),
    corner: "i \\ w",
    rowHeads: range(k + 1).map(String),
    colHeads: range(W + 1).map(String),
    cells: t.map((row, i) => row.map((v) => (i === k ? null : String(v)))),
    answers: t.map((row, i) => row.map((v) => (i === k ? v : null))),
    why: (i, w, given) => {
      const it = items[i - 1];
      if (it.w <= w && given === t[i - 1][w] + it.v)
        return "Added the item's value to T[i−1][w] instead of T[i−1][w − wᵢ]";
      if (given === t[i - 1][w] && t[i][w] > given)
        return "Skipped the item although taking it is better";
      return null;
    },
    explain: `Best value with capacity ${W}: ${t[k][W]}. Each cell compares skipping item i with taking it (if it fits). Θ(nW) time — pseudo-polynomial, since W can be exponential in its number of digits.`,
  };
}

// ---------- NP problems ----------

/** Subset sum: finding is hard, checking a proposed subset is easy. */
export function subsetSumPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const k = opt(s, "numbers", 7, 4, 9);
  const nums = range(k).map(() => int(r, 2, 30));
  const sub = shuffle(r, range(k)).slice(0, int(r, 2, Math.max(2, k - 2)));
  const target = sub.reduce((t, i) => t + nums[i], 0);
  const sum = (c: number[]) => c.reduce((t, i) => t + nums[i], 0);
  return {
    family: "select",
    board: { kind: "cells", values: nums.map(String) },
    pick: "cell",
    task: `Choose numbers that add up to exactly ${target}.`,
    status: (c) => [
      {
        text: `Sum: ${sum(c)} of ${target}`,
        ok: sum(c) === target ? true : undefined,
      },
    ],
    check: (c) =>
      sum(c) === target
        ? null
        : sum(c) < target
          ? "The chosen numbers add up to too little"
          : "The chosen numbers add up to too much",
    answer: sub,
    explain: `One answer: ${sub.map((i) => nums[i]).join(" + ")} = ${target}. Checking your answer took one addition per number — that is what puts SUBSET-SUM in NP. Finding one may need trying many of the 2^${k} = ${2 ** k} subsets, and no polynomial algorithm is known (unless P = NP).`,
  };
}

const allSubsets = (n: number) =>
  range(2 ** n).map((m) => range(n).filter((i) => m & (1 << i)));

export function npGraphPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const problem = pick(
    s,
    "problem",
    ["independent-set", "clique", "vertex-cover"] as const,
    "independent-set",
  );
  const n = opt(s, "nodes", 7, 5, 9);
  const edges = connectedEdges(r, n, opt(s, "extra", 4, 0, 12));
  const adj = (a: number, b: number) =>
    edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const indep = (c: number[]) =>
    c.every((a, i) => c.slice(i + 1).every((b) => !adj(a, b)));
  const clique = (c: number[]) =>
    c.every((a, i) => c.slice(i + 1).every((b) => adj(a, b)));
  const cover = (c: number[]) =>
    edges.every((e) => c.includes(e.a) || c.includes(e.b));
  const subs = allSubsets(n);
  const ok =
    problem === "independent-set"
      ? indep
      : problem === "clique"
        ? clique
        : cover;
  const best = subs
    .filter(ok)
    .reduce((b, c) =>
      problem === "vertex-cover"
        ? c.length < b.length
          ? c
          : b
        : c.length > b.length
          ? c
          : b,
    );
  const k = best.length;
  const board = graphBoard(r, n, edges);
  const L = board.nodes.map((v) => v.label);
  const what =
    problem === "independent-set"
      ? `an independent set of ${k} vertices (no two of them joined by an edge)`
      : problem === "clique"
        ? `a clique of ${k} vertices (every two of them joined by an edge)`
        : `a vertex cover of ${k} vertices (every edge touches a chosen vertex)`;
  return {
    family: "select",
    board,
    pick: "node",
    task: `Find ${what}.`,
    status: (c) => [{ text: `Chosen: ${c.length} of ${k}` }],
    check: (c) => {
      if (problem === "independent-set" && !indep(c))
        return "Two chosen vertices are joined by an edge";
      if (problem === "clique" && !clique(c))
        return "Two chosen vertices aren't joined by an edge";
      if (problem === "vertex-cover" && !cover(c))
        return "Some edge has neither end chosen";
      if (problem === "vertex-cover" ? c.length > k : c.length < k)
        return `The set needs ${problem === "vertex-cover" ? "at most" : "at least"} ${k} vertices`;
      return null;
    },
    answer: best,
    explain: `One answer: {${best.map((v) => L[v]).join(", ")}}. Checking a proposed set is fast (look at every pair or every edge), so the problem is in NP; it is also NP-complete, so no known algorithm finds one in polynomial time — the brute force tries all 2^${n} subsets.`,
  };
}

/** The reduction INDEPENDENT-SET ≤ VERTEX-COVER: the complement of an independent set is a cover. */
export function reductionPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const n = opt(s, "nodes", 7, 5, 9);
  const edges = connectedEdges(r, n, opt(s, "extra", 4, 0, 12));
  const adj = (a: number, b: number) =>
    edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const indep = (c: number[]) =>
    c.every((a, i) => c.slice(i + 1).every((b) => !adj(a, b)));
  const best = allSubsets(n)
    .filter(indep)
    .reduce((b, c) => (c.length > b.length ? c : b));
  const answer = range(n).filter((v) => !best.includes(v));
  const cover = (c: number[]) =>
    edges.every((e) => c.includes(e.a) || c.includes(e.b));
  const board = graphBoard(r, n, edges);
  const L = board.nodes.map((v) => v.label);
  return {
    family: "select",
    board,
    pick: "node",
    marked: best,
    task: `The highlighted vertices form a largest independent set (${best.length} vertices). Use the reduction to click a smallest vertex cover.`,
    check: (c) => {
      if (!cover(c))
        return "Some edge has neither end chosen, so it isn't a vertex cover";
      if (c.length > answer.length)
        return "That cover is larger than it needs to be";
      return null;
    },
    answer,
    explain: `S is independent exactly when V − S is a vertex cover (an edge inside V − S's complement would join two vertices of S). So the smallest cover is {${answer.map((v) => L[v]).join(", ")}}, of size n − ${best.length} = ${answer.length}. This polynomial transformation shows VERTEX-COVER is at least as hard as INDEPENDENT-SET.`,
  };
}

/** SAT: set the variables so that every clause is true. */
export function satPuzzle(s: Settings, r: Rng): SelectPuzzle {
  const v = opt(s, "variables", 4, 3, 6);
  const m = opt(s, "clauses", 5, 3, 8);
  const plant = range(v).map(() => r() < 0.5);
  if (!plant.some(Boolean)) plant[int(r, 0, v - 1)] = true;
  const clauses: { x: number; neg: boolean }[][] = [];
  while (clauses.length < m) {
    const vars = shuffle(r, range(v)).slice(0, int(r, 2, 3));
    const c = vars.map((x) => ({ x, neg: r() < 0.5 }));
    if (!c.some((l) => plant[l.x] !== l.neg)) c[0].neg = !plant[c[0].x];
    clauses.push(c);
  }
  // make sure "everything false" is not already a solution
  if (clauses.every((c) => c.some((l) => l.neg))) {
    const t = range(v).filter((x) => plant[x]);
    clauses[m - 1] = shuffle(r, t)
      .slice(0, Math.min(2, t.length))
      .map((x) => ({ x, neg: false }));
  }
  const lit = (l: { x: number; neg: boolean }) =>
    `${l.neg ? "¬" : ""}x${l.x + 1}`;
  const text = (c: { x: number; neg: boolean }[]) =>
    `(${c.map(lit).join(" ∨ ")})`;
  const sat = (chosen: number[], c: { x: number; neg: boolean }[]) =>
    c.some((l) => chosen.includes(l.x) !== l.neg);
  const answer = range(v).filter((x) => plant[x]);
  return {
    family: "select",
    board: {
      kind: "cells",
      values: range(v).map((x) => `x${x + 1}`),
      captions: range(v).map(() => ""),
    },
    pick: "cell",
    task: "Click the variables that should be TRUE (the rest are false) so that every clause has at least one true literal.",
    lines: [clauses.map(text).join(" ∧ ")],
    status: (chosen) =>
      clauses.map((c) => ({ text: text(c), ok: sat(chosen, c) })),
    check: (chosen) => {
      const bad = clauses.find((c) => !sat(chosen, c));
      return bad
        ? `Clause ${text(bad)} is false: none of its literals is true`
        : null;
    },
    answer,
    explain: `One satisfying assignment: ${range(v)
      .map((x) => `x${x + 1} = ${plant[x] ? "T" : "F"}`)
      .join(
        ", ",
      )}. Checking an assignment is quick, but SAT was the first problem proved NP-complete (Cook–Levin): with ${v} variables there are 2^${v} = ${2 ** v} assignments to try.`,
  };
}

// ---------- Travelling salesperson ----------

export function tspPuzzle(s: Settings, r: Rng): CyclePuzzle {
  const n = opt(s, "cities", 5, 4, 6);
  const edges: { a: number; b: number; w: number }[] = [];
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) edges.push({ a, b, w: int(r, 1, 9) });
  const w = (a: number, b: number) =>
    edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))!.w;
  let best = Infinity,
    tour: number[] = [];
  const go = (path: number[], cost: number) => {
    if (cost >= best) return;
    if (path.length === n) {
      const c = cost + w(path[n - 1], path[0]);
      if (c < best) {
        best = c;
        tour = [...path];
      }
      return;
    }
    for (let v = 1; v < n; v++)
      if (!path.includes(v))
        go([...path, v], cost + w(path[path.length - 1], v));
  };
  go([0], 0);
  const board = graphBoard(r, n, edges);
  const L = board.nodes.map((x) => x.label);
  const count = range(n - 1).reduce((t, i) => t * (i + 1), 1) / 2;
  return {
    family: "cycle",
    board,
    start: 0,
    best,
    task: `Start at ${L[0]}. Visit every city once and return to ${L[0]} along the shortest possible tour. Click your last city to step back.`,
    solution: [...tour, 0],
    explain: `A shortest tour: ${arrow([...tour, 0].map((v) => L[v]))}, total ${best}. Exact search checks (n − 1)!/2 = ${count} tours here, which explodes as n grows; heuristics such as nearest-neighbour are fast but not always optimal.`,
  };
}
