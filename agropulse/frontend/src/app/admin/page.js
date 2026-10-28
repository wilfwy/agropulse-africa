"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/icons";
import { apiFetch, getToken } from "../../lib/api";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!getToken()) {
      setErr("Connectez-vous avec un compte administrateur.");
      setLoading(false);
      return;
    }
    try {
      const r = await apiFetch("/admin/prices/pending");
      if (r.detail) { setErr(r.detail); setRows([]); }
      else { setRows(r.data || []); setErr(""); }
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id, action) {
    let body;
    if (action === "reject") {
      const reason = window.prompt("Motif du rejet ?", "Prix hors fourchette");
      if (reason === null) return;
      body = JSON.stringify({ reason });
    }
    setBusy(id);
    setNotice("");
    try {
      const r = await apiFetch(`/admin/prices/${id}/${action}`, { method: "POST", body });
      if (r.detail) setNotice(r.detail);
      else { setNotice(action === "approve" ? "Prix validé et publié." : "Prix rejeté."); }
      await load();
    } catch (e) {
      setNotice(e.message);
    }
    setBusy("");
  }

  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="shield" /> Modération — {loading ? "…" : `${rows.length} en attente`}
    </h2>

    {err && (
      <div className="alert-item">
        {err} <a href="/login">Se connecter</a>
      </div>
    )}
    {notice && <div className="alert-item">{notice}</div>}

    <section className="panel">
      {loading ? (
        <p className="muted">Chargement de la file de modération…</p>
      ) : rows.length === 0 ? (
        <p className="muted">
          Aucun prix en attente. Les relevés envoyés par les agents apparaissent ici
          jusqu&apos;à validation.
        </p>
      ) : (
        <table>
          <thead>
            <tr><th>Reçu</th><th>Marché</th><th>Produit</th><th>Prix</th><th>Écart médiane</th><th>Origine</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const dev = Number(p.deviation_pct || 0);
              return (
                <tr key={p.id}>
                  <td>{fmtDate(p.recorded_at)}</td>
                  <td>{p.market}</td>
                  <td>{p.product}</td>
                  <td><b>{p.price}</b> F/kg</td>
                  <td>
                    <span className={`badge ${Math.abs(dev) > 30 ? "down" : "stable"}`}>
                      {dev > 0 ? "+" : ""}{dev}%
                    </span>
                  </td>
                  <td className="muted">{p.source_type}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn-forest" style={{ minHeight: 36, padding: "4px 10px" }}
                      onClick={() => act(p.id, "approve")} disabled={busy === p.id} aria-label="Approuver">
                      <Icon name="check" size={16} />
                    </button>{" "}
                    <button className="btn btn-danger" style={{ minHeight: 36, padding: "4px 10px" }}
                      onClick={() => act(p.id, "reject")} disabled={busy === p.id} aria-label="Rejeter">
                      <Icon name="cross" size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="muted">
        Écart au-delà de ±30 % de la médiane 7 jours : signalé en rouge, modération recommandée.
      </p>
    </section>

    <div className="grid grid-2" style={{ marginTop: 12 }}>
      <section className="panel">
        <h2><Icon name="chart" size={18} /> Rôle des indicateurs</h2>
        <div className="muted">
          Les compteurs d&apos;utilisateurs actifs et de revenus nécessitent une agrégation
          dédiée, pas encore exposée par l&apos;API.
        </div>
      </section>
      <section className="panel">
        <h2><Icon name="user" size={18} /> Agents terrain</h2>
        <div className="muted">
          Score qualité, taux d&apos;approbation et commissions sont stockés en base
          (<code>field_agents</code>), l&apos;écran d&apos;affectation reste à construire.
        </div>
      </section>
    </div>
  </main>);
}
