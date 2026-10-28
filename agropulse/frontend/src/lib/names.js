// Les noms de marchés sont stockés sans accent en base : on rétablit l'orthographe affichée.
const LABELS = {
  Sokode: "Sokodé",
  Kpalime: "Kpalimé",
  Atakpame: "Atakpamé",
  "Hedzranawoe (Lome)": "Hédzranawoé (Lomé)",
  Hedzranawoe: "Hédzranawoé",
  Tsevie: "Tsévié",
  Cinkasse: "Cinkassé",
  "Kande": "Kandé",
  "Bassar": "Bassar",
  "Notsè": "Notsè",
  "Notse": "Notsè",
};

export function prettyName(name) {
  if (!name) return "";
  const clean = String(name).trim();
  return LABELS[clean] || clean.replace(" (Lome)", " (Lomé)");
}

export function prettyProduct(name) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}
