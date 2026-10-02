"use client";
import { useState } from "react";
import Icon from "../../components/icons";
export default function MarketplacePage() {
  const [offers, setOffers] = useState([{ product: "MAIS", quantity: 2000, price: 230, market: "Atakpamé", score: 4.2 }]);
  const [form, setForm] = useState({ product: "MAIS", quantity: 500, price: 225 });
  async function publish(e) {
    e.preventDefault();
    const r = await fetch("http://localhost:8000/api/v1/marketplace/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: form.product, quantity: form.quantity, price_per_unit: form.price, region_id: "plateaux" }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setOffers([...offers, { ...form, market: "Mon marché", score: j.reliability_score ?? 3.0 }]);
  }
  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="market" /> Marketplace B2B <span className="badge stable">bêta</span></h2>
    <section className="panel"><h2><Icon name="bolt" size={18} /> Publier une offre</h2>
      <form onSubmit={publish} className="grid grid-2" style={{ gap: 10 }}>
        <label>Produit<select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}><option>MAIS</option><option>SOJA</option><option>TOMATE</option></select></label>
        <label>Quantité (kg)<input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
        <label>Prix (F/kg)<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        <div style={{ display: "flex", alignItems: "end" }}><button className="btn btn-forest" style={{ width: "100%" }}>Publier l&apos;offre</button></div>
      </form></section>
    <div className="grid grid-2" style={{ marginTop: 12 }}>
      {offers.map((o, i) => (<div className="card" key={i}><h3><Icon name="market" size={17} /> {o.quantity} kg — {o.product}</h3>
        <div className="price">{o.price} F/kg</div>
        <div className="muted">{o.market} · fiabilité {o.score}/5</div>
        <button className="btn btn-ghost dark" style={{ marginTop: 8 }}>Contacter via WhatsApp</button></div>))}
    </div>
    <p className="muted">Score initial 3/5 · +0,1 par transaction réussie · −0,5 par litige · suspendu sous 2 · commission 1 à 3%.</p>
  </main>);
}
