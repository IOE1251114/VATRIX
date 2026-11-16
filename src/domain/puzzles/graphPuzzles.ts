/* Graph puzzles: BFS and DFS order, topological order, Dijkstra's finishing order, Kruskal's
 * edge order and finding a Hamiltonian cycle. Neighbours are always taken in alphabetical order. */
import {
  arrow,
  connectedEdges,
  int,
  LETTERS,
  neighbours,
  opt,
  ringLayout,
  shuffle,
  type CyclePuzzle,
  type GraphBoard,
  type OrderPuzzle,
  type Rng,
  type Settings,
} from "./core";

const labelsFor = (n: number) => LETTERS.slice(0, n).split("");

function board(
  r: Rng,
  n: number,
  edges: { a: number; b: number; w?: number }[],
  directed = false,
): GraphBoard {
  const pos = ringLayout(r, n);
  const labels = labelsFor(n);
  return {
    kind: "graph",
    nodes: pos.map((p, i) => ({ label: labels[i], ...p })),
    edges,
    directed,
    width: 600,
    height: 340,
  };
}

export function bfsOrder(adj: number[][], s: number): number[] {
  const seen = new Set([s]),
    queue = [s],
    out: number[] = [];
  while (queue.length) {
    const v = queue.shift()!;
    out.push(v);
    for (const w of adj[v])
      if (!seen.has(w)) {
        seen.add(w);
        queue.push(w);
      }
  }
  return out;
}

/** Recursive DFS discovery order, and the vertex each one was discovered from. */
export function dfsOrder(
  adj: number[][],
  s: number,
): { order: number[]; parent: number[] } {
  const seen = new Set<number>(),
    order: number[] = [],
    parent = adj.map(() => -1);
  const go = (v: number) => {
    seen.add(v);
    order.push(v);
    for (const w of adj[v])
      if (!seen.has(w)) {
        parent[w] = v;
        go(w);
      }
  };
  go(s);
  return { order, parent };
}

const reached = (adj: number[][], prefix: number[], p: number) =>
  prefix.some((v) => adj[v].includes(p));

export function bfsPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 7, 4, 10);
  const edges = connectedEdges(r, n, opt(s, "extra", Math.ceil(n / 2), 0, 12));
  const b = board(r, n, edges);
  const start = int(r, 0, n - 1);
  const adj = neighbours(n, edges);
  const order = bfsOrder(adj, start);
  const L = b.nodes.map((x) => x.label);
  return {
    family: "order",
    board: b,
    pick: "node",
    task: `Start at ${L[start]}. Click the vertices in the order breadth-first search visits them.`,
    given: [start],
    length: n,
    check: (prefix, p) => {
      if (p === order[prefix.length]) return null;
      if (prefix.includes(p))
        return "Visited a vertex twice (BFS skips vertices it has already seen)";
      if (!reached(adj, prefix, p))
        return "Jumped to a vertex that no visited vertex leads to yet";
      // The vertex whose neighbours BFS is adding right now (the front of the queue).
      const want = order[prefix.length];
      const front = prefix.find((v) => adj[v].includes(want));
      if (front !== undefined && adj[front].includes(p))
        return `Took ${L[front]}'s neighbours out of alphabetical order`;
      if (adj[prefix[prefix.length - 1]].includes(p))
        return "Went deeper from the newest vertex (depth-first) instead of finishing the current level";
      return "Took vertices out of queue order: finish the oldest vertex's neighbours first, alphabetically";
    },
    next: (prefix) => order[prefix.length],
    name: (p) => L[p],
    explain: `BFS uses a queue: it visits every neighbour of a vertex (alphabetically) before moving one level further. Order: ${arrow(order.map((v) => L[v]))}.`,
  };
}

export function dfsPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 7, 4, 10);
  const edges = connectedEdges(r, n, opt(s, "extra", Math.ceil(n / 2), 0, 12));
  const b = board(r, n, edges);
  const start = int(r, 0, n - 1);
  const adj = neighbours(n, edges);
  const { order, parent } = dfsOrder(adj, start);
  const L = b.nodes.map((x) => x.label);
  return {
    family: "order",
    board: b,
    pick: "node",
    task: `Start at ${L[start]}. Click the vertices in the order depth-first search visits them.`,
    given: [start],
    length: n,
    check: (prefix, p) => {
      const want = order[prefix.length];
      if (p === want) return null;
      if (prefix.includes(p))
        return "Visited a vertex twice (DFS skips vertices it has already seen)";
      if (!reached(adj, prefix, p))
        return "Jumped to a vertex that no visited vertex leads to yet";
      if (adj[parent[want]].includes(p))
        return "Didn't take the alphabetically first unvisited neighbour";
      return "Backed up too early (breadth-first): keep going deeper from the current vertex first";
    },
    next: (prefix) => order[prefix.length],
    name: (p) => L[p],
    explain: `DFS goes as deep as it can (alphabetically first unvisited neighbour), and only backs up at a dead end. Order: ${arrow(order.map((v) => L[v]))}.`,
  };
}

