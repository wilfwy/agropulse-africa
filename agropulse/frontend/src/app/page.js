import Icon from "../components/icons";

export const metadata = {
  title: "AgroPulse Africa — Le vrai prix des marchés agricoles togolais",
  description:
    "AgroPulse Africa aide les producteurs, commerçants et coopératives du Togo à connaître les prix des marchés agricoles et à recevoir des alertes sur WhatsApp.",
};

const CHIFFRES = [
  ["14", "marchés référencés"],
  ["5", "régions couvertes"],
  ["9", "filières suivies"],
  ["0", "application à installer"],
];

const CONSTAT = [
  {
    icon: "eye",
    titre: "Le prix se devine",
    texte:
      "Loin du marché, on accepte le prix proposé. Sans repère, il est difficile de négocier.",
  },
  {
    icon: "chart",
    titre: "La marge s'évapore",
    texte:
      "L'écart entre le champ et l'étal profite à ceux qui détiennent l'information.",
  },
  {
    icon: "market",
    titre: "L'information est dispersée",
    texte:
      "Chaque marché a ses cours, chaque jour. Personne ne voit l'ensemble du pays.",
  },
];

const REPONSE = [
  "Des relevés réguliers sur les marchés, réalisés par des agents formés.",
  "Une vérification avant diffusion : un prix aberrant n'est pas publié.",
  "Une information simple, envoyée sur WhatsApp, en français clair.",
  "Des alertes personnelles dès qu'un prix franchit le seuil que vous fixez.",
];

const ETAPES = [
  ["Relevé", "Nos agents notent les prix pratiqués, marché par marché, plusieurs fois par semaine."],
  ["Vérification", "Les écarts importants sont contrôlés avant d'être publiés."],
  ["Diffusion", "Les prix du jour, les tendances et vos alertes arrivent sur WhatsApp."],
  ["Décision", "Vous vendez, achetez ou stockez au bon moment, avec un repère fiable."],
];

const SERVICES = [
  {
    icon: "chart",
    titre: "Prix du jour",
    texte: "Le cours moyen par marché, avec le minimum et le maximum observés.",
    href: "/prix",
    lien: "Voir les prix",
  },
  {
    icon: "map",
    titre: "Carte des marchés",
    texte: "Les prix région par région, sur une carte interactive du Togo.",
    href: "/carte",
    lien: "Ouvrir la carte",
  },
  {
    icon: "bell",
    titre: "Alertes",
    texte: "Un seuil, un message : vous êtes prévenu sans avoir à vérifier.",
    href: "/alertes",
    lien: "Créer une alerte",
  },
  {
    icon: "bolt",
    titre: "Tendances",
    texte: "L'évolution sur trente jours et une projection à sept jours.",
    href: "/prix",
    lien: "Voir les tendances",
  },
  {
    icon: "market",
    titre: "Annonces",
    texte: "Des offres entre producteurs, commerçants et coopératives.",
    href: "/marketplace",
    lien: "Parcourir les annonces",
  },
  {
    icon: "user",
    titre: "Votre espace",
    texte: "Vos alertes, votre abonnement et vos annonces au même endroit.",
    href: "/login",
    lien: "Se connecter",
  },
];

const POUR_QUI = [
  ["Producteur", "Savoir quand vendre, sans dépendre du premier acheteur venu."],
  ["Commerçant", "Comparer les marchés et acheter au juste prix."],
  ["Coopérative", "Suivre les cours et publier les offres de ses membres."],
  ["Organisation", "Disposer d'un observatoire simple des prix agricoles."],
];

const ENGAGEMENTS = [
  ["En français simple", "Pas de jargon : des prix, des marchés, des conseils utilisables."],
  ["Sans application", "Un téléphone suffit. WhatsApp reste le canal principal."],
  ["Des données locales", "Des relevés faits au Togo, pour les réalités du terrain."],
];

