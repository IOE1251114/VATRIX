/* More data-structure puzzles: array addresses and shifting, binary search, sparse
 * transposes, recursion trees, linked lists in memory, polynomials, stacks and queues,
 * infix → postfix, general trees, tries, merging, radix passes and multigraph degrees. */
import { graphBoard } from "./daaMore";
import {
  int,
  LETTERS,
  opt,
  pick,
  shuffle,
  treeLayout,
  type CellMark,
  type OrderPuzzle,
  type Rng,
  type Settings,
  type TablePuzzle,
} from "./core";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const doneMarks = (picks: number[]) =>
  Object.fromEntries(picks.map((i) => [i, "done" as CellMark]));

// ---------- Address calculation ----------

export function addressPuzzle(s: Settings, r: Rng): TablePuzzle {
  const order = pick(s, "order", ["row", "column"] as const, "row");
  const R = opt(s, "rows", 4, 2, 8),
    C = opt(s, "cols", 5, 2, 8);
  const w = [2, 4, 8][int(r, 0, 2)];
  const base = int(r, 10, 50) * 10;
  const addr = (i: number, j: number, ord = order) =>
    base + (ord === "row" ? (i - 1) * C + (j - 1) : (j - 1) * R + (i - 1)) * w;
  const asks = shuffle(
    r,
    range(R * C).map(
      (k) => [Math.floor(k / C) + 1, (k % C) + 1] as [number, number],
    ),
  ).slice(0, 4);
  return {
    family: "table",
    task: `A is a ${R} × ${C} array (subscripts from 1) stored in ${order}-major order from address ${base}; each element takes ${w} bytes. Fill in the address of each element.`,
    corner: "element",
    rowHeads: asks.map(([i, j]) => `A[${i}][${j}]`),
    colHeads: ["address"],
    cells: asks.map(() => [null]),
    answers: asks.map(([i, j]) => [addr(i, j)]),
    why: (k, _c, given) => {
      const [i, j] = asks[k];
      if (given === addr(i, j, order === "row" ? "column" : "row"))
        return `Used ${order === "row" ? "column" : "row"}-major order`;
      if (given === base + (order === "row" ? i * C + j : j * R + i) * w)
        return "Forgot that subscripts start at 1 (subtract the lower bounds)";
      if (
        given ===
        base + (order === "row" ? (i - 1) * C + (j - 1) : (j - 1) * R + (i - 1))
      )
        return "Forgot to multiply by the element size";
      return null;
    },
    explain:
      order === "row"
        ? `Row-major: address = base + ((i − 1)·${C} + (j − 1))·${w}. Whole rows of ${C} come first.`
        : `Column-major: address = base + ((j − 1)·${R} + (i − 1))·${w}. Whole columns of ${R} come first.`,
  };
}

// ---------- Inserting / deleting in an array ----------

