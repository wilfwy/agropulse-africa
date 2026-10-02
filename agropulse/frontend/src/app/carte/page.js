import Icon from "../../components/icons";
const PINS = [
  ["Hedzranawoé (Lomé)", "Maritime", "+3,2%", 1],
  ["Kara", "Kara", "+2,1%", 1],
  ["Sokodé", "Centrale", "−1,5%", 0],
  ["Atakpamé", "Plateaux", "+1,2%", 1],
  ["Cinkassé", "Savanes — frontière Ghana", "stable", 2],
];
export default function CartePage() {
  return (<main>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="map" /> Carte des marchés — surplus / pénurie</h2>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <div className="grid grid-2">
      {PINS.map((p, i) => (
        <div className="card" key={i}>
          <h3><Icon name="pin" size={17} /> {p[0]}</h3>
          <div className="muted">{p[1]}</div>
          <span className={`badge ${p[3] === 1 ? "up" : p[3] === 0 ? "down" : "stable"}`}>{p[2]}</span>
        </div>
      ))}
    </div>
    <section className="panel" style={{ marginTop: 12 }}>
      <h2><Icon name="arrow" size={18} /> Corridors commerciaux</h2>
      <div className="muted">Lomé vers Accra · Lomé vers Cotonou · Cinkassé transfrontalier. Vert : surplus — Rouge : pénurie. Fond Leaflet + OpenStreetMap en production.</div>
    </section>
  </main>);
}
