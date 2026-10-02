"use client";
import { useState } from "react";
import Icon from "../../components/icons";
export default function AlertesPage() {
  const [list, setList] = useState([
    { id: 1, product: "MAIS", op: ">", threshold: 250, market: "Kara" },
    { id: 2, product: "TOMATE", op: "<", threshold: 400, market: "Lomé" },
    { id: 3, product: "SOJA", op: ">", threshold: 400, market: "Sokodé" }]);
  const [form, setForm] = useState({ product: "MAIS", op: ">", threshold: 250, market: "Kara" });
  async function create(e) {
    e.preventDefault();
    await fetch("http://localhost:8000/api/v1/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: form.product, alert_type: form.op === ">" ? "price_above" : "price_below", threshold_value: Number(form.threshold) }) }).catch(() => {});
    setList([...list, { id: Date.now(), ...form }]);
  }
  async function remove(id) {
    await fetch(`http://localhost:8000/api/v1/alerts/${id}`, { method: "DELETE" }).catch(() => {});
    setList(list.filter((a) => a.id !== id));
  }
  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="bell" /> Mes alertes ({list.length})</h2>
    <section className="panel"><h2><Icon name="bolt" size={18} /> Créer une alerte</h2>
      <form onSubmit={create} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>Produit<select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}><option>MAIS</option><option>SOJA</option><option>TOMATE</option></select></label>
          <label>Marché<select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}><option>Kara</option><option>Lomé</option><option>Sokodé</option></select></label>
        </div>
        <div className="grid grid-2">
          <label>Condition<select value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })}><option value=">">Prix supérieur à</option><option value="<">Prix inférieur à</option></select></label>
          <label>Seuil (FCFA/kg)<input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} /></label>
        </div>
        <button className="btn btn-forest">Activer l&apos;alerte WhatsApp</button>
      </form></section>
    <div style={{ marginTop: 12 }}>{list.map((a) => (
      <div className="alert-item" key={a.id}><b>{a.product} {a.op} {a.threshold} F/kg</b> <span className="muted">— {a.market} · WhatsApp · active</span>
        <button className="btn btn-ghost dark" style={{ minHeight: 36, marginLeft: 10, padding: "4px 12px" }} onClick={() => remove(a.id)}>Désactiver</button></div>))}</div>
    <p className="muted">10 alertes max en Basic, illimité en Pro. Moteur Celery Beat toutes les 15 minutes.</p>
  </main>);
}
