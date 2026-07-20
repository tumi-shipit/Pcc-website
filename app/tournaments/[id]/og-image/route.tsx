import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

type TournamentShareData = {
  tournament_name: string;
  start_date: string | null;
  venue: string | null;
  registration_status: string | null;
  poster_image_url: string | null;
};

export const runtime = "edge";

const fallbackImage = "/images/organisations/polokwane-chess-club.png";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey);
}

function absoluteImageUrl(origin: string, value: string | null) {
  const image = value?.trim() || fallbackImage;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${origin}${image}`;
  }

  return `${origin}/${image}`;
}

function tournamentIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const tournamentIndex = parts.indexOf("tournaments");

  return tournamentIndex >= 0 ? parts[tournamentIndex + 1] : null;
}

function formatDate(value: string | null) {
  if (!value) return "Date TBA";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const tournamentId = tournamentIdFromUrl(request);
  const supabase = getSupabaseClient();

  let tournament: TournamentShareData | null = null;

  if (supabase && tournamentId) {
    const { data } = await supabase
      .from("tournaments")
      .select(
        "tournament_name, start_date, venue, registration_status, poster_image_url"
      )
      .eq("id", tournamentId)
      .maybeSingle();

    tournament = data as TournamentShareData | null;
  }

  const posterUrl = absoluteImageUrl(origin, tournament?.poster_image_url ?? null);
  const title = tournament?.tournament_name ?? "PCC Tournament";
  const date = formatDate(tournament?.start_date ?? null);
  const venue = tournament?.venue ?? "Venue TBA";
  const status = tournament?.registration_status ?? "Open";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img
          src={posterUrl}
          alt=""
          width="1200"
          height="630"
          style={{
            position: "absolute",
            inset: 0,
            width: "1200px",
            height: "630px",
            objectFit: "cover",
            opacity: 0.4,
            filter: "blur(24px)",
            transform: "scale(1.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.78), rgba(0,0,0,0.28) 42%, rgba(0,0,0,0.9))",
          }}
        />
        <div
          style={{
            width: "1160px",
            height: "590px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            gap: "44px",
          }}
        >
          <div
            style={{
              width: "420px",
              height: "590px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.96)",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 30px 90px rgba(0,0,0,0.62)",
            }}
          >
            <img
              src={posterUrl}
              alt={`${title} poster`}
              width="420"
              height="590"
              style={{
                width: "420px",
                height: "590px",
                objectFit: "contain",
              }}
            />
          </div>
          <div
            style={{
              width: "670px",
              height: "590px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "48px 46px",
              background: "rgba(0,0,0,0.72)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "26px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "#fca5a5",
                letterSpacing: "5px",
                textTransform: "uppercase",
                marginBottom: "28px",
              }}
            >
              Tournament
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "62px",
                lineHeight: 1,
                fontWeight: 900,
                color: "#ffffff",
                marginBottom: "34px",
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                fontSize: "28px",
                lineHeight: 1.22,
                color: "#e5e7eb",
              }}
            >
              <div style={{ display: "flex" }}>{date}</div>
              <div style={{ display: "flex" }}>{venue}</div>
              <div style={{ display: "flex" }}>Status: {status}</div>
            </div>
            <div
              style={{
                marginTop: "44px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 800,
              }}
            >
              <img
                src={`${origin}/logo.png`}
                width={58}
                height={58}
                alt="Polokwane Chess Club logo"
                style={{
                  width: "58px",
                  height: "58px",
                  objectFit: "contain",
                  background: "#ffffff",
                  borderRadius: "12px",
                }}
              />
              polokwanechessclub.co.za
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
