"use client";

import { Card, CardContent } from "@/components/ui/card";
import { fmtInt, fmtNum } from "@/lib/format";
import type { ElasticityResult } from "@/lib/types";

function Kpi({ value, label, sub, accent }: { value: string; label: string; sub: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold tabular-nums" style={accent ? { color: accent } : undefined} dir="ltr">
          {value}
        </div>
        <div className="text-muted-foreground mt-1 text-sm">{label}</div>
        <div className="text-muted-foreground/70 text-xs" dir="ltr">{sub}</div>
      </CardContent>
    </Card>
  );
}

export function KpiStrip({ result }: { result: ElasticityResult }) {
  const p = result.pooled_regression;
  const v = result.validation_regression;
  const m = result.metadata;
  const pooledAccent = Math.abs(p.elasticity_beta) > 1 ? "#ef4444" : "#22c55e";
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Kpi value={fmtNum(p.elasticity_beta, 2)} label="کشش تجمیع‌شده (β)" sub="Pooled Elasticity" accent={pooledAccent} />
      <Kpi value={fmtNum(p.r_squared, 3)} label="R² تجمیع‌شده" sub="Pooled R²" />
      <Kpi value={fmtNum(v.elasticity_beta, 2)} label="کشش اعتبارسنجی" sub="Validation β" />
      <Kpi value={fmtInt(m.total_products_analyzed)} label="محصولات تحلیل‌شده" sub="Products" />
      <Kpi value={fmtInt(m.total_groups_analyzed)} label="گروه‌های تحلیل‌شده" sub="Groups" />
      <Kpi value={fmtInt(p.n_observations)} label="تعداد مشاهدات" sub="Observations" />
    </div>
  );
}