export function arrayShiftPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const op = pick(s, "op", ["insert", "delete", "either"] as const, "either");
  const ins = op === "either" ? r() < 0.5 : op === "insert";
  const n = opt(s, "size", 7, 4, 10);
  const vals = shuffle(
    r,
    range(89).map((i) => i + 10),
  ).slice(0, n + 1);
  const a = vals.slice(0, n);
  const x = vals[n];
  const p = ins ? int(r, 0, n - 2) : int(r, 0, n - 3);
  // the order in which elements move
  const moves = ins
    ? range(n - p).map((i) => n - 1 - i)
    : range(n - 1 - p).map((i) => p + 1 + i);
  const cap = ins ? n + 1 : n;
  const state = (prefix: number[]) => {
    const b: (number | null)[] = [...a, ...(ins ? [null] : [])];
    for (const i of prefix) {
      if (ins) b[i + 1] = b[i];
      else b[i - 1] = b[i];
    }
    return b;
  };
  return {
    family: "order",
    board: {
      kind: "cells",
      values: [...a.map(String), ...(ins ? [""] : [])],
      captions: range(cap).map(String),
    },
    pick: "cell",
    task: ins
      ? `Insert ${x} at index ${p}. Click the elements in the order they must move one place to the right to open the gap.`
      : `Delete the element at index ${p} (${a[p]}). Click the elements in the order they must move one place to the left to close the gap.`,
    given: [],
    length: moves.length,
    check: (prefix, q) => {
      const want = moves[prefix.length];
      if (q === want) return null;
      if (ins && q < p) return `Elements before index ${p} don't move`;
      if (!ins && q <= p) return `Elements up to index ${p} don't move left`;
      if (prefix.includes(q)) return "That element has already moved";
      return ins
        ? "Shifted from the front: that would overwrite the next element. Shift from the end backwards"
        : "Shifted from the end: that would overwrite an element. Shift from the gap forwards";
    },
    next: (prefix) => moves[prefix.length],
    name: (q) => String(a[q]),
    cells: (prefix) => {
      const b = state(prefix);
      return {
        values: b.map((v) => (v === null ? "" : String(v))),
        captions: range(cap).map(String),
        marks: Object.fromEntries(
          prefix.map((i) => [ins ? i + 1 : i - 1, "fixed" as CellMark]),
        ),
      };
    },
    explain: `${moves.length} elements move (${moves.map((i) => a[i]).join(", ")}), ${ins ? `then ${x} goes into index ${p}` : "and the array shrinks by one"}. In the worst case every element moves, so inserting or deleting in an array is Θ(n).`,
  };
}

// ---------- Binary search ----------

export function binarySearchPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "size", 13, 6, 16);
  const a = shuffle(
    r,
    range(89).map((i) => i + 10),
  )
    .slice(0, n)
    .sort((x, y) => x - y);
  const present = r() < 0.6;
  let t = a[int(r, 0, n - 1)];
  if (!present) {
    t = int(r, 11, 98);
    while (a.includes(t)) t = int(r, 11, 98);
  }
  const probes: number[] = [];
  const bounds: [number, number][] = [];
  let lo = 0,
    hi = n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    probes.push(mid);
    bounds.push([lo, hi]);
    if (a[mid] === t) break;
    if (a[mid] < t) lo = mid + 1;
    else hi = mid - 1;
  }
  return {
    family: "order",
    board: {
      kind: "cells",
      values: a.map(String),
      captions: range(n).map(String),
    },
    pick: "cell",
    task: `Binary search for ${t}. Click each element the search compares ${t} with, in order (middle = ⌊(low + high) / 2⌋).`,
    given: [],
    length: probes.length,
    hideCount: true,
    check: (prefix, q) => {
      const k = prefix.length;
      if (q === probes[k]) return null;
      const [l, h] = bounds[k];
      if (q < l || q > h)
        return "Looked in the half that was already ruled out";
      if (k === 0 && q === 0)
        return "Started at the front like a linear search; binary search starts in the middle";
      if (q === Math.ceil((l + h) / 2))
        return "Rounded the middle up instead of down";
      return "Not the middle of the remaining range";
    },
    next: (prefix) => probes[prefix.length],
    name: (q) => String(a[q]),
    cells: (prefix) => {
      const k = Math.min(prefix.length, probes.length - 1);
      const [l, h] =
        prefix.length < probes.length ? bounds[k] : [probes[k], probes[k]];
      const marks: Record<number, CellMark> = {};
      range(n).forEach((i) => {
        if (i < l || i > h) marks[i] = "later";
      });
      prefix.forEach((i) => (marks[i] = "done"));
      return { values: a.map(String), captions: range(n).map(String), marks };
    },
    explain: `Comparisons: ${probes.map((i) => a[i]).join(", ")} — ${a[probes[probes.length - 1]] === t ? `found at index ${probes[probes.length - 1]}` : `the range became empty, so ${t} is not there`}. Each comparison halves the range, so at most ⌊log₂ ${n}⌋ + 1 = ${Math.floor(Math.log2(n)) + 1} comparisons, against up to ${n} for a linear search.`,
  };
}

// ---------- Sparse matrix transpose ----------

