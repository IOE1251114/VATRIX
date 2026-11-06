import { describe, expect, it } from "vitest";
import questions from "./questions.json";
import { answerKey, gradeAnswer } from "./answerKey";
import { toPublic, type Problem } from "./problemKit";

describe("questions.json", () => {
  it("matches the problem bank (run `npm run gen:problems` if this fails)", () => {
    expect(questions).toEqual(answerKey.map(toPublic));
  });
  it("contains no answers, explanations or answer-specific labels", () => {
    for (const q of questions as Record<string, unknown>[]) {
      expect(q).not.toHaveProperty("answer");
      expect(q).not.toHaveProperty("explain");
      expect(q).not.toHaveProperty("tags");
    }
  });
  it("has unique ids", () => {
    expect(new Set(answerKey.map((p) => p.id)).size).toBe(answerKey.length);
  });
});

describe("gradeAnswer", () => {
  const p: Problem = {
    id: "t-1",
    topic: "t",
    kind: "num",
    prompt: "",
    answer: 0,
    tag: "Generic mistake",
    tags: { "64": "Used n² instead", "0.5": "Halved it" },
    hint: "",
    explain: "",
  };
  it("accepts the right number, with spaces", () => {
    expect(gradeAnswer(p, " 0 ")).toEqual({ correct: true });
  });
  it("never treats a blank answer as 0", () => {
    expect(gradeAnswer(p, "").correct).toBe(false);
    expect(gradeAnswer(p, "   ").correct).toBe(false);
  });
  it("names the specific misconception for known wrong answers", () => {
    expect(gradeAnswer(p, "64").misconception).toBe("Used n² instead");
    expect(gradeAnswer(p, "0.50").misconception).toBe("Halved it");
    expect(gradeAnswer(p, "7").misconception).toBe("Generic mistake");
    expect(gradeAnswer(p, "abc")).toEqual({
      correct: false,
      misconception: "Generic mistake",
    });
  });
  it("grades every bank problem's own answer as correct", () => {
    for (const q of answerKey)
      expect(gradeAnswer(q, String(q.answer)).correct).toBe(true);
  });
});
