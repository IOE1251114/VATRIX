import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Download,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { seedDemo } from "../../domain/demo";
import { problemsIn, type Problem } from "../../domain/problems";
import {
  classMastery,
  statusLabel,
  statusOf,
  studentsAtRisk,
  toCSV,
  topMisconceptions,
  topicStats,
  withoutDemo,
  type DB,
  type Status,
  type TopicRef,
  type UpdateDB,
} from "../../domain/tracking";

const colour: Record<Status, string> = {
  none: "#1a2737",
  struggling: "#ff8b9a",
  developing: "#f4c56a",
  strong: "#64e0b4",
};
const download = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
const fmtTime = (s: number) =>
  s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`;

interface Props {
  db: DB;
  update: UpdateDB;
  topics: TopicRef[];
  /** The practice questions (loaded from the database). */
  problems: Problem[];
  onOpenVisualizer: (topicId: string) => void;
}

export function TeacherDashboard({
  db,
  update,
  topics,
  problems,
  onOpenVisualizer,
}: Props) {
  const problemsFor = (topic: string) => problemsIn(problems, topic);
  const [selected, setSelected] = useState<string | null>(null);
  const [pick, setPick] = useState(topics[0].id);
  const students = Object.values(db.students);
  const title = (id: string) => topics.find((t) => t.id === id)?.title ?? id;
  const cm = classMastery(db, topics);
  const withData = topics.filter((t) => cm[t.id].avg !== null);
  const weakest = [...withData]
    .sort((a, b) => cm[a.id].avg! - cm[b.id].avg!)
    .filter((t) => cm[t.id].avg! < 60)
    .slice(0, 3);
  const misconceptions = topMisconceptions(db);
  const atRisk = studentsAtRisk(db, topics);
  const allAttempts = students.flatMap((s) => s.attempts);
  const accuracy = allAttempts.length
    ? Math.round(
        (100 * allAttempts.filter((a) => a.correct).length) /
          allAttempts.length,
      )
    : null;
  const detail = selected ? db.students[selected] : null;

  const addAssignment = (ids: string[], name: string, auto: boolean) =>
    ids.length &&
    update((d) => ({
      ...d,
      assignments: [
        {
          id: `a${Date.now()}`,
          title: name,
          problemIds: ids,
          createdAt: Date.now(),
          auto,
        },
        ...d.assignments,
      ],
    }));
  const autoAssign = () =>
    addAssignment(
      weakest.flatMap((t) => problemsFor(t.id).map((p) => p.id)),
      `Review: ${weakest.map((t) => t.title).join(", ")}`,
      true,
    );
  const completion = (ids: string[]) =>
    students.length
      ? students.filter((s) =>
          ids.every((id) =>
            s.attempts.some((a) => a.problemId === id && a.correct),
          ),
        ).length
      : 0;

  return (
    <>
      <section className="panel analytics-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">CLASS OVERVIEW · AUTOMATIC</span>
            <h2>Class analytics</h2>
            <p>
              Computed from student practice attempts and visualizer activity.
              Nothing to grade or enter by hand. Data lives in this browser
              only.
            </p>
          </div>
          <div className="panel-actions-inline">
            <button
              className="btn btn-secondary"
              onClick={() => update((d) => seedDemo(d, topics, problems))}
            >
              <Users size={14} /> Load demo class
            </button>
            <button
              className="btn btn-secondary"
              disabled={!students.some((s) => s.demo)}
              onClick={() => update(withoutDemo)}
            >
              <Trash2 size={14} /> Remove demo
            </button>
          </div>
        </div>
        <div className="metric-grid four">
          <div className="metric-card">
            <span>STUDENTS</span>
            <strong>{students.length}</strong>
            <small>{students.filter((s) => s.demo).length} demo</small>
          </div>
          <div className="metric-card">
            <span>ATTEMPTS</span>
            <strong>{allAttempts.length}</strong>
            <small>Auto-graded answers</small>
          </div>
          <div className="metric-card">
            <span>CLASS ACCURACY</span>
            <strong>
              {accuracy ?? "—"}
              <i>{accuracy === null ? " no data" : "%"}</i>
            </strong>
            <small>All attempts</small>
          </div>
          <div className="metric-card">
            <span>NEED ATTENTION</span>
            <strong>{atRisk.length}</strong>
            <small>Struggling in 2+ topics</small>
          </div>
        </div>
        {!students.length && (
          <div className="empty-state">
            <Users size={22} />
            <strong>No students yet</strong>
            <p>
              Students appear here as soon as they enter a name in Student mode.
              Load the demo class to preview a populated dashboard.
            </p>
          </div>
        )}
      </section>

      {students.length > 0 && (
        <>
          <section className="panel analytics-panel">
            <div className="panel-heading">
              <div>
                <span className="kicker">AUTO-INSIGHTS</span>
                <h2>What needs your attention</h2>
              </div>
              <span className="panel-icon">
                <Sparkles size={19} />
              </span>
            </div>
            <div className="insight-grid">
              <div>
                <strong>Weakest class topics</strong>
                {weakest.length ? (
                  weakest.map((t) => (
                    <p key={t.id}>
                      <button
                        className="link-btn"
                        onClick={() => onOpenVisualizer(t.id)}
                      >
                        {t.title}
                      </button>
                      : {cm[t.id].avg}% average, {cm[t.id].below50} of{" "}
                      {cm[t.id].n} students below 50%
                    </p>
                  ))
                ) : (
                  <p>No topic is below 60% class average.</p>
                )}
              </div>
              <div>
                <strong>Most common misconceptions</strong>
                {misconceptions.length ? (
                  misconceptions.map((m) => (
                    <p key={m.topic + m.label}>
                      {m.label}{" "}
                      <small>
                        ({title(m.topic)} · {m.count}×)
                      </small>
                    </p>
                  ))
                ) : (
                  <p>No wrong answers recorded yet.</p>
                )}
              </div>
              <div>
                <strong>Students to check in with</strong>
                {atRisk.length ? (
                  atRisk.map((x) => (
                    <p key={x.s.id}>
                      <button
                        className="link-btn"
                        onClick={() => setSelected(x.s.id)}
                      >
                        {x.s.name}
                      </button>
                      :{" "}
                      {x.weak
                        .slice(0, 3)
                        .map((w) => `${w.t.title} ${w.m}%`)
                        .join(", ")}
                    </p>
                  ))
                ) : (
                  <p>Nobody is struggling in 2 or more topics.</p>
                )}
              </div>
            </div>
            <div className="builder-footer">
              <span>
                Auto-assign builds a practice set from the three weakest class
                topics.
              </span>
              <button
                className="btn btn-primary"
                disabled={!weakest.length}
                onClick={autoAssign}
              >
                <Wand2 size={15} /> Auto-assign weak topics
              </button>
            </div>
          </section>

          <section className="panel analytics-panel">
            <div className="panel-heading">
              <div>
                <span className="kicker">CLASS MASTERY BY TOPIC</span>
                <h2>Where the class is lacking</h2>
                <p>
                  Average mastery over students with at least 2 attempts on the
                  topic.
                </p>
              </div>
            </div>
            {withData.length ? (
              <div style={{ height: withData.length * 30 + 30 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={withData.map((t) => ({
                      name: t.title,
                      avg: cm[t.id].avg,
                      n: cm[t.id].n,
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: "#7f94ab", fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fill: "#a9bbcf", fontSize: 10 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#ffffff08" }}
                      contentStyle={{
                        background: "#0d1521",
                        border: "1px solid #2a3b50",
                        fontSize: 11,
                      }}
                      formatter={(v: number, _n, p) => [
                        `${v}% (${p.payload.n} students)`,
                        "Mastery",
                      ]}
                    />
                    <Bar dataKey="avg" radius={3}>
                      {withData.map((t) => (
                        <Cell
                          key={t.id}
                          fill={colour[statusOf(cm[t.id].avg)]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state">
                <p>No topic has 2+ attempts per student yet.</p>
              </div>
            )}
          </section>

          <section className="panel analytics-panel">
            <div className="panel-heading">
              <div>
                <span className="kicker">STUDENT × TOPIC</span>
                <h2>Mastery heatmap</h2>
                <p>
                  Click a student for details. Hover a cell for the topic and
                  score.
                </p>
              </div>
            </div>
            <div className="heat-wrap">
              <table className="heat-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    {topics.map((t) => (
                      <th key={t.id} title={t.title}>
                        {t.id.slice(0, 4)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className={selected === s.id ? "sel" : ""}>
                      <td>
                        <button
                          className="link-btn"
                          onClick={() =>
                            setSelected(selected === s.id ? null : s.id)
                          }
                        >
                          {s.name}
                        </button>
                      </td>
                      {topics.map((t) => {
                        const m = topicStats(s, t.id).mastery,
                          st = statusOf(m);
                        return (
                          <td key={t.id}>
                            <i
                              className="heat-cell"
                              style={{ background: colour[st] }}
                              title={`${t.title}: ${m === null ? "no data" : `${m}% (${statusLabel[st]})`}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="heat-legend">
              {(Object.keys(colour) as Status[]).map((k) => (
                <span key={k}>
                  <i style={{ background: colour[k] }} /> {statusLabel[k]}
                </span>
              ))}
            </div>
            {detail && (
              <div className="student-detail">
                <strong>{detail.name}</strong>
                <div className="item-table">
                  <div className="item-row item-header detail-row">
                    <span>Topic</span>
                    <span>Mastery</span>
                    <span>Attempts</span>
                    <span>Visualizer</span>
                  </div>
                  {topics
                    .map((t) => ({ t, x: topicStats(detail, t.id) }))
                    .filter((r) => r.x.attempts || r.x.seconds)
                    .map(({ t, x }) => (
                      <div className="item-row detail-row" key={t.id}>
                        <span>{t.title}</span>
                        <span>
                          {x.mastery === null ? "—" : `${x.mastery}%`}
                        </span>
                        <span>
                          {x.correct}/{x.attempts} correct
                        </span>
                        <span>
                          {fmtTime(x.seconds)} · {x.steps} steps
                        </span>
                      </div>
                    ))}
                </div>
                {[
                  ...new Set(
                    detail.attempts
                      .filter((a) => !a.correct && a.misconception)
                      .map((a) => a.misconception!),
                  ),
                ].length > 0 && (
                  <div className="callout">
                    <AlertTriangle size={16} />
                    <p>
                      <strong>Misconceptions seen:</strong>{" "}
                      {[
                        ...new Set(
                          detail.attempts
                            .filter((a) => !a.correct && a.misconception)
                            .map((a) => a.misconception!),
                        ),
                      ].join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <section className="panel analytics-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">ASSIGNMENTS</span>
            <h2>Practice sets</h2>
            <p>
              Students see assignments in their workspace and are graded
              automatically.
            </p>
          </div>
        </div>
        <div className="inline-form">
          <select
            aria-label="Topic to assign"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({problemsFor(t.id).length} problems)
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            disabled={!problemsFor(pick).length}
            onClick={() =>
              addAssignment(
                problemsFor(pick).map((p) => p.id),
                `Practice: ${title(pick)}`,
                false,
              )
            }
          >
            Assign topic
          </button>
        </div>
        {db.assignments.length ? (
          <div className="submission-list">
            {db.assignments.map((a) => (
              <article className="submission-item" key={a.id}>
                <div>
                  <strong>{a.title}</strong>
                  <span>
                    {a.auto ? "Auto-generated" : "Manual"} ·{" "}
                    {a.problemIds.length} problems from{" "}
                    {
                      new Set(
                        a.problemIds.map(
                          (id) => problems.find((p) => p.id === id)?.topic,
                        ),
                      ).size
                    }{" "}
                    topics
                  </span>
                </div>
                <b>
                  {completion(a.problemIds)}/{students.length} done
                </b>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No assignments yet.</p>
          </div>
        )}
      </section>

      <section className="panel analytics-panel">
        <div className="panel-actions">
          <span>
            Export for gradebooks or backup. Remember data is stored only in
            this browser.
          </span>
          <div>
            <button
              className="btn btn-secondary"
              disabled={!students.length}
              onClick={() =>
                download("daa-lab-mastery.csv", toCSV(db, topics), "text/csv")
              }
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              className="btn btn-secondary"
              disabled={!students.length}
              onClick={() =>
                download(
                  "daa-lab-data.json",
                  JSON.stringify(db, null, 2),
                  "application/json",
                )
              }
            >
              <Download size={14} /> Export JSON
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
