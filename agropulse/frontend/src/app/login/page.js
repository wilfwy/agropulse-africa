"use client";
import { useEffect, useState } from "react";
import Icon from "../../components/icons";
import { register, login, demoLogin, me, setToken, clearToken } from "../../lib/api";

const DEMO_ROLES = [
  { key: "farmer", label: "Agriculteur", detail: "Alertes prix, plan Basic", icon: "leaf" },
  { key: "coop", label: "Coopérative", detail: "Marketplace, plan Coopérative", icon: "market" },
  { key: "agent", label: "Agent terrain", detail: "Saisie de prix, file hors-ligne", icon: "camera" },
  { key: "admin", label: "Administrateur", detail: "Modération des relevés", icon: "shield" },
];

function linksFor(role) {
  const links = [{ href: "/prix", label: "Prix du jour" }, { href: "/carte", label: "Carte" }];
  if (role === "agent" || role === "admin") links.push({ href: "/agent", label: "Saisie prix" });
  if (role === "admin") links.push({ href: "/admin", label: "Modération" });
  if (role !== "farmer") links.push({ href: "/marketplace", label: "Marketplace" });
  links.push({ href: "/alertes", label: "Mes alertes" });
  return links;
}

export default function LoginPage() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("+228 ");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => { me().then((u) => u && setUser(u)); }, []);

  async function onRegister(e) {
    e.preventDefault();
    setErr("");
    const r = await register(phone, name);
    if (r.id) {
      setStep("otp");
      setMsg(r.message || "Code envoyé par SMS");
      if (r.dev_otp) setOtp(r.dev_otp);
    } else {
      setErr(r.detail || "Inscription impossible");
    }
  }

  async function onLogin(e) {
    e.preventDefault();
    setErr("");
    const r = await login(phone, otp);
    if (r.access_token) {
      setToken(r.access_token);
      const u = await me();
      setUser(u);
      setMsg(`Connecté — plan ${r.plan}`);
    } else {
      setErr(r.detail || "Code invalide");
    }
  }

  async function openDemo(role) {
    setBusy(role);
    setErr("");
    setMsg("");
    try {
      const r = await demoLogin(role);
      if (r.access_token) {
        setToken(r.access_token);
        const u = await me();
        setUser(u);
        setMsg(`Session de démonstration ouverte (${r.role}).`);
      } else {
        setErr(r.detail || "Accès démonstration indisponible");
      }
    } catch {
      setErr("API injoignable. Réessayez dans quelques secondes.");
    }
    setBusy("");
  }

  function logout() {
    clearToken();
    setUser(null);
    setStep("phone");
    setMsg("");
    setErr("Déconnecté");
  }

  if (user) {
    return (<main style={{ maxWidth: 470, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="user" /> Mon compte</h2>
      <section className="panel">
        <div className="muted">Connecté en tant que</div>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{user.full_name || user.phone}</div>
        <div className="muted">{user.phone} · rôle {user.role} · plan {user.plan}</div>
        <p><span className="badge up">{user.plan === "pro" ? "Essai Pro 14 jours" : user.plan}</span></p>
        {msg && <p className="muted">{msg}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 14px" }}>
          {linksFor(user.role).map((l) => (
            <a className="btn btn-ghost dark" key={l.href} href={l.href}>{l.label}</a>
          ))}
        </div>
        <button className="btn btn-ghost dark" style={{ width: "100%" }} onClick={logout}>Se déconnecter</button>
      </section>
    </main>);
  }

  return (<main style={{ maxWidth: 470, margin: "0 auto" }}>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="user" /> Connexion</h2>

    {err && <div className="alert-item">{err}</div>}
    {msg && <div className="alert-item">{msg}</div>}

    <section className="panel">
      <h2><Icon name="bolt" size={18} /> Accès démonstration</h2>
      <p className="muted">
        Aucun fournisseur SMS n&apos;est encore branché : ouvrez directement un profil
        de test pour parcourir le site. Données de marché fictives.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {DEMO_ROLES.map((r) => (
          <button key={r.key} className="btn btn-forest" style={{ justifyContent: "space-between" }}
            onClick={() => openDemo(r.key)} disabled={busy === r.key}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon name={r.icon} size={17} /> {r.label}
            </span>
            <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 13 }}>
              {busy === r.key ? "ouverture…" : r.detail}
            </span>
          </button>
        ))}
      </div>
    </section>

    <section className="panel" style={{ marginTop: 12 }}>
      <h2><Icon name="user" size={18} /> Connexion par SMS</h2>
      {step === "phone" ? (
        <form onSubmit={onRegister} style={{ display: "grid", gap: 10 }}>
          <label>Téléphone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" /></label>
          <label>Nom complet<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kossi Mensah" /></label>
          <button className="btn btn-ghost dark">Recevoir mon code</button>
        </form>
      ) : (
        <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
          <div className="muted">Code envoyé au {phone}</div>
          <label>Code à 6 chiffres<input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" /></label>
          <button className="btn btn-ghost dark">Se connecter</button>
          <button type="button" className="btn btn-ghost dark" onClick={() => setStep("phone")}>Changer de numéro</button>
        </form>
      )}
      <p className="muted">
        JWT RS256 · OTP 5 min, 3 essais · anti brute-force · 2FA pour l&apos;administration.
        L&apos;envoi réel des SMS reste à configurer.
      </p>
    </section>
  </main>);
}
