import type { Metadata } from "next";

type PageMetadata = { title: string; description: string; path: string; preview: string };

export function publicPageMetadata({ title, description, path, preview }: PageMetadata): Metadata {
  const storePoster = preview === "store";
  const image = storePoster ? "/images/store/pcc-store-share-poster.png" : `/share-image?page=${encodeURIComponent(preview)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "Polokwane Chess Club", images: [{ url: image, width: storePoster ? 1728 : 1200, height: storePoster ? 907 : 630, alt: title }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
