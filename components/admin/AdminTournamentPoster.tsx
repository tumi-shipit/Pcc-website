import Image from "next/image";

export default function AdminTournamentPoster({
  tournamentName,
  posterUrl,
  className = "",
}: {
  tournamentName: string;
  posterUrl: string | null | undefined;
  className?: string;
}) {
  return (
    <aside
      className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-3 shadow-xl ${className}`}
    >
      <div className="relative h-28 w-[75px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={`${tournamentName} poster`}
            fill
            sizes="75px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">
            No poster yet
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300">
          Tournament poster
        </p>
        <p className="mt-2 line-clamp-2 text-sm font-black text-white">
          {tournamentName}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {posterUrl ? "Public event identity" : "Add one in Event setup"}
        </p>
      </div>
    </aside>
  );
}
