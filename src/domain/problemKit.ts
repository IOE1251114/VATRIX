/** Auto-gradable practice problems. Every wrong answer maps to a named misconception,
 *  which is what lets the teacher dashboard say *why* students are stuck, not just that they are. */
export interface Problem {
  id: string;
  topic: string;
  kind: "mcq" | "num";
  prompt: string;
  options?: string[];
  /** mcq: index of the correct option. num: the correct number. */
  answer: number;
  /** Default misconception label for any wrong answer. */
  tag: string;
  /** Optional specific misconception, keyed by option index (mcq) or by the wrong number (num). */
  tags?: Record<string, string>;
  hint: string;
  explain: string;
}

/** What the website may show before an answer is checked: no answer, no explanation, no answer-specific labels. */
export type PublicProblem = Pick<
  Problem,
  "id" | "topic" | "kind" | "prompt" | "options" | "hint" | "tag"
>;

export const toPublic = (p: Problem): PublicProblem => ({
  id: p.id,
  topic: p.topic,
  kind: p.kind,
  prompt: p.prompt,
  ...(p.options ? { options: p.options } : {}),
  hint: p.hint,
  tag: p.tag,
});

/** The result of checking one answer. `at` is when it was recorded (ms since 1970). */
export type Graded = {
  correct: boolean;
  misconception?: string;
  explain: string;
  at: number;
};

export const mcq = (
  id: string,
  topic: string,
  prompt: string,
  options: string[],
  answer: number,
  tag: string,
  hint: string,
  explain: string,
  tags?: Record<string, string>,
): Problem => ({
  id,
  topic,
  kind: "mcq",
  prompt,
  options,
  answer,
  tag,
  hint,
  explain,
  tags,
});
export const num = (
  id: string,
  topic: string,
  prompt: string,
  answer: number,
  tag: string,
  hint: string,
  explain: string,
  tags?: Record<string, string>,
): Problem => ({
  id,
  topic,
  kind: "num",
  prompt,
  answer,
  tag,
  hint,
  explain,
  tags,
});
