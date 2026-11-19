import Link from "next/link";
import {
  formatCalendarDate,
  getCalendarDateKey,
  getSouthAfricaDateKey,
  parseCalendarDate,
} from "@/lib/dateHelpers";
import {
  fetchPublicTournaments,
  type TournamentDirectoryEntry,
  type TournamentDirectoryFee,
} from "@/lib/publicTournamentDirectory";

type Filters = { search?: string; status?: string; province?: string };

const statusOptions = [
  ["", "All events"],
  ["Open", "Registration open"],
  ["Live", "Live now"],
  ["Closed", "Registration closed"],
  ["Postponed", "Postponed"],
  ["Completed", "Completed"],
  ["Coming Soon", "Coming soon"],
];

function statusLabel(status: TournamentDirectoryEntry["registration_status"]) {
  if (status === "Open") return "Registration open";
  if (status === "Live") return "Live now";
  if (status === "Postponed") return "Postponed";
  if (status === "Completed") return "Completed";
  if (status === "Closed") return "Registration closed";
  return "Coming soon";
}

function statusStyle(status: TournamentDirectoryEntry["registration_status"]) {
  if (status === "Open") return "border-emerald-700/20 bg-emerald-50 text-emerald-800";
  if (status === "Closed") return "border-red-700/20 bg-red-50 text-red-800";
  if (status === "Live") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (status === "Postponed") return "border-orange-300/40 bg-orange-300/10 text-orange-100";
  if (status === "Completed") return "border-slate-400/30 bg-slate-400/10 text-slate-300";
  return "border-white/15 bg-white/5 text-slate-300";
}

