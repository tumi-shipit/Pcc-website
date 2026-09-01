import type { Metadata } from "next";
import { publicSupabase } from "@/lib/publicSupabase";
import { publicPageMetadata } from "@/lib/publicMetadata";

export async function generateMetadata({ params }: LayoutProps<"/news/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { data } = await publicSupabase.from("news_posts").select("title,excerpt,image_url,published").eq("id",id).eq("published",true).maybeSingle();
  if (!data) return publicPageMetadata({ title: "PCC News", description: "News and updates from Polokwane Chess Club.", path: `/news/${id}`, preview: "news" });
  const base=publicPageMetadata({title:`${data.title} | PCC News`,description:data.excerpt||"News and updates from Polokwane Chess Club.",path:`/news/${id}`,preview:"news"});
  return data.image_url?{...base,openGraph:{...base.openGraph,images:[{url:data.image_url,alt:data.title}]},twitter:{...base.twitter,images:[data.image_url]}}:base;
}

export default function NewsArticleLayout({ children }: LayoutProps<"/news/[id]">) { return children; }
