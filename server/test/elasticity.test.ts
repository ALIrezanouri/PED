import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, simpleOLS, classify, parseYearMonth, type Transaction } from "../src/elasticity.js";
import { studentTwoSidedP, tCritical } from "../src/stats.js";
import { multipleOLS } from "../src/regression.js";

test("simpleOLS recovers a known slope", () => {
  // y = 3 + 2x exactly -> beta = 2, r^2 = 1
  const x = [1, 2, 3, 4, 5];
  const y = x.map((v) => 3 + 2 * v);
  const fit = simpleOLS(x, y);
  assert.ok(fit);
  assert.ok(Math.abs(fit!.beta - 2) < 1e-9);
  assert.ok(Math.abs(fit!.rSquared - 1) < 1e-9);
});

test("studentTwoSidedP matches known values", () => {
  // t=0 -> p=1; large t -> p near 0. df=10, t=2.228 -> p ~ 0.05
  assert.ok(Math.abs(studentTwoSidedP(0, 10) - 1) < 1e-9);
  const p = studentTwoSidedP(2.228, 10);
  assert.ok(p > 0.045 && p < 0.055, `expected ~0.05, got ${p}`);
  assert.ok(studentTwoSidedP(100, 10) < 1e-6);
});

test("tCritical matches known t-table values", () => {
  // Two-sided 95% critical value for df=10 is ~2.228; df=30 ~2.042.
  assert.ok(Math.abs(tCritical(10, 0.05) - 2.228) < 0.01, `df10 -> ${tCritical(10, 0.05)}`);
  assert.ok(Math.abs(tCritical(30, 0.05) - 2.042) < 0.01, `df30 -> ${tCritical(30, 0.05)}`);
});

test("multipleOLS recovers known coefficients", () => {
  // y = 1 + 2*x1 - 3*x2
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 30; i++) {
    const x1 = i;
    const x2 = (i * 7) % 11;
    X.push([x1, x2]);
    y.push(1 + 2 * x1 - 3 * x2);
  }
  const fit = multipleOLS(X, y);
  assert.ok(fit);
  assert.ok(Math.abs(fit!.intercept - 1) < 1e-6);
  assert.ok(Math.abs(fit!.coef[0] - 2) < 1e-6);
  assert.ok(Math.abs(fit!.coef[1] + 3) < 1e-6);
});

test("classify buckets elasticity correctly", () => {
  assert.equal(classify(-1.5), "elastic");
  assert.equal(classify(-0.5), "inelastic");
  assert.equal(classify(-1.0), "unit-elastic");
});

test("parseYearMonth handles jalali and iso formats", () => {
  assert.deepEqual(parseYearMonth("1402/03"), { year: 1402, month: 3 });
  assert.deepEqual(parseYearMonth("2024-11-05"), { year: 2024, month: 11 });
  assert.equal(parseYearMonth("garbage"), null);
});

