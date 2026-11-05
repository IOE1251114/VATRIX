/* Pure helpers for keeping the in-browser DB and the Supabase tables in step.
 * No network code lives here, so everything is unit-testable. */
import type { Activity, Assignment, Attempt, DB, Student } from "./tracking";

/* ---------- Table rows (snake_case, as stored in Postgres) ---------- */

export type StudentRow = { id: string; name: string; demo: boolean };
export type AttemptRow = {
  student_id: string;
  problem_id: string;
  topic: string;
  correct: boolean;
  given: string;
  misconception: string | null;
  hint: boolean;
  at: string;
};
export type ActivityRow = {
  student_id: string;
  topic: string;
  seconds: number;
  steps: number;
};
export type AssignmentRow = {
  id: string;
  title: string;
  problem_ids: string[];
  auto: boolean;
  created_at: string;
};

export type Rows = {
  students: StudentRow[];
  attempts: AttemptRow[];
  activity: ActivityRow[];
  assignments: AssignmentRow[];
};

export const attemptRow = (studentId: string, a: Attempt): AttemptRow => ({
  student_id: studentId,
  problem_id: a.problemId,
  topic: a.topic,
  correct: a.correct,
  given: a.given.slice(0, 200),
  misconception: a.misconception ?? null,
  hint: a.hint,
  at: new Date(a.at).toISOString(),
});

const assignmentRow = (a: Assignment): AssignmentRow => ({
  id: a.id,
  title: a.title,
  problem_ids: a.problemIds,
  auto: a.auto,
  created_at: new Date(a.createdAt).toISOString(),
});

/** Build the app's DB object from table rows. */
export function dbFromRows(r: Rows): DB {
  const students: Record<string, Student> = {};
  for (const s of r.students)
    students[s.id] = {
      id: s.id,
      name: s.name,
      demo: s.demo || undefined,
      attempts: [],
      activity: {},
    };
  const sorted = [...r.attempts].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );
  for (const a of sorted)
    students[a.student_id]?.attempts.push({
      problemId: a.problem_id,
      topic: a.topic,
      correct: a.correct,
      given: a.given,
      misconception: a.misconception ?? undefined,
      hint: a.hint,
      at: Date.parse(a.at),
    });
  for (const a of r.activity) {
    const s = students[a.student_id];
    if (s) s.activity[a.topic] = { seconds: a.seconds, steps: a.steps };
  }
  const assignments: Assignment[] = [...r.assignments]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((a) => ({
      id: a.id,
      title: a.title,
      problemIds: a.problem_ids,
      createdAt: Date.parse(a.created_at),
      auto: a.auto,
    }));
  return { v: 1, students, assignments };
}

/* ---------- Reading whole tables ---------- */

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Read every row of a table, one page at a time. Supabase caps each request (1,000 rows by
 * default), so a single request silently drops the rest. This keeps asking from where the last
 * page ended until a page comes back empty, so it works whatever the project's cap is.
 * `fetchPage(from, to)` must return rows in a stable order (e.g. by primary key).
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Page<T>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(
      out.length,
      out.length + pageSize - 1,
    );
    if (error) throw error;
    if (!data?.length) return out;
    out.push(...data);
  }
}

/* ---------- What changed between two DB states ---------- */

export type Diff = {
  students: StudentRow[];
  removedStudents: string[];
  attempts: AttemptRow[];
  activity: ActivityRow[];
  assignments: AssignmentRow[];
};

export const isEmptyDiff = (d: Diff) =>
  !d.students.length &&
  !d.removedStudents.length &&
  !d.attempts.length &&
  !d.activity.length &&
  !d.assignments.length;

/**
 * The rows to write so the database goes from `prev` to `next`.
 * The app only ever appends attempts, so new attempts are the ones past the old count.
 */
export function diffDB(prev: DB, next: DB): Diff {
  const d: Diff = {
    students: [],
    removedStudents: [],
    attempts: [],
    activity: [],
    assignments: [],
  };
  for (const id of Object.keys(prev.students))
    if (!next.students[id]) d.removedStudents.push(id);
  for (const s of Object.values(next.students)) {
    const old = prev.students[s.id];
    if (!old) d.students.push({ id: s.id, name: s.name, demo: !!s.demo });
    for (const a of s.attempts.slice(old?.attempts.length ?? 0))
      d.attempts.push(attemptRow(s.id, a));
    for (const [topic, act] of Object.entries(s.activity)) {
      const was: Activity | undefined = old?.activity[topic];
      if (!was || was.seconds !== act.seconds || was.steps !== act.steps)
        d.activity.push({
          student_id: s.id,
          topic,
          seconds: act.seconds,
          steps: act.steps,
        });
    }
  }
  const known = new Set(prev.assignments.map((a) => a.id));
  for (const a of next.assignments)
    if (!known.has(a.id)) d.assignments.push(assignmentRow(a));
  return d;
}

/**
 * Combine what the database holds with what this browser recorded (for example while offline).
 * Real progress is never lost: extra local attempts are kept and activity totals take the larger
 * value. Demo students that are no longer in the database stay deleted.
 */
export function mergeDB(cloud: DB, local: DB): DB {
  const students: Record<string, Student> = { ...cloud.students };
  for (const s of Object.values(local.students)) {
    const c = students[s.id];
    if (!c) {
      // A demo student missing from the database was removed by a teacher: don't bring it back.
      if (!s.demo) students[s.id] = s;
      continue;
    }
    const activity = { ...c.activity };
    for (const [t, a] of Object.entries(s.activity)) {
      const ca = activity[t];
      activity[t] = ca
        ? {
            seconds: Math.max(ca.seconds, a.seconds),
            steps: Math.max(ca.steps, a.steps),
          }
        : a;
    }
    const cloudKeys = new Set(c.attempts.map((a) => `${a.problemId}|${a.at}`));
    const extra = s.attempts.filter(
      (a) => !cloudKeys.has(`${a.problemId}|${a.at}`),
    );
    students[s.id] = {
      ...c,
      attempts: [...c.attempts, ...extra].sort((a, b) => a.at - b.at),
      activity,
    };
  }
  const ids = new Set(cloud.assignments.map((a) => a.id));
  const assignments = [
    ...cloud.assignments,
    ...local.assignments.filter((a) => !ids.has(a.id)),
  ].sort((a, b) => b.createdAt - a.createdAt);
  return { v: 1, students, assignments };
}
