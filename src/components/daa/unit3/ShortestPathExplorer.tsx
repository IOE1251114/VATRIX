import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleHelp, Milestone } from "lucide-react";
import {
  bellmanFord,
  dagShortest,
  dijkstra,
} from "../../../domain/daa/unit3/algos";
import {
  presets,
  randomGraph,
  type PresetId,
} from "../../../domain/daa/unit3/graphs";
import {
  Legend,
  PlayerBar,
  SERIES,
  Tabs,
  axis,
  compact,
  grid,
  tooltipStyle,
  usePlayer,
} from "../unit1/shared";
import { DSPanel, ECOL, GraphView, VCOL } from "./GraphView";

type Algo = "dijkstra" | "bf" | "dag";
const graphsFor: Record<Algo, { id: PresetId; label: string }[]> = {
  dijkstra: [
    { id: "dijkstra", label: "Non-negative weights" },
    { id: "negative", label: "With negative edges (watch it fail)" },
  ],
  bf: [
    { id: "negative", label: "Negative edges" },
    { id: "negCycle", label: "Negative cycle" },
    { id: "dijkstra", label: "Non-negative weights" },
  ],
  dag: [{ id: "dag", label: "Weighted DAG" }],
};

export function ShortestPathExplorer({
  onSteps,
}: {
  onSteps?: (k: number) => void;
}) {
  const [algo, setAlgo] = useState<Algo>("dijkstra");
  const [gid, setGid] = useState<PresetId>("dijkstra");
  const g = presets[gid];
  const [src, setSrc] = useState(0);
  const s = Math.min(src, g.labels.length - 1);
  const run = useMemo(
    () =>
      algo === "dijkstra"
        ? dijkstra(g, s)
        : algo === "bf"
          ? bellmanFord(g, s)
          : dagShortest(g, s),
    [algo, gid, s],
  );
  const truth = useMemo(() => bellmanFord(g, s), [gid, s]);
  const p = usePlayer(run.frames.length, `${algo}-${gid}-${s}`, onSteps);
  const f = run.frames[p.step];
  const pick = (a: Algo) => {
    setAlgo(a);
    setGid(graphsFor[a][0].id);
    setSrc(a === "dag" ? 1 : 0);
  };
  const neg = "negCycle" in run && run.negCycle;
  const wrong =
    algo === "dijkstra" && !truth.negCycle
      ? run.dist.map((d, i) => d !== truth.dist[i])
      : run.dist.map(() => false);
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">SINGLE-SOURCE SHORTEST PATHS</span>
            <h2>Relax edges until no shortcut is left</h2>
            <p>
              Every algorithm keeps an estimate d[v] and repeatedly{" "}
              <b>relaxes</b> edges: if d[u] + w(u, v) &lt; d[v], use u as the
              better way to reach v. They differ in the order of relaxation, and
              that order decides which graphs they can handle.
            </p>
          </div>
          <span className="panel-icon">
            <Milestone size={19} />
          </span>
        </div>
        <Tabs
          value={algo}
          onChange={pick}
          options={[
            { id: "dijkstra", label: "Dijkstra" },
            { id: "bf", label: "Bellman–Ford" },
            { id: "dag", label: "DAG shortest paths" },
          ]}
        />
        <div className="u1-controls">
          <Tabs value={gid} onChange={setGid} options={graphsFor[algo]} />
          <label className="u1-select">
            source
            <select value={s} onChange={(e) => setSrc(Number(e.target.value))}>
              {g.labels.map((l, i) => (
                <option key={l} value={i}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Legend
          items={[
            {
              id: "f",
              label:
                algo === "dijkstra" ? "In priority queue" : "Distance improved",
              color: VCOL.frontier.stroke,
            },
            { id: "a", label: "Being processed", color: VCOL.active.stroke },
            {
              id: "d",
              label: algo === "dijkstra" ? "Settled (final)" : "Processed",
              color: VCOL.done.stroke,
            },
            { id: "r", label: "Edge just relaxed", color: ECOL.relaxed.c },
            { id: "s", label: "Shortest-path tree", color: ECOL.sp.c },
            { id: "n", label: "Negative weight", color: "#ff8b9a", dash: true },
          ]}
        />
        <div className="u3-stage">
          <div className="u3-canvas">
            <GraphView g={g} f={f} />
          </div>
          <DSPanel
            ds={f.ds}
            out={algo === "dag" ? f.out : undefined}
            outLabel="Topological order"
          />
        </div>
        <div
          className={`stage-explanation ${neg && p.step === p.last ? "u2-warn" : ""}`}
        >
          <strong>{f.title}</strong>
          <p>{f.text}</p>
        </div>
        <PlayerBar p={p} />
        {p.step === p.last && !neg && (
          <div className="u1-table-wrap u1-gap">
            <table className="u1-table">
              <thead>
                <tr>
                  <th>Vertex</th>
                  <th>
                    d[v] (
                    {algo === "dijkstra"
                      ? "Dijkstra"
                      : algo === "bf"
                        ? "Bellman–Ford"
                        : "DAG"}
                    )
                  </th>
                  <th>Shortest path</th>
                  {algo === "dijkstra" && <th>Correct answer</th>}
                </tr>
              </thead>
              <tbody>
                {g.labels.map((l, v) => (
                  <tr key={l} className={wrong[v] ? "u3-wrong" : ""}>
                    <td>{l}</td>
                    <td>{run.dist[v] === Infinity ? "∞" : run.dist[v]}</td>
                    <td>
                      {run.dist[v] === Infinity
                        ? "unreachable"
                        : run.paths[v]?.map((i) => g.labels[i]).join(" → ")}
                    </td>
                    {algo === "dijkstra" && (
                      <td>
                        {truth.negCycle
                          ? "—"
                          : truth.dist[v] === Infinity
                            ? "∞"
                            : truth.dist[v]}
                        {wrong[v] ? " ✗ Dijkstra is wrong here" : ""}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="u2-stats">
          <div>
            <small>RELAXATIONS</small>
            <strong>{f.counters.relaxations ?? 0}</strong>
            <span>edge checks so far</span>
          </div>
          <div>
            <small>TIME</small>
            <strong className="u2-mono">
              {algo === "dijkstra"
                ? "O((V + E) log V) heap · O(V²) array"
                : algo === "bf"
                  ? "O(V·E)"
                  : "Θ(V + E)"}
            </strong>
          </div>
          <div>
            <small>NEGATIVE WEIGHTS?</small>
            <strong className="u2-mono">
              {algo === "dijkstra"
                ? "not allowed"
                : algo === "bf"
                  ? "allowed; detects negative cycles"
                  : "allowed (no cycles at all)"}
            </strong>
          </div>
        </div>
      </section>
      <CostChart />
    </>
  );
}

function CostChart() {
  const data = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const V = 10 + i * 10,
          E = 3 * V,
          g = randomGraph(V, E, 900 + i, true, true);
        const dj = dijkstra(g, 0).frames,
          bf = bellmanFord(g, 0).frames;
        return {
          V,
          dijkstra: dj[dj.length - 1].counters.relaxations,
          bf: bf[bf.length - 1].counters.relaxations,
          worst: (V - 1) * E,
        };
      }),
    [],
  );
  return (
    <section className="panel u1-gap">
      <div className="panel-heading">
        <div>
          <span className="kicker">COST COMPARISON</span>
          <h2>Edge relaxations on random graphs (E = 3V)</h2>
          <p>
            Counted by running both algorithms on seeded random graphs with
            non-negative weights. Bellman–Ford may stop early once a pass
            changes nothing; the dashed line is its worst case.
          </p>
        </div>
      </div>
      <Legend
        items={[
          { id: "d", label: "Dijkstra: each edge once", color: SERIES[0] },
          {
            id: "b",
            label: "Bellman–Ford (with early stop)",
            color: SERIES[5],
          },
          {
            id: "w",
            label: "Bellman–Ford worst case (V − 1)·E",
            color: "#8fa3b9",
            dash: true,
          },
        ]}
      />
      <div className="u1-chart" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 16, bottom: 6, left: 0 }}
          >
            <CartesianGrid {...grid} />
            <XAxis
              dataKey="V"
              {...axis}
              label={{
                value: "V",
                position: "insideBottomRight",
                offset: -2,
                fill: "#8498ae",
                fontSize: 10,
              }}
            />
            <YAxis
              {...axis}
              width={50}
              scale="log"
              domain={["auto", "auto"]}
              tickFormatter={compact}
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(v) => `V = ${v}, E = ${3 * Number(v)}`}
              formatter={(v: number, k: string) => [
                compact(v),
                k === "dijkstra"
                  ? "Dijkstra"
                  : k === "bf"
                    ? "Bellman–Ford"
                    : "(V − 1)·E",
              ]}
            />
            <Line
              dataKey="dijkstra"
              stroke={SERIES[0]}
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="bf"
              stroke={SERIES[5]}
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="worst"
              stroke="#8fa3b9"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="callout">
        <CircleHelp size={16} />
        <p>
          Log scale. Dijkstra relaxes each edge exactly once because it
          processes vertices in final-distance order; that greedy order is only
          safe without negative edges. Bellman–Ford makes no assumption, so it
          pays for up to V − 1 full passes. Use Dijkstra for non-negative
          weights, Bellman–Ford when weights can be negative, and the DAG method
          whenever the graph has no cycles.
        </p>
      </div>
    </section>
  );
}
