import type { MetadataRoute } from "next";

const base = "https://polokwanechessclub.co.za";
const routes = ["", "/about", "/contact", "/tournaments", "/players", "/news", "/store", "/store/policies", "/membership", "/register", "/public-statistics", "/officials", "/calendar", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path, index) => ({ url: `${base}${path}`, changeFrequency: path === "/news" || path === "/tournaments" || path === "/store" ? "weekly" : "monthly", priority: index === 0 ? 1 : path === "/tournaments" || path === "/store" ? 0.9 : 0.7 }));
}
