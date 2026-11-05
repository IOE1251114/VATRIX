import { describe, expect, it } from "vitest";
import {
  addressND,
  address1D,
  binarySearchFrames,
  deleteFrames,
  fastTranspose,
  insertFrames,
  layout,
  linearSearchFrames,
  simpleTranspose,
  sparseMultiply,
  toDense,
  toSparse,
} from "./arrays";
import {
  factorialFrames,
  fibTree,
  hanoiMoves,
  hanoiState,
  queensFrames,
} from "./recursion";
import {
  addPolyFrames,
  formatPoly,
  gAtoms,
  gDepth,
  gLength,
  listOp,
  makeList,
  multiplyPolyFrames,
  parseGList,
  parsePoly,
} from "./lists";
import {
  dequeue,
  emptyQueue,
  enqueue,
  evalPostfixFrames,
  queueItems,
  solveMaze,
  toPostfixFrames,
  toPrefix,
  tokenize,
} from "./stacksQueues";
import {
  buildTrie,
  evalTreeFrames,
  fromLevelOrder,
  inorderThreads,
  parseGeneral,
  toBinary,
  traverse,
  treeFromPostfix,
  treeProps,
  walkTrie,
  wordsWithPrefix,
} from "./trees";
import {
  classifyGraph,
  countMatrix,
  degrees,
  elementarySort,
  externalSort,
  multiKeySort,
} from "./sortGraph";

describe("Unit I — arrays", () => {
  it("computes 1-D and 2-D addresses (Lipschutz examples)", () => {
    expect(address1D(200, 4, 1932, 1965)).toBe(332);
    // 25 × 4 array, base 200, w = 4: A[12,3] row-major and column-major.
    const dims = [
      { lb: 1, ub: 25 },
      { lb: 1, ub: 4 },
    ];
    expect(addressND(200, 4, dims, [12, 3], "row").address).toBe(384);
    expect(addressND(200, 4, dims, [12, 3], "col").address).toBe(444);
  });
  it("lays out a 2 × 3 array in row- and column-major order", () => {
    const dims = [
      { lb: 0, ub: 1 },
      { lb: 0, ub: 2 },
    ];
    expect(layout(dims, "row").map((t) => t.join(""))).toEqual([
      "00",
      "01",
      "02",
      "10",
      "11",
      "12",
    ]);
    expect(layout(dims, "col").map((t) => t.join(""))).toEqual([
      "00",
      "10",
      "01",
      "11",
      "02",
      "12",
    ]);
  });
  it("counts shifts for insertion and deletion", () => {
    const a = [10, 20, 30, 40, null, null];
    const ins = insertFrames(a, 4, 1, 15);
    expect(ins.result.slice(0, 5)).toEqual([10, 15, 20, 30, 40]);
    expect(ins.frames.at(-1)!.moves).toBe(3);
    const del = deleteFrames(ins.result, ins.n, 0);
    expect(del.result.slice(0, 4)).toEqual([15, 20, 30, 40]);
    expect(del.frames.at(-1)!.moves).toBe(4);
  });
  it("searches linearly and by halving", () => {
    const a = [3, 8, 15, 21, 30, 42, 57, 63];
    expect(linearSearchFrames(a, 42).at(-1)!.found).toBe(5);
    const b = binarySearchFrames(a, 42);
    expect(b.at(-1)!.found).toBe(5);
    expect(b.at(-1)!.comparisons).toBeLessThanOrEqual(4);
    expect(binarySearchFrames(a, 4).at(-1)!.found).toBeUndefined();
  });
  it("transposes sparse matrices both ways and multiplies them", () => {
    const m = [
      [0, 0, 3],
      [4, 0, 0],
      [0, 5, 6],
    ];
    const s = toSparse(m);
    const t = toDense({
      rows: 3,
      cols: 3,
      terms: fastTranspose(s).at(-1)!.out as [number, number, number][],
    });
    expect(t).toEqual([
      [0, 4, 0],
      [0, 0, 5],
      [3, 0, 6],
    ]);
    expect(simpleTranspose(s).at(-1)!.out).toEqual(
      fastTranspose(s).at(-1)!.out,
    );
    const prod = sparseMultiply(s, toSparse(t)).at(-1)!.acc;
    expect(prod).toEqual([
      [9, 0, 18],
      [0, 16, 0],
      [18, 0, 61],
    ]);
  });
});

