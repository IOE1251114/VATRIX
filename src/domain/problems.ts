/* The practice questions as the website sees them — prompts, options and hints, never answers.
 * They come from questions.json, generated from the problem bank by `npm run gen:problems`.
 *
 * Checking an answer:
 *   • With Supabase configured, the answer is sent to the database function submit_attempt,
 *     which grades it against the hidden answer key and records the attempt. The answers are
 *     not part of the website at all (the build drops the branch below that would load them).
 *   • Without Supabase (browser-only mode), the answer key is loaded on demand and checked here. */
import questions from "./questions.json";
import type { Graded, PublicProblem } from "./problemKit";
import { supabase } from "../lib/supabase";

export type { Graded, PublicProblem } from "./problemKit";

/** Every subject's practice questions. Topic ids are unique across subjects. */
export const problems = questions as PublicProblem[];

export const problemsFor = (topic: string) =>
  problems.filter((p) => p.topic === topic);

/** True when the build has Supabase settings. Written as a literal check so the bundler can
 *  delete the browser-only branch (and with it the whole answer key) from cloud builds. */
const CLOUD = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Check one answer. In cloud mode the database also records the attempt (`saved: true`), so the
 * caller must not upload it again; in browser-only mode the caller records it (`saved: false`).
 * Throws with a readable message when the answer could not be checked (e.g. offline).
 */
export async function checkAnswer(
  problemId: string,
  given: string,
  hint: boolean,
): Promise<Graded & { saved: boolean }> {
  if (CLOUD) {
    const { data, error } = await supabase!.rpc("submit_attempt", {
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
      saved: true,
    };
  }
  const { answerKey, gradeAnswer } = await import("./answerKey");
  const p = answerKey.find((x) => x.id === problemId);
  if (!p) throw new Error(`Unknown problem ${problemId}.`);
  return {
    ...gradeAnswer(p, given),
    explain: p.explain,
    at: Date.now(),
    saved: false,
  };
}
