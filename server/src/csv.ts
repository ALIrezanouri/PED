import Papa from "papaparse";
import type { Transaction } from "./elasticity.js";

/** Column name aliases so the upload is forgiving about headers (EN + FA). */
const ALIASES: Record<keyof Transaction, string[]> = {
  date: ["date", "تاریخ", "زمان", "period"],
  group: ["group", "گروه", "category", "دسته"],
  subgroup: ["subgroup", "زیرگروه", "زیر گروه"],
  product: ["product", "محصول", "sku", "item", "کالا"],
  price: ["price", "قیمت", "unit_price", "قیمت واحد"],
  quantity: ["quantity", "qty", "تعداد", "مقدار", "حجم", "demand", "تقاضا"],
  cost: ["cost", "بهای تمام شده", "هزینه", "unit_cost", "قیمت تمام شده"],
};

function findKey(headers: string[], aliases: string[]): string | undefined {
  const norm = (s: string) => s.trim().toLowerCase();
  return headers.find((h) => aliases.some((a) => norm(h) === norm(a)));
}

export type ParseResult =
  | { ok: true; rows: Transaction[]; skipped: number }
  | { ok: false; error: string };

/** Parse a CSV string of transactions into typed rows. */
export function parseTransactionsCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (!parsed.data.length) {
    return { ok: false, error: "CSV is empty or has no data rows." };
  }
  const headers = parsed.meta.fields ?? [];
  const keys = {
    date: findKey(headers, ALIASES.date),
    group: findKey(headers, ALIASES.group),
    subgroup: findKey(headers, ALIASES.subgroup),
    product: findKey(headers, ALIASES.product),
    price: findKey(headers, ALIASES.price),
    quantity: findKey(headers, ALIASES.quantity),
    cost: findKey(headers, ALIASES.cost),
  };
  const missing = (["date", "group", "product", "price", "quantity"] as const).filter(
    (k) => !keys[k],
  );
  if (missing.length) {
    return {
      ok: false,
      error: `Missing required column(s): ${missing.join(", ")}. Found headers: ${headers.join(", ")}`,
    };
  }

  const rows: Transaction[] = [];
  let skipped = 0;
  for (const raw of parsed.data) {
    const price = Number(raw[keys.price!]);
    const quantity = Number(raw[keys.quantity!]);
    const date = raw[keys.date!]?.trim();
    const group = raw[keys.group!]?.trim();
    const product = raw[keys.product!]?.trim();
    if (!date || !group || !product || !Number.isFinite(price) || !Number.isFinite(quantity)) {
      skipped++;
      continue;
    }
    const cost = keys.cost ? Number(raw[keys.cost]) : NaN;
    rows.push({
      date,
      group,
      subgroup: keys.subgroup ? raw[keys.subgroup]?.trim() : undefined,
      product,
      price,
      quantity,
      cost: Number.isFinite(cost) && cost > 0 ? cost : undefined,
    });
  }
  if (!rows.length) {
    return { ok: false, error: "No valid rows after parsing (check numeric price/quantity)." };
  }
  return { ok: true, rows, skipped };
}