export function sparseTransposePuzzle(s: Settings, r: Rng): TablePuzzle {
  const R = opt(s, "rows", 4, 3, 6),
    C = opt(s, "cols", 5, 3, 6);
  const t = opt(s, "terms", 5, 3, 7);
  const cells = shuffle(r, range(R * C))
    .slice(0, t)
    .sort((a, b) => a - b);
  const trip = cells.map((k) => [
    Math.floor(k / C),
    k % C,
    int(r, 1, 9) * (r() < 0.3 ? -1 : 1),
  ]);
  const tt = trip
    .map(([i, j, v]) => [j, i, v])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return {
    family: "table",
    task: `A is ${R} × ${C} with ${t} non-zero terms, stored as (row, column, value) triplets in row order. Fill in the triplets of Aᵀ, also in row order (rows and columns from 0).`,
    lines: [`A: ${trip.map(([i, j, v]) => `(${i}, ${j}, ${v})`).join("  ")}`],
    corner: "term",
    rowHeads: range(t).map((k) => String(k + 1)),
    colHeads: ["row", "column", "value"],
    cells: tt.map(() => [null, null, null]),
    answers: tt,
    why: (k, c, given) => {
      if (c < 2 && given === trip[k][c])
        return "Kept A's order: Aᵀ's triplets must be sorted by their new row (A's column)";
      return null;
    },
    explain: `Swap row and column in every triplet, then sort by the new row: ${tt.map(([i, j, v]) => `(${i}, ${j}, ${v})`).join(" ")}. The fast transpose counts the terms in each column of A first, so it places every term directly: Θ(columns + terms).`,
  };
}

// ---------- Recursion tree ----------

export function recursionTreePuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "n", int(r, 4, 5), 3, 5);
  const labels: string[] = [];
  const children: number[][] = [];
  const build = (k: number): number => {
    const id = labels.length;
    labels.push(`f(${k})`);
    children.push([]);
    if (k >= 2) children[id] = [build(k - 1), build(k - 2)];
    return id;
  };
  build(n);
  const order = range(labels.length); // ids are assigned in call order (preorder)
  const board = treeLayout(children, 0, labels);
  const parent = range(labels.length).map((v) =>
    children.findIndex((c) => c.includes(v)),
  );
  return {
    family: "order",
    board,
    pick: "node",
    task: `fib(n) calls f(n − 1) first, then f(n − 2); f(0) and f(1) return at once. Click the calls in the order they start, beginning with f(${n}).`,
    lines: ["f(n): if n < 2 return n", "      return f(n − 1) + f(n − 2)"],
    given: [],
    length: labels.length,
    check: (prefix, p) => {
      const want = order[prefix.length];
      if (p === want) return null;
      if (prefix.includes(p)) return "That call has already started";
      if (parent[p] >= 0 && !prefix.includes(parent[p]))
        return "A call can only start after its caller has started";
      if (parent[p] === parent[want])
        return "Called f(n − 2) before f(n − 1) had finished";
      return "Recursion finishes a whole subtree before moving on (depth-first)";
    },
    next: (prefix) => order[prefix.length],
    name: (p) => labels[p],
    explain: `The calls start in preorder of the recursion tree, which is the order the call stack grows. f(${n}) makes ${labels.length} calls in all, because the same values are recomputed again and again — the tree grows like φⁿ. Memoisation brings it down to n + 1 calls.`,
  };
}

// ---------- Linked list in memory ----------

