/* Practice questions, loaded from the Supabase table `problems`.
 *
 * The website only ever reads the question columns (prompt, options, hint, default
 * misconception). Answers, answer-specific misconceptions and explanations stay in the database:
 * an answer is sent to the database function submit_attempt, which grades it, records the
 * attempt and returns the result with the explanation. Teachers add, edit and delete questions
 * in the Supabase dashboard (Table Editor → problems).
 *
 * Puzzle rows (kind 'puzzle') have no stored answer: their `puzzle` column holds board settings,
 * the website builds and checks a fresh board (src/domain/puzzles), and submitPuzzle records the
 * result. */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchAllRows } from "./sync";
import { PUZZLES, type Settings } from "./puzzles";

/** A practice question as the website sees it: never the answer. */
export type Problem = {
  id: string;
  topic: string;
  kind: "mcq" | "num" | "puzzle";
  prompt: string;
  /** mcq only: the choices, in order. */
  options?: string[];
  /** puzzle only: the board settings, e.g. {type: "bfs", nodes: 7}. */
  puzzle?: Settings;
  hint: string;
  /** Misconception recorded for a wrong answer when no specific one applies. */
  tag: string;
};

/** The result of checking one answer. `at` is when the database recorded it (ms since 1970). */
export type Graded = {
  correct: boolean;
  misconception?: string;
  explain: string;
  at: number;
};

/** The only columns the website may read (the database refuses the others). */
const COLUMNS =
  "id, topic, sort_order, kind, prompt, options, puzzle, hint, tag";

export type ProblemRow = {
  id: string;
  topic: string;
  sort_order: number;
  kind: string;
  prompt: string;
  options: string[] | null;
  puzzle?: unknown;
  hint: string | null;
  tag: string;
};

const isSettings = (v: unknown): v is Settings =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  typeof (v as Settings).type === "string" &&
  (v as Settings).type in PUZZLES;

/** Turn a database row into a question, or null if it can't be shown (bad kind, options or
 * puzzle settings). */
export function toProblem(r: ProblemRow): Problem | null {
  if (r.kind === "puzzle")
    return isSettings(r.puzzle)
      ? {
          id: r.id,
          topic: r.topic,
          kind: "puzzle",
          prompt: r.prompt,
          puzzle: r.puzzle,
          hint: r.hint ?? "",
          tag: r.tag,
        }
      : null;
  if (r.kind !== "mcq" && r.kind !== "num") return null;
  if (r.kind === "mcq" && !(r.options && r.options.length >= 2)) return null;
  return {
    id: r.id,
    topic: r.topic,
    kind: r.kind,
    prompt: r.prompt,
    ...(r.kind === "mcq" ? { options: r.options! } : {}),
    hint: r.hint ?? "",
    tag: r.tag,
  };
}

/** Every question, ordered by topic and position. Needs a signed-in user. */
export async function fetchProblems(): Promise<Problem[]> {
  if (!supabase) return [];
  const db = supabase;
  const rows = await fetchAllRows<ProblemRow>((from, to) =>
    db
      .from("problems")
      .select(COLUMNS)
      .order("topic")
      .order("sort_order")
      .order("id")
      .range(from, to),
  );
  return rows.map(toProblem).filter((p): p is Problem => p !== null);
}

export const problemsIn = (list: Problem[], topic: string) =>
  list.filter((p) => p.topic === topic);

export type ProblemsState = {
  problems: Problem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Load the questions for the signed-in user (`owner` is their id; null = signed out, nothing is
 * loaded). Reloads when the account changes or `reload()` is called, so a teacher's edits in the
 * dashboard appear after a reload.
 */
export function useProblems(owner: string | null): ProblemsState {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    setProblems([]);
    setError(null);
    if (!supabase || !owner) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchProblems().then(
      (list) => {
        if (!alive) return;
        setProblems(list);
        setLoading(false);
      },
      () => {
        if (!alive) return;
        setError(
          "Couldn't load the practice questions. Check your connection and try again.",
        );
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [owner, attempt]);

  return { problems, loading, error, reload };
}

/**
 * Check one answer. The database grades it against the hidden answer, records the attempt for the
 * signed-in student and returns the result (never the answer). Throws a readable message on failure.
 */
export async function checkAnswer(
  problemId: string,
  given: string,
  hint: boolean,
): Promise<Graded> {
  if (!supabase)
    throw new Error("Practice questions need the database to be connected.");
  const { data, error } = await supabase.rpc("submit_attempt", {
    p_problem_id: problemId,
    p_given: given,
    p_hint: hint,
  });
  if (error)
    throw new Error(
      error.message ||
        "Couldn't check your answer. Check your connection and try again.",
    );
  const r = data as {
    correct: boolean;
    misconception: string | null;
    explain: string;
    at: string;
  };
  return {
    correct: r.correct,
    misconception: r.misconception ?? undefined,
    explain: r.explain,
    at: Date.parse(r.at),
  };
}

/**
 * Record a finished puzzle for the signed-in student. The website checked the moves itself;
 * the database stores the result and returns when it did. Throws a readable message on failure.
 */
export async function submitPuzzle(
  problemId: string,
  result: { correct: boolean; given: string; misconception?: string },
  hint: boolean,
): Promise<number> {
  if (!supabase)
    throw new Error("Practice questions need the database to be connected.");
  const { data, error } = await supabase.rpc("submit_puzzle", {
    p_problem_id: problemId,
    p_correct: result.correct,
    p_given: result.given.slice(0, 200),
    p_misconception: result.misconception ?? null,
    p_hint: hint,
  });
  if (error)
    throw new Error(
      error.message ||
        "Couldn't save your result. Check your connection and try again.",
    );
  return Date.parse((data as { at: string }).at);
}
