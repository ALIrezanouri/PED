"use client";

import { fmtNum, toFaDigits } from "@/lib/format";
import type { AnalysisUnit, CrossPriceMatrix } from "@/lib/types";

/** Diverging color: positive => green, negative => red, magnitude => opacity. */
function divergingColor(v: number | null, cap = 1): string {
  if (v === null || Number.isNaN(v)) return "var(--muted)";
  const t = Math.max(-cap, Math.min(cap, v)) / cap;
  if (t >= 0) return `rgba(34,197,94,${0.15 + t * 0.6})`;
  return `rgba(239,68,68,${0.15 + -t * 0.6})`;
}

export function CrossPriceHeatmap({ cross }: { cross: CrossPriceMatrix }) {
  const { names, matrix } = cross;
  if (!names.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        کشش متقاطع تقاضای هر کالا (سطر) نسبت به قیمت کالای دیگر (ستون).
        مقدار مثبت = <span className="text-emerald-500">جانشین</span>، منفی = <span className="text-red-500">مکمل</span>.
        قطر اصلی، کشش قیمتی خودِ کالاست.
      </p>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-xs" dir="rtl">
          <thead>
            <tr>
              <th className="text-muted-foreground p-1 text-right font-medium">کالا ＼ قیمت</th>
              {names.map((n) => (
                <th key={n} className="text-muted-foreground max-w-20 truncate p-1 font-medium" title={n}>
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((rowName, i) => (
              <tr key={rowName}>
                <th className="text-muted-foreground max-w-28 truncate p-1 text-right font-medium" title={rowName}>
                  {rowName}
                </th>
                {names.map((colName, j) => {
                  const v = matrix[i][j];
                  const isDiag = i === j;
                  return (
                    <td
                      key={colName}
                      className="rounded p-1.5 text-center tabular-nums"
                      dir="ltr"
                      title={`${rowName} ← ${colName}: ${v ?? "—"}`}
                      style={{
                        background: isDiag ? "var(--muted)" : divergingColor(v),
                        color: isDiag ? "var(--muted-foreground)" : "#f8fafc",
                        fontWeight: isDiag ? 700 : 400,
                      }}
                    >
                      {v === null ? "—" : fmtNum(v, 2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function YearlyElasticityHeatmap({ units }: { units: AnalysisUnit[] }) {
  const yearSet = new Set<number>();
  units.forEach((u) => u.yearly_elasticity.forEach((y) => yearSet.add(y.year)));
  const years = [...yearSet].sort((a, b) => a - b);
  if (!years.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        پایداری کشش قیمتی در طول زمان. رنگ قرمزتر = کشش‌پذیرتر (منفی‌تر)، سبزتر = کشش‌ناپذیرتر.
      </p>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-xs" dir="rtl">
          <thead>
            <tr>
              <th className="text-muted-foreground p-1 text-right font-medium">کالا ＼ سال</th>
              {years.map((y) => (
                <th key={y} className="text-muted-foreground p-1 font-medium">
                  {toFaDigits(y)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.name}>
                <th className="text-muted-foreground max-w-28 truncate p-1 text-right font-medium" title={u.name}>
                  {u.name}
                </th>
                {years.map((y) => {
                  const ye = u.yearly_elasticity.find((e) => e.year === y);
                  const v = ye ? ye.elasticity : null;
                  return (
                    <td
                      key={y}
                      className="rounded p-1.5 text-center tabular-nums"
                      dir="ltr"
                      title={ye ? `${u.name} · ${toFaDigits(y)} · β=${v} · n=${toFaDigits(ye.n_obs)}` : "—"}
                      style={{
                        background: v === null ? "var(--muted)" : divergingColor(v, 2),
                        color: v === null ? "var(--muted-foreground)" : "#f8fafc",
                      }}
                    >
                      {v === null ? "—" : fmtNum(v, 2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
