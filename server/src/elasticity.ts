/**
 * Price Elasticity of Demand engine.
 *
 * Estimates a constant-elasticity (log-log) demand curve  ln Q = a + b · ln P
 * per product and per group using ordinary least squares. `b` is the price
 * elasticity of demand. Everything here is pure and unit-tested.
 */
import { studentTwoSidedP, tCritical } from "./stats.js";
import { multipleOLS } from "./regression.js";

export type Transaction = {
  date: string;
  group: string;
  subgroup?: string;
  product: string;
  price: number;
  quantity: number;
  cost?: number;
};

export type PricingAdvice = "raise" | "lower" | "hold";

export type Classification = "elastic" | "inelastic" | "unit-elastic";

export type ScatterPoint = { ln_price: number; ln_quantity: number };
export type MonthlyPoint = {
  year: number;
  month: number;
  quantity: number;
  weighted_price: number;
};
export type YearlyElasticity = { year: number; elasticity: number; n_obs: number };

export type AnalysisUnit = {
  name: string;
  parent: string | null;
  level: "product" | "group";
  elasticity_beta: number;
  std_error: number;
  p_value: number;
  /** 95% confidence interval for the elasticity estimate. */
  ci_low: number;
  ci_high: number;
  /** true when the elasticity is statistically different from 0 at p < 0.05. */
  significant: boolean;
  r_squared: number;
  n_observations: number;
  classification: Classification;
  revenue: number;
  revenue_share: number;
  avg_price: number;
  avg_cost: number | null;
  /** Revenue/profit-oriented pricing guidance derived from the elasticity. */
  pricing_advice: PricingAdvice;
  /**
   * Profit-maximising price change (fraction) when a marginal cost is known and
   * demand is elastic (Lerner rule). null when not applicable.
   */
  optimal_price_change: number | null;
  scatter_data: ScatterPoint[];
  monthly_series: MonthlyPoint[];
  yearly_elasticity: YearlyElasticity[];
};

export type CrossPriceMatrix = {
  names: string[];
  /** matrix[i][j] = elasticity of demand for product i w.r.t. price of product j. */
  matrix: (number | null)[][];
};

export type Regression = {
  elasticity_beta: number;
  r_squared: number;
  n_observations: number;
};

export type ElasticityResult = {
  metadata: {
    calendar: string;
    data_range: string;
    generated_at: string;
    method: string;
    validation_method: string;
    total_products_analyzed: number;
    total_groups_analyzed: number;
    total_subsubgroups_analyzed: number;
  };
  pooled_regression: Regression;
  validation_regression: Regression;
  groups: AnalysisUnit[];
  products: AnalysisUnit[];
  /** Alias of `groups` so the legacy dashboard schema keeps working. */
  subsubgroups: AnalysisUnit[];
  cross_price: CrossPriceMatrix;
};

export type OLSFit = {
  beta: number;
  intercept: number;
  stdError: number;
  rSquared: number;
  pValue: number;
  n: number;
};

/** Simple linear regression y = intercept + beta·x via closed-form OLS. */
export function simpleOLS(x: number[], y: number[]): OLSFit | null {
  const n = x.length;
  if (n < 2 || y.length !== n) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null; // no price variation -> elasticity undefined
  const beta = sxy / sxx;
  const intercept = my - beta * mx;

  // Residual variance and standard error of the slope.
  const ssRes = syy - beta * sxy;
  const rSquared = syy === 0 ? 1 : Math.max(0, 1 - ssRes / syy);
  let stdError = 0;
  let pValue = 0;
  if (n > 2) {
    const df = n - 2;
    const sigma2 = Math.max(0, ssRes) / df;
    stdError = Math.sqrt(sigma2 / sxx);
    // A zero-residual (perfect) fit determines the slope exactly -> p ~ 0.
    pValue = stdError > 0 ? studentTwoSidedP(beta / stdError, df) : beta !== 0 ? 0 : 1;
  }
  return { beta, intercept, stdError, rSquared, pValue, n };
}

export function classify(beta: number): Classification {
  const a = Math.abs(beta);
  if (a > 1.05) return "elastic";
  if (a < 0.95) return "inelastic";
  return "unit-elastic";
}

