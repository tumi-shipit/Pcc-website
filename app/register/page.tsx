"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type SearchMethod = "surname" | "chesssa";

type ChessSaPlayer = {
  chess_sa_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  title: string | null;
  federation: string | null;
  standard_rating: number | null;
  rapid_rating: number | null;
  blitz_rating: number | null;
};

type PlayerCentreContact = {
  email: string | null;
  phone: string | null;
  club: string | null;
  province: string | null;
};

type NewPlayerForm = {
  first_names: string;
  surname: string;
  date_of_birth: string;
  gender: string;
};

const emptyNewPlayer: NewPlayerForm = {
  first_names: "",
  surname: "",
  date_of_birth: "",
  gender: "",
};

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  entry_fee: number;
  payment_details: string | null;
  poster_image_url: string | null;
  registration_status?: string | null;
};

type TournamentSection = {
  id: string;
  section_name: string;
  minimum_birth_year: number | null;
  maximum_birth_year: number | null;
  minimum_rating: number | null;
  maximum_rating: number | null;
  gender_restriction: string;
  entry_fee_override: number | null;
  maximum_players: number | null;
};

function calculateAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getBirthYear(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const year = new Date(dateOfBirth).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function normalizeGender(gender: string | null) {
  if (!gender) return "";

  const value = gender.trim().toLowerCase();

  if (value === "m" || value === "male") return "Male";
  if (value === "f" || value === "female") return "Female";

  return gender;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getNewPlayerFullName(player: NewPlayerForm) {
  return `${player.first_names.trim()} ${player.surname.trim()}`
    .replace(/\s+/g, " ")
    .trim();
}

function getSectionLabel(section: TournamentSection) {
  const minimumBirthYear = section.minimum_birth_year;
  const maximumBirthYear = section.maximum_birth_year;
  const minimumRating = section.minimum_rating;
  const maximumRating = section.maximum_rating;
  const labels: string[] = [];

  if (minimumBirthYear && !maximumBirthYear) {
    labels.push(`born ${minimumBirthYear} or later`);
  }

  if (minimumBirthYear && maximumBirthYear) {
    labels.push(`born ${minimumBirthYear}-${maximumBirthYear}`);
  }

  if (minimumRating !== null && minimumRating !== undefined && maximumRating !== null && maximumRating !== undefined) {
    labels.push(`${minimumRating}-${maximumRating}`);
  } else if (minimumRating !== null && minimumRating !== undefined) {
    labels.push(`${minimumRating}+`);
  } else if (maximumRating !== null && maximumRating !== undefined) {
    labels.push(`U${maximumRating + 1}`);
  }

  return labels.length > 0
    ? `${section.section_name} (${labels.join(", ")})`
    : section.section_name;
}

function getSectionEligibilityMessage(
  section: TournamentSection,
  playerDateOfBirth: string | null,
  playerGender: string | null,
  playerRating: number | null
) {
  const hasAgeRule =
    section.minimum_birth_year !== null ||
    section.maximum_birth_year !== null;
  const hasRatingRule =
    section.minimum_rating !== null ||
    section.maximum_rating !== null;

  if (hasAgeRule && !playerDateOfBirth) {
    return "Date of birth is required before choosing a section.";
  }

  const playerBirthYear = getBirthYear(playerDateOfBirth);

  if (hasAgeRule && !playerBirthYear) {
    return "Invalid date of birth. Please check the player's profile.";
  }

  if (
    playerBirthYear &&
    section.minimum_birth_year !== null &&
    section.minimum_birth_year !== undefined &&
    playerBirthYear < section.minimum_birth_year
  ) {
    return `You are not eligible for ${section.section_name}. This section is for players born ${
      section.maximum_birth_year
        ? `${section.minimum_birth_year} to ${section.maximum_birth_year}`
        : `${section.minimum_birth_year} or later`
    }.`;
  }

  if (
    playerBirthYear &&
    section.maximum_birth_year !== null &&
    section.maximum_birth_year !== undefined &&
    playerBirthYear > section.maximum_birth_year
  ) {
    return `You are not eligible for ${section.section_name}. This section is for players born ${
      section.maximum_birth_year
        ? `${section.minimum_birth_year} to ${section.maximum_birth_year}`
        : `${section.minimum_birth_year} or later`
    }.`;
  }

  if (
    section.gender_restriction &&
    section.gender_restriction !== "All" &&
    normalizeGender(playerGender) !== section.gender_restriction
  ) {
    return `${section.section_name} is restricted to ${section.gender_restriction} players.`;
  }

  if (hasRatingRule && playerRating === null) {
    return `${section.section_name} requires a Chess SA rating before choosing this section.`;
  }

  if (
    playerRating !== null &&
    section.minimum_rating !== null &&
    section.minimum_rating !== undefined &&
    playerRating < section.minimum_rating
  ) {
    return `You are not eligible for ${section.section_name}. This section is for players rated ${section.minimum_rating} or higher.`;
  }

  if (
    playerRating !== null &&
    section.maximum_rating !== null &&
    section.maximum_rating !== undefined &&
    playerRating > section.maximum_rating
  ) {
    return `You are not eligible for ${section.section_name}. This section is for players rated ${section.maximum_rating} or below.`;
  }

  return "";
}

function getBestChessSaRating(player: ChessSaPlayer | null) {
  if (!player) return null;

  return player.standard_rating ?? player.rapid_rating ?? player.blitz_rating ?? null;
}

const southAfricanProvinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const maxProofFileSizeMb = 8;
const maxProofFileSizeBytes = maxProofFileSizeMb * 1024 * 1024;

export default function RegisterPage() {
  const [searchMethod, setSearchMethod] = useState<SearchMethod>("surname");
  const [searchValue, setSearchValue] = useState("");
  const [searchBirthDate, setSearchBirthDate] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  const [matches, setMatches] = useState<ChessSaPlayer[]>([]);
  const [selectedChessSaPlayer, setSelectedChessSaPlayer] =
    useState<ChessSaPlayer | null>(null);
  const [newPlayerMode, setNewPlayerMode] = useState(false);
  const [newPlayer, setNewPlayer] = useState<NewPlayerForm>(emptyNewPlayer);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [club, setClub] = useState("");
  const [province, setProvince] = useState("");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [requestedTournamentId, setRequestedTournamentId] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [sections, setSections] = useState<TournamentSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [paymentChoice, setPaymentChoice] = useState<"later" | "proof">(
    "later"
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [openPoster, setOpenPoster] = useState<Tournament | null>(null);

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId),
    [selectedTournamentId, tournaments]
  );

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId),
    [selectedSectionId, sections]
  );

  const playerDateOfBirth =
    selectedChessSaPlayer?.date_of_birth ??
    (newPlayerMode ? newPlayer.date_of_birth : null);

  const playerGender =
    selectedChessSaPlayer?.gender ?? (newPlayerMode ? newPlayer.gender : null);

  const selectedPlayerAge = calculateAge(playerDateOfBirth);
  const selectedPlayerRating = getBestChessSaRating(selectedChessSaPlayer);
  const registeringPlayerName = selectedChessSaPlayer
    ? selectedChessSaPlayer.full_name
    : getNewPlayerFullName(newPlayer);

  const selectedSectionEligibilityMessage = selectedSection
    ? getSectionEligibilityMessage(
        selectedSection,
        playerDateOfBirth,
        playerGender,
        selectedPlayerRating
      )
    : "";

  const entryFee =
    selectedSection?.entry_fee_override ?? selectedTournament?.entry_fee ?? 0;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setRequestedTournamentId(query.get("tournament") ?? "");
  }, []);

  useEffect(() => {
    async function loadOpenTournaments() {
      setLoadingTournaments(true);

      const { data, error } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, start_date, end_date, venue, province, entry_fee, payment_details, poster_image_url, registration_status"
        )
        .eq("registration_status", "Open")
        .order("start_date", { ascending: true });

      if (error) {
        setSearchMessage("Could not load open tournaments. Please try again.");
      } else {
        const openTournaments = (data ?? []) as unknown as Tournament[];
        setTournaments(openTournaments);

        if (
          requestedTournamentId &&
          openTournaments.some((tournament) => tournament.id === requestedTournamentId)
        ) {
          setSelectedTournamentId(requestedTournamentId);
          setSearchMessage("Tournament selected. Find your Chess SA profile to continue.");
        } else if (requestedTournamentId) {
          setSearchMessage(
            "That tournament is not currently open for registration. Please choose another open tournament below."
          );
        }
      }

      setLoadingTournaments(false);
    }

    loadOpenTournaments();
  }, [requestedTournamentId]);

  useEffect(() => {
    async function loadSections() {
      if (!selectedTournamentId) {
        setSections([]);
        setSelectedSectionId("");
        return;
      }

      setLoadingSections(true);
      setSelectedSectionId("");

      const { data, error } = await supabase
        .from("tournament_sections")
        .select(
          "id, section_name, minimum_birth_year, maximum_birth_year, minimum_rating, maximum_rating, gender_restriction, entry_fee_override, maximum_players"
        )
        .eq("tournament_id", selectedTournamentId)
        .order("minimum_birth_year", { ascending: false, nullsFirst: false })
        .order("section_name", { ascending: true });

      if (error) {
        setRegistrationMessage(
          "Could not load tournament sections. Please try again."
        );
      } else {
        setSections((data ?? []) as unknown as TournamentSection[]);
      }

      setLoadingSections(false);
    }

    loadSections();
  }, [selectedTournamentId]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSearching(true);
    setSearchMessage("");
    setRegistrationMessage("");
    setMatches([]);
    setSelectedChessSaPlayer(null);
    setNewPlayerMode(false);

    const { data, error } = await supabase.rpc(
      "find_chessa_player_for_registration",
      {
        p_search_method: searchMethod,
        p_search_value: searchValue.trim(),
        p_birth_date: searchMethod === "surname" ? searchBirthDate : null,
      }
    );

    if (error) {
      setSearchMessage(`Search failed: ${error.message}`);
      setSearching(false);
      return;
    }

    const results = (data ?? []) as ChessSaPlayer[];

    if (results.length === 0) {
      setSearchMessage(
        searchMethod === "surname"
          ? "No matching Chess SA player was found. Check the surname and date of birth."
          : "No matching Chess SA player was found. Check the Chess SA ID."
      );
      setSearching(false);
      return;
    }

    setMatches(results);

    if (results.length === 1) {
      setSelectedChessSaPlayer(results[0]);
      const filledDetails = await fillContactDetailsFromPlayerCentre(results[0]);
      setSearchMessage(
        filledDetails
          ? "Chess SA player found. Saved Player Centre details were filled in. Please check them before submitting."
          : "Chess SA player found. Please confirm your details."
      );
    } else {
      setSearchMessage(
        `${results.length} matching players found. Please select the correct player.`
      );
    }

    setSearching(false);
  }

  async function fillContactDetailsFromPlayerCentre(player: ChessSaPlayer) {
    if (!player.chess_sa_id) return false;

    const { data, error } = await supabase
      .from("players")
      .select("email, phone, club, province")
      .eq("chess_sa_id", player.chess_sa_id)
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;

    const details = data as PlayerCentreContact;
    let filledCount = 0;

    if (!email.trim() && details.email) {
      setEmail(details.email);
      filledCount += 1;
    }

    if (!phone.trim() && details.phone) {
      setPhone(details.phone);
      filledCount += 1;
    }

    if (!club.trim() && details.club) {
      setClub(details.club);
      filledCount += 1;
    }

    if (!province.trim() && details.province) {
      setProvince(details.province);
      filledCount += 1;
    }

    return filledCount > 0;
  }

  async function choosePlayer(player: ChessSaPlayer) {
    setSelectedChessSaPlayer(player);
    setNewPlayerMode(false);
    setRegistrationSubmitted(false);
    const filledDetails = await fillContactDetailsFromPlayerCentre(player);
    setSearchMessage(
      filledDetails
        ? "Chess SA player selected. Saved Player Centre details were filled in. Please check them before submitting."
        : "Chess SA player selected. Continue with registration."
    );
  }

  function startNewPlayerRegistration() {
    setMatches([]);
    setSelectedChessSaPlayer(null);
    setNewPlayerMode(true);
    setRegistrationSubmitted(false);
    setSearchMessage(
      "New player registration selected. Complete the details below."
    );
  }

  async function handleRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegistrationSubmitted(false);

    if (!selectedChessSaPlayer && !newPlayerMode) {
      setRegistrationMessage(
        "Please find a Chess SA profile or choose new player registration."
      );
      return;
    }

    if (!selectedTournamentId || !selectedSectionId) {
      setRegistrationMessage("Please choose the tournament and section first.");
      return;
    }

    if (newPlayerMode) {
      if (
        !newPlayer.first_names.trim() ||
        !newPlayer.surname.trim() ||
        !newPlayer.date_of_birth ||
        !newPlayer.gender
      ) {
        setRegistrationMessage(
          "Please enter the new player's first name, surname, date of birth and gender."
        );
        return;
      }
    }

    if (selectedSection && selectedSectionEligibilityMessage) {
      setRegistrationMessage(selectedSectionEligibilityMessage);
      return;
    }

    if (!email.trim() || !phone.trim()) {
      setRegistrationMessage("Please enter your email and phone number.");
      return;
    }

    if (paymentChoice === "proof" && !proofFile) {
      setRegistrationMessage("Please choose your proof of payment file.");
      return;
    }

    if (proofFile && proofFile.size > maxProofFileSizeBytes) {
      setRegistrationMessage(
        `Proof of payment is too large. Please upload a file smaller than ${maxProofFileSizeMb}MB.`
      );
      return;
    }

    setSubmittingRegistration(true);
    setRegistrationMessage("");

    try {
      let proofOfPaymentUrl: string | null = null;

      if (paymentChoice === "proof" && proofFile) {
        const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const fileOwner = selectedChessSaPlayer?.chess_sa_id ?? "new-player";
        const filePath = `${fileOwner}/${selectedTournamentId}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("proof-of-payments")
          .upload(filePath, proofFile, {
            upsert: false,
          });

        if (uploadError) throw uploadError;

        proofOfPaymentUrl = filePath;
      }

      const bestRating = getBestChessSaRating(selectedChessSaPlayer);
      const newPlayerFullName = getNewPlayerFullName(newPlayer);

      const { error } = await supabase.rpc("submit_tournament_registration", {
        p_full_name: selectedChessSaPlayer
          ? selectedChessSaPlayer.full_name
          : newPlayerFullName,
        p_chess_sa_id: selectedChessSaPlayer
          ? selectedChessSaPlayer.chess_sa_id
          : null,
        p_date_of_birth: selectedChessSaPlayer
          ? selectedChessSaPlayer.date_of_birth
          : newPlayer.date_of_birth,
        p_gender: selectedChessSaPlayer
          ? selectedChessSaPlayer.gender
          : newPlayer.gender,
        p_rating: bestRating,
        p_email: email.trim(),
        p_phone: phone.trim(),
        p_club: club.trim(),
        p_province: province.trim(),
        p_tournament_id: selectedTournamentId,
        p_section_id: selectedSectionId,
        p_payment_status: paymentChoice === "proof" ? "Proof Submitted" : "Pending",
        p_proof_of_payment_url: proofOfPaymentUrl,
      });

      if (error) {
        if (error.message.toLowerCase().includes("duplicate")) {
          setRegistrationMessage(
            "You are already registered for this tournament. Contact the organiser if you need changes."
          );
        } else {
          setRegistrationMessage(`Registration error: ${error.message}`);
        }

        setSubmittingRegistration(false);
        return;
      }

      setRegistrationMessage(
        "Registration submitted successfully. PCC Tournament Services will review your entry and payment."
      );
      setRegistrationSubmitted(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error.";

      setRegistrationMessage(`Your registration could not be completed: ${errorMessage}`);
    } finally {
      setSubmittingRegistration(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.22),_transparent_38%)]">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
          <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-5 shadow-xl md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
              Registration Platform
            </p>

            <h1 className="mt-3 text-xl font-bold md:text-2xl leading-tight md:text-5xl">
              Find and enter chess tournaments
            </h1>

            <p className="mt-4 max-w-4xl text-sm leading-6 text-gray-300 md:text-base md:leading-7">
              Use this platform to find chess tournaments around the province
              from verified organisers and organisations, then enter the event
              you want to play in.
            </p>

            <p className="mt-3 hidden max-w-4xl text-sm leading-6 text-gray-400 md:block md:text-base md:leading-7">
              Wherever you are in the province, open tournaments can be listed
              here so players, families, schools, clubs and coaches can register
              from one trusted place.
            </p>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
              Powered by Polokwane Chess Club
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300">
                Provincial Tournament Hub
              </span>

              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300">
                Verified Organisers
              </span>

              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
                Player Lookup
              </span>

              <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300">
                Online Entries
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              [
                "1",
                "Find profile",
                "Search using the player's Chess SA ID or the player's surname and date of birth.",
              ],
              [
                "2",
                "Choose event",
                "Select the tournament and the correct section for the player.",
              ],
              [
                "3",
                "Send entry",
                "Add contact details, choose payment option and submit.",
              ],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="rounded-xl border border-white/10 bg-zinc-900 p-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold">
                  {number}
                </span>

                <h2 className="mt-3 text-base font-bold">{title}</h2>
                <p className="mt-1.5 text-xs leading-5 text-gray-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-xl md:p-8">
          <h2 className="text-xl font-bold md:text-2xl">
            1. Find the Chess SA profile
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            Use the player's surname and date of birth. If you know the
            player's Chess SA ID, you can use that instead.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["surname", "Player surname + date of birth"],
                ["chesssa", "Player Chess SA ID"],
              ] as const
            ).map(([method, label]) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setSearchMethod(method);
                  setSearchValue("");
                  setSearchBirthDate("");
                  setMatches([]);
                  setSelectedChessSaPlayer(null);
                  setSearchMessage("");
                }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                  searchMethod === method
                    ? "border-red-500 bg-red-600 text-white"
                    : "border-white/10 bg-zinc-950 text-gray-300 hover:border-red-500/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-200">
                {searchMethod === "surname" ? "Player surname" : "Player Chess SA ID"}
              </label>

              <input
                type="text"
                required
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={
                  searchMethod === "surname"
                    ? "Enter your surname"
                    : "Enter the player's Chess SA ID"
                }
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
              />
            </div>

            {searchMethod === "surname" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                  Date of birth
                </label>

                <input
                  type="date"
                  required
                  value={searchBirthDate}
                  onChange={(event) => setSearchBirthDate(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                />
              </div>
            )}

            <div className={searchMethod === "surname" ? "md:col-span-2" : ""}>
              <button
                type="submit"
                disabled={searching}
                className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searching ? "Searching..." : "Find Profile"}
              </button>
            </div>
          </form>

          {searchMessage && (
            <p className="mt-5 rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-300">
              {searchMessage}
            </p>
          )}

          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm font-semibold text-amber-100">
              New to chess or not listed on Chess SA?
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-100/80">
              Use this option only if you do not have a Chess SA profile yet.
              Your entry will be marked as a new/unverified player for admin review.
            </p>
            <button
              type="button"
              onClick={startNewPlayerRegistration}
              className="mt-4 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Register as a New Player
            </button>
          </div>
        </div>

        {matches.length > 1 && !selectedChessSaPlayer && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-4 md:p-6">
            <h2 className="text-xl font-bold md:text-2xl">Select your profile</h2>

            <div className="mt-6 grid gap-4">
              {matches.map((match) => (
                <button
                  key={match.chess_sa_id}
                  type="button"
                  onClick={() => choosePlayer(match)}
                  className="rounded-xl border border-white/10 bg-zinc-950 p-5 text-left transition hover:border-red-500"
                >
                  <p className="font-bold">{match.full_name}</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Chess SA ID: {match.chess_sa_id}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Standard: {match.standard_rating ?? "Not rated"}  -  Rapid:{" "}
                    {match.rapid_rating ?? "Not rated"}  -  Blitz:{" "}
                    {match.blitz_rating ?? "Not rated"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {newPlayerMode && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
              New / Unverified Player
            </p>

            <h2 className="mt-3 text-xl font-bold md:text-2xl">New player details</h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              This is for players who are new to chess or do not yet appear in
              the Chess SA database.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                  First name(s)
                </label>
                <input
                  type="text"
                  required
                  value={newPlayer.first_names}
                  onChange={(event) =>
                    setNewPlayer((current) => ({
                      ...current,
                      first_names: event.target.value,
                    }))
                  }
                  placeholder="Example: Thabo Junior"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                  Surname
                </label>
                <input
                  type="text"
                  required
                  value={newPlayer.surname}
                  onChange={(event) =>
                    setNewPlayer((current) => ({
                      ...current,
                      surname: event.target.value,
                    }))
                  }
                  placeholder="Example: Mokoena"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                  Date of birth
                </label>
                <input
                  type="date"
                  required
                  value={newPlayer.date_of_birth}
                  onChange={(event) =>
                    setNewPlayer((current) => ({
                      ...current,
                      date_of_birth: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                  Gender
                </label>
                <select
                  required
                  value={newPlayer.gender}
                  onChange={(event) =>
                    setNewPlayer((current) => ({
                      ...current,
                      gender: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {selectedChessSaPlayer && (
          <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300">
              Chess SA profile found
            </p>

            <h2 className="mt-3 text-xl font-bold md:text-2xl">
              {selectedChessSaPlayer.full_name}
            </h2>

            <div className="mt-6 grid gap-4 text-sm text-gray-200 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-white">Chess SA ID:</span>{" "}
                {selectedChessSaPlayer.chess_sa_id}
              </p>

              <p>
                <span className="font-semibold text-white">Date of birth:</span>{" "}
                {selectedChessSaPlayer.date_of_birth ?? "Not supplied"}
              </p>

              <p>
                <span className="font-semibold text-white">Age:</span>{" "}
                {selectedPlayerAge ?? "Not available"}
              </p>

              <p>
                <span className="font-semibold text-white">Gender:</span>{" "}
                {selectedChessSaPlayer.gender ?? "Not supplied"}
              </p>

              <p>
                <span className="font-semibold text-white">Standard:</span>{" "}
                {selectedChessSaPlayer.standard_rating ?? "Not rated"}
              </p>

              <p>
                <span className="font-semibold text-white">Rapid:</span>{" "}
                {selectedChessSaPlayer.rapid_rating ?? "Not rated"}
              </p>

              <p>
                <span className="font-semibold text-white">Blitz:</span>{" "}
                {selectedChessSaPlayer.blitz_rating ?? "Not rated"}
              </p>

              <p>
                <span className="font-semibold text-white">Federation:</span>{" "}
                {selectedChessSaPlayer.federation ?? "Not supplied"}
              </p>
            </div>
          </div>
        )}

        {(selectedChessSaPlayer || newPlayerMode) && (
          <form onSubmit={handleRegistration} className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 md:p-6">
              <h2 className="text-xl font-bold md:text-2xl">2. Contact details</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                These can belong to the player or the person helping with the
                registration. We use them for entry updates, payment checks and
                tournament communication.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Contact email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Contact phone number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Phone number"
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Club
                  </label>
                  <input
                    type="text"
                    value={club}
                    onChange={(event) => setClub(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Province
                  </label>

                  <select
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500"
                  >
                    <option value="">Select province</option>
                    {southAfricanProvinces.map((provinceName) => (
                      <option key={provinceName} value={provinceName}>
                        {provinceName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-zinc-900 p-4 md:p-6">
              <div className="mb-4 border-l-4 border-red-500 pl-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Step 3
                </p>

                <h2 className="mt-2 text-xl font-bold md:text-2xl">
                  Tournament Selection
                </h2>

                <p className="mt-1.5 text-xs leading-5 text-gray-400">
                  Choose the tournament you are entering and select your section.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Open tournament
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {tournaments.map((tournament) => {
                      const isSelected = selectedTournamentId === tournament.id;

                      return (
                        <div
                          key={tournament.id}
                          className={`group overflow-hidden rounded-2xl border bg-zinc-950 transition ${
                            isSelected
                              ? "border-red-500 shadow-lg shadow-red-950/30"
                              : "border-white/10 hover:border-red-500/60"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenPoster(tournament)}
                            className="relative block aspect-[3/4] w-full overflow-hidden bg-black"
                            aria-label={`View ${tournament.tournament_name} poster`}
                          >
                            {tournament.poster_image_url ? (
                              <img
                                src={tournament.poster_image_url}
                                alt={`${tournament.tournament_name} poster`}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-zinc-900 text-sm text-gray-500">
                                Tournament poster coming soon
                              </div>
                            )}

                            <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                              Open
                            </span>

                            <span
                              className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                isSelected
                                  ? "bg-red-600 text-white"
                                  : "bg-black/80 text-white"
                              }`}
                            >
                              {isSelected ? "Selected" : "View Poster"}
                            </span>
                          </button>

                          <div className="p-3 md:p-4">
                            <p className="line-clamp-2 text-sm font-bold leading-5 text-white md:text-base">
                              {tournament.tournament_name}
                            </p>

                            <div className="mt-2 space-y-1 text-xs text-gray-400">
                              <p>Date: {formatDate(tournament.start_date)}</p>
                              <p>Venue: {tournament.venue}</p>
                              <p className="font-semibold text-red-300">
                                Entry fee: {formatMoney(tournament.entry_fee)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedTournamentId(tournament.id)}
                              className={`mt-5 w-full rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                                isSelected
                                  ? "bg-red-600 text-white"
                                  : "bg-white text-black hover:bg-gray-200"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select Tournament"}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {loadingTournaments && (
                      <p className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-gray-400 sm:col-span-2">
                        Loading tournaments...
                      </p>
                    )}

                    {!loadingTournaments && tournaments.length === 0 && (
                      <p className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-400 sm:col-span-2">
                        No tournaments are open for registration right now. Please
                        check the tournament centre for upcoming events.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Tournament section
                  </label>

                  <select
                    required
                    value={selectedSectionId}
                    onChange={(event) => setSelectedSectionId(event.target.value)}
                    disabled={!selectedTournamentId || loadingSections}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-4 text-white outline-none transition focus:border-red-500 disabled:opacity-60"
                  >
                    <option value="">
                      {loadingSections
                        ? "Loading sections..."
                        : "Select a section"}
                    </option>

                    {sections.map((section) => {
                      const sectionError = getSectionEligibilityMessage(
                        section,
                        playerDateOfBirth,
                        playerGender,
                        selectedPlayerRating
                      );

                      return (
                        <option
                          key={section.id}
                          value={section.id}
                          disabled={Boolean(sectionError)}
                        >
                          {getSectionLabel(section)}
                          {sectionError ? "  -  Not eligible" : ""}
                        </option>
                      );
                    })}
                  </select>

                  {selectedSectionEligibilityMessage && (
                    <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                      {selectedSectionEligibilityMessage}
                    </p>
                  )}

                  {sections.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                        Section guide
                      </p>

                      {sections.map((section) => {
                        const sectionError = getSectionEligibilityMessage(
                          section,
                          playerDateOfBirth,
                          playerGender,
                          selectedPlayerRating
                        );
                        const isSelected = selectedSectionId === section.id;

                        return (
                          <button
                            key={section.id}
                            type="button"
                            disabled={Boolean(sectionError)}
                            onClick={() => setSelectedSectionId(section.id)}
                            className={`w-full rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
                              isSelected
                                ? "border-red-500 bg-red-600/20"
                                : sectionError
                                  ? "border-white/10 bg-zinc-950 opacity-60"
                                  : "border-white/10 bg-zinc-950 hover:border-red-500/60"
                            }`}
                          >
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-white">
                                {getSectionLabel(section)}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                                  sectionError
                                    ? "bg-red-500/10 text-red-200"
                                    : "bg-green-500/10 text-green-200"
                                }`}
                              >
                                {sectionError ? "Not eligible" : "Available"}
                              </span>
                            </span>

                            {sectionError && (
                              <span className="mt-2 block text-xs leading-5 text-gray-400">
                                {sectionError}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedTournament && (
                    <div className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-gray-300">
                      <p>
                        <span className="font-semibold text-white">Venue:</span>{" "}
                        {selectedTournament.venue}
                      </p>

                      <p className="mt-2">
                        <span className="font-semibold text-white">
                          Entry fee:
                        </span>{" "}
                        <span className="font-bold text-red-300">
                          {formatMoney(entryFee)}
                        </span>
                      </p>

                      {selectedTournament.payment_details && (
                        <p className="mt-2">
                          <span className="font-semibold text-white">
                            Payment details:
                          </span>{" "}
                          {selectedTournament.payment_details}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 md:p-6">
              <h3 className="text-xl font-bold md:text-2xl">4. Payment option</h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                You can submit the entry first and pay later, or upload proof if
                payment has already been made.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentChoice("later");
                    setProofFile(null);
                  }}
                  className={`rounded-lg border p-4 text-left transition ${
                    paymentChoice === "later"
                      ? "border-red-500 bg-red-600/20"
                      : "border-white/10 bg-zinc-950 hover:border-red-500/60"
                  }`}
                >
                  <span className="font-semibold">Pay later</span>
                  <span className="mt-1 block text-sm text-gray-400">
                    Submit the entry now. The organiser will still see payment
                    as pending.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentChoice("proof")}
                  className={`rounded-lg border p-4 text-left transition ${
                    paymentChoice === "proof"
                      ? "border-red-500 bg-red-600/20"
                      : "border-white/10 bg-zinc-950 hover:border-red-500/60"
                  }`}
                >
                  <span className="font-semibold">Upload proof of payment</span>
                  <span className="mt-1 block text-sm text-gray-400">
                    Use this if you already paid and have a clear payment
                    confirmation.
                  </span>
                </button>
              </div>

              {paymentChoice === "proof" && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Proof of payment
                  </label>
                  <p className="mb-3 text-xs text-gray-500">
                    JPG, PNG or PDF. Maximum {maxProofFileSizeMb}MB.
                  </p>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(event) =>
                      setProofFile(event.target.files?.[0] ?? null)
                    }
                    className="block w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                </div>
              )}

              <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Registration summary
                </p>

                <div className="mt-4 grid gap-3 text-sm text-gray-300 md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-white">Player:</span>{" "}
                    {registeringPlayerName || "Not completed"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Tournament:</span>{" "}
                    {selectedTournament?.tournament_name ?? "Not selected"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Section:</span>{" "}
                    {selectedSection?.section_name ?? "Not selected"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Entry fee:</span>{" "}
                    <span className="font-bold text-red-300">
                      {formatMoney(entryFee)}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-white">Payment:</span>{" "}
                    {paymentChoice === "proof"
                      ? "Proof uploaded for review"
                      : "Pay later"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Contact:</span>{" "}
                    {email || phone ? `${email || "No email"} / ${phone || "No phone"}` : "Not completed"}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  submittingRegistration ||
                  Boolean(selectedSectionEligibilityMessage)
                }
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingRegistration && (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {submittingRegistration ? "Submitting entry..." : "Submit Registration"}
              </button>

              {registrationMessage && (
                <p className="mt-5 rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-300">
                  {registrationMessage}
                </p>
              )}
            </div>
          </form>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-4 md:p-6">
          <h2 className="text-xl font-bold md:text-2xl">How registration works</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["1", "Search", "Find your Chess SA profile or use New Player."],
              ["2", "Confirm", "Confirm that the player found is you."],
              ["3", "Choose", "Select the tournament and section."],
              ["4", "Submit", "Submit your entry for admin review."],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="rounded-xl border border-white/10 bg-zinc-950 p-5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold">
                  {number}
                </span>

                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-gray-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {openPoster && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setOpenPoster(null)}
            className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-gray-200"
          >
            Close
          </button>

          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-3">
            <div className="mb-3 flex items-center justify-between gap-4 px-2">
              <h3 className="text-lg font-bold text-white">
                {openPoster.tournament_name}
              </h3>
              <span className="shrink-0 rounded-full bg-green-600 px-3 py-1 text-xs font-bold uppercase text-white">
                Registration Open
              </span>
            </div>

            {openPoster.poster_image_url ? (
              <img
                src={openPoster.poster_image_url}
                alt={`${openPoster.tournament_name} poster`}
                className="mx-auto max-h-[78vh] w-auto rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-96 items-center justify-center rounded-xl bg-zinc-900 text-gray-500">
                Tournament poster coming soon
              </div>
            )}
          </div>
        </div>
      )}

      {registrationSubmitted && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-green-500/40 bg-zinc-950 p-6 text-center shadow-2xl shadow-green-950/30 md:p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-4xl font-black text-white shadow-lg shadow-green-500/30">
              ✓
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-green-300">
              Entry Received
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Registration submitted
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              Your entry has been sent for review. PCC will confirm your
              registration and payment status.
            </p>

            {selectedTournament && (
              <div className="mt-5 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
                <p className="font-semibold text-white">{registeringPlayerName}</p>
                <p className="mt-1">{selectedTournament.tournament_name}</p>
                <p className="mt-1 text-gray-400">
                  {selectedSection?.section_name ?? "Section pending"}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setRegistrationSubmitted(false)}
              className="mt-6 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

