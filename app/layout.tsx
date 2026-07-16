import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polokwane Chess Club",
  description:
    "Official website of Polokwane Chess Club. Established in 1958, promoting chess development across Limpopo.",

  metadataBase: new URL("https://polokwanechessclub.co.za"),

  openGraph: {
    title: "Polokwane Chess Club",
    description:
      "Official website of Polokwane Chess Club. Established in 1958.",
    url: "https://polokwanechessclub.co.za",
    siteName: "Polokwane Chess Club",
    images: [
      {
        url: "/images/organisations/polokwane-chess-club.png",
        width: 500,
        height: 500,
        alt: "Polokwane Chess Club logo",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Polokwane Chess Club",
    description:
      "Official website of Polokwane Chess Club. Established in 1958.",
    images: ["/images/organisations/polokwane-chess-club.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
