import Icon from "../components/icons";
import ScrollFX from "../components/ScrollFX";

export const metadata = {
  title: "AgroPulse Africa — Le juste prix des marchés agricoles togolais",
  description:
    "Les prix des marchés agricoles togolais sur WhatsApp : producteurs, commerçants et coopératives savent quand vendre.",
};

const CHIFFRES = [
  ["14", "marchés"],
  ["5", "régions"],
  ["9", "filières"],
  ["0", "application"],
];

const POINTS = [
  ["Un prix par marché", "Le cours réel, pas une moyenne inventée."],
  ["Une vérification", "Un relevé aberrant n'est pas publié."],
  ["Une alerte", "Vous êtes prévenu quand le seuil bouge."],
];

const ETAPES = [
  ["01", "Relevé", "Des agents notent les prix sur place."],
  ["02", "Vérification", "Les écarts sont contrôlés avant publication."],
  ["03", "WhatsApp", "Vous recevez le prix et vos alertes."],
];

const CARTES = [
  {
    image: "/img/cereales.jpg",
    alt: "Bol de céréales sur un étal de marché",
    titre: "Prix du jour",
    texte: "Le cours par marché, en un coup d'œil.",
    lien: "/prix",
    action: "Voir les prix",
  },
  {
    image: "/img/route-togo.jpg",
    alt: "Route de latérite dans une zone rurale du Togo",
    titre: "Carte",
    texte: "Les prix région par région.",
    lien: "/carte",
    action: "Ouvrir la carte",
  },
  {
    image: "/img/mais.jpg",
    alt: "Épis de maïs grillés sur un marché de Lomé",
    titre: "Alertes",
    texte: "Un seuil, un message.",
    lien: "/alertes",
    action: "Créer une alerte",
  },
  {
    image: "/img/soja.jpg",
    alt: "Graines de soja dans des bassines sur un marché",
    titre: "Annonces",
    texte: "Acheter et vendre entre professionnels.",
    lien: "/marketplace",
    action: "Voir les annonces",
  },
];

export default function AccueilPage() {
  return (
    <>
      <ScrollFX />

      <section className="lp-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lp-hero-bg" src="/img/lome-marche.jpg" alt="" data-par="0.10" fetchPriority="high" />
        <div className="lp-hero-inner">
          <span className="lp-kicker"><Icon name="leaf" size={13} /> Togo · marchés agricoles</span>
          <h1>Le juste prix,<br />au bon moment.</h1>
          <p>Les prix des marchés agricoles togolais, sur WhatsApp. Sans application.</p>
          <div className="lp-actions">
            <a className="lp-btn lp-btn-gold" href="/prix">Voir les prix <Icon name="arrow" size={16} /></a>
            <a className="lp-btn lp-btn-line" href="#projet">Découvrir</a>
          </div>
        </div>
      </section>

      <ul className="lp-stats" data-rv>
        {CHIFFRES.map(([valeur, libelle]) => (
          <li key={libelle}><b>{valeur}</b><span>{libelle}</span></li>
        ))}
      </ul>

      <section className="lp-block lp-split" id="projet">
        <div className="lp-copy" data-rv>
          <span className="lp-eyebrow">Le constat</span>
          <h2>Personne ne devrait vendre à l&apos;aveugle.</h2>
          <p>Le cours se sait souvent trop tard. Nous le rendons visible avant la vente.</p>
          <ul className="lp-points">
            {POINTS.map(([titre, texte], i) => (
              <li key={titre} data-rv style={{ "--d": `${120 + i * 90}ms` }}>
                <b>{titre}</b>
                <span>{texte}</span>
              </li>
            ))}
          </ul>
        </div>
        <figure className="lp-photo" data-rv style={{ "--d": "160ms" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/vendeuse.jpg" alt="Vendeuse sur un marché de Lomé" loading="lazy" />
          <figcaption>Hédzranawoé, Lomé.</figcaption>
        </figure>
      </section>

      <section className="lp-band">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/marche-vu.jpg" alt="" data-par="0.16" loading="lazy" />
        <div>
          <blockquote>Un prix vient du marché, jamais d&apos;une rumeur.</blockquote>
          <small>Relevés à Lomé, Kara, Sokodé, Atakpamé, Kpalimé et Dapaong.</small>
        </div>
      </section>

      <section className="lp-block">
        <div data-rv>
          <span className="lp-eyebrow">Comment ça marche</span>
          <h2>Trois étapes, aucun jargon.</h2>
        </div>
        <ol className="lp-steps">
          {ETAPES.map(([num, titre, texte], i) => (
            <li key={num} data-rv style={{ "--d": `${i * 110}ms` }}>
              <span>{num}</span>
              <b>{titre}</b>
              <p>{texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-block">
        <div data-rv>
          <span className="lp-eyebrow">Ce que vous trouvez</span>
          <h2>Quatre façons de savoir.</h2>
        </div>
        <div className="lp-cards">
          {CARTES.map((carte, i) => (
            <a className="lp-card" href={carte.lien} key={carte.titre} data-rv style={{ "--d": `${i * 90}ms` }}>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={carte.image} alt={carte.alt} loading="lazy" />
              </figure>
              <div className="lp-card-body">
                <b>{carte.titre}</b>
                <span>{carte.texte}</span>
                <em>{carte.action} <Icon name="arrow" size={13} /></em>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="lp-cta" data-rv>
        <h2>Commencez par un prix.</h2>
        <p>Ouvrez les prix du jour, ou créez votre accès pour recevoir vos alertes.</p>
        <div className="lp-actions">
          <a className="lp-btn lp-btn-gold" href="/prix">Voir les prix du jour</a>
          <a className="lp-btn lp-btn-line" href="/login">Créer mon accès</a>
        </div>
      </section>

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
        <p className="lp-note">
          Version de démonstration : les prix affichés sont fictifs, le temps que le réseau
          d&apos;agents et l&apos;envoi WhatsApp soient opérationnels.
        </p>
        <p className="lp-credit">
          Photos :{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Lom%C3%A9_Grand_March%C3%A9_with_the_Cath%C3%A9drale_du_Sacr%C3%A9_Coeur_(33592985581).jpg" target="_blank" rel="noreferrer">Dan Sloan</a> (CC BY-SA 2.0),{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Lom%C3%A9_Grand_Market_in_full_swing.jpg" target="_blank" rel="noreferrer">Francisco Anzola</a> (CC BY 2.0),{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Revendeuse_de_boissons_locales_au_march%C3%A9_de_H%C3%A9dzranawo%C3%A9_%C3%A0_Lom%C3%A9_(Togo)_01.jpg" target="_blank" rel="noreferrer">Akouete</a>,{" "}
          <a href="https://commons.wikimedia.org/wiki/File:C%C3%A9r%C3%A9ales_au_Togo_04.jpg" target="_blank" rel="noreferrer">Bamouzou</a>,{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Zone_rurale_-_Bagb%C3%A9,_Togo.jpg" target="_blank" rel="noreferrer">Komavo</a>{" "}
          (CC BY-SA 4.0), via Wikimedia Commons.
        </p>
      </footer>
    </>
  );
}
