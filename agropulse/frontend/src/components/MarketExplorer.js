"use client";
import { useMemo, useState } from "react";
import Icon from "./icons";

function Spark({ up }) {
  const pts = up ? "0,18 10,15 20,16 30,10 40,11 50,5" : "0,6 10,9 20,8 30,14 40,13 50,18";
  return (
    <svg width="110" height="24" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? "#2D6A4F" : "#E63946"} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MarketExplorer({ items }) {
  const [q, setQ] = useState("");
  const [market, setMarket] = useState("Tous");
  const [sort, setSort] = useState("variation");
  const markets = useMemo(() => ["Tous", ...new Set(items.map((i) => i.market))], [items]);
  const list = useMemo(() => {
    let r = items.filter(
      (i) =>
        (market === "Tous" || i.market === market) &&
        (i.product + " " + i.market).toLowerCase().includes(q.toLowerCase())
    );
    r = [...r].sort((a, b) =>
      sort === "prix" ? b.price - a.price : Math.abs(b.variation) - Math.abs(a.variation)
    );
    return r;
  }, [items, q, market, sort]);

  return (
    <div>
      <div className="toolbar" role="search">
        <span className="search">
          <Icon name="bolt" size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher maïs, Kara…" aria-label="Rechercher un produit ou marché" />
        </span>
        <select className="pill" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier">
          <option value="variation">Tri : variations</option>
          <option value="prix">Tri : prix</option>
        </select>
      </div>
      <div className="toolbar" aria-label="Filtrer par marché">
        {markets.map((m) => (
          <button key={m} className={`pill${m === market ? " on" : ""}`} onClick={() => setMarket(m)}>{m}</button>
        ))}
      </div>
      <div className="grid grid-3">
        {list.map((p, i) => {
          const up = p.variation >= 0;
          return (
            <article className="card" key={i}>
              <h3><Icon name="chart" size={17} />{p.product} — {p.market}</h3>
              <div className="price">{p.price} F/kg</div>
              <Spark up={up} />{" "}
              <span className={`badge ${up ? "up" : "down"}`}>{up ? "+" : ""}{p.variation}%</span>
              <div className="muted">Min {p.min} • Max {p.max} • {p.count} sources</div>
            </article>
          );
        })}
      </div>
      {list.length === 0 && <p className="muted">Aucun résultat — essayez un autre marché.</p>}
    </div>
  );
}
