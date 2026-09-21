type LookupPlayer = {
  pcc_id: string | null;
  chess_sa_id: string | null;
  full_name: string;
  date_of_birth: string | null;
};

const id = (value: string | null) => String(value ?? "").trim();
const name = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean).sort().join(" ");

// Search candidates are not identity matches. Missing DOB or a shared name
// token must never force a new registrant to select someone else's profile.
export function matchesNewPlayerIdentity(
  profile: Pick<LookupPlayer, "full_name" | "date_of_birth">,
  player: { first_names: string; surname: string; date_of_birth: string }
) {
  const fullName = name(`${player.first_names} ${player.surname}`);
  return Boolean(fullName && player.date_of_birth && profile.date_of_birth &&
    profile.date_of_birth === player.date_of_birth && name(profile.full_name) === fullName);
}

function compatible(a: LookupPlayer, b: LookupPlayer) {
  if (id(a.pcc_id) && id(b.pcc_id) && id(a.pcc_id) !== id(b.pcc_id)) return false;
  if (id(a.chess_sa_id) && id(b.chess_sa_id) && id(a.chess_sa_id) !== id(b.chess_sa_id)) return false;
  if (a.date_of_birth && b.date_of_birth && a.date_of_birth !== b.date_of_birth) return false;
  if (name(a.full_name) !== name(b.full_name)) return false;
  return Boolean(
    (id(a.pcc_id) && id(a.pcc_id) === id(b.pcc_id)) ||
    (id(a.chess_sa_id) && id(a.chess_sa_id) === id(b.chess_sa_id))
  );
}

// Presentation deduplication only: never merges or deletes actual profiles.
export function uniqueLookupPlayers<T extends LookupPlayer>(players: T[]): T[] {
  const groups: T[][] = [];
  // Existing PCC profiles are authoritative for registration/contact details.
  const ordered = [...players].sort((a, b) => Number(Boolean(id(b.pcc_id))) - Number(Boolean(id(a.pcc_id))));
  for (const player of ordered) {
    const candidates = groups.filter(group => group.every(member => compatible(member, player)));
    if (candidates.length === 1) candidates[0].push(player);
    else groups.push([player]); // Do not choose between conflicting identities.
  }
  return groups.map(group => {
    const result = { ...group[0] };
    for (const other of group.slice(1)) {
      for (const key of Object.keys(other) as (keyof T)[]) {
        if (result[key] == null || result[key] === "") result[key] = other[key];
      }
    }
    return result;
  });
}