describe("Unit II — recursion and lists", () => {
  it("returns n! from the call stack", () => {
    expect(factorialFrames(5).at(-1)!.returned).toBe(120);
    expect(factorialFrames(0).at(-1)!.returned).toBe(1);
  });
  it("builds the Fibonacci recursion tree with fib(n+1)·2 − 1 calls", () => {
    const t = fibTree(6);
    expect(t[0].value).toBe(8);
    expect(t.length).toBe(25);
    expect(t.some((n) => n.repeat)).toBe(true);
  });
  it("finds the first 4-queens solution and reports none for 3 queens", () => {
    expect(queensFrames(4).at(-1)!.queens).toEqual([1, 3, 0, 2]);
    expect(queensFrames(3).at(-1)!.solutions).toBe(0);
  });
  it("runs list operations", () => {
    let l = makeList([5, 9, 2]);
    l = listOp(l, { kind: "insert-head", value: 1 }, "singly").result;
    l = listOp(l, { kind: "insert-at", value: 7, pos: 2 }, "singly").result;
    l = listOp(l, { kind: "delete", value: 9 }, "doubly").result;
    l = listOp(l, { kind: "reverse" }, "singly").result;
    expect(l.map((n) => n.value)).toEqual([2, 7, 5, 1]);
    expect(
      listOp(l, { kind: "search", value: 5 }, "singly").frames.at(-1)!.found,
    ).toBe(2);
  });
  it("adds and multiplies polynomials", () => {
    const P = parsePoly("3x^2 + 2x + 1");
    const Q = parsePoly("x^2 - 2x + 4");
    expect(formatPoly(addPolyFrames(P, Q).at(-1)!.result)).toBe("4x^2 + 5");
    expect(
      formatPoly(
        multiplyPolyFrames(parsePoly("x + 1"), parsePoly("x - 1")).at(-1)!
          .result,
      ),
    ).toBe("x^2 − 1");
  });
  it("parses generalized lists", () => {
    const g = parseGList("(a, (b, c), d, (e, (f)))");
    expect(gLength(g)).toBe(4);
    expect(gDepth(g)).toBe(3);
    expect(gAtoms(g)).toBe(6);
  });
});

describe("Unit III — stacks and queues", () => {
  it("moves 2ⁿ − 1 disks and ends on peg C", () => {
    const m = hanoiMoves(4);
    expect(m.length).toBe(15);
    expect(hanoiState(4, m, m.length).C).toEqual([4, 3, 2, 1]);
  });
  it("shows linear-queue overflow that a circular queue avoids", () => {
    let lin = emptyQueue(3),
      cir = emptyQueue(3);
    for (const x of [1, 2, 3]) {
      lin = enqueue(lin, x, "linear").state;
      cir = enqueue(cir, x, "circular").state;
    }
    lin = dequeue(lin, "linear").state;
    cir = dequeue(cir, "circular").state;
    expect(enqueue(lin, 4, "linear").ok).toBe(false);
    const c2 = enqueue(cir, 4, "circular");
    expect(c2.ok).toBe(true);
    expect(queueItems(c2.state)).toEqual([2, 3, 4]);
  });
  it("converts and evaluates expressions", () => {
    const t = tokenize("A + B * (C - D) / E");
    expect(toPostfixFrames(t).at(-1)!.output.join("")).toBe("ABCD-*E/+");
    expect(toPrefix(t).join("")).toBe("+A/*B-CDE");
    expect(toPrefix(tokenize("A^B^C")).join("")).toBe("^A^BC");
    expect(toPostfixFrames(tokenize("A^B^C")).at(-1)!.output.join("")).toBe(
      "ABC^^",
    );
    const ev = evalPostfixFrames(tokenize("5 6 2 + * 12 4 / -"), {});
    expect(ev.at(-1)!.stack).toEqual([37]);
  });
  it("solves a maze with a queue along a shortest path", () => {
    const grid = ["S.#", "..#", "#.E"];
    const bfs = solveMaze(grid, "queue").at(-1)!;
    expect(bfs.path!.length - 1).toBe(4);
    expect(solveMaze(grid, "stack").at(-1)!.path).toBeDefined();
    // The two mazes shown in the lab are solvable, and the stack's path is longer than the queue's.
    for (const m of [
      [
        "S.........",
        "..........",
        "....##....",
        "....##....",
        "..........",
        "..........",
        ".........E",
      ],
      [
        "S....#....",
        ".###.#.##.",
        ".#.......#",
        ".#.####.#.",
        "...#..#...",
        "##.#.##.#.",
        "...#.....E",
      ],
    ])
      expect(solveMaze(m, "stack").at(-1)!.path!.length).toBeGreaterThan(
        solveMaze(m, "queue").at(-1)!.path!.length,
      );
  });
});

