// Generate a realistic sample transactions CSV for the elasticity app.
// Columns: date,group,product,price,quantity,cost  (Jalali YYYY/MM dates)
// Includes own-price elasticity, marginal cost, and cross-price (substitute /
// complement) relationships so the economist features have meaningful data.
import { writeFileSync } from "node:fs";

let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

// key -> [group, product, ownBeta, basePrice, baseQty, margin]
const PRODUCTS = {
  milk: ["لبنیات", "شیر پاستوریزه", -1.42, 90, 1800, 0.28],
  cheese: ["لبنیات", "پنیر", -0.68, 150, 900, 0.35],
  rice: ["نان و غلات", "برنج", -1.05, 200, 700, 0.3],
  bread: ["نان و غلات", "نان لواش", -0.35, 30, 2500, 0.4],
  redmeat: ["پروتئین", "گوشت قرمز", -1.85, 1800, 300, 0.22],
  chicken: ["پروتئین", "مرغ", -0.92, 650, 1200, 0.25],
  apple: ["میوه", "سیب", -1.2, 120, 1000, 0.33],
  tomato: ["سبزیجات", "گوجه فرنگی", -0.55, 80, 1500, 0.45],
  // High-margin, elastic discretionary goods: in-range profit optima are demonstrable.
  energy: ["نوشیدنی", "نوشابهٔ انرژی‌زا", -2.4, 250, 400, 0.6],
  pistachio: ["آجیل", "پسته", -1.6, 900, 250, 0.5],
};

// Cross-price effects on log-quantity: target += coef * ln(price_source)
// Positive coef => substitutes, negative => complements.
const CROSS = [
  ["chicken", "redmeat", 0.55], // chicken & red meat are substitutes
  ["redmeat", "chicken", 0.35],
  ["cheese", "bread", -0.4], // cheese & bread are complements
  ["bread", "cheese", -0.25],
];

const keys = Object.keys(PRODUCTS);
const periods = [];
for (let y = 1400; y <= 1402; y++) for (let m = 1; m <= 12; m++) periods.push([y, m]);

// Pass 1: generate a price for every product in every period.
const price = {}; // key -> period index -> price
for (const k of keys) {
  const [, , , basePrice] = PRODUCTS[k];
  price[k] = periods.map((_, t) => basePrice * (1 + 0.03 * (t + 1)) * (1 + (rnd() - 0.5) * 0.08));
}

// Pass 2: quantities from own elasticity + cross terms.
const rows = ["date,group,product,price,quantity,cost"];
for (const k of keys) {
  const [group, product, ownBeta, basePrice, baseQty, margin] = PRODUCTS[k];
  const crossForK = CROSS.filter(([tgt]) => tgt === k);
  periods.forEach(([y, m], t) => {
    const p = price[k][t];
    let lnQ = Math.log(baseQty) + ownBeta * (Math.log(p) - Math.log(basePrice));
    for (const [, src, coef] of crossForK) {
      lnQ += coef * (Math.log(price[src][t]) - Math.log(PRODUCTS[src][3]));
    }
    lnQ += (rnd() - 0.5) * 0.05;
    const qty = Math.exp(lnQ);
    const cost = p * (1 - margin);
    rows.push(
      `${y}/${String(m).padStart(2, "0")},${group},${product},${p.toFixed(0)},${qty.toFixed(0)},${cost.toFixed(0)}`,
    );
  });
}

const out = process.argv[2] ?? "sample-transactions.csv";
writeFileSync(out, rows.join("\n") + "\n");
console.log(`Wrote ${out} with ${rows.length - 1} rows`);
