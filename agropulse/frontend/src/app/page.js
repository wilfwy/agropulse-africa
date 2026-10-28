import PriceChart from "../components/PriceChart";
import StatsPanel from "../components/StatsPanel";
import MarketExplorer from "../components/MarketExplorer";
import Icon from "../components/icons";
import { fallbackOverview, fallbackPrices } from "../lib/fallback";

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

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default async function Page() {
  const [live, overview] = await Promise.all([
    getJson("/prices/current?product=MAIS&country=TGO"),
    getJson("/stats/overview?product=MAIS&days=30"),
  ]);

  const rawItems = live?.data?.length ? live.data : fallbackPrices("MAIS");
  const items = rawItems.map((p) => ({
    product: p.product.name_fr,
    market: p.market.name_fr,
    price: p.avg_price,
    min: p.min_price,
    max: p.max_price,
    variation: p.variation_24h ?? 0,
    count: p.sample_count,
  }));
  const ov = overview?.stats ? overview : fallbackOverview("MAIS", 30);
  const stats = ov.stats || {};
  const lastDate = ov.series?.length ? ov.series[ov.series.length - 1].date : null;

  return (
    <>
      <section className="hero">
        <span className="kicker"><Icon name="bolt" size={14} /> Togo · temps réel</span>
        <h1>L&apos;intelligence des marchés agricoles africains</h1>
        <p>Prix du maïs, du soja et de la tomate sur plus de 15 marchés togolais — livrés sur WhatsApp en 3 secondes. Sans application à installer.</p>
        <div className="cta-row">
          <a className="btn btn-primary" href="https://wa.me/22800000000?text=BONJOUR">Commencer sur WhatsApp <Icon name="arrow" size={17} /></a>
          <a className="btn btn-ghost" href="/tarifs">Voir les tarifs</a>
        </div>
      </section>

      <div className="kpi" aria-label="Chiffres clés">
        <div><b>{stats.days || 30}</b> <span className="muted">jours d&apos;historique</span></div>
        <div><b>{new Set(items.map((i) => i.market)).size}</b> <span className="muted">marchés suivis</span></div>
        <div><b>{stats.samples || "—"}</b> <span className="muted">relevés analysés</span></div>
        <div>
          <b className={stats.change_pct >= 0 ? "up-text" : "down-text"}>
            {stats.change_pct > 0 ? "+" : ""}{stats.change_pct ?? 0}%
          </b>{" "}
          <span className="muted">maïs sur 30 j</span>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <section className="panel">
          <h2>
            <Icon name="chart" size={18} /> Maïs — 30 jours
            {ov.meta?.demo && <span className="badge stable" style={{ marginLeft: "auto" }}>démonstration</span>}
          </h2>
          <PriceChart data={ov.series || []} forecast={ov.forecast || []} height={270} unit="FCFA/kg" />
          <div className="chart-caption">
            <span><i className="dot forest" /> Prix moyen journalier</span>
            <span><i className="dot gold" /> Moyenne mobile 7 j</span>
            <span><i className="dot blue" /> Projection 7 j</span>
          </div>
        </section>
        <StatsPanel
          stats={stats}
          histogram={ov.histogram || []}
          markets={ov.markets || []}
          cheapest={ov.cheapest}
          expensive={ov.expensive}
          arbitrage={ov.arbitrage}
          spread_pct={ov.spread_pct}
          title="Maïs — indicateurs clés"
          compact
        />
      </div>

      <h2 style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="chart" /> Prix du jour{lastDate ? ` — ${fmtDate(lastDate)}` : ""}
      </h2>
      <MarketExplorer items={items} />

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <section className="panel">
          <h2><Icon name="map" size={18} /> Carte 3D des marchés</h2>
          <p className="muted">
            Colonnes en relief, couleur par tension de marché, corridors commerciaux animés et fiche détaillée
            par marché.
          </p>
          <div className="top-markets">
            {(ov.markets || []).slice(0, 3).map((m) => (
              <div className="top-market" key={m.market_id}>
                <span>{m.market.replace(" (Lome)", " (Lomé)")}</span>
                <b>{m.avg_price} F/kg</b>
                <span className={m.change_pct >= 0 ? "up-text" : "down-text"}>
                  {m.change_pct > 0 ? "+" : ""}{m.change_pct}%
                </span>
              </div>
            ))}
          </div>
          <p><a className="btn btn-ghost dark" href="/carte">Ouvrir la carte interactive</a></p>
        </section>
        <section className="panel">
          <h2><Icon name="bell" size={18} /> Alertes actives</h2>
          <div className="alert-item"><b>Maïs au-dessus de 250 F/kg à Kara</b> <span className="muted">— WhatsApp</span></div>
          <div className="alert-item"><b>Tomate sous 400 F/kg à Lomé</b> <span className="muted">— WhatsApp</span></div>
          <p><a className="btn btn-forest" href="/alertes">Gérer mes alertes</a></p>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 14 }}>
        <h2><Icon name="leaf" size={18} /> Comment ça marche</h2>
        <div className="muted">1. Nos agents relèvent les prix sur les marchés · 2. L&apos;IA valide et prévoit · 3. Vous recevez prix et alertes sur WhatsApp · 4. Vous vendez au bon prix — revenu estimé +15 à 25%.</div>
        <p><span className="badge stable">WhatsApp-first</span> <span className="badge stable">Français, éwé, kabyè</span> <span className="badge stable">Flooz / T-Money</span></p>
      </section>
    </>
  );
}
