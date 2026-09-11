"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const SOMMAIRE = [
  { id: "produit", label: "1. Le produit" },
  { id: "formules", label: "2. Les formules" },
  { id: "remuneration", label: "3. Rémunération" },
  { id: "revenu", label: "4. Ce que ça peut rapporter" },
  { id: "versement", label: "5. Déclencheur & versement" },
  { id: "dashboard", label: "6. Utiliser le dashboard" },
  { id: "appel", label: "7. Anatomie d'un bon appel" },
  { id: "dolist", label: "8. Ce qu'on dit, ce qu'on ne dit jamais" },
  { id: "processus", label: "9. Le processus, étape par étape" },
  { id: "faq", label: "10. Questions fréquentes" },
  { id: "contact", label: "11. Contact & confidentialité" },
];

export default function KitPage() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) window.location.href = "/closers/login";
  }, [session]);

  if (session === undefined) return <div className="app-loading">Chargement…</div>;
  if (session === null) return null;

  return (
    <main className="closers">
      <div className="cl-band">
        <div className="wrap cl-band-in">
          <span className="tz-logo">
            <span className="mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </span>
          <span className="tz-for">espace équipe commerciale · confidentiel</span>
        </div>
      </div>

      <section className="hero wrap cl-hero">
        <h1>
          Bienvenue dans <span className="hl">l&apos;équipe commerciale</span>
        </h1>
        <p className="sub">
          Ce document explique le produit, la rémunération, et les règles à respecter en représentant
          LeBonProspect. Prenez 15 minutes pour tout lire avant votre premier appel : ça vous évitera
          la moitié des questions plus tard.
        </p>
        <div className="cta-row" style={{ justifyContent: "center", marginTop: 18 }}>
          <a href="/closers/app" className="btn">
            ← Retour à mon espace
          </a>
        </div>
      </section>

      {/* Sommaire */}
      <section className="wrap cl-section" style={{ paddingBottom: 10 }}>
        <div className="kit-toc">
          {SOMMAIRE.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="kit-toc-item">{s.label}</a>
          ))}
        </div>
      </section>

      <section id="produit" className="wrap cl-section">
        <h2 className="disp">1. Le produit en 30 secondes</h2>
        <div className="cl-card">
          <p>
            Chaque jour, des commerces changent de propriétaire en France, c&apos;est publié obligatoirement au
            Journal officiel (BODACC). LeBonProspect détecte ces reprises et livre chaque matin à 8h, par email,
            le contact du repreneur (nom, adresse, téléphone quand disponible) aux fournisseurs qui veulent
            l&apos;approcher avant leurs concurrents.
          </p>
          <p style={{ marginTop: 10 }}>
            La cible principale aujourd&apos;hui : les fournisseurs CHR (agencement, matériel de cuisine,
            encaissement, enseignes, mobilier professionnel) qui équipent les cafés, bars, restaurants et hôtels
            qui viennent de changer de main.
          </p>
        </div>
        <div className="cl-card teal" style={{ marginTop: 12 }}>
          <b style={{ display: "block", marginBottom: 6 }}>Pourquoi ça marche</b>
          <p>
            Un repreneur qui vient de racheter un fonds de commerce a un dossier de financement qui tient
            (contrairement à une création pure), vient d&apos;investir donc a du budget disponible, et dans les
            semaines qui suivent, tous ses contrats fournisseurs sont ouverts à renégociation. C&apos;est la
            fenêtre la plus favorable pour approcher un nouveau client CHR.
          </p>
        </div>
      </section>

      <section id="formules" className="wrap cl-section">
        <h2 className="disp">2. Les formules vendues</h2>
        <div className="cl-plans">
          <div className="cl-plan">
            <div className="cl-plan-name">Départemental</div>
            <div className="cl-plan-price">149 €<small>/mois</small></div>
            <div className="cl-plan-sub">1 département au choix</div>
          </div>
          <div className="cl-plan mid">
            <div className="cl-plan-name">Régional</div>
            <div className="cl-plan-price">299 €<small>/mois</small></div>
            <div className="cl-plan-sub">1 région complète</div>
          </div>
          <div className="cl-plan">
            <div className="cl-plan-name">National / Enterprise</div>
            <div className="cl-plan-price">Sur devis</div>
            <div className="cl-plan-sub">France entière, multi-comptes</div>
          </div>
        </div>
        <p className="engage">
          Sans engagement, résiliable en 1 clic · engagement 6 mois : <b>1 mois offert</b> · engagement 12 mois :{" "}
          <b>2 mois offerts</b>
        </p>
        <div className="cl-card" style={{ marginTop: 14 }}>
          <b style={{ display: "block", marginBottom: 6 }}>Comment choisir quoi proposer</b>
          <p>
            Par défaut, partez sur le <b>Départemental</b> pour une TPE/PME locale (budget plus accessible,
            décision rapide), et sur le <b>Régional</b> pour une structure avec plusieurs commerciaux ou un
            rayon d&apos;action plus large. Le <b>National/Enterprise</b> concerne les groupes, franchises ou
            équipes commerciales structurées (type Cloud Eco, Folliet) — dans ce cas, ne négociez jamais de prix
            vous-même : qualifiez le besoin et transmettez à Lawrenza qui gère la négociation sur devis.
          </p>
        </div>
      </section>

      <section id="remuneration" className="wrap cl-section">
        <h2 className="disp">3. La rémunération</h2>
        <p className="center-sub">100% variable. Pas de salaire fixe, pas de frais avancés, pas de risque.</p>

        <h3 className="cl-h3">Deal sans engagement</h3>
        <div className="cl-card teal">
          <p>
            <b>25% du premier mois facturé</b>, versé en instantané dès l&apos;encaissement du paiement client.
          </p>
          <p style={{ marginTop: 8 }}>
            <b>+ 10% du deuxième mois</b>, versé le mois suivant, uniquement si le client est toujours abonné et
            à jour de paiement à ce moment-là.
          </p>
        </div>

        <div className="cl-card dark">
          <div className="cl-badge">bonus de lancement</div>
          <h3 style={{ marginTop: 8, color: "#fff" }}>Les 30 premiers jours</h3>
          <p>
            Pendant votre premier mois de collaboration, la commission sur les deals sans engagement passe de{" "}
            <b>25% à 35%</b> du premier mois facturé.
          </p>
        </div>

        <h3 className="cl-h3">Deal avec engagement 6 mois</h3>
        <div className="cl-card teal">
          <p>
            <b>100% du montant du premier mois</b> (avant remise), versé en deux fois :
          </p>
          <ul className="cl-list">
            <li>50% à la signature (dès l&apos;encaissement du premier paiement client)</li>
            <li>
              50% à mi-engagement (mois 3), uniquement si le client est toujours actif et à jour de paiement.
              En cas de résiliation ou d&apos;impayé avant le mois 3, cette seconde partie n&apos;est pas due.
            </li>
          </ul>
        </div>
      </section>

      <section id="revenu" className="wrap cl-section">
        <h2 className="disp">4. Ce que ça peut rapporter</h2>

        <h3 className="cl-h3">Paliers de volume (bonus mensuel, cumulatif)</h3>
        <div className="cl-stats">
          <div className="cl-stat">
            <div className="n">+50 €</div>
            <div className="l">à partir de 5 deals dans le mois</div>
          </div>
          <div className="cl-stat hot">
            <div className="n">+150 €</div>
            <div className="l">à partir de 10 deals (200 € cumulés)</div>
          </div>
        </div>

        <h3 className="cl-h3">Exemple concret : 10 deals (7 départemental + 3 régional)</h3>
        <div className="cl-timeline">
          <div className="cl-tl-item">
            <div className="cl-tl-dot" />
            <div>
              <b>Mois 1</b> — starter tier 35% + paliers
              <span className="cl-tl-n">~879 €</span>
            </div>
          </div>
          <div className="cl-tl-item">
            <div className="cl-tl-dot" />
            <div>
              <b>Mois 2</b> — retour à 25% + paliers + rétention (churn 8%)
              <span className="cl-tl-n">~863 €</span>
            </div>
          </div>
          <div className="cl-tl-item last">
            <div className="cl-tl-dot" />
            <div>
              <b>Cumul 2 mois</b>
              <span className="cl-tl-n hot">~1 742 €</span>
            </div>
          </div>
        </div>

        <div className="cl-card dark" style={{ marginTop: 18 }}>
          <h3 style={{ color: "#fff" }}>Où est le vrai revenu, et combien de temps ça prend</h3>
          <p>
            Signer 10 deals/mois demande environ 100 à 200 appels (conversion réaliste en B2B froid :
            5 à 10%), soit environ 10 à 15h/semaine. Les cibles ne sont pas pré-qualifiées ni appelées en amont,
            mais elles ne sortent pas de nulle part : ce sont des listes ciblées, triées par secteur et par
            zone, avec téléphone et lien personnalisé prêts à l&apos;emploi. À ce rythme, comptez 700 à 900
            €/mois : un très bon side, pas un plein temps. Le vrai levier de revenu, ce sont les comptes
            enterprise (chaînes, groupes, équipes commerciales) : un seul deal enterprise engagé vaut plus que
            15 deals départementaux. Dès que le pitch est rodé sur les petits comptes, priorisez le temps sur
            les gros prospects.
          </p>
        </div>
      </section>

      <section id="versement" className="wrap cl-section">
        <h2 className="disp">5. Déclencheur, statut et versement</h2>
        <ul className="cl-list wide">
          <li>
            La commission se déclenche sur <b>le premier paiement Stripe réellement encaissé</b>, jamais sur
            une signature verbale ou un accord de principe.
          </li>
          <li>
            <b>Virement en instantané le jour même</b> où le client paye son abonnement.
          </li>
          <li>
            <b>Facturation en indépendant obligatoire</b> (auto-entrepreneur ou société, avec SIRET) pour
            percevoir une commission. Sans SIRET, aucune commission ne peut être versée légalement.
          </li>
          <li>Le reporting d&apos;un deal signé se fait le jour même auprès de Lawrenza.</li>
        </ul>
      </section>

      <section id="dashboard" className="wrap cl-section">
        <h2 className="disp">6. Utiliser le dashboard</h2>
        <p className="center-sub">Tout se passe dans votre espace personnel, sur www.lebonprospect.fr/closers/app</p>

        <div className="kit-steps-grid">
          <div className="cl-card">
            <b style={{ display: "block", marginBottom: 6 }}>Recevoir des prospects</b>
            <p>Sur l&apos;onglet Accueil, cliquez sur un bouton « Recevoir de nouveaux leads » (toutes zones ou une région précise). 15 prospects vous sont assignés automatiquement, jamais visibles pour un autre closer.</p>
          </div>
          <div className="cl-card">
            <b style={{ display: "block", marginBottom: 6 }}>Générer la page personnalisée</b>
            <p>Dans le tableau « Mes prospects », colonne Page, cliquez sur « Générer ». La mini-page de closing (chiffres réels de sa zone, tarifs) est créée automatiquement et le lien apparaît, prêt à envoyer pendant l&apos;appel.</p>
          </div>
          <div className="cl-card">
            <b style={{ display: "block", marginBottom: 6 }}>Suivre un prospect</b>
            <p>Changez le statut après chaque appel (à contacter, répondeur, barrage, à rappeler, chaud, signé, non), notez la prochaine action et les objections rencontrées. Le tableau se sauvegarde automatiquement.</p>
          </div>
          <div className="cl-card">
            <b style={{ display: "block", marginBottom: 6 }}>Signer un deal</b>
            <p>Passez le statut à « Signé », puis choisissez la formule vendue dans la colonne Plan. Une notification part automatiquement à Lawrenza pour activer l&apos;abonnement — rien d&apos;autre à faire de votre côté.</p>
          </div>
        </div>

        <div className="cl-card teal" style={{ marginTop: 14 }}>
          <b style={{ display: "block", marginBottom: 6 }}>Glossaire des statuts</b>
          <ul className="cl-list">
            <li><b>À contacter</b> — prospect reçu, pas encore appelé</li>
            <li><b>Répondeur</b> — appelé, tombé sur répondeur, à retenter</li>
            <li><b>Barrage</b> — bloqué par un standard/secrétariat, décideur non joint</li>
            <li><b>À rappeler</b> — contact établi, rendez-vous ou rappel prévu</li>
            <li><b>Chaud</b> — intérêt confirmé, en cours de décision</li>
            <li><b>Signé</b> — deal conclu, paiement Stripe encaissé</li>
            <li><b>Non</b> — refus définitif, ne pas retenter avant plusieurs mois</li>
          </ul>
        </div>
      </section>

      <section id="appel" className="wrap cl-section">
        <h2 className="disp">7. Anatomie d&apos;un bon appel</h2>
        <p className="center-sub">Le détail complet des 4 scripts est dans l&apos;onglet Scripts d&apos;appel de votre dashboard. Voici la structure commune.</p>
        <div className="cl-steps">
          <div className="cl-step">
            <div className="n">1</div>
            <p><b>Accroche (10-15s)</b> — citez une reprise réelle et récente, jamais un exemple générique. C&apos;est ce qui capte l&apos;attention en B2B froid.</p>
          </div>
          <div className="cl-step">
            <div className="n">2</div>
            <p><b>Le pitch</b> — expliquez le mécanisme en une phrase : détection chaque matin, contact du repreneur livré à 8h.</p>
          </div>
          <div className="cl-step">
            <div className="n">3</div>
            <p><b>Le moment décisif</b> — envoyez le lien personnalisé en direct pendant l&apos;appel, puis laissez 10-15 secondes de silence pendant qu&apos;il/elle regarde. Ne rien dire, laisser la page convaincre.</p>
          </div>
          <div className="cl-step">
            <div className="n">4</div>
            <p><b>Discovery</b> — 1 à 2 questions pour comprendre son mode de prospection actuel et son budget, avant de pivoter sur l&apos;offre.</p>
          </div>
          <div className="cl-step">
            <div className="n">5</div>
            <p><b>Objections</b> — chaque script contient les réponses aux objections les plus fréquentes pour ce profil de prospect.</p>
          </div>
          <div className="cl-step">
            <div className="n">6</div>
            <p><b>Le close</b> — proposez le choix entre 2 formules (jamais « voulez-vous » mais « lequel préférez-vous »), restez en ligne jusqu&apos;à confirmation du paiement.</p>
          </div>
        </div>

        <div className="cl-card" style={{ marginTop: 14 }}>
          <b style={{ display: "block", marginBottom: 6 }}>Avant votre tout premier appel</b>
          <ul className="cl-list">
            <li>Avoir créé votre compte closer et reçu vos 15 premiers prospects</li>
            <li>Avoir lu au moins 2 des 4 scripts d&apos;appel et choisi celui que vous maîtrisez le mieux</li>
            <li>Avoir généré la page personnalisée d&apos;au moins un prospect pour voir le rendu</li>
            <li>Avoir votre SIRET prêt (nécessaire dès le premier deal signé pour percevoir la commission)</li>
          </ul>
        </div>
      </section>

      <section id="dolist" className="wrap cl-section">
        <h2 className="disp">8. Ce qu&apos;on dit, ce qu&apos;on ne dit jamais</h2>
        <p className="center-sub">
          LeBonProspect vend de la donnée publique, vérifiable, jamais inventée. C&apos;est notre plus gros
          argument de confiance : ne le cassez jamais pour closer plus vite.
        </p>
        <div className="cl-dolist">
          <div className="cl-do">
            <b>À faire</b>
            <ul>
              <li>Toujours citer une reprise réelle et récente, jamais un exemple inventé</li>
              <li>Envoyer le lien personnalisé en direct pendant l&apos;appel</li>
              <li>Dire clairement quand une fonctionnalité est en développement</li>
              <li>Rappeler que c&apos;est sans engagement, résiliable en un clic</li>
              <li>Reporter un deal signé le jour même, avec email + plan + zone</li>
            </ul>
          </div>
          <div className="cl-dont">
            <b>À ne jamais faire</b>
            <ul>
              <li>Inventer ou arrondir un chiffre, un numéro, une reprise</li>
              <li>Promettre un délai ferme sur une fonctionnalité non livrée</li>
              <li>Garantir un résultat commercial</li>
              <li>Dénigrer le BODACC ou suggérer une donnée cachée</li>
              <li>Signer sans formulaire secteur + zone rempli (sinon rien n&apos;est livrable)</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="processus" className="wrap cl-section">
        <h2 className="disp">9. Le processus, étape par étape</h2>
        <div className="cl-steps">
          <div className="cl-step">
            <div className="n">1</div>
            <p>Vous recevez une liste de cibles et les outils : script d&apos;appel, plaquette, fiche de suivi.</p>
          </div>
          <div className="cl-step">
            <div className="n">2</div>
            <p>Vous appelez, vous envoyez le lien personnalisé en direct, vous remplissez une fiche par call.</p>
          </div>
          <div className="cl-step">
            <div className="n">3</div>
            <p>Si le prospect paye via le lien Stripe, c&apos;est automatique, rien à faire côté encaissement.</p>
          </div>
          <div className="cl-step">
            <div className="n">4</div>
            <p>Vous signalez le deal à Lawrenza le jour même, pour activation de l&apos;abonnement.</p>
          </div>
          <div className="cl-step">
            <div className="n">5</div>
            <p>La commission est calculée sur l&apos;encaissement réel et versée sur présentation de facture.</p>
          </div>
        </div>
      </section>

      <section id="faq" className="wrap cl-section">
        <h2 className="disp">10. Questions fréquentes</h2>
        <div className="kit-faq">
          <div className="kit-faq-item">
            <b>Je n&apos;ai pas encore de SIRET, je peux quand même commencer à appeler ?</b>
            <p>Oui, vous pouvez appeler et remplir le dashboard dès aujourd&apos;hui. Le SIRET n&apos;est nécessaire qu&apos;au moment de percevoir votre première commission — mais mieux vaut l&apos;avoir prêt avant votre premier deal pour ne pas retarder le versement.</p>
          </div>
          <div className="kit-faq-item">
            <b>Le prospect veut négocier le prix, je peux baisser ?</b>
            <p>Non. Les tarifs affichés sont fixes pour les formules Départemental et Régional. Seule l&apos;offre National/Enterprise se négocie, et uniquement par Lawrenza.</p>
          </div>
          <div className="kit-faq-item">
            <b>Deux closers peuvent-ils appeler la même entreprise ?</b>
            <p>Non, en théorie jamais : chaque prospect assigné n&apos;est visible que par vous. Si vous tombez sur un doublon (bug ou prospect déjà connu par un autre canal), signalez-le à Lawrenza plutôt que d&apos;appeler.</p>
          </div>
          <div className="kit-faq-item">
            <b>Le prospect a payé mais je ne vois rien changer dans mon dashboard ?</b>
            <p>Le paiement Stripe est indépendant du dashboard : c&apos;est vous qui devez passer le statut à « Signé » et choisir la formule dès que vous avez la confirmation du client. Le dashboard ne se met pas à jour tout seul depuis Stripe.</p>
          </div>
          <div className="kit-faq-item">
            <b>Combien de temps un prospect reste dans ma liste s&apos;il ne répond jamais ?</b>
            <p>Il reste assigné à vous tant que vous ne le passez pas en « Non ». Rien ne vous empêche de le retenter à un autre moment.</p>
          </div>
          <div className="kit-faq-item">
            <b>Je peux utiliser mes propres arguments, pas exactement le script ?</b>
            <p>Oui, les scripts sont des points de départ, pas des textes à réciter mot pour mot. Adaptez le ton à votre style, tant que vous respectez la règle n°1 : jamais de donnée inventée.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="wrap cl-section" style={{ paddingBottom: 60 }}>
        <h2 className="disp">11. Contact & confidentialité</h2>
        <div className="cl-card red">
          <b style={{ display: "block", marginBottom: 6 }}>Confidentialité</b>
          <p>
            La liste de prospects, les scripts et les documents fournis sont confidentiels : ils ne sont pas
            transmis à des tiers ni réutilisés pour un autre projet, pendant votre collaboration avec
            LeBonProspect et après.
          </p>
        </div>
        <div className="cl-card" style={{ marginTop: 12 }}>
          <b style={{ display: "block", marginBottom: 6 }}>Une question, un blocage ?</b>
          <p>
            Contactez Lawrenza directement pour tout ce qui concerne un deal, une négociation enterprise, ou un
            signalement urgent. Pour un souci technique sur le dashboard (bug, prospect en double, page qui ne
            se génère pas), écrivez à contact@lebonprospect.fr.
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect</span>
          <span>contact@lebonprospect.fr</span>
        </div>
      </footer>
    </main>
  );
}
