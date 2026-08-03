export type Classification = "elastic" | "inelastic" | "unit-elastic";

export type ScatterPoint = { ln_price: number; ln_quantity: number };
export type MonthlyPoint = {
  year: number;
  month: number;
  quantity: number;
  weighted_price: number;
};
export type YearlyElasticity = { year: number; elasticity: number; n_obs: number };

export type PricingAdvice = "raise" | "lower" | "hold";

export type AnalysisUnit = {
  name: string;
  parent: string | null;
  level: "product" | "group";
  elasticity_beta: number;
  std_error: number;
  p_value: number;
  ci_low: number;
  ci_high: number;
  significant: boolean;
  r_squared: number;
  n_observations: number;
  classification: Classification;
  revenue: number;
  revenue_share: number;
  avg_price: number;
  avg_cost: number | null;
  pricing_advice: PricingAdvice;
  optimal_price_change: number | null;
  scatter_data: ScatterPoint[];
  monthly_series: MonthlyPoint[];
  yearly_elasticity: YearlyElasticity[];
};

export type CrossPriceMatrix = {
  names: string[];
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
  subsubgroups: AnalysisUnit[];
  cross_price: CrossPriceMatrix;
  _meta?: { rows_used: number; rows_skipped: number };
};
