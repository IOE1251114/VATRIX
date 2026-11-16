# VATRIX - Visual Algorithm Space

An interactive React + TypeScript + Vite learning space with three live subjects, each a five-unit course: **Design and Analysis of Algorithms** (`/algorithms`), **Data Structures** (`/data-structures`) and **Linear Algebra** (`/linear-algebra`). Every topic has a visualizer, syllabus-referenced theory notes and auto-graded practice, in Explore, Student and Teacher modes.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). To make a production build:

```bash
npm run build
npm run preview
npm test        # runs the domain tests for all three subjects
```

## Database (Supabase)

Without a database, each browser keeps its own progress in localStorage. Connect Supabase and every student's answers, time on task and the teacher's assignments are stored in one shared Postgres database, so the Teacher dashboard sees the whole class on any device — and updates live.

### 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
2. Pick a name (e.g. `vatrix`), set a database password (store it in a password manager — the website never needs it) and choose the region closest to your students. Wait about a minute for it to start.

### 2. Create the tables

1. In the project, open **SQL Editor → New query**.
2. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. You should see "Success. No rows returned".
3. Check **Table Editor**: `students`, `attempts`, `activity` and `assignments` should be listed, each marked as RLS enabled.

### 3. Connect the website locally

1. In Supabase open **Project Settings → API** (or the **Connect** button) and copy the **Project URL** and the **publishable / anon key**.
2. In the project folder copy the template and fill in the two values:

   ```bash
   cp .env.example .env.local
   ```

3. Restart `npm run dev`. In the lab sidebar the status line changes from "Saved in this browser" to **"Saved to the cloud"**.
4. Open Student mode, sign in with a name and answer a problem. The row appears in **Table Editor → attempts**. Anything this browser had saved before is uploaded automatically on first connect.

`.env.local` is git-ignored. Never commit it, and never use the **secret / service_role** key in the website: it bypasses all security rules.

### 4. Connect the deployed site (Vercel)

1. In Vercel open the project → **Settings → Environment Variables**.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values (for Production and Preview).
3. Redeploy (**Deployments → ⋯ → Redeploy**). Vite bakes these values in at build time, so a redeploy is required after any change. If either is missing, the production build stops with an error naming the missing variable, so a deployment can never fall back to saving in the browser (and shipping the answer key) by accident.

### 5. Turn on student and teacher accounts

With Supabase connected, practising (Student mode) and the Teacher dashboard need an account; the visualizers stay open to everyone. Accounts use email + password (Supabase Auth).

1. **Run the latest schema.** If you ran an older `schema.sql`, run the current one again (SQL Editor → paste → Run). It adds the `profiles` and `teacher_emails` tables and replaces the old open rules with account-based ones.
2. **Set the site address.** In Supabase open **Authentication → URL Configuration**:
   - **Site URL**: your live site, e.g. `https://your-site.vercel.app`
   - **Redirect URLs**: add `https://your-site.vercel.app/signin` and `http://localhost:5173/signin`

   Confirmation and password-reset emails link back to these.
3. **Keep email confirmation on.** In **Authentication → Sign In / Providers → Email**, leave "Confirm email" switched on, so new users must click a link before signing in. Teacher rights are tied to an email address, and confirmation is what proves the person owns it: with it off, anyone could sign up using a listed teacher's email and see every student's data. Supabase's built-in mailer sends only a few emails per hour, so for a whole class add your own SMTP under **Authentication → Emails → SMTP Settings**.
4. **Make yourself a teacher.** Every new account is a student. To make someone a teacher, add their email (lower-case) in **Table Editor → teacher_emails → Insert row**, or in the SQL Editor:

   ```sql
   insert into public.teacher_emails (email) values ('you@example.com');
   ```

   This works before or after they sign up; their role changes at once (they should sign out and in again). If they had signed up as a student, their student row is removed so the Teacher dashboard doesn't list them — unless it already has answers, which are kept. Delete the row to turn a teacher back into a student.
5. Open `/signin` on the site, create your account and sign in. The lab sidebar shows your name, your role and a Sign out button.

