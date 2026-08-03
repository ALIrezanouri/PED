"use client";

import { useMemo } from "react";
import { PlotlyChart } from "./plotly-chart";
import { CLASS_COLOR, CLASS_FA, fmtNum, jalaliLabel } from "@/lib/format";
import type { AnalysisUnit } from "@/lib/types";

const GRID = "#334155";
const ZERO = "#475569";
const PALETTE = [
  "#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#84cc16",
];

export function ElasticityBarChart({ units }: { units: AnalysisUnit[] }) {
  const { data, layout } = useMemo(() => {
    const items = [...units].sort((a, b) => a.elasticity_beta - b.elasticity_beta);
    const trace = {
      type: "bar",
      orientation: "h",
      x: items.map((s) => s.elasticity_beta),
      y: items.map((s) => s.name),
      marker: { color: items.map((s) => CLASS_COLOR[s.classification]) },
      error_x: {
        type: "data",
        array: items.map((s) => s.std_error),
        thickness: 1.5,
        color: "#cbd5e1",
      },
      customdata: items.map((s) => [
        fmtNum(s.std_error, 3),
        fmtNum(s.r_squared, 3),
        s.n_observations,
        CLASS_FA[s.classification],
      ]),
      hovertemplate:
        "<b>%{y}</b><br>β = %{x:.3f}<br>SE = %{customdata[0]}<br>R² = %{customdata[1]}<br>n = %{customdata[2]}<br>طبقه: %{customdata[3]}<extra></extra>",
    };
    return {
      data: [trace],
      layout: {
        margin: { l: 150, r: 20, t: 10, b: 45 },
        xaxis: { title: "کشش قیمتی (β)", zeroline: true, zerolinecolor: ZERO, gridcolor: GRID },
        yaxis: { gridcolor: GRID, automargin: true, tickfont: { size: 11 } },
        height: Math.max(320, items.length * 40 + 60),
        showlegend: false,
      },
    };
  }, [units]);

  return <PlotlyChart data={data} layout={layout} height={layout.height as number} />;
}

export function ScatterFitChart({
  units,
  pooledBeta,
}: {
  units: AnalysisUnit[];
  pooledBeta: number;
}) {
  const { data, layout } = useMemo(() => {
    const traces: unknown[] = [];
    const allX: number[] = [];
    const allY: number[] = [];
    units.forEach((s, idx) => {
      const pts = s.scatter_data ?? [];
      if (!pts.length) return;
      const x = pts.map((p) => p.ln_price);
      const y = pts.map((p) => p.ln_quantity);
      x.forEach((v) => allX.push(v));
      y.forEach((v) => allY.push(v));
      traces.push({
        type: "scatter",
        mode: "markers",
        x,
        y,
        name: s.name,
        marker: { color: PALETTE[idx % PALETTE.length], size: 6, opacity: 0.7 },
        hovertemplate: `<b>${s.name}</b><br>ln(قیمت)=%{x:.3f}<br>ln(تقاضا)=%{y:.3f}<extra></extra>`,
      });
    });
    if (allX.length) {
      const meanX = allX.reduce((a, b) => a + b, 0) / allX.length;
      const meanY = allY.reduce((a, b) => a + b, 0) / allY.length;
      const intercept = meanY - pooledBeta * meanX;
      const xMin = Math.min(...allX);
      const xMax = Math.max(...allX);
      traces.push({
        type: "scatter",
        mode: "lines",
        x: [xMin, xMax],
        y: [intercept + pooledBeta * xMin, intercept + pooledBeta * xMax],
        name: `خط تجمیعی (β=${fmtNum(pooledBeta, 2)})`,
        line: { color: "#f8fafc", width: 3, dash: "dash" },
        hoverinfo: "skip",
      });
    }
    return {
      data: traces,
      layout: {
        margin: { l: 55, r: 20, t: 10, b: 60 },
        xaxis: { title: "ln(قیمت)", gridcolor: GRID, zerolinecolor: ZERO },
        yaxis: { title: "ln(تقاضا)", gridcolor: GRID, zerolinecolor: ZERO },
        legend: { font: { size: 10 }, orientation: "h", y: -0.2, x: 0.5, xanchor: "center" },
        height: 420,
      },
    };
  }, [units, pooledBeta]);

  return <PlotlyChart data={data} layout={layout} height={420} />;
}

export function TimeSeriesChart({ unit }: { unit: AnalysisUnit | undefined }) {
  const { data, layout } = useMemo(() => {
    const series = unit?.monthly_series ?? [];
    const labels = series.map((m) => jalaliLabel(m.year, m.month));
    return {
      data: [
        {
          type: "bar",
          x: labels,
          y: series.map((m) => m.quantity),
          name: "تقاضا",
          marker: { color: "rgba(59,130,246,.55)" },
          yaxis: "y",
          hovertemplate: "%{x}<br>تقاضا: %{y:,.0f}<extra></extra>",
        },
        {
          type: "scatter",
          mode: "lines+markers",
          x: labels,
          y: series.map((m) => m.weighted_price),
          name: "قیمت موزون",
          line: { color: "#ef4444", width: 2.5 },
          yaxis: "y2",
          hovertemplate: "%{x}<br>قیمت: %{y:,.0f}<extra></extra>",
        },
      ],
      layout: {
        margin: { l: 60, r: 65, t: 10, b: 70 },
        xaxis: { title: "زمان (سال/ماه شمسی)", gridcolor: GRID, tickangle: -45, tickfont: { size: 10 } },
        yaxis: { title: "تقاضا", gridcolor: GRID, side: "right" },
        yaxis2: { title: "قیمت موزون", overlaying: "y", side: "left", gridcolor: "rgba(0,0,0,0)" },
        legend: { orientation: "h", y: 1.12, x: 0.5, xanchor: "center" },
        height: 420,
        barmode: "group",
      },
    };
  }, [unit]);

  return <PlotlyChart data={data} layout={layout} height={420} />;
}
