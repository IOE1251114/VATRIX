import { describe, expect, it } from "vitest";
import { checkGroup, ringSummary, structures } from "./algebra";
import {
  charPoly,
  classifyOperator,
  columnSpace,
  cx,
  definiteness,
  det,
  eigen,
  fmt,
  formatPoly,
  gramSchmidt,
  inverse,
  isDiagonalizable,
  jordanBlocks,
  jordanMatrix,
  leastSquaresLine,
  matrixNorms,
  minimalPoly,
  mul,
  nullSpace,
  polyAt,
  projectionMatrix,
  rank,
  rrefSteps,
  skewPart,
  symPart,
  dot,
} from "./linalg";

describe("Unit I — algebraic structures", () => {
  it("knows which ℤₙ structures are groups and fields", () => {
    expect(checkGroup(structures(6).add, 6).isGroup).toBe(true);
    expect(checkGroup(structures(6).mul, 6).isGroup).toBe(false);
    expect(checkGroup(structures(7).units, 7).isGroup).toBe(true);
    expect(checkGroup(structures(6).units, 6).isGroup).toBe(false);
    expect(ringSummary(7).field).toBe(true);
    expect(ringSummary(6).zeroDivisors).toContainEqual([2, 3]);
  });
  it("formats numbers as integers and small fractions", () => {
    expect(fmt(0.5)).toBe("1/2");
    expect(fmt(-2)).toBe("−2");
    expect(fmt(1 / 3)).toBe("1/3");
  });
});

describe("Unit II — linear transformations", () => {
  const A = [
    [1, 2, 1, 0],
    [2, 4, 0, 2],
    [3, 6, 1, 2],
  ];
  it("satisfies rank–nullity and finds bases", () => {
    expect(rank(A)).toBe(2);
    const N = nullSpace(A);
    expect(N.length).toBe(2);
    for (const v of N) for (const r of A) expect(dot(r, v)).toBeCloseTo(0);
    expect(columnSpace(A).length).toBe(2);
    expect(rrefSteps(A).R[0]).toEqual([1, 2, 0, 1]);
  });
  it("inverts with Gauss–Jordan and detects singular matrices", () => {
    const M = [
      [2, 1],
      [5, 3],
    ];
    expect(inverse(M)).toEqual([
      [3, -1],
      [-5, 2],
    ]);
    expect(
      inverse([
        [1, 2],
        [2, 4],
      ]),
    ).toBeNull();
  });
  it("builds an orthogonal projection that is idempotent", () => {
    const P = projectionMatrix([[1], [1]])!;
    expect(P).toEqual([
      [0.5, 0.5],
      [0.5, 0.5],
    ]);
    expect(mul(P, P)).toEqual(P);
  });
});

describe("Unit III — eigen-theory", () => {
  it("computes determinants, characteristic polynomials and Cayley–Hamilton", () => {
    const A = [
      [2, 1, 0],
      [1, 3, 1],
      [0, 1, 4],
    ];
    expect(det(A)).toBeCloseTo(18);
    const p = charPoly(A);
    expect(p[0]).toBe(1);
    expect(p[1]).toBeCloseTo(-9);
    expect(
      polyAt(p, A)
        .flat()
        .every((x) => Math.abs(x) < 1e-9),
    ).toBe(true);
    expect(formatPoly([1, -5, 6])).toBe("λ² − 5λ + 6");
  });
  it("finds eigenvalues, multiplicities and diagonalizability", () => {
    const e = eigen([
      [4, 1],
      [2, 3],
    ]);
    expect(e.real.map((x) => x.value)).toEqual([5, 2]);
    expect(
      isDiagonalizable([
        [1, 1],
        [0, 1],
      ]),
    ).toBe(false);
    expect(
      eigen([
        [0, -1],
        [1, 0],
      ]).complex.length,
    ).toBe(2);
  });
  it("finds minimal polynomials and Jordan forms", () => {
    expect(
      minimalPoly([
        [2, 0],
        [0, 2],
      ]),
    ).toEqual([1, -2]);
    expect(
      minimalPoly([
        [2, 1],
        [0, 2],
      ]),
    ).toEqual([1, -4, 4]);
    const A = [
      [3, 1, 0],
      [0, 3, 0],
      [0, 0, 3],
    ];
    expect(jordanBlocks(A)).toEqual([{ value: 3, sizes: [2, 1] }]);
    expect(jordanMatrix(A)).toEqual(A);
  });
  it("computes matrix norms", () => {
    const n = matrixNorms([
      [1, -2],
      [3, 4],
    ]);
    expect(n.one).toBe(6);
    expect(n.inf).toBe(7);
    expect(n.fro).toBeCloseTo(Math.sqrt(30));
    expect(
      matrixNorms([
        [3, 0],
        [0, -5],
      ]).two,
    ).toBeCloseTo(5);
  });
});

