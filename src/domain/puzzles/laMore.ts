/* More linear-algebra puzzles, one per topic that had none: grid puzzles where the answer is a
 * point (closure, complex numbers, direct sums, projections, orthogonality, Gram–Schmidt,
 * orthogonal maps) and fill-in tables for the computational topics. */
import {
  fmtNum,
  int,
  opt,
  pick,
  type PlanePuzzle,
  type Rng,
  type Settings,
  type TablePuzzle,
  type Vec,
} from "./core";

type M2 = [Vec, Vec];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const scale = (k: number, a: Vec): Vec => [k * a[0], k * a[1]];
const eq = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const cross = (a: Vec, b: Vec) => a[0] * b[1] - a[1] * b[0];
const perp = (a: Vec): Vec => [-a[1], a[0]];
const inside = (R: number, ...vs: Vec[]) =>
  vs.every((v) => Math.abs(v[0]) <= R && Math.abs(v[1]) <= R);
const fv = (v: Vec) => `(${fmtNum(v[0])}, ${fmtNum(v[1])})`;
const nz = (r: Rng, lo = -2, hi = 2) => {
  for (;;) {
    const k = int(r, lo, hi);
    if (k) return k;
  }
};
const smallVec = (r: Rng, lo = -2, hi = 2): Vec => {
  for (;;) {
    const v: Vec = [int(r, lo, hi), int(r, lo, hi)];
    if (v[0] || v[1]) return v;
  }
};

// ---------- Matrices (any size, exact for small integers) ----------

type Mat = number[][];
const mmul = (a: Mat, b: Mat): Mat =>
  a.map((row) =>
    b[0].map((_, j) => row.reduce((t, x, k) => t + x * b[k][j], 0)),
  );
function det(a: Mat): number {
  if (a.length === 1) return a[0][0];
  if (a.length === 2) return a[0][0] * a[1][1] - a[0][1] * a[1][0];
  return a[0].reduce(
    (t, x, j) =>
      t +
      (j % 2 ? -1 : 1) *
        x *
        det(a.slice(1).map((row) => row.filter((_, k) => k !== j))),
    0,
  );
}
function inverse(a: Mat): Mat {
  const n = a.length,
    d = det(a);
  const cof = (i: number, j: number) =>
    ((i + j) % 2 ? -1 : 1) *
    det(
      a.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j)),
    );
  if (n === 2)
    return [
      [a[1][1] / d, -a[0][1] / d],
      [-a[1][0] / d, a[0][0] / d],
    ];
  return range(n).map((i) => range(n).map((j) => cof(j, i) / d));
}
function rank(a: Mat): number {
  const m = a.map((row) => [...row]);
  let rk = 0;
  for (let c = 0; c < m[0].length && rk < m.length; c++) {
    const p = m.findIndex((row, i) => i >= rk && Math.abs(row[c]) > 1e-9);
    if (p < 0) continue;
    [m[rk], m[p]] = [m[p], m[rk]];
    for (let i = 0; i < m.length; i++)
      if (i !== rk) {
        const f = m[i][c] / m[rk][c];
        m[i] = m[i].map((x, j) => x - f * m[rk][j]);
      }
    rk++;
  }
  return rk;
}
const randMat = (r: Rng, rows: number, cols: number, lo = -3, hi = 3): Mat =>
  range(rows).map(() => range(cols).map(() => int(r, lo, hi)));
/** An integer matrix with determinant ±1 (so its inverse is integer too). */
function unimodular(r: Rng, n: number, size = 2): Mat {
  for (;;) {
    let m: Mat = range(n).map((i) => range(n).map((j) => (i === j ? 1 : 0)));
    for (let t = 0; t < n + 2; t++) {
      const i = int(r, 0, n - 1),
        j = int(r, 0, n - 1);
      if (i === j) continue;
      const k = nz(r, -1, 1);
      const e: Mat = range(n).map((a) =>
        range(n).map((b) => (a === b ? 1 : a === i && b === j ? k : 0)),
      );
      m = mmul(m, e);
    }
    if (r() < 0.3) m = m.map((row) => row.map((x, j) => (j === 0 ? -x : x)));
    if (
      m.flat().every((x) => Math.abs(x) <= size) &&
      m.flat().filter((x) => x !== 0).length > n
    )
      return m;
  }
}
const matLines = (name: string, a: Mat) =>
  a.map(
    (row, i) =>
      `${i === 0 ? `${name} = ` : " ".repeat(name.length + 3)}[ ${row.map((x) => fmtNum(x).padStart(3)).join(" ")} ]`,
  );
const tableOf = (a: Mat) =>
  a.map((row) => row.map(() => null as string | null));
const idx = (n: number) => range(n).map((i) => String(i + 1));

// ---------- Groups, rings and fields: inverses in ℤₙ ----------

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

