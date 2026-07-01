import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        url: "/logo.png",
        width: 800,
        height: 800,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Polokwane Chess Club",
    description:
      "Official website of Polokwane Chess Club. Established in 1958.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}