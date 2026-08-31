import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polokwane Chess Club",
  description:
    "Polokwane Chess Club is the home of chess in the heart of Polokwane, offering tournament information and online registration for events in and beyond the city.",

  metadataBase: new URL("https://polokwanechessclub.co.za"),

  openGraph: {
    title: "Polokwane Chess Club",
    description:
      "The home of chess in the heart of Polokwane, with online tournament registration for events in and beyond the city.",
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
      "The home of chess in the heart of Polokwane, with online tournament registration for events in and beyond the city.",
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