export function znInversePuzzle(s: Settings, r: Rng): TablePuzzle {
  const n = opt(s, "n", [7, 8, 9, 10, 11][int(r, 0, 4)], 5, 12);
  const inv = range(n - 1).map((i) => {
    const a = i + 1;
    return range(n).find((b) => (a * b) % n === 1) ?? 0;
  });
  const field = inv.every((x) => x !== 0);
  return {
    family: "table",
    task: `In ℤ${n} (arithmetic mod ${n}), fill in the multiplicative inverse of each a: the b with a·b ≡ 1 (mod ${n}). Write 0 if a has no inverse.`,
    corner: "a",
    colHeads: range(n - 1).map((i) => String(i + 1)),
    rowHeads: ["a⁻¹"],
    cells: [inv.map(() => null)],
    answers: [inv],
    why: (_r, c, given) => {
      const a = c + 1;
      if (given === n - a)
        return "Gave the additive inverse (a + b ≡ 0) instead of the multiplicative one";
      if (inv[c] === 0 && given !== 0)
        return `gcd(${a}, ${n}) = ${gcd(a, n)} > 1, so ${a} has no inverse`;
      if (inv[c] !== 0 && given === 0)
        return `gcd(${a}, ${n}) = 1, so ${a} does have an inverse`;
      return null;
    },
    explain: `Inverses: ${inv.map((b, i) => `${i + 1}→${b || "none"}`).join(", ")}. a is invertible exactly when gcd(a, ${n}) = 1. ${field ? `Every non-zero element has one, so ℤ${n} is a field (${n} is prime).` : `Not every non-zero element has one, so ℤ${n} is a ring but not a field (${n} isn't prime).`}`,
  };
}

// ---------- Vector spaces: closure under addition ----------

export function closurePuzzle(s: Settings, r: Rng): PlanePuzzle {
  const R = opt(s, "range", 6, 5, 8);
  for (;;) {
    const d = smallVec(r, -1, 2);
    const through = r() < 0.65;
    const p0: Vec = through ? [0, 0] : (smallVec(r, -2, 2) as Vec);
    if (!through && cross(p0, d) === 0) continue;
    const t1 = nz(r, -2, 2),
      t2 = nz(r, -2, 2);
    if (t1 + t2 === 0) continue;
    const u = add(p0, scale(t1, d)),
      v = add(p0, scale(t2, d));
    const sum = add(u, v);
    if (eq(u, v) || !inside(R, u, v, sum)) continue;
    const onLine = add(p0, scale(t1 + t2, d));
    return {
      family: "plane",
      range: R,
      vectors: [
        { v: u, label: "u", tone: "cyan" },
        { v, label: "v", tone: "violet" },
      ],
      offsetLines: [{ p: p0, d }],
      task: `The dashed line is the set S. u and v lie in S. Click u + v — then see whether it is still in S.`,
      check: (pt) => {
        if (eq(pt, sum)) return null;
        if (eq(pt, onLine))
          return "Assumed u + v stays on S: add the coordinates and see where it really lands";
        if (eq(pt, sub(u, v)) || eq(pt, sub(v, u)))
          return "Subtracted instead of adding";
        return "Add the coordinates: u + v = (u₁ + v₁, u₂ + v₂)";
      },
      answer: sum,
      explain: through
        ? `u + v = ${fv(sum)} is on the line again: a line through the origin is closed under addition and scaling, so it is a subspace.`
        : `u + v = ${fv(sum)} is off the line: S doesn't pass through the origin, so it isn't closed under addition (and doesn't contain 0). A line is a subspace only if it goes through the origin.`,
    };
  }
}

// ---------- ℝ³: cross product and volume ----------

export function crossProductPuzzle(s: Settings, r: Rng): TablePuzzle {
  const R = opt(s, "range", 3, 2, 5);
  const v3 = () => range(3).map(() => int(r, -R, R));
  let u = v3(),
    v = v3();
  while (u[1] * v[2] - u[2] * v[1] === 0 && u[2] * v[0] - u[0] * v[2] === 0)
    v = v3();
  const w = v3();
  const c = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const vol = c[0] * w[0] + c[1] * w[1] + c[2] * w[2];
  const f3 = (x: number[]) => `(${x.join(", ")})`;
  return {
    family: "table",
    task: `u = ${f3(u)}, v = ${f3(v)}, w = ${f3(w)}. Fill in u × v and the triple product (u × v) · w, the signed volume of the box spanned by u, v and w.`,
    corner: "",
    colHeads: ["x", "y", "z"],
    rowHeads: ["u × v", "(u × v) · w"],
    cells: [
      [null, null, null],
      [null, "", ""],
    ],
    answers: [c, [vol, null, null]],
    why: (row, col, given) => {
      if (row === 0 && given === -c[col])
        return col === 1
          ? "The middle component is u₃v₁ − u₁v₃: watch the sign"
          : "Computed v × u; the cross product is anticommutative";
      if (row === 1 && given === -vol)
        return "The sign of the volume follows the right-hand rule";
      return null;
    },
    explain: `u × v = ${f3(c)}, perpendicular to both u and v, with length equal to the parallelogram's area. (u × v) · w = det[u v w] = ${vol}${vol === 0 ? ": the three vectors lie in one plane" : `, so the box has volume ${Math.abs(vol)}`}.`,
  };
}

// ---------- Matrix space: coordinates in a non-standard basis ----------

export function matrixCoordsPuzzle(s: Settings, r: Rng): TablePuzzle {
  const R = opt(s, "range", 5, 3, 9);
  const m = randMat(r, 2, 2, -R, R);
  const d = m[1][1],
    c = m[1][0] - m[1][1],
    b = m[0][1] - m[1][0],
    a = m[0][0] - m[0][1];
  return {
    family: "table",
    task: `Write M = a·B₁ + b·B₂ + c·B₃ + d·B₄ in this basis of the 2 × 2 matrices. Fill in its coordinates.`,
    lines: [
      ...matLines("M", m),
      "B₁ = [1 0; 0 0]   B₂ = [1 1; 0 0]   B₃ = [1 1; 1 0]   B₄ = [1 1; 1 1]",
    ],
    corner: "",
    colHeads: ["a", "b", "c", "d"],
    rowHeads: ["coordinate"],
    cells: [[null, null, null, null]],
    answers: [[a, b, c, d]],
    why: (_r, col, given) =>
      given === [m[0][0], m[0][1], m[1][0], m[1][1]][col] &&
      given !== [a, b, c, d][col]
        ? "Those are coordinates in the standard basis Eᵢⱼ; in this basis each Bₖ adds to several entries"
        : null,
    explain: `M = ${a}B₁ + ${b}B₂ + ${c}B₃ + ${d}B₄. Work from B₄ backwards: only B₄ touches the bottom-right entry, so d = ${d}; then c = ${c}, b = ${b}, a = ${a}. The 2 × 2 matrices form a 4-dimensional space, and any 4 independent matrices are a basis.`,
  };
}

// ---------- Polynomial space: coordinates in {1, (x − 1), (x − 1)²} ----------

export function polyCoordsPuzzle(s: Settings, r: Rng): TablePuzzle {
  const a0 = int(r, -5, 5),
    a1 = int(r, -5, 5),
    a2 = nz(r, -3, 3);
  const c0 = a0 + a1 + a2,
    c1 = a1 + 2 * a2,
    c2 = a2;
  const p = [
    a2 === 1 ? "x²" : a2 === -1 ? "−x²" : `${String(a2).replace("-", "−")}x²`,
    a1
      ? `${a1 < 0 ? " − " : " + "}${Math.abs(a1) === 1 ? "" : Math.abs(a1)}x`
      : "",
    a0 ? `${a0 < 0 ? " − " : " + "}${Math.abs(a0)}` : "",
  ].join("");
  return {
    family: "table",
    task: `p(x) = ${p}. Write p = c₀·1 + c₁·(x − 1) + c₂·(x − 1)² and fill in its coordinates in this basis of P₂.`,
    corner: "",
    colHeads: ["c₀", "c₁", "c₂"],
    rowHeads: ["coordinate"],
    cells: [[null, null, null]],
    answers: [[c0, c1, c2]],
    why: (_r, col, given) =>
      given === [a0, a1, a2][col] && given !== [c0, c1, c2][col]
        ? "Those are the coordinates in the basis {1, x, x²}"
        : null,
    explain: `c₀ = p(1) = ${c0}, c₁ = p′(1) = ${c1}, c₂ = p″(1)/2 = ${c2} (a Taylor expansion about x = 1). P₂ is 3-dimensional, so any three independent polynomials of degree ≤ 2 form a basis.`,
  };
}

// ---------- Complex numbers on the plane ----------

export function complexPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const op = pick(s, "op", ["multiply", "add"] as const, "multiply");
  const R = opt(s, "range", 6, 5, 8);
  for (;;) {
    const z = smallVec(r),
      w = smallVec(r);
    const prod: Vec = [z[0] * w[0] - z[1] * w[1], z[0] * w[1] + z[1] * w[0]];
    const ans = op === "add" ? add(z, w) : prod;
    if (
      !inside(R, ans) ||
      eq(ans, z) ||
      eq(ans, w) ||
      (op === "multiply" && (eq(z, [1, 0]) || eq(w, [1, 0])))
    )
      continue;
    const name = (v: Vec) =>
      `${v[0]}${v[1] < 0 ? " − " : " + "}${Math.abs(v[1])}i`;
    return {
      family: "plane",
      range: R,
      axes: ["Re", "Im"],
      vectors: [
        { v: z, label: "z", tone: "cyan" },
        { v: w, label: "w", tone: "violet" },
      ],
      task: `z = ${name(z)} and w = ${name(w)}. Click ${op === "add" ? "z + w" : "z · w"} on the complex plane.`,
      check: (pt) => {
        if (eq(pt, ans)) return null;
        if (op === "multiply") {
          if (eq(pt, [z[0] * w[0] + z[1] * w[1], z[0] * w[1] + z[1] * w[0]]))
            return "Forgot that i² = −1";
          if (eq(pt, add(z, w))) return "Added instead of multiplying";
          if (eq(pt, [z[0] * w[0], z[1] * w[1]]))
            return "Multiplied the parts separately; use (a + bi)(c + di) = (ac − bd) + (ad + bc)i";
          if (eq(pt, [z[0] * w[0] + z[1] * w[1], z[1] * w[0] - z[0] * w[1]]))
            return "Multiplied by the conjugate of w";
        }
        return op === "add"
          ? "Add real parts and imaginary parts separately"
          : "(a + bi)(c + di) = (ac − bd) + (ad + bc)i";
      },
      answer: ans,
      hint:
        op === "multiply"
          ? "Multiplying by w scales lengths by |w| and turns by w's angle."
          : "Add tip to tail, like vectors.",
      explain:
        op === "add"
          ? `z + w = ${name(ans)}: complex addition is vector addition in ℝ².`
          : `z · w = ${name(ans)}. Geometrically the lengths multiply (|z·w| = |z|·|w|) and the angles add — multiplying by a complex number is a rotation plus a stretch, a linear map of ℂ as a real vector space.`,
    };
  }
}