export function linkedListPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 6, 4, 9);
  const slots = n + opt(s, "free", 2, 0, 4);
  const pos = shuffle(r, range(slots));
  const listAt = pos.slice(0, n); // listAt[k] = slot of the k-th list node
  const data = shuffle(
    r,
    range(26).map((i) => LETTERS[i % 16] + (i >= 16 ? "'" : "")),
  ).slice(0, slots);
  const next: (number | null)[] = Array(slots).fill(null);
  listAt.forEach((sl, k) => (next[sl] = k + 1 < n ? listAt[k + 1] : -1));
  // boxes outside the list hold stale pointers, like freed memory
  pos.slice(n).forEach((sl) => (next[sl] = int(r, 0, slots - 1)));
  const head = listAt[0];
  const label = (sl: number) =>
    `${data[sl]} → ${next[sl] === null ? "?" : next[sl] === -1 ? "null" : next[sl]}`;
  return {
    family: "order",
    board: {
      kind: "cells",
      values: range(slots).map(label),
      captions: range(slots).map(String),
    },
    pick: "cell",
    task: `The list's nodes are scattered in memory; each box shows data → address of the next node. head = ${head}. Click the nodes in list order. Some boxes aren't in the list.`,
    given: [],
    length: n,
    check: (prefix, p) => {
      const want = listAt[prefix.length];
      if (p === want) return null;
      if (!listAt.includes(p))
        return "That box is not reachable from head (it isn't in the list)";
      if (prefix.length && p === prefix[prefix.length - 1] + 1)
        return "Took the next address in memory instead of following the next pointer";
      return "Follow the next pointer of the last node you visited";
    },
    next: (prefix) => listAt[prefix.length],
    name: (p) => data[p],
    cells: (prefix) => ({
      values: range(slots).map(label),
      captions: range(slots).map(String),
      marks: doneMarks(prefix),
    }),
    explain: `List order: ${listAt.map((sl) => data[sl]).join(" → ")} → null. Unlike an array, the k-th node can only be reached by following k pointers from head: access is Θ(n), but inserting after a known node is Θ(1).`,
  };
}

// ---------- Polynomials ----------

const sup = (k: number) =>
  k === 0 ? "" : k === 1 ? "x" : `x${"⁰¹²³⁴⁵⁶⁷⁸⁹"[k]}`;
const poly = (c: number[]) => {
  const parts = c
    .map((v, k) => [v, k] as const)
    .filter(([v]) => v !== 0)
    .reverse()
    .map(([v, k], i) => {
      const sign = v < 0 ? (i ? " − " : "−") : i ? " + " : "";
      const a = Math.abs(v);
      return `${sign}${a === 1 && k > 0 ? "" : a}${sup(k)}`;
    });
  return parts.join("") || "0";
};

export function polynomialPuzzle(s: Settings, r: Rng): TablePuzzle {
  const op = pick(s, "op", ["add", "multiply"] as const, "multiply");
  const dp = opt(s, "degree", 2, 1, 3);
  const coef = () => {
    const c = range(dp + 1).map(() => int(r, -4, 5));
    if (!c[dp]) c[dp] = int(r, 1, 3);
    return c;
  };
  const p = coef(),
    q = coef();
  const out =
    op === "add"
      ? p.map((v, k) => v + q[k])
      : range(2 * dp + 1).map((k) =>
          range(dp + 1).reduce(
            (t, i) => t + (k - i >= 0 && k - i <= dp ? p[i] * q[k - i] : 0),
            0,
          ),
        );
  const deg = out.length - 1;
  return {
    family: "table",
    task: `p(x) = ${poly(p)} and q(x) = ${poly(q)}. Fill in the coefficient of each power in ${op === "add" ? "p(x) + q(x)" : "p(x) · q(x)"}.`,
    corner: "power",
    colHeads: range(deg + 1)
      .map((k) => (k === 0 ? "1" : sup(k)))
      .reverse(),
    rowHeads: [op === "add" ? "p + q" : "p · q"],
    cells: [range(deg + 1).map(() => null)],
    answers: [range(deg + 1).map((i) => out[deg - i])],
    why: (_r, c, given) => {
      const k = deg - c;
      if (op === "multiply" && given === (p[k] ?? 0) * (q[k] ?? 0))
        return "Multiplied matching powers; xⁱ · xʲ = xⁱ⁺ʲ, so add up every pair with i + j = k";
      return null;
    },
    explain: `${op === "add" ? "p + q" : "p · q"} = ${poly(out)}. ${op === "add" ? "Walk both term lists together, adding coefficients of equal powers: Θ(m + n)." : "Every term of p meets every term of q (Θ(mn) products); terms with the same power are added together."}`,
  };
}

// ---------- Stacks and queues ----------

