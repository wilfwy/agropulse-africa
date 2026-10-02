import Icon from "../../components/icons";
const PLANS = [
  { n: "Basic", p: "3 000 F / 5 $", f: ["Prix du jour, 3 produits", "Historique 7 jours", "3 alertes", "1 utilisateur", "Support WhatsApp"], cta: "Commencer gratuit", pop: false },
  { n: "Pro", p: "7 500 F / 12 $", f: ["Tous produits", "Historique illimité", "Alertes illimitées", "Dashboard + carte", "Prévisions IA 7 jours", "Export CSV"], cta: "Essayer 14 jours", pop: true },
  { n: "Coop", p: "75 000 F / 125 $", f: ["50 utilisateurs", "IA 30 jours", "CSV + PDF", "Dashboard coopérative", "Support email + tél", "SLA 99%"], cta: "Demander une démo", pop: false },
  { n: "Enterprise", p: "1 000 – 10 000 $", f: ["API complète", "SLA 99,9%", "Données brutes", "Intégration dédiée", "Facturation trimestrielle"], cta: "Nous contacter", pop: false }];
export default function TarifsPage() {
  return (<main>
    <h2 style={{ fontSize: 20 }}>Tarifs — mensuel / annuel <span className="badge up">−17%</span></h2>
    <div className="grid grid-2">
      {PLANS.map((p, i) => (<div className={`plan ${p.pop ? "pop" : ""}`} key={i}>
        <h3 style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}><Icon name="bolt" size={17} /> {p.n}</h3>
        <div className="price" style={{ fontSize: 20 }}>{p.p}</div>
        <ul className="muted">{p.f.map((f, j) => (<li key={j}>{f}</li>))}</ul>
        <button className={`btn ${p.pop ? "btn-primary" : "btn-forest"}`} style={{ width: "100%" }}>{p.cta}</button>
      </div>))}
    </div>
    <section className="panel" style={{ marginTop: 12 }}><h2><Icon name="market" size={18} /> Paiement</h2>
      <div className="muted">Flooz · T-Money (1,5%) · Virement Ecobank / BOA · Facture Enterprise 30 jours. Renouvellement auto, période de grâce 7 jours.</div></section>
  </main>);
}