// ---------- Direct sums and (oblique) projections ----------

function splitPuzzle(
  s: Settings,
  r: Rng,
  mode: "direct-sum" | "projection",
): PlanePuzzle {
  const R = opt(s, "range", 6, 5, 8);
  for (;;) {
    const u = smallVec(r),
      w = smallVec(r);
    if (cross(u, w) === 0 || dot(u, w) === 0) continue;
    const a = nz(r, -3, 3),
      b = nz(r, -3, 3);
    const pu = scale(a, u),
      pw = scale(b, w);
    const v = add(pu, pw);
    if (!inside(R, v, pu, pw)) continue;
    const orth = scale(dot(v, u) / dot(u, u), u);
    const check = (pt: Vec) => {
      if (eq(pt, pu)) return null;
      if (eq(pt, pw))
        return mode === "projection"
          ? "Gave the part along d; P keeps the part along the line L"
          : "That is the W-part of v";
      if (Math.abs(pt[0] - orth[0]) < 0.51 && Math.abs(pt[1] - orth[1]) < 0.51)
        return "Dropped a perpendicular (orthogonal projection); here the other part must lie along the second direction";
      return "Write v = a·u + b·w and keep the part along the line";
    };
    return {
      family: "plane",
      range: R,
      vectors: [
        { v: u, label: mode === "projection" ? "a" : "u", tone: "cyan" },
        { v: w, label: mode === "projection" ? "d" : "w", tone: "violet" },
        { v, label: mode === "projection" ? "p" : "v", tone: "gold" },
      ],
      lines: [u, w],
      task:
        mode === "projection"
          ? "P projects onto the line L through a, along the direction d (not perpendicular). Click P(p)."
          : "ℝ² = U ⊕ W, where U is the line through u and W the line through w. Click the U-part of v: the point u′ in U with v − u′ in W.",
      check,
      answer: pu,
      hint: "Slide v parallel to the second line until it reaches the first line.",
      explain:
        mode === "projection"
          ? `p = ${a}·a + ${b}·d, so P(p) = ${fv(pu)}. Points on L stay where they are, so applying P twice changes nothing: P² = P. Its range is L and its null space is the line through d.`
          : `v = ${fv(pu)} + ${fv(pw)} with ${fv(pu)} = ${a}u in U and ${fv(pw)} = ${b}w in W. Because U ∩ W = {0}, this split is unique — that is what U ⊕ W means.`,
    };
  }
}
export const directSumPuzzle = (s: Settings, r: Rng) =>
  splitPuzzle(s, r, "direct-sum");