### 6. Practice questions (stored in the database)

All practice questions — prompts, options, hints, answers and explanations — live in the Supabase table **`problems`**. The website reads only the question columns; answers and explanations never reach the browser. When a student checks an answer, the database function `submit_attempt` grades it, records the attempt and returns the explanation.

**Load the original 172 questions (once).** Run `schema.sql` first, then paste the whole of `supabase/seed-problems.sql` into **SQL Editor → New query** and click **Run**. That file is git-ignored because it contains every answer — keep a private copy as a backup (or export the table regularly: **Table Editor → problems → Export**). Re-running it restores those questions to their original text and never deletes questions added later.

**Add, edit or delete questions** in **Table Editor → problems** (or with SQL). Changes appear on the site the next time a student or teacher opens the lab.

| Column | What to put |
|---|---|
| `id` | A unique name, e.g. `ram-3` (lower-case letters, digits, hyphens) |
| `topic` | The topic it belongs to — the `?topic=` part of the topic's address, e.g. `ram`, `ds-stack`, `la-eigen` |
| `sort_order` | Position within the topic (smaller comes first) |
| `kind` | `mcq` (pick an option), `num` (type a number) or `puzzle` (an interactive board — see below) |
| `prompt` | The question |
| `options` | `mcq` only: the choices, e.g. `{"First","Second","Third"}`. Empty otherwise |
| `puzzle` | `puzzle` only: the board's settings, e.g. `{"type": "bfs", "nodes": 7}` |
| `hint` | Shown when the student asks for a hint |
| `tag` | The misconception recorded for a wrong answer |
| `answer` | Hidden. `num`: the correct number. `mcq`: the position of the correct option, counting from 0. Empty for `puzzle` |
| `tags` | Hidden, optional: misconceptions for particular wrong answers, e.g. `{"64": "Used n² instead"}` |
| `explain` | Hidden until answered: the worked explanation |

The table refuses broken questions: an `mcq` needs at least two options and an `answer` that is one of their positions, and a `num` question must not have options. A question whose `topic` doesn't match any topic on the site simply isn't shown. Deleting a question keeps the attempts students already made on it.

Without Supabase connected there are no practice questions (the visualizers still work).

#### Puzzles (interactive questions)

A `puzzle` question is a board the student plays: clicking vertices in BFS order, building a Hamiltonian cycle with backtracking, placing queens, walking a maze, moving the Tower of Hanoi, inserting keys into a hash table, filling in a DP table, choosing a satisfying assignment, clicking a point on a vector grid, and so on. Every topic on the site has at least one. The row stores only the board's **settings**; the website draws a fresh random board every time (students can press **New board**), checks each move, explains the wrong ones, and records the result like any other answer — so puzzles count towards mastery and appear on the teacher dashboard.

**Load the starter puzzles (once):** after `schema.sql`, run `supabase/seed-puzzles.sql` the same way. It adds 92 puzzles — at least one for every topic — across the three subjects (ids start with `pz-`). It contains no answers, so it is safe to commit; re-running it resets those rows and never deletes anything.

Settings for `puzzle` (`type` is required; the other numbers are optional, shown as *range (default)*):

