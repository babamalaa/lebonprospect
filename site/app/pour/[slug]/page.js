import teasers from "../../../data/teasers.json";
import PhoneDemo from "../../components/PhoneDemo";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const dynamicParams = true; // autorise les slugs générés après le build (servis dynamiquement)

const REGION_MAP = { "Île-de-France": "Île-de-France", PACA: "Provence-Alpes-Côte d'Azur", "Auvergne-Rhône-Alpes": "Auvergne-Rhône-Alpes" };
const CAT_LABELS = {
  agenceur: "l'agencement CHR",
  materiel_cuisine: "l'équipement de cuisine professionnelle",
  caisse: "les solutions d'encaissement",
  enseigniste: "l'enseigne et la signalétique",
  mobilier: "le mobilier professionnel",
};

function maskTel(tel) {
  const parts = tel.split(" ");
  if (parts.length >= 5) return [...parts.slice(0, 3), "## ##"].join(" ");
  return tel.slice(0, -5) + " ## ##";
}

async function fetchRegionPayload(region) {
  const admin = supabaseAdmin();
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const { data: n90rows } = await admin
    .from("cessions")
    .select("id", { count: "exact", head: true })
    .eq("verticale", "chr")
    .eq("region", region)
    .gte("date_parution", since90);
  const n90 = n90rows?.length ?? 0;

  // Supabase JS ne renvoie pas facilement des counts multiples en une requête ; on fait 3 appels ciblés
  const countQuery = async (filters) => {
    let q = admin.from("cessions").select("*", { count: "exact", head: true }).eq("verticale", "chr").eq("region", region);
    for (const [k, v] of Object.entries(filters)) q = v.op === "gte" ? q.gte(k, v.val) : q.not(k, "is", null);
    const { count } = await q;
    return count || 0;
  };

  const c90 = await countQuery({ date_parution: { op: "gte", val: since90 } });
  const c30 = await countQuery({ date_parution: { op: "gte", val: since30 } });

  const { data: rows } = await admin
    .from("cessions")
    .select("*")
    .eq("verticale", "chr")
    .eq("region", region)
    .not("acheteur_nom", "is", null)
    .order("date_parution", { ascending: false })
    .limit(12);

  const rowsWithTel = (rows || []).sort((a, b) => (a.telephone ? 0 : 1) - (b.telephone ? 0 : 1));
  const n90Tel = rowsWithTel.filter((r) => r.telephone).length;

  const today = new Date();
  const leads = rowsWithTel.slice(0, 6).map((r) => {
    let badge = null;
    if (r.acheteur_date_creation) {
      const age = Math.floor((today - new Date(r.acheteur_date_creation)) / 86400000);
      badge = age <= 180 ? "budgets ouverts" : "en expansion";
    }
    let dirigeants = r.acheteur_dirigeants;
    if (typeof dirigeants === "string") {
      dirigeants = dirigeants.replace(/[{}]/g, "").split(",").map((d) => d.trim()).filter(Boolean);
    }
    dirigeants = (dirigeants || []).slice(0, 2).map((d) => d.replace(/\s*\([^)]*\)/g, "").trim());
    return {
      nom: r.place_name || r.acheteur_nom || r.commercant || "",
      ville: (r.ville || "").split(",")[0],
      dept: r.departement || "",
      date: r.date_parution || "",
      dirigeants,
      tel_masque: r.telephone ? maskTel(r.telephone) : null,
      badge,
    };
  });

  const { data: deptRows } = await admin
    .from("cessions")
    .select("departement")
    .eq("verticale", "chr")
    .eq("region", region)
    .gte("date_parution", since90);
  const deptCounts = {};
  (deptRows || []).forEach((r) => {
    if (r.departement) deptCounts[r.departement] = (deptCounts[r.departement] || 0) + 1;
  });
  const depts = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nom, n]) => ({ nom, n }));

  return {
    n90: c90,
    n30: c30,
    n90_tel: n90Tel,
    pct_tel: Math.round((100 * n90Tel) / Math.max(c90, 1)),
    leads,
    depts,
  };
}

async function fetchGeneratedCible(slug) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("generated_pages").select("*").eq("slug", slug).single();
  if (!data) return null;
  const region = REGION_MAP[data.region] || data.region;
  return {
    slug: data.slug,
    societe: data.societe,
    categorie: data.categorie,
    metier: CAT_LABELS[data.categorie] || "votre métier",
    region,
    ville: data.ville,
  };
}

export function generateStaticParams() {
  return teasers.cibles.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const staticCible = teasers.cibles.find((x) => x.slug === params.slug);
  const societe = staticCible?.societe || (await fetchGeneratedCible(params.slug))?.societe;
  return {
    title: societe ? `LeBonProspect × ${societe}` : "LeBonProspect",
    robots: { index: false, follow: false },
  };
}

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return `${d.getDate()} ${mois[d.getMonth()]}`;
};