export const obliqueProjectionPuzzle = (s: Settings, r: Rng) =>
  splitPuzzle(s, r, "projection");

// ---------- Rank–nullity ----------

export function rankNullityPuzzle(s: Settings, r: Rng): TablePuzzle {
  const m = opt(s, "rows", 3, 2, 4),
    n = opt(s, "cols", 4, 3, 5);
  for (;;) {
    const k = int(r, 1, Math.min(m, n) - (r() < 0.7 ? 1 : 0));
    const a = mmul(randMat(r, m, k, -2, 2), randMat(r, k, n, -2, 2));
    const rk = rank(a);
    if (rk === 0 || a.flat().some((x) => Math.abs(x) > 9)) continue;
    return {
      family: "table",
      task: `A is ${m} × ${n}, a map from ℝ${"⁰¹²³⁴⁵⁶⁷⁸⁹"[n]} to ℝ${"⁰¹²³⁴⁵⁶⁷⁸⁹"[m]}. Row-reduce it and fill in its rank (dimension of the range) and nullity (dimension of the null space).`,
      lines: matLines("A", a),
      corner: "",
      colHeads: ["value"],
      rowHeads: ["rank A", "nullity A"],
      cells: [[null], [null]],
      answers: [[rk], [n - rk]],
      why: (row, _c, given) => {
        if (row === 0 && given === m && rk < m)
          return "Counted the rows; the rank is the number of pivots after row reduction";
        if (row === 1 && given === m - rk)
          return "The nullity is n − rank, with n the number of columns";
        return null;
      },
      explain: `A has ${rk} pivot${rk === 1 ? "" : "s"}, so rank ${rk}; the ${n - rk} free variable${n - rk === 1 ? "" : "s"} give the null space, so nullity ${n - rk}. Rank–nullity: rank + nullity = ${n}, the dimension of the domain.`,
    };
  }
}

// ---------- Inverse ----------

export function inversePuzzle(s: Settings, r: Rng): TablePuzzle {
  const n = opt(s, "size", 2, 2, 3);
  let a: Mat;
  if (n === 2) {
    for (;;) {
      a = randMat(r, 2, 2, -4, 4);
      if (
        [1, -1, 2, -2].includes(det(a)) &&
        a.flat().filter((x) => x).length >= 3
      )
        break;
    }
  } else a = unimodular(r, 3, 3);
  const inv = inverse(a!);
  const d = det(a!);
  const adj = inv.map((row) => row.map((x) => x * d));
  return {
    family: "table",
    task: `Fill in A⁻¹ (fractions like 1/2 are fine). det A = ${d}.`,
    lines: matLines("A", a!),
    corner: "A⁻¹",
    rowHeads: idx(n),
    colHeads: idx(n),
    cells: tableOf(a!),
    answers: inv,
    why: (i, j, given) => {
      if (d !== 1 && Math.abs(given - adj[i][j]) < 1e-9)
        return "Forgot to divide by det A";
      if (n === 2 && given === a![i][j])
        return "For a 2 × 2 inverse, swap the diagonal entries and negate the off-diagonal ones";
      if (Math.abs(given - inv[j][i]) < 1e-9)
        return "Transposed the result: A⁻¹ = adj(A)/det A, and adj(A) is the transposed cofactor matrix";
      return null;
    },
    explain: `A⁻¹ = (1/det A)·adj(A): ${inv.map((row) => `[${row.map(fmtNum).join(" ")}]`).join(" ")}. Check: A·A⁻¹ = I. Gauss–Jordan elimination on [A | I] gives the same result.`,
  };
}

