"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

const TOGO_BOUNDS = [
  [0.35, 6.05],
  [1.85, 11.15],
];

const STATUS_COLOR = {
  surplus: "#2D6A4F",
  penurie: "#E63946",
  equilibre: "#457B9D",
};

// Corridors commerciaux principaux, en fragments de nom de marché.
const CORRIDORS = [
  ["hedzra", "atakpame"],
  ["atakpame", "sokode"],
  ["sokode", "kara"],
  ["kara", "dapaong"],
  ["hedzra", "kpalime"],
];

export default function TogoMap3D({ points = [], unit = "F/kg", selectedId, onSelect, height = 520 }) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const linksRef = useRef([]);
  const rotateTimer = useRef(null);
  const [ready, setReady] = useState(false);
  const [tilt, setTilt] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const dataRef = useRef([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // --- initialisation de la carte (une seule fois)
  useEffect(() => {
    let disposed = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (disposed || !containerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 19,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
            satellite: {
              type: "raster",
              tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
              tileSize: 256,
              maxzoom: 18,
              attribution: "Imagerie © Esri, Maxar, Earthstar Geographics",
            },
          },
          layers: [
            { id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": 0.04, "raster-contrast": 0.04 } },
            { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" } },
          ],
        },
        center: [1.05, 8.35],
        zoom: 6.6,
        pitch: 50,
        bearing: -16,
        maxPitch: 72,
        minZoom: 4.8,
        maxZoom: 12,
        antialias: true,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      if (typeof window !== "undefined") window.__agropulseMap = map;
      map.on("error", (e) => console.warn("[map-error]", e?.error?.message || e));

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 90 }), "bottom-left");

      let settled = false;
      const markReady = () => {
        if (settled || disposed) return;
        settled = true;
        map.resize();
        setReady(true);
      };

      map.on("load", markReady);
      map.on("style.load", markReady);
      setTimeout(markReady, 3500);

      const reposition = () => positionAll(map);
      map.on("move", reposition);
      map.on("zoom", reposition);
      map.on("rotate", reposition);
      map.on("pitch", reposition);

      const ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);
      map._ro = ro;
    })();

    return () => {
      disposed = true;
      if (rotateTimer.current) clearInterval(rotateTimer.current);
      if (mapRef.current) {
        markersRef.current.forEach((m) => m.el.remove());
        markersRef.current = [];
        mapRef.current._ro?.disconnect();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  function positionAll(map) {
    if (!map) return;
    markersRef.current.forEach(({ el, lngLat }) => {
      const p = map.project(lngLat);
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      el.style.zIndex = String(Math.round(p.y * 4));
    });
    linksRef.current.forEach(({ el, a, b }) => {
      const pa = map.project(a);
      const pb = map.project(b);
      el.setAttribute("x1", pa.x);
      el.setAttribute("y1", pa.y);
      el.setAttribute("x2", pb.x);
      el.setAttribute("y2", pb.y);
    });
  }

  // --- colonnes 3D + étiquettes, projetées à l'écran
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const valid = (points || []).filter((p) => p.lat != null && p.lng != null && p.price != null);
    dataRef.current = valid;
    if (!valid.length) return;

    markersRef.current.forEach((m) => m.el.remove());
    markersRef.current = [];

    const prices = valid.map((p) => Number(p.price) || 0);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const span = hi - lo || 1;

    valid.forEach((p) => {
      const color = STATUS_COLOR[p.status] || STATUS_COLOR.equilibre;
      const norm = hi === lo ? 0.5 : (Number(p.price) - lo) / span;
      const barH = Math.round(34 + norm * 78);

      const el = document.createElement("button");
      el.type = "button";
      el.className = `mpin${p.status === "penurie" ? " is-penurie" : p.status === "surplus" ? " is-surplus" : ""}`;
      el.style.setProperty("--pin-color", color);
      el.style.setProperty("--pin-h", `${barH}px`);
      el.setAttribute("aria-label", `${p.name} : ${p.price} ${unit}`);
      el.innerHTML = `
        <span class="mpin-label">
          <span class="mpin-name">${p.name.replace(" (Lome)", "")}</span>
          <span class="mpin-price">${p.price}</span>
        </span>
        <span class="mpin-bar"><span class="mpin-bar-fill"></span></span>
        <span class="mpin-foot"></span>`;

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.({ id: p.id });
        mapRef.current?.flyTo({
          center: [p.lng, p.lat],
          zoom: 9.2,
          pitch: 58,
          bearing: 22,
          duration: 1200,
          essential: true,
        });
      });

      overlayRef.current.appendChild(el);
      const lngLat = [p.lng, p.lat];
      markersRef.current.push({ el, lngLat });
    });

    // corridors dessinés en SVG, projetés à chaque déplacement
    const svg = overlayRef.current?.querySelector(".map-links");
    if (svg) {
      svg.innerHTML = "";
      linksRef.current = [];
      const find = (frag) => valid.find((p) => p.name.toLowerCase().includes(frag));
      CORRIDORS.forEach(([aName, bName]) => {
        const a = find(aName);
        const b = find(bName);
        if (!a || !b) return;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "map-link-line");
        svg.appendChild(line);
        linksRef.current.push({ el: line, a: [a.lng, a.lat], b: [b.lng, b.lat] });
      });
    }

    positionAll(map);
  }, [points, ready, unit]);

  // --- recentrage sur le marché sélectionné
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const p = (points || []).find((x) => x.id === selectedId);
    if (!p) return;
    map.flyTo({ center: [p.lng, p.lat], zoom: 8.8, pitch: 55, bearing: 18, duration: 1100, essential: true });
  }, [selectedId, ready, points]);

  function toggleTilt() {
    const map = mapRef.current;
    if (!map) return;
    const next = !tilt;
    setTilt(next);
    map.easeTo({ pitch: next ? 55 : 0, bearing: next ? -16 : 0, duration: 900, essential: true });
  }

  function toggleRotate() {
    const map = mapRef.current;
    if (!map) return;
    if (rotating) {
      clearInterval(rotateTimer.current);
      setRotating(false);
      return;
    }
    setRotating(true);
    rotateTimer.current = setInterval(() => {
      if (!mapRef.current) return;
      mapRef.current.rotateTo(mapRef.current.getBearing() + 0.4, { duration: 0 });
    }, 60);
  }

  function toggleBasemap() {
    const map = mapRef.current;
    if (!map || !map.getLayer("satellite")) return;
    const next = !satellite;
    setSatellite(next);
    map.setLayoutProperty("osm", "visibility", next ? "none" : "visible");
    map.setLayoutProperty("satellite", "visibility", next ? "visible" : "none");
  }

  function resetView() {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds(TOGO_BOUNDS, { padding: 40, pitch: tilt ? 50 : 0, bearing: tilt ? -16 : 0, duration: 1100 });
  }

  return (
    <div className="map-shell" style={{ height }}>
      <div ref={containerRef} className="map-canvas" />
      <div ref={overlayRef} className="map-overlay">
        <svg className="map-links" aria-hidden="true" />
      </div>
      <div className="map-tools">
        <button className={`map-btn${tilt ? " on" : ""}`} onClick={toggleTilt} title="Basculer 2D / 3D">
          {tilt ? "Vue 3D" : "Vue 2D"}
        </button>
        <button className={`map-btn${rotating ? " on" : ""}`} onClick={toggleRotate} title="Rotation automatique">
          Rotation
        </button>
        <button className={`map-btn${satellite ? " on" : ""}`} onClick={toggleBasemap} title="Fond satellite">
          Satellite
        </button>
        <button className="map-btn" onClick={resetView} title="Recentrer sur le Togo">
          Recentrer
        </button>
      </div>
      <div className="map-legend">
        <span><i style={{ background: "#2D6A4F" }} /> Surplus</span>
        <span><i style={{ background: "#457B9D" }} /> Équilibré</span>
        <span><i style={{ background: "#E63946" }} /> Pénurie</span>
        <span className="map-legend-sep" />
        <span className="muted">Hauteur de la colonne = niveau de prix</span>
      </div>
      {!ready && <div className="map-loading">Chargement de la carte…</div>}
    </div>
  );
}
