"use client";
import { useEffect, useState } from "react";
import Icon from "../../components/icons";
import { apiFetch, getToken } from "../../lib/api";

export default function AlertesPage() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ product: "MAIS", op: ">", threshold: 250, market: "Kara" });
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!getToken()) { setErr("Connectez-vous pour gérer vos alertes."); setLoading(false); return; }
    try {
      const r = await apiFetch("/alerts");
      setList(r.data || []);
      setErr("");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await apiFetch("/alerts", { method: "POST", body: JSON.stringify({
        product_id: form.product, market_id: form.market,
        alert_type: form.op === ">" ? "price_above" : "price_below",
        threshold_value: Number(form.threshold) }) });
      load();
    } catch (e) { setErr(e.message); }
  }
  async function remove(id) {
    try { await apiFetch(`/alerts/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setErr(e.message); }
  }

  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="bell" /> Mes alertes ({list.length})</h2>
    {err && <div className="alert-item">{err}</div>}
    {loading ? <p className="muted">Chargement…</p> : (
      <>
        <section className="panel"><h2><Icon name="bolt" size={18} /> Créer une alerte</h2>
          <form onSubmit={create} style={{ display: "grid", gap: 10 }}>
            <div className="grid grid-2">
              <label>Produit<select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}><option>MAIS</option><option>SOJA</option><option>TOMATE</option></select></label>
              <label>Marché<select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}><option>Kara</option><option>Hedzranawoe (Lome)</option><option>Sokode</option></select></label>
            </div>
            <div className="grid grid-2">
              <label>Condition<select value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })}><option value=">">Prix supérieur à</option><option value="<">Prix inférieur à</option></select></label>
              <label>Seuil (FCFA/kg)<input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} /></label>
            </div>
            <button className="btn btn-forest">Activer l&apos;alerte WhatsApp</button>
          </form></section>
        <div style={{ marginTop: 12 }}>{list.map((a) => (
          <div className="alert-item" key={a.id}><b>{a.product} {a.op} {a.threshold} F/kg</b> <span className="muted">— {a.market || "tous marchés"} · {a.channel} · active</span>
            <button className="btn btn-ghost dark" style={{ minHeight: 36, marginLeft: 10, padding: "4px 12px" }} onClick={() => remove(a.id)}>Désactiver</button></div>))}</div>
      </>
    )}
    <p className="muted">10 alertes max en Basic, illimité en Pro. Moteur toutes les 15 minutes.</p>
  </main>);
}
