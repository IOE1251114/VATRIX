/* Every puzzle type a `problems` row can name in its `puzzle` column, e.g. {"type": "bfs"}.
 * makePuzzle builds one board from the settings and a seed (same seed → same board). */
import { makeRng, type Puzzle, type Settings } from "./core";
import {
  bfsPuzzle,
  dfsPuzzle,
  dijkstraPuzzle,
  hamiltonPuzzle,
  kruskalPuzzle,
  topoPuzzle,
} from "./graphPuzzles";
import {
  bstSearchPuzzle,
  hanoiPuzzle,
  mazePuzzle,
  queensPuzzle,
  selectionPuzzle,
  treeOrderPuzzle,
} from "./dsPuzzles";
import {
  combinationPuzzle,
  eigenPuzzle,
  projectionPuzzle,
  transformPuzzle,
} from "./laPuzzles";

import * as daa from "./daaMore";
import * as ds from "./dsMore";
import * as la from "./laMore";

export type { Puzzle, Settings } from "./core";
export { newSeed } from "./core";

type Maker = (s: Settings, r: ReturnType<typeof makeRng>) => Puzzle;

/** Type name → maker, with the settings each one understands (for the README and teachers). */
export const PUZZLES: Record<string, { make: Maker; settings: string }> = {
  bfs: { make: bfsPuzzle, settings: "nodes 4–10 (7), extra 0–12" },
  dfs: { make: dfsPuzzle, settings: "nodes 4–10 (7), extra 0–12" },
  topo: { make: topoPuzzle, settings: "nodes 4–9 (6), edges" },
  dijkstra: { make: dijkstraPuzzle, settings: "nodes 4–9 (6), extra 0–12" },
  kruskal: { make: kruskalPuzzle, settings: "nodes 4–9 (6), extra 1–12" },
  hamiltonian: { make: hamiltonPuzzle, settings: "nodes 4–10 (7), extra 0–12" },
  "tree-order": {
    make: treeOrderPuzzle,
    settings:
      'nodes 4–12 (7), order "preorder" | "inorder" | "postorder" | "level"',
  },
  "bst-search": { make: bstSearchPuzzle, settings: "nodes 4–12 (8)" },
  "selection-sort": { make: selectionPuzzle, settings: "size 4–10 (7)" },
  queens: { make: queensPuzzle, settings: "n 4–8 (6)" },
  maze: { make: mazePuzzle, settings: "size 3–10 (6)" },
  hanoi: { make: (s) => hanoiPuzzle(s), settings: "disks 2–6 (3)" },
  combination: { make: combinationPuzzle, settings: "range 4–8 (6)" },
  transform: { make: transformPuzzle, settings: "range 4–8 (6)" },
  eigenvector: { make: eigenPuzzle, settings: "range 4–8 (6)" },
  projection: { make: projectionPuzzle, settings: "range 4–8 (6)" },
  // Algorithms
  growth: {
    make: daa.growthPuzzle,
    settings: 'count 4–12 (6), set "functions" | "operations"',
  },
  "op-count": { make: daa.ramPuzzle, settings: "program 0–2 (random), n 3–9" },
  "loop-count": { make: daa.loopCountPuzzle, settings: "program 0–3 (random)" },
  "counting-sort": {
    make: daa.countingSortPuzzle,
    settings: "max 3–7 (5), size 5–12 (8)",
  },
  heap: {
    make: daa.heapPuzzle,
    settings:
      'heap "max" | "min", op "insert" | "extract" | "either", nodes 5–14 (9)',
  },
  hashing: {
    make: daa.hashingPuzzle,
    settings: 'probe "linear" | "quadratic", size 7 | 11 | 13, keys',
  },
  "string-match": {
    make: daa.matchingPuzzle,
    settings: "length 10–22 (16), pattern 2–5 (3)",
  },
  "adjacency-matrix": {
    make: daa.adjMatrixPuzzle,
    settings: "nodes 3–7 (5), extra 0–8 (2), directed true | false",
  },
  components: {
    make: daa.componentsPuzzle,
    settings: 'mode "scc" | "cc", nodes 5–10 (8)',
  },
  articulation: {
    make: daa.articulationPuzzle,
    settings: 'find "points" | "bridges", nodes 5–10 (8), extra 0–8 (2)',
  },
  "fractional-knapsack": {
    make: daa.fractionalKnapsackPuzzle,
    settings: "items 3–7 (5)",
  },
  huffman: { make: daa.huffmanPuzzle, settings: "symbols 3–8 (6)" },
  pascal: {
    make: daa.pascalPuzzle,
    settings: "rows 4–10 (7), blanks 2–12 (6)",
  },
  "matrix-chain": { make: daa.matrixChainPuzzle, settings: "matrices 3–5 (4)" },
  lcs: { make: daa.lcsPuzzle, settings: "length 3–6 (5)" },
  knapsack: {
    make: daa.knapsackPuzzle,
    settings: "items 2–4 (3), capacity 4–8 (6)",
  },
  "subset-sum": { make: daa.subsetSumPuzzle, settings: "numbers 4–9 (7)" },
  "np-graph": {
    make: daa.npGraphPuzzle,
    settings:
      'problem "independent-set" | "clique" | "vertex-cover", nodes 5–9 (7)',
  },
  reduction: { make: daa.reductionPuzzle, settings: "nodes 5–9 (7)" },
  sat: { make: daa.satPuzzle, settings: "variables 3–6 (4), clauses 3–8 (5)" },
  tsp: { make: daa.tspPuzzle, settings: "cities 4–6 (5)" },
  // Data structures
  address: {
    make: ds.addressPuzzle,
    settings: 'order "row" | "column", rows 2–8 (4), cols 2–8 (5)',
  },
  "array-shift": {
    make: ds.arrayShiftPuzzle,
    settings: 'op "insert" | "delete" | "either", size 4–10 (7)',
  },
  "binary-search": { make: ds.binarySearchPuzzle, settings: "size 6–16 (13)" },
  "sparse-transpose": {
    make: ds.sparseTransposePuzzle,
    settings: "rows 3–6 (4), cols 3–6 (5), terms 3–7 (5)",
  },
  "recursion-tree": {
    make: ds.recursionTreePuzzle,
    settings: "n 3–5 (random 4–5)",
  },
  "linked-list": {
    make: ds.linkedListPuzzle,
    settings: "nodes 4–9 (6), free 0–4 (2)",
  },
  polynomial: {
    make: ds.polynomialPuzzle,
    settings: 'op "add" | "multiply", degree 1–3 (2)',
  },
  "stack-queue": {
    make: ds.stackQueuePuzzle,
    settings: 'kind "stack" | "queue", pushes 4–9 (6)',
  },
  postfix: { make: ds.postfixPuzzle, settings: "operators 2–6 (4)" },
  "general-tree": {
    make: ds.generalTreePuzzle,
    settings: 'order "preorder" | "postorder", nodes 5–12 (9)',
  },
  trie: { make: ds.triePuzzle, settings: "words 3–9 (6)" },
  merge: { make: ds.mergePuzzle, settings: "size 4–12 (8)" },
  "radix-pass": { make: ds.radixPassPuzzle, settings: "size 5–10 (8)" },
  degrees: { make: ds.degreePuzzle, settings: "nodes 3–6 (4), edges (8)" },
  // Linear algebra
  "zn-inverse": { make: la.znInversePuzzle, settings: "n 5–12 (random)" },
  closure: { make: la.closurePuzzle, settings: "range 5–8 (6)" },
  "cross-product": { make: la.crossProductPuzzle, settings: "range 2–5 (3)" },
  "matrix-coords": { make: la.matrixCoordsPuzzle, settings: "range 3–9 (5)" },
  "poly-coords": { make: la.polyCoordsPuzzle, settings: "—" },
  complex: {
    make: la.complexPuzzle,
    settings: 'op "multiply" | "add", range 5–8 (6)',
  },
  "direct-sum": { make: la.directSumPuzzle, settings: "range 5–8 (6)" },
  "oblique-projection": {
    make: la.obliqueProjectionPuzzle,
    settings: "range 5–8 (6)",
  },
  "rank-nullity": {
    make: la.rankNullityPuzzle,
    settings: "rows 2–4 (3), cols 3–5 (4)",
  },
  inverse: { make: la.inversePuzzle, settings: "size 2–3 (2)" },
  "change-basis": { make: la.changeBasisPuzzle, settings: "—" },
  "dual-basis": { make: la.dualBasisPuzzle, settings: "—" },
  "det-trace": { make: la.detTracePuzzle, settings: "size 2–3 (3)" },
  cayley: { make: la.cayleyPuzzle, settings: "—" },
  diagonalize: { make: la.diagonalizePuzzle, settings: "—" },
  jordan: { make: la.jordanPuzzle, settings: "size 3–8 (6)" },
  norms: { make: la.normsPuzzle, settings: "size 2–3 (3)" },
  orthogonal: { make: la.orthogonalPointPuzzle, settings: "range 4–8 (6)" },
  "gram-schmidt": { make: la.gramSchmidtPuzzle, settings: "range 5–8 (6)" },
  "orthogonal-map": { make: la.orthogonalMapPuzzle, settings: "range 4–8 (5)" },
  bilinear: { make: la.bilinearPuzzle, settings: "—" },
  quadratic: { make: la.quadraticPuzzle, settings: "—" },
};

/** Build a board, or null when the type is unknown. */
export function makePuzzle(settings: Settings, seed: number): Puzzle | null {
  const def = PUZZLES[settings.type];
  return def ? def.make(settings, makeRng(seed)) : null;
}
