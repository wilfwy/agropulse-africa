"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/icons";
import { apiFetch, getToken, me } from "../../lib/api";
import { prettyName, prettyProduct } from "../../lib/names";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const QUEUE_KEY = "agropulse-price-queue";

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(items) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items)); } catch {}
}

export default function AgentPage() {
  const [products, setProducts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [form, setForm] = useState({ product: "", market: "", price: "", volume: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState([]);
  const [user, setUser] = useState(null);
  const canEnter = !!user && ["agent", "admin"].includes(user.role);

  useEffect(() => {
    setQueue(readQueue());
    if (getToken()) me().then(setUser).catch(() => setUser(null));
    fetch(`${API}/products`).then((r) => r.json()).then((d) => {
      const list = d.data || [];
      setProducts(list);
      setForm((f) => ({ ...f, product: f.product || list[0]?.code || "" }));
    }).catch(() => setErr("Référentiel produits indisponible."));
    fetch(`${API}/markets`).then((r) => r.json()).then((d) => {
      const list = d.data || [];
      setMarkets(list);
      setForm((f) => ({ ...f, market: f.market || list[0]?.id || "" }));
    }).catch(() => {});
  }, []);

  const submitOne = useCallback(async (item) => {
    const r = await apiFetch("/prices", {
      method: "POST",
      body: JSON.stringify({
        product_id: item.product,
        market_id: item.market,
        price: Number(item.price),
        volume_estimate: item.volume ? Number(item.volume) : null,
      }),
    });
    if (r.detail) throw new Error(r.detail);
    return r;
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!getToken()) { setErr("Connectez-vous avec un compte agent pour saisir un prix."); return; }
    if (!canEnter) { setErr("La saisie est réservée aux agents terrain."); return; }
    if (!form.product || !form.market || !Number(form.price)) {
      setErr("Produit, marché et prix sont obligatoires."); return;
    }
    setBusy(true);
    try {
      const r = await submitOne(form);
      setMsg(`Relevé enregistré (${r.status}) — il sera publié après validation.`);
      setForm((f) => ({ ...f, price: "", volume: "" }));
    } catch (e) {
      const item = { ...form, at: new Date().toISOString() };
      const q = [...queue, item];
      setQueue(q); writeQueue(q);
      setErr(`Envoi impossible (${e.message}). Relevé conservé dans la file locale.`);
    }
    setBusy(false);
  }

  async function sync() {
    if (!getToken()) { setErr("Connectez-vous pour synchroniser la file."); return; }
    setBusy(true); setErr(""); setMsg("");
    const rest = [];
    let sent = 0;
    for (const item of queue) {
      try { await submitOne(item); sent += 1; }
      catch { rest.push(item); }
    }
    setQueue(rest); writeQueue(rest);
    setBusy(false);
    setMsg(sent ? `${sent} relevé(s) synchronisé(s).` : "Aucun relevé n'a pu être envoyé.");
  }

  return (<main style={{ maxWidth: 520, margin: "0 auto" }}>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="camera" /> Saisie prix <span className="badge stable">agent terrain</span>
    </h2>

    {err && <div className="alert-item">{err} {!getToken() && <a href="/login">Se connecter</a>}</div>}
    {msg && <div className="alert-item">{msg}</div>}
    {user && !canEnter && (
      <div className="alert-item">
        Votre compte ({user.role}) n&apos;a pas les droits de saisie. Un administrateur peut
        vous attribuer le rôle agent.
      </div>
    )}

    <section className="panel">
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label>Marché
          <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
            {markets.length === 0 && <option value="">Chargement…</option>}
            {markets.map((m) => <option key={m.id} value={m.id}>{prettyName(m.name_fr)}</option>)}
          </select>
        </label>
        <label>Produit
          <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
            {products.length === 0 && <option value="">Chargement…</option>}
            {products.map((p) => <option key={p.code} value={p.code}>{prettyProduct(p.name_fr)}</option>)}
          </select>
        </label>
        <div className="grid grid-2">
          <label>Prix (FCFA/kg)
            <input type="number" min="1" step="0.5" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </label>
          <label>Volume (kg)
            <input type="number" min="0" step="1" value={form.volume}
              onChange={(e) => setForm({ ...form, volume: e.target.value })} />
          </label>
        </div>
        <button className="btn btn-forest" disabled={busy}>
          <Icon name="check" size={17} /> {busy ? "Envoi…" : "Soumettre le relevé"}
        </button>
      </form>
    </section>

    <section className="panel" style={{ marginTop: 12 }}>
      <h2><Icon name="bolt" size={18} /> File locale : {queue.length}</h2>
      <p className="muted">
        Les relevés qui n&apos;ont pas pu être envoyés restent sur cet appareil et sont
        réexpédiés au prochain clic.
      </p>
      <button className="btn btn-ghost dark" onClick={sync} disabled={busy || queue.length === 0}>
        Synchroniser maintenant
      </button>
    </section>

    <p className="muted" style={{ marginTop: 12 }}>
      Chaque relevé part en statut <b>en attente</b> : un administrateur le valide avant
      publication. Minimum 3 jours de relevés par marché et par semaine.
    </p>
  </main>);
}
