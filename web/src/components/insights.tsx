"use client";

import { useMemo } from "react";
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  LightbulbIcon,
  LinkIcon,
  UnlinkIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum, fmtPct } from "@/lib/format";
import type { AnalysisUnit, CrossPriceMatrix } from "@/lib/types";

type Insight = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  text: React.ReactNode;
};

function extremePair(cross: CrossPriceMatrix, want: "max" | "min") {
  let best: { a: string; b: string; v: number } | null = null;
  for (let i = 0; i < cross.names.length; i++) {
    for (let j = 0; j < cross.names.length; j++) {
      if (i === j) continue;
      const v = cross.matrix[i][j];
      if (v === null) continue;
      if (!best || (want === "max" ? v > best.v : v < best.v)) {
        best = { a: cross.names[i], b: cross.names[j], v };
      }
    }
  }
  return best;
}

export function InsightsCard({
  units,
  cross,
}: {
  units: AnalysisUnit[];
  cross: CrossPriceMatrix;
}) {
  const insights = useMemo<Insight[]>(() => {
    const sig = units.filter((u) => u.significant);
    const pool = sig.length ? sig : units;
    if (!pool.length) return [];
    const out: Insight[] = [];

    const mostElastic = [...pool].sort((a, b) => a.elasticity_beta - b.elasticity_beta)[0];
    if (mostElastic && mostElastic.classification === "elastic") {
      out.push({
        icon: ArrowDownCircleIcon,
        color: "#ef4444",
        text: (
          <>
            <b>{mostElastic.name}</b> کشش‌پذیرترین کالاست (β={fmtNum(mostElastic.elasticity_beta, 2)}).
            مشتریان به قیمت آن حساس‌اند؛ کاهش قیمت یا تخفیف می‌تواند حجم فروش را به‌شدت افزایش دهد.
          </>
        ),
      });
    }

    const inelastic = pool.filter((u) => u.classification === "inelastic");
    const opportunity = [...inelastic].sort((a, b) => b.revenue - a.revenue)[0];
    if (opportunity) {
      out.push({
        icon: ArrowUpCircleIcon,
        color: "#22c55e",
        text: (
          <>
            <b>{opportunity.name}</b> کشش‌ناپذیر است (β={fmtNum(opportunity.elasticity_beta, 2)}) و سهم درآمد بالایی دارد
            ({fmtPct(opportunity.revenue_share)}). فرصت افزایش قیمت با کمترین افت تقاضا و بیشترین اثر درآمدی.
          </>
        ),
      });
    }

    const sub = extremePair(cross, "max");
    if (sub && sub.v > 0.15) {
      out.push({
        icon: LinkIcon,
        color: "#3b82f6",
        text: (
          <>
            <b>{sub.a}</b> و <b>{sub.b}</b> جانشین یکدیگرند (کشش متقاطع {fmtNum(sub.v, 2)}). گران‌شدن یکی، تقاضای دیگری را بالا می‌برد؛
            در قیمت‌گذاری آن‌ها را هم‌زمان ببینید.
          </>
        ),
      });
    }

    const comp = extremePair(cross, "min");
    if (comp && comp.v < -0.15) {
      out.push({
        icon: UnlinkIcon,
        color: "#a855f7",
        text: (
          <>
            <b>{comp.a}</b> و <b>{comp.b}</b> مکمل یکدیگرند (کشش متقاطع {fmtNum(comp.v, 2)}). افزایش قیمت یکی، تقاضای دیگری را کاهش می‌دهد.
          </>
        ),
      });
    }

    return out;
  }, [units, cross]);

  if (!insights.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="size-5 text-amber-400" />
          بینش‌های کلیدی
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-3">
            <ins.icon className="mt-0.5 size-5 shrink-0" style={{ color: ins.color }} />
            <p className="text-sm leading-6">{ins.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