| `type` | What the student does | Other settings |
|---|---|---|
| `bfs`, `dfs` | Click the vertices in visiting order | `nodes` 4–10 (7), `extra` edges 0–12 |
| `topo` | Click a topological order of a directed graph | `nodes` 4–9 (6) |
| `dijkstra` | Click vertices in the order Dijkstra finalises them | `nodes` 4–9 (6), `extra` 0–12 |
| `kruskal` | Click edges in the order Kruskal adds them | `nodes` 4–9 (6), `extra` 1–12 |
| `hamiltonian` | Build a Hamiltonian cycle, backing up at dead ends | `nodes` 4–10 (7), `extra` 0–12 |
| `tree-order` | Click a BST's nodes in a traversal order | `nodes` 4–12 (7), `order`: `"preorder"`, `"inorder"`, `"postorder"` or `"level"` |
| `bst-search` | Click the nodes a BST search compares with | `nodes` 4–12 (8) |
| `selection-sort` | Click the bar each pass swaps into place | `size` 4–10 (7) |
| `queens` | Place n queens that don't attack each other | `n` 4–8 (6) |
| `maze` | Walk from the entrance to the exit | `size` 3–10 (6) |
| `hanoi` | Move the tower in the fewest moves | `disks` 2–6 (3) |
| `combination` | Click the point a·u + b·v | `range` 4–8 (6) |
| `transform` | Click where the matrix A sends p | `range` 4–8 (6) |
| `eigenvector` | Click an eigenvector of A | `range` 4–8 (6) |
| `projection` | Click the projection of p onto a line | `range` 4–8 (6) |
| **Algorithms** | | |
| `growth` | Click functions (or operations) from slowest- to fastest-growing | `count` 4–12 (6), `set`: `"functions"` or `"operations"` |
| `op-count` | Fill in how often each line runs and the total cost (RAM model) | `program` 0–2, `n` 3–9 |
| `loop-count` | Fill in how often a loop body runs for n = 4, 8, 16 | `program` 0–3 |
| `counting-sort` | Fill in the count and running-total arrays | `max` 3–7 (5), `size` 5–12 (8) |
| `heap` | Click the nodes a key swaps with when it sifts up or down | `heap`: `"max"`/`"min"`, `op`: `"insert"`/`"extract"`/`"either"`, `nodes` 5–14 (9) |
| `hashing` | Click the slot each key lands in (open addressing) | `probe`: `"linear"`/`"quadratic"`, `size` 7/11/13 |
| `string-match` | Select every position where the pattern starts | `length` 10–22 (16), `pattern` 2–5 (3) |
| `adjacency-matrix` | Select the 1s of the graph's adjacency matrix | `nodes` 3–7 (5), `directed` true/false |
| `components` | Select the (strongly) connected component of a vertex | `mode`: `"scc"`/`"cc"`, `nodes` 5–10 (8) |
| `articulation` | Select the articulation points (or bridges) | `find`: `"points"`/`"bridges"`, `nodes` 5–10 (8) |
| `fractional-knapsack` | Click items in the order greedy takes them | `items` 3–7 (5) |
| `huffman` | Click the two lightest trees each round | `symbols` 3–8 (6) |
| `pascal` | Fill in missing entries of Pascal's triangle | `rows` 4–10 (7), `blanks` 2–12 (6) |
| `matrix-chain` | Fill in the m[i][j] table | `matrices` 3–5 (4) |
| `lcs` | Fill in the last rows of the LCS table | `length` 3–6 (5) |
| `knapsack` | Fill in the last row of the 0/1 knapsack table | `items` 2–4 (3), `capacity` 4–8 (6) |
| `subset-sum` | Select numbers adding up to a target | `numbers` 4–9 (7) |
| `np-graph` | Select an independent set, clique or vertex cover | `problem`: `"independent-set"`/`"clique"`/`"vertex-cover"`, `nodes` 5–9 (7) |
| `reduction` | Turn a given independent set into a vertex cover | `nodes` 5–9 (7) |
| `sat` | Choose true variables so every clause holds | `variables` 3–6 (4), `clauses` 3–8 (5) |
| `tsp` | Build the shortest tour | `cities` 4–6 (5) |
| **Data structures** | | |
| `address` | Fill in element addresses | `order`: `"row"`/`"column"`, `rows` 2–8 (4), `cols` 2–8 (5) |
| `array-shift` | Click elements in the order they shift | `op`: `"insert"`/`"delete"`/`"either"`, `size` 4–10 (7) |
| `binary-search` | Click each element binary search compares with | `size` 6–16 (13) |
| `sparse-transpose` | Fill in the triplets of the transpose | `rows` 3–6, `cols` 3–6, `terms` 3–7 |
| `recursion-tree` | Click calls of fib(n) in the order they start | `n` 3–5 |
| `linked-list` | Follow next pointers through memory | `nodes` 4–9 (6), `free` 0–4 (2) |
| `polynomial` | Fill in the coefficients of p + q or p · q | `op`: `"add"`/`"multiply"`, `degree` 1–3 (2) |
| `stack-queue` | Click the value each pop / dequeue removes | `kind`: `"stack"`/`"queue"`, `pushes` 4–9 (6) |
| `postfix` | Click infix tokens in postfix order | `operators` 2–6 (4) |
| `general-tree` | Click a general tree's nodes in pre- or postorder | `order`: `"preorder"`/`"postorder"`, `nodes` 5–12 (9) |
| `trie` | Click the path of a word in a trie | `words` 3–9 (6) |
| `merge` | Click values in the order merging writes them | `size` 4–12 (8) |
| `radix-pass` | Click numbers in order after one stable ones-digit pass | `size` 5–10 (8) |
| `degrees` | Fill in in- and out-degrees of a multigraph | `nodes` 3–6 (4), `edges` (8) |
| **Linear algebra** | | |
| `zn-inverse` | Fill in multiplicative inverses mod n | `n` 5–12 |
| `closure` | Click u + v and see whether the set is closed | `range` 5–8 (6) |
| `cross-product` | Fill in u × v and the triple product | `range` 2–5 (3) |
| `matrix-coords` | Fill in a matrix's coordinates in a non-standard basis | `range` 3–9 (5) |
| `poly-coords` | Fill in coordinates in {1, (x − 1), (x − 1)²} | — |
| `complex` | Click z · w (or z + w) on the complex plane | `op`: `"multiply"`/`"add"` |
| `direct-sum` | Click the U-part of v in U ⊕ W | `range` 5–8 (6) |
| `oblique-projection` | Click P(p) for a projection along a direction | `range` 5–8 (6) |
| `rank-nullity` | Fill in rank and nullity | `rows` 2–4 (3), `cols` 3–5 (4) |
| `inverse` | Fill in A⁻¹ | `size` 2–3 (2) |
| `change-basis` | Fill in [T]_B = P⁻¹AP | — |
| `dual-basis` | Fill in the dual basis functionals | — |
| `det-trace` | Fill in trace and determinant | `size` 2–3 (3) |
| `cayley` | Fill in p(λ) and A² via Cayley–Hamilton | — |
| `diagonalize` | Fill in A = PDP⁻¹ | — |
| `jordan` | Fill in the number of Jordan blocks of each size | `size` 3–8 (6) |
| `norms` | Fill in ‖A‖₁, ‖A‖∞ and ‖A‖_F² | `size` 2–3 (3) |
| `orthogonal` | Click a vector orthogonal to u | `range` 4–8 (6) |
| `gram-schmidt` | Click the Gram–Schmidt vector u₂ | `range` 5–8 (6) |
| `orthogonal-map` | Click Q · p for an orthogonal Q | `range` 4–8 (5) |
| `bilinear` | Fill in the symmetric and skew-symmetric parts | — |
| `quadratic` | Fill in the matrix of a quadratic form and its determinant | — |

