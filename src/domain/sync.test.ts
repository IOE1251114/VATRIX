import { describe, expect, it } from "vitest";
import {
  dbFromRows,
  diffDB,
  fetchAllRows,
  isEmptyDiff,
  mergeDB,
  type Rows,
} from "./sync";
import {
  withActivity,
  withAttempt,
  withStudent,
  withoutDemo,
  type DB,
} from "./tracking";

const empty = (): DB => ({ v: 1, students: {}, assignments: [] });
const attempt = (at: number, correct = true) => ({
  problemId: "ram-1",
  topic: "ram",
  correct,
  given: "64",
  hint: false,
  at,
});

describe("diffDB", () => {
  it("finds new students, attempts, activity and assignments", () => {
    const a = withStudent(empty(), "Asha Rao");
    const b = withActivity(
      withAttempt(a, "asha-rao", attempt(1000)),
      "asha-rao",
      "ram",
      5,
      2,
    );
    const c: DB = {
      ...b,
      assignments: [
        {
          id: "a1",
          title: "Week 1",
          problemIds: ["ram-1"],
          createdAt: 5000,
          auto: false,
        },
      ],
    };
    const d = diffDB(empty(), c);
    expect(d.students).toEqual([
      { id: "asha-rao", name: "Asha Rao", demo: false },
    ]);
    expect(d.attempts).toHaveLength(1);
    expect(d.attempts[0]).toMatchObject({
      student_id: "asha-rao",
      problem_id: "ram-1",
      at: new Date(1000).toISOString(),
    });
    expect(d.activity).toEqual([
      { student_id: "asha-rao", topic: "ram", seconds: 5, steps: 2 },
    ]);
    expect(d.assignments[0].id).toBe("a1");
  });
  it("only sends what changed", () => {
    const a = withAttempt(withStudent(empty(), "Asha"), "asha", attempt(1));
    const b = withActivity(
      withAttempt(a, "asha", attempt(2, false)),
      "asha",
      "ram",
      5,
      0,
    );
    const d = diffDB(a, b);
    expect(d.students).toHaveLength(0);
    expect(d.attempts.map((x) => x.correct)).toEqual([false]);
    expect(d.activity).toHaveLength(1);
    expect(isEmptyDiff(diffDB(b, b))).toBe(true);
  });
  it("reports removed demo students", () => {
    const a = withStudent(withStudent(empty(), "Real"), "Demo kid", true);
    expect(diffDB(a, withoutDemo(a)).removedStudents).toEqual(["demo-kid"]);
  });
});

describe("rows ↔ DB", () => {
  it("round-trips through table rows", () => {
    const rows: Rows = {
      students: [{ id: "om", name: "Om", demo: false }],
      attempts: [
        {
          student_id: "om",
          problem_id: "p2",
          topic: "t",
          correct: false,
          given: "3",
          misconception: "Off by one",
          hint: true,
          at: new Date(2000).toISOString(),
        },
        {
          student_id: "om",
          problem_id: "p1",
          topic: "t",
          correct: true,
          given: "4",
          misconception: null,
          hint: false,
          at: new Date(1000).toISOString(),
        },
      ],
      activity: [{ student_id: "om", topic: "t", seconds: 30, steps: 4 }],
      assignments: [
        {
          id: "a1",
          title: "HW",
          problem_ids: ["p1"],
          auto: true,
          created_at: new Date(9000).toISOString(),
        },
      ],
    };
    const db = dbFromRows(rows);
    expect(db.students.om.attempts.map((a) => a.problemId)).toEqual([
      "p1",
      "p2",
    ]);
    expect(db.students.om.attempts[1].misconception).toBe("Off by one");
    expect(db.students.om.activity.t).toEqual({ seconds: 30, steps: 4 });
    expect(db.assignments[0]).toEqual({
      id: "a1",
      title: "HW",
      problemIds: ["p1"],
      createdAt: 9000,
      auto: true,
    });
    expect(isEmptyDiff(diffDB(db, dbFromRows(rows)))).toBe(true);
  });
});

describe("mergeDB", () => {
  it("keeps local-only answers and activity, and never loses cloud data", () => {
    const cloud = withActivity(
      withAttempt(withStudent(empty(), "Asha"), "asha", attempt(1)),
      "asha",
      "ram",
      10,
      1,
    );
    let local = withAttempt(withStudent(empty(), "Asha"), "asha", attempt(1));
    local = withAttempt(local, "asha", attempt(2));
    local = withActivity(local, "asha", "ram", 25, 0);
    local = withStudent(local, "Kabir");
    const m = mergeDB(cloud, local);
    expect(m.students.asha.attempts.map((a) => a.at)).toEqual([1, 2]);
    expect(m.students.asha.activity.ram).toEqual({ seconds: 25, steps: 1 });
    const up = diffDB(cloud, m);
    expect(up.attempts).toHaveLength(1);
  });
});

describe("fetchAllRows", () => {
  it("keeps reading pages until one comes back empty", async () => {
    const table = Array.from({ length: 2350 }, (_, i) => i);
    const calls: [number, number][] = [];
    // Simulate a server that caps every response at 1,000 rows.
    const rows = await fetchAllRows(async (from: number, to: number) => {
      calls.push([from, to]);
      return {
        data: table.slice(from, Math.min(to + 1, from + 1000)),
        error: null,
      };
    });
    expect(rows).toEqual(table);
    expect(calls[0]).toEqual([0, 999]);
  });
  it("works when the server's cap is smaller than the page size", async () => {
    const table = Array.from({ length: 1200 }, (_, i) => i);
    const rows = await fetchAllRows(async (from: number) => ({
      data: table.slice(from, from + 500),
      error: null,
    }));
    expect(rows).toHaveLength(1200);
  });
  it("stops on an error", async () => {
    await expect(
      fetchAllRows(async () => ({ data: null, error: new Error("boom") })),
    ).rejects.toThrow("boom");
  });
});

describe("mergeDB and demo students", () => {
  it("does not bring back students removed in the database", () => {
    const local = withStudent(
      withStudent(empty(), "Real one"),
      "Aarav (demo)",
      true,
    );
    const cloud = withStudent(empty(), "Real one");
    const m = mergeDB(cloud, local);
    expect(Object.keys(m.students)).toEqual(["real-one"]);
    expect(diffDB(cloud, m).students).toHaveLength(0);
    // A new teacher's empty student row, still in their browser copy, stays deleted too.
    const teacherCache = withStudent(
      empty(),
      "Ayaan Mittal",
      false,
      "0121ef66",
    );
    expect(mergeDB(empty(), teacherCache).students).toEqual({});
  });
});
