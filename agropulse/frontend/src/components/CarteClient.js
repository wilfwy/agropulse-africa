"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "./icons";
import PriceChart from "./PriceChart";
import StatsPanel from "./StatsPanel";

const TogoMap3D = dynamic(() => import("./TogoMap3D"), {
  ssr: false,
  loading: () => <div className="map-shell map-loading" style={{ height: 520 }}>Chargement de la carte…</div>,
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const RANGES = [7, 14, 30];

function pct(v) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%`;
}

export default function CarteClient({ products = [], initialProduct = "MAIS", initialGeo = [], initialOverview = null }) {
  const [product, setProduct] = useState(initialProduct);
  const [days, setDays] = useState(30);
  const [geo, setGeo] = useState(initialGeo);
  const [overview, setOverview] = useState(initialOverview);
  const [selectedId, setSelectedId] = useState(null);
  const [localSeries, setLocalSeries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (prod, range) => {
    setLoading(true);
    try {
      const [g, o] = await Promise.all([
        fetch(`${API}/markets/geo?days=${range}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${API}/stats/overview?product=${prod}&days=${range}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (g?.data) setGeo(g.data);
      if (o?.stats) setOverview(o);
      setError("");
    } catch (e) {
      setError("Impossible de rafraîchir les données — affichage de la dernière série connue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (product === initialProduct && days === 30 && initialOverview) return;
    load(product, days);
  }, [product, days, load, initialProduct, initialOverview]);

  // série locale du marché sélectionné
  useEffect(() => {
    if (!selectedId) { setLocalSeries(null); return; }
    const m = (geo || []).find((x) => x.id === selectedId);
    if (!m) { setLocalSeries(null); return; }
    let cancelled = false;
    fetch(`${API}/prices/trend?product=${product}&market=${encodeURIComponent(m.name_fr)}&days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setLocalSeries(d); })
      .catch(() => { if (!cancelled) setLocalSeries(null); });
    return () => { cancelled = true; };
  }, [selectedId, product, days, geo]);

  const points = useMemo(() => {
    return (geo || [])
      .map((m) => {
        const prod = (m.products || []).find((p) => p.code === product);
        const price = prod
          ? prod.avg_price
          : (m.products || []).length
          ? Math.round((m.products.reduce((s, p) => s + p.avg_price, 0) / m.products.length) * 100) / 100
          : null;
        return {
          id: m.id,
          name: m.name_fr,
          lat: m.lat,
          lng: m.lng,
          price,
          change: prod ? prod.change_pct : m.change_pct,
          count: prod ? prod.sample_count : m.sample_count,
          status: m.status,
          type: m.market_type,
          products: m.products || [],
        };
      })
      .filter((p) => p.price != null);
  }, [geo, product]);

  const selected = points.find((p) => p.id === selectedId) || null;
  const productInfo = products.find((p) => p.code === product);
  const unit = "FCFA/kg";

  return (
    <>
      <section className="panel map-header">
        <div className="map-header-left">
          <h2><Icon name="map" size={18} /> Carte interactive des marchés</h2>
          <p className="muted">
            Relief 3D : la hauteur de chaque colonne suit le niveau de prix. Rouge = pénurie, vert = surplus.
            Cliquez un marché pour ouvrir sa fiche.
          </p>
        </div>
        <div className="map-controls">
          <div className="seg" role="group" aria-label="Produit">
            {products.map((p) => (
              <button key={p.code} className={`seg-btn${p.code === product ? " on" : ""}`} onClick={() => setProduct(p.code)}>
                {p.name_fr}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Période">
            {RANGES.map((d) => (
              <button key={d} className={`seg-btn${d === days ? " on" : ""}`} onClick={() => setDays(d)}>
                {d} j
              </button>
            ))}
          </div>
          {loading && <span className="muted tiny">Actualisation…</span>}
        </div>
      </section>

      {error && <div className="alert-item">{error}</div>}

      <div className="map-layout">
        <TogoMap3D
          points={points}
          unit={unit}
          selectedId={selectedId}
          onSelect={(m) => setSelectedId(m.id)}
          height={540}
        />

        <aside className="panel map-side">
          {selected ? (
            <>
              <div className="side-head">
                <div>
                  <h3>{selected.name.replace(" (Lome)", " (Lomé)")}</h3>
                  <span className="muted">{selected.type === "border" ? "Marché frontalier" : selected.type === "wholesale" ? "Marché de gros" : "Marché de détail"}</span>
                </div>
                <span className={`badge ${selected.status === "penurie" ? "down" : selected.status === "surplus" ? "up" : "stable"}`}>
                  {selected.status}
                </span>
              </div>
              <div className="side-price">
                {selected.price} <small>{unit}</small>
                <span className={`badge ${selected.change >= 0 ? "up" : "down"}`}>{pct(selected.change)}</span>
              </div>
              <div className="muted tiny">{selected.count} relevés sur {days} jours</div>

              {localSeries?.data?.length > 0 && (
                <div className="side-chart">
                  <PriceChart data={localSeries.data} forecast={localSeries.forecast} height={150} compact unit={unit} />
                </div>
              )}

              <h4 className="mini-title">Tous les produits</h4>
              <div className="side-table">
                {(selected.products || []).map((p) => (
                  <div className="side-row" key={p.code}>
                    <span>{p.name_fr}</span>
                    <b>{p.avg_price}</b>
                    <span className={p.change_pct >= 0 ? "up-text" : "down-text"}>{pct(p.change_pct)}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost dark" style={{ width: "100%", marginTop: 10 }} onClick={() => setSelectedId(null)}>
                Fermer la fiche
              </button>
            </>
          ) : (
            <div className="side-empty">
              <Icon name="pin" size={26} />
              <h3>Sélectionnez un marché</h3>
              <p className="muted">
                Cliquez sur une colonne ou sur un repère de la carte pour voir ses prix, sa tendance et son historique.
              </p>
              <div className="side-list">
                {points.slice(0, 6).map((p) => (
                  <button key={p.id} className="side-list-item" onClick={() => setSelectedId(p.id)}>
                    <span>{p.name.replace(" (Lome)", " (Lomé)")}</span>
                    <b>{p.price}</b>
                    <span className={p.change >= 0 ? "up-text" : "down-text"}>{pct(p.change)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <section className="panel">
          <h2>
            <Icon name="chart" size={18} /> {productInfo?.name_fr || product} — {days} jours
            {overview?.meta?.demo && <span className="badge stable" style={{ marginLeft: "auto" }}>série de démonstration</span>}
          </h2>
          <PriceChart
            data={overview?.series || []}
            forecast={overview?.forecast || []}
            height={300}
            unit={unit}
          />
          <p className="muted tiny">
            Courbe pleine : moyenne journalière. Pointillés or : moyenne mobile 7 jours. Bleu : projection à 7 jours
            (régression linéaire sur 21 points, bande d&apos;incertitude).
          </p>
        </section>

        <StatsPanel
          stats={overview?.stats || {}}
          histogram={overview?.histogram || []}
          markets={overview?.markets || []}
          cheapest={overview?.cheapest}
          expensive={overview?.expensive}
          arbitrage={overview?.arbitrage}
          spread_pct={overview?.spread_pct}
          unit={unit}
          title={`Analyse ${productInfo?.name_fr || product}`}
          onSelectMarket={(m) => setSelectedId(m.market_id)}
        />
      </div>
    </>
  );
}
