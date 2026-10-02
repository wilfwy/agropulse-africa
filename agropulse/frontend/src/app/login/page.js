"use client";
import { useState } from "react";
import Icon from "../../components/icons";
export default function LoginPage() {
  const [phone, setPhone] = useState("+228 "); const [otp, setOtp] = useState(""); const [msg, setMsg] = useState("");
  async function sendOtp(e) { e.preventDefault(); setMsg("Code OTP envoyé par SMS (démo : 123456, validité 5 min)."); }
  async function login(e) {
    e.preventDefault();
    try {
      const r = await fetch("http://localhost:8000/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, otp }) });
      setMsg(r.ok ? "Connecté — session 15 min, refresh 7 jours." : "Code invalide — réessayez.");
    } catch { setMsg("API injoignable pour le moment."); }
  }
  return (<main style={{ maxWidth: 430, margin: "0 auto" }}>
    <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><Icon name="user" /> Connexion par SMS</h2>
    <section className="panel"><form onSubmit={sendOtp}>
      <label>Téléphone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" /></label>
      <button className="btn btn-ghost dark" style={{ width: "100%", marginTop: 10 }}>Envoyer le code</button></form>
      <form onSubmit={login} style={{ marginTop: 12 }}>
        <label>Code à 6 chiffres<input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" /></label>
        <button className="btn btn-forest" style={{ width: "100%", marginTop: 10 }}>Se connecter</button></form>
      <p>{msg}</p>
      <p className="muted">JWT RS256 · Anti brute-force · Double facteur TOTP pour l&apos;administration.</p></section>
  </main>);
}
