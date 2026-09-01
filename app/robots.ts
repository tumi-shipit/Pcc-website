import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/members/", "/organiser/"] }, sitemap: "https://polokwanechessclub.co.za/sitemap.xml", host: "https://polokwanechessclub.co.za" };
}
