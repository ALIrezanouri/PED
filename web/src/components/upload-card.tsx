"use client";

import { useRef, useState } from "react";
import { FileUpIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { analyzeCsv } from "@/lib/api";
import type { ElasticityResult } from "@/lib/types";

export function UploadCard({
  onResult,
  compact = false,
}: {
  onResult: (r: ElasticityResult) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const run = async (file: File) => {
    setLoading(true);
    try {
      const result = await analyzeCsv(file);
      toast.success(
        `تحلیل کامل شد: ${result.metadata.total_products_analyzed} محصول، ${result.metadata.total_groups_analyzed} گروه`,
      );
      onResult(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در تحلیل داده");
    } finally {
      setLoading(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) run(file);
    e.target.value = "";
  };

  const useSample = async () => {
    setLoading(true);
    try {
      const res = await fetch("/sample-transactions.csv");
      const blob = await res.blob();
      await run(new File([blob], "sample-transactions.csv", { type: "text/csv" }));
    } catch {
      toast.error("بارگذاری دادهٔ نمونه ناموفق بود");
      setLoading(false);
    }
  };

  const buttons = (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFile}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? <Spinner data-icon="inline-start" /> : <FileUpIcon data-icon="inline-start" />}
        آپلود فایل CSV
      </Button>
      <Button variant="outline" onClick={useSample} disabled={loading}>
        <SparklesIcon data-icon="inline-start" />
        استفاده از دادهٔ نمونه
      </Button>
    </div>
  );

  if (compact) return buttons;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>ورود دادهٔ فروش</CardTitle>
        <CardDescription>
          فایل CSV تراکنش‌ها را با ستون‌های <code>date, group, product, price, quantity</code> آپلود کنید.
          سیستم کشش قیمتی تقاضا را برای هر محصول و هر گروه محاسبه می‌کند.
        </CardDescription>
      </CardHeader>
      <CardContent>{buttons}</CardContent>
    </Card>
  );
}
