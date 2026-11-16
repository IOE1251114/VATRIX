/* An interactive practice question: a fresh board built from the row's settings. The student
 * plays it, the board checks the moves, and the finished result is recorded in the database. */
import { useMemo, useState, type ReactNode } from "react";
import { Check, Eye, Lightbulb, RotateCcw, Shuffle } from "lucide-react";
import type { Problem } from "../../domain/problems";
import { makePuzzle, newSeed, type Puzzle } from "../../domain/puzzles";
import {
  hanoiBest,
  hanoiLegal,
  hanoiMove,
  hanoiStart,
  type Pegs,
} from "../../domain/puzzles/dsPuzzles";
import {
  fmtNum,
  gradeTable,
  parseNum,
  type CellMark,
  type CyclePuzzle,
  type GraphBoard,
  type SelectPuzzle,
  type StatusLine,
  type TablePuzzle,
  type HanoiPuzzle,
  type MazePuzzle,
  type OrderPuzzle,
  type PlanePuzzle,
  type QueensPuzzle,
  type Vec,
} from "../../domain/puzzles/core";

export type PuzzleResult = {
  correct: boolean;
  given: string;
  misconception?: string;
};

type Outcome = PuzzleResult & { explain: string };

type Props = {
  p: Problem;
  solved: boolean;
  /** Record the result. Rejects with a readable message if it couldn't be saved. */
  onFinish: (r: PuzzleResult, hint: boolean) => Promise<void>;
};

/** What every board gets: whether it's still playable, the hint state, and how to finish. */
type BoardProps<P> = {
  pz: P;
  done: boolean;
  hint: boolean;
  finish: (r: PuzzleResult) => void;
};

