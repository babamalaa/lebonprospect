import Header from "../components/Header";

export const metadata = {
  title: "Politique de confidentialité",
  description: "Comment LeBonProspect collecte, utilise et protège vos données personnelles.",
  robots: { index: false },
};

const S = { maxWidth: 720, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 };
const H2 = { fontFamily: "Archivo, sans-serif", fontSize: 20, fontWeight: 800, margin: "32px 0 8px" };
const H3 = { fontFamily: "Archivo, sans-serif", fontSize: 16, fontWeight: 700, margin: "18px 0 6px" };
const TABLE = { width: "100%", borderCollapse: "collapse", fontSize: 14, margin: "12px 0 6px" };
const TH = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #E6E0D0", fontWeight: 700 };
const TD = { padding: "8px 10px", borderBottom: "1px solid #E6E0D0", verticalAlign: "top" };

export default function Confidentialite() {
  return (
    <>
      <Header />
      <main style={S}>
        <h1 className="disp" style={{ fontFamily: "Archivo, sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 6 }}>
          Politique de confidentialité
        </h1>
        <p style={{ color: "#6f6a5c", fontSize: 14, marginBottom: 18 }}>Dernière mise à jour : 22 septembre 2026</p>

        <p>
          LeBonProspect est un service d&apos;information professionnelle : chaque matin, nos abonnés reçoivent la liste
          des commerces de leur métier et de leur zone qui viennent de changer de propriétaire, à partir des publications
          officielles. Cette page explique quelles données nous traitons, pourquoi, combien de temps, et quels sont vos
          droits. Elle s&apos;applique aux visiteurs du site, aux abonnés, aux prospects que nous contactons, et aux
          personnes dont le nom figure dans les publications officielles que nous retraitons.
        </p>

        <h2 style={H2}>1. Responsable du traitement</h2>
        <p>
          Khira Agency LLC, société de droit américain (Limited Liability Company) immatriculée dans l&apos;État du
          Nouveau-Mexique, 8206 Louisiana Blvd NE, Ste A #6588, Albuquerque, NM 87113, États-Unis, exploitant le
          service LeBonProspect (lebonprospect.fr).<br />
          Contact pour toute question relative à vos données : <a href="mailto:contact@lebonprospect.fr">contact@lebonprospect.fr</a>.
        </p>

        <h2 style={H2}>2. Les données que nous traitons, et pourquoi</h2>

        <h3 style={H3}>2.1 Si vous êtes abonné</h3>
        <table style={TABLE}>
          <thead><tr><th style={TH}>Données</th><th style={TH}>Finalité</th><th style={TH}>Base légale</th><th style={TH}>Durée</th></tr></thead>
          <tbody>
            <tr><td style={TD}>Email, nom, société, téléphone, métier, zone géographique souhaitée</td><td style={TD}>Créer votre abonnement, vous livrer le digest quotidien, vous accompagner (onboarding, support)</td><td style={TD}>Exécution du contrat</td><td style={TD}>Durée de l&apos;abonnement, puis 3 ans après sa fin</td></tr>
            <tr><td style={TD}>Données de paiement (carte bancaire)</td><td style={TD}>Encaisser l&apos;abonnement</td><td style={TD}>Exécution du contrat</td><td style={TD}>Traitées et conservées par Stripe uniquement ; nous ne stockons jamais votre numéro de carte</td></tr>
            <tr><td style={TD}>Factures, historique des paiements</td><td style={TD}>Obligations comptables et fiscales</td><td style={TD}>Obligation légale</td><td style={TD}>10 ans</td></tr>
            <tr><td style={TD}>Statut de l&apos;abonnement (essai, actif, résilié), dates d&apos;envoi des digests</td><td style={TD}>Gérer le service, mesurer son usage</td><td style={TD}>Exécution du contrat, intérêt légitime</td><td style={TD}>Durée de l&apos;abonnement, puis 3 ans</td></tr>
          </tbody>
        </table>

        <h3 style={H3}>2.2 Si vous êtes un professionnel que nous contactons</h3>
        <p>
          Nous prospectons des entreprises fournisseurs des cafés, hôtels et restaurants (agenceurs, équipementiers,
          enseignistes, solutions d&apos;encaissement, etc.). Pour cela, nous constituons un fichier à partir de sources
          publiques : fiches d&apos;établissement Google, sites web des entreprises, annuaires professionnels. Il contient
          la raison sociale, l&apos;adresse, le téléphone et le site web de l&apos;établissement, et le cas échéant le nom du
          dirigeant lorsqu&apos;il est public.
        </p>
        <p>
          Base légale : notre intérêt légitime à présenter un service professionnel à des professionnels, dans leur
          domaine d&apos;activité. Nous ne contactons que des entreprises, jamais des particuliers. Vous pouvez à tout
          moment demander à ne plus être contacté : il suffit de le dire au téléphone ou d&apos;écrire à
          contact@lebonprospect.fr ; votre fiche est alors marquée « ne plus contacter » et n&apos;est plus utilisée.
          Les fiches de prospection sont conservées 3 ans après le dernier contact.
        </p>

        <h3 style={H3}>2.3 Si votre nom figure dans une publication officielle que nous retraitons</h3>
        <p>
          Le cœur du service repose sur le Bulletin officiel des annonces civiles et commerciales (BODACC), publié par
          la Direction de l&apos;information légale et administrative sous licence ouverte Etalab 2.0. Lorsqu&apos;un
          fonds de commerce est cédé, la loi impose la publication de l&apos;annonce, qui mentionne notamment l&apos;acquéreur
          (société ou personne physique) et l&apos;adresse du fonds. Nous retraitons ces publications pour les trier par
          secteur et par zone, et nous les complétons avec des données d&apos;entreprise également publiques
          (répertoire SIRENE, fiches d&apos;établissement publiques) afin d&apos;y associer le téléphone de l&apos;établissement
          repris.
        </p>
        <p>
          Base légale : intérêt légitime (information économique à partir de données rendues publiques par la loi,
          à destination de professionnels). Nous n&apos;inventons, ne modifions ni ne complétons aucune information par
          des données non publiques. Chaque information reste vérifiable à sa source. Si vous êtes concerné par une
          annonce et souhaitez exercer vos droits (voir section 6), écrivez-nous : nous pouvons retirer votre fiche de
          nos envois futurs. Nous ne pouvons pas modifier la publication officielle elle-même, qui relève du BODACC.
          Ces données sont conservées 24 mois après la date de publication.
        </p>

        <h3 style={H3}>2.4 Si vous visitez le site</h3>
        <p>
          Nous utilisons Vercel Analytics, un outil de mesure d&apos;audience qui ne dépose aucun cookie et ne collecte
          aucune donnée permettant de vous identifier (pas d&apos;adresse IP conservée, pas d&apos;identifiant persistant).
          C&apos;est pourquoi le site n&apos;affiche pas de bandeau de consentement aux cookies. Les journaux techniques de
          l&apos;hébergeur (adresse IP, pages consultées) sont conservés au maximum 30 jours à des fins de sécurité.
        </p>

        <h3 style={H3}>2.5 Si vous êtes apporteur d&apos;affaires (closer)</h3>
        <p>
          Identité, coordonnées, SIRET, données de facturation et activité dans l&apos;espace closer (prospects traités,
          statuts, notes). Finalité : exécution du contrat d&apos;apporteur d&apos;affaires et calcul des commissions.
          Conservation : durée du contrat, puis 5 ans (prescription commerciale), 10 ans pour les pièces comptables.
        </p>

        <h2 style={H2}>3. Qui a accès à vos données</h2>
        <p>
          Vos données ne sont jamais vendues ni louées. Elles sont accessibles à l&apos;équipe LeBonProspect (fondateurs
          et apporteurs d&apos;affaires, chacun uniquement pour les prospects qui lui sont attribués) et aux prestataires
          techniques suivants, qui agissent sur nos instructions :
        </p>
        <table style={TABLE}>
          <thead><tr><th style={TH}>Prestataire</th><th style={TH}>Rôle</th><th style={TH}>Localisation des données</th></tr></thead>
          <tbody>
            <tr><td style={TD}>Supabase</td><td style={TD}>Base de données et authentification</td><td style={TD}>Union européenne (Irlande, eu-west-1)</td></tr>
            <tr><td style={TD}>Vercel</td><td style={TD}>Hébergement du site et des fonctions serveur, mesure d&apos;audience</td><td style={TD}>États-Unis et Union européenne (clauses contractuelles types)</td></tr>
            <tr><td style={TD}>Stripe</td><td style={TD}>Paiement, facturation, portail client</td><td style={TD}>Union européenne et États-Unis (Stripe est certifié PCI-DSS ; clauses contractuelles types)</td></tr>
            <tr><td style={TD}>Resend</td><td style={TD}>Envoi des emails (digest quotidien, notifications)</td><td style={TD}>États-Unis (clauses contractuelles types)</td></tr>
            <tr><td style={TD}>Zoho Mail</td><td style={TD}>Messagerie professionnelle de l&apos;équipe</td><td style={TD}>Union européenne</td></tr>
            <tr><td style={TD}>Google (Places)</td><td style={TD}>Enrichissement des fiches d&apos;établissement (données publiques)</td><td style={TD}>États-Unis et Union européenne</td></tr>
          </tbody>
        </table>
        <p>
          Le responsable du traitement étant établi aux États-Unis, certaines données sont transférées hors de
          l&apos;Union européenne. Ces transferts sont encadrés par les clauses contractuelles types adoptées par la
          Commission européenne et, pour les prestataires concernés, par leur certification au Data Privacy Framework.
        </p>

        <h2 style={H2}>4. Sécurité</h2>
        <p>
          Les données sont chiffrées en transit (HTTPS) et au repos. L&apos;accès à la base est restreint par des clés
          serveur et des règles d&apos;accès par rôle : un apporteur d&apos;affaires ne voit que ses propres prospects, un
          abonné ne peut agir que sur son propre abonnement. Les numéros de carte ne transitent jamais par nos
          serveurs. En cas de violation de données susceptible d&apos;engendrer un risque pour vos droits, nous vous en
          informerons dans les délais prévus par la réglementation.
        </p>

        <h2 style={H2}>5. Emails que nous envoyons</h2>
        <p>
          Abonnés : le digest quotidien (c&apos;est le service) et les emails liés au compte (bienvenue, fin d&apos;essai,
          facturation). Chaque digest contient un lien « gérer mon abonnement ». Nous n&apos;envoyons pas de newsletter
          marketing ; si nous en créons une, elle sera sur inscription distincte, avec désinscription en un clic.
        </p>

        <h2 style={H2}>6. Vos droits</h2>
        <p>
          Conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés,
          vous disposez des droits suivants sur vos données : accès, rectification, effacement, limitation du
          traitement, opposition (notamment à la prospection), portabilité, et le droit de définir des directives
          relatives au sort de vos données après votre décès.
        </p>
        <p>
          Pour les exercer, écrivez à <a href="mailto:contact@lebonprospect.fr">contact@lebonprospect.fr</a> en
          précisant l&apos;objet de votre demande. Nous répondons sous un mois. Nous pouvons vous demander un justificatif
          d&apos;identité si la demande le nécessite. Si vous estimez, après nous avoir contactés, que vos droits ne sont
          pas respectés, vous pouvez saisir la Commission nationale de l&apos;informatique et des libertés (CNIL,
          3 place de Fontenoy, 75007 Paris, cnil.fr).
        </p>
        <p>
          Abonnés : vous pouvez consulter vos factures, modifier votre moyen de paiement et résilier à tout moment
          depuis <a href="/mon-compte">lebonprospect.fr/mon-compte</a>.
        </p>

        <h2 style={H2}>7. Mineurs</h2>
        <p>Le service s&apos;adresse exclusivement à des professionnels. Nous ne collectons pas sciemment de données de personnes de moins de 18 ans.</p>

        <h2 style={H2}>8. Modifications</h2>
        <p>
          Cette politique peut évoluer avec le service. La date de dernière mise à jour figure en haut de page. En cas
          de changement substantiel, les abonnés en sont informés par email.
        </p>
      </main>
      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect · Khira Agency LLC</span>
          <span><a href="/mentions-legales" style={{ color: "inherit" }}>Mentions légales</a> · <a href="/cgv" style={{ color: "inherit" }}>CGV</a> · <a href="/confidentialite" style={{ color: "inherit" }}>Confidentialité</a></span>
        </div>
      </footer>
    </>
  );
}
