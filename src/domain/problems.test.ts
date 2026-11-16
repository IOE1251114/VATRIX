import { describe, expect, it } from "vitest";
import { problemsIn, toProblem, type ProblemRow } from "./problems";

const row = (over: Partial<ProblemRow> = {}): ProblemRow => ({
  id: "ram-1",
  topic: "ram",
  sort_order: 1,
  kind: "num",
  prompt: "How many?",
  options: null,
  hint: "Count them.",
  tag: "Miscounts",
  ...over,
});

describe("toProblem", () => {
  it("turns a database row into a question", () => {
    expect(toProblem(row())).toEqual({
      id: "ram-1",
      topic: "ram",
      kind: "num",
      prompt: "How many?",
      hint: "Count them.",
      tag: "Miscounts",
    });
    expect(
      toProblem(row({ kind: "mcq", options: ["A", "B"] }))?.options,
    ).toEqual(["A", "B"]);
  });
  it("never carries answer fields, even if a row had them", () => {
    const p = toProblem({
      ...row(),
      answer: 64,
      explain: "secret",
    } as ProblemRow);
    expect(p).not.toHaveProperty("answer");
    expect(p).not.toHaveProperty("explain");
  });
  it("reads puzzle rows and their settings", () => {
    expect(
      toProblem(row({ kind: "puzzle", puzzle: { type: "bfs", nodes: 6 } })),
    ).toMatchObject({ kind: "puzzle", puzzle: { type: "bfs", nodes: 6 } });
    expect(toProblem(row({ kind: "puzzle", puzzle: null }))).toBeNull();
    expect(
      toProblem(row({ kind: "puzzle", puzzle: { type: "chess" } })),
    ).toBeNull();
    expect(toProblem(row({ kind: "puzzle", puzzle: ["bfs"] }))).toBeNull();
  });
  it("skips rows that can't be shown", () => {
    expect(toProblem(row({ kind: "essay" }))).toBeNull();
    expect(toProblem(row({ kind: "mcq", options: ["only one"] }))).toBeNull();
    expect(toProblem(row({ hint: null }))?.hint).toBe("");
  });
});

describe("problemsIn", () => {
  it("keeps one topic's questions in order", () => {
    const list = [
      row({ id: "a" }),
      row({ id: "b", topic: "sat" }),
      row({ id: "c" }),
    ].map((r) => toProblem(r)!);
    expect(problemsIn(list, "ram").map((p) => p.id)).toEqual(["a", "c"]);
  });
});
