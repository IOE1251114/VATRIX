/* The full problem bank WITH answers and explanations.
 *
 * Never import this from website code that runs when Supabase is configured: in that case the
 * answers live only in the database (table `problem_key`) and are checked by `submit_attempt`.
 * It is used by the generator script (scripts/gen-problems.ts), by tests, and — through a
 * dynamic import that the build removes when Supabase is configured — by the browser-only mode.
 */
import { daaProblems } from "./daa/problems";
import { dsProblems } from "./ds/problems";
import { laProblems } from "./la/problems";
import type { Problem } from "./problemKit";

/** Every subject's practice problems. Topic ids are unique across subjects. */
export const answerKey: Problem[] = [
  ...daaProblems,
  ...dsProblems,
  ...laProblems,
];

/**
 * Grade one answer the same way the database function does: the trimmed answer must be a number
 * equal to the key; a wrong number may map to a specific misconception, otherwise the default one.
 */
export function gradeAnswer(
  p: Problem,
  given: string,
): { correct: boolean; misconception?: string } {
  const text = given.trim();
  const value = text === "" ? NaN : Number(text);
  if (value === p.answer) return { correct: true };
  return {
    correct: false,
    misconception:
      (Number.isFinite(value) ? p.tags?.[String(value)] : undefined) ?? p.tag,
  };
}
