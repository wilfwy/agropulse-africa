"use client";
import { useState } from "react";
import Icon from "../../components/icons";
export default function AgentPage() {
  const [queue, setQueue] = useState([]);
  const [form, setForm] = useState({ market: "Hedzranawoé", product: "MAIS", price: 225, volume: 500 });
  function submit(e) {
    e.preventDefault();
    const item = { ...form, at: new Date().toLocaleTimeString(), status: "pending" };
    const q = [...queue, item];
    try { localStorage.setItem("agropulse-queue", JSON.stringify(q)); } catch {}
    setQueue(q);
    fetch("http://localhost:8000/api/v1/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: form.product, market_id: form.market, price: Number(form.price), volume_estimate: Number(form.volume) }) }).catch(() => {});
  }
  return (<main style={{ maxWidth: 460, margin: "0 auto" }}>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="camera" /> Saisie prix <span className="badge stable">PWA hors-ligne</span></h2>
    <section className="panel"><form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <label>Marché<select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}><option>Hedzranawoé</option><option>Kara</option><option>Sokodé</option><option>Atakpamé</option></select></label>
      <label>Produit<select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}><option>MAIS</option><option>SOJA</option><option>TOMATE</option></select></label>
      <div className="grid grid-2">
        <label>Prix (FCFA/kg)<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        <label>Volume (kg)<input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} /></label>
      </div>
      <button type="button" className="btn btn-ghost dark"><Icon name="camera" size={17} /> Ajouter une photo</button>
      <button className="btn btn-forest"><Icon name="check" size={17} /> Soumettre</button>
    </form></section>
    <p className="muted">File locale : <b>{queue.length}</b> · Dernière 07:32 · Score qualité 4,2/5 · Minimum 3 jours par marché et par semaine.</p>
  </main>);
}
