import Header from "../components/Header";

export const metadata = {
  title: "Conditions générales de vente",
  robots: { index: false },
};

const S = { maxWidth: 720, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 };
const H2 = { fontFamily: "Archivo, sans-serif", fontSize: 20, fontWeight: 800, margin: "28px 0 8px" };

export default function CGV() {
  return (
    <>
      <Header />
      <main style={S}>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 18 }}>
          Conditions générales de vente
        </h1>
        <p style={{ color: "#6f6a5c", fontSize: 14 }}>Dernière mise à jour : septembre 2026</p>

        <h2 style={H2}>1. Objet</h2>
        <p>
          LeBonProspect fournit un service d&apos;information par abonnement : la livraison par email d&apos;une
          sélection d&apos;annonces officielles de ventes et cessions de fonds de commerce, triées par secteur
          d&apos;activité et par zone géographique, enrichies de données publiques d&apos;entreprises
          (identité du repreneur, adresse, téléphone de l&apos;établissement lorsqu&apos;il est disponible).
        </p>

        <h2 style={H2}>2. Abonnements et prix</h2>
        <p>
          Trois formules mensuelles sont proposées : Départemental (149 € HT/mois), Régional (299 € HT/mois) et
          National (499 € HT/mois). Le paiement s&apos;effectue par prélèvement mensuel automatique via Stripe.
          L&apos;abonnement est sans engagement de durée : il peut être résilié à tout moment et prend fin à
          l&apos;échéance de la période en cours. Des remises sont accordées pour les engagements de 6 mois
          (1 mois offert) et 12 mois (2 mois offerts).
        </p>

        <h2 style={H2}>3. Nature du service et limites</h2>
        <p>
          Les informations livrées proviennent de publications légales officielles et de sources publiques.
          LeBonProspect ne garantit ni l&apos;exhaustivité des annonces, ni la disponibilité d&apos;un numéro de
          téléphone pour chaque annonce, ni la conclusion d&apos;affaires commerciales avec les contacts fournis.
          Le service est un outil d&apos;information et de prospection, non une promesse de résultat.
        </p>

        <h2 style={H2}>4. Utilisation des données</h2>
        <p>
          Les données livrées sont destinées à l&apos;usage interne de prospection de l&apos;abonné. La revente,
          la redistribution ou la publication des données livrées sont interdites. L&apos;abonné s&apos;engage à
          respecter la réglementation applicable à la prospection commerciale (notamment RGPD et règles de
          démarchage téléphonique) dans l&apos;utilisation des informations fournies.
        </p>

        <h2 style={H2}>5. Résiliation et remboursement</h2>
        <p>
          La résiliation s&apos;effectue depuis le portail client Stripe (lien fourni dans chaque email) ou sur
          simple demande à contact@lebonprospect.fr. Conformément à l&apos;article L221-3 du Code de la
          consommation, le service étant fourni à des professionnels dans le cadre de leur activité, le droit de
          rétractation ne s&apos;applique pas. Toute période entamée est due.
        </p>

        <h2 style={H2}>6. Responsabilité</h2>
        <p>
          La responsabilité de l&apos;éditeur est limitée au montant des sommes versées au titre des trois
          derniers mois d&apos;abonnement. L&apos;éditeur ne saurait être tenu responsable d&apos;une
          interruption temporaire du service liée aux sources officielles ou à des tiers techniques.
        </p>

        <h2 style={H2}>7. Droit applicable</h2>
        <p>Les présentes CGV sont soumises au droit français.</p>

        <p style={{ marginTop: 32 }}>
          <a href="/" style={{ color: "#31777A", fontWeight: 700 }}>← Retour à l&apos;accueil</a>
        </p>
      </main>
    </>
  );
}
