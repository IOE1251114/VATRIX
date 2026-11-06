import { problemsFor } from "./problems";
import {
  withActivity,
  withAttempt,
  withStudent,
  type DB,
  type TopicRef,
} from "./tracking";

const names = [
  "Aarav",
  "Diya",
  "Kabir",
  "Meera",
  "Rohan",
  "Sana",
  "Vikram",
  "Isha",
];
/** Topics the demo class is deliberately weaker on, so the dashboard has something to find. */
const hardForClass = new Set(["dp", "reductions", "asymptotic", "shortest"]);

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic students for trying out the teacher dashboard. Flagged demo:true so they can be removed. */
export function seedDemo(db: DB, topics: TopicRef[]): DB {
  const rand = rng(42);
  const week = 7 * 24 * 3600 * 1000;
  let out = db;
  for (const name of names) {
    const label = `${name} (demo)`;
    out = withStudent(out, label, true);
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const base = 0.55 + rand() * 0.4;
    for (const t of topics) {
      const pool = problemsFor(t.id);
      if (!pool.length) continue;
      const skill = Math.min(
        0.97,
        Math.max(
          0.05,
          base + (rand() - 0.5) * 0.3 - (hardForClass.has(t.id) ? 0.28 : 0),
        ),
      );
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const p = pool[Math.floor(rand() * pool.length)];
        const correct = rand() < skill;
        out = withAttempt(out, id, {
          problemId: p.id,
          topic: t.id,
          correct,
          given: "(demo)",
          misconception: correct ? undefined : p.tag,
          hint: rand() < 0.2,
          at: Date.now() - rand() * week,
        });
      }
      out = withActivity(
        out,
        id,
        t.id,
        Math.round(40 + rand() * 500),
        Math.round(rand() * 40),
      );
    }
  }
  return out;
}