The board's own explanation is shown after each attempt, so leave `explain`, `answer`, `options` and `tags` empty. `hint` and `tag` work as for other questions. Note that puzzle moves are checked in the browser, so a determined student could fake a puzzle result; the theory questions remain graded by the database.

### How it works

- `src/lib/auth.tsx` handles sign-in, sign-up, password reset and sign-out, and loads each user's profile (name and role). `src/pages/SignInPage.tsx` is the `/signin` page.
- A database trigger creates the profile when someone signs up and gives them the teacher role if their email is in `teacher_emails`. Nobody can change their own role from the website.
- `src/lib/supabase.ts` reads and writes the tables; `src/domain/sync.ts` works out exactly which rows changed (unit-tested in `sync.test.ts`).
- `useDB` in `src/domain/tracking.ts` keeps a private browser cache per account (cleared on sign-out), writes every change there at once and sends it to Supabase in the background. If Supabase can't be reached, the status line says "Offline" and the data is uploaded on the next visit.
- Supabase Realtime pushes changes from other devices, so an open Teacher dashboard refreshes by itself.

### Security

The database rules (Row Level Security in `schema.sql`) are what protect the data, not the website:

- Signed-out visitors can read and write nothing.
- A **student** can read only their own answers and activity, and can't see other students. Answers are submitted only through the database function `submit_attempt`, which grades them against the hidden answer columns of the `problems` table and records the result, so a student can't write their own score.
- A **teacher** can read every student's progress, create assignments, and add or remove the demo class.
- Nobody can edit or delete real answers from the website, and roles can only be changed in the Supabase dashboard.
- Teacher rights also require a confirmed email address, and a student can't mark their own record as "demo" (which would let "Remove demo class" delete it).
- After changing `schema.sql`, run it again in the SQL Editor; it is safe to re-run.
- The publishable (anon) key in the website is meant to be public; never put the secret / service_role key in the site.

