import { notFound } from "next/navigation";
import ReprisesPage from "../../../components/ReprisesPage";
import { VERTICALES, VERTICALE_BY_SLUG, REGION_BY_SLUG, slugify, getReprisesStats, getIndexableCombos, fmt } from "../../../lib/reprisesData";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  const combos = await getIndexableCombos();
  return combos.map((c) => ({ verticale: VERTICALES[c.verticale].slug, region: slugify(c.region) }));
}

export async function generateMetadata({ params }) {
  const key = VERTICALE_BY_SLUG[params.verticale];
  const region = REGION_BY_SLUG[params.region];
  if (!key || !region) return {};
  const v = VERTICALES[key];
  const s = await getReprisesStats(key, region);
  return {
    title: `${v.h1} en ${region} : ${fmt(s.n365)} cessions sur 12 mois`,
    description: `${fmt(s.n365)} ${v.nom} ont changé de propriétaire en ${region} sur les 12 derniers mois, soit ${fmt(s.perMonth)} par mois (source BODACC). Nom, adresse et téléphone du repreneur, chaque matin à 8h.`,
    alternates: { canonical: `https://www.lebonprospect.fr/reprises/${v.slug}/${params.region}` },
  };
}

export default async function VerticaleRegionPage({ params }) {
  const key = VERTICALE_BY_SLUG[params.verticale];
  const region = REGION_BY_SLUG[params.region];
  if (!key || !region) notFound();
  const v = VERTICALES[key];
  const [stats, combos] = await Promise.all([getReprisesStats(key, region), getIndexableCombos()]);
  const autres = combos
    .filter((c) => c.region === region && c.verticale !== key)
    .map((c) => ({ href: `/reprises/${VERTICALES[c.verticale].slug}/${params.region}`, label: VERTICALES[c.verticale].h1, n: c.n }));
  return <ReprisesPage verticaleKey={key} v={v} region={region} stats={stats} autres={autres} />;
}