function dateParts(tournament: TournamentDirectoryEntry) {
  const date = parseCalendarDate(tournament.start_date);
  if (!date) return { day: "TBA", month: "DATE", full: "Date to be announced" };
  return {
    day: new Intl.DateTimeFormat("en-ZA", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(date).toUpperCase(),
    full: formatCalendarDate(tournament.start_date, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

function tournamentDates(tournament: TournamentDirectoryEntry) {
  const start = dateParts(tournament).full;
  if (!tournament.end_date || tournament.end_date === tournament.start_date) return start;
  return `${start} – ${formatCalendarDate(tournament.end_date, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

function feeText(
  tournament: TournamentDirectoryEntry,
  sectionFees: TournamentDirectoryFee[]
) {
  const fees = sectionFees
    .filter((section) => section.tournament_id === tournament.id)
    .map((section) => section.entry_fee_override ?? tournament.entry_fee);
  const values = fees.length ? Array.from(new Set(fees)) : [tournament.entry_fee];
  if (values.length > 1) return "Varies by section";
  const amount = values[0] ?? tournament.entry_fee;
  if (amount === 0) return "Free entry";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function matchesFilters(tournament: TournamentDirectoryEntry, filters: Filters) {
  const statusMatches = !filters.status || (
    filters.status === "Open" ? tournament.registration_status === "Open" :
    filters.status === "Live" ? tournament.registration_status === "Live" :
    filters.status === "Closed" ? tournament.registration_status === "Closed" :
    filters.status === "Postponed" ? tournament.registration_status === "Postponed" :
    filters.status === "Completed" ? tournament.registration_status === "Completed" :
    filters.status === "Coming Soon" ? tournament.registration_status == null :
    false
  );
  const search = filters.search?.trim().toLocaleLowerCase() ?? "";
  const queryText = [
    tournament.tournament_name,
    tournament.organiser_name,
    tournament.venue,
    tournament.province,
    tournament.description,
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  return (
    (!search || queryText.includes(search)) &&
    (!filters.province || tournament.province?.toLocaleLowerCase() === filters.province.toLocaleLowerCase()) &&
    statusMatches
  );
}

function EventCard({
  tournament,
  sectionFees,
  archived = false,
}: {
  tournament: TournamentDirectoryEntry;
  sectionFees: TournamentDirectoryFee[];
  archived?: boolean;
}) {
  const date = dateParts(tournament);
  const canRegister = tournament.registration_status === "Open";

  return (
    <article className="group grid overflow-hidden rounded-2xl border border-[#ded8cb] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#c99a3d] hover:shadow-[0_16px_35px_rgba(20,34,57,0.09)] md:grid-cols-[104px_minmax(0,1fr)_150px]">
      <div className="flex flex-col items-center justify-center border-b border-[#e5dfd3] bg-[#eee9de] px-4 py-5 text-center md:border-b-0 md:border-r">
        <span className="text-3xl font-black leading-none text-[#142239]">{date.day}</span>
        <span className="mt-1 text-xs font-black tracking-[0.24em] text-[#a87517]">{date.month}</span>
        <span className="mt-3 max-w-full text-[10px] font-bold uppercase tracking-wide text-[#798392]">
          {tournament.start_date ? new Date(`${tournament.start_date}T12:00:00`).getFullYear() : "TBA"}
        </span>
      </div>

      <div className="min-w-0 p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(tournament.registration_status)}`}>
            {statusLabel(tournament.registration_status)}
          </span>
          {tournament.province && <span className="text-xs font-semibold text-slate-400">{tournament.province}</span>}
        </div>
        <Link href={`/gambitbase/tournaments/${tournament.id}`} className="mt-3 block">
          <h3 className="font-serif text-xl font-semibold leading-tight text-[#142239] transition group-hover:text-[#a87517] md:text-2xl">
            {tournament.tournament_name}
          </h3>
        </Link>
        {tournament.organiser_name && (
          <p className="mt-2 text-sm font-semibold text-[#9b6b15]">Hosted by {tournament.organiser_name}</p>
        )}
        <p className="mt-3 text-sm text-[#536176]">
          {tournament.venue}{tournament.province ? ` · ${tournament.province}` : ""}
        </p>
        <p className="mt-1 text-xs text-[#798392]">{tournamentDates(tournament)}</p>
      </div>

      <div className="flex flex-row items-center justify-between gap-4 border-t border-[#e5dfd3] bg-[#faf8f2] p-5 md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#798392]">Entry</p>
          <p className="mt-1 text-sm font-black text-[#142239]">{archived ? "Results" : feeText(tournament, sectionFees)}</p>
        </div>
        <div className="flex gap-2 md:flex-col">
          <Link
            href={`/gambitbase/tournaments/${tournament.id}`}
            className="rounded-xl border border-[#d4ccbc] px-3 py-2 text-center text-xs font-bold text-[#253750] transition hover:border-[#a87517] hover:text-[#8c6015]"
          >
            {archived ? "Results" : "Details"}
          </Link>
          {!archived && canRegister && (
            <Link
              href={`/gambitbase/register?tournament=${tournament.id}`}
              className="rounded-xl bg-[#142239] px-3 py-2 text-center text-xs font-black text-white transition hover:bg-[#263c5c]"
            >
              Register
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function DashboardEventRow({
  tournament,
  sectionFees,
  archived = false,
}: {
  tournament: TournamentDirectoryEntry;
  sectionFees: TournamentDirectoryFee[];
  archived?: boolean;
}) {
  const date = dateParts(tournament);
  const canRegister = tournament.registration_status === "Open" && !archived;
  const stateColor = canRegister
    ? "bg-[#e8f5ed] text-[#26734b]"
    : tournament.registration_status === "Closed"
      ? "bg-red-50 text-red-800"
    : tournament.registration_status === "Live"
      ? "bg-[#eee9ff] text-[#6246a6]"
      : archived
        ? "bg-[#edf0f3] text-[#667386]"
        : "bg-[#f4f0e6] text-[#8a6a2f]";

  return (
    <article className="group grid gap-4 border-b border-[#e4e8ed] px-4 py-5 transition hover:bg-[#f8fafb] sm:grid-cols-[72px_minmax(0,1fr)_minmax(150px,0.45fr)_minmax(120px,0.35fr)] sm:items-center sm:px-6">
      <div className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-2xl bg-[#eef1f4] text-center leading-none">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9b762f]">{date.month}</span>
        <span className="mt-1 text-2xl font-black tracking-tight text-[#18283c]">{date.day}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] ${stateColor}`}>{archived ? "Results available" : statusLabel(tournament.registration_status)}</span>
          {tournament.province && <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#8994a2]">{tournament.province}</span>}
        </div>
        <Link href={`/gambitbase/tournaments/${tournament.id}`} className="mt-2 block truncate text-base font-bold tracking-tight text-[#192a40] transition group-hover:text-[#9c701b] md:text-lg">
          {tournament.tournament_name}
        </Link>
        <p className="mt-1 truncate text-xs text-[#718092]">{tournament.organiser_name ? `${tournament.organiser_name} · ` : ""}{tournament.venue || "Venue to be confirmed"}</p>
      </div>
      <div className="hidden sm:block">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#9aa3af]">{tournament.end_date && tournament.end_date !== tournament.start_date ? "Event dates" : "Event date"}</p>
        <p className="mt-1 text-xs font-semibold text-[#526176]">{tournamentDates(tournament)}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="sm:text-right">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#9aa3af]">{archived ? "Event record" : "Entry"}</p>
          <p className="mt-1 text-xs font-bold text-[#293a50]">{archived ? "Final results" : feeText(tournament, sectionFees)}</p>
        </div>
        {canRegister ? (
          <Link href={`/gambitbase/register?tournament=${tournament.id}`} className="rounded-xl bg-[#192a40] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#9a701e]">Enter <span aria-hidden="true">→</span></Link>
        ) : (
          <Link href={`/gambitbase/tournaments/${tournament.id}`} className="rounded-xl border border-[#dfe4e9] px-4 py-2.5 text-xs font-extrabold text-[#44546a] transition hover:border-[#bd9445] hover:text-[#8c651e]">{archived ? "Results" : "Details"}</Link>
        )}
      </div>
    </article>
  );
}

export default async function GambitBaseTournaments({
  mode = "directory",
  filters = {},
}: {
  mode?: "directory" | "preview";
  filters?: Filters;
}) {
  const { tournaments, sectionFees, error } = await fetchPublicTournaments();
  const provinces = Array.from(new Set(tournaments.map((event) => event.province?.trim()).filter((province): province is string => Boolean(province)))).sort((a, b) => a.localeCompare(b));
  const visible = tournaments.filter((event) => matchesFilters(event, filters));
  const today = getSouthAfricaDateKey();
  const upcoming = visible.filter((event) => event.registration_status !== "Completed").sort((a, b) => {
    const aFuture = Boolean(today && getCalendarDateKey(a.start_date) && getCalendarDateKey(a.start_date)! >= today);
    const bFuture = Boolean(today && getCalendarDateKey(b.start_date) && getCalendarDateKey(b.start_date)! >= today);
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return (parseCalendarDate(a.start_date)?.getTime() ?? 0) - (parseCalendarDate(b.start_date)?.getTime() ?? 0);
  });
  const completed = visible.filter((event) => event.registration_status === "Completed").sort((a, b) =>
    (parseCalendarDate(b.start_date)?.getTime() ?? 0) - (parseCalendarDate(a.start_date)?.getTime() ?? 0)
  );
  const displayUpcoming = mode === "preview" ? upcoming.slice(0, 3) : upcoming;

  if (mode === "preview") {
    return (
      <section className="bg-[#f6f3eb] px-5 py-16 text-[#142239] md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e8b84f]">On the calendar</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">Upcoming chess events</h2>
            </div>
            <Link href="/gambitbase/tournaments" className="rounded-full border border-[#cfc6b5] px-5 py-3 text-sm font-bold text-[#253750] transition hover:border-[#a87517] hover:text-[#8c6015]">
              All tournaments <span aria-hidden="true">→</span>
            </Link>
          </div>
          {error ? (
            <p className="rounded-2xl border border-[#ded8cb] bg-white p-5 text-sm text-[#536176]">Tournament listings are refreshing. Please check back shortly.</p>
          ) : displayUpcoming.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {displayUpcoming.map((event) => <EventCard key={event.id} tournament={event} sectionFees={sectionFees} />)}
            </div>
          ) : (
            <p className="rounded-2xl border border-[#ded8cb] bg-white p-5 text-sm text-[#536176]">No upcoming tournaments are listed right now.</p>
          )}
        </div>
      </section>
    );
  }

  const onlyCompleted = filters.status === "Completed";
  const hideCompleted = Boolean(filters.status && filters.status !== "Completed");
  const featuredEvent = upcoming[0];
  const otherUpcoming = featuredEvent
    ? upcoming.filter((event) => event.id !== featuredEvent.id)
    : [];
  const featuredDate = featuredEvent ? dateParts(featuredEvent) : null;

  return (
    <section className="min-h-screen bg-[#f4f1e9] text-[#17283d]">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="bg-[#17283d] px-4 py-5 text-white sm:px-5 sm:py-6 lg:min-h-[calc(100vh-72px)] lg:px-6 lg:py-7">
          <p className="text-[8px] font-extrabold uppercase tracking-[0.22em] text-[#dcb354]">Tournament desk</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold leading-tight">Find your next board.</h1>
          <p className="mt-2 hidden max-w-sm text-[11px] leading-5 text-[#b7c1cd] sm:block">Explore the calendar and go straight to the event that fits your game.</p>

          <div className="my-4 grid grid-cols-2 gap-2 sm:my-5 lg:my-6">
            <div className="border-l-2 border-[#e1b960] bg-white/[0.06] px-3 py-2"><p className="text-lg font-black">{upcoming.length}</p><p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#b7c1cd]">Coming up</p></div>
            <div className="border-l-2 border-[#76bd91] bg-white/[0.06] px-3 py-2"><p className="text-lg font-black">{upcoming.filter((event) => event.registration_status === "Open").length}</p><p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#b7c1cd]">Entries open</p></div>
          </div>

          <form action="/gambitbase/tournaments" className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 lg:block lg:space-y-3">
            <label className="col-span-2 block lg:col-span-1"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.17em] text-[#c5ced8]">Search</span><input type="search" name="search" defaultValue={filters.search ?? ""} placeholder="Tournament or place" className="w-full rounded-lg border border-white/15 bg-white/[0.08] px-3 py-2.5 text-xs text-white outline-none placeholder:text-[#9daaba] focus:border-[#dcb354]" /></label>
            <label className="block"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.17em] text-[#c5ced8]">Entry status</span><select name="status" defaultValue={filters.status ?? ""} className="w-full rounded-lg border border-white/15 bg-[#22364d] px-3 py-2.5 text-xs text-white outline-none focus:border-[#dcb354]">{statusOptions.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.17em] text-[#c5ced8]">Province</span><select name="province" defaultValue={filters.province ?? ""} className="w-full rounded-lg border border-white/15 bg-[#22364d] px-3 py-2.5 text-xs text-white outline-none focus:border-[#dcb354]"><option value="">All provinces</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
            <div className="col-span-2 grid grid-cols-2 gap-2 lg:col-span-1"><button className="rounded-lg bg-[#e2b85f] px-3 py-2.5 text-[11px] font-extrabold text-[#17283d] transition hover:bg-white">Apply filters</button><Link href="/gambitbase/tournaments" className="rounded-lg border border-white/20 px-3 py-2.5 text-center text-[11px] font-bold text-[#d5dce4] transition hover:border-white hover:text-white">Reset</Link></div>
          </form>

          <div className="mt-5 border-t border-white/15 pt-4 text-[8px] font-semibold uppercase leading-4 tracking-[0.14em] text-[#9daaba]">{completed.length} past events · listings sync as organisers publish</div>
        </aside>

        <div className="min-w-0 px-4 py-7 sm:px-7 md:py-10 lg:px-12 lg:py-12">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#a77c29]">The chess calendar</p><h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">Your next tournament.</h2></div>
            <Link href="/gambitbase/register" className="text-xs font-extrabold text-[#7f5e20] underline decoration-[#d2b36d] underline-offset-4 hover:text-[#17283d]">Go to registration →</Link>
          </div>

          {error ? <p className="rounded-2xl border border-[#e0e5e9] bg-white p-6 text-sm text-[#536176]">Tournament listings are refreshing. Please check back shortly.</p> : (
            <>
              {!onlyCompleted && featuredEvent && featuredDate && <section className="relative mb-9 overflow-hidden bg-[#dcb65f] p-5 sm:p-7 md:p-9">
                <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-[#17283d]/15"/><div className="pointer-events-none absolute -right-1 -top-12 h-48 w-48 rounded-full border border-[#17283d]/15"/>
                <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="max-w-2xl">
                    <p className={`text-[9px] font-extrabold uppercase tracking-[0.22em] ${featuredEvent.registration_status === "Open" ? "text-[#176b45]" : "text-[#473818]"}`}>{featuredEvent.registration_status === "Open" ? "Registration open" : "Next on the calendar"}</p>
                    <div className="mt-4 flex items-start gap-4">
                      <div className="hidden min-w-[68px] border-r border-[#17283d]/20 pr-4 sm:block"><span className="block text-[10px] font-extrabold uppercase tracking-[0.14em]">{featuredDate.month}</span><span className="mt-1 block text-4xl font-black leading-none">{featuredDate.day}</span></div>
                      <div><h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">{featuredEvent.tournament_name}</h3><p className="mt-3 text-xs font-semibold text-[#44391e]">{tournamentDates(featuredEvent)} · {featuredEvent.province || "South Africa"}</p><p className="mt-1 text-xs text-[#594a28]">{featuredEvent.venue || "Venue to be confirmed"}{featuredEvent.organiser_name ? ` · Hosted by ${featuredEvent.organiser_name}` : ""}</p></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[#17283d]/20 pt-4 md:block md:border-0 md:pt-0 md:text-right"><div><p className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-[#55451f]">Entry</p><p className="mt-1 text-sm font-black">{feeText(featuredEvent, sectionFees)}</p></div><Link href={featuredEvent.registration_status === "Open" ? `/gambitbase/register?tournament=${featuredEvent.id}` : `/gambitbase/tournaments/${featuredEvent.id}`} className="inline-flex rounded-lg bg-[#17283d] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-white hover:text-[#17283d]">{featuredEvent.registration_status === "Open" ? "Enter this event" : "View event"} <span aria-hidden="true" className="ml-2">→</span></Link></div>
                </div>
              </section>}

              {!onlyCompleted && <section>
                <div className="mb-3 flex items-end justify-between border-b border-[#d9d5cc] pb-3"><div><h3 className="text-xs font-extrabold uppercase tracking-[0.16em]">Coming up</h3><p className="mt-1 text-[10px] text-[#828d9a]">{otherUpcoming.length} more {otherUpcoming.length === 1 ? "event" : "events"}</p></div><span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8c97a3]">By date</span></div>
                {otherUpcoming.length ? <div className="divide-y divide-[#dedbd3]">{otherUpcoming.map((event) => <DashboardEventRow key={event.id} tournament={event} sectionFees={sectionFees} />)}</div> : <p className="py-6 text-sm text-[#6c7787]">No other upcoming events match these filters.</p>}
              </section>}

              {!hideCompleted && completed.length > 0 && <section className="mt-10"><div className="mb-3 border-b border-[#d9d5cc] pb-3"><h3 className="text-xs font-extrabold uppercase tracking-[0.16em]">Recent results</h3><p className="mt-1 text-[10px] text-[#828d9a]">Completed events and standings</p></div><div className="divide-y divide-[#dedbd3]">{completed.map((event) => <DashboardEventRow key={event.id} tournament={event} sectionFees={sectionFees} archived />)}</div></section>}
              {visible.length === 0 && <p className="border border-[#ded8cb] bg-white p-6 text-sm text-[#6c7787]">No events match those filters.</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
