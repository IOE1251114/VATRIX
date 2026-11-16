/* Linear-algebra puzzles on the integer grid: linear combinations, where a matrix sends a point,
 * eigenvector directions and orthogonal projection. Every answer is a grid point. */
import {
  int,
  opt,
  type PlanePuzzle,
  type Rng,
  type Settings,
  type Vec,
} from "./core";

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const scale = (k: number, a: Vec): Vec => [k * a[0], k * a[1]];
const eq = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const cross = (a: Vec, b: Vec) => a[0] * b[1] - a[1] * b[0];
const mul = (m: [Vec, Vec], x: Vec): Vec => [dot(m[0], x), dot(m[1], x)];
const transposed = (m: [Vec, Vec]): [Vec, Vec] => [
  [m[0][0], m[1][0]],
  [m[0][1], m[1][1]],
];
const inside = (range: number, ...vs: Vec[]) =>
  vs.every((v) => Math.abs(v[0]) <= range && Math.abs(v[1]) <= range);
export const fmtVec = (v: Vec) => `(${v[0]}, ${v[1]})`;
const coef = (k: number) =>
  k === 1 ? "" : k === -1 ? "−" : String(k).replace("-", "−");
const smallVec = (r: Rng, lo = -2, hi = 2): Vec => {
  for (;;) {
    const v: Vec = [int(r, lo, hi), int(r, lo, hi)];
    if (v[0] || v[1]) return v;
  }
};
const nonZero = (r: Rng, k = 2) => {
  const n = int(r, 1, k);
  return r() < 0.5 ? -n : n;
};

export function combinationPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const range = opt(s, "range", 6, 4, 8);
  let u: Vec = [1, 0],
    v: Vec = [0, 1],
    a = 1,
    b = 1,
    t: Vec = [1, 1];
  for (let tries = 0; tries < 400; tries++) {
    u = smallVec(r);
    v = smallVec(r);
    a = nonZero(r);
    b = nonZero(r);
    t = add(scale(a, u), scale(b, v));
    if (cross(u, v) !== 0 && a !== b && inside(range, u, v, t)) break;
  }
  const swapped = add(scale(b, u), scale(a, v));
  const signs = [
    add(scale(a, u), scale(-b, v)),
    add(scale(-a, u), scale(b, v)),
    scale(-1, t),
  ];
  const expr = `${coef(a)}u ${b < 0 ? "−" : "+"} ${coef(Math.abs(b))}v`;
  return {
    family: "plane",
    range,
    vectors: [
      { v: u, label: "u", tone: "cyan" },
      { v, label: "v", tone: "violet" },
    ],
    task: `Click the point ${expr}.`,
    check: (pt) => {
      if (eq(pt, t)) return null;
      if (eq(pt, swapped)) return "Swapped the two coefficients";
      if (signs.some((x) => eq(pt, x))) return "Got a sign wrong";
      if (eq(pt, add(u, v))) return "Added u and v without scaling them";
      return "Scale u and v first, then add them tip to tail";
    },
    answer: t,
    hint: `Walk ${a} × u from the origin, then ${b} × v from there.`,
    explain: `${a} · ${fmtVec(u)} + ${b} · ${fmtVec(v)} = ${fmtVec(scale(a, u))} + ${fmtVec(scale(b, v))} = ${fmtVec(t)}.`,
  };
}

export function transformPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const range = opt(s, "range", 6, 4, 8);
  let m: [Vec, Vec] = [
      [1, 0],
      [0, 1],
    ],
    p: Vec = [1, 1],
    img: Vec = [1, 1];
  for (let tries = 0; tries < 400; tries++) {
    m = [
      [int(r, -2, 2), int(r, -2, 2)],
      [int(r, -2, 2), int(r, -2, 2)],
    ];
    p = smallVec(r);
    img = mul(m, p);
    const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    const tImg = mul(transposed(m), p);
    if (det !== 0 && !eq(img, p) && !eq(img, tImg) && inside(range, img, p))
      break;
  }
  const c1: Vec = [m[0][0], m[1][0]],
    c2: Vec = [m[0][1], m[1][1]];
  return {
    family: "plane",
    range,
    vectors: [{ v: p, label: "p", tone: "gold" }],
    matrix: m,
    task: `Click the point where A sends p = ${fmtVec(p)}.`,
    check: (pt) => {
      if (eq(pt, img)) return null;
      if (eq(pt, mul(transposed(m), p)))
        return "Used the rows of A as if they were its columns (multiplied by Aᵀ)";
      if (eq(pt, p)) return "Left p where it was";
      return "A·p is p₁ × (first column) + p₂ × (second column)";
    },
    answer: img,
    hintVectors: [
      { v: c1, label: "A·e₁", tone: "cyan" },
      { v: c2, label: "A·e₂", tone: "violet" },
    ],
    hint: `The columns of A are where e₁ and e₂ land. A·p = ${p[0]} × ${fmtVec(c1)} + ${p[1]} × ${fmtVec(c2)}.`,
    explain: `A·p = ${p[0]} · ${fmtVec(c1)} + ${p[1]} · ${fmtVec(c2)} = ${fmtVec(img)}.`,
  };
}

