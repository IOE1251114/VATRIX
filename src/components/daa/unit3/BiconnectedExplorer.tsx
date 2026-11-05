import { useMemo, useState } from "react";
import { CircleHelp, Unlink } from "lucide-react";
import { biconnected } from "../../../domain/daa/unit3/algos";
import {
  adjacency,
  presets,
  type Graph,
} from "../../../domain/daa/unit3/graphs";
import { Legend, PlayerBar, usePlayer } from "../unit1/shared";
import { DSPanel, ECOL, GraphView, VCOL, groupColor } from "./GraphView";

const countWithout = (g: Graph, skip: number | null) => {
  const adj = adjacency(g),
    seen = new Set<number>();
  let c = 0;
  g.labels.forEach((_, s) => {
    if (s === skip || seen.has(s)) return;
    c++;
    const st = [s];
    seen.add(s);
    while (st.length) {
      const u = st.pop()!;
      for (const { v } of adj[u])
        if (v !== skip && !seen.has(v)) {
          seen.add(v);
          st.push(v);
        }
    }
  });
  return c;
};

export function BiconnectedExplorer({
  onSteps,
}: {
  onSteps?: (k: number) => void;
}) {
  const g = presets.bcc;
  const run = useMemo(() => biconnected(g), []);
  const p = usePlayer(run.frames.length, "bcc", onSteps);
  const f = run.frames[p.step];
  const [removed, setRemoved] = useState<number | null>(null);
  const pieces = countWithout(g, removed);
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">BICONNECTED COMPONENTS</span>
            <h2>Find the single points of failure</h2>
            <p>
              An <b>articulation point</b> (cut vertex) is a vertex whose
              removal disconnects the graph. A <b>bridge</b> is such an edge. A{" "}
              <b>biconnected component</b> is a maximal piece with no
              articulation point inside it. One DFS finds all three using
              low-link values.
            </p>
          </div>
          <span className="panel-icon">
            <Unlink size={19} />
          </span>
        </div>
        <Legend
          items={[
            { id: "ap", label: "Articulation point", color: VCOL.ap.stroke },
            { id: "br", label: "Bridge", color: ECOL.bridge.c },
            { id: "tr", label: "DFS tree edge", color: ECOL.tree.c },
            { id: "bk", label: "Back edge", color: ECOL.back.c, dash: true },
            {
              id: "c",
              label: "Coloured edges: one biconnected component",
              color: groupColor(0),
            },
          ]}
        />
        <p className="u1-small" style={{ marginTop: 0 }}>
          Under each vertex: disc / low. disc is the DFS discovery time; low is
          the smallest discovery time reachable from the vertex’s subtree using
          at most one back edge.
        </p>
        <div className="u3-stage">
          <div className="u3-canvas">
            <GraphView g={g} f={f} />
          </div>
          <DSPanel ds={f.ds} />
        </div>
        <div className="stage-explanation">
          <strong>{f.title}</strong>
          <p>{f.text}</p>
        </div>
        <PlayerBar p={p} />
        <div className="formula-card">
          <small>THE TEST (for a DFS tree edge u → v)</small>
          <strong>
            u is an articulation point ⇔ low[v] ≥ disc[u] (non-root u) · root ⇔
            it has ≥ 2 DFS children
          </strong>
          <span>
            u–v is a bridge ⇔ low[v] &gt; disc[u]. In words: nothing in v’s
            subtree can climb back above u without going through u.
          </span>
        </div>
        {p.step === p.last && (
          <div className="u3-groups">
            {run.bccs.map((b, i) => (
              <div key={i} style={{ borderColor: groupColor(i) }}>
                <b style={{ background: groupColor(i) }}>BCC {i + 1}</b>
                {b.map((x) => (
                  <span key={x}>{g.labels[x]}</span>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel u1-gap">
        <div className="panel-heading">
          <div>
            <span className="kicker">TRY IT</span>
            <h2>Remove a vertex and count the pieces</h2>
            <p>
              Click a vertex to delete it (click again to restore it). If the
              number of connected pieces goes up, you removed an articulation
              point.
            </p>
          </div>
        </div>
        <div className="u3-canvas">
          <GraphView
            g={g}
            onNode={(i) => setRemoved(removed === i ? null : i)}
            removed={removed}
            f={{
              vstate: g.labels.map((_, i) =>
                run.aps.includes(i) && removed === null ? "ap" : "unseen",
              ),
              comp: removed === null ? undefined : pieceColors(g, removed),
            }}
            maxWidth={620}
          />
        </div>
        <div
          className={`sat-result ${removed !== null && pieces > 1 ? "sat-no" : ""}`}
        >
          <strong>
            {removed === null
              ? "Nothing removed: 1 connected piece"
              : `Without ${g.labels[removed]}: ${pieces} piece${pieces > 1 ? "s" : ""}`}
          </strong>
          <span>
            {removed === null
              ? `The red-ringed vertices (${run.aps.map((i) => g.labels[i]).join(", ")}) are the articulation points the DFS found. Remove one to check.`
              : pieces > 1
                ? `${g.labels[removed]} is an articulation point: the graph falls apart into ${pieces} pieces (each coloured differently).`
                : `${g.labels[removed]} is not an articulation point: every other vertex can still reach every other.`}
          </span>
        </div>
        <div className="callout">
          <CircleHelp size={16} />
          <p>
            Why it matters: in a computer or road network, articulation points
            and bridges are single points of failure. A biconnected network (no
            articulation points) survives the loss of any one node. Checking
            every vertex by removing it would cost O(V·(V + E)); the low-link
            DFS does all of it in O(V + E).
          </p>
        </div>
      </section>
    </>
  );
}

function pieceColors(g: Graph, skip: number): (number | null)[] {
  const adj = adjacency(g),
    comp: (number | null)[] = Array(g.labels.length).fill(null);
  let c = -1;
  g.labels.forEach((_, s) => {
    if (s === skip || comp[s] !== null) return;
    c++;
    comp[s] = c;
    const st = [s];
    while (st.length) {
      const u = st.pop()!;
      for (const { v } of adj[u])
        if (v !== skip && comp[v] === null) {
          comp[v] = c;
          st.push(v);
        }
    }
  });
  return comp;
}