export function PuzzleCard({ p, solved, onFinish }: Props) {
  const [seed, setSeed] = useState(newSeed);
  const [round, setRound] = useState(0); // remounts the board on retry
  const pz = useMemo(
    () => (p.puzzle ? makePuzzle(p.puzzle, seed) : null),
    [p.puzzle, seed],
  );
  const [hint, setHint] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (o: Outcome) => {
    setSaving(true);
    setError(null);
    try {
      await onFinish(o, hint);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Couldn't save your result. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const finish = (r: PuzzleResult) => {
    if (outcome || !pz) return;
    const o = { ...r, explain: pz.explain };
    setOutcome(o);
    void save(o);
  };
  const reset = (fresh: boolean) => {
    if (fresh) setSeed(newSeed());
    setRound((n) => n + 1);
    setOutcome(null);
    setHint(false);
    setError(null);
  };

  if (!pz)
    return (
      <article className="problem-card">
        <p className="problem-prompt">
          This puzzle's settings aren't recognised. Ask your teacher to check
          it.
        </p>
      </article>
    );

  const done = !!outcome;
  const giveUp = () =>
    finish({
      correct: false,
      given: "showed the answer",
      misconception: p.tag,
    });
  const board = renderBoard(pz, { done, hint, finish }, round);
  const gameLike = pz.family !== "order" && pz.family !== "plane";

  return (
    <article className="problem-card puzzle-card">
      <div className="problem-head">
        <span className="kicker">
          {p.id.toUpperCase()} · <span className="puzzle-badge">PUZZLE</span>
        </span>
        {solved && (
          <span className="solved-tag">
            <Check size={12} /> solved
          </span>
        )}
      </div>
      <p className="problem-prompt">{p.prompt}</p>
      <p className="puzzle-task">{pz.task}</p>
      {board}
      {hint && (p.hint || (pz.family === "plane" && pz.hint)) && (
        <div className="callout">
          <Lightbulb size={16} />
          <p>{pz.family === "plane" && pz.hint ? pz.hint : p.hint}</p>
        </div>
      )}
      {!done && (
        <div className="step-controls">
          {!hint && (
            <button className="btn btn-secondary" onClick={() => setHint(true)}>
              <Lightbulb size={14} /> Hint
            </button>
          )}
          {gameLike && (
            <button className="btn btn-secondary" onClick={giveUp}>
              <Eye size={14} /> Show answer
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => reset(true)}>
            <Shuffle size={14} /> New board
          </button>
        </div>
      )}
      {outcome && (
        <div className={`feedback-box ${outcome.correct ? "fb-ok" : "fb-bad"}`}>
          <strong>{outcome.correct ? "Correct" : "Not quite"}</strong>
          {!outcome.correct && outcome.misconception && (
            <p>Likely misconception: {outcome.misconception}</p>
          )}
          <p>{outcome.explain}</p>
          {saving && <p className="puzzle-note">Saving your result…</p>}
          {error && (
            <p className="auth-msg error" role="alert">
              {error}{" "}
              <button className="link-btn" onClick={() => void save(outcome)}>
                Retry
              </button>
            </p>
          )}
          <div className="step-controls">
            {!outcome.correct && (
              <button
                className="btn btn-secondary"
                onClick={() => reset(false)}
              >
                <RotateCcw size={14} /> Try this board again
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => reset(true)}>
              <Shuffle size={14} /> New board
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function renderBoard(
  pz: Puzzle,
  common: Omit<BoardProps<never>, "pz">,
  round: number,
): ReactNode {
  const key = `${round}`;
  switch (pz.family) {
    case "order":
      return <OrderBoard key={key} pz={pz} {...common} />;
    case "cycle":
      return <CycleBoard key={key} pz={pz} {...common} />;
    case "queens":
      return <QueensBoard key={key} pz={pz} {...common} />;
    case "maze":
      return <MazeBoard key={key} pz={pz} {...common} />;
    case "hanoi":
      return <HanoiBoard key={key} pz={pz} {...common} />;
    case "plane":
      return <PlaneBoard key={key} pz={pz} {...common} />;
    case "select":
      return <SelectBoard key={key} pz={pz} {...common} />;
    case "table":
      return <TableBoard key={key} pz={pz} {...common} />;
  }
}

/** Fixed text above a board: code, the operations to run, the matrices involved. */
function Lines({ lines }: { lines?: string[] }) {
  if (!lines?.length) return null;
  return <pre className="puzzle-lines">{lines.join("\n")}</pre>;
}

function Status({ lines }: { lines: StatusLine[] }) {
  return (
    <div className="puzzle-status" aria-live="polite">
      {lines.map((l, i) => (
        <span
          key={i}
          className={l.ok === true ? "ok" : l.ok === false ? "bad" : ""}
        >
          {l.text}
        </span>
      ))}
    </div>
  );
}

/** A row of boxes (array slots, list nodes, tokens…). */
function CellsRow({
  values,
  captions,
  marks,
  look,
  onCell,
}: {
  values: string[];
  captions?: string[];
  marks?: Record<number, CellMark>;
  look?: (i: number) => string;
  onCell?: (i: number) => void;
}) {
  return (
    <div className="puzzle-cells">
      {values.map((v, i) => (
        <button
          key={i}
          className={`pz-box ${marks?.[i] ?? ""} ${look?.(i) ?? ""}`}
          disabled={!onCell}
          onClick={onCell ? () => onCell(i) : undefined}
          aria-label={`Box ${i}${v ? `: ${v}` : ", empty"}`}
        >
          <b>{v || "\u00a0"}</b>
          {captions?.[i] !== undefined && <small>{captions[i]}</small>}
        </button>
      ))}
    </div>
  );
}

// ---------- Graph drawing ----------

type NodeLook = "idle" | "visited" | "current" | "hint" | "wrong" | "start";

function GraphSvg({
  g,
  look,
  badge,
  edgeLook,
  onNode,
  onEdge,
}: {
  g: GraphBoard;
  look: (i: number) => NodeLook;
  badge?: (i: number) => string | null;
  edgeLook?: (i: number) => "idle" | "on" | "hint" | "wrong";
  onNode?: (i: number) => void;
  onEdge?: (i: number) => void;
}) {
  const R = 19;
  return (
    <svg
      className="puzzle-svg"
      viewBox={
        g.edges.some((e) => e.a === e.b)
          ? `-40 -40 ${g.width + 80} ${g.height + 80}`
          : `0 0 ${g.width} ${g.height}`
      }
      role="group"
      aria-label="Graph"
    >
      <defs>
        <marker
          id="pz-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#5f7896" />
        </marker>
      </defs>
      {g.edges.map((e, i) => {
        const a = g.nodes[e.a],
          b = g.nodes[e.b];
        const st = edgeLook?.(i) ?? "idle";
        const marker = g.directed ? "url(#pz-arrow)" : undefined;
        const cls = `pz-edge e-${st} ${onEdge ? "clickable" : ""}`;
        const click = onEdge ? () => onEdge(i) : undefined;
        if (e.a === e.b) {
          // a loop, drawn on the side of the vertex facing away from the middle of the board
          const t = Math.atan2(a.y - g.height / 2, a.x - g.width / 2);
          const ux = Math.cos(t),
            uy = Math.sin(t),
            vx = -uy,
            vy = ux;
          const pt = (k: number, m: number) =>
            `${a.x + ux * k + vx * m} ${a.y + uy * k + vy * m}`;
          const d = `M ${pt(R * 0.8, -R * 0.6)} C ${pt(R * 3.2, -R * 1.7)}, ${pt(R * 3.2, R * 1.7)}, ${pt(R + 3, R * 0.45)}`;
          return (
            <g key={i} className={cls} onClick={click}>
              <path d={d} fill="none" markerEnd={marker} />
            </g>
          );
        }
        // parallel (or opposite) edges between the same two vertices bend apart
        const same = g.edges
          .map((x, k) => [x, k] as const)
          .filter(
            ([x]) =>
              (x.a === e.a && x.b === e.b) || (x.a === e.b && x.b === e.a),
          );
        const k = same.findIndex(([, idx]) => idx === i);
        const lo = e.a < e.b ? a : b,
          hi = e.a < e.b ? b : a;
        const nx = -(hi.y - lo.y),
          ny = hi.x - lo.x,
          nl = Math.hypot(nx, ny) || 1;
        const off = (k - (same.length - 1) / 2) * 44;
        const cx = (a.x + b.x) / 2 + (nx / nl) * off,
          cy = (a.y + b.y) / 2 + (ny / nl) * off;
        const dx = b.x - cx,
          dy = b.y - cy,
          len = Math.hypot(dx, dy) || 1;
        const x2 = g.directed ? b.x - (dx / len) * (R + 3) : b.x;
        const y2 = g.directed ? b.y - (dy / len) * (R + 3) : b.y;
        const mx = (a.x + 2 * cx + b.x) / 4,
          my = (a.y + 2 * cy + b.y) / 4;
        const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${x2} ${y2}`;
        return (
          <g key={i} className={cls} onClick={click}>
            {onEdge && <path d={d} fill="none" className="pz-hit" />}
            <path d={d} fill="none" markerEnd={marker} />
            {e.w !== undefined && (
              <g className="pz-weight">
                <rect x={mx - 11} y={my - 9} width={22} height={18} rx={5} />
                <text x={mx} y={my + 4}>
                  {e.w}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {g.nodes.map((n, i) => {
        const b = badge?.(i);
        return (
          <g
            key={i}
            className={`pz-node n-${look(i)} ${onNode ? "clickable" : ""}`}
            onClick={onNode ? () => onNode(i) : undefined}
            role={onNode ? "button" : undefined}
            aria-label={onNode ? `Vertex ${n.label}` : undefined}
          >
            <circle cx={n.x} cy={n.y} r={R} />
            <text x={n.x} y={n.y + 4}>
              {n.label}
            </text>
            {b && (
              <g className="pz-badge">
                <circle cx={n.x + R - 2} cy={n.y - R + 2} r={8} />
                <text x={n.x + R - 2} y={n.y - R + 5}>
                  {b}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------- Click in order ----------

function OrderBoard({ pz, done, hint, finish }: BoardProps<OrderPuzzle>) {
  const [picks, setPicks] = useState<number[]>(pz.given);
  const [wrong, setWrong] = useState<number | null>(null);
  const next = picks.length < pz.length ? pz.next(picks) : null;

  const click = (i: number) => {
    if (done) return;
    const why = pz.check(picks, i);
    const names = (list: number[]) =>
      list.map((x, k) => pz.name(x, list.slice(0, k)));
    if (why) {
      setWrong(i);
      finish({
        correct: false,
        given: [...names(picks), `✗ ${pz.name(i, picks)}`].join(" → "),
        misconception: why,
      });
      return;
    }
    const after = [...picks, i];
    setPicks(after);
    if (after.length === pz.length)
      finish({ correct: true, given: names(after).join(" → ") });
  };

  const sequence = (
    <div className="puzzle-sequence" aria-live="polite">
      <span>Your order:</span>{" "}
      {picks.length
        ? picks.map((x, k) => pz.name(x, picks.slice(0, k))).join(" → ")
        : "nothing yet"}
      {!pz.hideCount && (
        <small>
          {" "}
          ({Math.min(picks.length, pz.length)}/{pz.length})
        </small>
      )}
    </div>
  );

  const head = (
    <>
      <Lines lines={pz.lines} />
      {pz.step && !done && <p className="puzzle-step">{pz.step(picks)}</p>}
    </>
  );

  if (pz.board.kind === "cells") {
    const st = pz.cells
      ? pz.cells(picks)
      : { values: pz.board.values, captions: pz.board.captions };
    return (
      <>
        {head}
        <CellsRow
          values={st.values}
          captions={st.captions ?? pz.board.captions}
          marks={st.marks}
          look={(i) =>
            wrong === i ? "wrong" : hint && next === i && !done ? "hint" : ""
          }
          onCell={done ? undefined : click}
        />
        {sequence}
      </>
    );
  }

  if (pz.board.kind === "bars") {
    const st = pz.bars ? pz.bars(picks) : { values: pz.board.values, fixed: 0 };
    const max = Math.max(...st.values);
    return (
      <>
        {head}
        <div className="puzzle-bars">
          {st.values.map((v, i) => {
            const cls =
              i < st.fixed
                ? "fixed"
                : wrong === i
                  ? "wrong"
                  : hint && next === i && !done
                    ? "hint"
                    : "";
            return (
              <button
                key={i}
                className={`pz-bar ${cls}`}
                disabled={done || i < st.fixed}
                onClick={() => click(i)}
                aria-label={`Bar ${v}`}
              >
                <i style={{ height: `${(v / max) * 100}%` }} />
                <span>{v}</span>
              </button>
            );
          })}
        </div>
        {sequence}
      </>
    );
  }

  const g = pz.board;
  const isEdge = pz.pick === "edge";
  const order = new Map(picks.map((x, k) => [x, k + 1]));
  return (
    <>
      {head}
      <GraphSvg
        g={g}
        look={(i) =>
          isEdge
            ? "idle"
            : wrong === i
              ? "wrong"
              : pz.given.includes(i) && picks.length === pz.given.length
                ? "start"
                : order.has(i)
                  ? i === picks[picks.length - 1]
                    ? "current"
                    : "visited"
                  : hint && next === i && !done
                    ? "hint"
                    : "idle"
        }
        badge={
          isEdge
            ? undefined
            : (i) => (order.has(i) ? String(order.get(i)) : null)
        }
        edgeLook={
          isEdge
            ? (i) =>
                order.has(i)
                  ? "on"
                  : wrong === i
                    ? "wrong"
                    : hint && next === i && !done
                      ? "hint"
                      : "idle"
            : undefined
        }
        onNode={!isEdge && !done ? click : undefined}
        onEdge={isEdge && !done ? click : undefined}
      />
      {sequence}
    </>
  );
}

// ---------- Hamiltonian cycle (backtracking) ----------

function CycleBoard({ pz, done, hint, finish }: BoardProps<CyclePuzzle>) {
  const g = pz.board;
  const n = g.nodes.length;
  const [path, setPath] = useState<number[]>([pz.start]);
  const [note, setNote] = useState<string | null>(null);
  const [backs, setBacks] = useState(0);
  const adj = (a: number, b: number) =>
    g.edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const last = path[path.length - 1];
  const L = (i: number) => g.nodes[i].label;
  const weight = (a: number, b: number) =>
    g.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))
      ?.w ?? 0;
  const cost = (list: number[]) =>
    list.slice(1).reduce((t, v, k) => t + weight(list[k], v), 0);

  // The hint follows the stored solution (either direction) while the path still matches it.
  const sol = pz.solution.slice(0, -1);
  const rev = [sol[0], ...sol.slice(1).reverse()];
  const along = [sol, rev].find((s) => path.every((v, k) => s[k] === v));
  const hintNode =
    path.length === n ? pz.start : along ? along[path.length] : null;

  const click = (i: number) => {
    if (done) return;
    setNote(null);
    if (i === last && path.length > 1) {
      setPath(path.slice(0, -1));
      setBacks((b) => b + 1);
      return;
    }
    if (!adj(last, i)) {
      setNote(`${L(last)} and ${L(i)} aren't joined by an edge.`);
      return;
    }
    if (i === pz.start) {
      if (path.length === n) {
        const tour = [...path, i];
        const total = cost(tour);
        const given = `${tour.map(L).join(" → ")}${pz.best !== undefined ? ` (${total})` : ""}`;
        finish(
          pz.best !== undefined && total > pz.best
            ? {
                correct: false,
                given,
                misconception: `Found a tour of total ${total}, but a shorter one (${pz.best}) exists`,
              }
            : { correct: true, given },
        );
      } else setNote(`Visit all ${n} vertices before coming back to ${L(i)}.`);
      return;
    }
    if (path.includes(i)) {
      setNote(`${L(i)} is already on your path. Each vertex is visited once.`);
      return;
    }
    const after = [...path, i];
    setPath(after);
    const stuck =
      after.length < n
        ? !g.nodes.some((_, v) => !after.includes(v) && adj(i, v))
        : !adj(i, pz.start);
    if (stuck)
      setNote(
        `Dead end at ${L(i)}. Click ${L(i)} to step back and try another way.`,
      );
  };

  const pos = new Map(path.map((v, k) => [v, k + 1]));
  const onPath = new Set(
    path
      .slice(1)
      .map((v, k) => `${Math.min(v, path[k])}-${Math.max(v, path[k])}`),
  );
  return (
    <>
      <GraphSvg
        g={g}
        look={(i) =>
          i === last
            ? "current"
            : i === pz.start
              ? "start"
              : pos.has(i)
                ? "visited"
                : hint && hintNode === i && !done
                  ? "hint"
                  : "idle"
        }
        badge={(i) => (pos.has(i) ? String(pos.get(i)) : null)}
        edgeLook={(k) =>
          onPath.has(`${g.edges[k].a}-${g.edges[k].b}`) ? "on" : "idle"
        }
        onNode={done ? undefined : click}
      />
      <div className="puzzle-sequence" aria-live="polite">
        <span>Path:</span> {path.map(L).join(" → ")}{" "}
        <small>
          ({path.length}/{n} · {backs} step{backs === 1 ? "" : "s"} back
          {pz.best !== undefined ? ` · length so far ${cost(path)}` : ""})
        </small>
      </div>
      {note && <p className="puzzle-note">{note}</p>}
      {hint && !done && !along && path.length < n && (
        <p className="puzzle-note">
          Your path has left every known cycle: step back until a new branch
          opens.
        </p>
      )}
    </>
  );
}

// ---------- N-Queens ----------

function QueensBoard({ pz, done, hint, finish }: BoardProps<QueensPuzzle>) {
  const [queens, setQueens] = useState<Vec[]>([]);
  const has = (r: number, c: number) =>
    queens.some(([a, b]) => a === r && b === c);
  const attacked = (r: number, c: number) =>
    queens.some(
      ([a, b]) =>
        !(a === r && b === c) &&
        (a === r || b === c || Math.abs(a - r) === Math.abs(b - c)),
    );
  const toggle = (r: number, c: number) => {
    if (done) return;
    setQueens(
      has(r, c)
        ? queens.filter(([a, b]) => !(a === r && b === c))
        : [...queens, [r, c]],
    );
  };
  const check = () => {
    const why = pz.check(queens);
    const given = [...queens]
      .sort((x, y) => x[0] - y[0])
      .map(([r, c]) => `${String.fromCharCode(97 + c)}${pz.n - r}`)
      .join(" ");
    finish(
      why
        ? { correct: false, given, misconception: why }
        : { correct: true, given },
    );
  };
  return (
    <>
      <div
        className="puzzle-grid queens"
        style={{ gridTemplateColumns: `repeat(${pz.n}, 1fr)` }}
      >
        {Array.from({ length: pz.n * pz.n }, (_, k) => {
          const r = Math.floor(k / pz.n),
            c = k % pz.n;
          const q = has(r, c);
          const cls = [
            (r + c) % 2 ? "dark" : "light",
            q ? "queen" : "",
            q && attacked(r, c) ? "clash" : "",
            hint && !q && attacked(r, c) ? "attacked" : "",
            done && pz.solution[r] === c && !q ? "answer" : "",
          ].join(" ");
          return (
            <button
              key={k}
              className={`pz-cell ${cls}`}
              disabled={done}
              onClick={() => toggle(r, c)}
              aria-label={`Row ${r + 1}, column ${c + 1}${q ? ", queen" : ""}`}
            >
              {q ? "♛" : ""}
            </button>
          );
        })}
      </div>
      <div className="puzzle-sequence">
        <span>Queens placed:</span> {queens.length}/{pz.n}
        {hint && !done && <small> · shaded squares are attacked</small>}
      </div>
      {!done && (
        <div className="step-controls">
          <button
            className="btn btn-primary"
            disabled={queens.length !== pz.n}
            onClick={check}
          >
            <Check size={14} /> Check board
          </button>
        </div>
      )}
    </>
  );
}

// ---------- Maze ----------

function MazeBoard({ pz, done, hint, finish }: BoardProps<MazePuzzle>) {
  const [path, setPath] = useState<Vec[]>([pz.start]);
  const [backs, setBacks] = useState(0);
  const at = path[path.length - 1];
  const idx = (r: number, c: number) =>
    path.findIndex(([a, b]) => a === r && b === c);
  const onSolution = path.every(
    ([r, c], k) => pz.solution[k]?.[0] === r && pz.solution[k]?.[1] === c,
  );
  const hintCell = onSolution ? pz.solution[path.length] : null;

  const click = (r: number, c: number) => {
    if (done || !pz.open[r][c]) return;
    const k = idx(r, c);
    if (k >= 0) {
      if (k < path.length - 1) {
        setPath(path.slice(0, k + 1));
        setBacks((b) => b + 1);
      }
      return;
    }
    if (Math.abs(at[0] - r) + Math.abs(at[1] - c) !== 1) return;
    const after: Vec[] = [...path, [r, c]];
    setPath(after);
    if (r === pz.end[0] && c === pz.end[1])
      finish({
        correct: true,
        given: `${after.length - 1} steps, ${backs} back-ups`,
      });
  };

  return (
    <>
      <div
        className="puzzle-grid maze"
        style={{ gridTemplateColumns: `repeat(${pz.size}, 1fr)` }}
      >
        {pz.open.flatMap((row, r) =>
          row.map((open, c) => {
            const k = idx(r, c);
            const cls = !open
              ? "wall"
              : r === pz.start[0] && c === pz.start[1]
                ? "start"
                : r === pz.end[0] && c === pz.end[1]
                  ? "end"
                  : k >= 0
                    ? k === path.length - 1
                      ? "current"
                      : "trail"
                    : (hint && hintCell?.[0] === r && hintCell?.[1] === c) ||
                        (done &&
                          pz.solution.some(([a, b]) => a === r && b === c))
                      ? "hint"
                      : "open";
            return (
              <button
                key={`${r}-${c}`}
                className={`pz-cell ${cls} ${k === path.length - 1 ? "here" : ""}`}
                disabled={!open || done}
                onClick={() => click(r, c)}
                aria-label={open ? `Square ${r + 1}, ${c + 1}` : "Wall"}
              />
            );
          }),
        )}
      </div>
      <div className="puzzle-sequence">
        <span>Steps:</span> {path.length - 1}{" "}
        <small>
          ({backs} back-up{backs === 1 ? "" : "s"})
        </small>
        {hint && !done && !onSolution && (
          <small> · you've left the route: back up to the last junction</small>
        )}
      </div>
    </>
  );
}

// ---------- Tower of Hanoi ----------

function HanoiBoard({ pz, done, hint, finish }: BoardProps<HanoiPuzzle>) {
  const [pegs, setPegs] = useState<Pegs>(() => hanoiStart(pz.disks));
  const [lifted, setLifted] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const best = hanoiBest(pegs);

  const click = (i: number) => {
    if (done) return;
    setNote(null);
    if (lifted === null) {
      if (pegs[i].length) setLifted(i);
      return;
    }
    if (lifted === i) {
      setLifted(null);
      return;
    }
    if (!hanoiLegal(pegs, lifted, i)) {
      setNote("A disk can't go on top of a smaller one.");
      setLifted(null);
      return;
    }
    const after = hanoiMove(pegs, lifted, i);
    const m = moves + 1;
    setPegs(after);
    setMoves(m);
    setLifted(null);
    if (after[2].length === pz.disks)
      finish(
        m === pz.min
          ? { correct: true, given: `${m} moves` }
          : {
              correct: false,
              given: `${m} moves`,
              misconception: `Took ${m} moves; the fewest possible is ${pz.min}`,
            },
      );
  };

  return (
    <>
      <div className="puzzle-hanoi">
        {pegs.map((stack, i) => (
          <button
            key={i}
            className={`pz-peg ${lifted === i ? "lifted" : ""} ${
              hint &&
              !done &&
              best &&
              (lifted === null ? best[0] === i : best[1] === i)
                ? "hint"
                : ""
            }`}
            disabled={done}
            onClick={() => click(i)}
            aria-label={`Peg ${"ABC"[i]}, ${stack.length} disks`}
          >
            <span className="pz-pole" />
            <span className="pz-stack">
              {stack.map((d, k) => (
                <i
                  key={d}
                  className={lifted === i && k === stack.length - 1 ? "up" : ""}
                  style={{ width: `${30 + (d / pz.disks) * 65}%` }}
                />
              ))}
            </span>
            <b>{"ABC"[i]}</b>
          </button>
        ))}
      </div>
      <div className="puzzle-sequence">
        <span>Moves:</span> {moves} <small>(fewest possible: {pz.min})</small>
        {hint && !done && best && (
          <small>
            {" "}
            · next: {"ABC"[best[0]]} → {"ABC"[best[1]]}
          </small>
        )}
      </div>
      {note && <p className="puzzle-note">{note}</p>}
    </>
  );
}

// ---------- Vector grid ----------

const TONE = { cyan: "#67d9ff", violet: "#b8a5ff", gold: "#f4c56a" };

function PlaneBoard({ pz, done, hint, finish }: BoardProps<PlanePuzzle>) {
  const [hover, setHover] = useState<Vec | null>(null);
  const [chosen, setChosen] = useState<Vec | null>(null);
  const R = pz.range,
    S = 26,
    size = 2 * R * S + 40,
    o = size / 2;
  const X = (x: number) => o + x * S,
    Y = (y: number) => o - y * S;
  const snap = (e: React.MouseEvent<SVGSVGElement>): Vec | null => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.round((((e.clientX - box.left) / box.width) * size - o) / S);
    const y = Math.round((o - ((e.clientY - box.top) / box.height) * size) / S);
    return Math.abs(x) <= R && Math.abs(y) <= R ? [x, y] : null;
  };
  const arrow = (v: Vec, color: string, label?: string, dashed = false) => (
    <g key={`${v}-${label}-${color}`}>
      <line
        x1={X(0)}
        y1={Y(0)}
        x2={X(v[0])}
        y2={Y(v[1])}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={dashed ? "5 4" : undefined}
        markerEnd={`url(#pz-head-${color.slice(1)})`}
      />
      {label && (
        <text
          x={X(v[0]) + 8}
          y={Y(v[1]) - 6}
          fill={color}
          className="pz-vlabel"
        >
          {label}
        </text>
      )}
    </g>
  );
  const click = (pt: Vec | null) => {
    if (done || !pt) return;
    setChosen(pt);
    const why = pz.check(pt);
    const given = `(${pt[0]}, ${pt[1]})`;
    finish(
      why
        ? { correct: false, given, misconception: why }
        : { correct: true, given },
    );
  };
  const colors = [
    "#67d9ff",
    "#b8a5ff",
    "#f4c56a",
    "#64e0b4",
    "#ff8b9a",
    "#e9fbff",
  ];
  const raw =
    hint && hover && pz.preview && !done && (hover[0] || hover[1])
      ? pz.preview(hover)
      : null;
  // Keep the A·x arrow on the grid: shrink it (same direction) when it is too long.
  const over = raw ? Math.max(Math.abs(raw[0]), Math.abs(raw[1])) / R : 0;
  const preview: Vec | null =
    raw && over > 1 ? [raw[0] / over, raw[1] / over] : raw;

  return (
    <div className="puzzle-plane">
      <svg
        className="puzzle-svg plane"
        viewBox={`0 0 ${size} ${size}`}
        onMouseMove={(e) => setHover(snap(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => click(snap(e))}
        role="img"
        aria-label="Coordinate grid: click a point"
      >
        <defs>
          {colors.map((c) => (
            <marker
              key={c}
              id={`pz-head-${c.slice(1)}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
        </defs>
        {Array.from({ length: 2 * R + 1 }, (_, k) => k - R).map((t) => (
          <g key={t} className={t === 0 ? "pz-axis" : "pz-gridline"}>
            <line x1={X(-R)} y1={Y(t)} x2={X(R)} y2={Y(t)} />
            <line x1={X(t)} y1={Y(-R)} x2={X(t)} y2={Y(R)} />
          </g>
        ))}
        {(pz.lines ?? []).map((d, k) => {
          const m = (2 * R) / Math.max(Math.abs(d[0]), Math.abs(d[1]), 1e-9);
          return (
            <line
              key={k}
              className="pz-dirline"
              x1={X(-d[0] * m)}
              y1={Y(-d[1] * m)}
              x2={X(d[0] * m)}
              y2={Y(d[1] * m)}
            />
          );
        })}
        {(pz.offsetLines ?? []).map(({ p, d }, k) => {
          const m = (4 * R) / Math.max(Math.abs(d[0]), Math.abs(d[1]), 1e-9);
          return (
            <line
              key={`o${k}`}
              className="pz-dirline"
              x1={X(p[0] - d[0] * m)}
              y1={Y(p[1] - d[1] * m)}
              x2={X(p[0] + d[0] * m)}
              y2={Y(p[1] + d[1] * m)}
            />
          );
        })}
        {pz.axes && (
          <g className="pz-axisname">
            <text x={X(R) - 4} y={Y(0) - 6} textAnchor="end">
              {pz.axes[0]}
            </text>
            <text x={X(0) + 6} y={Y(R) + 12}>
              {pz.axes[1]}
            </text>
          </g>
        )}
        {pz.vectors.map((v) => arrow(v.v, TONE[v.tone], v.label))}
        {hint &&
          !done &&
          (pz.hintVectors ?? []).map((v) =>
            arrow(v.v, TONE[v.tone], v.label, true),
          )}
        {preview && hover && arrow(hover, "#e9fbff", "x")}
        {preview &&
          arrow(preview, "#64e0b4", over > 1 ? "A·x (scaled)" : "A·x", true)}
        {hover && !done && (
          <circle
            className="pz-hover"
            cx={X(hover[0])}
            cy={Y(hover[1])}
            r={6}
          />
        )}
        {chosen && (
          <circle
            className={`pz-pick ${done && pz.check(chosen) ? "bad" : "ok"}`}
            cx={X(chosen[0])}
            cy={Y(chosen[1])}
            r={7}
          />
        )}
        {done && chosen && pz.check(chosen) && (
          <circle
            className="pz-pick ok"
            cx={X(pz.answer[0])}
            cy={Y(pz.answer[1])}
            r={7}
          />
        )}
      </svg>
      <div className="puzzle-side">
        {pz.matrix && (
          <div className="pz-matrix" aria-label="Matrix A">
            <span>A =</span>
            <table>
              <tbody>
                {pz.matrix.map((row, k) => (
                  <tr key={k}>
                    {row.map((x, j) => (
                      <td key={j}>{x}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ul className="pz-legend">
          {pz.vectors.map((v) => (
            <li key={v.label}>
              <i style={{ background: TONE[v.tone] }} />
              {v.label} = ({v.v[0]}, {v.v[1]})
            </li>
          ))}
        </ul>
        <p className="puzzle-note">
          {hover
            ? `Pointer at (${hover[0]}, ${hover[1]})`
            : "Hover the grid, then click a point."}
        </p>
      </div>
    </div>
  );
}

// ---------- Choose a set ----------

function SelectBoard({ pz, done, hint, finish }: BoardProps<SelectPuzzle>) {
  const [chosen, setChosen] = useState<number[]>([]);
  const toggle = (i: number) => {
    if (done) return;
    setChosen(
      chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i],
    );
  };
  const b = pz.board;
  const label = (i: number) =>
    b.kind === "graph"
      ? pz.pick === "edge"
        ? `${b.nodes[b.edges[i].a].label}–${b.nodes[b.edges[i].b].label}`
        : b.nodes[i].label
      : b.kind === "grid"
        ? `${b.rowHeads[Math.floor(i / b.cols)]}${b.colHeads[i % b.cols]}`
        : b.values[i];
  const check = () => {
    const why = pz.check(chosen);
    const given =
      [...chosen]
        .sort((x, y) => x - y)
        .map(label)
        .join(", ") || "nothing";
    finish(
      why
        ? { correct: false, given, misconception: why }
        : { correct: true, given },
    );
  };
  // after a wrong answer, outline one correct choice
  const showAnswer = done && pz.check(chosen) !== null;
  const inAnswer = (i: number) => showAnswer && pz.answer.includes(i);
  const isOn = (i: number) => chosen.includes(i);

  let board: ReactNode;
  if (b.kind === "graph") {
    const marked = new Set(pz.marked ?? []);
    board = (
      <GraphSvg
        g={b}
        look={(i) =>
          pz.pick === "node" && isOn(i)
            ? "current"
            : pz.pick === "node" && inAnswer(i)
              ? "hint"
              : marked.has(i)
                ? "start"
                : "idle"
        }
        edgeLook={
          pz.pick === "edge"
            ? (i) => (isOn(i) ? "on" : inAnswer(i) ? "hint" : "idle")
            : undefined
        }
        onNode={pz.pick === "node" && !done ? toggle : undefined}
        onEdge={pz.pick === "edge" && !done ? toggle : undefined}
      />
    );
  } else if (b.kind === "grid") {
    board = (
      <div className="puzzle-matrix-wrap">
        {pz.show && <GraphSvg g={pz.show} look={() => "idle"} />}
        <table className="puzzle-matrix">
          <thead>
            <tr>
              <th />
              {b.colHeads.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rowHeads.map((rh, r) => (
              <tr key={rh}>
                <th>{rh}</th>
                {b.colHeads.map((_, c) => {
                  const i = r * b.cols + c;
                  return (
                    <td key={c}>
                      <button
                        className={`pz-bit ${isOn(i) ? "on" : ""} ${inAnswer(i) ? "answer" : ""}`}
                        disabled={done}
                        onClick={() => toggle(i)}
                        aria-label={`Row ${rh}, column ${b.colHeads[c]}: ${isOn(i) ? 1 : 0}`}
                      >
                        {isOn(i) ? 1 : 0}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    const marked = new Set(pz.marked ?? []);
    board = (
      <CellsRow
        values={b.values}
        captions={b.captions?.map((c, i) =>
          c === "" ? (isOn(i) ? "true" : "false") : c,
        )}
        look={(i) =>
          isOn(i)
            ? "chosen"
            : inAnswer(i)
              ? "hint"
              : marked.has(i)
                ? "fixed"
                : ""
        }
        onCell={done ? undefined : toggle}
      />
    );
  }

  return (
    <>
      <Lines lines={pz.lines} />
      {board}
      {pz.status && <Status lines={pz.status(chosen)} />}
      <div className="puzzle-sequence">
        <span>Chosen:</span>{" "}
        {chosen.length
          ? [...chosen]
              .sort((x, y) => x - y)
              .map(label)
              .join(", ")
          : "nothing yet"}
        {hint && !done && <small> · click again to unselect</small>}
      </div>
      {showAnswer && (
        <p className="puzzle-note">Dashed outlines show one correct answer.</p>
      )}
      {!done && (
        <div className="step-controls">
          <button className="btn btn-primary" onClick={check}>
            <Check size={14} /> Check
          </button>
        </div>
      )}
    </>
  );
}

// ---------- Fill in a table ----------

function TableBoard({ pz, done, finish }: BoardProps<TablePuzzle>) {
  const [text, setText] = useState<string[][]>(() =>
    pz.cells.map((row) => row.map(() => "")),
  );
  const [wrong, setWrong] = useState<Vec[] | null>(null);
  const blanks = pz.cells.flatMap((row, r) =>
    row.flatMap((c, k) => (c === null ? [[r, k] as Vec] : [])),
  );
  const filled = blanks.every(([r, c]) => !Number.isNaN(parseNum(text[r][c])));
  const check = () => {
    const values = text.map((row) =>
      row.map((t) => (t.trim() ? parseNum(t) : null)),
    );
    const res = gradeTable(pz, values);
    setWrong(res.wrong);
    const given = blanks
      .map(([r, c]) => text[r][c].trim())
      .join(" ")
      .slice(0, 200);
    finish(
      res.wrong.length
        ? {
            correct: false,
            given,
            misconception:
              res.why ??
              `${res.wrong.length} of ${blanks.length} value${blanks.length === 1 ? " is" : "s are"} wrong`,
          }
        : { correct: true, given },
    );
  };
  const shownWrong =
    wrong ??
    (done
      ? gradeTable(
          pz,
          text.map((row) => row.map((t) => (t.trim() ? parseNum(t) : null))),
        ).wrong
      : null);
  const isWrong = (r: number, c: number) =>
    !!shownWrong?.some(([a, b]) => a === r && b === c);
  return (
    <>
      <Lines lines={pz.lines} />
      {pz.show && <GraphSvg g={pz.show} look={() => "idle"} />}
      <div className="puzzle-table-wrap">
        <table className="puzzle-table">
          {pz.colHeads && (
            <thead>
              <tr>
                {pz.rowHeads && <th>{pz.corner ?? ""}</th>}
                {pz.colHeads.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {pz.cells.map((row, r) => (
              <tr key={r}>
                {pz.rowHeads && <th>{pz.rowHeads[r]}</th>}
                {row.map((cell, c) =>
                  cell !== null ? (
                    <td key={c} className={cell === "" ? "empty" : "given"}>
                      {cell}
                    </td>
                  ) : (
                    <td
                      key={c}
                      className={`blank ${isWrong(r, c) ? "wrong" : wrong ? "right" : ""}`}
                    >
                      <input
                        inputMode="decimal"
                        aria-label={`${pz.rowHeads?.[r] ?? `row ${r + 1}`}, ${pz.colHeads?.[c] ?? `column ${c + 1}`}`}
                        value={text[r][c]}
                        disabled={done}
                        onChange={(e) =>
                          setText(
                            text.map((rw, i) =>
                              i === r
                                ? rw.map((t, j) =>
                                    j === c ? e.target.value : t,
                                  )
                                : rw,
                            ),
                          )
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && filled && !done && check()
                        }
                      />
                      {done && isWrong(r, c) && (
                        <small>{fmtNum(pz.answers[r][c]!)}</small>
                      )}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="puzzle-sequence">
        <span>Filled:</span>{" "}
        {blanks.filter(([r, c]) => text[r][c].trim()).length}/{blanks.length}
        <small> · whole numbers, decimals or fractions like 3/4</small>
      </div>
      {done && shownWrong?.length ? (
        <p className="puzzle-note">
          Red cells were wrong; the small number underneath is the right value.
        </p>
      ) : null}
      {!done && (
        <div className="step-controls">
          <button
            className="btn btn-primary"
            disabled={!filled}
            onClick={check}
          >
            <Check size={14} /> Check table
          </button>
        </div>
      )}
    </>
  );
}