export function stackQueuePuzzle(s: Settings, r: Rng): OrderPuzzle {
  const kind = pick(s, "kind", ["stack", "queue"] as const, "stack");
  const pushes = opt(s, "pushes", 6, 4, 9);
  const vals = shuffle(
    r,
    range(89).map((i) => i + 10),
  ).slice(0, pushes);
  // a random valid sequence of push (true) and pop (false) operations
  const ops: boolean[] = [];
  let size = 0,
    pushed = 0;
  while (pushed < pushes || size > 0) {
    const push = pushed < pushes && (size === 0 || r() < 0.55);
    ops.push(push);
    if (push) {
      pushed++;
      size++;
    } else size--;
  }
  const pops = ops.filter((o) => !o).length;
  // simulate: which push index each pop removes, and how many pushes happened before each pop
  const removed: number[] = [];
  const pushedBefore: number[] = [];
  const live: number[] = [];
  let k = 0;
  for (const o of ops) {
    if (o) live.push(k++);
    else {
      removed.push(kind === "stack" ? live.pop()! : live.shift()!);
      pushedBefore.push(k);
    }
  }
  const opText = (() => {
    let i = 0;
    return ops
      .map((o) =>
        o ? `push ${vals[i++]}` : kind === "stack" ? "pop" : "dequeue",
      )
      .join(", ");
  })();
  const word = kind === "stack" ? "pop" : "dequeue";
  return {
    family: "order",
    board: { kind: "cells", values: vals.map(String) },
    pick: "cell",
    task: `A ${kind} runs these operations. The boxes are the values in the order they are ${kind === "stack" ? "pushed" : "enqueued"}. For each ${word}, click the value it removes.`,
    lines: [opText.replace(/push/g, kind === "stack" ? "push" : "enqueue")],
    given: [],
    length: pops,
    step: (prefix) =>
      prefix.length < pops ? `${word} #${prefix.length + 1}` : "Done",
    check: (prefix, p) => {
      const i = prefix.length;
      if (p === removed[i]) return null;
      if (prefix.includes(p)) return "That value was already removed";
      if (p >= pushedBefore[i])
        return "That value hasn't been added yet at this point";
      return kind === "stack"
        ? "A stack removes the most recently pushed value (last in, first out)"
        : "A queue removes the value that has waited longest (first in, first out)";
    },
    next: (prefix) => removed[prefix.length],
    name: (p) => String(vals[p]),
    cells: (prefix) => {
      const i = Math.min(prefix.length, pops - 1);
      const marks: Record<number, CellMark> = {};
      vals.forEach((_, v) => {
        if (prefix.includes(v)) marks[v] = "done";
        else if (prefix.length < pops && v >= pushedBefore[i])
          marks[v] = "later";
      });
      return { values: vals.map(String), marks };
    },
    explain: `Removed in order: ${removed.map((v) => vals[v]).join(", ")}. ${kind === "stack" ? "A stack only touches its top: push and pop are Θ(1) and the last value in is the first out." : "A queue adds at the rear and removes at the front, both Θ(1): the first value in is the first out."}`,
  };
}

// ---------- Infix → postfix ----------

type Expr = { op: string; l: Expr; r: Expr } | { leaf: string };
const PREC: Record<string, number> = { "+": 1, "−": 1, "×": 2, "/": 2, "^": 3 };

