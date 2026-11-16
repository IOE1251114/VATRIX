import { describe, expect, it } from "vitest";
import { makePuzzle, PUZZLES } from ".";
import type { OrderPuzzle, Vec } from "./core";
import {
  hanoiBest,
  hanoiLegal,
  hanoiMove,
  hanoiStart,
  type Pegs,
} from "./dsPuzzles";

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);

/** Every option a click could be, for an order puzzle. */
const choices = (p: OrderPuzzle) =>
  p.board.kind === "graph"
    ? p.pick === "edge"
      ? p.board.edges.length
      : p.board.nodes.length
    : p.board.values.length;

describe("puzzle registry", () => {
  it("builds every type, and the same seed gives the same board", () => {
    for (const type of Object.keys(PUZZLES))
      for (const seed of SEEDS.slice(0, 5)) {
        const a = makePuzzle({ type }, seed),
          b = makePuzzle({ type }, seed);
        expect(a).not.toBeNull();
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
  });
  it("returns null for an unknown type", () => {
    expect(makePuzzle({ type: "nope" }, 1)).toBeNull();
  });
  it("keeps settings within their limits", () => {
    const p = makePuzzle({ type: "bfs", nodes: 99 }, 1) as OrderPuzzle;
    expect(p.length).toBe(10);
    const q = makePuzzle({ type: "bfs", nodes: "seven" }, 1) as OrderPuzzle;
    expect(q.length).toBe(7);
  });
});

describe("order puzzles", () => {
  const types = [
    "bfs",
    "dfs",
    "topo",
    "dijkstra",
    "kruskal",
    "tree-order",
    "bst-search",
    "selection-sort",
  ];
  it("accepts the worked answer and rejects every other click with a reason", () => {
    for (const type of types)
      for (const seed of SEEDS) {
        const p = makePuzzle({ type }, seed) as OrderPuzzle;
        const prefix = [...p.given];
        while (prefix.length < p.length) {
          const want = p.next(prefix);
          expect(p.check(prefix, want), `${type} ${seed}`).toBeNull();
          if (type !== "topo" && type !== "dijkstra")
            for (let c = 0; c < choices(p); c++)
              if (c !== want) expect(typeof p.check(prefix, c)).toBe("string");
          prefix.push(want);
        }
        expect(p.explain.length).toBeGreaterThan(10);
      }
  });

  it("topological order: every edge points forward in the accepted order", () => {
    for (const seed of SEEDS) {
      const p = makePuzzle({ type: "topo" }, seed) as OrderPuzzle;
      if (p.board.kind !== "graph") throw new Error("graph expected");
      const order: number[] = [];
      while (order.length < p.length) order.push(p.next(order));
      for (const e of p.board.edges)
        expect(order.indexOf(e.a)).toBeLessThan(order.indexOf(e.b));
      // a vertex with an unpicked predecessor is refused
      const blocked = p.board.edges[0].b;
      expect(p.check([], blocked)).toMatch(/incoming edge/);
    }
  });

  it("Kruskal: picks n − 1 edges with no cycle and the smallest total", () => {
    for (const seed of SEEDS) {
      const p = makePuzzle({ type: "kruskal" }, seed) as OrderPuzzle;
      if (p.board.kind !== "graph") throw new Error("graph expected");
      const { edges, nodes } = p.board;
      const picks: number[] = [];
      while (picks.length < p.length) picks.push(p.next(picks));
      expect(picks.length).toBe(nodes.length - 1);
      // brute force: no spanning tree is cheaper
      const total = picks.reduce((t, i) => t + edges[i].w!, 0);
      const n = nodes.length;
      let best = Infinity;
      const choose = (from: number, chosen: number[]) => {
        if (chosen.length === n - 1) {
          const parent = Array.from({ length: n }, (_, i) => i);
          const f = (x: number): number => (parent[x] === x ? x : f(parent[x]));
          for (const i of chosen) {
            const a = f(edges[i].a),
              b = f(edges[i].b);
            if (a === b) return;
            parent[a] = b;
          }
          best = Math.min(
            best,
            chosen.reduce((t, i) => t + edges[i].w!, 0),
          );
          return;
        }
        for (let i = from; i < edges.length; i++) choose(i + 1, [...chosen, i]);
      };
      if (edges.length <= 14) {
        choose(0, []);
        expect(total).toBe(best);
      }
    }
  });

  it("BFS names the depth-first mistake", () => {
    let seen = false;
    for (const seed of SEEDS) {
      const p = makePuzzle({ type: "bfs" }, seed) as OrderPuzzle;
      const prefix = [...p.given];
      while (prefix.length < p.length && !seen) {
        for (let c = 0; c < choices(p); c++)
          if (p.check(prefix, c)?.includes("depth-first")) seen = true;
        prefix.push(p.next(prefix));
      }
    }
    expect(seen).toBe(true);
  });
});

describe("other puzzles", () => {
  it("Hamiltonian: the shown cycle uses real edges and visits every vertex once", () => {
    for (const seed of SEEDS) {
      const p = makePuzzle({ type: "hamiltonian" }, seed);
      if (p?.family !== "cycle") throw new Error("cycle expected");
      const { solution, board } = p;
      const n = board.nodes.length;
      expect(solution.length).toBe(n + 1);
      expect(new Set(solution).size).toBe(n);
      expect(solution[0]).toBe(p.start);
      expect(solution[n]).toBe(p.start);
      for (let i = 0; i < n; i++) {
        const [a, b] = [solution[i], solution[i + 1]];
        expect(
          board.edges.some(
            (e) => (e.a === a && e.b === b) || (e.a === b && e.b === a),
          ),
        ).toBe(true);
      }
    }
  });

  it("N-Queens: the solution passes and broken boards are explained", () => {
    for (let n = 4; n <= 8; n++) {
      const p = makePuzzle({ type: "queens", n }, n);
      if (p?.family !== "queens") throw new Error("queens expected");
      const qs: Vec[] = p.solution.map((c, r) => [r, c]);
      expect(p.check(qs)).toBeNull();
      expect(p.check(qs.slice(1))).toMatch(/exactly/);
      expect(p.check([...qs.slice(1), [qs[1][0], (qs[1][1] + 1) % n]])).toMatch(
        /share/,
      );
    }
  });

  it("maze: the route joins entrance to exit through open neighbouring squares", () => {
    for (const seed of SEEDS) {
      const p = makePuzzle({ type: "maze" }, seed);
      if (p?.family !== "maze") throw new Error("maze expected");
      const route = p.solution;
      expect(route[0]).toEqual(p.start);
      expect(route[route.length - 1]).toEqual(p.end);
      route.forEach(([r, c], i) => {
        expect(p.open[r][c]).toBe(true);
        if (i)
          expect(
            Math.abs(r - route[i - 1][0]) + Math.abs(c - route[i - 1][1]),
          ).toBe(1);
      });
    }
  });

  it("Hanoi: following the hint solves it in 2ⁿ − 1 moves, from any position", () => {
    for (let disks = 2; disks <= 6; disks++) {
      let pegs = hanoiStart(disks),
        moves = 0;
      for (let m = hanoiBest(pegs); m; m = hanoiBest(pegs)) {
        expect(hanoiLegal(pegs, m[0], m[1])).toBe(true);
        pegs = hanoiMove(pegs, m[0], m[1]);
        moves++;
      }
      expect(moves).toBe(2 ** disks - 1);
      expect(pegs[2].length).toBe(disks);
    }
    // from a scrambled (legal) position
    let pegs: Pegs = [[4, 1], [3, 2], []];
    for (let m = hanoiBest(pegs), k = 0; m && k < 50; m = hanoiBest(pegs), k++)
      pegs = hanoiMove(pegs, m[0], m[1]);
    expect(pegs[2]).toEqual([4, 3, 2, 1]);
  });

  it("plane puzzles: the answer is on the grid and accepted; other points are not", () => {
    for (const type of [
      "combination",
      "transform",
      "eigenvector",
      "projection",
    ])
      for (const seed of SEEDS) {
        const p = makePuzzle({ type }, seed);
        if (p?.family !== "plane") throw new Error("plane expected");
        expect(p.check(p.answer), `${type} ${seed}`).toBeNull();
        expect(Math.abs(p.answer[0])).toBeLessThanOrEqual(p.range);
        expect(Math.abs(p.answer[1])).toBeLessThanOrEqual(p.range);
        expect(p.check([0, 0]) === null).toBe(false);
      }
  });

  it("eigenvector puzzles use an integer matrix with two real eigen-directions", () => {
    for (const seed of SEEDS) {
      const p = makePuzzle({ type: "eigenvector" }, seed);
      if (p?.family !== "plane" || !p.matrix)
        throw new Error("matrix expected");
      const m = p.matrix;
      expect(m.flat().every(Number.isInteger)).toBe(true);
      expect(m[0][1] !== 0 || m[1][0] !== 0).toBe(true);
      const ax = p.preview!(p.answer);
      expect(p.answer[0] * ax[1] - p.answer[1] * ax[0]).toBe(0);
    }
  });

  it("bfs: a neighbour of the front vertex out of alphabetical order is named as such", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const p = makePuzzle({ type: "bfs" }, seed);
      if (p?.family !== "order") throw new Error("order expected");
      const prefix = p.given;
      const want = p.next(prefix);
      // Any other unvisited vertex next to the start comes later alphabetically.
      for (let v = 0; v < 10; v++) {
        if (v === want || prefix.includes(v)) continue;
        const why = p.check(prefix, v);
        if (why?.includes("alphabetical order")) checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
