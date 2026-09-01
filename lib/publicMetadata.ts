import type { Metadata } from "next";

type PageMetadata = { title: string; description: string; path: string; preview: string };

export function publicPageMetadata({ title, description, path, preview }: PageMetadata): Metadata {
  const image = `/share-image?page=${encodeURIComponent(preview)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "Polokwane Chess Club", images: [{ url: image, width: 1200, height: 630, alt: title }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
