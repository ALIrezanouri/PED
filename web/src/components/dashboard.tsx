"use client";

import { useState } from "react";
import { BarChart3Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UploadCard } from "./upload-card";
import { KpiStrip } from "./kpi-strip";
import { ResultsTable } from "./results-table";
import { WhatIfSimulator } from "./what-if";
import { ElasticityBarChart, ScatterFitChart, TimeSeriesChart } from "./charts";
import { InsightsCard } from "./insights";
import { CrossPriceHeatmap, YearlyElasticityHeatmap } from "./heatmaps";
import type { AnalysisUnit, ElasticityResult } from "@/lib/types";

function Level({ units, pooledBeta }: { units: AnalysisUnit[]; pooledBeta: number }) {
  const [tsName, setTsName] = useState(units[0]?.name ?? "");
  const tsUnit = units.find((u) => u.name === tsName) ?? units[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>کشش قیمتی به تفکیک</CardTitle>
          </CardHeader>
          <CardContent>
            <ElasticityBarChart units={units} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>پراکندگی قیمت–تقاضا و خط رگرسیون</CardTitle>
          </CardHeader>
          <CardContent>
            <ScatterFitChart units={units} pooledBeta={pooledBeta} />
          </CardContent>
        </Card>
      </div>

      <WhatIfSimulator units={units} />

      <Card>
        <CardHeader>
          <CardTitle>پایداری کشش در طول زمان</CardTitle>
        </CardHeader>
        <CardContent>
          <YearlyElasticityHeatmap units={units} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>روند زمانی قیمت و تقاضا</CardTitle>
          <Select value={tsUnit?.name ?? ""} onValueChange={(v) => setTsName(v ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {units.map((u) => (
                  <SelectItem key={u.name} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart unit={tsUnit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>جدول نتایج</CardTitle>
        </CardHeader>
        <CardContent>
          <ResultsTable units={units} />
        </CardContent>
      </Card>
    </div>
  );
}

export function Dashboard() {
  const [result, setResult] = useState<ElasticityResult | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="text-primary size-6" />
            <h1 className="text-xl font-bold sm:text-2xl">تحلیل کشش قیمتی تقاضا</h1>
          </div>
          <p className="text-muted-foreground text-sm" dir="ltr">
            Price Elasticity of Demand — Enterprise Analytics
          </p>
          {result ? (
            <p className="text-muted-foreground text-xs">
              بازهٔ داده: {result.metadata.data_range} · روش: {result.metadata.method}
              {result._meta ? ` · ${result._meta.rows_used} ردیف` : ""}
            </p>
          ) : null}
        </div>
        {result ? <UploadCard onResult={setResult} compact /> : null}
      </header>

      <Separator />

      {result ? (
        <div className="flex flex-col gap-6">
          <KpiStrip result={result} />
          <div className="grid gap-4 lg:grid-cols-2">
            <InsightsCard units={result.products} cross={result.cross_price} />
            <Card>
              <CardHeader>
                <CardTitle>کشش متقاطع (جانشین / مکمل)</CardTitle>
              </CardHeader>
              <CardContent>
                <CrossPriceHeatmap cross={result.cross_price} />
              </CardContent>
            </Card>
          </div>
          <Tabs defaultValue="products">
            <TabsList>
              <TabsTrigger value="products">محصولات</TabsTrigger>
              <TabsTrigger value="groups">گروه‌ها</TabsTrigger>
            </TabsList>
            <TabsContent value="products" className="mt-4">
              <Level units={result.products} pooledBeta={result.pooled_regression.elasticity_beta} />
            </TabsContent>
            <TabsContent value="groups" className="mt-4">
              <Level units={result.groups} pooledBeta={result.pooled_regression.elasticity_beta} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16">
          <UploadCard onResult={setResult} />
        </div>
      )}
    </div>
  );
}
