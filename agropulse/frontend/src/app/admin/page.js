import Icon from "../../components/icons";
export default async function AdminPage() {
  const base = "http://localhost:8000/api/v1";
  let pending = { data: [] };
  try { const r = await fetch(`${base}/admin/prices/pending`, { cache: "no-store" }); pending = await r.json(); } catch {}
  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="shield" /> Modération — {pending.data.length} en attente</h2>
    <section className="panel">
      <table><thead><tr><th>Date</th><th>Marché</th><th>Produit</th><th>Prix</th><th>Écart</th><th>Action</th></tr></thead>
        <tbody>{pending.data.map((p, i) => (<tr key={i}><td>08/07</td><td>{p.market}</td><td>{p.product}</td><td><b>{p.price}</b></td>
          <td><span className={`badge ${String(p.deviation).startsWith("+") && parseInt(p.deviation) > 30 ? "down" : "stable"}`}>{p.deviation}</span></td>
          <td style={{ whiteSpace: "nowrap" }}>
            <button className="btn btn-forest" style={{ minHeight: 36, padding: "4px 10px" }} aria-label="Approuver"><Icon name="check" size={16} /></button>{" "}
            <button className="btn btn-danger" style={{ minHeight: 36, padding: "4px 10px" }} aria-label="Rejeter"><Icon name="cross" size={16} /></button>{" "}
            <button className="btn btn-ghost dark" style={{ minHeight: 36, padding: "4px 10px" }} aria-label="Voir"><Icon name="eye" size={16} /></button>
          </td></tr>))}</tbody></table>
      <p className="muted">Raccourcis : A approuver · R rejeter · flèche suivante. Écart au-delà de ±30% de la médiane 7 jours : modération obligatoire.</p></section>
    <div className="grid grid-2" style={{ marginTop: 12 }}>
      <section className="panel"><h2><Icon name="chart" size={18} /> Indicateurs temps réel</h2><div className="muted">Utilisateurs actifs · prix collectés · revenus · fiabilité au-dessus de 85%.</div></section>
      <section className="panel"><h2><Icon name="user" size={18} /> Agents terrain</h2><div className="muted">Affectation par marché · performance · commissions Flooz.</div></section>
    </div>
  </main>);
}
