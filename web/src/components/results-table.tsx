"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, SearchIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { CLASS_BADGE, CLASS_FA, fmtInt, fmtNum, fmtPct, fmtPValue } from "@/lib/format";
import type { AnalysisUnit } from "@/lib/types";

type SortKey = keyof Pick<
  AnalysisUnit,
  "name" | "elasticity_beta" | "std_error" | "p_value" | "r_squared" | "n_observations" | "revenue_share"
>;

const COLS: { key: SortKey | "classification"; label: string }[] = [
  { key: "name", label: "نام" },
  { key: "elasticity_beta", label: "β" },
  { key: "std_error", label: "۹۵٪ CI" },
  { key: "p_value", label: "p-value" },
  { key: "r_squared", label: "R²" },
  { key: "n_observations", label: "n" },
  { key: "classification", label: "طبقه‌بندی" },
  { key: "revenue_share", label: "سهم درآمد" },
];

function toCsv(rows: AnalysisUnit[]): string {
  const header = ["name", "parent", "elasticity_beta", "std_error", "p_value", "r_squared", "n_observations", "classification", "revenue_share"];
  const lines = rows.map((r) =>
    [r.name, r.parent ?? "", r.elasticity_beta, r.std_error, r.p_value, r.r_squared, r.n_observations, r.classification, r.revenue_share]
      .map((v) => (typeof v === "string" && (v.includes(",") || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v))
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function ResultsTable({ units }: { units: AnalysisUnit[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | "classification">("elasticity_beta");
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    const q = search.trim();
    let r = q ? units.filter((u) => u.name.includes(q) || (u.parent ?? "").includes(q)) : units;
    r = [...r].sort((a, b) => {
      const va = a[sortKey as keyof AnalysisUnit];
      const vb = b[sortKey as keyof AnalysisUnit];
      if (typeof va === "string" && typeof vb === "string") {
        return asc ? va.localeCompare(vb, "fa") : vb.localeCompare(va, "fa");
      }
      return asc ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return r;
  }, [units, search, sortKey, asc]);

  const onSort = (key: SortKey | "classification") => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "elasticity_beta" || key === "p_value" || key === "name");
    }
  };

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "elasticity_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="جست‌وجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Button variant="outline" size="sm" onClick={download}>
          <DownloadIcon data-icon="inline-start" />
          خروجی CSV
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLS.map((c) => (
                <TableHead
                  key={c.key}
                  className="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => onSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key ? (
                      asc ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />
                    ) : null}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={`${u.level}-${u.name}`}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell dir="ltr" className="tabular-nums">{fmtNum(u.elasticity_beta, 3)}</TableCell>
                <TableCell dir="ltr" className="text-muted-foreground tabular-nums whitespace-nowrap">
                  [{fmtNum(u.ci_low, 2)}, {fmtNum(u.ci_high, 2)}]
                </TableCell>
                <TableCell dir="ltr" className="tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {fmtPValue(u.p_value)}
                    {u.significant ? (
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500" title="معنادار (p<۰٫۰۵)" />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell dir="ltr" className="tabular-nums">{fmtNum(u.r_squared, 3)}</TableCell>
                <TableCell dir="ltr" className="tabular-nums">{fmtInt(u.n_observations)}</TableCell>
                <TableCell>
                  <Badge variant={CLASS_BADGE[u.classification]}>{CLASS_FA[u.classification]}</Badge>
                </TableCell>
                <TableCell dir="ltr" className="tabular-nums">{fmtPct(u.revenue_share)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="text-muted-foreground text-xs">{fmtInt(rows.length)} ردیف</div>
    </div>
  );
}
