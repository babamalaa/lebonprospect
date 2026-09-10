"use client";

import { useState } from "react";

const PASSWORD = "lbp2026closers";

const fmt = (n) => n.toLocaleString("fr-FR");

export default function ClosersPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [err, setErr] = useState(false);

  const tryUnlock = (e) => {
    e.preventDefault();
    if (input.trim() === PASSWORD) {
      setUnlocked(true);
      setErr(false);
    } else {
      setErr(true);
    }
  };

  if (!unlocked) {
    return (
      <main className="gate-wrap">
        <div className="gate-box">
          <div className="logo" style={{ justifyContent: "center", marginBottom: 18 }}>
            <span className="mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </div>
          <h1>Espace équipe commerciale</h1>
          <p>Document confidentiel. Entrez le mot de passe qui vous a été communiqué.</p>
          <form onSubmit={tryUnlock}>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
            />
            <button type="submit" className="btn">Accéder</button>
          </form>
          {err && <p className="gate-err">Mot de passe incorrect.</p>}
        </div>
      </main>
    );
  }

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
          LeBonProspect. À lire avant votre premier appel.
        </p>
      </section>

      <section className="wrap cl-section">
        <h2 className="disp">Le produit en 30 secondes</h2>
        <div className="cl-card">
          <p>
            Chaque jour, des commerces changent de propriétaire en France, c&apos;est publié obligatoirement au
            Journal officiel. LeBonProspect détecte ces reprises et livre chaque matin à 8h, par email, le
            contact du repreneur (nom, adresse, téléphone quand disponible) aux fournisseurs qui veulent
            l&apos;approcher avant leurs concurrents.
          </p>
        </div>
      </section>

      <section className="wrap cl-section">
        <h2 className="disp">Les formules vendues</h2>
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
      </section>

      <section className="wrap cl-section">
        <h2 className="disp">La rémunération</h2>
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

      <section className="wrap cl-section">
        <h2 className="disp">Ce que ça peut rapporter</h2>

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
            Signer 10 deals/mois demande environ 100 à 200 appels qualifiés (conversion réaliste en B2B froid :
            5 à 10%), soit environ 10 à 15h/semaine. À ce rythme, comptez 700 à 900 €/mois : un très bon side,
            pas un plein temps. Le vrai levier de revenu, ce sont les comptes enterprise (chaînes, groupes,
            équipes commerciales) : un seul deal enterprise engagé vaut plus que 15 deals départementaux. Dès
            que le pitch est rodé sur les petits comptes, priorisez le temps sur les gros prospects.
          </p>
        </div>
      </section>

      <section className="wrap cl-section">
        <h2 className="disp">Déclencheur, statut et versement</h2>
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
            percevoir une commission.
          </li>
          <li>Le reporting d&apos;un deal signé se fait le jour même auprès de Baptiste.</li>
        </ul>
      </section>

      <section className="wrap cl-section">
        <h2 className="disp">Ce qu&apos;on dit, ce qu&apos;on ne dit jamais</h2>
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
              <li>Signer sans formulaire secteur + zone rempli</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="wrap cl-section">
        <h2 className="disp">Le processus</h2>
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
            <p>Vous signalez le deal à Baptiste le jour même, pour activation de l&apos;abonnement.</p>
          </div>
          <div className="cl-step">
            <div className="n">5</div>
            <p>La commission est calculée sur l&apos;encaissement réel et versée sur présentation de facture.</p>
          </div>
        </div>
      </section>

      <section className="wrap cl-section" style={{ paddingBottom: 60 }}>
        <div className="cl-card red">
          <b style={{ display: "block", marginBottom: 6 }}>Confidentialité</b>
          <p>
            La liste de prospects, les scripts et les documents fournis sont confidentiels : ils ne sont pas
            transmis à des tiers ni réutilisés pour un autre projet, pendant votre collaboration avec
            LeBonProspect et après.
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
