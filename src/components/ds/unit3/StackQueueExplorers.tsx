import { useMemo, useState } from "react";
import { Braces, Layers, ListOrdered, Route, TowerControl } from "lucide-react";
import { hanoiMoves, hanoiState, type Peg } from "../../../domain/ds/recursion";
import {
  dequeue,
  emptyQueue,
  enqueue,
  evalPostfixFrames,
  key,
  queueItems,
  solveMaze,
  toPostfixFrames,
  toPrefix,
  tokenize,
  type QueueKind,
  type QueueState,
} from "../../../domain/ds/stacksQueues";
import {
  DC,
  Explain,
  MemoryRow,
  Panel,
  PlayerBar,
  Stats,
  Tabs,
  usePlayer,
  type StepProps,
} from "../kit";

/* ======================= Stacks ======================= */

const STACK_CAP = 6;

export function StackExplorer({ onSteps }: StepProps) {
  const [items, setItems] = useState<number[]>([12, 7, 31]);
  const [next, setNext] = useState(18);
  const [msg, setMsg] = useState({
    title: "Stack with 3 items",
    text: "TOP is the index of the last pushed item. Push and pop only ever touch the top.",
  });
  const [log, setLog] = useState<string[]>([]);
  const record = (line: string) => {
    setLog((l) => [line, ...l].slice(0, 8));
    onSteps?.(1);
  };
  const push = () => {
    if (items.length === STACK_CAP) {
      setMsg({
        title: "Overflow",
        text: `TOP = MAX − 1 = ${STACK_CAP - 1}: the array is full, so PUSH fails. A linked stack only overflows when memory runs out.`,
      });
      record("push → overflow");
      return;
    }
    setItems([...items, next]);
    setMsg({
      title: `PUSH ${next}`,
      text: `TOP = TOP + 1 = ${items.length}; STACK[TOP] = ${next}. In the linked stack the new node becomes the head.`,
    });
    record(`push ${next}`);
    setNext((v) => ((v * 7 + 13) % 90) + 5);
  };
  const pop = () => {
    if (!items.length) {
      setMsg({
        title: "Underflow",
        text: "TOP = −1: the stack is empty, so POP has nothing to return.",
      });
      record("pop → underflow");
      return;
    }
    const x = items[items.length - 1];
    setItems(items.slice(0, -1));
    setMsg({
      title: `POP → ${x}`,
      text: `Return STACK[TOP] = ${x}, then TOP = TOP − 1 = ${items.length - 2}. In the linked stack, HEAD moves to the next node.`,
    });
    record(`pop → ${x}`);
  };
  const peek = () => {
    setMsg(
      items.length
        ? {
            title: `PEEK → ${items[items.length - 1]}`,
            text: "Read the top item without removing it.",
          }
        : { title: "Empty", text: "Nothing to peek at." },
    );
    record(items.length ? `peek → ${items[items.length - 1]}` : "peek → empty");
  };
  const cells: (number | null)[] = Array.from(
    { length: STACK_CAP },
    (_, i) => items[i] ?? null,
  );
  return (
    <Panel
      kicker="UNIT III · STACKS"
      title="Last in, first out"
      intro="The same stack, stored two ways: an array with a TOP index, and a linked list whose head is the top. Both make PUSH and POP Θ(1)."
      icon={<Layers size={19} />}
    >
      <div className="ds-inputs">
        <label className="u1-select">
          Next value
          <input
            className="u2-small-input ds-tiny"
            type="number"
            value={next}
            onChange={(e) => setNext(Number(e.target.value))}
          />
        </label>
        <button className="btn btn-primary" onClick={push}>
          Push
        </button>
        <button className="btn btn-secondary" onClick={pop}>
          Pop
        </button>
        <button className="btn btn-secondary" onClick={peek}>
          Peek
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setItems([]);
            setMsg({
              title: "Stack cleared",
              text: "TOP = −1 marks an empty stack.",
            });
          }}
        >
          Clear
        </button>
      </div>
      <div className="ds-split">
        <div>
          <small className="ds-label">
            ARRAY REPRESENTATION · MAX = {STACK_CAP}
          </small>
          <div className="ds-vstack">
            {[...cells].reverse().map((v, k) => {
              const i = STACK_CAP - 1 - k;
              return (
                <div
                  key={i}
                  className={`ds-vcell ${v === null ? "empty" : ""} ${i === items.length - 1 ? "top" : ""}`}
                >
                  <i>{i}</i>
                  <b>{v ?? ""}</b>
                  {i === items.length - 1 && <span>← TOP</span>}
                </div>
              );
            })}
            {!items.length && <p className="u1-small">TOP = −1</p>}
          </div>
        </div>
        <div>
          <small className="ds-label">LINKED REPRESENTATION</small>
          <div className="ds-vlinked">
            <span className="ds-ptr-label">TOP</span>
            {[...items].reverse().map((v, k) => (
              <div
                key={`${k}-${v}`}
                className={`ds-vnode ${k === 0 ? "top" : ""}`}
              >
                <b>{v}</b>
                <i>{k < items.length - 1 ? "↓" : "NULL"}</i>
              </div>
            ))}
            {!items.length && <div className="ds-vnode empty">NULL</div>}
          </div>
        </div>
      </div>
      <Explain title={msg.title} text={msg.text} />
      <Stats
        items={[
          { label: "SIZE", value: `${items.length} / ${STACK_CAP}` },
          { label: "TOP", value: items.length - 1 },
          {
            label: "LOG (newest first)",
            value: <span className="u2-log">{log.join(" · ") || "—"}</span>,
          },
        ]}
      />
    </Panel>
  );
}

