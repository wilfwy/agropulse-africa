import "./globals.css";
import Icon from "../components/icons";
export const metadata = { title: "AgroPulse Africa — L'intelligence des marchés agricoles africains", description: "Prix temps réel maïs, soja, tomate au Togo via WhatsApp, dashboard et API." };
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#2D6A4F" };
const NAV = [
  ["Accueil", "/", "home", true],
  ["Carte", "/carte", "map", false],
  ["Alertes", "/alertes", "bell", false],
  ["Marché", "/marketplace", "market", false],
  ["Profil", "/login", "user", false],
];
export default function RootLayout({ children }) {
  return (<html lang="fr"><body>
    <header className="topbar">
      <span className="brand">
        <span className="logo"><Icon name="leaf" size={20} /></span>
        <span>AgroPulse<small>INTELLIGENCE AGRICOLE</small></span>
      </span>
      <span className="spacer" />
      <a className="iconbtn" href="/alertes" aria-label="Alertes"><Icon name="bell" /></a>
      <a className="iconbtn" href="/login" aria-label="Profil"><Icon name="user" /></a>
    </header>
    <div className="wrap">{children}</div>
    <nav className="bottomnav" aria-label="Navigation principale">
      {NAV.map(([label, href, icon, active]) => (
        <a key={href} href={href} className={active ? "active" : ""}>
          <Icon name={icon} size={21} />{label}
        </a>
      ))}
    </nav>
  </body></html>);
}
