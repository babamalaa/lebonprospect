import Header from "../components/Header";

export const metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

const S = { maxWidth: 720, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 };
const H2 = { fontFamily: "Archivo, sans-serif", fontSize: 20, fontWeight: 800, margin: "28px 0 8px" };

export default function MentionsLegales() {
  return (
    <>
      <Header />
      <main style={S}>
        <h1 className="disp" style={{ fontFamily: "Archivo, sans-serif", fontSize: 32, fontWeight: 900, marginBottom: 18 }}>
          Mentions légales
        </h1>

        <h2 style={H2}>Éditeur du site</h2>
        <p>
          Le site lebonprospect.fr est édité par Baptiste Portugal (entrepreneur individuel).<br />
          Contact : contact@lebonprospect.fr
        </p>

        <h2 style={H2}>Hébergement</h2>
        <p>
          Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — vercel.com<br />
          Données hébergées au sein de l&apos;Union européenne (Supabase, région eu-west-1, Irlande).
        </p>

        <h2 style={H2}>Sources des données</h2>
        <p>
          Les informations sur les cessions de fonds de commerce proviennent du Bulletin officiel des annonces
          civiles et commerciales (BODACC), publié par la DILA sous licence ouverte Etalab 2.0, enrichies par des
          données publiques d&apos;entreprises (base SIRENE, annuaires publics d&apos;établissements). LeBonProspect
          retraite et organise ces données publiques ; il n&apos;invente ni ne modifie aucune information officielle.
        </p>

        <h2 style={H2}>Données personnelles</h2>
        <p>
          Les données traitées concernent des entreprises et leurs représentants légaux dans le cadre de leur
          activité professionnelle, issues de publications légales obligatoires. Conformément au RGPD, toute
          personne concernée peut exercer ses droits d&apos;accès, de rectification ou d&apos;opposition en écrivant à
          contact@lebonprospect.fr. Les données des abonnés (email, coordonnées de facturation) ne sont ni
          revendues ni partagées, et servent uniquement à la fourniture du service.
        </p>

        <h2 style={H2}>Propriété intellectuelle</h2>
        <p>
          La marque, le logo et la structure du site sont la propriété de l&apos;éditeur. Les données publiques
          restent soumises à leurs licences d&apos;origine.
        </p>

        <p style={{ marginTop: 32 }}>
          <a href="/" style={{ color: "#31777A", fontWeight: 700 }}>← Retour à l&apos;accueil</a>
        </p>
      </main>
    </>
  );
}
