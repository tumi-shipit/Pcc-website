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
};

type TournamentSection = {
  id: string;
  section_name: string;
  minimum_age: number | null;
  maximum_age: number | null;
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

function getSectionLabel(section: TournamentSection) {
  return section.section_name;
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

export default function RegisterPage() {
  const [searchMethod, setSearchMethod] = useState<SearchMethod>("surname");
  const [searchValue, setSearchValue] = useState("");
  const [searchBirthDate, setSearchBirthDate] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  const [matches, setMatches] = useState<ChessSaPlayer[]>([]);
  const [selectedChessSaPlayer, setSelectedChessSaPlayer] =
    useState<ChessSaPlayer | null>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [club, setClub] = useState("");
  const [province, setProvince] = useState("");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [sections, setSections] = useState<TournamentSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [paymentChoice, setPaymentChoice] = useState<"later" | "proof">(
    "later"
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
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

  const selectedPlayerAge = calculateAge(selectedChessSaPlayer?.date_of_birth ?? null);

  const entryFee =
    selectedSection?.entry_fee_override ?? selectedTournament?.entry_fee ?? 0;

  useEffect(() => {
    async function loadOpenTournaments() {
      setLoadingTournaments(true);

      const { data, error } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, start_date, end_date, venue, province, entry_fee, payment_details, poster_image_url"
        )
        .order("start_date", { ascending: true });

      if (error) {
        setSearchMessage("Could not load open tournaments. Please try again.");
      } else {
        setTournaments((data ?? []) as Tournament[]);
      }

      setLoadingTournaments(false);
    }

    loadOpenTournaments();
  }, []);

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
          "id, section_name, minimum_age, maximum_age, gender_restriction, entry_fee_override, maximum_players"
        )
        .eq("tournament_id", selectedTournamentId)
        .order("maximum_age", { ascending: true, nullsFirst: false })
        .order("section_name", { ascending: true });

      if (error) {
        setRegistrationMessage(
          "Could not load tournament sections. Please try again."
        );
      } else {
        setSections((data ?? []) as TournamentSection[]);
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
      setSearchMessage("Chess SA player found. Please confirm your details.");
    } else {
      setSearchMessage(
        `${results.length} matching players found. Please select the correct player.`
      );
    }

    setSearching(false);
  }

  function choosePlayer(player: ChessSaPlayer) {
    setSelectedChessSaPlayer(player);
    setSearchMessage("Chess SA player selected. Continue with registration.");
  }



  async function handleRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedChessSaPlayer || !selectedTournamentId || !selectedSectionId) {
      setRegistrationMessage(
        "Please confirm the player, tournament and section first."
      );
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

    setSubmittingRegistration(true);
    setRegistrationMessage("");

    try {
      let proofOfPaymentUrl: string | null = null;

      if (paymentChoice === "proof" && proofFile) {
        const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const filePath = `${selectedChessSaPlayer.chess_sa_id}/${selectedTournamentId}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("proof-of-payments")
          .upload(filePath, proofFile, {
            upsert: false,
          });

        if (uploadError) throw uploadError;

        proofOfPaymentUrl = filePath;
      }

      const bestRating =
        selectedChessSaPlayer.standard_rating ??
        selectedChessSaPlayer.rapid_rating ??
        selectedChessSaPlayer.blitz_rating ??
        null;

      const { error } = await supabase.rpc("submit_tournament_registration", {
        p_full_name: selectedChessSaPlayer.full_name,
        p_chess_sa_id: selectedChessSaPlayer.chess_sa_id,
        p_date_of_birth: selectedChessSaPlayer.date_of_birth,
        p_gender: selectedChessSaPlayer.gender,
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error.";

      setRegistrationMessage(`Your registration could not be completed: ${errorMessage}`);
    } finally {
      setSubmittingRegistration(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-28 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.22),_transparent_38%)]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
            PCC Tournament Services
          </p>

          <h1 className="mt-4 text-4xl font-bold md:text-6xl">
            Tournament Entry Portal
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-300">
            Find your Chess SA profile, choose an open tournament and section,
            then submit your tournament entry.
          </p>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            This is for tournament entries only. PCC membership profiles will be
            handled separately under Join PCC.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl md:p-10">
          <h2 className="text-2xl font-bold">1. Find your Chess SA profile</h2>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            Most players do not know their Chess SA ID, so surname and date of
            birth is the recommended search method.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["surname", "Search by surname + date of birth"],
                ["chesssa", "Search by Chess SA ID"],
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
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  searchMethod === method
                    ? "border-red-500 bg-red-600 text-white"
                    : "border-white/10 bg-zinc-950 text-gray-300 hover:border-red-500/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="mt-8 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-200">
                {searchMethod === "surname" ? "Surname" : "Chess SA ID"}
              </label>

              <input
                type="text"
                required
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={
                  searchMethod === "surname"
                    ? "Enter your surname"
                    : "Enter your Chess SA ID"
                }
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
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
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
              </div>
            )}

            <div className={searchMethod === "surname" ? "md:col-span-2" : ""}>
              <button
                type="submit"
                disabled={searching}
                className="w-full rounded-lg bg-red-600 px-5 py-4 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searching ? "Searching..." : "Find My Chess SA Profile"}
              </button>
            </div>
          </form>

          {searchMessage && (
            <p className="mt-5 rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-300">
              {searchMessage}
            </p>
          )}
        </div>

        {matches.length > 1 && !selectedChessSaPlayer && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <h2 className="text-2xl font-bold">Select your profile</h2>

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
                    Standard: {match.standard_rating ?? "Not rated"} • Rapid:{" "}
                    {match.rapid_rating ?? "Not rated"} • Blitz:{" "}
                    {match.blitz_rating ?? "Not rated"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedChessSaPlayer && (
          <div className="mt-10 rounded-2xl border border-green-500/30 bg-green-500/10 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300">
              Chess SA profile found
            </p>

            <h2 className="mt-3 text-2xl font-bold">
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

        {selectedChessSaPlayer && (
          <form onSubmit={handleRegistration} className="mt-10 space-y-10">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8">
              <h2 className="text-2xl font-bold">2. Contact details</h2>

              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
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
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Province
                  </label>

                  <select
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
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

            <div className="rounded-2xl border border-red-500/30 bg-zinc-900 p-6 md:p-8">
              <div className="mb-6 border-l-4 border-red-500 pl-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Step 3
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Tournament Selection
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Choose the tournament you are entering and select your section.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Open tournament
                  </label>

                  <div className="grid gap-4">
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
                            className="relative block h-48 w-full overflow-hidden bg-black"
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

                            <span className="absolute left-3 top-3 rounded-full bg-green-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                              Open
                            </span>

                            <span
                              className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                isSelected
                                  ? "bg-red-600 text-white"
                                  : "bg-black/80 text-white"
                              }`}
                            >
                              {isSelected ? "Selected" : "View Poster"}
                            </span>
                          </button>

                          <div className="p-5">
                            <p className="text-lg font-bold text-white">
                              {tournament.tournament_name}
                            </p>

                            <div className="mt-4 space-y-2 text-sm text-gray-400">
                              <p>📅 {formatDate(tournament.start_date)}</p>
                              <p>📍 {tournament.venue}</p>
                              <p className="font-semibold text-red-300">
                                💰 {formatMoney(tournament.entry_fee)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedTournamentId(tournament.id)}
                              className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-bold transition ${
                                isSelected
                                  ? "bg-red-600 text-white"
                                  : "bg-white text-black hover:bg-gray-200"
                              }`}
                            >
                              {isSelected ? "✓ Selected" : "Select Tournament"}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {loadingTournaments && (
                      <p className="rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                        Loading tournaments...
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

                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {getSectionLabel(section)}
                      </option>
                    ))}
                  </select>

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

            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8">
              <h3 className="text-2xl font-bold">4. Payment option</h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                    Submit your entry first. Payment will remain pending.
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
                    Upload a clear payment confirmation for admin review.
                  </span>
                </button>
              </div>

              {paymentChoice === "proof" && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Proof of payment
                  </label>

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

              <button
                type="submit"
                disabled={submittingRegistration}
                className="mt-8 w-full rounded-lg bg-red-600 px-5 py-4 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingRegistration
                  ? "Submitting entry..."
                  : "Submit Tournament Entry"}
              </button>

              {registrationMessage && (
                <p className="mt-5 rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-300">
                  {registrationMessage}
                </p>
              )}
            </div>
          </form>
        )}

        <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8">
          <h2 className="text-2xl font-bold">How registration works</h2>

          <div className="mt-7 grid gap-5 md:grid-cols-4">
            {[
              ["1", "Search", "Find your Chess SA profile."],
              ["2", "Confirm", "Confirm that the player found is you."],
              ["3", "Choose", "Select the tournament and section."],
              ["4", "Submit", "Submit your entry for admin review."],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="rounded-xl border border-white/10 bg-zinc-950 p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-bold">
                  {number}
                </span>

                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">{text}</p>
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

    </main>
  );
}