export function eigenPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const range = opt(s, "range", 6, 4, 8);
  let m: [Vec, Vec] = [
      [2, 0],
      [0, 3],
    ],
    d1: Vec = [1, 0],
    d2: Vec = [0, 1],
    l1 = 2,
    l2 = 3;
  for (let tries = 0; tries < 400; tries++) {
    // A = P·D·P⁻¹ with an integer P of determinant 1, so A and P⁻¹ are integer too.
    const k = int(r, -2, 2),
      j = int(r, -2, 2);
    const P: [Vec, Vec] = [
      [1 + k * j, k],
      [j, 1],
    ];
    const lams = [-2, -1, 1, 2, 3];
    l1 = lams[int(r, 0, 4)];
    l2 = lams[int(r, 0, 4)];
    if (l1 === l2) continue;
    const inv: [Vec, Vec] = [
      [1, -k],
      [-j, 1 + k * j],
    ];
    const PD: [Vec, Vec] = [
      [P[0][0] * l1, P[0][1] * l2],
      [P[1][0] * l1, P[1][1] * l2],
    ];
    const A: [Vec, Vec] = [
      [dot(PD[0], [inv[0][0], inv[1][0]]), dot(PD[0], [inv[0][1], inv[1][1]])],
      [dot(PD[1], [inv[0][0], inv[1][0]]), dot(PD[1], [inv[0][1], inv[1][1]])],
    ];
    if (
      A.flat().every((x) => Math.abs(x) <= 6) &&
      (A[0][1] !== 0 || A[1][0] !== 0)
    ) {
      m = A;
      d1 = [P[0][0], P[1][0]];
      d2 = [P[0][1], P[1][1]];
      break;
    }
  }
  return {
    family: "plane",
    range,
    vectors: [],
    matrix: m,
    task: "Click any non-zero point x that is an eigenvector of A: A·x must lie on the same line through the origin as x.",
    check: (pt) => {
      if (!pt[0] && !pt[1])
        return "The zero vector never counts as an eigenvector";
      return cross(pt, mul(m, pt)) === 0
        ? null
        : "A·x points along a different line from x, so x is not an eigenvector";
    },
    answer: d1,
    preview: (pt) => mul(m, pt),
    hint: "With the hint on, the arrow shows A·x for the point under your pointer. Look for a point where the arrow stays on x's own line.",
    explain: `The eigenvectors of A lie on two lines: through ${fmtVec(d1)} with λ = ${l1}, and through ${fmtVec(d2)} with λ = ${l2}. On those lines A only stretches or flips: A·x = λx.`,
  };
}

export function projectionPuzzle(s: Settings, r: Rng): PlanePuzzle {
  const range = opt(s, "range", 6, 4, 8);
  let u: Vec = [1, 0],
    p: Vec = [2, 1],
    proj: Vec = [2, 0],
    k = 2;
  for (let tries = 0; tries < 400; tries++) {
    u = smallVec(r);
    k = nonZero(r, 3);
    const side = nonZero(r);
    const perp = scale(side, [-u[1], u[0]]);
    proj = scale(k, u);
    p = add(proj, perp);
    if (inside(range, p, proj, perp)) break;
  }
  const uu = dot(u, u),
    pu = dot(p, u);
  return {
    family: "plane",
    range,
    vectors: [
      { v: u, label: "u", tone: "cyan" },
      { v: p, label: "p", tone: "gold" },
    ],
    lines: [u],
    task: "Click the orthogonal projection of p onto the line through u.",
    check: (pt) => {
      if (eq(pt, proj)) return null;
      if (eq(pt, add(p, scale(-1, proj))))
        return "Picked the perpendicular part instead of the projection";
      if (uu !== 1 && eq(pt, scale(pu, u))) return "Forgot to divide by u·u";
      if (eq(pt, p)) return "That is p itself";
      return "Drop a perpendicular from p to the line: its foot is the projection";
    },
    answer: proj,
    hint: `proj = (p·u / u·u) u. Here p·u = ${pu} and u·u = ${uu}.`,
    explain: `proj = (p·u / u·u) u = (${pu} / ${uu}) · ${fmtVec(u)} = ${fmtVec(proj)}. What is left, p − proj = ${fmtVec(add(p, scale(-1, proj)))}, is perpendicular to u.`,
  };
}