// ---------- Change of basis ----------

export function changeBasisPuzzle(s: Settings, r: Rng): TablePuzzle {
  const P = unimodular(r, 2, 2);
  const A = randMat(r, 2, 2, -3, 3);
  const B = mmul(mmul(inverse(P), A), P);
  const wrong = mmul(mmul(P, A), inverse(P));
  return {
    family: "table",
    task: `T has matrix A in the standard basis. B = {b₁, b₂} with b₁ = (${P[0][0]}, ${P[1][0]}), b₂ = (${P[0][1]}, ${P[1][1]}). Fill in [T]_B = P⁻¹AP, where P has b₁ and b₂ as columns.`,
    lines: [...matLines("A", A), ...matLines("P", P)],
    corner: "[T]_B",
    rowHeads: idx(2),
    colHeads: idx(2),
    cells: tableOf(A),
    answers: B,
    why: (i, j, given) =>
      Math.abs(given - wrong[i][j]) < 1e-9 && wrong[i][j] !== B[i][j]
        ? "Computed P·A·P⁻¹; with b₁, b₂ as P's columns the formula is P⁻¹·A·P"
        : given === A[i][j] && A[i][j] !== B[i][j]
          ? "Copied A; the matrix of T changes when the basis changes"
          : null,
    explain: `P⁻¹ = ${inverse(P)
      .map((row) => `[${row.map(fmtNum).join(" ")}]`)
      .join(
        " ",
      )}, and [T]_B = ${B.map((row) => `[${row.map(fmtNum).join(" ")}]`).join(" ")}. Column j of [T]_B holds the B-coordinates of T(bⱼ). Similar matrices like A and [T]_B share trace, determinant and eigenvalues.`,
  };
}

// ---------- Dual basis ----------

export function dualBasisPuzzle(s: Settings, r: Rng): TablePuzzle {
  const P = unimodular(r, 2, 2);
  const D = inverse(P);
  return {
    family: "table",
    task: `b₁ = (${P[0][0]}, ${P[1][0]}) and b₂ = (${P[0][1]}, ${P[1][1]}) form a basis of ℝ². Fill in the dual basis: fᵢ(x, y) = p·x + q·y with fᵢ(bⱼ) = 1 if i = j and 0 otherwise.`,
    corner: "",
    colHeads: ["p (× x)", "q (× y)"],
    rowHeads: ["f₁", "f₂"],
    cells: [
      [null, null],
      [null, null],
    ],
    answers: D,
    why: (i, j, given) =>
      given === P[j][i] && P[j][i] !== D[i][j]
        ? "Used the basis vector itself; f₁ must give 1 on b₁ and 0 on b₂, which is a row of P⁻¹"
        : null,
    explain: `The dual basis functionals are the rows of P⁻¹: f₁ = ${fmtNum(D[0][0])}x + ${fmtNum(D[0][1])}y, f₂ = ${fmtNum(D[1][0])}x + ${fmtNum(D[1][1])}y. fᵢ(v) is the i-th coordinate of v in the basis {b₁, b₂} — the coordinate functionals.`,
  };
}

// ---------- Trace and determinant ----------

export function detTracePuzzle(s: Settings, r: Rng): TablePuzzle {
  const n = opt(s, "size", 3, 2, 3);
  const a = randMat(r, n, n, -3, 3);
  const d = det(a),
    tr = range(n).reduce((t, i) => t + a[i][i], 0);
  const anti = n === 2 ? a[0][0] * a[1][1] + a[0][1] * a[1][0] : NaN;
  return {
    family: "table",
    task: "Fill in the trace and the determinant of A.",
    lines: matLines("A", a),
    corner: "",
    colHeads: ["value"],
    rowHeads: ["trace A", "det A"],
    cells: [[null], [null]],
    answers: [[tr], [d]],
    why: (row, _c, given) => {
      if (row === 1 && given === anti)
        return "The 2 × 2 determinant is ad − bc (subtract, don't add)";
      if (row === 1 && given === -d)
        return "Got the sign of a cofactor wrong (the pattern is + − +)";
      if (row === 0 && given === d)
        return "The trace is the sum of the diagonal entries";
      return null;
    },
    explain: `trace A = ${tr} (sum of the diagonal), det A = ${d}. det A is the factor by which A scales ${n === 2 ? "areas" : "volumes"}${d < 0 ? " (negative: A flips orientation)" : d === 0 ? " (zero: A squashes space flat, so it has no inverse)" : ""}; the trace and determinant are the sum and product of the eigenvalues.`,
  };
}

// ---------- Cayley–Hamilton ----------