export function topoPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 6, 4, 9);
  const perm = shuffle(
    r,
    Array.from({ length: n }, (_, i) => i),
  );
  const want = Math.min(
    opt(s, "edges", Math.round(n * 1.4), n - 1, 20),
    (n * (n - 1)) / 2,
  );
  const seen = new Set<string>(),
    edges: { a: number; b: number }[] = [];
  // a chain keeps every vertex connected; the rest are random forward edges
  for (let i = 1; i < n; i++) {
    const j = int(r, 0, i - 1);
    seen.add(`${perm[j]}>${perm[i]}`);
    edges.push({ a: perm[j], b: perm[i] });
  }
  let tries = 0;
  while (edges.length < want && tries++ < 500) {
    const i = int(r, 0, n - 1),
      j = int(r, 0, n - 1);
    if (i >= j) continue;
    const k = `${perm[i]}>${perm[j]}`;
    if (seen.has(k)) continue;
    seen.add(k);
    edges.push({ a: perm[i], b: perm[j] });
  }
  const b = board(r, n, edges, true);
  const L = b.nodes.map((x) => x.label);
  const preds = Array.from({ length: n }, (_, v) =>
    edges.filter((e) => e.b === v).map((e) => e.a),
  );
  const ready = (prefix: number[], v: number) =>
    !prefix.includes(v) && preds[v].every((u) => prefix.includes(u));
  const next = (prefix: number[]) => {
    for (let v = 0; v < n; v++) if (ready(prefix, v)) return v;
    return -1;
  };
  const one: number[] = [];
  while (one.length < n) one.push(next(one));
  return {
    family: "order",
    board: b,
    pick: "node",
    task: "Click the vertices in a topological order: every arrow must point from an earlier vertex to a later one.",
    given: [],
    length: n,
    check: (prefix, p) => {
      if (ready(prefix, p)) return null;
      if (prefix.includes(p)) return "Picked a vertex twice";
      const u = preds[p].find((x) => !prefix.includes(x))!;
      return `Picked a vertex that still has an incoming edge (${L[u]} → ${L[p]} comes first)`;
    },
    next,
    name: (p) => L[p],
    explain: `Repeatedly take a vertex with no remaining incoming edges (Kahn's algorithm). Any order where every arrow points forward is correct, for example ${arrow(one.map((v) => L[v]))}.`,
  };
}

export function dijkstraPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 6, 4, 9);
  const edges = connectedEdges(
    r,
    n,
    opt(s, "extra", Math.ceil(n / 2), 0, 12),
  ).map((e) => ({ ...e, w: int(r, 1, 9) }));
  const b = board(r, n, edges);
  const L = b.nodes.map((x) => x.label);
  const start = int(r, 0, n - 1);
  const w = (u: number, v: number) =>
    edges.find((e) => (e.a === u && e.b === v) || (e.a === v && e.b === u))?.w;
  const dist = Array(n).fill(Infinity);
  dist[start] = 0;
  const done = new Set<number>();
  while (done.size < n) {
    let u = -1;
    for (let v = 0; v < n; v++)
      if (!done.has(v) && (u < 0 || dist[v] < dist[u])) u = v;
    done.add(u);
    for (const e of edges) {
      const v = e.a === u ? e.b : e.b === u ? e.a : -1;
      if (v >= 0 && dist[u] + e.w < dist[v]) dist[v] = dist[u] + e.w;
    }
  }
  const remainingMin = (prefix: number[]) =>
    Math.min(...dist.filter((_, v) => !prefix.includes(v)));
  const next = (prefix: number[]) => {
    const m = remainingMin(prefix);
    return dist.findIndex((d, v) => d === m && !prefix.includes(v));
  };
  const order: number[] = [];
  while (order.length < n) order.push(next(order));
  return {
    family: "order",
    board: b,
    pick: "node",
    task: `Start at ${L[start]}. Click the vertices in the order Dijkstra's algorithm finalises them (on a tie, either order is fine).`,
    given: [start],
    length: n,
    check: (prefix, p) => {
      if (prefix.includes(p))
        return "Picked a vertex that is already finalised";
      if (dist[p] === remainingMin(prefix)) return null;
      const last = prefix[prefix.length - 1];
      const fromLast = prefix.length
        ? dist
            .map((_, v) => v)
            .filter((v) => !prefix.includes(v) && w(last, v) !== undefined)
        : [];
      const cheapest = Math.min(...fromLast.map((v) => w(last, v)!));
      if (fromLast.includes(p) && w(last, p) === cheapest)
        return "Followed the cheapest edge from the last vertex instead of the smallest total distance from the start";
      return "Finalised a vertex before one with a smaller distance from the start";
    },
    next,
    name: (p) => L[p],
    explain: `Dijkstra always finalises the unfinished vertex with the smallest distance from the start. Distances from ${L[start]}: ${order.map((v) => `${L[v]} ${dist[v]}`).join(", ")}.`,
  };
}

