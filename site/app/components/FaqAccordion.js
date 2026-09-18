"use client";

import { useState } from "react";

const FAQ = [
  {
    q: "D'où viennent les données ?",
    a: "Du BODACC, le Bulletin officiel des annonces civiles et commerciales. Chaque cession de fonds de commerce y est publiée par obligation légale. Nous ne faisons que la détecter, la trier par métier et par zone, et l'enrichir avec l'identité du repreneur et le téléphone de l'établissement. Chaque ligne reste vérifiable publiquement, gratuitement, pour toujours.",
  },
  {
    q: "Pourquoi payer, si le BODACC est public ?",
    a: "Parce que le BODACC est public, mais pas exploitable. Il donne une raison sociale et une adresse, perdues dans des dizaines de pages de jargon, sans tri par métier, sans téléphone, sans nom de dirigeant. Ce que vous achetez, ce n'est pas l'accès à l'information : c'est la fiche prête à appeler, le lendemain de la publication, avant votre concurrent. Un repreneur choisit ses fournisseurs dans les 90 jours. Arriver à J+1 plutôt qu'à J+30, c'est toute la différence entre signer et arriver après. Et le calcul est simple : un seul client signé dans l'année rembourse l'abonnement.",
  },
  {
    q: "C'est légal de démarcher ces repreneurs ?",
    a: "Oui. Il s'agit de données professionnelles publiées officiellement, concernant des entreprises et non des particuliers. Le démarchage B2B sur ces bases est parfaitement conforme au RGPD, à condition de respecter le droit d'opposition, ce qui est le cas de tout démarchage professionnel classique.",
  },
  {
    q: "Combien de reprises vais-je recevoir chaque jour ?",
    a: "Ça dépend de votre zone et de votre métier. À l'échelle nationale, environ 3 900 commerces changent de mains chaque mois. Sur un département dense comme Paris ou le Rhône, comptez plusieurs reprises par jour dans le secteur CHR ; sur un département rural, quelques-unes par semaine. La fiche de votre zone vous donne le chiffre réel avant de vous abonner.",
  },
  {
    q: "Je peux changer de zone ou de métier en cours de route ?",
    a: "Oui, à tout moment, sur simple demande par email. Le changement est effectif dès l'édition du lendemain matin.",
  },
  {
    q: "Sans engagement, ça veut dire quoi concrètement ?",
    a: "Vous payez mois par mois et vous pouvez résilier en un clic depuis votre espace client, sans préavis ni justification. Si vous préférez vous engager sur 6 ou 12 mois, un ou deux mois vous sont offerts en échange.",
  },
  {
    q: "Que se passe-t-il si j'annule ?",
    a: "Vous continuez à recevoir vos reprises jusqu'à la fin du mois déjà payé, puis les emails s'arrêtent. Aucun frais, aucune relance. Vous pouvez revenir quand vous voulez.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={`faq-item${isOpen ? " open" : ""}`}>
            <button className="faq-q" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
              <span>{item.q}</span>
              <svg className="faq-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="faq-a" style={{ maxHeight: isOpen ? 400 : 0 }}>
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