describe("Unit IV — inner product spaces", () => {
  it("orthonormalises with Gram–Schmidt and skips dependent vectors", () => {
    const { q } = gramSchmidt([
      [1, 1, 0],
      [1, 0, 1],
      [2, 1, 1],
    ]);
    expect(q.length).toBe(2);
    expect(dot(q[0], q[1])).toBeCloseTo(0);
    expect(dot(q[1], q[1])).toBeCloseTo(1);
  });
  it("fits a least-squares line", () => {
    const l = leastSquaresLine([
      [0, 1],
      [1, 3],
      [2, 5],
    ])!;
    expect(l.m).toBeCloseTo(2);
    expect(l.c).toBeCloseTo(1);
  });
  it("classifies self-adjoint, unitary and normal operators", () => {
    const H = [
      [cx(2), cx(1, -1)],
      [cx(1, 1), cx(3)],
    ];
    expect(classifyOperator(H).selfAdjoint).toBe(true);
    const R = [
      [cx(0), cx(-1)],
      [cx(1), cx(0)],
    ];
    const c = classifyOperator(R);
    expect(c.unitary && c.normal && !c.selfAdjoint).toBe(true);
    expect(
      classifyOperator([
        [cx(1), cx(1)],
        [cx(0), cx(1)],
      ]).normal,
    ).toBe(false);
  });
});

describe("Unit V — bilinear and quadratic forms", () => {
  it("splits a form into symmetric and skew parts", () => {
    const M = [
      [1, 4],
      [2, 3],
    ];
    expect(symPart(M)).toEqual([
      [1, 3],
      [3, 3],
    ]);
    expect(skewPart(M)).toEqual([
      [0, 1],
      [-1, 0],
    ]);
  });
  it("classifies quadratic forms", () => {
    expect(
      definiteness([
        [2, -1],
        [-1, 2],
      ]).kind,
    ).toBe("positive definite");
    expect(
      definiteness([
        [1, 2],
        [2, 1],
      ]).kind,
    ).toBe("indefinite");
    expect(
      definiteness([
        [1, 1],
        [1, 1],
      ]).kind,
    ).toBe("positive semidefinite");
    expect(
      definiteness([
        [2, -1],
        [-1, 2],
      ]).minors,
    ).toEqual([2, 3]);
  });
});

describe("Linear Algebra values used in practice", () => {
  it("computes the values its practice questions rely on", () => {
    expect(
      inverse([
        [2, 1],
        [5, 3],
      ])![0][1],
    ).toBe(-1);
    expect(
      eigen([
        [4, 1],
        [2, 3],
      ]).real[0].value,
    ).toBe(5);
    expect(
      matrixNorms([
        [1, -2],
        [3, 4],
      ]).one,
    ).toBe(6);
    expect(
      gramSchmidt([
        [1, 0],
        [3, 4],
      ]).q[1][1],
    ).toBeCloseTo(1);
    expect(
      minimalPoly([
        [5, 0, 0],
        [0, 5, 0],
        [0, 0, 5],
      ]).length - 1,
    ).toBe(1);
    expect(
      jordanBlocks([
        [4, 1, 0],
        [0, 4, 0],
        [0, 0, 4],
      ])[0].sizes.length,
    ).toBe(2);
  });
});

describe("Vector spaces beyond the plane", async () => {
  const s = await import("./spaces");
  it("handles ℝ³ spans and the cross product", () => {
    expect(s.cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(
      s.spanShape([
        [1, 2, 3],
        [2, 4, 6],
      ]).shape,
    ).toBe("a line");
    expect(
      s.spanShape([
        [1, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ]).rank,
    ).toBe(2);
    expect(s.triple([1, 0, 0], [0, 2, 0], [0, 0, 3])).toBe(6);
  });
  it("tests matrix subspaces", () => {
    const sym = s.matSubspaces.find((m) => m.id === "sym")!;
    expect(
      sym.test([
        [1, 2],
        [2, 5],
      ]),
    ).toBe(true);
    expect(sym.basis.length).toBe(3);
    expect(
      s.matSubspaces
        .find((m) => m.id === "trace0")!
        .test([
          [3, 1],
          [0, -3],
        ]),
    ).toBe(true);
    expect(
      s.vecOf([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([1, 2, 3, 4]);
  });
  it("treats polynomials as vectors", () => {
    const p = [1, -3, 0, 2]; // 1 − 3x + 2x³
    expect(s.polyEval(p, 2)).toBe(11);
    expect(s.derivative(p)).toEqual([-3, 0, 6, 0]);
    expect(s.polyString(p)).toBe("1 − 3x + 2x³");
    const D = s.derivativeMatrix(3);
    expect(D.map((r) => r.reduce((acc, a, j) => acc + a * p[j], 0))).toEqual([
      -3, 0, 6, 0,
    ]);
    // 1 − 3x + 2x³ around c = 1: p(1) = 0, p'(1) = 3, p''(1)/2 = 6, p'''(1)/6 = 2.
    expect(s.shiftedCoords(p, 1)).toEqual([0, 3, 6, 2]);
  });
  it("uses the complex inner product", () => {
    const u = [cx(1, 1), cx(0, 2)];
    expect(s.cnorm(u)).toBeCloseTo(Math.sqrt(6));
    const ip = s.cinner(u, u);
    expect(ip.re).toBeCloseTo(6);
    expect(ip.im).toBeCloseTo(0);
    expect(s.cscale(cx(0, 1), [cx(1)])[0]).toEqual(cx(0, 1));
  });
});
