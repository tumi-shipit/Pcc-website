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

type TournamentSectionFee = {
  tournament_id: string;
  entry_fee_override: number | null;
};

type TournamentFilters = {
  search?: string;
  status?: string;
  province?: string;
};

const directoryStatuses = [
  { value: "", label: "All statuses" },
  { value: "Open", label: "Open for entries" },
  { value: "Live", label: "Live now" },
  { value: "Closed", label: "Closed" },
  { value: "Postponed", label: "Postponed" },
  { value: "Completed", label: "Completed" },
  { value: "Coming Soon", label: "Coming soon" },
];

const TOURNAMENT_COLUMNS =
  "id,tournament_name,organiser_name,description,start_date,end_date,venue,province,registration_status,entry_fee,poster_image_url";

async function fetchPublicTournaments() {
  await connection();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase public environment variables.");
    return {
      tournaments: [] as Tournament[],
      sectionFees: [] as TournamentSectionFee[],
      error: true,
    };
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
      return {
        tournaments: [] as Tournament[],
        sectionFees: [] as TournamentSectionFee[],
        error: true,
      };
    }

    const tournaments = ((await response.json()) as Tournament[]).filter(
      (tournament) => tournament.registration_status !== "Draft"
    );

    const tournamentIds = tournaments.map((tournament) => tournament.id);
    let sectionFees: TournamentSectionFee[] = [];

    if (tournamentIds.length > 0) {
      const sectionFeeUrl = `${supabaseUrl}/rest/v1/tournament_sections?select=${encodeURIComponent(
        "tournament_id,entry_fee_override"
      )}&tournament_id=in.(${tournamentIds.join(",")})`;
      const sectionFeeResponse = await request(sectionFeeUrl);

      if (sectionFeeResponse.ok) {
        sectionFees = (await sectionFeeResponse.json()) as TournamentSectionFee[];
      }
    }

    return { tournaments, sectionFees, error: false };
  } catch (error) {
    console.error("Tournament loading error:", error);
    return {
      tournaments: [] as Tournament[],
      sectionFees: [] as TournamentSectionFee[],
      error: true,
    };
  }
}

function formatTournamentDate(tournament: Tournament) {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  const start = formatCalendarDate(tournament.start_date, options);

  if (!tournament.end_date || tournament.end_date === tournament.start_date) {
    return start;
  }

  return start + " – " + formatCalendarDate(tournament.end_date, options);
}

function formatMoney(amount: number) {
  if (amount === 0) return "Free";

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function tournamentFeeText(
  tournament: Tournament,
  sectionFees: TournamentSectionFee[]
) {
  const matchingSections = sectionFees.filter(
    (section) => section.tournament_id === tournament.id
  );
  const amounts =
    matchingSections.length > 0
      ? matchingSections.map(
          (section) => section.entry_fee_override ?? tournament.entry_fee
        )
      : [tournament.entry_fee];
  const uniqueAmounts = Array.from(new Set(amounts));

  if (uniqueAmounts.length > 1) return "Fees vary by section";

  return formatMoney(uniqueAmounts[0] ?? tournament.entry_fee);
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
  if (status === "Postponed") return "Postponed";
  if (status === "Completed") return "Completed";
  if (status === "Closed") return "Not Open";
  return "Coming Soon";
}

function getStatusClass(status: Tournament["registration_status"]) {
  if (status === "Open") return "bg-green-600";
  if (status === "Live") return "bg-red-600";
  if (status === "Postponed") return "bg-orange-600";
  if (status === "Completed") return "bg-blue-600";
  return "bg-zinc-700";
}

function matchesDirectoryFilters(
  tournament: Tournament,
  filters: TournamentFilters
) {
  const search = filters.search?.trim().toLocaleLowerCase() ?? "";
  const province = filters.province?.trim().toLocaleLowerCase() ?? "";
  const status = filters.status?.trim() ?? "";
  const statusLabel = getStatusLabel(tournament.registration_status);

  const searchableText = [
    tournament.tournament_name,
    tournament.organiser_name,
    tournament.venue,
    tournament.province,
    tournament.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

  return (
    (!search || searchableText.includes(search)) &&
    (!province || tournament.province?.toLocaleLowerCase() === province) &&
    (!status || statusLabel === status)
  );
}

function PostponedPosterStamp() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25">
      <div className="-rotate-12 border-4 border-red-600 bg-white/90 px-8 py-3 text-2xl font-black uppercase text-red-700 shadow-2xl shadow-black/50 sm:text-3xl">
        Postponed
      </div>
    </div>
  );
}