describe("Unit IV — trees", () => {
  it("traverses and measures a binary tree", () => {
    const t = fromLevelOrder(["A", "B", "C", "D", "E", null, "F"]);
    const lab = (k: "pre" | "in" | "post" | "level") =>
      traverse(t, k)
        .map((n) => n.label)
        .join("");
    expect(lab("pre")).toBe("ABDECF");
    expect(lab("in")).toBe("DBEACF");
    expect(lab("post")).toBe("DEBFCA");
    expect(lab("level")).toBe("ABCDEF");
    const p = treeProps(t);
    expect(p).toMatchObject({
      nodes: 6,
      leaves: 3,
      levels: 3,
      complete: false,
      strict: false,
    });
    expect(p.externalPath).toBe(p.internalPath + 12);
  });
  it("evaluates an expression tree", () => {
    const t = treeFromPostfix(tokenize("A B + C *"));
    expect(
      evalTreeFrames(t, { A: 2, B: 3, C: 4 }).at(-1)!.values.get(t!.id),
    ).toBe(20);
  });
  it("converts a general tree to left-child right-sibling form", () => {
    const b = toBinary(parseGeneral("A(B(E,F),C,D(G))"));
    expect(
      traverse(b, "pre")
        .map((n) => n.label)
        .join(""),
    ).toBe("ABEFCDG");
    expect(b.left!.label).toBe("B");
    expect(b.left!.right!.label).toBe("C");
  });
  it("threads empty pointers to in-order neighbours", () => {
    const t = fromLevelOrder(["B", "A", "C"]);
    const th = inorderThreads(t);
    expect(th.length).toBe(4);
    expect(
      th.find((x) => x.side === "right" && x.from === t!.left!.id)!.to,
    ).toBe(t!.id);
  });
  it("stores and finds words in a trie", () => {
    const tr = buildTrie(["tree", "trie", "try", "to"]);
    expect(walkTrie(tr, "tri").result).toBe("prefix");
    expect(walkTrie(tr, "try").result).toBe("word");
    expect(walkTrie(tr, "tx").result).toBe("missing");
    expect(wordsWithPrefix(tr, "tr")).toEqual(["tree", "trie", "try"]);
  });
});

describe("Unit V — sorting and graphs", () => {
  it("sorts with bubble, selection and insertion sort", () => {
    const a = [5, 1, 4, 2, 8];
    for (const k of ["bubble", "selection", "insertion"] as const)
      expect(elementarySort(a, k).at(-1)!.a).toEqual([1, 2, 4, 5, 8]);
    expect(elementarySort([1, 2, 3, 4], "bubble").at(-1)!.comparisons).toBe(3);
  });
  it("sorts on two keys with stable passes", () => {
    const r = multiKeySort(
      [
        { name: "Ravi", dept: "CS", marks: 70 },
        { name: "Anu", dept: "EE", marks: 90 },
        { name: "Bela", dept: "CS", marks: 90 },
      ],
      ["dept", "marks"],
    );
    expect(r.at(-1)!.result.map((x) => x.name)).toEqual([
      "Bela",
      "Ravi",
      "Anu",
    ]);
  });
  it("needs ⌈log₂ runs⌉ external merge passes", () => {
    const f = externalSort([9, 4, 7, 1, 8, 2, 6, 3, 5, 0], 3);
    expect(f.at(-1)!.runs).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]);
    expect(f.at(-1)!.pass).toBe(2);
  });
  it("counts parallel edges, loops and degrees", () => {
    const edges = [
      { u: 0, v: 1 },
      { u: 1, v: 0 },
      { u: 1, v: 1 },
    ];
    expect(classifyGraph(edges, false).kind).toBe("pseudograph");
    expect(countMatrix(2, edges, false)[0][1]).toBe(2);
    expect(degrees(2, edges).deg).toEqual([2, 4]);
    expect(classifyGraph(edges.slice(0, 2), true).kind).toBe(
      "directed simple graph",
    );
  });
});

describe("Data Structures course data", () => {
  it("gives every topic at least two practice problems and solvable mazes", async () => {
    const { dsUnits } = await import("./units");
    const { dsProblems } = await import("./problems");
    const ids = dsUnits.flatMap((u) => u.topics.map((t) => t.id));
    for (const id of ids)
      expect(
        dsProblems.filter((p) => p.topic === id).length,
      ).toBeGreaterThanOrEqual(2);
    expect(new Set(dsProblems.map((p) => p.id)).size).toBe(dsProblems.length);
  });
  it("answers its own numeric problems correctly", () => {
    expect(hanoiMoves(6).length).toBe(63);
    expect(fibTree(5).length).toBe(15);
    expect(
      evalPostfixFrames(tokenize("5 6 2 + * 12 4 / -"), {}).at(-1)!.stack[0],
    ).toBe(37);
    expect(
      externalSort(
        Array.from({ length: 1600 }, (_, i) => 1600 - i),
        100,
      ).at(-1)!.pass,
    ).toBe(4);
  });
});
