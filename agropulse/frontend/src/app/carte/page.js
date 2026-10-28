import CarteClient from "../../components/CarteClient";
import { FALLBACK_PRODUCTS, fallbackGeo, fallbackOverview } from "../../lib/fallback";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getJson(path, ms = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${API}${path}`, { cache: "no-store", signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const dynamic = "force-dynamic";

export default async function CartePage() {
  const [geo, overview, products] = await Promise.all([
    getJson("/markets/geo?days=30"),
    getJson("/stats/overview?product=MAIS&days=30"),
    getJson("/products"),
  ]);

  return (
    <main>
      <CarteClient
        products={products?.data?.length ? products.data : FALLBACK_PRODUCTS}
        initialProduct="MAIS"
        initialGeo={geo?.data?.length ? geo.data : fallbackGeo("MAIS")}
        initialOverview={overview?.stats ? overview : fallbackOverview("MAIS", 30)}
      />
    </main>
  );
}
