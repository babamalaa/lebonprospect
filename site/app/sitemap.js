import { VERTICALES, slugify, getIndexableCombos } from "./lib/reprisesData";

export const revalidate = 86400;

export default async function sitemap() {
  const base = "https://www.lebonprospect.fr";
  const now = new Date();
  const urls = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/reprises`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];
  for (const v of Object.values(VERTICALES)) {
    urls.push({ url: `${base}/reprises/${v.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
  }
  const combos = await getIndexableCombos();
  for (const c of combos) {
    urls.push({ url: `${base}/reprises/${VERTICALES[c.verticale].slug}/${slugify(c.region)}`, lastModified: now, changeFrequency: "daily", priority: 0.7 });
  }
  return urls;
}
