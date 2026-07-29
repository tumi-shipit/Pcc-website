import { createClient } from "@supabase/supabase-js";

type TournamentPosterRow = {
  poster_image_url: string | null;
};

export const runtime = "nodejs";

const fallbackImage = "/images/organisations/polokwane-chess-club.png";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey);
}

function tournamentIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const tournamentIndex = parts.indexOf("tournaments");

  return tournamentIndex >= 0 ? parts[tournamentIndex + 1] ?? null : null;
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

async function fetchImage(imageUrl: string) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "PolokwaneChessClubPreview/1.0",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
      return null;
    }

    return {
      body: await response.arrayBuffer(),
      contentType: contentType.split(";")[0] || "image/jpeg",
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const tournamentId = tournamentIdFromUrl(request);
  const supabase = getSupabaseClient();

  let posterImageUrl: string | null = null;

  if (supabase && tournamentId) {
    const { data } = await supabase
      .from("tournaments")
      .select("poster_image_url")
      .eq("id", tournamentId)
      .maybeSingle();

    posterImageUrl = (data as TournamentPosterRow | null)?.poster_image_url ?? null;
  }

  const posterUrl = absoluteImageUrl(origin, posterImageUrl);
  const fallbackUrl = absoluteImageUrl(origin, fallbackImage);
  const image = (await fetchImage(posterUrl)) ?? (await fetchImage(fallbackUrl));

  if (!image) {
    return new Response("Tournament poster could not be loaded.", {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  return new Response(image.body, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Robots-Tag": "index, follow",
    },
  });
}
