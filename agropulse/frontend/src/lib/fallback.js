// Jeu de repli : utilisé si l'API ne répond pas assez vite (instance Render en
// veille). Les mêmes formes de données que l'API, pour éviter un écran vide.

export const FALLBACK_PRODUCTS = [
  { code: "MAIS", name_fr: "Maïs", unit: "kg" },
  { code: "SOJA", name_fr: "Soja", unit: "kg" },
  { code: "TOMATE", name_fr: "Tomate", unit: "kg" },
  { code: "MANIOC", name_fr: "Manioc", unit: "kg" },
  { code: "IGNAME", name_fr: "Igname", unit: "kg" },
  { code: "RIZ", name_fr: "Riz", unit: "kg" },
];

const MARKETS = [
  { name: "Hedzranawoe (Lome)", lat: 6.1725, lng: 1.25, base: 222 },
  { name: "Kara", lat: 9.5511, lng: 1.1861, base: 231 },
  { name: "Sokode", lat: 8.9833, lng: 1.1333, base: 228 },
  { name: "Atakpame", lat: 7.5333, lng: 1.1333, base: 224 },
  { name: "Kpalime", lat: 6.9, lng: 0.6333, base: 216 },
  { name: "Dapaong", lat: 10.8667, lng: 0.2, base: 240 },
];

function wave(i, base, seed) {
  return base + Math.sin((i + seed) / 5) * base * 0.035 + Math.sin((i + seed) / 2.3) * base * 0.015;
}

export function fallbackOverview(product = "MAIS", days = 30) {
  const factor = { MAIS: 1, SOJA: 1.68, TOMATE: 2.0, MANIOC: 0.68, IGNAME: 1.32, RIZ: 2.0 }[product] || 1;
  const today = new Date();
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const avg = Math.round(wave(days - i, 222 * factor, 3) * 100) / 100;
    series.push({
      date: d.toISOString().slice(0, 10),
      avg_price: avg,
      min_price: Math.round(avg * 0.96 * 100) / 100,
      max_price: Math.round(avg * 1.04 * 100) / 100,
      sample_count: 4,
      ma7: Math.round(wave(days - i - 3, 222 * factor, 3) * 100) / 100,
    });
  }
  const markets = MARKETS.map((m, idx) => ({
    market_id: `fallback-${idx}`,
    market: m.name,
    market_type: "wholesale",
    lat: m.lat,
    lng: m.lng,
    avg_price: Math.round(m.base * factor * 100) / 100,
    min_price: Math.round(m.base * factor * 0.95 * 100) / 100,
    max_price: Math.round(m.base * factor * 1.05 * 100) / 100,
    sample_count: 40,
    change_pct: [1.2, 2.6, 0.4, -1.1, -2.4, 3.1][idx],
    availability: "equilibre",
  }));
  const prices = series.map((s) => s.avg_price);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  return {
    product: { code: product, name_fr: FALLBACK_PRODUCTS.find((p) => p.code === product)?.name_fr || product, unit: "kg" },
    stats: {
      samples: series.length * 4,
      days: series.length,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(mean * 100) / 100,
      min: Math.min(...prices),
      max: Math.max(...prices),
      std: 2.4,
      volatility_pct: 3.1,
      change_pct: 2.2,
      slope_per_day: 0.12,
      momentum_pct: 1.4,
      trend: "hausse",
      amplitude_pct: 7.2,
    },
    series,
    markets,
    histogram: [2, 4, 7, 9, 5, 2, 1].map((c, i) => ({
      from: Math.round((mean - 6 + i * 2) * 100) / 100,
      to: Math.round((mean - 4 + i * 2) * 100) / 100,
      count: c,
    })),
    forecast: [],
    cheapest: markets.reduce((a, b) => (a.avg_price < b.avg_price ? a : b)),
    expensive: markets.reduce((a, b) => (a.avg_price > b.avg_price ? a : b)),
    spread_pct: 11.1,
    arbitrage: {
      buy: markets.reduce((a, b) => (a.avg_price < b.avg_price ? a : b)).market,
      sell: markets.reduce((a, b) => (a.avg_price > b.avg_price ? a : b)).market,
      gain_xof_per_kg: 24,
    },
    meta: { days, source: "fallback", demo: true },
  };
}

export function fallbackGeo(product = "MAIS") {
  const ov = fallbackOverview(product, 30);
  return ov.markets.map((m) => {
    const prod = m.avg_price;
    return {
      id: m.market_id,
      name_fr: m.market,
      market_type: m.market_type,
      lat: m.lat,
      lng: m.lng,
      change_pct: m.change_pct,
      sample_count: m.sample_count,
      product_count: 6,
      status: m.change_pct <= -2 ? "surplus" : m.change_pct >= 2 ? "penurie" : "equilibre",
      products: FALLBACK_PRODUCTS.map((p, i) => ({
        code: p.code,
        name_fr: p.name_fr,
        avg_price: Math.round(prod * [1, 1.68, 2, 0.68, 1.32, 2][i]),
        sample_count: 40,
        change_pct: m.change_pct * (i % 2 ? -1 : 1),
      })),
    };
  });
}

export function fallbackPrices(product = "MAIS") {
  return fallbackGeo(product).flatMap((m) =>
    m.products.map((p) => ({
      product: { code: p.code, name_fr: p.name_fr },
      market: { id: m.id, name_fr: m.name_fr, market_type: m.market_type, lat: m.lat, lng: m.lng },
      avg_price: p.avg_price,
      min_price: Math.round(p.avg_price * 0.96),
      max_price: Math.round(p.avg_price * 1.04),
      currency: "XOF",
      unit: "kg",
      variation_24h: p.change_pct,
      sample_count: p.sample_count,
      source: "fallback",
    }))
  );
}