export function postfixPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const ops = opt(s, "operators", 4, 2, 6);
  const leaves = shuffle(r, "abcdefgh".split(""));
  let used = 0;
  const gen = (k: number): Expr => {
    if (k === 0) return { leaf: leaves[used++] };
    const left = int(r, 0, k - 1);
    const symbols = ["+", "−", "×", "/", "^"];
    return {
      op: symbols[int(r, 0, symbols.length - 1)],
      l: gen(left),
      r: gen(k - 1 - left),
    };
  };
  const e = gen(ops);
  // infix tokens with the brackets needed (^ is right-associative, the rest left)
  const tokens: string[] = [];
  const postfix: number[] = [];
  const emit = (x: Expr, parentPrec = 0, side: "l" | "r" | "" = "") => {
    if ("leaf" in x) {
      postfix.push(tokens.length);
      tokens.push(x.leaf);
      return;
    }
    const p = PREC[x.op];
    const right = x.op === "^";
    const need =
      p < parentPrec ||
      (p === parentPrec && (right ? side === "l" : side === "r"));
    if (need) tokens.push("(");
    emit(x.l, p, "l");
    const at = tokens.length;
    tokens.push(x.op);
    emit(x.r, p, "r");
    postfix.push(at);
    if (need) tokens.push(")");
  };
  emit(e);
  const n = postfix.length;
  const isOp = (i: number) => tokens[i] in PREC;
  const want = (prefix: number[]) => postfix[prefix.length];
  return {
    family: "order",
    board: { kind: "cells", values: tokens },
    pick: "cell",
    task: "Convert the infix expression to postfix: click the operands and operators in postfix order (brackets never appear in postfix).",
    given: [],
    length: n,
    check: (prefix, p) => {
      if (p === want(prefix)) return null;
      if (tokens[p] === "(" || tokens[p] === ")")
        return "Brackets never appear in postfix";
      if (prefix.includes(p)) return "Already used that token";
      if (isOp(p) && !isOp(want(prefix)))
        return "Wrote an operator before both of its operands";
      if (isOp(p) && isOp(want(prefix)))
        return PREC[tokens[p]] !== PREC[tokens[want(prefix)]]
          ? "Ignored precedence: ^ binds tighter than × and /, which bind tighter than + and −"
          : "Wrote the operators in the wrong order (left to right for equal precedence, except ^)";
      return "Operands keep their left-to-right order in postfix";
    },
    next: want,
    name: (p) => tokens[p],
    cells: (prefix) => ({ values: tokens, marks: doneMarks(prefix) }),
    explain: `Postfix: ${postfix.map((i) => tokens[i]).join(" ")}. Operands keep their order; an operator comes right after both its operands. The stack algorithm pushes operators and pops those of higher (or equal, left-associative) precedence before pushing a new one.`,
  };
}

// ---------- General trees ----------

export function generalTreePuzzle(s: Settings, r: Rng): OrderPuzzle {
  const order = pick(
    s,
    "order",
    ["preorder", "postorder"] as const,
    "preorder",
  );
  const n = opt(s, "nodes", 9, 5, 12);
  const children: number[][] = range(n).map(() => []);
  for (let v = 1; v < n; v++) {
    let p = int(r, 0, v - 1);
    while (children[p].length >= 3) p = int(r, 0, v - 1);
    children[p].push(v);
  }
  const labels = range(n).map((i) => LETTERS[i]);
  const seq: number[] = [];
  const go = (v: number) => {
    if (order === "preorder") seq.push(v);
    children[v].forEach(go);
    if (order === "postorder") seq.push(v);
  };
  go(0);
  const board = treeLayout(children, 0, labels);
  return {
    family: "order",
    board,
    pick: "node",
    task: `Click the nodes of this general tree in ${order} (children from left to right).`,
    given: [],
    length: n,
    check: (prefix, p) => {
      const want = seq[prefix.length];
      if (p === want) return null;
      if (prefix.includes(p)) return "Visited a node twice";
      return order === "preorder"
        ? "Preorder visits a node before any of its children, and finishes each child's subtree before the next child"
        : "Postorder visits all of a node's children (each subtree fully) before the node";
    },
    next: (prefix) => seq[prefix.length],
    name: (p) => labels[p],
    explain: `${order[0].toUpperCase() + order.slice(1)}: ${seq.map((v) => labels[v]).join(", ")}. In the child–sibling (binary) form, each node's left link is its first child and its right link its next sibling; the general tree's preorder is that binary tree's preorder, and its postorder is the binary tree's inorder.`,
  };
}

// ---------- Tries ----------

const WORDS = [
  "ant",
  "and",
  "an",
  "bat",
  "bad",
  "ban",
  "band",
  "cab",
  "can",
  "cat",
  "cart",
  "car",
  "dot",
  "dog",
  "do",
  "tea",
  "ten",
  "to",
  "tan",
  "tab",
];

