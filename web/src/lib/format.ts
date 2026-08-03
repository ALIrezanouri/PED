import type { Classification, PricingAdvice } from "./types";

const FA = "fa-IR";

export function fmtNum(n: number | null | undefined, dec = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(FA, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(FA);
}

export function fmtPct(n: number | null | undefined, dec = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toLocaleString(FA, { minimumFractionDigits: dec, maximumFractionDigits: dec })}٪`;
}

export function fmtPValue(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return "—";
  if (p < 0.001) return "<۰٫۰۰۱";
  return Number(p).toLocaleString(FA, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function toFaDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
}

export function jalaliLabel(year: number, month: number): string {
  return `${toFaDigits(year)}/${toFaDigits(String(month).padStart(2, "0"))}`;
}

export const CLASS_FA: Record<Classification, string> = {
  elastic: "کشش‌پذیر",
  inelastic: "کشش‌ناپذیر",
  "unit-elastic": "واحد",
};

export const CLASS_COLOR: Record<Classification, string> = {
  elastic: "#ef4444",
  inelastic: "#22c55e",
  "unit-elastic": "#eab308",
};

// Badge variant per classification (semantic tokens handle the color theme).
export const CLASS_BADGE: Record<Classification, "destructive" | "secondary" | "outline"> = {
  elastic: "destructive",
  inelastic: "secondary",
  "unit-elastic": "outline",
};

export const ADVICE_FA: Record<PricingAdvice, string> = {
  raise: "افزایش قیمت",
  lower: "کاهش قیمت",
  hold: "حفظ قیمت",
};
