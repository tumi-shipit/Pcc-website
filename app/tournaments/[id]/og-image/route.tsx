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
          width: "1080px",
          height: "1350px",
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
          width="1080"
          height="1350"
          style={{
            position: "absolute",
            inset: 0,
            width: "1080px",
            height: "1350px",
            objectFit: "cover",
            opacity: 0.32,
            filter: "blur(28px)",
            transform: "scale(1.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.48), rgba(0,0,0,0.14) 42%, rgba(0,0,0,0.48))",
          }}
        />
        <div
          style={{
            width: "1030px",
            height: "1300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <img
            src={posterUrl}
            alt={`${title} poster`}
            width="1030"
            height="1300"
            style={{
              width: "1030px",
              height: "1300px",
              objectFit: "contain",
              boxShadow: "0 34px 110px rgba(0,0,0,0.58)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    }
  );
}
