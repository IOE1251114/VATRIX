/* Supabase connection. The site works without it: if the two environment variables are missing,
 * `supabase` is null and data stays in this browser's localStorage, as before. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  dbFromRows,
  fetchAllRows,
  isEmptyDiff,
  type Diff,
  type Rows,
} from "../domain/sync";
import type { DB } from "../domain/tracking";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

/** Read every table (all pages) and assemble the app's DB object. */
export async function fetchCloudDB(): Promise<DB> {
  const db = supabase!;
  const [students, attempts, activity, assignments] = await Promise.all([
    fetchAllRows((from, to) =>
      db.from("students").select("id, name, demo").order("id").range(from, to),
    ),
    fetchAllRows((from, to) =>
      db
        .from("attempts")
        .select(
          "student_id, problem_id, topic, correct, given, misconception, hint, at",
        )
        .order("id")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      db
        .from("activity")
        .select("student_id, topic, seconds, steps")
        .order("student_id")
        .order("topic")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      db
        .from("assignments")
        .select("id, title, problem_ids, auto, created_at")
        .order("id")
        .range(from, to),
    ),
  ]);
  return dbFromRows({ students, attempts, activity, assignments } as Rows);
}

/** Write one set of changes. Students go first because the other tables refer to them. */
export async function pushDiff(d: Diff): Promise<void> {
  if (!supabase || isEmptyDiff(d)) return;
  const check = (r: { error: unknown }) => {
    if (r.error) throw r.error;
  };
  if (d.removedStudents.length)
    check(await supabase.from("students").delete().in("id", d.removedStudents));
  if (d.students.length)
    check(
      await supabase
        .from("students")
        .upsert(d.students, { onConflict: "id", ignoreDuplicates: true }),
    );
  const writes = [];
  if (d.attempts.length)
    writes.push(supabase.from("attempts").insert(d.attempts));
  if (d.activity.length)
    writes.push(
      supabase
        .from("activity")
        .upsert(d.activity, { onConflict: "student_id,topic" }),
    );
  if (d.assignments.length)
    writes.push(
      supabase
        .from("assignments")
        .upsert(d.assignments, { onConflict: "id", ignoreDuplicates: true }),
    );
  for (const r of await Promise.all(writes)) check(r);
}

/** Call `onChange` whenever any table changes (from this or another device). Returns an unsubscribe function. */
export function watchCloud(onChange: () => void): () => void {
  if (!supabase) return () => undefined;
  const channel = supabase.channel("vatrix-db");
  for (const table of ["students", "attempts", "activity", "assignments"])
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      onChange,
    );
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