Data recorded before accounts existed (students identified only by a typed name) stays in the database and is visible to teachers, but can't be claimed by a student account. Without Supabase configured, the site falls back to the old name-only mode with data kept in the browser.

## Project structure

```
.
├── index.html                 # Vite entry HTML
├── public/                    # Static files served as-is (favicon)
├── src/
│   ├── main.tsx               # Routes: "/", "/algorithms", "/data-structures", "/linear-algebra" ("/lab" redirects)
│   ├── pages/
│   │   ├── LandingPage.tsx    # Subject overview, course switcher, company footer
│   │   ├── SignInPage.tsx     # /signin: sign in, create account, reset password
│   │   ├── LabPage.tsx        # The shared lab shell (Explore / Student / Teacher)
│   │   ├── DaaLab.tsx         # /algorithms entry (its own lazily loaded chunk)
│   │   ├── DsLab.tsx          # /data-structures entry
│   │   └── LaLab.tsx          # /linear-algebra entry
│   ├── courses/               # One file per subject: topic → visualizer and theory notes
│   │   ├── types.ts
│   │   ├── daa.tsx
│   │   ├── ds.tsx
│   │   └── la.tsx
│   ├── components/
│   │   ├── landing/           # Animated hero field
│   │   ├── modes/             # Student practice panel and Teacher dashboard
│   │   ├── daa/unit1 … unit5/ # Algorithms visualizers and theory notes
│   │   ├── ds/                # Data Structures visualizers (unit1 … unit5), kit.tsx, DsTheory.tsx
│   │   └── la/                # Linear Algebra visualizers (unit1 … unit5), kit.tsx (draggable plane), Space3D.tsx (rotatable ℝ³), LaTheory.tsx
│   ├── domain/                # Pure logic, course data and tests (no React)
│   │   ├── course.ts          # Unit / Topic types shared by every subject
│   │   ├── subjects.ts        # Subjects on the landing page (add new ones here)
│   │   ├── problems.ts        # Loads questions from the database; checkAnswer() calls submit_attempt
│   │   ├── tracking.ts        # Students, attempts, mastery; useDB (localStorage + Supabase sync)
│   │   ├── sync.ts            # Row ↔ DB conversion, change detection and merging for Supabase
│   │   ├── daa/               # units.ts, unit1 … unit5 logic + tests
│   │   ├── ds/                # units.ts, arrays/lists/stacks/trees/sorting logic + ds.test.ts
│   │   └── la/                # units.ts, linalg.ts (matrices, RREF, eigen, Jordan…), algebra.ts, spaces.ts (ℝ³, matrix, polynomial, ℂⁿ) + la.test.ts
│   ├── lib/supabase.ts        # Supabase client: load, save and live updates
│   ├── lib/auth.tsx           # Student/teacher accounts: sign in, sign up, reset, roles
│   ├── styles/                # index.css imports base, lab, per-unit, ds, la and landing styles
│   └── assets/                # Images bundled by Vite (logo)
├── supabase/schema.sql        # Tables, accounts/roles, grading function, security rules — run in Supabase
├── supabase/seed-problems.sql # Git-ignored, one-time import of the original 172 questions
├── supabase/seed-puzzles.sql  # One-time import of the 92 starter puzzles (no answers inside)
├── .env.example               # Template for VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
├── vercel.json                # SPA rewrite so deep links work on refresh
└── vite.config.ts
```