/* ======================= Tower of Hanoi ======================= */

const diskColors = [
  "#1ea0ca",
  "#1aab80",
  "#b78a28",
  "#ce7b2c",
  "#9582db",
  "#de657a",
  "#5bb6d6",
];

export function HanoiExplorer({ onSteps }: StepProps) {
  const [n, setN] = useState(4);
  const moves = useMemo(() => hanoiMoves(n), [n]);
  const p = usePlayer(moves.length + 1, n, onSteps);
  const pegs = hanoiState(n, moves, p.step);
  const last = p.step > 0 ? moves[p.step - 1] : undefined;
  const W = 600,
    H = 40 + n * 22 + 40,
    base = H - 26;
  const pegX: Record<Peg, number> = { A: 110, B: 300, C: 490 };
  return (
    <Panel
      kicker="UNIT III · TOWER OF HANOI"
      title="Move the tower, one disk at a time"
      intro="Never place a larger disk on a smaller one. To move n disks: move n − 1 out of the way, move the largest, then move the n − 1 back on top."
      icon={<TowerControl size={19} />}
    >
      <div className="u1-controls">
        <label className="u1-select ds-range">
          Disks n = {n}
          <input
            type="range"
            min={1}
            max={7}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="u1-svg"
        style={{ maxWidth: 760 }}
        role="img"
        aria-label={`Pegs: A ${pegs.A.join(",")}, B ${pegs.B.join(",")}, C ${pegs.C.join(",")}`}
      >
        <rect x={20} y={base} width={W - 40} height={8} rx={3} fill="#22344a" />
        {(Object.keys(pegX) as Peg[]).map((pg) => (
          <g key={pg}>
            <rect
              x={pegX[pg] - 4}
              y={30}
              width={8}
              height={base - 30}
              rx={3}
              fill="#2a3b50"
            />
            <text
              x={pegX[pg]}
              y={H - 6}
              textAnchor="middle"
              fontSize="12"
              fill={
                last && (last.from === pg || last.to === pg)
                  ? DC.active
                  : "#8fa3b9"
              }
              fontFamily="DM Mono, monospace"
            >
              {pg}
            </text>
            {pegs[pg].map((d, i) => {
              const w = 30 + d * 20;
              const moved = last && last.disk === d && last.to === pg;
              return (
                <rect
                  key={d}
                  x={pegX[pg] - w / 2}
                  y={base - (i + 1) * 22}
                  width={w}
                  height={18}
                  rx={6}
                  fill={diskColors[(d - 1) % diskColors.length]}
                  stroke={moved ? DC.active : "#0b1420"}
                  strokeWidth={moved ? 3 : 1}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <Explain
        title={
          last
            ? `Move ${p.step}: disk ${last.disk} from ${last.from} to ${last.to}`
            : `Start: ${n} disk${n > 1 ? "s" : ""} on A`
        }
        text={
          last
            ? `This move belongs to a call ${last.depth} level${last.depth === 1 ? "" : "s"} deep in the recursion. Disk 1 moves on every odd-numbered move.`
            : "Goal: move every disk to C, using B as the spare."
        }
      />
      <PlayerBar p={p} label={`Move ${p.step} / ${moves.length}`} />
      <Stats
        items={[
          {
            label: "MOVES",
            value: `${p.step} / ${moves.length}`,
            note: "2ⁿ − 1",
          },
          { label: "RECURRENCE", value: "T(n) = 2T(n − 1) + 1" },
          { label: "64 DISKS AT 1 MOVE/s", value: "≈ 585 billion years" },
        ]}
      />
    </Panel>
  );
}

/* ======================= Queues and deques ======================= */

const Q_CAP = 6;
type QTab = QueueKind | "deque";

export function QueueExplorer({ onSteps }: StepProps) {
  const [tab, setTab] = useState<QTab>("circular");
  const [q, setQ] = useState<QueueState>(() => seed());
  const [next, setNext] = useState(40);
  const [msg, setMsg] = useState({
    title: "CREATE",
    text: "An empty queue: FRONT = 0, REAR = −1.",
  });
  function seed() {
    let s = emptyQueue(Q_CAP);
    for (const x of [10, 20, 30]) s = enqueue(s, x, "circular").state;
    return s;
  }
  const kind: QueueKind = tab === "linear" ? "linear" : "circular";
  const act = (
    title: string,
    r: { state: QueueState; message: string; ok: boolean },
  ) => {
    setQ(r.state);
    setMsg({ title: r.ok ? title : title + " — failed", text: r.message });
    onSteps?.(1);
  };
  const addRear = () => {
    act(`ADD ${next}`, enqueue(q, next, kind));
    setNext((v) => v + 10);
  };
  // Deque operations at the other ends, on the same circular buffer.
  const addFront = () => {
    if (q.count === Q_CAP)
      return act("INSERT-FRONT", {
        state: q,
        ok: false,
        message: "Overflow: every slot is in use.",
      });
    const front = (q.front - 1 + Q_CAP) % Q_CAP;
    const buf = [...q.buf];
    buf[front] = next;
    act(`INSERT-FRONT ${next}`, {
      state: { buf, front, rear: q.count ? q.rear : front, count: q.count + 1 },
      ok: true,
      message: `FRONT = (FRONT − 1 + ${Q_CAP}) mod ${Q_CAP} = ${front}; store ${next}.`,
    });
    setNext((v) => v + 10);
  };
  const deleteRear = () => {
    if (!q.count)
      return act("DELETE-REAR", {
        state: q,
        ok: false,
        message: "Underflow: the deque is empty.",
      });
    const x = q.buf[q.rear];
    const buf = [...q.buf];
    buf[q.rear] = null;
    const rear = (q.rear - 1 + Q_CAP) % Q_CAP;
    act(`DELETE-REAR → ${x}`, {
      state: { buf, front: q.front, rear, count: q.count - 1 },
      ok: true,
      message: `Remove ${x} from REAR; REAR = (REAR − 1 + ${Q_CAP}) mod ${Q_CAP} = ${rear}.`,
    });
  };
  const items = queueItems(q);
  const switchTab = (t: QTab) => {
    setTab(t);
    let s = emptyQueue(Q_CAP);
    for (const x of [10, 20, 30])
      s = enqueue(s, x, t === "linear" ? "linear" : "circular").state;
    setQ(s);
    setMsg({
      title: "Queue with 10, 20, 30",
      text:
        t === "linear"
          ? "Delete a few items, then keep adding: watch REAR hit the end while the front slots sit empty."
          : t === "deque"
            ? "A deque can add and remove at both ends."
            : "Indices wrap around with mod, so freed slots are reused.",
    });
  };
  return (
    <Panel
      kicker="UNIT III · QUEUES"
      title="First in, first out"
      intro="Items join at REAR and leave from FRONT. On a fixed array, a linear queue wastes the slots in front of FRONT; a circular queue wraps around and reuses them."
      icon={<ListOrdered size={19} />}
    >
      <div className="u1-controls">
        <Tabs
          value={tab}
          onChange={switchTab}
          options={[
            { id: "linear", label: "Linear queue" },
            { id: "circular", label: "Circular queue" },
            { id: "deque", label: "Deque" },
          ]}
        />
      </div>
      <div className="ds-inputs">
        <label className="u1-select">
          Next value
          <input
            className="u2-small-input ds-tiny"
            type="number"
            value={next}
            onChange={(e) => setNext(Number(e.target.value))}
          />
        </label>
        <button className="btn btn-primary" onClick={addRear}>
          {tab === "deque" ? "Insert rear" : "Add (enqueue)"}
        </button>
        {tab === "deque" && (
          <button className="btn btn-primary" onClick={addFront}>
            Insert front
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() =>
            act(tab === "deque" ? "DELETE-FRONT" : "DELETE", dequeue(q, kind))
          }
        >
          {tab === "deque" ? "Delete front" : "Delete (dequeue)"}
        </button>
        {tab === "deque" && (
          <button className="btn btn-secondary" onClick={deleteRear}>
            Delete rear
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() =>
            setMsg(
              items.length
                ? {
                    title: `FRONT → ${items[0]}`,
                    text: "Read the front item without removing it.",
                  }
                : { title: "EMPTY → true", text: "count = 0." },
            )
          }
        >
          Front
        </button>
        <button
          className="btn btn-secondary"
          onClick={() =>
            setMsg({
              title: `EMPTY → ${q.count === 0}`,
              text: `The queue holds ${q.count} item(s).`,
            })
          }
        >
          Empty?
        </button>
      </div>
      <div className="ds-split">
        <MemoryRow
          label={`ARRAY (capacity ${Q_CAP})`}
          values={q.buf}
          pointers={
            q.count
              ? { FRONT: q.front, REAR: q.rear }
              : { "FRONT=REAR+1": q.front }
          }
          done={(i) => q.buf[i] !== null}
        />
        {tab !== "linear" && <QueueRing q={q} />}
      </div>
      <Explain title={msg.title} text={msg.text} />
      <Stats
        items={[
          {
            label: "CONTENTS (front → rear)",
            value: items.join(", ") || "empty",
          },
          { label: "COUNT", value: `${q.count} / ${Q_CAP}` },
          {
            label: tab === "linear" ? "WASTED SLOTS" : "WRAP RULE",
            value:
              tab === "linear" ? Math.max(0, q.front) : "i = (i + 1) mod n",
          },
        ]}
      />
    </Panel>
  );
}

function QueueRing({ q }: { q: QueueState }) {
  const n = q.buf.length,
    R = 62,
    c = 90;
  return (
    <svg
      viewBox="0 0 180 180"
      className="u1-svg"
      style={{ maxWidth: 220 }}
      role="img"
      aria-label="Circular queue as a ring"
    >
      {q.buf.map((v, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = c + R * Math.cos(a),
          y = c + R * Math.sin(a);
        const isF = q.count > 0 && i === q.front,
          isR = q.count > 0 && i === q.rear;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={19}
              fill={v === null ? "#0d1521" : "#123a32"}
              stroke={isF ? DC.active : isR ? DC.fresh : DC.edge}
              strokeWidth={isF || isR ? 2.5 : 1.2}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="11"
              fill={DC.text}
            >
              {v ?? ""}
            </text>
            <text
              x={c + (R + 30) * Math.cos(a)}
              y={c + (R + 30) * Math.sin(a) + 3}
              textAnchor="middle"
              fontSize="8"
              fill={isF ? DC.active : isR ? DC.fresh : DC.muted}
              fontFamily="DM Mono, monospace"
            >
              {isF && isR ? "F/R" : isF ? "FRONT" : isR ? "REAR" : i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ======================= Infix, prefix and postfix ======================= */

const presets = [
  "A + B * C",
  "(A + B) * C",
  "A + B * (C - D) / E",
  "A ^ B ^ C",
  "(A - B / C) * (D + E)",
];

export function ExpressionExplorer({ onSteps }: StepProps) {
  const [tab, setTab] = useState<"postfix" | "prefix" | "evaluate">("postfix");
  const [expr, setExpr] = useState(presets[2]);
  const [vals, setVals] = useState<Record<string, number>>({
    A: 6,
    B: 4,
    C: 9,
    D: 3,
    E: 2,
  });
  const tokens = useMemo(() => tokenize(expr), [expr]);
  const conv = useMemo(() => toPostfixFrames(tokens), [tokens]);
  const postfix = conv[conv.length - 1].output;
  const prefix = useMemo(() => toPrefix(tokens), [tokens]);
  const evalFrames = useMemo(
    () => evalPostfixFrames(postfix, vals),
    [postfix, vals],
  );
  const letters = [...new Set(tokens.filter((t) => /^[A-Za-z]$/.test(t)))];
  const total =
    tab === "evaluate"
      ? evalFrames.length
      : tab === "postfix"
        ? conv.length
        : 1;
  const p = usePlayer(total, `${tab}-${expr}-${JSON.stringify(vals)}`, onSteps);
  const cf = conv[Math.min(p.step, conv.length - 1)];
  const ef = evalFrames[Math.min(p.step, evalFrames.length - 1)];
  const reversed = [...tokens]
    .reverse()
    .map((t) => (t === "(" ? ")" : t === ")" ? "(" : t));
  return (
    <Panel
      kicker="UNIT III · STACK APPLICATIONS"
      title="Infix, prefix and postfix"
      intro="Postfix (operators after operands) and prefix (operators before) need no parentheses and no precedence rules to evaluate. A stack converts between them and evaluates them."
      icon={<Braces size={19} />}
    >
      <div className="u1-controls">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { id: "postfix", label: "Infix → postfix" },
            { id: "prefix", label: "Infix → prefix" },
            { id: "evaluate", label: "Evaluate postfix" },
          ]}
        />
      </div>
      <div className="ds-inputs">
        <label className="u1-select ds-wide">
          Infix
          <input
            className="u2-small-input ds-text"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            aria-label="Infix expression"
          />
        </label>
        {presets.map((x) => (
          <button
            key={x}
            className="btn btn-secondary"
            onClick={() => setExpr(x)}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === "postfix" && (
        <>
          <div className="ds-tokens" aria-label="Input tokens">
            {tokens.map((t, i) => (
              <span
                key={i}
                className={`${i === cf.index ? "hi" : ""} ${cf.index !== undefined && i < cf.index ? "done" : ""}`}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="ds-split">
            <MemoryRow
              label="OPERATOR STACK (bottom → top)"
              values={cf.stack.length ? cf.stack : [null]}
              hi={cf.stack.length - 1}
            />
            <MemoryRow
              label="OUTPUT (postfix so far)"
              values={cf.output.length ? cf.output : [null]}
            />
          </div>
          <Explain title={cf.title} text={cf.text} />
          <PlayerBar p={p} />
          <p className="u1-small">
            Precedence: ^ (right-to-left) &gt; * / &gt; + − (left-to-right).
            Postfix: <code className="ds-code">{postfix.join(" ")}</code>
          </p>
        </>
      )}
      {tab === "prefix" && (
        <>
          <ol className="ds-steps">
            <li>
              Reverse the infix and swap ( with ):{" "}
              <code className="ds-code">{reversed.join(" ")}</code>
            </li>
            <li>
              Convert that to postfix (equal-precedence operators stay on the
              stack, except ^):{" "}
              <code className="ds-code">{[...prefix].reverse().join(" ")}</code>
            </li>
            <li>
              Reverse the result to get prefix:{" "}
              <code className="ds-code on">{prefix.join(" ")}</code>
            </li>
          </ol>
          <Stats
            items={[
              { label: "INFIX", value: tokens.join(" ") },
              { label: "PREFIX (Polish)", value: prefix.join(" ") },
              { label: "POSTFIX (reverse Polish)", value: postfix.join(" ") },
            ]}
          />
        </>
      )}
      {tab === "evaluate" && (
        <>
          <div className="ds-inputs">
            {letters.map((l) => (
              <label key={l} className="u1-select">
                {l} =
                <input
                  className="u2-small-input ds-tiny"
                  type="number"
                  value={vals[l] ?? 0}
                  onChange={(e) =>
                    setVals((v) => ({ ...v, [l]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="ds-tokens" aria-label="Postfix tokens">
            {postfix.map((t, i) => (
              <span
                key={i}
                className={`${i === ef?.index ? "hi" : ""} ${ef && i < ef.index ? "done" : ""}`}
              >
                {t}
              </span>
            ))}
          </div>
          {ef && (
            <>
              <MemoryRow
                label="VALUE STACK (bottom → top)"
                values={ef.stack.map((x) =>
                  Number.isInteger(x) ? x : +x.toFixed(2),
                )}
                hi={ef.stack.length - 1}
              />
              <Explain title={ef.title} text={ef.text} />
            </>
          )}
          <PlayerBar p={p} />
        </>
      )}
    </Panel>
  );
}

/* ======================= Maze problem ======================= */

const mazes = {
  open: [
    "S.........",
    "..........",
    "....##....",
    "....##....",
    "..........",
    "..........",
    ".........E",
  ],
  rooms: [
    "S....#....",
    ".###.#.##.",
    ".#.......#",
    ".#.####.#.",
    "...#..#...",
    "##.#.##.#.",
    "...#.....E",
  ],
};

export function MazeExplorer({ onSteps }: StepProps) {
  const [name, setName] = useState<keyof typeof mazes>("open");
  const [grid, setGrid] = useState<string[]>(mazes.open);
  const [mode, setMode] = useState<"stack" | "queue">("stack");
  const frames = useMemo(() => solveMaze(grid, mode), [grid, mode]);
  const other = useMemo(
    () => solveMaze(grid, mode === "stack" ? "queue" : "stack"),
    [grid, mode],
  );
  const p = usePlayer(frames.length, `${grid.join("")}-${mode}`, onSteps);
  const f = frames[p.step];
  const frontier = new Set(f.frontier.map(key));
  const path = new Set((f.path ?? []).map(key));
  const toggle = (r: number, c: number) => {
    const ch = grid[r][c];
    if (ch === "S" || ch === "E") return;
    setGrid((g) =>
      g.map((row, i) =>
        i === r
          ? row.slice(0, c) + (ch === "#" ? "." : "#") + row.slice(c + 1)
          : row,
      ),
    );
  };
  const pathLen = (fr: typeof frames) => {
    const l = fr[fr.length - 1];
    return l.path ? l.path.length - 1 : "none";
  };
  return (
    <Panel
      kicker="UNIT III · MAZE PROBLEM"
      title="Find a way out with a stack or a queue"
      intro="Start at S and look for E. The data structure that holds the cells still to explore decides the search: a stack dives down one corridor, a queue spreads out evenly. Click a cell to add or remove a wall."
      icon={<Route size={19} />}
    >
      <div className="u1-controls">
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            { id: "stack", label: "Stack (backtracking)" },
            { id: "queue", label: "Queue (breadth-first)" },
          ]}
        />
        <Tabs
          value={name}
          onChange={(k) => {
            setName(k);
            setGrid(mazes[k]);
          }}
          options={[
            { id: "open", label: "Open field" },
            { id: "rooms", label: "Rooms" },
          ]}
        />
      </div>
      <div
        className="ds-maze"
        style={{
          gridTemplateColumns: `repeat(${grid[0].length}, minmax(22px, 36px))`,
        }}
      >
        {grid.flatMap((row, r) =>
          [...row].map((ch, c) => {
            const k = `${r},${c}`;
            const cls =
              ch === "#"
                ? "wall"
                : path.has(k)
                  ? "path"
                  : f.current && key(f.current) === k
                    ? "current"
                    : frontier.has(k)
                      ? "frontier"
                      : f.visited.has(k)
                        ? "visited"
                        : "";
            return (
              <button
                key={k}
                className={`${cls} ${ch === "S" ? "start" : ""} ${ch === "E" ? "end" : ""}`}
                onClick={() => toggle(r, c)}
                aria-label={`Cell ${r}, ${c}${ch === "#" ? ", wall" : ""}`}
              >
                {ch === "S" || ch === "E" ? ch : ""}
              </button>
            );
          }),
        )}
      </div>
      <div className="ds-legend">
        <span className="current">current</span>
        <span className="frontier">in the {mode}</span>
        <span className="visited">visited</span>
        <span className="path">path</span>
        <span className="wall">wall</span>
      </div>
      <Explain title={f.title} text={f.text} />
      <PlayerBar p={p} />
      <Stats
        items={[
          {
            label: `CELLS IN THE ${mode.toUpperCase()}`,
            value: f.frontier.length,
          },
          { label: "CELLS VISITED", value: f.visited.size },
          {
            label: "PATH LENGTH: STACK vs QUEUE",
            value: `${mode === "stack" ? pathLen(frames) : pathLen(other)} vs ${mode === "queue" ? pathLen(frames) : pathLen(other)}`,
            note: "the queue's path is always shortest",
          },
        ]}
      />
    </Panel>
  );
}