function TournamentCard({
  tournament,
  sectionFees,
  archive = false,
}: {
  tournament: Tournament;
  sectionFees: TournamentSectionFee[];
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

        {tournament.registration_status === "Postponed" && <PostponedPosterStamp />}

        <span
          className={`absolute left-2 top-2 z-20 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${getStatusClass(
            tournament.registration_status
          )}`}
        >
          {archive ? "Completed" : getStatusLabel(tournament.registration_status)}
        </span>
      </Link>

      <div className="p-3 md:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 md:text-xs">
          {formatTournamentDate(tournament)}
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
          {tournament.venue}
          {tournament.province ? " · " + tournament.province : ""}
        </p>

        <p className="mt-1 text-xs font-semibold text-gray-300">
          {archive
            ? "Results and report"
            : `Fee: ${tournamentFeeText(tournament, sectionFees)}`}
        </p>

        <div className="mt-4 grid gap-2">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="block rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition hover:border-red-500"
          >
            {archive ? "Open Results" : "View Details"}
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
                {getStatusLabel(tournament.registration_status)}
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}

export default async function Tournaments({
  fullPage = false,
  filters = {},
}: {
  fullPage?: boolean;
  filters?: TournamentFilters;
}) {
  const { tournaments, sectionFees, error } = await fetchPublicTournaments();

  const filteredTournaments = fullPage
    ? tournaments.filter((tournament) => matchesDirectoryFilters(tournament, filters))
    : tournaments;
  const provinces = Array.from(
    new Set(
      tournaments
        .map((tournament) => tournament.province?.trim())
        .filter((province): province is string => Boolean(province))
    )
  ).sort((left, right) => left.localeCompare(right));

  const upcomingTournaments = filteredTournaments
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

  const pastTournaments = filteredTournaments
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
  const completedOnly = filters.status === "Completed";
  const activeStatusOnly = Boolean(filters.status && filters.status !== "Completed");

  return (
    <section id="tournaments" className="bg-zinc-950 py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-4 md:mb-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
            Tournaments
          </p>

          <h2 className="text-3xl font-bold md:text-5xl">
            Find your next tournament
          </h2>

          <p className="mt-4 text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
            Check the date, venue, sections and entry fee before you register.
            When an event is running or completed, this is also where standings,
            results and reports will be posted.
          </p>
          </div>

          <Link
            href={fullPage ? "#archive" : "/tournaments"}
            className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
          >
            {fullPage ? "Open completed tournaments" : "Open all tournaments"}
          </Link>
        </div>

        {fullPage && !error && (
          <form
            action="/tournaments"
            className="mb-8 grid gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end"
          >
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-400">
                Search events
              </span>
              <input
                type="search"
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Tournament, organiser, venue or province"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-400">
                Status
              </span>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              >
                {directoryStatuses.map((status) => (
                  <option key={status.value || "all"} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-400">
                Province
              </span>
              <select
                name="province"
                defaultValue={filters.province ?? ""}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              >
                <option value="">All provinces</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Apply
              </button>
              <Link
                href="/tournaments"
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-white"
              >
                Reset
              </Link>
            </div>
          </form>
        )}

        {error ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-gray-300">
            Tournament listings are refreshing. Please use the Register button
            above if you are entering an event now.
          </p>
        ) : (
          <>
            {filteredTournaments.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
                No tournaments match those filters. Try another organiser, venue,
                province or status.
              </p>
            ) : !completedOnly && (upcomingTournaments.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleUpcomingTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    sectionFees={sectionFees}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-gray-400">
                No upcoming tournaments are currently listed.
              </p>
            ))}

            {!activeStatusOnly && pastTournaments.length > 0 && (
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
                      Read reports, check final standings and open the photo
                      album when the organiser has shared one.
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
                      sectionFees={sectionFees}
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