### Adding a subject

1. Add its units and topic summaries in `src/domain/<subject>/units.ts`, and its practice questions as rows in the `problems` table (topic ids must match).
2. Build its visualizers in `src/components/<subject>/` and map topic ids to them in `src/courses/<subject>.tsx`.
3. Add a page in `src/pages/`, a route in `src/main.tsx`, and set `path` on the subject in `src/domain/subjects.ts`.

## Coverage — Design & Analysis of Algorithms

- **Unit I — Algorithm analysis (fully visual):**
  - _RAM model:_ line-by-line tracer for three programs (Θ(1), Θ(n), Θ(n²)) with per-line cost, run counts, memory/registers, a running cost meter, a T(n) chart and a "when n doubles" ratio panel.
  - _Asymptotic notation:_ growth-rate race (1, log n, n, n log n, n², 2ⁿ) on linear or log scale; a bound prover that computes the exact smallest n₀ for O, Ω and Θ from your own f(n), g(n), c₁ and c₂.
  - _Complexity analysis:_ loop grids where each square is one execution (constant, log, linear, n log n, triangular, quadratic), T(n) and T(n)/g(n) charts; recursion trees with per-level work bars and the Master Theorem case.
  - _Paradigms:_ merge sort split/merge tree, greedy coin change vs optimal (with a failing coin system), N-Queens backtracking, and 0/1-knapsack branch and bound with pruning.
- **Unit II — Searching, sorting and data structures (fully visual):**
  - _Comparison sorting:_ quick (last or middle pivot), merge, heap and insertion sort, step by step, plus a worst- vs average-case chart built from real comparison counts.
  - _Linear-time sorting:_ counting sort (stability shown), LSD radix sort, bucket sort, and the decision-tree proof of the Ω(n log n) lower bound.
  - _Search trees:_ BST insert/search/delete, AVL rotations (LL/RR/LR/RL), red-black insertion fix-up, B-tree insertion with node splits (t = 2 or 3), and a tree-height comparison.
  - _Heaps:_ max/min binary heap with insert, extract and build-heap shown as both a tree and an array, and why build-heap is Θ(n).
  - _Hashing:_ chaining, linear, quadratic and double hashing with probe sequences, load factor and expected-cost curves.
  - _String matching:_ naive, KMP (with prefix-function construction) and Boyer–Moore (bad-character and good-suffix tables).
- **Unit III — Graph algorithms (fully visual):**
  - _Representations:_ an editable graph shown as adjacency matrix, adjacency list and edge list, with space and operation costs.
  - _BFS & DFS:_ queue/stack state, BFS layers, DFS discovery/finish intervals and edge classes (tree, back, forward, cross).
  - _Connected components:_ component labelling, and Kosaraju's strongly connected components with the condensation DAG.
  - _Topological sorting:_ Kahn's in-degree method and DFS finishing order, with cycle detection.
  - _Biconnected components:_ low-link DFS finding articulation points, bridges and biconnected components, plus a remove-a-vertex experiment.
  - _Single-source shortest paths:_ Dijkstra (and where it fails), Bellman–Ford with negative-cycle detection, and DAG shortest paths.
- **Unit IV — Greedy and dynamic programming:** Prim and Kruskal on the textbook 9-vertex graph (union-find sets, keys and the cut property); Dijkstra with an array vs a binary heap (live operation counts and a worst-case bound chart); fractional knapsack with three greedy rules; Huffman coding with the priority-queue forest, code table and bits vs entropy; binomial coefficient (Pascal table, recursion tree with repeats, calls vs cells chart); matrix-chain m and s tables with every bracketing charted; LCS table with arrows and trace-back; 0/1 knapsack table with trace-back compared with greedy and fractional answers. Each topic has syllabus-referenced theory notes.
- **Unit V — Complexity and intractability:** subset-sum search vs certificate check, growth chart and a clickable map of P / NP / NP-complete / NP-hard; NP-completeness as hardness spreading through the reduction tree (and a fast algorithm spreading up to P = NP), with the proof recipe; CNF-SAT ≤p INDEPENDENT-SET built step by step, plus the independent set / vertex cover / clique triangle; SAT with certificate checking, a full truth table and a DPLL search tree on your own formulas; Hamiltonian-cycle backtracking with the Euler contrast and HAM-CYCLE ≤p TSP; TSP brute force vs nearest neighbour vs the MST 2-approximation. Each topic has syllabus-referenced theory notes.

