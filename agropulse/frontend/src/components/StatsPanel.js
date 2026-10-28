"use client";
import Icon from "./icons";

function pct(v, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  const s = Number(v).toFixed(digits);
  return `${v > 0 ? "+" : ""}${s}%`;
}

function Stat({ label, value, suffix, tone, hint }) {
  return (
    <div className={`stat${tone ? ` stat-${tone}` : ""}`}>
      <span className="stat-label">{label}</span>
      <b className="stat-value">
        {value}
        {suffix ? <small>{suffix}</small> : null}
      </b>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  );
}

function Histogram({ bins, unit }) {
  if (!bins?.length) return null;
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="hist">
      <div className="hist-bars">
        {bins.map((b, i) => (
          <div className="hist-col" key={i} title={`${b.from} – ${b.to} ${unit} : ${b.count} jour(s)`}>
            <span className="hist-n">{b.count}</span>
            <div
              className="hist-bar"
              style={{ height: `${Math.max(6, (b.count / maxCount) * 100)}%`, opacity: 0.45 + 0.55 * (b.count / maxCount) }}
            />
          </div>
        ))}
      </div>
      <div className="hist-axis">
        <span>{bins[0].from}</span>
        <span>{Math.round((bins[0].from + bins[bins.length - 1].to) / 2)}</span>
        <span>{bins[bins.length - 1].to}</span>
      </div>
    </div>
  );
}

export default function StatsPanel({
  stats = {},
  histogram = [],
  markets = [],
  cheapest,
  expensive,
  arbitrage,
  spread_pct,
  unit = "FCFA/kg",
  title = "Statistiques détaillées",
  onSelectMarket,
  compact = false,
}) {
  const hasData = stats && stats.days > 0;
  const maxPrice = markets.length ? Math.max(...markets.map((m) => m.avg_price)) : 1;
  const minPrice = markets.length ? Math.min(...markets.map((m) => m.avg_price)) : 0;
  const range = Math.max(maxPrice - minPrice, 1);

  return (
    <section className="panel stats-panel">
      <h2>
        <Icon name="chart" size={18} /> {title}
        {hasData && (
          <span className={`badge ${stats.trend === "hausse" ? "up" : stats.trend === "baisse" ? "down" : "stable"}`} style={{ marginLeft: "auto" }}>
            {stats.trend} · {pct(stats.change_pct)}
          </span>
        )}
      </h2>

      {!hasData ? (
        <p className="muted">Pas encore assez de relevés pour calculer les statistiques.</p>
      ) : (
        <>
          <div className="stat-grid">
            <Stat label="Prix moyen" value={stats.mean} suffix={` ${unit}`} hint={`sur ${stats.days} jours`} />
            <Stat label="Médiane" value={stats.median} suffix={` ${unit}`} hint={`${stats.samples} relevés`} />
            <Stat label="Minimum" value={stats.min} suffix={` ${unit}`} tone="down" />
            <Stat label="Maximum" value={stats.max} suffix={` ${unit}`} tone="up" />
            <Stat
              label="Volatilité"
              value={stats.volatility_pct}
              suffix="%"
              tone={stats.volatility_pct > 12 ? "down" : "up"}
              hint="écart-type / moyenne"
            />
            <Stat label="Amplitude" value={stats.amplitude_pct} suffix="%" hint="max − min sur la période" />
            <Stat
              label="Momentum 7j"
              value={pct(stats.momentum_pct)}
              tone={stats.momentum_pct > 0 ? "up" : stats.momentum_pct < 0 ? "down" : undefined}
              hint="7 derniers jours vs 7 précédents"
            />
            <Stat
              label="Tendance"
              value={stats.slope_per_day > 0 ? "+" : ""}
              suffix={` ${stats.slope_per_day} ${unit}/jour`}
              hint={stats.slope_per_day > 0 ? "pression haussière" : stats.slope_per_day < 0 ? "pression baissière" : "marché stable"}
            />
          </div>

          {!compact && (
            <div className="stats-split">
              <div>
                <h3 className="mini-title">Distribution des prix</h3>
                <Histogram bins={histogram} unit={unit} />
                <p className="muted tiny">
                  Chaque barre regroupe les jours dont le prix moyen tombe dans l&apos;intervalle.
                </p>
              </div>
              <div>
                <h3 className="mini-title">Comparaison des marchés</h3>
                <div className="mbars">
                  {markets.map((m) => {
                    const width = 20 + ((m.avg_price - minPrice) / range) * 80;
                    const tone = m.change_pct > 0.5 ? "up" : m.change_pct < -0.5 ? "down" : "flat";
                    return (
                      <button
                        key={m.market_id}
                        className="mbar"
                        onClick={() => onSelectMarket && onSelectMarket(m)}
                        title={`${m.market} — ${m.avg_price} ${unit} · ${pct(m.change_pct)}`}
                      >
                        <span className="mbar-name">{m.market.replace(" (Lome)", "")}</span>
                        <span className="mbar-track">
                          <span className={`mbar-fill ${tone}`} style={{ width: `${width}%` }} />
                        </span>
                        <span className="mbar-val">{m.avg_price}</span>
                        <span className={`mbar-delta ${tone}`}>{pct(m.change_pct)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!compact && arbitrage && cheapest && expensive && (
            <div className="arbitrage">
              <div>
                <span className="arb-label">Acheter</span>
                <b>{cheapest.market}</b>
                <span className="muted">{cheapest.avg_price} {unit}</span>
              </div>
              <Icon name="arrow" size={20} />
              <div>
                <span className="arb-label">Vendre</span>
                <b>{expensive.market}</b>
                <span className="muted">{expensive.avg_price} {unit}</span>
              </div>
              <div className="arb-gain">
                <span className="arb-label">Écart</span>
                <b>+{arbitrage.gain_xof_per_kg} F/kg</b>
                <span className="muted">{spread_pct}% entre marchés</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