/** Parse a date cell into Jalali-style {year, month}. Accepts YYYY/MM, YYYY-MM-DD, etc. */
export function parseYearMonth(date: string): { year: number; month: number } | null {
  const m = String(date).trim().match(/^(\d{3,4})[\/\-.](\d{1,2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

function monthlySeries(rows: Transaction[]): MonthlyPoint[] {
  const byKey = new Map<string, { year: number; month: number; qty: number; rev: number }>();
  for (const r of rows) {
    const ym = parseYearMonth(r.date);
    if (!ym) continue;
    const key = `${ym.year}-${ym.month}`;
    const cur = byKey.get(key) ?? { year: ym.year, month: ym.month, qty: 0, rev: 0 };
    cur.qty += r.quantity;
    cur.rev += r.price * r.quantity;
    byKey.set(key, cur);
  }
  return [...byKey.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((m) => ({
      year: m.year,
      month: m.month,
      quantity: Math.round(m.qty * 100) / 100,
      weighted_price: m.qty > 0 ? Math.round((m.rev / m.qty) * 100) / 100 : 0,
    }));
}

function yearlyElasticity(rows: Transaction[]): YearlyElasticity[] {
  const byYear = new Map<number, Transaction[]>();
  for (const r of rows) {
    const ym = parseYearMonth(r.date);
    if (!ym) continue;
    const arr = byYear.get(ym.year) ?? [];
    arr.push(r);
    byYear.set(ym.year, arr);
  }
  const out: YearlyElasticity[] = [];
  for (const [year, yr] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    const { x, y } = logPoints(yr);
    const fit = simpleOLS(x, y);
    if (fit) {
      out.push({ year, elasticity: round(fit.beta, 3), n_obs: fit.n });
    }
  }
  return out;
}

function logPoints(rows: Transaction[]): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (const r of rows) {
    if (r.price > 0 && r.quantity > 0) {
      x.push(Math.log(r.price));
      y.push(Math.log(r.quantity));
    }
  }
  return { x, y };
}

function round(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Profit-maximising price change (fraction) under constant elasticity + known MC. */
function optimalPriceChange(beta: number, avgPrice: number, avgCost: number | null): number | null {
  // Only defined for elastic demand (beta < -1); otherwise profit rises with price
  // without an interior optimum, so we fall back to directional advice.
  if (avgCost == null || avgCost <= 0 || beta >= -1) return null;
  const optimalPrice = avgCost * (beta / (beta + 1)); // Lerner: (P-MC)/P = -1/beta
  if (!Number.isFinite(optimalPrice) || optimalPrice <= 0 || avgPrice <= 0) return null;
  const change = optimalPrice / avgPrice - 1;
  // Constant elasticity is only trustworthy near observed prices; don't recommend
  // extrapolating far beyond ±50% of the current price.
  if (!Number.isFinite(change) || Math.abs(change) > 0.5) return null;
  return round(change, 4);
}

function pricingAdvice(cls: Classification, optimal: number | null): PricingAdvice {
  // When a profit optimum is known and in-range, follow it; else use the
  // revenue-maximising direction implied by the elasticity.
  if (optimal != null) return optimal > 0.02 ? "raise" : optimal < -0.02 ? "lower" : "hold";
  if (cls === "inelastic") return "raise";
  if (cls === "elastic") return "lower";
  return "hold";
}

function buildUnit(
  name: string,
  parent: string | null,
  level: "product" | "group",
  rows: Transaction[],
  totalRevenue: number,
): AnalysisUnit | null {
  const { x, y } = logPoints(rows);
  const fit = simpleOLS(x, y);
  if (!fit) return null;

  let revenue = 0;
  let qtySum = 0;
  let costWeighted = 0;
  let hasCost = false;
  for (const r of rows) {
    revenue += r.price * r.quantity;
    qtySum += r.quantity;
    if (r.cost != null && Number.isFinite(r.cost)) {
      costWeighted += r.cost * r.quantity;
      hasCost = true;
    }
  }
  const avgPrice = qtySum > 0 ? revenue / qtySum : 0;
  const avgCost = hasCost && qtySum > 0 ? costWeighted / qtySum : null;

  const tCrit = fit.n > 2 ? tCritical(fit.n - 2, 0.05) : 0;
  const half = tCrit * fit.stdError;
  const cls = classify(fit.beta);
  const optimal = optimalPriceChange(fit.beta, avgPrice, avgCost);

  return {
    name,
    parent,
    level,
    elasticity_beta: round(fit.beta, 3),
    std_error: round(fit.stdError, 4),
    p_value: round(fit.pValue, 4),
    ci_low: round(fit.beta - half, 3),
    ci_high: round(fit.beta + half, 3),
    significant: Number.isFinite(fit.pValue) && fit.pValue < 0.05,
    r_squared: round(fit.rSquared, 4),
    n_observations: fit.n,
    classification: cls,
    revenue: round(revenue, 2),
    revenue_share: totalRevenue > 0 ? round(revenue / totalRevenue, 4) : 0,
    avg_price: round(avgPrice, 2),
    avg_cost: avgCost != null ? round(avgCost, 2) : null,
    pricing_advice: pricingAdvice(cls, optimal),
    optimal_price_change: optimal,
    scatter_data: x.map((lp, i) => ({ ln_price: round(lp, 4), ln_quantity: round(y[i], 4) })),
    monthly_series: monthlySeries(rows),
    yearly_elasticity: yearlyElasticity(rows),
  };
}

/**
 * Cross-price elasticity of the top products by revenue. For each ordered pair
 * (a, b) we regress ln(Q_a) on [ln(P_a), ln(P_b)] over the months both are
 * present; the coefficient on ln(P_b) is the cross-price elasticity. Positive =>
 * substitutes, negative => complements. Diagonal is own-price elasticity.
 */
function crossPriceMatrix(rows: Transaction[], maxProducts = 8): CrossPriceMatrix {
  // Revenue per product to pick the most material ones.
  const revenue = new Map<string, number>();
  for (const r of rows) revenue.set(r.product, (revenue.get(r.product) ?? 0) + r.price * r.quantity);
  const names = [...revenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxProducts)
    .map((e) => e[0]);

  // Monthly weighted price + quantity per product.
  type Agg = { qty: number; rev: number };
  const series = new Map<string, Map<string, Agg>>();
  for (const r of rows) {
    if (!names.includes(r.product)) continue;
    const ym = parseYearMonth(r.date);
    if (!ym) continue;
    const key = `${ym.year}-${ym.month}`;
    const perProduct = series.get(r.product) ?? new Map<string, Agg>();
    const cur = perProduct.get(key) ?? { qty: 0, rev: 0 };
    cur.qty += r.quantity;
    cur.rev += r.price * r.quantity;
    perProduct.set(key, cur);
    series.set(r.product, perProduct);
  }
  const lnPrice = (p: string, k: string) => {
    const a = series.get(p)?.get(k);
    return a && a.qty > 0 ? Math.log(a.rev / a.qty) : null;
  };
  const lnQty = (p: string, k: string) => {
    const a = series.get(p)?.get(k);
    return a && a.qty > 0 ? Math.log(a.qty) : null;
  };

  const matrix: (number | null)[][] = names.map(() => names.map(() => null));
  for (let i = 0; i < names.length; i++) {
    const a = names[i];
    const periodsA = [...(series.get(a)?.keys() ?? [])];
    for (let j = 0; j < names.length; j++) {
      const b = names[j];
      const X: number[][] = [];
      const yv: number[] = [];
      for (const k of periodsA) {
        const q = lnQty(a, k);
        const pa = lnPrice(a, k);
        const pb = lnPrice(b, k);
        if (q == null || pa == null || pb == null) continue;
        if (i === j) {
          X.push([pa]);
        } else {
          X.push([pa, pb]);
        }
        yv.push(q);
      }
      const fit = multipleOLS(X, yv);
      if (fit) matrix[i][j] = round(i === j ? fit.coef[0] : fit.coef[1], 3);
    }
  }
  return { names, matrix };
}

/** Analyze transactions into per-product and per-group elasticities plus a pooled fit. */
export function analyze(rows: Transaction[]): ElasticityResult {
  const clean = rows.filter((r) => r.price > 0 && r.quantity > 0);
  const totalRevenue = clean.reduce((s, r) => s + r.price * r.quantity, 0);

  const byProduct = new Map<string, Transaction[]>();
  const byGroup = new Map<string, Transaction[]>();
  for (const r of clean) {
    const p = byProduct.get(r.product) ?? [];
    p.push(r);
    byProduct.set(r.product, p);
    const g = byGroup.get(r.group) ?? [];
    g.push(r);
    byGroup.set(r.group, g);
  }

  const products: AnalysisUnit[] = [];
  for (const [name, prows] of byProduct) {
    const unit = buildUnit(name, prows[0]?.group ?? null, "product", prows, totalRevenue);
    if (unit) products.push(unit);
  }
  const groups: AnalysisUnit[] = [];
  for (const [name, grows] of byGroup) {
    const unit = buildUnit(name, null, "group", grows, totalRevenue);
    if (unit) groups.push(unit);
  }
  products.sort((a, b) => a.elasticity_beta - b.elasticity_beta);
  groups.sort((a, b) => a.elasticity_beta - b.elasticity_beta);

  const pooled = logPoints(clean);
  const pooledFit = simpleOLS(pooled.x, pooled.y);

  // Hold-out validation: fit on ~80% and report the beta so the UI can compare.
  const cut = Math.floor(clean.length * 0.8);
  const holdout = logPoints(clean.slice(0, cut));
  const holdoutFit = simpleOLS(holdout.x, holdout.y);

  const years = clean
    .map((r) => parseYearMonth(r.date))
    .filter((x): x is { year: number; month: number } => x != null);
  const minY = years.length ? Math.min(...years.map((y) => y.year)) : 0;
  const maxY = years.length ? Math.max(...years.map((y) => y.year)) : 0;

  return {
    metadata: {
      calendar: "jalali",
      data_range: minY ? `${minY} - ${maxY}` : "—",
      generated_at: new Date().toISOString(),
      method: "Log-log OLS (per product & group)",
      validation_method: "80/20 hold-out",
      total_products_analyzed: products.length,
      total_groups_analyzed: groups.length,
      total_subsubgroups_analyzed: groups.length,
    },
    pooled_regression: {
      elasticity_beta: pooledFit ? round(pooledFit.beta, 3) : 0,
      r_squared: pooledFit ? round(pooledFit.rSquared, 4) : 0,
      n_observations: pooledFit ? pooledFit.n : 0,
    },
    validation_regression: {
      elasticity_beta: holdoutFit ? round(holdoutFit.beta, 3) : 0,
      r_squared: holdoutFit ? round(holdoutFit.rSquared, 4) : 0,
      n_observations: holdoutFit ? holdoutFit.n : 0,
    },
    groups,
    products,
    subsubgroups: groups,
    cross_price: crossPriceMatrix(clean),
  };
}
