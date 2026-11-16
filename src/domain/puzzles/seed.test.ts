import { describe, expect, it } from "vitest";
import seed from "../../../supabase/seed-puzzles.sql?raw";
import { daaUnits } from "../daa/units";
import { dsUnits } from "../ds/units";
import { laUnits } from "../la/units";
import { makePuzzle, type Settings } from ".";

const topics = new Set(
  [...daaUnits, ...dsUnits, ...laUnits].flatMap((u) =>
    u.topics.map((t) => t.id),
  ),
);
const rows = [
  ...seed.matchAll(
    /\('(pz-[a-z0-9-]+)', '([a-z0-9-]+)', \d+, 'puzzle', .*?'(\{.*?\})'::jsonb/g,
  ),
].map((m) => ({
  id: m[1],
  topic: m[2],
  settings: JSON.parse(m[3]) as Settings,
}));

describe("supabase/seed-puzzles.sql", () => {
  it("has a puzzle row for each subject", () => {
    expect(rows.length).toBeGreaterThanOrEqual(20);
    for (const prefix of ["pz-daa-", "pz-ds-", "pz-la-"])
      expect(rows.some((r) => r.id.startsWith(prefix))).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it("every row names a real topic and builds a board", () => {
    for (const r of rows) {
      expect(topics.has(r.topic), `${r.id}: topic ${r.topic}`).toBe(true);
      for (const s of [1, 2, 3, 42, 99999])
        expect(makePuzzle(r.settings, s), `${r.id} seed ${s}`).not.toBeNull();
    }
  });

  it("gives every topic on the site at least one puzzle", () => {
    const withPuzzle = new Set(rows.map((r) => r.topic));
    const missing = [...topics].filter((t) => !withPuzzle.has(t));
    expect(missing).toEqual([]);
  });
});
