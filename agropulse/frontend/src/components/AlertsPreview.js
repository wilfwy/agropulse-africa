"use client";
import { useEffect, useState } from "react";
import Icon from "./icons";
import { apiFetch, getToken } from "../lib/api";
import { prettyName, prettyProduct } from "../lib/names";

export default function AlertsPreview() {
  const [state, setState] = useState({ loading: true, items: [], error: "", anonymous: false });

  useEffect(() => {
    if (!getToken()) {
      setState({ loading: false, items: [], error: "", anonymous: true });
      return;
    }
    apiFetch("/alerts")
      .then((r) => setState({ loading: false, items: (r.data || []).slice(0, 3), error: "", anonymous: false }))
      .catch((e) => setState({ loading: false, items: [], error: e.message, anonymous: false }));
  }, []);

  if (state.loading) return <p className="muted">Chargement de vos alertes…</p>;

  if (state.error) {
    return <p className="muted">{state.error} <a href="/login">Se reconnecter</a></p>;
  }

  if (state.anonymous) {
    return (
      <>
        <p className="muted">
          Connectez-vous pour retrouver vos alertes de prix, sur WhatsApp dès qu&apos;un
          seuil est franchi.
        </p>
        <p><a className="btn btn-forest" href="/login">Se connecter</a></p>
      </>
    );
  }

  if (state.items.length === 0) {
    return (
      <>
        <p className="muted">
          Aucune alerte active. Créez-en une pour être prévenu dès qu&apos;un prix franchit
          votre seuil.
        </p>
        <p><a className="btn btn-forest" href="/alertes">Créer une alerte</a></p>
      </>
    );
  }

  return (
    <>
      {state.items.map((a) => (
        <div className="alert-item" key={a.id}>
          <b>
            {prettyProduct(a.product)} {a.alert_type === "price_below" ? "sous" : "au-dessus de"}{" "}
            {a.threshold_value} F/kg{a.market ? ` à ${prettyName(a.market)}` : ""}
          </b>{" "}
          <span className="muted">
            <Icon name="bell" size={13} /> {a.channel}
          </span>
        </div>
      ))}
      <p><a className="btn btn-forest" href="/alertes">Gérer mes alertes</a></p>
    </>
  );
}
