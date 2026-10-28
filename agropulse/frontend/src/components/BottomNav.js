"use client";

import { usePathname } from "next/navigation";
import Icon from "./icons";

const NAV = [
  ["Accueil", "/", "home"],
  ["Prix", "/prix", "chart"],
  ["Carte", "/carte", "map"],
  ["Alertes", "/alertes", "bell"],
  ["Marché", "/marketplace", "market"],
];

function isActive(pathname, href) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottomnav" aria-label="Navigation principale">
      {NAV.map(([label, href, icon]) => (
        <a
          key={href}
          href={href}
          className={isActive(pathname, href) ? "active" : ""}
          aria-current={isActive(pathname, href) ? "page" : undefined}
        >
          <Icon name={icon} size={21} />
          {label}
        </a>
      ))}
    </nav>
  );
}