export default function AccueilPage() {
  return (
    <>
      <section className="hero lp-hero">
        <span className="kicker"><Icon name="leaf" size={14} /> Togo · marchés agricoles</span>
        <h1>Savoir le vrai prix, avant de vendre.</h1>
        <p>
          AgroPulse Africa met les prix des marchés agricoles togolais à la portée de tous.
          Un message suffit pour connaître la valeur d&apos;un sac de maïs, de soja ou de
          tomate — et décider en connaissance de cause.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="/prix">Voir les prix du jour <Icon name="arrow" size={17} /></a>
          <a className="btn btn-ghost" href="#projet">Comprendre le projet</a>
        </div>
      </section>

      <div className="kpi" aria-label="Le projet en chiffres">
        {CHIFFRES.map(([valeur, libelle]) => (
          <div key={libelle}><b>{valeur}</b> <span className="muted">{libelle}</span></div>
        ))}
      </div>

      <section className="lp-section" id="projet">
        <div className="lp-eyebrow">Le constat</div>
        <h2 className="lp-title">Vendre sans savoir le prix, c&apos;est perdre de l&apos;argent.</h2>
        <p className="lp-lead">
          Au Togo, la plupart des producteurs apprennent le cours du marché après avoir vendu.
          L&apos;information existe, mais elle circule entre quelques personnes, au mauvais moment.
        </p>
        <div className="grid grid-3">
          {CONSTAT.map((c) => (
            <div className="card" key={c.titre}>
              <h3><Icon name={c.icon} size={17} /> {c.titre}</h3>
              <p className="muted" style={{ margin: "6px 0 0" }}>{c.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-split">
          <div>
            <div className="lp-eyebrow">Notre réponse</div>
            <h2 className="lp-title">Une information fiable, au moment où elle sert.</h2>
            <p className="lp-lead">
              Nous suivons les marchés agricoles du pays et transformons ces relevés en
              informations claires : un prix, un lieu, une date, une tendance.
            </p>
            <ul className="lp-list">
              {REPONSE.map((r) => (
                <li className="lp-item" key={r}>
                  <span className="lp-item-ic"><Icon name="check" size={15} /></span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 16 }}>
              <a className="btn btn-forest" href="/prix">Explorer les prix</a>
            </p>
          </div>
          <figure className="lp-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200&auto=format&fit=crop"
              alt="Parcelle agricole cultivée au Togo"
              loading="lazy"
            />
            <figcaption>
              Des prix relevés sur les marchés de Lomé, Kara, Sokodé, Atakpamé, Kpalimé et Dapaong.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-eyebrow">Comment ça marche</div>
        <h2 className="lp-title">Du marché jusqu&apos;à votre téléphone.</h2>
        <div className="grid grid-2">
          {ETAPES.map(([titre, texte], i) => (
            <div className="lp-step" key={titre}>
              <span className="lp-step-n">{i + 1}</span>
              <div>
                <b>{titre}</b>
                <div className="muted">{texte}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-eyebrow">Ce que vous trouvez ici</div>
        <h2 className="lp-title">Six outils, une même question : combien ça vaut ?</h2>
        <div className="grid grid-3">
          {SERVICES.map((s) => (
            <div className="card lp-service" key={s.titre}>
              <h3><Icon name={s.icon} size={17} /> {s.titre}</h3>
              <p className="muted" style={{ margin: "6px 0 12px" }}>{s.texte}</p>
              <a href={s.href}>{s.lien} <Icon name="arrow" size={14} /></a>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-eyebrow">Pour qui</div>
        <h2 className="lp-title">Ceux qui vivent de l&apos;agriculture.</h2>
        <div className="grid grid-2">
          {POUR_QUI.map(([titre, texte]) => (
            <div className="panel lp-person" key={titre}>
              <b>{titre}</b>
              <div className="muted">{texte}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-eyebrow">Nos engagements</div>
        <h2 className="lp-title">Simple, utile, ancré au terrain.</h2>
        <div className="grid grid-3">
          {ENGAGEMENTS.map(([titre, texte]) => (
            <div className="panel" key={titre}>
              <b><Icon name="check" size={15} /> {titre}</b>
              <div className="muted" style={{ marginTop: 4 }}>{texte}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta lp-section">
        <h2>Commencez par un prix.</h2>
        <p>
          Ouvrez les prix du jour, ou créez un accès pour recevoir vos alertes dès qu&apos;un
          seuil est atteint.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="/prix">Voir les prix du jour</a>
          <a className="btn btn-ghost" href="/login">Créer mon accès</a>
        </div>
      </section>

      <p className="lp-note">
        Version de démonstration : les prix affichés sur ce site sont des données de
        démonstration, le temps que le réseau d&apos;agents et l&apos;envoi WhatsApp soient
        pleinement opérationnels. AgroPulse Africa est un projet togolais.
      </p>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <span className="logo"><Icon name="leaf" size={17} /></span>
          <b>AgroPulse Africa</b>
          <span className="muted">Lomé, Togo</span>
        </div>
        <nav className="lp-footer-links" aria-label="Liens de pied de page">
          <a href="/prix">Prix du jour</a>
          <a href="/carte">Carte</a>
          <a href="/alertes">Alertes</a>
          <a href="/marketplace">Annonces</a>
          <a href="/login">Connexion</a>
        </nav>
        <div className="muted tiny">Un projet togolais d&apos;information sur les marchés agricoles.</div>
      </footer>
    </>
  );
}
