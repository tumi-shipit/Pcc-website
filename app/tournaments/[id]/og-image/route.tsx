import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

type TournamentShareData = {
  tournament_name: string;
  description: string | null;
  start_date: string | null;
  venue: string | null;
  registration_status: string | null;
  poster_image_url: string | null;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey);
}

function formatDate(value: string | null) {
  if (!value) return "Date TBA";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(status: string | null) {
  if (status === "Open") return "Registration Open";
  if (status === "Completed") return "Completed Tournament";
  if (status === "Live") return "Live Tournament";
  if (status === "Closed") return "Registration Closed";
  return "Tournament";
}

function fallbackTournament(): TournamentShareData {
  return {
    tournament_name: "Polokwane Chess Club Tournament",
    description: "Tournament details from Polokwane Chess Club.",
    start_date: null,
    venue: "Polokwane Chess Club",
    registration_status: "Tournament",
    poster_image_url: null,
  };
}

export async function GET(request: Request, { params }: Props) {
  const origin = new URL(request.url).origin;
  const { id } = await params;
  const supabase = getSupabaseClient();

  let tournament = fallbackTournament();

  if (supabase) {
    const { data } = await supabase
      .from("tournaments")
      .select(
        "tournament_name, description, start_date, venue, registration_status, poster_image_url"
      )
      .eq("id", id)
      .maybeSingle();

    if (data) {
      tournament = data as TournamentShareData;
    }
  }

  const posterUrl =
    tournament.poster_image_url && tournament.poster_image_url.trim()
      ? tournament.poster_image_url
      : `${origin}/images/organisations/polokwane-chess-club.png`;
  const detailLine = [formatDate(tournament.start_date), tournament.venue]
    .filter(Boolean)
    .join(" - ");
  const description =
    tournament.description?.replace(/\s+/g, " ").trim().slice(0, 150) ||
    "Official tournament information, entries and results.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background:
            "linear-gradient(135deg, #050505 0%, #18181b 48%, #7f1d1d 100%)",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "34px",
            border: "2px solid rgba(255,255,255,0.13)",
            borderRadius: "34px",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "52px",
            alignItems: "center",
            width: "100%",
            padding: "58px 70px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "330px",
              height: "480px",
              borderRadius: "26px",
              overflow: "hidden",
              background: "#09090b",
              border: "2px solid rgba(255,255,255,0.16)",
              boxShadow: "0 28px 80px rgba(0,0,0,0.48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={posterUrl}
              alt=""
              width="330"
              height="480"
              style={{ width: "330px", height: "480px", objectFit: "cover" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "660px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "14px",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={`${origin}/logo.png`}
                  width="42"
                  height="42"
                  alt=""
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div
                style={{
                  fontSize: "24px",
                  color: "#fca5a5",
                  fontWeight: 900,
                  letterSpacing: "5px",
                  textTransform: "uppercase",
                }}
              >
                Polokwane Chess Club
              </div>
            </div>

            <div
              style={{
                fontSize:
                  tournament.tournament_name.length > 48 ? "56px" : "68px",
                lineHeight: 0.96,
                fontWeight: 900,
                letterSpacing: "0",
              }}
            >
              {tournament.tournament_name}
            </div>

            <div
              style={{
                marginTop: "26px",
                fontSize: "28px",
                lineHeight: 1.25,
                color: "#e5e7eb",
                fontWeight: 700,
              }}
            >
              {detailLine}
            </div>

            <div
              style={{
                marginTop: "20px",
                fontSize: "24px",
                lineHeight: 1.35,
                color: "#d4d4d8",
              }}
            >
              {description}
            </div>

            <div
              style={{
                marginTop: "34px",
                display: "flex",
                gap: "14px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  borderRadius: "999px",
                  background: "#dc2626",
                  color: "white",
                  padding: "14px 22px",
                  fontSize: "22px",
                  fontWeight: 900,
                }}
              >
                {statusLabel(tournament.registration_status)}
              </div>
              <div
                style={{
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.12)",
                  color: "#f4f4f5",
                  padding: "14px 22px",
                  fontSize: "22px",
                  fontWeight: 800,
                }}
              >
                polokwanechessclub.co.za
              </div>
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
