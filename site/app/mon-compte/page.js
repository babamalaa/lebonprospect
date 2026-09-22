import Header from "../components/Header";
import MonCompteForm from "./MonCompteForm";

export const metadata = {
  title: "Mon abonnement",
  description: "Factures, moyen de paiement, résiliation : gérez votre abonnement LeBonProspect.",
  robots: { index: false, follow: false },
};

export default function MonComptePage() {
  return (
    <>
      <Header />
      <section className="hero wrap" style={{ paddingTop: 64, paddingBottom: 40 }}>
        <div className="stamp"><span className="dot" />Espace abonné</div>
        <h1 className="sm" style={{ fontSize: 44 }}>Gérer mon abonnement</h1>
        <p className="sub">Factures, moyen de paiement, résiliation en un clic. Entrez l&apos;adresse email qui reçoit votre digest.</p>
      </section>
      <section className="wrap" style={{ paddingBottom: 120 }}>
        <MonCompteForm />
      </section>
      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect</span>
          <span><a href="mailto:contact@lebonprospect.fr" style={{ color: "inherit" }}>contact@lebonprospect.fr</a></span>
        </div>
      </footer>
    </>
  );
}