export function triePuzzle(s: Settings, r: Rng): OrderPuzzle {
  const k = opt(s, "words", 6, 3, 9);
  const words = shuffle(r, WORDS).slice(0, k);
  const labels = ["•"],
    children: number[][] = [[]],
    end: boolean[] = [false];
  const child = (v: number, ch: string) =>
    children[v].find((c) => labels[c] === ch);
  for (const w of words) {
    let v = 0;
    for (const ch of w) {
      let c = child(v, ch);
      if (c === undefined) {
        c = labels.length;
        labels.push(ch);
        children.push([]);
        end.push(false);
        children[v].push(c);
        children[v].sort((a, b) => labels[a].localeCompare(labels[b]));
      }
      v = c;
    }
    end[v] = true;
  }
  const target = words[int(r, 0, k - 1)];
  const path: number[] = [];
  for (let v = 0, i = 0; i < target.length; i++) {
    v = child(v, target[i])!;
    path.push(v);
  }
  const board = treeLayout(
    children,
    0,
    labels.map((l, i) => (end[i] ? `${l}*` : l)),
  );
  return {
    family: "order",
    board,
    pick: "node",
    task: `Search the trie for "${target}": starting below the root, click the node for each letter in turn. (* marks the end of a word.)`,
    lines: [`Words stored: ${words.join(", ")}`],
    given: [],
    length: path.length,
    hideCount: true,
    check: (prefix, p) => {
      const want = path[prefix.length];
      if (p === want) return null;
      const from = prefix.length ? prefix[prefix.length - 1] : 0;
      if (!children[from].includes(p))
        return "Each step goes from the current node to one of its children";
      return `That child is "${labels[p]}", but the next letter is "${target[prefix.length]}"`;
    },
    next: (prefix) => path[prefix.length],
    name: (p) => labels[p],
    explain: `Searching follows one child per letter: ${target.length} steps, however many words are stored. Words that share a prefix share the nodes for it — that is what makes tries good for autocomplete.`,
  };
}

// ---------- Merging two sorted runs ----------

export function mergePuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "size", 8, 4, 12);
  const vals = shuffle(
    r,
    range(89).map((i) => i + 10),
  ).slice(0, n);
  const half = Math.ceil(n / 2);
  const L = vals.slice(0, half).sort((a, b) => a - b),
    R = vals.slice(half).sort((a, b) => a - b);
  const a = [...L, ...R];
  const merged = [...range(n)].sort((x, y) => a[x] - a[y]);
  const front = (prefix: number[]) => {
    const li = range(half).find((i) => !prefix.includes(i));
    const ri = range(n - half)
      .map((i) => i + half)
      .find((i) => !prefix.includes(i));
    return { li, ri };
  };
  return {
    family: "order",
    board: {
      kind: "cells",
      values: a.map(String),
      captions: a.map((_, i) => (i < half ? "left" : "right")),
    },
    pick: "cell",
    task: "Merge the two sorted runs (left and right): click the values in the order the merge writes them out.",
    given: [],
    length: n,
    check: (prefix, p) => {
      const want = merged[prefix.length];
      if (p === want) return null;
      if (prefix.includes(p)) return "That value is already written out";
      const { li, ri } = front(prefix);
      if (p !== li && p !== ri)
        return "Took a value that isn't at the front of its run";
      return "Took the larger of the two front values";
    },
    next: (prefix) => merged[prefix.length],
    name: (p) => String(a[p]),
    cells: (prefix) => {
      const { li, ri } = front(prefix);
      const marks = doneMarks(prefix);
      if (li !== undefined) marks[li] = "active";
      if (ri !== undefined) marks[ri] = "active";
      return {
        values: a.map(String),
        captions: a.map((_, i) => (i < half ? "left" : "right")),
        marks,
      };
    },
    explain: `Merged: ${merged.map((i) => a[i]).join(", ")}. Each step compares just the two fronts, so merging is Θ(n); merge sort does this on log₂ n levels, giving Θ(n log n).`,
  };
}

