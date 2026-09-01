import { ImageResponse } from "next/og";

export const runtime = "edge";

const previews: Record<string, { eyebrow: string; title: string; description: string; accent: string }> = {
  store: { eyebrow: "Official PCC online store", title: "Chess gear. Clubwear. PCC services.", description: "Shop securely online with Yoco. Equipment, apparel and player-profile services in one place.", accent: "#dc2626" },
  membership: { eyebrow: "Join Polokwane Chess Club", title: "PCC Membership", description: "Choose a membership period and pay securely online.", accent: "#059669" },
  tournaments: { eyebrow: "Events and registration", title: "PCC Tournaments", description: "Find chess events, tournament information and online registration.", accent: "#dc2626" },
  players: { eyebrow: "Player centre", title: "PCC Player Profiles", description: "Find player profiles, ratings and verified tournament records.", accent: "#2563eb" },
  rankings: { eyebrow: "Competitive chess", title: "Player Rankings", description: "Access PCC and partner player-ranking information.", accent: "#2563eb" },
  news: { eyebrow: "Club updates", title: "PCC News", description: "Tournament reports, announcements and chess stories from PCC.", accent: "#dc2626" },
  register: { eyebrow: "Online tournament entry", title: "Register to Play", description: "Enter a PCC-supported tournament through the online registration platform.", accent: "#059669" },
  organisers: { eyebrow: "Tournament operations", title: "Organiser Portal", description: "Secure, tournament-specific access for authorised organisers.", accent: "#f59e0b" },
  platform: { eyebrow: "Registration beyond the city", title: "PCC Registration Platform", description: "Friendly tournament registration for individuals, schools, organisations and federations.", accent: "#7c3aed" },
  about: { eyebrow: "Our club", title: "About PCC", description: "The home of chess in the heart of Polokwane, serving chess within and beyond the city.", accent: "#dc2626" },
  contact: { eyebrow: "Speak to the club", title: "Contact PCC", description: "Membership, tournament, organiser and general support from Polokwane Chess Club.", accent: "#059669" },
  hall: { eyebrow: "Legacy and service", title: "PCC Hall of Fame", description: "Honouring the people who shaped chess in Polokwane and Limpopo.", accent: "#d97706" },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const preview = previews[url.searchParams.get("page") ?? "store"] ?? previews.store;
  return new ImageResponse(
    <div style={{ width: "1200px", height: "630px", display: "flex", background: "#05070f", color: "white", fontFamily: "Arial, Helvetica, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", background: `linear-gradient(115deg, #05070f 0%, #111827 64%, ${preview.accent} 180%)` }} />
      <div style={{ position: "absolute", left: "72px", top: "66px", width: "14px", height: "498px", display: "flex", background: preview.accent, borderRadius: "20px" }} />
      <div style={{ position: "absolute", right: "70px", top: "65px", width: "190px", height: "190px", display: "flex", alignItems: "center", justifyContent: "center", background: "white", borderRadius: "34px", boxShadow: "0 30px 80px rgba(0,0,0,.45)" }}>
        {/* ImageResponse requires a plain image element. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${url.origin}/logo.png`} width={150} height={150} alt="" style={{ objectFit: "contain" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: "125px", width: "820px", height: "630px" }}>
        <div style={{ display: "flex", color: "#fca5a5", fontSize: "25px", fontWeight: 800, letterSpacing: "6px", textTransform: "uppercase" }}>{preview.eyebrow}</div>
        <div style={{ display: "flex", marginTop: "24px", maxWidth: "850px", fontSize: "69px", lineHeight: 0.98, fontWeight: 900, letterSpacing: "-2px" }}>{preview.title}</div>
        <div style={{ display: "flex", marginTop: "30px", maxWidth: "820px", color: "#d1d5db", fontSize: "28px", lineHeight: 1.35 }}>{preview.description}</div>
        <div style={{ display: "flex", marginTop: "38px", color: "#9ca3af", fontSize: "21px", fontWeight: 700 }}>polokwanechessclub.co.za</div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
