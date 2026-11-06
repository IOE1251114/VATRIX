import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCloudDB, pushDiff, supabase, watchCloud } from "../lib/supabase";
import { diffDB, isEmptyDiff, mergeDB, type Diff } from "./sync";

/* ---------- Data model ----------
 * Everything the teacher dashboard shows is derived from these records.
 * They live in localStorage (loadDB/saveDB) and, when Supabase is configured, in its tables;
 * see useDB below and src/lib/supabase.ts. */
export interface Attempt {
  problemId: string;
  topic: string;
  correct: boolean;
  given: string;
  misconception?: string;
  hint: boolean;
  at: number;
}
export interface Activity {
  seconds: number;
  steps: number;
}
export interface Student {
  id: string;
  name: string;
  demo?: boolean;
  attempts: Attempt[];
  activity: Record<string, Activity>;
}
export interface Assignment {
  id: string;
  title: string;
  problemIds: string[];
  createdAt: number;
  auto: boolean;
}
export interface DB {
  v: 1;
  students: Record<string, Student>;
  assignments: Assignment[];
}
export interface TopicRef {
  id: string;
  title: string;
  unit: string;
}
export type Status = "none" | "struggling" | "developing" | "strong";

export const DB_KEY = "daalab-db-v4";
const empty = (): DB => ({ v: 1, students: {}, assignments: [] });

/** localStorage key: one shared copy without accounts, one private cache per signed-in user. */
const keyFor = (owner: string | null | undefined) =>
  owner ? `${DB_KEY}:${owner}` : DB_KEY;

export function loadDB(key = DB_KEY): DB {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null");
    return parsed?.v === 1 ? parsed : empty();
  } catch {
    return empty();
  }
}
const saveDB = (key: string, db: DB) => {
  try {
    localStorage.setItem(key, JSON.stringify(db));
  } catch {
    /* storage full or blocked */
  }
};

/** Longest wait before changes from other devices appear. */
const REFRESH_MS = 2000;

export type SyncStatus =
  "local" | "signed-out" | "connecting" | "synced" | "saving" | "offline";

/**
 * The DB, cached in localStorage and — when Supabase is configured — stored in the cloud.
 *
 * `owner` is the signed-in user's id. With Supabase, nothing is loaded until someone signs in,
 * each account gets its own browser cache, and the database's access rules decide what comes
 * back (a student: their own progress; a teacher: the whole class). On sign-in it merges anything
 * that account recorded offline and uploads it. Every update is cached at once and its changes are
 * sent to Supabase in order; other devices' changes arrive through Supabase Realtime.
 * Without Supabase, `owner` is ignored and other tabs stay in sync through the storage event.
 */
export function useDB(owner?: string | null) {
  const cloud = !!supabase;
  const key = cloud ? keyFor(owner) : DB_KEY;
  const [db, setDb] = useState<DB>(() =>
    cloud && !owner ? empty() : loadDB(key),
  );
  const [status, setStatus] = useState<SyncStatus>(
    !cloud ? "local" : owner ? "connecting" : "signed-out",
  );
  const current = useRef(db);
  const keyRef = useRef(key);
  // Nothing is uploaded until the first cloud load has been merged, so stale local data never overwrites it.
  const ready = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const commit = useCallback(
    (next: DB) => {
      current.current = next;
      setDb(next);
      if (!cloud || keyRef.current !== DB_KEY) saveDB(keyRef.current, next);
    },
    [cloud],
  );

  const send = useCallback((d: Diff) => {
    if (!supabase || !ready.current || isEmptyDiff(d)) return;
    setStatus("saving");
    queue.current = queue.current
      .then(() => pushDiff(d))
      .then(
        () => setStatus("synced"),
        (e) => {
          console.warn(
            "Could not save to Supabase; data is kept in this browser.",
            e,
          );
          setStatus("offline");
        },
      );
  }, []);

  /** Apply a change. `upload: false` is for changes the database already has (answers graded
   *  by submit_attempt): they are cached here without being sent again. */
  const update = useCallback(
    (fn: (d: DB) => DB, opts?: { upload?: boolean }) => {
      const prev = current.current;
      const next = fn(prev);
      if (next === prev) return;
      commit(next);
      if (opts?.upload !== false) send(diffDB(prev, next));
    },
    [commit, send],
  );

  useEffect(() => {
    if (cloud) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY) commit(loadDB(DB_KEY));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cloud, commit]);

  useEffect(() => {
    if (!supabase) return;
    // A different (or no) account: start again from that account's own cache.
    keyRef.current = key;
    ready.current = false;
    queue.current = Promise.resolve();
    commit(owner ? loadDB(key) : empty());
    if (!owner) {
      setStatus("signed-out");
      return;
    }
    setStatus("connecting");
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const firstLoad = async () => {
      try {
        const remote = await fetchCloudDB();
        if (!alive) return;
        const merged = mergeDB(remote, current.current);
        ready.current = true;
        commit(merged);
        setStatus("synced");
        send(diffDB(remote, merged));
      } catch (e) {
        if (!alive) return;
        console.warn("Could not reach Supabase; using this browser's copy.", e);
        setStatus("offline");
      }
    };
    void firstLoad();
    // Refresh after changes from any device, once our own pending writes have finished.
    // Throttled, not debounced: with a whole class active, changes never stop arriving, so a
    // debounce would never fire. This refreshes at most once every REFRESH_MS.
    const stop = watchCloud(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void queue.current.then(async () => {
          if (!alive || !ready.current) return;
          try {
            commit(mergeDB(await fetchCloudDB(), current.current));
          } catch {
            /* keep the current copy; the next change will retry */
          }
        });
      }, REFRESH_MS);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      stop();
    };
  }, [owner, key, commit, send]);

  return [db, update, status] as const;
}

