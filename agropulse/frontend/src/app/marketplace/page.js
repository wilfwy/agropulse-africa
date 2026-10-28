"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/icons";
import { apiFetch, getToken } from "../../lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function MarketplacePage() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState({ product: "", region: "", quantity: "500", price: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/marketplace/listings`, { cache: "no-store" }).then((x) => x.json());
      setOffers(r.data || []);
    } catch {
      setErr("Annonces indisponibles pour le moment.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch(`${API}/products`).then((r) => r.json()).then((d) => {
      const list = d.data || [];
      setProducts(list);
      setForm((f) => ({ ...f, product: f.product || list[0]?.code || "" }));
    }).catch(() => {});
    fetch(`${API}/regions`).then((r) => r.json()).then((d) => {
      const list = d.data || [];
      setRegions(list);
      setForm((f) => ({ ...f, region: f.region || list[0]?.id || "" }));
    }).catch(() => {});
  }, [load]);

  async function publish(e) {
    e.preventDefault();
    setErr(""); setNotice("");
    if (!getToken()) { setErr("Connectez-vous pour publier une annonce."); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/marketplace/listings", {
        method: "POST",
        body: JSON.stringify({
          product_id: form.product,
          region_id: form.region || null,
          quantity: Number(form.quantity),
          price_per_unit: Number(form.price),
          description: form.description || null,
        }),
      });
      if (r.detail) {
        setErr(r.detail);
      } else {
        setNotice("Annonce publiée — visible par les acheteurs.");
        setForm((f) => ({ ...f, price: "", description: "" }));
        await load();
      }
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="market" /> Marketplace B2B <span className="badge stable">bêta</span>
    </h2>

    {err && <div className="alert-item">{err} {!getToken() && <a href="/login">Se connecter</a>}</div>}
    {notice && <div className="alert-item">{notice}</div>}

    <section className="panel">
      <h2><Icon name="bolt" size={18} /> Publier une offre</h2>
      <form onSubmit={publish} className="grid grid-2" style={{ gap: 10 }}>
        <label>Produit
          <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
            {products.length === 0 && <option value="">Chargement…</option>}
            {products.map((p) => <option key={p.code} value={p.code}>{p.name_fr}</option>)}
          </select>
        </label>
        <label>Région
          <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            {regions.length === 0 && <option value="">Toute la région</option>}
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name_fr}</option>)}
          </select>
        </label>
        <label>Quantité (kg)
          <input type="number" min="1" step="1" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </label>
        <label>Prix (F/kg)
          <input type="number" min="1" step="0.5" value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>Description (facultatif)
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Récolte 2026, sacs de 50 kg, enlèvement à Atakpamé" />
        </label>
        <div style={{ display: "flex", alignItems: "end", gridColumn: "1 / -1" }}>
          <button className="btn btn-forest" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Publication…" : "Publier l'offre"}
          </button>
        </div>
      </form>
      <p className="muted">
        Publication réservée aux comptes Coopérative et Entreprise. Les autres plans peuvent
        consulter les annonces.
      </p>
    </section>

    <h2 style={{ fontSize: 18, marginTop: 18 }}>Annonces en cours ({offers.length})</h2>
    {loading ? (
      <p className="muted">Chargement des annonces…</p>
    ) : offers.length === 0 ? (
      <p className="muted">Aucune annonce active pour le moment.</p>
    ) : (
      <div className="grid grid-2">
        {offers.map((o) => (
          <div className="card" key={o.id}>
            <h3><Icon name="market" size={17} /> {o.quantity} {o.unit} — {o.product_name || o.product}</h3>
            <div className="price">{o.price_per_unit} F/kg</div>
            <div className="muted">
              {o.region || "Région non précisée"} · {o.seller} · fiabilité {o.reliability_score}/5
            </div>
            {o.description && <p className="muted">{o.description}</p>}
          </div>
        ))}
      </div>
    )}

    <p className="muted" style={{ marginTop: 12 }}>
      Score de départ 3/5 · +0,1 par transaction réussie · −0,5 par litige · suspension sous 2.
      L&apos;échange des coordonnées et la commission (1 à 3 %) restent à brancher.
    </p>
  </main>);
}