export function cayleyPuzzle(s: Settings, r: Rng): TablePuzzle {
  const a = randMat(r, 2, 2, -3, 3);
  const tr = a[0][0] + a[1][1],
    d = det(a);
  const a2 = mmul(a, a);
  return {
    family: "table",
    task: "Fill in the characteristic polynomial p(λ) = λ² + c₁λ + c₀ of A, then use p(A) = 0 to get A² = −c₁A − c₀I.",
    lines: matLines("A", a),
    corner: "",
    colHeads: ["value"],
    rowHeads: ["c₁", "c₀", "(A²)₁₁", "(A²)₁₂", "(A²)₂₁", "(A²)₂₂"],
    cells: range(6).map(() => [null]),
    answers: [[-tr], [d], [a2[0][0]], [a2[0][1]], [a2[1][0]], [a2[1][1]]],
    why: (row, _c, given) => {
      if (row === 0 && given === tr)
        return "c₁ = −trace A (p(λ) = λ² − (trace)λ + det)";
      if (
        row >= 2 &&
        given === a[Math.floor((row - 2) / 2)][(row - 2) % 2] ** 2
      )
        return "Squared the entries; A² is the matrix product A·A";
      return null;
    },
    explain: `p(λ) = λ² ${-tr < 0 ? "−" : "+"} ${Math.abs(tr)}λ ${d < 0 ? "−" : "+"} ${Math.abs(d)}. Cayley–Hamilton says p(A) = 0, so A² = ${tr}A ${d < 0 ? "+" : "−"} ${Math.abs(d)}I = ${a2.map((row) => `[${row.join(" ")}]`).join(" ")}. Every higher power of A can be reduced the same way.`,
  };
}

// ---------- Diagonalization ----------

export function diagonalizePuzzle(s: Settings, r: Rng): TablePuzzle {
  const P = unimodular(r, 2, 2);
  const l1 = nz(r, -3, 3);
  let l2 = nz(r, -3, 3);
  while (l2 === l1) l2 = nz(r, -3, 3);
  const D = [
    [l1, 0],
    [0, l2],
  ];
  const A = mmul(mmul(P, D), inverse(P));
  const wrong = mmul(mmul(inverse(P), D), P);
  return {
    family: "table",
    task: `The eigenvectors of A are the columns of P, with eigenvalues ${l1} and ${l2} (in D). Fill in A = P·D·P⁻¹.`,
    lines: [...matLines("P", P), ...matLines("D", D)],
    corner: "A",
    rowHeads: idx(2),
    colHeads: idx(2),
    cells: tableOf(D),
    answers: A,
    why: (i, j, given) =>
      Math.abs(given - wrong[i][j]) < 1e-9 && wrong[i][j] !== A[i][j]
        ? "Multiplied in the wrong order: A = P·D·P⁻¹"
        : null,
    explain: `A = ${A.map((row) => `[${row.map(fmtNum).join(" ")}]`).join(" ")}. Check: A·(column of P) = λ·(that column). With A = PDP⁻¹, powers are easy: Aᵏ = P·Dᵏ·P⁻¹, and Dᵏ just raises the diagonal to the k-th power.`,
  };
}

// ---------- Jordan form ----------

export function jordanPuzzle(s: Settings, r: Rng): TablePuzzle {
  const n = opt(s, "size", 6, 3, 8);
  for (;;) {
    const sizes: number[] = [];
    let left = n;
    while (left > 0) {
      const b = int(r, 1, Math.min(left, 4));
      sizes.push(b);
      left -= b;
    }
    const big = Math.max(...sizes);
    if (big < 2 || sizes.length < 2) continue;
    const dk = range(big).map((k) =>
      sizes.reduce((t, b) => t + Math.min(b, k + 1), 0),
    );
    const count = range(big).map(
      (k) => sizes.filter((b) => b === k + 1).length,
    );
    const lam = int(r, -2, 3);
    return {
      family: "table",
      task: `A is ${n} × ${n} with the single eigenvalue λ = ${lam}. From the null-space dimensions below, fill in how many Jordan blocks of each size A has.`,
      lines: dk.map(
        (d, k) => `dim N((A − ${lam}I)${k ? "⁰¹²³⁴⁵⁶⁷⁸⁹"[k + 1] : ""}) = ${d}`,
      ),
      corner: "size",
      rowHeads: range(big).map((k) => String(k + 1)),
      colHeads: ["number of blocks"],
      cells: range(big).map(() => [null]),
      answers: count.map((c) => [c]),
      why: (k, _c, given) => {
        const atLeast = dk[k] - (k ? dk[k - 1] : 0);
        if (given === atLeast && atLeast !== count[k])
          return `dₖ − dₖ₋₁ counts the blocks of size at least ${k + 1}, not exactly ${k + 1}`;
        if (given === dk[k])
          return "dim N((A − λI)ᵏ) adds up block sizes; take differences";
        return null;
      },
      explain: `Blocks of size ≥ k: dₖ − dₖ₋₁ = ${dk.map((d, k) => d - (k ? dk[k - 1] : 0)).join(", ")}. Exactly k: subtract the next one. Sizes: ${[...sizes].sort((a, b) => b - a).join(", ")} (they add up to ${n}). dim N(A − λI) = ${dk[0]} is the number of blocks — the number of independent eigenvectors.`,
    };
  }
}

// ---------- Matrix norms ----------

