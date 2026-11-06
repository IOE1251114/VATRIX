import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Lightbulb,
  LogOut,
  RotateCcw,
  Send,
  Target,
  UserRound,
} from "lucide-react";
import {
  checkAnswer,
  problems,
  problemsFor,
  type PublicProblem,
} from "../../domain/problems";
import {
  statusLabel,
  statusOf,
  topicStats,
  weakTopics,
  type Attempt,
  type DB,
  type Student,
  type TopicRef,
} from "../../domain/tracking";

interface Props {
  db: DB;
  student: Student | null;
  topics: TopicRef[];
  activeTopic: string;
  onLogin: (name: string) => void;
  onLogout: () => void;
  /** Label for the logout button ("Switch student" by default). */
  logoutLabel?: string;
  /** `saved`: the database already recorded this attempt (it graded it), so don't upload it again. */
  onAttempt: (a: Attempt, saved: boolean) => void;
  onOpenVisualizer: (topicId: string) => void;
}
type Result = { correct: boolean; misconception?: string; explain: string };

export function StudentPanel({
  db,
  student,
  topics,
  activeTopic,
  onLogin,
  onLogout,
  logoutLabel = "Switch student",
  onAttempt,
  onOpenVisualizer,
}: Props) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState(activeTopic);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  useEffect(() => {
    setTopic(activeTopic);
    setAssignmentId(null);
  }, [activeTopic]);

  if (!student)
    return (
      <section className="panel student-task">
        <div className="panel-heading">
          <div>
            <span className="kicker">START</span>
            <h2>Enter your name</h2>
            <p>
              Your practice results and time in the visualizers are saved under
              this name so you can see where you are lacking.
            </p>
          </div>
          <span className="panel-icon">
            <UserRound size={19} />
          </span>
        </div>
        <div className="inline-form">
          <input
            aria-label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onLogin(name)}
            placeholder="e.g. Priya Sharma"
          />
          <button
            className="btn btn-primary"
            disabled={!name.trim()}
            onClick={() => onLogin(name)}
          >
            Start <ArrowRight size={14} />
          </button>
        </div>
      </section>
    );

  const solved = (id: string) =>
    student.attempts.some((a) => a.problemId === id && a.correct);
  const assignment = db.assignments.find((a) => a.id === assignmentId);
  const list: PublicProblem[] = assignment
    ? assignment.problemIds
        .map((id) => problems.find((p) => p.id === id))
        .filter((p): p is PublicProblem => !!p)
    : problemsFor(topic);
  const weak = weakTopics(student, topics);

  const submit = async (
    p: PublicProblem,
    given: string,
    hint: boolean,
  ): Promise<Result> => {
    const r = await checkAnswer(p.id, given, hint);
    onAttempt(
      {
        problemId: p.id,
        topic: p.topic,
        correct: r.correct,
        given: given.trim(),
        misconception: r.misconception,
        hint,
        at: r.at,
      },
      r.saved,
    );
    return r;
  };

  return (
    <>
      <section className="panel student-task">
        <div className="panel-heading">
          <div>
            <span className="kicker">YOUR PROGRESS</span>
            <h2>Where you stand, {student.name}</h2>
            <p>
              Mastery is the share of your recent answers that were correct (a
              correct answer after a hint counts half). It needs at least 2
              attempts on a topic.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onLogout}>
            <LogOut size={14} /> {logoutLabel}
          </button>
        </div>
        {weak.length > 0 ? (
          <div className="callout">
            <Target size={16} />
            <p>
              <strong>Focus next:</strong>{" "}
              {weak
                .slice(0, 3)
                .map((x) => `${x.t.title} (${x.m}%)`)
                .join(" · ")}
            </p>
          </div>
        ) : (
          <div className="callout">
            <Target size={16} />
            <p>
              No weak topics detected yet. Solve problems in a few topics to
              build your profile.
            </p>
          </div>
        )}
        <div className="mastery-grid">
          {topics.map((t) => {
            const s = topicStats(student, t.id),
              st = statusOf(s.mastery);
            return (
              <button
                key={t.id}
                className={`mastery-row s-${st}`}
                onClick={() => {
                  setTopic(t.id);
                  setAssignmentId(null);
                }}
              >
                <span>{t.title}</span>
                <i>
                  <b style={{ width: `${s.mastery ?? 0}%` }} />
                </i>
                <small>
                  {s.mastery === null
                    ? "No data"
                    : `${s.mastery}% · ${statusLabel[st]}`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      {db.assignments.length > 0 && (
        <section className="panel student-task">
          <div className="panel-heading">
            <div>
              <span className="kicker">ASSIGNED BY YOUR TEACHER</span>
              <h2>Assignments</h2>
            </div>
          </div>
          <div className="submission-list">
            {db.assignments.map((a) => {
              const done = a.problemIds.filter(solved).length;
              return (
                <button
                  key={a.id}
                  className={`assignment-row ${assignmentId === a.id ? "active" : ""}`}
                  onClick={() => setAssignmentId(a.id)}
                >
                  <div>
                    <strong>{a.title}</strong>
                    <span>
                      {a.auto
                        ? "Auto-generated from class weak spots"
                        : "Teacher-created"}
                    </span>
                  </div>
                  <b>
                    {done}/{a.problemIds.length} solved
                  </b>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel student-task">
        <div className="panel-heading">
          <div>
            <span className="kicker">
              {assignment ? "ASSIGNMENT" : "PRACTICE"}
            </span>
            <h2>
              {assignment
                ? assignment.title
                : topics.find((t) => t.id === topic)?.title}
            </h2>
            <p>
              Answers are checked automatically and every wrong answer is
              matched to a specific misconception.
            </p>
          </div>
          {assignment ? (
            <button
              className="btn btn-secondary"
              onClick={() => setAssignmentId(null)}
            >
              Back to topic practice
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => onOpenVisualizer(topic)}
            >
              Open visualizer <ArrowRight size={14} />
            </button>
          )}
        </div>
        {!assignment && (
          <label className="form-label">
            Topic
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.unit} · {t.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {list.length ? (
          list.map((p) => (
            <ProblemCard
              key={p.id}
              p={p}
              solved={solved(p.id)}
              onSubmit={(g, h) => submit(p, g, h)}
            />
          ))
        ) : (
          <div className="empty-state">
            <p>
              No practice problems for this topic yet. Try the visualizer, or
              pick another topic.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function ProblemCard({
  p,
  solved,
  onSubmit,
}: {
  p: PublicProblem;
  solved: boolean;
  onSubmit: (given: string, hint: boolean) => Promise<Result>;
}) {
  const [given, setGiven] = useState("");
  const [hint, setHint] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      setRes(await onSubmit(given, hint));
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Couldn't check your answer. Try again.",
      );
    } finally {
      setChecking(false);
    }
  };
  const ready = given.trim() !== "" && !Number.isNaN(Number(given));
  return (
    <article className="problem-card">
      <div className="problem-head">
        <span className="kicker">{p.id.toUpperCase()}</span>
        {solved && (
          <span className="solved-tag">
            <Check size={12} /> solved
          </span>
        )}
      </div>
      <p className="problem-prompt">{p.prompt}</p>
      {p.kind === "mcq" ? (
        <div className="option-list">
          {p.options!.map((o, i) => (
            <label key={i} className={given === String(i) ? "chosen" : ""}>
              <input
                type="radio"
                name={p.id}
                disabled={!!res}
                checked={given === String(i)}
                onChange={() => setGiven(String(i))}
              />{" "}
              {o}
            </label>
          ))}
        </div>
      ) : (
        <input
          className="num-input"
          type="number"
          aria-label="Your answer"
          disabled={!!res}
          value={given}
          onChange={(e) => setGiven(e.target.value)}
          placeholder="Your answer"
        />
      )}
      {hint && (
        <div className="callout">
          <Lightbulb size={16} />
          <p>{p.hint}</p>
        </div>
      )}
      {!res && (
        <div className="step-controls">
          <button
            className="btn btn-primary"
            disabled={!ready || checking}
            onClick={() => void check()}
          >
            <Send size={14} /> {checking ? "Checking…" : "Check answer"}
          </button>
          {!hint && (
            <button className="btn btn-secondary" onClick={() => setHint(true)}>
              <Lightbulb size={14} /> Hint
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="auth-msg error" role="alert">
          {error}
        </p>
      )}
      {res && (
        <div className={`feedback-box ${res.correct ? "fb-ok" : "fb-bad"}`}>
          <strong>{res.correct ? "Correct" : "Not quite"}</strong>
          {!res.correct && <p>Likely misconception: {res.misconception}</p>}
          <p>{res.explain}</p>
          {!res.correct && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setRes(null);
                setGiven("");
              }}
            >
              <RotateCcw size={14} /> Try again
            </button>
          )}
        </div>
      )}
    </article>
  );
}