## Coverage — Data Structures

Follows the syllabus unit by unit (29 topics, 58 practice problems). Topics shared with the Algorithms course reuse its visualizers.

- **Unit I — Introduction & arrays:** data organisation (field, record, file, keys), operation costs per structure on a log scale, a time–space trade-off calculator; address calculation for 1-, 2- and 3-D arrays in row- and column-major order with the memory layout drawn; traversal, insertion and deletion with every shift animated; linear vs binary search side by side; sparse matrices as triplets with simple transpose, fast transpose (rowTerms / startingPos) and sparse multiplication.
- **Unit II — Recursion & linked lists:** the call stack for n! and the Fibonacci recursion tree with repeated calls highlighted; N-Queens backtracking with pruning and undo; singly, doubly and circular lists (insert at head, tail or position, delete, search, reverse) with CUR/PREV pointers and the new node drawn; generalized lists with tags, depth and length; polynomial addition and multiplication on term lists.
- **Unit III — Stacks & queues:** array and linked stacks side by side with overflow/underflow; Tower of Hanoi (up to 7 disks, 2ⁿ − 1 moves); linear, circular and double-ended queues on a fixed array, with the circular queue also drawn as a ring; priority queues with a binary heap; infix → postfix with the operator stack traced, infix → prefix, and postfix evaluation; the maze problem solved with a stack and with a queue (editable walls).
- **Unit IV — Trees:** level-order input, four traversals, mathematical properties, completeness, extended trees with E = I + 2n; expression trees built and evaluated bottom-up; BST/AVL/B-trees; Huffman's algorithm; general trees in left-child right-sibling form and in-order threaded trees with threads drawn; tries with insert, search and prefix queries.
- **Unit V — Sorting, hashing & graphs:** bubble, selection and insertion sort with comparison/swap counts on random, sorted and reversed input; quick, two-way merge and heap sort; sorting on several keys with stable passes; external two-way merge sort with runs and passes; hashing; adjacency-matrix representation; DFS and BFS; topological sort; digraphs and multigraphs with counted matrices, degrees and the handshake lemma.

## Coverage — Linear Algebra

Follows the syllabus unit by unit (27 topics, 54 practice problems). Most visuals are a coordinate plane with vectors you drag, or a rotatable 3-D view of ℝ³; matrices can be typed in or loaded from presets.

- **Unit I — Modern algebra & vector spaces:** ℤₙ operation tables with the group axioms checked live, zero divisors and when ℤₙ is a field; a subspace tester (drag u, v and c to find counterexamples); a gallery of vector spaces — ℝ³ in a rotatable 3-D view (spans as lines and planes, linear combinations, cross product, volume test), the matrix space M₂ₓ₂ (matrices as coloured tiles with coordinates in ℝ⁴ and its symmetric/diagonal/trace-zero subspaces), polynomial spaces Pₙ (curves and coefficient vectors, a Taylor basis, d/dx as a matrix) and complex spaces ℂ and ℂ² (complex scalars rotating vectors, the Hermitian inner product); span drawn as a lattice of combinations, with an ℝ³ dependence test; a basis grid that reads off coordinates; direct sums that split a vector along two lines.
- **Unit II — Linear transformations:** the plane morphing from I to any 2 × 2 matrix with linearity checked on your vectors; step-by-step row reduction with range and null-space bases and rank + nullity = n; orthogonal and oblique projections (P² = P); Gauss–Jordan inversion of [A | I]; change of basis P⁻¹AP (diagonal in an eigenbasis); dual bases drawn as families of level lines.
- **Unit III — Eigen-theory:** determinant as area scale and orientation, trace, transpose and cofactor expansion; a vector sweeping the circle to find eigenvectors; Cayley–Hamilton summed term by term with the minimal polynomial; diagonalization with the eigenbasis grid and Aᵏx; Jordan blocks from rank(A − λI)ᵏ; unit balls of the 1-, 2- and ∞-norms and their images.
- **Unit IV — Inner product spaces:** dot and weighted inner products with Cauchy–Schwarz and the triangle inequality; Gram–Schmidt in the plane (stepped) and in ℝ³ (table); least squares as an orthogonal projection with draggable data points; adjoints and Hermitian / unitary / normal tests for complex matrices.
- **Unit V — Bilinear & quadratic forms:** B(u, v) = uᵀMv with its symmetric and skew parts and congruence PᵀMP; quadratic forms as heat maps with principal axes, eigenvalues, leading minors and signature.