export function normsPuzzle(s: Settings, r: Rng): TablePuzzle {
  const n = opt(s, "size", 3, 2, 3);
  const a = randMat(r, n, n, -5, 5);
  const col = Math.max(
    ...range(n).map((j) => a.reduce((t, row) => t + Math.abs(row[j]), 0)),
  );
  const row = Math.max(
    ...a.map((rw) => rw.reduce((t, x) => t + Math.abs(x), 0)),
  );
  const fro = a.flat().reduce((t, x) => t + x * x, 0);
  const signedCol = Math.max(
    ...range(n).map((j) => a.reduce((t, rw) => t + rw[j], 0)),
  );
  const signedRow = Math.max(...a.map((rw) => rw.reduce((t, x) => t + x, 0)));
  return {
    family: "table",
    task: "Fill in the matrix norms of A: ‖A‖₁ (largest column sum of |entries|), ‖A‖∞ (largest row sum of |entries|) and ‖A‖_F² (sum of squares of all entries).",
    lines: matLines("A", a),
    corner: "",
    colHeads: ["value"],
    rowHeads: ["‖A‖₁", "‖A‖∞", "‖A‖_F²"],
    cells: [[null], [null], [null]],
    answers: [[col], [row], [fro]],
    why: (k, _c, given) => {
      if (k === 0 && given === row && row !== col)
        return "Mixed up: ‖A‖₁ uses column sums, ‖A‖∞ row sums";
      if (k === 1 && given === col && row !== col)
        return "Mixed up: ‖A‖∞ uses row sums, ‖A‖₁ column sums";
      if ((k === 0 && given === signedCol) || (k === 1 && given === signedRow))
        return "Take absolute values before adding";
      return null;
    },
    explain: `‖A‖₁ = ${col}, ‖A‖∞ = ${row}, ‖A‖_F = √${fro}. ‖A‖₁ and ‖A‖∞ are the largest factor by which A can stretch a vector, measured in the 1-norm and the ∞-norm; the 2-norm's version is the largest singular value.`,
  };
}

// ---------- Inner products: orthogonality ----------

export function orthogonalPointPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const R = opt(s, "range", 6, 4, 8);
  let u = smallVec(r, -3, 3);
  while (u[0] === 0 || u[1] === 0) u = smallVec(r, -3, 3);
  const g = gcd(u[0], u[1]);
  const ans = scale(1 / g, perp(u)) as Vec;
  return {
    family: "plane",
    range: R,
    vectors: [{ v: u, label: "u", tone: "cyan" }],
    task: `Click any non-zero point x with ⟨u, x⟩ = 0, that is, orthogonal to u = ${fv(u)}.`,
    check: (pt) => {
      if (!pt[0] && !pt[1])
        return "The zero vector is orthogonal to everything; pick a non-zero point";
      if (dot(pt, u) === 0) return null;
      if (cross(pt, u) === 0)
        return "That point is along u, not perpendicular to it";
      return `⟨u, x⟩ = ${u[0]}·${pt[0]} + ${u[1]}·${pt[1]} = ${dot(u, pt)}, not 0`;
    },
    answer: ans,
    hint: "Swap the two coordinates of u and change one sign.",
    explain: `The orthogonal complement of u is the line through ${fv(ans)}: every multiple of it has ⟨u, x⟩ = 0. In general cos θ = ⟨u, x⟩ / (‖u‖‖x‖), so a zero inner product means a right angle.`,
  };
}

// ---------- Gram–Schmidt ----------

export function gramSchmidtPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const R = opt(s, "range", 6, 5, 8);
  for (;;) {
    const v1 = smallVec(r);
    const k = nz(r, -2, 2),
      t = nz(r, -2, 2);
    const u2 = scale(t, perp(v1));
    const v2 = add(scale(k, v1), u2);
    if (!inside(R, v2, u2, scale(k, v1))) continue;
    return {
      family: "plane",
      range: R,
      vectors: [
        { v: v1, label: "v₁", tone: "cyan" },
        { v: v2, label: "v₂", tone: "violet" },
      ],
      lines: [v1],
      task: "Gram–Schmidt, step 2: click u₂ = v₂ − proj_{v₁}(v₂), the part of v₂ orthogonal to v₁.",
      check: (pt) => {
        if (eq(pt, u2)) return null;
        if (eq(pt, scale(k, v1)))
          return "That is the projection proj_{v₁}(v₂); Gram–Schmidt keeps what is left after removing it";
        if (eq(pt, v2))
          return "Left v₂ unchanged; subtract its component along v₁";
        if (dot(pt, v1) === 0)
          return "Right direction, wrong length: subtract exactly proj_{v₁}(v₂)";
        return "u₂ must be orthogonal to v₁";
      },
      answer: u2,
      hint: `proj_{v₁}(v₂) = (⟨v₂, v₁⟩ / ⟨v₁, v₁⟩)·v₁ = ${k}·v₁.`,
      explain: `proj = (${dot(v2, v1)} / ${dot(v1, v1)})·v₁ = ${fv(scale(k, v1))}, so u₂ = ${fv(v2)} − ${fv(scale(k, v1))} = ${fv(u2)}. u₁ = v₁ and u₂ are orthogonal and span the same plane; dividing each by its length makes the basis orthonormal.`,
    };
  }
}

// ---------- Orthogonal (unitary) operators ----------

const ORTHO: { m: M2; name: string }[] = [
  {
    m: [
      [0, -1],
      [1, 0],
    ],
    name: "rotation by 90°",
  },
  {
    m: [
      [-1, 0],
      [0, -1],
    ],
    name: "rotation by 180°",
  },
  {
    m: [
      [0, 1],
      [-1, 0],
    ],
    name: "rotation by 270°",
  },
  {
    m: [
      [1, 0],
      [0, -1],
    ],
    name: "reflection in the x-axis",
  },
  {
    m: [
      [-1, 0],
      [0, 1],
    ],
    name: "reflection in the y-axis",
  },
  {
    m: [
      [0, 1],
      [1, 0],
    ],
    name: "reflection in the line y = x",
  },
  {
    m: [
      [0, -1],
      [-1, 0],
    ],
    name: "reflection in the line y = −x",
  },
];

