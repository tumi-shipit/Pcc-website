import type { Metadata } from "next";
import { publicSupabase } from "@/lib/publicSupabase";
import { publicPageMetadata } from "@/lib/publicMetadata";

export async function generateMetadata({ params }: LayoutProps<"/players/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { data } = await publicSupabase.from("players").select("full_name,title,club,province,rating,profile_photo_url").eq("id",id).maybeSingle();
  if (!data) return publicPageMetadata({ title: "PCC Player Profile", description: "Player profile and tournament records from Polokwane Chess Club.", path: `/players/${id}`, preview: "players" });
  const detail=[data.title,data.club,data.province,data.rating?`Rating ${data.rating}`:null].filter(Boolean).join(" · ");
  const description=detail||`View ${data.full_name}'s player profile and tournament records.`;
  const base=publicPageMetadata({title:`${data.full_name} | PCC Player Profile`,description,path:`/players/${id}`,preview:"players"});
  return data.profile_photo_url?{...base,openGraph:{...base.openGraph,images:[{url:data.profile_photo_url,alt:data.full_name}]},twitter:{...base.twitter,images:[data.profile_photo_url]}}:base;
}

export default function PlayerProfileLayout({ children }: LayoutProps<"/players/[id]">) { return children; }
