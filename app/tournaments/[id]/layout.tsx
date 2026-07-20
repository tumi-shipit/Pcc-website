import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type TournamentShareData = {
  id: string;
  tournament_name: string;
  description: string | null;
  start_date: string | null;
  venue: string | null;
  registration_status: string | null;
  poster_image_url: string | null;
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

const siteUrl = "https://polokwanechessclub.co.za";
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey);
}

function formatShareDate(value: string | null) {
  if (!value) return "Date TBA";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function cleanDescription(value: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function buildDescription(tournament: TournamentShareData) {
  const details = [
    formatShareDate(tournament.start_date),
    tournament.venue,
    tournament.registration_status
      ? `Status: ${tournament.registration_status}`
      : null,
  ]
    .filter(Boolean)
    .join(" - ");
  const body = cleanDescription(tournament.description);

  return body ? `${details}. ${body}`.slice(0, 180) : details;
}

function buildOgImageUrl(tournamentId: string, posterUrl: string | null) {
  const posterKey =
    posterUrl
      ?.split("/")
      .pop()
      ?.replace(/[^a-zA-Z0-9.-]/g, "")
      .slice(0, 80) || "poster";

  return `${siteUrl}/tournaments/${tournamentId}/og-image?v=${encodeURIComponent(
    posterKey
  )}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = getSupabaseClient();
  const tournamentUrl = `/tournaments/${id}`;

  if (!supabase) {
    return {
      title: "PCC Tournament",
      description: "View tournament details from Polokwane Chess Club.",
      alternates: { canonical: tournamentUrl },
    };
  }

  const { data } = await supabase
    .from("tournaments")
    .select(
      "id, tournament_name, description, start_date, venue, registration_status, poster_image_url"
    )
    .eq("id", id)
    .maybeSingle();

  const tournament = data as TournamentShareData | null;

  if (!tournament) {
    return {
      title: "PCC Tournament",
      description: "View tournament details from Polokwane Chess Club.",
      alternates: { canonical: tournamentUrl },
    };
  }

  const title = tournament.tournament_name;
  const description = buildDescription(tournament);
  const absoluteUrl = `${siteUrl}${tournamentUrl}`;
  const image = buildOgImageUrl(id, tournament.poster_image_url);

  return {
    title,
    description,
    alternates: {
      canonical: tournamentUrl,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl,
      siteName: "Polokwane Chess Club",
      type: "website",
      images: [
        {
          url: image,
          width: 1080,
          height: 1350,
          alt: `${title} tournament poster`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function TournamentLayout({ children }: Props) {
  return children;
}
