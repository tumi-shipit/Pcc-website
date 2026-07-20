import * as XLSX from "xlsx";

export type TournamentExportFormat = "swiss" | "team-tiebreaks" | "round-robin";

export type TournamentExportPlayer = {
  full_name?: string | null;
  chess_sa_id?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  rating?: number | string | null;
  club?: string | null;
  province?: string | null;
  section_name?: string | null;
};

export type TournamentTextExportFile = {
  fileName: string;
  content: string;
};

export const tournamentExportFormats: {
  value: TournamentExportFormat;
  label: string;
  description: string;
  filePart: string;
}[] = [
  {
    value: "swiss",
    label: "Swiss system",
    description: "Standard Swiss-Manager player import.",
    filePart: "swiss-system",
  },
  {
    value: "team-tiebreaks",
    label: "Swiss + team tie-breaks",
    description: "Adds team/group columns from club, province and section.",
    filePart: "swiss-team-tiebreaks",
  },
  {
    value: "round-robin",
    label: "Round robin",
    description: "Clean seeded list for round-robin sections.",
    filePart: "round-robin",
  },
];

function splitName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");

  if (parts.length === 1) {
    return { firstName: fullName, surname: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

function normalizeSex(gender: string | null | undefined) {
  const value = String(gender ?? "").toLowerCase();

  if (value === "m" || value === "male") return "m";
  if (value === "f" || value === "female") return "f";

  return "";
}

function teamName(player: TournamentExportPlayer) {
  return player.club || player.province || player.section_name || "";
}

function buildSwissRows(players: TournamentExportPlayer[], includeTeamTieBreaks: boolean) {
  const headers = [
    "No",
    "First Name",
    "Surname",
    "Title",
    "ID no",
    "Rating nat",
    "Rating int",
    "Birth",
    " Fed",
    "Sex",
    "Type",
    "Gr",
    "Clubno",
    "Club",
    ...(includeTeamTieBreaks ? ["Team", "Team group"] : []),
    "FIDE-No",
    "surname",
    "first name",
    "atitle",
  ];

  const rows = players.map((player, index) => {
    const { firstName, surname } = splitName(player.full_name ?? "");
    const baseRow = [
      index + 1,
      firstName,
      surname,
      "",
      player.chess_sa_id ?? "",
      player.rating ?? "",
      "",
      player.date_of_birth ?? "",
      "RSA",
      normalizeSex(player.gender),
      "",
      player.section_name ?? "",
      "",
      player.club ?? "",
    ];

    return [
      ...baseRow,
      ...(includeTeamTieBreaks
        ? [teamName(player), player.section_name || player.province || ""]
        : []),
      "",
      surname,
      firstName,
      "",
    ];
  });

  return [headers, ...rows];
}

function sortRoundRobinPlayers(players: TournamentExportPlayer[]) {
  return [...players].sort((a, b) => {
    const ratingDifference = Number(b.rating ?? 0) - Number(a.rating ?? 0);
    if (ratingDifference !== 0) return ratingDifference;
    return String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""));
  });
}

function buildRoundRobinRows(players: TournamentExportPlayer[]) {
  const sortedPlayers = sortRoundRobinPlayers(players);
  const headers = [
    "No",
    "Name",
    "Chess SA ID",
    "Rating",
    "Federation",
    "Club",
    "Section",
    "Birth",
    "Sex",
  ];

  const rows = sortedPlayers.map((player, index) => [
    index + 1,
    player.full_name ?? "",
    player.chess_sa_id ?? "",
    player.rating ?? "",
    "RSA",
    player.club ?? "",
    player.section_name ?? "",
    player.date_of_birth ?? "",
    normalizeSex(player.gender),
  ]);

  return [headers, ...rows];
}

function cleanTextCell(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll(";", ",")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function formatSwissDate(value: string | null | undefined) {
  if (!value) return "";
  return cleanTextCell(value).replaceAll("-", "/");
}

function toSemicolonText(rows: (string | number | null | undefined)[][]) {
  return rows.map((row) => row.map(cleanTextCell).join(";")).join("\r\n");
}

function teamKey(player: TournamentExportPlayer) {
  return cleanTextCell(player.club || player.province || "No team");
}

export function buildSwissTeamTieBreakTextFiles(
  players: TournamentExportPlayer[],
  baseFileName: string
): TournamentTextExportFile[] {
  const teamNames = Array.from(new Set(players.map(teamKey))).sort((a, b) =>
    a.localeCompare(b)
  );
  const teamNumbers = new Map(teamNames.map((name, index) => [name, index + 1]));
  const boardCounters = new Map<string, number>();
  const playerHeaders = [
    "No",
    "Name",
    "Title",
    "ID no",
    "Rating nat",
    "Rating int",
    "Birth",
    " Fed",
    "Sex",
    "Type",
    "Gr",
    "Clubno",
    "Club",
    "FIDE-No",
    "Source",
    "pts",
    "tb1",
    "tb2",
    "tb3",
    "tb4",
    "tb5",
    "tb6",
    "rank",
    "surname",
    "first name",
    "atitle",
    "Board",
    "Mno",
  ];

  const playerRows = players.map((player, index) => {
    const team = teamKey(player);
    const board = (boardCounters.get(team) ?? 0) + 1;
    boardCounters.set(team, board);
    const { firstName, surname } = splitName(player.full_name ?? "");

    return [
      index + 1,
      player.full_name ?? "",
      "",
      player.chess_sa_id ?? "",
      player.rating ?? "",
      0,
      formatSwissDate(player.date_of_birth),
      "RSA",
      normalizeSex(player.gender),
      "",
      player.section_name ?? "",
      0,
      player.club ?? "",
      0,
      "RSA",
      0,
      0,
      "",
      "",
      "",
      "",
      "",
      index + 1,
      surname,
      firstName,
      "",
      board,
      teamNumbers.get(team) ?? 0,
    ];
  });

  const teamRows = teamNames.map((team, index) => [
    index + 1,
    team,
    team,
    0,
    "",
    "",
    "",
    "",
  ]);

  const teamHeaders = ["No", "Name", "Shortcut", "Cno", "Captain", "FED", "Group", "Info"];

  return [
    {
      fileName: `${baseFileName}-PLAYER-DATA.txt`,
      content: toSemicolonText([playerHeaders, ...playerRows]),
    },
    {
      fileName: `${baseFileName}-TEAM-DATA.txt`,
      content: toSemicolonText([teamHeaders, ...teamRows]),
    },
  ];
}

export function buildTournamentWorkbook(
  players: TournamentExportPlayer[],
  format: TournamentExportFormat,
  sheetName = "Exp"
) {
  const rows =
    format === "round-robin"
      ? buildRoundRobinRows(players)
      : buildSwissRows(players, format === "team-tiebreaks");
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = rows[0].map((header) => ({
    wch: Math.max(10, String(header).length + 4),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  return workbook;
}

export function tournamentExportFilePart(format: TournamentExportFormat) {
  return (
    tournamentExportFormats.find((option) => option.value === format)?.filePart ??
    "entries"
  );
}
