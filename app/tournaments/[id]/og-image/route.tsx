import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

type TournamentShareData = {
  tournament_name: string;
  start_date: string | null;
  venue: string | null;
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const tournamentId = tournamentIdFromUrl(request);
  const supabase = getSupabaseClient();

  let tournament: TournamentShareData | null = null;

  if (supabase && tournamentId) {
    const { data } = await supabase
      .from("tournaments")
      .select("tournament_name, start_date, venue, poster_image_url")
      .eq("id", tournamentId)
      .maybeSingle();

    tournament = data as TournamentShareData | null;
  }

  const posterUrl = absoluteImageUrl(origin, tournament?.poster_image_url ?? null);
  const title = tournament?.tournament_name ?? "PCC Tournament";

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
              "radial-gradient(circle at center, rgba(0,0,0,0.08), rgba(0,0,0,0.68)), linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.72))",
          }}
        />
        <div
          style={{
            width: "1160px",
            height: "590px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <img
            src={posterUrl}
            alt={`${title} poster`}
            width="420"
            height="590"
            style={{
              maxWidth: "1120px",
              maxHeight: "590px",
              width: "auto",
              height: "590px",
              objectFit: "contain",
              boxShadow: "0 30px 90px rgba(0,0,0,0.62)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
