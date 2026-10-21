"use client";
import { useEffect, useState } from "react";
import Icon from "../../components/icons";
import { register, login, me, setToken, clearToken } from "../../lib/api";

export default function LoginPage() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("+228 ");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => { me().then((u) => u && setUser(u)); }, []);

  async function onRegister(e) {
    e.preventDefault();
    const r = await register(phone, name);
    if (r.id) {
      setStep("otp");
      setMsg(r.message || "Code envoyé par SMS");
      if (r.dev_otp) setOtp(r.dev_otp);
    } else {
      setMsg("Erreur : " + (r.detail || "identifiants invalides"));
    }
  }

  async function onLogin(e) {
    e.preventDefault();
    const r = await login(phone, otp);
    if (r.access_token) {
      setToken(r.access_token);
      const u = await me();
      setUser(u);
      setMsg(`Connecté — plan ${r.plan}`);
    } else {
      setMsg("Erreur : " + (r.detail || "code invalide"));
    }
  }

  function logout() {
    clearToken();
    setUser(null);
    setStep("phone");
    setMsg("Déconnecté");
  }

  if (user) {
    return (<main style={{ maxWidth: 430, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="user" /> Mon compte</h2>
      <section className="panel">
        <div className="muted">Connecté en tant que</div>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{user.full_name || user.phone}</div>
        <div className="muted">{user.phone} · rôle {user.role} · plan {user.plan}</div>
        <p><span className="badge up">{user.plan === "pro" ? "Essai Pro 14 jours" : user.plan}</span></p>
        <button className="btn btn-ghost dark" style={{ width: "100%" }} onClick={logout}>Se déconnecter</button>
      </section>
    </main>);
  }

  return (<main style={{ maxWidth: 430, margin: "0 auto" }}>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="user" /> Connexion par SMS</h2>
    <section className="panel">
      {step === "phone" ? (
        <form onSubmit={onRegister} style={{ display: "grid", gap: 10 }}>
          <label>Téléphone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" /></label>
          <label>Nom complet<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kossi Mensah" /></label>
          <button className="btn btn-forest">Recevoir mon code</button>
        </form>
      ) : (
        <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
          <div className="muted">Code envoyé au {phone}</div>
          <label>Code à 6 chiffres<input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" /></label>
          <button className="btn btn-forest">Se connecter</button>
          <button type="button" className="btn btn-ghost dark" onClick={() => setStep("phone")}>Changer de numéro</button>
        </form>
      )}
      <p>{msg}</p>
      <p className="muted">JWT RS256 · OTP 5 min, 3 essais · anti brute-force · 2FA pour l&apos;administration.</p>
    </section>
  </main>);
}