export default async function TeaserPage({ params }) {
  let cible = teasers.cibles.find((x) => x.slug === params.slug);
  let reg = cible ? teasers.regions[cible.region] : null;

  if (!cible) {
    // slug généré dynamiquement après le build : on le sert à la volée
    cible = await fetchGeneratedCible(params.slug);
    if (!cible) {
      return (
        <main className="tz" style={{ padding: "80px 24px", textAlign: "center" }}>
          <p>Cette page n&apos;existe pas ou plus.</p>
        </main>
      );
    }
    reg = await fetchRegionPayload(cible.region);
  }

  const perLeadRegional = (299 / Math.max(reg.n30, 1)).toFixed(2).replace(".", ",");

  return (
    <main className="tz">
      {/* Bandeau personnalisé */}
      <div className="tz-band">
        <div className="wrap tz-band-in">
          <span className="tz-logo">
            <span className="mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </span>
          <span className="tz-for">préparé pour <b>{cible.societe}</b></span>
        </div>
      </div>

      {/* Hero personnalisé */}
      <section className="hero wrap tz-hero">
        <h1>
          {reg.n90} restaurants, bars et hôtels ont changé de propriétaire{" "}
          <span className="hl">en {cible.region}</span> en 90 jours.
        </h1>
        <p className="sub">
          Chacun de ces repreneurs investit en ce moment dans {cible.metier}. La question n&apos;est pas de savoir
          s&apos;ils vont acheter — c&apos;est de savoir qui les appellera en premier.
        </p>
        <div className="proof tz-proof">
          <div><div className="n">{reg.n90}</div><div className="l">reprises CHR en 90 jours dans votre région</div></div>
          <div><div className="n">{reg.n30}</div><div className="l">sur les 30 derniers jours</div></div>
          <div><div className="n">{reg.pct_tel} %</div><div className="l">livrées avec le téléphone de l&apos;établissement</div></div>
          <div><div className="n">8h00</div><div className="l">dans votre boîte mail, chaque matin</div></div>
        </div>
      </section>

      {/* Dernières reprises réelles de la région */}
      <section className="feed-sec wrap">
        <h2 className="disp">Les dernières, en vrai</h2>
        <p className="center-sub">
          Publiées au Journal officiel ces derniers jours en {cible.region}. Réelles et vérifiables.
        </p>
        <div className="feed">
          <div className="feed-head">
            <span className="live-dot" /> DERNIÈRES REPRISES · {cible.region.toUpperCase()}
          </div>
          {reg.leads.map((l) => (
            <div className="row" key={l.nom + l.ville}>
              <div className="what">
                <b>{l.nom}</b>
                {l.badge && <span className={`tz-badge${l.badge === "en expansion" ? " exp" : ""}`}>{l.badge}</span>}
                <div className="meta">
                  {l.ville} · {l.dept} · publié le {fmtDate(l.date)}
                  {l.dirigeants.length > 0 && <> · repreneur : {l.dirigeants.join(", ")}</>}
                </div>
                <div className="tz-tel">
                  {l.tel_masque ? (
                    <>☎ <span className="tz-tel-num">{l.tel_masque}</span> <span className="tz-pill">n° vérifié · complet pour les abonnés</span></>
                  ) : (
                    <>☎ <span className="tz-pill soft">numéro en recherche — livré dès trouvé</span></>
                  )}
                </div>
              </div>
              <span className="tag">CHR</span>
            </div>
          ))}
          <div className="feed-foot">
            + {Math.max(reg.n30 - reg.leads.length, 0)} autres reprises dans votre région sur les 30 derniers jours
          </div>
        </div>
      </section>

      {/* La démo iPhone réutilisée */}
      <PhoneDemo />

      {/* Vos secteurs */}
      <section className="wrap tz-depts">
        <h2 className="disp">Là où ça se passe, chez vous</h2>
        <p className="center-sub">Reprises CHR des 90 derniers jours, département par département.</p>
        <div className="tz-dept-grid">
          {reg.depts.map((d) => (
            <div className="tz-dept" key={d.nom}>
              <div className="n">{d.n}</div>
              <div className="l">{d.nom}</div>
            </div>
          ))}
        </div>
        <p className="tz-team">
          Une équipe commerciale ? Chaque commercial peut recevoir <b>son</b> secteur, chaque matin.
          Parlez-nous-en, l&apos;offre multi-comptes existe.
        </p>
      </section>

      {/* L'offre */}
      <section className="pricing wrap tz-offer">
        <h2 className="disp">Ce que ça coûte. Ce que ça rapporte.</h2>
        <div className="tz-maths">
          <div className="tz-math">
            <div className="big">{perLeadRegional} €</div>
            <div>le prospect nominatif avec téléphone, en abonnement Régional
              ({reg.n30} reprises le mois dernier pour 299 €)</div>
          </div>
          <div className="tz-math">
            <div className="big">1 client</div>
            <div>signé grâce à une seule reprise rembourse environ deux ans d&apos;abonnement</div>
          </div>
        </div>
        <div className="tz-cta">
          <a className="btn" href="https://buy.stripe.com/14A5kD4AVe4Q7SZe1X8N201">
            Activer ma région · 299 €/mois
          </a>
          <a className="btn inv" href="https://buy.stripe.com/8x26oH2sN1i4gpv0b78N200">
            Mon département seul · 149 €/mois
          </a>
        </div>
        <p className="engage">Sans engagement · résiliable en un clic · premier digest dès demain 8h00</p>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect</span>
          <span>Données issues d&apos;actes officiels publiés (BODACC, licence ouverte Etalab)</span>
        </div>
      </footer>
    </main>
  );
}
