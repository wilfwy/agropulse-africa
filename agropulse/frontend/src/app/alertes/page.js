"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/icons";
import { apiFetch, getToken, me } from "../../lib/api";
import { prettyName, prettyProduct } from "../../lib/names";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AlertesPage() {
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ product: "", op: ">", threshold: 250, market: "" });

  const load = useCallback(async () => {
    if (!getToken()) { setErr("Connectez-vous pour gérer vos alertes."); setLoading(false); return; }
    try {
      const r = await apiFetch("/alerts");
      if (r.detail) setErr(r.detail); else { setList(r.data || []); setErr(""); }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (getToken()) me().then(setUser).catch(() => setUser(null));
    fetch(`${API}/products`).then((r) => r.json()).then((d) => {
      const p = d.data || [];
      setProducts(p);
      setForm((f) => ({ ...f, product: f.product || p[0]?.code || "" }));
    }).catch(() => {});
    fetch(`${API}/markets`).then((r) => r.json()).then((d) => {
      const m = d.data || [];
      setMarkets(m);
      setForm((f) => ({ ...f, market: f.market || m[0]?.id || "" }));
    }).catch(() => {});
  }, [load]);

  async function create(e) {
    e.preventDefault();
    setErr(""); setNotice("");
    if (!getToken()) { setErr("Connectez-vous pour créer une alerte."); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/alerts", {
        method: "POST",
        body: JSON.stringify({
          product_id: form.product,
          market_id: form.market || null,
          alert_type: form.op === ">" ? "price_above" : "price_below",
          threshold_value: Number(form.threshold),
          channel: "whatsapp",
        }),
      });
      if (r.detail) setErr(r.detail);
      else { setNotice("Alerte active. Vous serez prévenu sur WhatsApp."); await load(); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function remove(id) {
    setErr(""); setNotice("");
    try {
      const r = await apiFetch(`/alerts/${id}`, { method: "DELETE" });
      if (r.detail) setErr(r.detail); else { setNotice("Alerte désactivée."); await load(); }
    } catch (e) { setErr(e.message); }
  }

  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="bell" /> Mes alertes ({list.length})
    </h2>

    {err && <div className="alert-item">{err} {!getToken() && <a href="/login">Se connecter</a>}</div>}
    {notice && <div className="alert-item">{notice}</div>}

    {loading ? <p className="muted">Chargement…</p> : (
      <>
        <section className="panel">
          <h2><Icon name="bolt" size={18} /> Créer une alerte</h2>
          <form onSubmit={create} style={{ display: "grid", gap: 10 }}>
            <div className="grid grid-2">
              <label>Produit
                <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                  {products.length === 0 && <option value="">Chargement…</option>}
                  {products.map((p) => <option key={p.code} value={p.code}>{prettyProduct(p.name_fr)}</option>)}
                </select>
              </label>
              <label>Marché
                <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
                  {markets.length === 0 && <option value="">Tous les marchés</option>}
                  {markets.map((m) => <option key={m.id} value={m.id}>{prettyName(m.name_fr)}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-2">
              <label>Condition
                <select value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })}>
                  <option value=">">Prix supérieur à</option>
                  <option value="<">Prix inférieur à</option>
                </select>
              </label>
              <label>Seuil (FCFA/kg)
                <input type="number" aria-label="Seuil en FCFA par kilogramme" min="1" step="1" value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })} required />
              </label>
            </div>
            <button className="btn btn-forest" disabled={busy}>
              <Icon name="bell" size={17} /> {busy ? "Enregistrement…" : "Activer l'alerte WhatsApp"}
            </button>
          </form>
        </section>

        <div style={{ marginTop: 12 }}>
          {list.length === 0 ? (
            <p className="muted">Aucune alerte active pour ce compte.</p>
          ) : list.map((a) => (
            <div className="alert-item" key={a.id}>
              <b>
                {prettyProduct(a.product)} {a.alert_type === "price_below" ? "sous" : "au-dessus de"}{" "}
                {a.threshold_value} F/kg
              </b>{" "}
              <span className="muted">
                — {a.market ? prettyName(a.market) : "tous les marchés"} · {a.channel} · active
              </span>
              <button className="btn btn-ghost dark" style={{ minHeight: 36, marginLeft: 10, padding: "4px 12px" }}
                onClick={() => remove(a.id)}>Désactiver</button>
            </div>
          ))}
        </div>
      </>
    )}

    <p className="muted">
      {user ? `Plan ${user.plan} — quota d'alertes selon l'abonnement.` : ""} Vérification
      toutes les 15 minutes ; l&apos;envoi WhatsApp réel reste à configurer.
    </p>
  </main>);
}
