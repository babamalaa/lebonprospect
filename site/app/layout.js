import "./globals.css";
import "./home.css";
import { Analytics } from "@vercel/analytics/next";
import { Archivo, Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";

// Polices de la home refondue (nov. 2026), servies par Next (pas de requête vers Google au chargement).
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-inter", display: "swap" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-tight", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--f-mono", display: "swap" });
// Police des pages internes (pages légales, régions, CRM), servie par Next au lieu de Google Fonts (plus de CSS bloquant)
const archivo = Archivo({ subsets: ["latin"], variable: "--f-archivo", display: "swap" });

export const metadata = {
  metadataBase: new URL("https://www.lebonprospect.fr"),
  title: {
    default: "LeBonProspect · Ils viennent de racheter un commerce. Ils ont besoin de vous.",
    template: "%s · LeBonProspect",
  },
  description:
    "Chaque matin, recevez la liste officielle des commerces qui viennent de changer de propriétaire dans votre zone : nom du repreneur, adresse et téléphone. Données du Journal officiel, vérifiables, jamais inventées.",
  openGraph: {
    title: "LeBonProspect · Vos futurs clients, publiés chaque matin au Journal officiel",
    description:
      "Près de 3 800 fonds de commerce changent de mains chaque mois en France. Recevez ceux de votre métier et de votre zone, le jour de la publication, chaque matin avant 8h, avec le nom du repreneur et son numéro quand il est vérifié.",
    url: "https://www.lebonprospect.fr",
    siteName: "LeBonProspect",
    locale: "fr_FR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${inter.variable} ${tight.variable} ${mono.variable} ${archivo.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
