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
};

/** Build a board, or null when the type is unknown. */
export function makePuzzle(settings: Settings, seed: number): Puzzle | null {
  const def = PUZZLES[settings.type];
  return def ? def.make(settings, makeRng(seed)) : null;
}
