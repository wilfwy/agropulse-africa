import PriceChart from "../components/PriceChart";
import MarketExplorer from "../components/MarketExplorer";
import Icon from "../components/icons";

async function getPrices() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  try {
    const r = await fetch(`${base}/prices/current?product=MAIS&country=TGO`, { cache: "no-store" });
    return r.json();
  } catch { return { data: [] }; }
}

const FALLBACK = [
  { product: "Maïs", market: "Hedzranawoé", price: 225, min: 200, max: 250, variation: 3.2, count: 5 },
  { product: "Soja", market: "Hedzranawoé", price: 380, min: 350, max: 410, variation: -1.5, count: 4 },
  { product: "Tomate", market: "Hedzranawoé", price: 450, min: 400, max: 500, variation: 8.1, count: 6 },
  { product: "Maïs", market: "Kara", price: 210, min: 195, max: 230, variation: 2.1, count: 3 },
  { product: "Soja", market: "Kara", price: 375, min: 350, max: 400, variation: -2.0, count: 2 },
  { product: "Tomate", market: "Sokodé", price: 420, min: 390, max: 450, variation: 5.0, count: 3 },
];

export default async function Page() {
  const live = await getPrices();
  const items = (live.data && live.data.length
    ? live.data.map((p) => ({
        product: p.product.name_fr, market: p.market.name_fr,
        price: p.avg_price, min: p.min_price, max: p.max_price,
        variation: p.variation_24h ?? 0, count: p.sample_count,
      }))
    : FALLBACK);

  return (<>
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
      <div><b>15+</b> <span className="muted">marchés suivis</span></div>
      <div><b>3</b> <span className="muted">produits MVP</span></div>
      <div><b>&gt;85%</b> <span className="muted">fiabilité validée</span></div>
      <div><b>3s</b> <span className="muted">réponse WhatsApp</span></div>
    </div>

    <h2 style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="chart" /> Prix du jour — Lomé, 8 juillet 2026
    </h2>
    <MarketExplorer items={items} />

    <div className="grid grid-2" style={{ marginTop: 14 }}>
      <section className="panel">
        <h2><Icon name="chart" size={18} /> Évolution maïs — 30 jours + prévision IA</h2>
        <PriceChart />
        <div className="muted">Courbe pleine : prix constatés. Pointillés or : prévision Prophet 7/30 jours, intervalle ±8%.</div>
      </section>
      <div>
        <section className="panel" style={{ marginBottom: 14 }}>
          <h2><Icon name="pin" size={18} /> Carte des marchés</h2>
          <div className="muted">Hedzranawoé <span className="badge up">+3,2%</span> · Kara <span className="badge up">+2,1%</span> · Sokodé <span className="badge down">−1,5%</span></div>
          <p><a className="btn btn-ghost dark" href="/carte">Ouvrir la carte interactive</a></p>
        </section>
        <section className="panel">
          <h2><Icon name="bell" size={18} /> Alertes actives</h2>
          <div className="alert-item"><b>Maïs au-dessus de 250 F/kg à Kara</b> <span className="muted">— WhatsApp</span></div>
          <div className="alert-item"><b>Tomate sous 400 F/kg à Lomé</b> <span className="muted">— WhatsApp</span></div>
          <p><a className="btn btn-forest" href="/alertes">Gérer mes alertes</a></p>
        </section>
      </div>
    </div>

    <section className="panel" style={{ marginTop: 14 }}>
      <h2><Icon name="leaf" size={18} /> Comment ça marche</h2>
      <div className="muted">1. Nos agents relèvent les prix sur les marchés · 2. L&apos;IA valide et prévoit · 3. Vous recevez prix et alertes sur WhatsApp · 4. Vous vendez au bon prix — revenu estimé +15 à 25%.</div>
      <p><span className="badge stable">WhatsApp-first</span> <span className="badge stable">Français, éwé, kabyè</span> <span className="badge stable">Flooz / T-Money</span></p>
    </section>
  </>);
}