## Modes

- **Explore:** interactive visualizers, input controls, intermediate states and concept notes. While a student is signed in, time spent and steps taken per topic are recorded automatically.
- **Student (manual practice):** sign in with a student account see your mastery per topic, practice auto-graded problems from the `problems` table (172 to start with: 60 for Algorithms, 58 for Data Structures, 54 for Linear Algebra) plus 92 interactive puzzles (at least one per topic) that play the algorithm on a fresh board, use hints, and open the matching visualizer. Teacher assignments appear here.
- **Teacher (automated, teacher accounts only):** no grading or data entry. The dashboard derives class accuracy, weakest topics, most common misconceptions, students needing attention, a student × topic heatmap, per-student drill-down (time, steps, misconceptions), and one-click auto-assignment of the weakest topics. Export CSV/JSON.

## How tracking works

- The `problems` table holds every question with its answer; each wrong answer maps to a named misconception.
- `src/domain/problems.ts`: `useProblems` loads the question columns for the signed-in user; `checkAnswer` sends an answer to `submit_attempt`, which grades it in the database. The website contains no answers.
- `src/domain/puzzles/*.ts`: the interactive puzzles — each builds a seeded board from a row's `puzzle` settings and checks every move (unit-tested); `src/components/modes/PuzzleCard.tsx` draws and plays them, and `submitPuzzle` records the result with the database function `submit_puzzle`.
- `src/domain/tracking.ts`: data model, localStorage persistence (`useDB`), analytics, and `useActivityTracker`.
- Mastery = share of the last 6 attempts answered correctly (a correct answer after a hint counts half), shown only after 2+ attempts. Below 50% = struggling, below 75% = developing.
- `src/domain/daa/**`, `src/domain/ds/*.ts` and `src/domain/la/*.ts`: pure, deterministic logic behind every visual (seeded, no randomness); the `*.test.ts` files verify it against textbook results.
- Data Structures topic ids start with `ds-` and Linear Algebra ones with `la-`, so progress in different subjects never collides; one student profile covers all three.
- `src/domain/demo.ts`: "Load demo class" in Teacher mode creates 8 synthetic students (flagged demo, removable).
- A student tab and a teacher tab in the same browser stay in sync through the `storage` event.

## Current limits

- Without Supabase configured, data lives only in the browser's `localStorage` and there are no accounts. With it, there is still one class: every teacher sees every student (no separate classes or rosters yet).
- Without Supabase configured there are no accounts: a student is identified by the name they type.
- Auto-grading covers multiple-choice and numeric problems only. The old keyword-based writing checklist is no longer used.
- Visualizer step counts are tracked for the sorting and BFS/DFS steppers and all Unit 1 steppers; other visualizers record time only.
- Some panels are still concept demonstrators (tree panel, Boyer–Moore, shortest-path rounds use fixed illustrative values).

## Next milestones

1. Classes: rosters and class codes, so each teacher sees only their own students.
2. More problems per topic (or parameterized generators) so mastery is not based on repeats of one question.
3. "Predict the next step" interactions inside the visualizers, logged as attempts.
4. Real implementations for the tree, Boyer–Moore and shortest-path panels; unit tests; accessibility checks.