/** Remove every per-account cache (used on sign-out, so a shared computer keeps no one's data). */
export function clearAccountCaches() {
  try {
    for (const k of Object.keys(localStorage))
      if (k.startsWith(`${DB_KEY}:`)) localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
}
export type UpdateDB = ReturnType<typeof useDB>[1];

/* ---------- Immutable updates ---------- */
export const slug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Add a student (id from the name, or an explicit id such as an account's user id). */
export function withStudent(
  db: DB,
  name: string,
  demo = false,
  explicitId?: string,
): DB {
  const id = explicitId ?? slug(name);
  if (!id || db.students[id]) return db;
  return {
    ...db,
    students: {
      ...db.students,
      [id]: { id, name: name.trim(), demo, attempts: [], activity: {} },
    },
  };
}
const mapStudent = (db: DB, id: string, fn: (s: Student) => Student): DB =>
  db.students[id]
    ? { ...db, students: { ...db.students, [id]: fn(db.students[id]) } }
    : db;
export const withAttempt = (db: DB, id: string, a: Attempt) =>
  mapStudent(db, id, (s) => ({ ...s, attempts: [...s.attempts, a] }));
export const withActivity = (
  db: DB,
  id: string,
  topic: string,
  seconds: number,
  steps: number,
) =>
  mapStudent(db, id, (s) => {
    const cur = s.activity[topic] ?? { seconds: 0, steps: 0 };
    return {
      ...s,
      activity: {
        ...s.activity,
        [topic]: { seconds: cur.seconds + seconds, steps: cur.steps + steps },
      },
    };
  });
export const withoutDemo = (db: DB): DB => ({
  ...db,
  students: Object.fromEntries(
    Object.entries(db.students).filter(([, s]) => !s.demo),
  ),
});

/* ---------- Analytics ----------
 * Mastery = share of the last 6 attempts answered correctly (a correct answer after a hint counts half).
 * It needs at least 2 attempts; with less, we say "no data" instead of guessing. */
export function topicStats(s: Student, topic: string) {
  const all = s.attempts.filter((a) => a.topic === topic);
  const recent = all.slice(-6);
  const mastery =
    recent.length >= 2
      ? Math.round(
          (100 *
            recent.reduce(
              (t, a) => t + (a.correct ? (a.hint ? 0.5 : 1) : 0),
              0,
            )) /
            recent.length,
        )
      : null;
  const act = s.activity[topic];
  return {
    attempts: all.length,
    correct: all.filter((a) => a.correct).length,
    mastery,
    seconds: act?.seconds ?? 0,
    steps: act?.steps ?? 0,
  };
}
export const statusOf = (m: number | null): Status =>
  m === null
    ? "none"
    : m < 50
      ? "struggling"
      : m < 75
        ? "developing"
        : "strong";
export const statusLabel: Record<Status, string> = {
  none: "No data",
  struggling: "Struggling",
  developing: "Developing",
  strong: "Strong",
};

/** Topics where the student is below "strong", weakest first. */
export function weakTopics(s: Student, topics: TopicRef[]) {
  return topics
    .map((t) => ({ t, m: topicStats(s, t.id).mastery }))
    .filter((x) => x.m !== null && x.m < 75)
    .sort((a, b) => a.m! - b.m!);
}

export function classMastery(db: DB, topics: TopicRef[]) {
  const students = Object.values(db.students);
  return Object.fromEntries(
    topics.map((t) => {
      const ms = students
        .map((s) => topicStats(s, t.id).mastery)
        .filter((m): m is number => m !== null);
      return [
        t.id,
        {
          avg: ms.length
            ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)
            : null,
          n: ms.length,
          below50: ms.filter((m) => m < 50).length,
        },
      ];
    }),
  ) as Record<string, { avg: number | null; n: number; below50: number }>;
}

export function topMisconceptions(db: DB, limit = 5) {
  const counts = new Map<
    string,
    { label: string; topic: string; count: number }
  >();
  for (const s of Object.values(db.students))
    for (const a of s.attempts)
      if (!a.correct && a.misconception) {
        const key = `${a.topic}|${a.misconception}`;
        counts.set(key, {
          label: a.misconception,
          topic: a.topic,
          count: (counts.get(key)?.count ?? 0) + 1,
        });
      }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function studentsAtRisk(db: DB, topics: TopicRef[]) {
  return Object.values(db.students)
    .map((s) => ({ s, weak: weakTopics(s, topics).filter((x) => x.m! < 50) }))
    .filter((x) => x.weak.length >= 2);
}

export function toCSV(db: DB, topics: TopicRef[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = [
    "student",
    ...topics.flatMap((t) => [
      `${t.title} mastery %`,
      `${t.title} attempts`,
      `${t.title} seconds`,
    ]),
  ];
  const rows = Object.values(db.students).map((s) => [
    s.name,
    ...topics.flatMap((t) => {
      const x = topicStats(s, t.id);
      return [x.mastery ?? "", x.attempts, x.seconds];
    }),
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

/* ---------- Automatic activity tracking for the visualizers ----------
 * Adds 5 s of time every 5 s while the visualizer is open and the tab is visible.
 * Forward steps are recorded separately through each explorer's `onSteps`. */
export function useActivityTracker(
  update: UpdateDB,
  studentId: string | null,
  active: boolean,
  topic: string,
) {
  useEffect(() => {
    if (!studentId || !active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        update((d) => withActivity(d, studentId, topic, 5, 0));
    }, 5000);
    return () => clearInterval(timer);
  }, [studentId, active, topic, update]);
}
