import "./globals.css";
import "./home.css";
import { Analytics } from "@vercel/analytics/next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";

// Polices de la home refondue (nov. 2026), servies par Next (pas de requête vers Google au chargement).
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-inter", display: "swap" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-tight", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--f-mono", display: "swap" });

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
      "Près de 4 000 commerces changent de mains chaque mois en France. Recevez ceux de votre métier et de votre zone, chaque matin avant 8h, avec le nom du repreneur et son numéro quand il est vérifié.",
    url: "https://www.lebonprospect.fr",
    siteName: "LeBonProspect",
    locale: "fr_FR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${inter.variable} ${tight.variable} ${mono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