export function orthogonalMapPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const R = opt(s, "range", 5, 4, 8);
  const q = ORTHO[int(r, 0, ORTHO.length - 1)];
  let p = smallVec(r, -3, 3);
  const apply = (m: M2, x: Vec): Vec => [dot(m[0], x), dot(m[1], x)];
  while (eq(apply(q.m, p), p)) p = smallVec(r, -3, 3);
  const img = apply(q.m, p);
  const qt: M2 = [
    [q.m[0][0], q.m[1][0]],
    [q.m[0][1], q.m[1][1]],
  ];
  return {
    family: "plane",
    range: R,
    vectors: [{ v: p, label: "p", tone: "gold" }],
    matrix: q.m,
    task: `Q is orthogonal (QᵀQ = I). Click Q·p for p = ${fv(p)}.`,
    check: (pt) => {
      if (eq(pt, img)) return null;
      if (eq(pt, apply(qt, p)))
        return "Applied Qᵀ = Q⁻¹, the inverse map (the other way round)";
      if (dot(pt, pt) !== dot(p, p))
        return "An orthogonal map keeps lengths: Q·p must be as long as p";
      return "Q·p = p₁ × (first column) + p₂ × (second column)";
    },
    answer: img,
    hintVectors: [
      { v: [q.m[0][0], q.m[1][0]], label: "Q·e₁", tone: "cyan" },
      { v: [q.m[0][1], q.m[1][1]], label: "Q·e₂", tone: "violet" },
    ],
    hint: "The columns of Q show where e₁ and e₂ go.",
    explain: `Q is the ${q.name}; Q·p = ${fv(img)}. Its adjoint Qᵀ is its inverse, so it preserves inner products, lengths and angles. Symmetric (Hermitian) operators have Aᵀ = A instead; orthogonal (unitary) and symmetric matrices are both normal: AᵀA = AAᵀ.`,
  };
}

// ---------- Bilinear forms: symmetric + skew parts ----------

export function bilinearPuzzle(s: Settings, r: Rng): TablePuzzle {
  for (;;) {
    const a = randMat(r, 2, 2, -4, 4);
    if ((a[0][1] - a[1][0]) % 2 !== 0 || a[0][1] === a[1][0]) continue;
    const S = [
      [a[0][0], (a[0][1] + a[1][0]) / 2],
      [(a[0][1] + a[1][0]) / 2, a[1][1]],
    ];
    const K = [
      [0, (a[0][1] - a[1][0]) / 2],
      [(a[1][0] - a[0][1]) / 2, 0],
    ];
    return {
      family: "table",
      task: "The bilinear form B(x, y) = xᵀAy splits into a symmetric part S = (A + Aᵀ)/2 and a skew-symmetric part K = (A − Aᵀ)/2. Fill in S and K.",
      lines: matLines("A", a),
      corner: "",
      rowHeads: ["S row 1", "S row 2", "K row 1", "K row 2"],
      colHeads: ["col 1", "col 2"],
      cells: range(4).map(() => [null, null]),
      answers: [...S, ...K],
      why: (row, c, given) => {
        const i = row % 2;
        if (given === a[i][c] && given !== [...S, ...K][row][c])
          return "That entry is A's own; average A with its transpose";
        if (row >= 2 && i === c && given !== 0)
          return "A skew-symmetric matrix has zeros on its diagonal";
        return null;
      },
      explain: `S = [${S.map((x) => x.join(" ")).join("; ")}], K = [${K.map((x) => x.join(" ")).join("; ")}], and A = S + K. B(x, x) = xᵀSx only depends on S, because a skew form always gives B(x, x) = 0.`,
    };
  }
}

// ---------- Quadratic forms ----------

export function quadraticPuzzle(s: Settings, r: Rng): TablePuzzle {
  const a = nz(r, -4, 4),
    c = nz(r, -4, 4);
  const b = 2 * int(r, -3, 3);
  const M = [
    [a, b / 2],
    [b / 2, c],
  ];
  const d = a * c - (b * b) / 4;
  const kind =
    d > 0
      ? a > 0
        ? "positive definite (a bowl)"
        : "negative definite (an upside-down bowl)"
      : d < 0
        ? "indefinite (a saddle)"
        : "semidefinite (a trough)";
  const term = (k: number, v: string, first = false) =>
    k === 0
      ? ""
      : `${k < 0 ? (first ? "−" : " − ") : first ? "" : " + "}${Math.abs(k) === 1 ? "" : Math.abs(k)}${v}`;
  const q = `${term(a, "x²", true)}${term(b, "xy")}${term(c, "y²")}`;
  return {
    family: "table",
    task: `q(x, y) = ${q}. Fill in the symmetric matrix M with q = [x y]·M·[x y]ᵀ, and det M.`,
    corner: "",
    rowHeads: ["M row 1", "M row 2", "det M"],
    colHeads: ["col 1", "col 2"],
    cells: [
      [null, null],
      [null, null],
      [null, ""],
    ],
    answers: [
      [a, b / 2],
      [b / 2, c],
      [d, null],
    ],
    why: (row, col, given) => {
      if (row < 2 && row !== col && given === b)
        return "The xy coefficient is split in half between the two off-diagonal entries";
      if (row === 2 && given === a * c - b * b)
        return "Use the off-diagonal entries b/2 in det M, not b";
      return null;
    },
    explain: `M = [${M.map((x) => x.map(fmtNum).join(" ")).join("; ")}], det M = ${fmtNum(d)}. With det M ${d > 0 ? "> 0" : d < 0 ? "< 0" : "= 0"}${d > 0 ? ` and a ${a > 0 ? "> 0" : "< 0"}` : ""}, q is ${kind}: the eigenvalues of M ${d > 0 ? "have the same sign" : d < 0 ? "have opposite signs" : "include 0"}.`,
  };
}
