"use client";

import { useMemo, useState } from "react";
import { TrendingDownIcon, TrendingUpIcon, TargetIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlotlyChart } from "./plotly-chart";
import { ADVICE_FA, CLASS_FA, fmtInt, fmtNum, fmtPct, toFaDigits } from "@/lib/format";
import type { AnalysisUnit } from "@/lib/types";

/** Constant-elasticity response: Q2/Q1 = (P2/P1)^β, revenue = P·Q. */
function simulate(beta: number, pricePct: number) {
  const priceRatio = 1 + pricePct / 100;
  const qtyRatio = Math.pow(priceRatio, beta);
  const revRatio = priceRatio * qtyRatio;
  return { qtyChange: qtyRatio - 1, revChange: revRatio - 1, revRatio };
}

function ResultCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const Icon = value >= 0 ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-muted-foreground text-sm">{label}</div>
        <div
          className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums"
          style={{ color: value >= 0 ? "#22c55e" : "#ef4444" }}
          dir="ltr"
        >
          <Icon className="size-5" />
          {value >= 0 ? "+" : ""}
          {fmtPct(value)}
        </div>
        {sub ? <div className="text-muted-foreground/80 mt-1 text-xs" dir="ltr">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

export function WhatIfSimulator({ units }: { units: AnalysisUnit[] }) {
  const [name, setName] = useState(units[0]?.name ?? "");
  const [pricePct, setPricePct] = useState(10);

  const unit = useMemo(() => units.find((u) => u.name === name) ?? units[0], [units, name]);
  const beta = unit?.elasticity_beta ?? 0;
  const sim = useMemo(() => simulate(beta, pricePct), [beta, pricePct]);

  const hasCost = unit?.avg_cost != null && unit.avg_price > 0;
  const curveKind = hasCost ? "سود" : "درآمد";

  const curve = useMemo(() => {
    if (!unit) return { data: [] as unknown[], layout: {} };
    const qtyTotal = unit.avg_price > 0 ? unit.revenue / unit.avg_price : 0;
    const mc = unit.avg_cost ?? 0;
    // Profit when a marginal cost is known, otherwise revenue.
    const valueAt = (d: number) => {
      const ratio = 1 + d / 100;
      const qty = qtyTotal * Math.pow(ratio, beta);
      return hasCost ? qty * (unit.avg_price * ratio - mc) : unit.revenue * Math.pow(ratio, 1 + beta);
    };
    const xs: number[] = [];
    const ys: number[] = [];
    for (let d = -50; d <= 50; d += 1) {
      xs.push(d);
      ys.push(valueAt(d));
    }
    const optPct = unit.optimal_price_change != null ? unit.optimal_price_change * 100 : null;
    const data: unknown[] = [
      {
        type: "scatter",
        mode: "lines",
        x: xs,
        y: ys,
        line: { color: "#3b82f6", width: 2.5 },
        hovertemplate: "تغییر قیمت %{x}٪<br>درآمد: %{y:,.0f}<extra></extra>",
        name: "درآمد",
      },
      {
        type: "scatter",
        mode: "markers",
        x: [pricePct],
        y: [valueAt(pricePct)],
        marker: { color: "#f8fafc", size: 11, line: { color: "#3b82f6", width: 2 } },
        name: "نقطهٔ فعلی",
        hovertemplate: "انتخاب فعلی: %{x}٪<extra></extra>",
      },
    ];
    if (optPct != null) {
      data.push({
        type: "scatter",
        mode: "markers",
        x: [optPct],
        y: [valueAt(optPct)],
        marker: { color: "#22c55e", size: 12, symbol: "star" },
        name: "قیمت بهینهٔ سود",
        hovertemplate: "قیمت بهینهٔ سود: %{x:.0f}٪<extra></extra>",
      });
    }
    return {
      data,
      layout: {
        margin: { l: 55, r: 15, t: 10, b: 40 },
        xaxis: { title: "تغییر قیمت (٪)", gridcolor: "#334155", zerolinecolor: "#475569" },
        yaxis: { title: curveKind, gridcolor: "#334155" },
        showlegend: false,
        height: 260,
      },
    };
  }, [unit, beta, pricePct, hasCost, curveKind]);

  if (!unit) return null;

  const baseRevenue = unit.revenue;
  const projectedRevenue = baseRevenue * sim.revRatio;
  const revenueDelta = projectedRevenue - baseRevenue;

  return (
    <Card>
      <CardHeader>
        <CardTitle>شبیه‌ساز قیمت (What‑if)</CardTitle>
        <CardDescription>
          اثر تخمینی تغییر قیمت بر حجم تقاضا و درآمد، بر پایهٔ کشش (β) و مدل کشش ثابت.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">محصول / گروه</span>
            <Select value={unit.name} onValueChange={(v) => setName(v ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {units.map((u) => (
                    <SelectItem key={`${u.level}-${u.name}`} value={u.name}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">تغییر قیمت</span>
              <Badge variant="outline" dir="ltr">
                {pricePct >= 0 ? "+" : ""}
                {toFaDigits(pricePct)}٪
              </Badge>
            </div>
            <Slider
              min={-50}
              max={50}
              step={1}
              value={[pricePct]}
              onValueChange={(v) => setPricePct(Array.isArray(v) ? v[0] : v)}
            />
          </div>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            کشش (β): <span dir="ltr" className="tabular-nums">{fmtNum(beta, 2)}</span>
          </span>
          <Badge variant="secondary">{CLASS_FA[unit.classification]}</Badge>
          <span className="text-foreground">
            توصیه: <b>{ADVICE_FA[unit.pricing_advice]}</b>
          </span>
          {unit.optimal_price_change != null ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPricePct(Math.round(unit.optimal_price_change! * 100))}
            >
              <TargetIcon data-icon="inline-start" />
              قیمت بهینهٔ سود ({toFaDigits(Math.round(unit.optimal_price_change * 100))}٪)
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ResultCard label="تغییر تخمینی حجم تقاضا" value={sim.qtyChange} />
          <ResultCard label="تغییر تخمینی درآمد" value={sim.revChange} />
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm">درآمد تخمینی جدید</div>
              <div className="mt-1 text-2xl font-bold tabular-nums" dir="ltr">
                {fmtInt(Math.round(projectedRevenue))}
              </div>
              <div
                className="mt-1 text-xs tabular-nums"
                style={{ color: revenueDelta >= 0 ? "#22c55e" : "#ef4444" }}
                dir="ltr"
              >
                {revenueDelta >= 0 ? "+" : ""}
                {fmtInt(Math.round(revenueDelta))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-sm">منحنی {curveKind} نسبت به تغییر قیمت</div>
          <PlotlyChart data={curve.data} layout={curve.layout} height={260} />
        </div>
      </CardContent>
    </Card>
  );
}
