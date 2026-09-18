import { notFound } from "next/navigation";
import ReprisesPage from "../../components/ReprisesPage";
import { VERTICALES, VERTICALE_BY_SLUG, slugify, getReprisesStats, getIndexableCombos, fmt } from "../../lib/reprisesData";

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(VERTICALES).map((v) => ({ verticale: v.slug }));
}

export async function generateMetadata({ params }) {
  const key = VERTICALE_BY_SLUG[params.verticale];
  if (!key) return {};
  const v = VERTICALES[key];
  const s = await getReprisesStats(key);
  return {
    title: `${v.h1} en France : ${fmt(s.n365)} cessions sur 12 mois`,
    description: `${fmt(s.n365)} ${v.nom} ont changé de propriétaire en France sur les 12 derniers mois (source BODACC). Recevez chaque matin le nom, l'adresse et le téléphone des repreneurs de votre zone.`,
    alternates: { canonical: `https://www.lebonprospect.fr/reprises/${v.slug}` },
  };
}

export default async function VerticalePage({ params }) {
  const key = VERTICALE_BY_SLUG[params.verticale];
  if (!key) notFound();
  const v = VERTICALES[key];
  const [stats, combos] = await Promise.all([getReprisesStats(key), getIndexableCombos()]);
  const autres = combos.filter((c) => c.verticale === key).map((c) => ({ href: `/reprises/${v.slug}/${slugify(c.region)}`, label: c.region, n: c.n }));
  return <ReprisesPage verticaleKey={key} v={v} region={null} stats={stats} autres={autres} />;
}
