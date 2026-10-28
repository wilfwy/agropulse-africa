import "./globals.css";
import BottomNav from "../components/BottomNav";
import Icon from "../components/icons";
export const metadata = { title: "AgroPulse Africa — Le vrai prix des marchés agricoles togolais", description: "Prix des marchés agricoles togolais, alertes WhatsApp et annonces pour producteurs, commerçants et coopératives." };
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#2D6A4F" };
export default function RootLayout({ children }) {
  return (<html lang="fr"><body>
    <header className="topbar">
      <a className="brand" href="/" aria-label="AgroPulse Africa, accueil">
        <span className="logo"><Icon name="leaf" size={20} /></span>
        <span>AgroPulse<small>INTELLIGENCE AGRICOLE</small></span>
      </a>
      <span className="spacer" />
      <a className="iconbtn" href="/prix" aria-label="Prix du jour"><Icon name="chart" /></a>
      <a className="iconbtn" href="/login" aria-label="Profil"><Icon name="user" /></a>
    </header>
    <div className="wrap">{children}</div>
    <BottomNav />
  </body></html>);
}