export function kruskalPuzzle(s: Settings, r: Rng): OrderPuzzle {
  const n = opt(s, "nodes", 6, 4, 9);
  const raw = connectedEdges(
    r,
    n,
    opt(s, "extra", Math.ceil(n / 2) + 1, 1, 12),
  );
  const weights = shuffle(
    r,
    Array.from({ length: raw.length }, (_, i) => i + 1),
  );
  const edges = raw.map((e, i) => ({ ...e, w: weights[i] }));
  const b = board(r, n, edges);
  const L = b.nodes.map((x) => x.label);
  const find = (parent: number[], x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent, parent[x]));
  const sorted = edges.map((_, i) => i).sort((x, y) => edges[x].w - edges[y].w);
  const accepted: number[] = [];
  {
    const parent = Array.from({ length: n }, (_, i) => i);
    for (const i of sorted) {
      const a = find(parent, edges[i].a),
        c = find(parent, edges[i].b);
      if (a !== c) {
        parent[a] = c;
        accepted.push(i);
      }
    }
  }
  const makesCycle = (prefix: number[], p: number) => {
    const parent = Array.from({ length: n }, (_, i) => i);
    for (const i of prefix)
      parent[find(parent, edges[i].a)] = find(parent, edges[i].b);
    return find(parent, edges[p].a) === find(parent, edges[p].b);
  };
  const name = (p: number) => `${L[edges[p].a]}–${L[edges[p].b]}`;
  const total = accepted.reduce((t, i) => t + edges[i].w, 0);
  return {
    family: "order",
    board: b,
    pick: "edge",
    task: "Click the edges in the order Kruskal's algorithm adds them to the minimum spanning tree.",
    given: [],
    length: n - 1,
    check: (prefix, p) => {
      const want = accepted[prefix.length];
      if (p === want) return null;
      if (prefix.includes(p)) return "Picked an edge twice";
      if (makesCycle(prefix, p)) return "Chose an edge that closes a cycle";
      if (edges[p].w > edges[want].w)
        return "Skipped a cheaper edge that doesn't make a cycle";
      return "Added edges out of weight order";
    },
    next: (prefix) => accepted[prefix.length],
    name,
    explain: `Kruskal takes the edges from cheapest to dearest and keeps each one that joins two separate trees: ${accepted.map((i) => `${name(i)} (${edges[i].w})`).join(", ")}. Total weight ${total}.`,
  };
}

export function hamiltonPuzzle(s: Settings, r: Rng): CyclePuzzle {
  const n = opt(s, "nodes", 7, 4, 10);
  const cyc = shuffle(
    r,
    Array.from({ length: n }, (_, i) => i),
  );
  const seen = new Set<string>(),
    edges: { a: number; b: number }[] = [];
  const add = (a: number, c: number) => {
    const k = `${Math.min(a, c)}-${Math.max(a, c)}`;
    if (a === c || seen.has(k)) return;
    seen.add(k);
    edges.push({ a: Math.min(a, c), b: Math.max(a, c) });
  };
  for (let i = 0; i < n; i++) add(cyc[i], cyc[(i + 1) % n]);
  const extra = opt(s, "extra", Math.ceil(n / 2), 0, 12);
  let tries = 0;
  while (edges.length < n + extra && tries++ < 500)
    add(int(r, 0, n - 1), int(r, 0, n - 1));
  const b = board(r, n, shuffle(r, edges));
  const L = b.nodes.map((x) => x.label);
  const start = cyc[0];
  return {
    family: "cycle",
    board: b,
    start,
    task: `Start at ${L[start]}. Visit every vertex exactly once along the edges and come back to ${L[start]}. Stuck? Click your last vertex to step back.`,
    solution: [...cyc, start],
    explain: `Backtracking extends the path one edge at a time and steps back at a dead end. One Hamiltonian cycle: ${arrow([...cyc, start].map((v) => L[v]))}.`,
  };
}
