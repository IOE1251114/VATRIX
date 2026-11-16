import { describe, expect, it } from "vitest";
import { makePuzzle, PUZZLES } from ".";
import { gradeTable, parseNum, type Puzzle } from "./core";

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 104729 + 7);

/** Every pick an order or select puzzle could receive. */
function choices(p: Puzzle): number[] {
  if (p.family !== "order" && p.family !== "select") return [];
  const b = p.board;
  const n =
    b.kind === "graph"
      ? p.pick === "edge"
        ? b.edges.length
        : b.nodes.length
      : b.kind === "grid"
        ? b.rows * b.cols
        : b.values.length;
  return Array.from({ length: n }, (_, i) => i);
}

describe("every puzzle type, on many boards", () => {
  for (const type of Object.keys(PUZZLES))
    it(`${type}: the worked answer is accepted and wrong moves are explained`, () => {
      for (const seed of SEEDS) {
        const p = makePuzzle({ type }, seed);
        expect(p, `${type} ${seed}`).not.toBeNull();
        const where = `${type} seed ${seed}`;
        switch (p!.family) {
          case "order": {
            const q = p!;
            const picks = [...q.given];
            expect(q.length, where).toBeGreaterThan(q.given.length);
            while (picks.length < q.length) {
              const nx = q.next(picks);
              expect(
                q.check(picks, nx),
                `${where} at ${picks.length}`,
              ).toBeNull();
              for (const c of choices(q))
                if (q.check(picks, c) !== null)
                  expect(typeof q.check(picks, c), where).toBe("string");
              picks.push(nx);
            }
            if (q.cells)
              expect(q.cells(picks).values.length, where).toBeGreaterThan(0);
            break;
          }
          case "select": {
            const q = p!;
            expect(q.check(q.answer), where).toBeNull();
            expect(q.check([]), where).not.toBeNull();
            for (const a of q.answer) expect(choices(q), where).toContain(a);
            break;
          }
          case "table": {
            const q = p!;
            let blanks = 0;
            q.cells.forEach((row, r) =>
              row.forEach((c, k) => {
                if (c !== null) return;
                blanks++;
                expect(
                  Number.isFinite(q.answers[r][k]),
                  `${where} cell ${r},${k}`,
                ).toBe(true);
              }),
            );
            expect(blanks, where).toBeGreaterThan(0);
            expect(gradeTable(q, q.answers).wrong, where).toEqual([]);
            const off = q.answers.map((row) =>
              row.map((v) => (v == null ? null : v + 1)),
            );
            expect(gradeTable(q, off).wrong.length, where).toBe(blanks);
            if (q.rowHeads)
              expect(q.rowHeads.length, where).toBe(q.cells.length);
            if (q.colHeads)
              q.cells.forEach((row) =>
                expect(row.length, where).toBe(q.colHeads!.length),
              );
            break;
          }
          case "plane": {
            const q = p!;
            expect(q.check(q.answer), where).toBeNull();
            expect(
              Math.abs(q.answer[0]) <= q.range &&
                Math.abs(q.answer[1]) <= q.range,
              where,
            ).toBe(true);
            break;
          }
          case "cycle": {
            const q = p!;
            const sol = q.solution;
            const adj = (a: number, b: number) =>
              q.board.edges.some(
                (e) => (e.a === a && e.b === b) || (e.a === b && e.b === a),
              );
            sol
              .slice(1)
              .forEach((v, i) => expect(adj(sol[i], v), where).toBe(true));
            expect(new Set(sol.slice(0, -1)).size, where).toBe(
              q.board.nodes.length,
            );
            if (q.best !== undefined) {
              const cost = sol.slice(1).reduce((t, v, i) => {
                const e = q.board.edges.find(
                  (x) =>
                    (x.a === sol[i] && x.b === v) ||
                    (x.b === sol[i] && x.a === v),
                )!;
                return t + (e.w ?? 0);
              }, 0);
              expect(cost, where).toBe(q.best);
            }
            break;
          }
          default:
            break;
        }
      }
    });
});

describe("parseNum", () => {
  it("reads integers, decimals, fractions and the minus sign", () => {
    expect(parseNum("3")).toBe(3);
    expect(parseNum("−2")).toBe(-2);
    expect(parseNum(" 1/2 ")).toBe(0.5);
    expect(parseNum("-3/4")).toBe(-0.75);
    expect(parseNum("2.5")).toBe(2.5);
    expect(Number.isNaN(parseNum("abc"))).toBe(true);
    expect(Number.isNaN(parseNum("1/0"))).toBe(true);
    expect(Number.isNaN(parseNum(""))).toBe(true);
  });
});