// ---------- One LSD radix pass (sorting on keys) ----------

export function radixPassPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "size", 8, 5, 10);
  for (;;) {
    const a = shuffle(
      r,
      range(90).map((i) => i + 10),
    ).slice(0, n);
    const digit = (x: number) => x % 10;
    const counts = range(10).map((d) => a.filter((x) => digit(x) === d).length);
    if (!counts.some((c) => c >= 2)) continue;
    const out = range(n).sort((x, y) => digit(a[x]) - digit(a[y]) || x - y);
    return {
      family: "order",
      board: { kind: "cells", values: a.map(String) },
      pick: "cell",
      task: "One pass of LSD radix sort orders the numbers by their ones digit only, keeping numbers with the same ones digit in their original order. Click the numbers in their order after this pass.",
      given: [],
      length: n,
      check: (prefix, p) => {
        const want = out[prefix.length];
        if (p === want) return null;
        if (prefix.includes(p)) return "Already placed that number";
        if (digit(a[p]) === digit(a[want]))
          return "Numbers with the same ones digit must keep their original order (the pass must be stable)";
        if (
          Math.floor(a[p] / 10) < Math.floor(a[want] / 10) &&
          digit(a[p]) > digit(a[want])
        )
          return "Sorted by the tens digit; LSD radix sort starts with the ones digit";
        return "Order by the ones digit: 0 first, 9 last";
      },
      next: (prefix) => out[prefix.length],
      name: (p) => String(a[p]),
      cells: (prefix) => ({ values: a.map(String), marks: doneMarks(prefix) }),
      explain: `After the ones-digit pass: ${out.map((i) => a[i]).join(", ")}. A second stable pass on the tens digit then sorts them completely. Stability is what makes it work: the tens pass keeps the ones order for equal tens digits. Each pass is Θ(n + 10).`,
    };
  }
}

// ---------- Degrees in a directed multigraph ----------

export function degreePuzzle(s: Settings, r: Rng): TablePuzzle {
  const n = opt(s, "nodes", 4, 3, 6);
  const m = opt(s, "edges", 8, n, 12);
  const edges: { a: number; b: number }[] = [];
  for (let i = 1; i < n; i++) edges.push({ a: int(r, 0, i - 1), b: i });
  edges.push({ a: int(r, 0, n - 1), b: 0 });
  const loopAt = int(r, 0, n - 1);
  edges.push({ a: loopAt, b: loopAt });
  const dup = edges[int(r, 0, n - 2)];
  edges.push({ ...dup });
  while (edges.length < m)
    edges.push({ a: int(r, 0, n - 1), b: int(r, 0, n - 1) });
  const show = graphBoard(r, n, edges, true);
  const L = show.nodes.map((v) => v.label);
  const outd = range(n).map((v) => edges.filter((e) => e.a === v).length);
  const ind = range(n).map((v) => edges.filter((e) => e.b === v).length);
  const loops = range(n).map(
    (v) => edges.filter((e) => e.a === v && e.b === v).length,
  );
  return {
    family: "table",
    task: "This directed multigraph has a loop and parallel edges. Fill in each vertex's in-degree (arrows in) and out-degree (arrows out).",
    show,
    corner: "vertex",
    rowHeads: L,
    colHeads: ["in-degree", "out-degree"],
    cells: range(n).map(() => [null, null]),
    answers: range(n).map((v) => [ind[v], outd[v]]),
    why: (v, c, given) => {
      const want = c === 0 ? ind[v] : outd[v];
      if (loops[v] && given === want - loops[v])
        return "A loop counts once as an arrow out and once as an arrow in";
      if (given < want) return "Count every parallel edge separately";
      return null;
    },
    explain: `In-degrees ${ind.join(", ")}; out-degrees ${outd.join(", ")}. Both add up to the number of edges (${edges.length}): every edge, loops included, has exactly one tail and one head. An adjacency matrix records parallel edges as counts greater than 1.`,
  };
}
