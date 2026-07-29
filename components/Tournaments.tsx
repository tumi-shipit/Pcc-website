import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  formatCalendarDate,
  getCalendarDateKey,
  getSouthAfricaDateKey,
  parseCalendarDate,
} from "@/lib/dateHelpers";

type Tournament = {
  id: string;
  tournament_name: string;
  organiser_name: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: "Draft" | "Open" | "Closed" | "Live" | "Completed" | null;
  entry_fee: number;
  poster_image_url: string | null;
};

const TOURNAMENT_COLUMNS =
  "id,tournament_name,organiser_name,description,start_date,end_date,venue,province,registration_status,entry_fee,poster_image_url";

async function fetchPublicTournaments() {
  await connection();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase public environment variables.");
    return { tournaments: [] as Tournament[], error: true };
  }

  const baseUrl = `${supabaseUrl}/rest/v1/tournaments?select=${encodeURIComponent(
    TOURNAMENT_COLUMNS
  )}`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  async function request(url: string) {
    return fetch(url, {
      headers,
      next: { revalidate: 60 },
    });
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
      return { tournaments: [] as Tournament[], error: true };
    }

    const tournaments = ((await response.json()) as Tournament[]).filter(
      (tournament) => tournament.registration_status !== "Draft"
    );

    return { tournaments, error: false };
  } catch (error) {
    console.error("Tournament loading error:", error);
    return { tournaments: [] as Tournament[], error: true };
  }
}

function formatDate(date: string) {
  return formatCalendarDate(date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  if (amount === 0) return "Free";

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function isFutureDatedTournament(tournament: Tournament) {
  const today = getSouthAfricaDateKey();
  const tournamentDate = getCalendarDateKey(tournament.start_date);

  return Boolean(today && tournamentDate && tournamentDate >= today);
}

function isActiveTournament(tournament: Tournament) {
  return tournament.registration_status !== "Completed";
}

function getStatusLabel(status: Tournament["registration_status"]) {
  if (status === "Open") return "Open";
  if (status === "Live") return "Live";
  if (status === "Completed") return "Completed";
  if (status === "Closed") return "Not Open";
  return "Coming Soon";
}

function getStatusClass(status: Tournament["registration_status"]) {
  if (status === "Open") return "bg-green-600";
  if (status === "Live") return "bg-red-600";
  if (status === "Completed") return "bg-blue-600";
  return "bg-zinc-700";
}

function TournamentCard({
  tournament,
  archive = false,
}: {
  tournament: Tournament;
  archive?: boolean;
}) {
  const isOpen = tournament.registration_status === "Open";

  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-red-500/60">
      <Link
        href={`/tournaments/${tournament.id}`}
        className="relative block aspect-[3/4] overflow-hidden bg-black"
      >
        {tournament.poster_image_url ? (
          <Image
            src={tournament.poster_image_url}
            alt={`${tournament.tournament_name} poster`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
            Poster coming soon
          </div>
        )}

        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${getStatusClass(
            tournament.registration_status
          )}`}
        >
          {archive ? "Completed" : getStatusLabel(tournament.registration_status)}
        </span>
      </Link>

      <div className="p-3 md:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 md:text-xs">
          {formatDate(tournament.start_date)}
        </p>

        <Link href={`/tournaments/${tournament.id}`}>
          <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 transition hover:text-red-400 md:text-base">
            {tournament.tournament_name}
          </h3>
        </Link>

        {tournament.organiser_name && (
          <p className="mt-2 line-clamp-1 text-xs font-semibold text-red-300">
            Hosted by {tournament.organiser_name}
          </p>
        )}

        <p className="mt-2 line-clamp-1 text-xs text-gray-400">
          Venue: {tournament.venue}
        </p>

        <p className="mt-1 text-xs font-semibold text-gray-300">
          {archive ? "Results and gallery" : `Entry fee: ${formatMoney(tournament.entry_fee)}`}
        </p>

        <div className="mt-4 grid gap-2">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="block rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition hover:border-red-500"
          >
            {archive ? "View Completed Event" : "View Tournament"}
          </Link>

          {!archive &&
            (isOpen ? (
              <Link
                href={`/register?tournament=${tournament.id}`}
                className="block rounded-lg bg-red-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Register Now
              </Link>
            ) : (
              <span className="block rounded-lg bg-zinc-800 px-3 py-2 text-center text-xs text-gray-400">
                Not Open
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}

export default async function Tournaments({
  fullPage = false,
}: {
  fullPage?: boolean;
}) {
  const { tournaments, error } = await fetchPublicTournaments();

  const upcomingTournaments = tournaments
    .filter(isActiveTournament)
    .sort((left, right) => {
      const leftFuture = isFutureDatedTournament(left);
      const rightFuture = isFutureDatedTournament(right);

      if (leftFuture !== rightFuture) return leftFuture ? -1 : 1;

      return (
        (parseCalendarDate(left.start_date)?.getTime() ?? 0) -
        (parseCalendarDate(right.start_date)?.getTime() ?? 0)
      );
    });

  const pastTournaments = tournaments
    .filter((tournament) => tournament.registration_status === "Completed")
    .sort(
      (left, right) =>
        (parseCalendarDate(right.start_date)?.getTime() ?? 0) -
        (parseCalendarDate(left.start_date)?.getTime() ?? 0)
    );

  const visibleUpcomingTournaments = fullPage
    ? upcomingTournaments
    : upcomingTournaments.slice(0, 4);
  const visiblePastTournaments = fullPage
    ? pastTournaments
    : pastTournaments.slice(0, 4);

  return (
    <section id="tournaments" className="bg-zinc-950 py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-4 md:mb-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
            Tournament Centre
          </p>

          <h2 className="text-3xl font-bold md:text-5xl">
            Play, follow and revisit PCC events
          </h2>

          <p className="mt-4 text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
            Find upcoming events, open entries and completed events from one
            public hub. Players, families, coaches and organisers can check
            dates, venue, sections, fees, results and event material where
            available.
          </p>
          </div>

          <Link
            href={fullPage ? "#archive" : "/tournaments"}
            className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
          >
            {fullPage ? "Open completed tournaments" : "Open all tournaments"}
          </Link>
        </div>

        {error ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-gray-300">
            Tournament listings are refreshing. Please use the Register button
            above if you are entering an event now.
          </p>
        ) : (
          <>
            {upcomingTournaments.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleUpcomingTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-gray-400">
                No upcoming tournaments are currently listed.
              </p>
            )}

            {pastTournaments.length > 0 && (
              <div id="archive" className="mt-16 scroll-mt-28 border-t border-white/10 pt-12">
                <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
                      Completed Tournaments
                    </p>

                    <h2 className="text-3xl font-bold md:text-5xl">
                      Completed Tournaments
                    </h2>

                    <p className="mt-4 text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
                      Revisit completed events, tournament reports, photos and
                      results.
                    </p>
                  </div>

                  {!fullPage && (
                    <Link
                      href="/tournaments#archive"
                      className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                    >
                      Open completed tournaments
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {visiblePastTournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      archive
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
