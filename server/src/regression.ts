/**
 * Ordinary least squares for multiple regressors, solved via the normal
 * equations (AᵀA)b = Aᵀy with Gaussian elimination. Small k only (we use k<=2
 * for cross-price elasticity), so this is more than fast enough and avoids a
 * linear-algebra dependency.
 */

/** Solve a linear system Ab = c for b using Gaussian elimination with partial pivoting. */
function solve(A: number[][], c: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, c[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-12) return null; // singular
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * Fit y = b0 + b1·x1 + ... + bk·xk. `rows` are the regressor vectors (each
 * length k), `y` the response. Returns intercept + coefficients aligned to the
 * regressor columns, or null if under-determined / singular.
 */
export function multipleOLS(
  rows: number[][],
  y: number[],
): { intercept: number; coef: number[] } | null {
  const n = rows.length;
  if (!n || y.length !== n) return null;
  const k = rows[0].length;
  if (n < k + 2) return null; // need more observations than parameters (+1 for a residual df)

  // Design matrix with leading intercept column.
  const X = rows.map((r) => [1, ...r]);
  const p = k + 1;
  const AtA: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const Aty: number[] = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      Aty[a] += X[i][a] * y[i];
      for (let b = 0; b < p; b++) AtA[a][b] += X[i][a] * X[i][b];
    }
  }
  const b = solve(AtA, Aty);
  if (!b) return null;
  return { intercept: b[0], coef: b.slice(1) };
}
