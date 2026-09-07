import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://lebonprospect.fr"),
  title: {
    default: "LeBonProspect · Ils viennent de racheter un commerce. Ils ont besoin de vous.",
    template: "%s · LeBonProspect",
  },
  description:
    "Chaque matin, recevez la liste officielle des commerces qui viennent de changer de propriétaire dans votre zone : nom du repreneur, adresse et téléphone. Données du Journal officiel, vérifiables, jamais inventées.",
  openGraph: {
    title: "LeBonProspect · Vos futurs clients, publiés chaque matin au Journal officiel",
    description:
      "3 950 commerces changent de mains chaque mois en France. Recevez ceux de votre métier et de votre zone, chaque matin à 8h, avec le nom du repreneur et le numéro où l'appeler.",
    url: "https://lebonprospect.fr",
    siteName: "LeBonProspect",
    locale: "fr_FR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