test("analyze estimates a known elasticity from synthetic demand", () => {
  // Build a product whose demand follows ln Q = 8 + (-1.4) ln P exactly.
  const beta = -1.4;
  const rows: Transaction[] = [];
  for (let y = 1400; y <= 1402; y++) {
    for (let m = 1; m <= 12; m++) {
      const price = 100 * (1 + 0.03 * ((y - 1400) * 12 + m));
      const qty = Math.exp(8 + beta * Math.log(price));
      rows.push({ date: `${y}/${m}`, group: "G1", product: "P1", price, quantity: qty });
    }
  }
  // A second product with a different (inelastic) elasticity.
  const beta2 = -0.6;
  for (let y = 1400; y <= 1402; y++) {
    for (let m = 1; m <= 12; m++) {
      const price = 50 * (1 + 0.02 * ((y - 1400) * 12 + m));
      const qty = Math.exp(7 + beta2 * Math.log(price));
      rows.push({ date: `${y}/${m}`, group: "G2", product: "P2", price, quantity: qty });
    }
  }

  const res = analyze(rows);
  assert.equal(res.products.length, 2);
  assert.equal(res.groups.length, 2);

  const p1 = res.products.find((p) => p.name === "P1")!;
  const p2 = res.products.find((p) => p.name === "P2")!;
  assert.ok(Math.abs(p1.elasticity_beta - beta) < 0.02, `P1 beta ${p1.elasticity_beta}`);
  assert.ok(Math.abs(p2.elasticity_beta - beta2) < 0.02, `P2 beta ${p2.elasticity_beta}`);
  assert.equal(p1.classification, "elastic");
  assert.equal(p2.classification, "inelastic");

  // Revenue shares sum to ~1 across products.
  const share = res.products.reduce((s, p) => s + p.revenue_share, 0);
  assert.ok(Math.abs(share - 1) < 0.01, `revenue shares sum ${share}`);

  // Monthly series and scatter data are populated.
  assert.ok(p1.monthly_series.length > 0);
  assert.ok(p1.scatter_data.length === 36);
  assert.equal(res.metadata.total_products_analyzed, 2);

  // Confidence interval brackets the estimate, and a clean signal is significant.
  // (Data here is noise-free, so the interval collapses to the point estimate.)
  assert.ok(p1.ci_low <= p1.elasticity_beta && p1.elasticity_beta <= p1.ci_high);
  assert.equal(p1.significant, true);
  assert.ok(p1.revenue > 0);
  // Directional guidance: elastic -> lower, inelastic -> raise.
  assert.equal(p1.pricing_advice, "lower");
  assert.equal(p2.pricing_advice, "raise");
});

test("optimal pricing uses cost for elastic goods (Lerner rule)", () => {
  const beta = -2.0; // elastic
  const rows: Transaction[] = [];
  for (let y = 1400; y <= 1402; y++) {
    for (let m = 1; m <= 12; m++) {
      const price = 100 * (1 + 0.03 * ((y - 1400) * 12 + m));
      const qty = Math.exp(9 + beta * Math.log(price));
      rows.push({ date: `${y}/${m}`, group: "G", product: "P", price, quantity: qty, cost: price * 0.6 });
    }
  }
  const res = analyze(rows);
  const p = res.products[0];
  assert.equal(p.avg_cost !== null, true);
  // With beta=-2, optimal markup is P* = MC * beta/(beta+1) = MC*2 -> above avg cost.
  assert.equal(p.optimal_price_change !== null, true);
});

test("cross-price elasticity detects substitutes and complements", () => {
  // Build two products where A's demand rises with B's price (substitutes),
  // and A's demand also follows its own (negative) price elasticity.
  const rows: Transaction[] = [];
  for (let y = 1400; y <= 1402; y++) {
    for (let m = 1; m <= 12; m++) {
      const t = (y - 1400) * 12 + m;
      const pA = 100 * (1 + 0.02 * t) * (1 + ((t % 5) - 2) * 0.01);
      const pB = 200 * (1 + 0.03 * t) * (1 + ((t % 7) - 3) * 0.01);
      const qA = Math.exp(8 - 1.2 * Math.log(pA) + 0.6 * Math.log(pB));
      const qB = Math.exp(9 - 1.0 * Math.log(pB));
      rows.push({ date: `${y}/${m}`, group: "G", product: "A", price: pA, quantity: qA });
      rows.push({ date: `${y}/${m}`, group: "G", product: "B", price: pB, quantity: qB });
    }
  }
  const res = analyze(rows);
  const { names, matrix } = res.cross_price;
  const ia = names.indexOf("A");
  const ib = names.indexOf("B");
  assert.ok(ia >= 0 && ib >= 0);
  // Cross elasticity of A w.r.t. price of B should be clearly positive (substitute).
  assert.ok((matrix[ia][ib] ?? 0) > 0.3, `cross A/B = ${matrix[ia][ib]}`);
  // Own-price elasticity on the diagonal should be negative.
  assert.ok((matrix[ia][ia] ?? 0) < 0, `own A = ${matrix[ia][ia]}`);
});
