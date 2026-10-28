"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const PAD = { l: 48, r: 14, t: 16, b: 28 };

function fmtDate(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function niceTicks(min, max, count = 5) {
  if (min === max) return [min];
  const raw = (max - min) / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) || raw;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) {
    if (v >= min - step * 0.5) ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

export default function PriceChart({
  data = [],
  forecast = [],
  height = 280,
  unit = "FCFA/kg",
  accent = "#2D6A4F",
  showForecastDefault = true,
  compact = false,
}) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState(null);
  const [showMa, setShowMa] = useState(true);
  const [showBand, setShowBand] = useState(true);
  const [showForecast, setShowForecast] = useState(showForecastDefault);

  useEffect(() => {
    if (!boxRef.current) return;
    const el = boxRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(Math.max(280, w));
    });
    ro.observe(el);
    setWidth(Math.max(280, el.clientWidth || 720));
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const pts = (data || []).filter((d) => d && d.avg_price != null);
    if (!pts.length) return null;
    const withForecast = showForecast && forecast?.length ? forecast : [];
    const all = [
      ...pts.flatMap((p) => [p.avg_price, p.min_price ?? p.avg_price, p.max_price ?? p.avg_price]),
      ...withForecast.flatMap((f) => [f.predicted_price, f.confidence_low, f.confidence_high]),
    ].filter((v) => v != null);
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const span = hi - lo || Math.abs(hi) * 0.1 || 10;
    const min = lo - span * 0.08;
    const max = hi + span * 0.08;
    return { pts, withForecast, min, max };
  }, [data, forecast, showForecast]);

  const W = width;
  const H = height;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  if (!geo) {
    return (
      <div className="chart-empty" style={{ height }}>
        <span className="muted">Aucune donnée disponible pour cette série.</span>
      </div>
    );
  }

  const { pts, withForecast, min, max } = geo;
  const total = pts.length + withForecast.length;
  const x = (i) => PAD.l + (total <= 1 ? plotW / 2 : (i / (total - 1)) * plotW);
  const y = (v) => PAD.t + plotH - ((v - min) / (max - min || 1)) * plotH;

  const line = (key, list = pts, offset = 0) =>
    list
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i + offset).toFixed(1)},${y(p[key]).toFixed(1)}`)
      .join(" ");

  const area =
    `M${x(0)},${PAD.t + plotH} ` +
    pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.avg_price).toFixed(1)}`).join(" ") +
    ` L${x(pts.length - 1)},${PAD.t + plotH} Z`;

  const bandPath = pts.every((p) => p.min_price != null && p.max_price != null)
    ? pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.max_price).toFixed(1)}`).join(" ") +
      " " +
      [...pts].reverse().map((p, i) => `L${x(pts.length - 1 - i).toFixed(1)},${y(p.min_price).toFixed(1)}`).join(" ") +
      " Z"
    : null;

  const forecastLine = withForecast.length
    ? `M${x(pts.length - 1)},${y(pts[pts.length - 1].avg_price)} ` +
      withForecast
        .map((f, i) => `L${x(pts.length + i).toFixed(1)},${y(f.predicted_price).toFixed(1)}`)
        .join(" ")
    : "";

  const forecastBand = withForecast.length
    ? withForecast
        .map((f, i) => `${i === 0 ? "M" : "L"}${x(pts.length + i).toFixed(1)},${y(f.confidence_high).toFixed(1)}`)
        .join(" ") +
      " " +
      [...withForecast].reverse()
        .map((f, i) => `L${x(total - 1 - i).toFixed(1)},${y(f.confidence_low).toFixed(1)}`)
        .join(" ") +
      " Z"
    : "";

  const ticks = niceTicks(min, max, compact ? 4 : 5);
  const xLabels = [];
  const step = Math.max(1, Math.ceil(pts.length / (compact ? 4 : 7)));
  for (let i = 0; i < pts.length; i += step) xLabels.push(i);

  const last = pts[pts.length - 1];
  const hoverPoint = hover != null ? pts[hover] : null;

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const rel = (px - PAD.l) / (plotW || 1);
    const idx = Math.round(rel * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, idx)));
  }

  const tipW = 148;
  const tipX = hoverPoint
    ? Math.min(Math.max(x(hover), PAD.l), W - PAD.r - tipW)
    : 0;

  return (
    <div className="chart" ref={boxRef}>
      {!compact && (
        <div className="chart-tools">
          <button className={`chip${showMa ? " on" : ""}`} onClick={() => setShowMa(!showMa)}>
            Moyenne 7j
          </button>
          <button className={`chip${showBand ? " on" : ""}`} onClick={() => setShowBand(!showBand)}>
            Amplitude min/max
          </button>
          {forecast?.length > 0 && (
            <button className={`chip${showForecast ? " on" : ""}`} onClick={() => setShowForecast(!showForecast)}>
              Projection 7j
            </button>
          )}
        </div>
      )}
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Évolution du prix, de ${fmtDate(pts[0].date)} à ${fmtDate(last.date)}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = e.touches[0].clientX - rect.left;
          const idx = Math.round(((px - PAD.l) / plotW) * (pts.length - 1));
          setHover(Math.max(0, Math.min(pts.length - 1, idx)));
        }}
      >
        <defs>
          <linearGradient id="pgArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="pgForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#457B9D" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#457B9D" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e6ebe6" strokeDasharray="3 5" />
            <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="#7C8B80">
              {Math.round(t)}
            </text>
          </g>
        ))}

        {showBand && bandPath && <path d={bandPath} fill={accent} opacity="0.07" />}
        <path d={area} fill="url(#pgArea)" />

        <path
          d={line("avg_price")}
          fill="none"
          stroke={accent}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-line"
        />

        {showMa && pts.some((p) => p.ma7 != null) && (
          <path d={line("ma7")} fill="none" stroke="#F4A261" strokeWidth="1.8" strokeDasharray="6 4" opacity="0.95" />
        )}

        {showForecast && forecastBand && <path d={forecastBand} fill="url(#pgForecast)" />}
        {showForecast && forecastLine && (
          <path d={forecastLine} fill="none" stroke="#457B9D" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
        )}

        {xLabels.map((i) => (
          <text key={i} x={x(i)} y={H - 9} textAnchor="middle" fontSize="10.5" fill="#7C8B80">
            {fmtDate(pts[i].date)}
          </text>
        ))}

        <g>
          <circle cx={x(pts.length - 1)} cy={y(last.avg_price)} r="4" fill={accent} />
          <circle cx={x(pts.length - 1)} cy={y(last.avg_price)} r="8" fill={accent} opacity="0.18" />
        </g>

        {hoverPoint && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + plotH} stroke={accent} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx={x(hover)} cy={y(hoverPoint.avg_price)} r="5" fill="#fff" stroke={accent} strokeWidth="2.5" />
            <g transform={`translate(${tipX},${PAD.t + 2})`}>
              <rect width={tipW} height={showForecast ? 92 : 78} rx="9" fill="#0f2e21" opacity="0.94" />
              <text x="11" y="17" fill="#cfe6d8" fontSize="10.5">{fmtDate(hoverPoint.date)}</text>
              <text x="11" y="36" fill="#fff" fontSize="13.5" fontWeight="700">
                {hoverPoint.avg_price} <tspan fontSize="9.5" fill="#a9c9b6">{unit}</tspan>
              </text>
              <text x="11" y="53" fill="#a9c9b6" fontSize="10">
                min {hoverPoint.min_price} · max {hoverPoint.max_price}
              </text>
              <text x="11" y="69" fill="#a9c9b6" fontSize="10">
                {hoverPoint.sample_count} relevé(s) · moy. 7j {hoverPoint.ma7 ?? "—"}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
