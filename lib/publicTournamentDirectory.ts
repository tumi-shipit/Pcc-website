import { connection } from "next/server";

export type TournamentDirectoryEntry = {
  id: string;
  tournament_name: string;
  organiser_name: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status:
    | "Draft"
    | "Open"
    | "Closed"
    | "Postponed"
    | "Live"
    | "Completed"
    | null;
  entry_fee: number;
  poster_image_url: string | null;
};

export type TournamentDirectoryFee = {
  tournament_id: string;
  entry_fee_override: number | null;
};

const tournamentColumns =
  "id,tournament_name,organiser_name,description,start_date,end_date,venue,province,registration_status,entry_fee,poster_image_url";

export async function fetchPublicTournaments() {
  await connection();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase public environment variables.");
    return {
      tournaments: [] as TournamentDirectoryEntry[],
      sectionFees: [] as TournamentDirectoryFee[],
      error: true,
    };
  }

  const baseUrl = `${supabaseUrl}/rest/v1/tournaments?select=${encodeURIComponent(tournamentColumns)}`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  async function request(url: string) {
    return fetch(url, { headers, next: { revalidate: 60 } });
  }

  try {
    const primaryResponse = await request(
      `${baseUrl}&registration_status=neq.Draft&order=start_date.asc`
    );
    const response = primaryResponse.ok
      ? primaryResponse
      : await request(`${baseUrl}&order=start_date.asc`);

    if (!response.ok) {
      console.error("Tournament loading error:", {
        status: response.status,
        body: await response.text(),
      });
      return {
        tournaments: [] as TournamentDirectoryEntry[],
        sectionFees: [] as TournamentDirectoryFee[],
        error: true,
      };
    }

    const tournaments = (
      (await response.json()) as TournamentDirectoryEntry[]
    ).filter((tournament) => tournament.registration_status !== "Draft");
    const tournamentIds = tournaments.map((tournament) => tournament.id);
    let sectionFees: TournamentDirectoryFee[] = [];

    if (tournamentIds.length > 0) {
      const sectionFeeUrl = `${supabaseUrl}/rest/v1/tournament_sections?select=${encodeURIComponent(
        "tournament_id,entry_fee_override"
      )}&tournament_id=in.(${tournamentIds.join(",")})`;
      const sectionFeeResponse = await request(sectionFeeUrl);
      if (sectionFeeResponse.ok) {
        sectionFees = (await sectionFeeResponse.json()) as TournamentDirectoryFee[];
      }
    }

    return { tournaments, sectionFees, error: false };
  } catch (error) {
    console.error("Tournament loading error:", error);
    return {
      tournaments: [] as TournamentDirectoryEntry[],
      sectionFees: [] as TournamentDirectoryFee[],
      error: true,
    };
  }
}
