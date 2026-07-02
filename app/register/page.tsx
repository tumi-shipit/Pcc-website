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

type Player = {
  id: string;
  full_name: string;
  fide_id: string | null;
  chess_sa_id: string | null;
  date_of_birth: string;
  gender: string;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string;
  phone: string;
  verification_status: "Verified" | "Pending" | "Rejected";
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
          "id, tournament_name, start_date, end_date, venue, province, entry_fee, payment_details"
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
      setSearchMessage("Search failed. Please check your details and try again.");
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

  async function getOrCreateTournamentPlayer(chessPlayer: ChessSaPlayer) {
    const { data: existingData } = await supabase.rpc(
      "find_player_for_registration",
      {
        search_method: "chesssa",
        search_value: chessPlayer.chess_sa_id,
        birth_date: chessPlayer.date_of_birth ?? "1900-01-01",
      }
    );

    const existingPlayer = existingData?.[0] as Player | undefined;

    if (existingPlayer) {
      const { data: updatedPlayer, error: updateError } = await supabase
        .from("players")
        .update({
          email: email.trim(),
          phone: phone.trim(),
          club: club.trim() || null,
          province: province.trim() || null,
          rating:
            chessPlayer.standard_rating ??
            chessPlayer.rapid_rating ??
            chessPlayer.blitz_rating ??
            existingPlayer.rating,
        })
        .eq("id", existingPlayer.id)
        .select(
          "id, full_name, fide_id, chess_sa_id, date_of_birth, gender, club, province, rating, email, phone, verification_status"
        )
        .single();

      if (updateError) throw updateError;
      return updatedPlayer as Player;
    }

    const { data: createdPlayer, error: createError } = await supabase
      .from("players")
      .insert({
        full_name: chessPlayer.full_name,
        fide_id: null,
        chess_sa_id: chessPlayer.chess_sa_id,
        date_of_birth: chessPlayer.date_of_birth ?? "1900-01-01",
        gender: chessPlayer.gender || "Not supplied",
        club: club.trim() || null,
        province: province.trim() || null,
        rating:
          chessPlayer.standard_rating ??
          chessPlayer.rapid_rating ??
          chessPlayer.blitz_rating ??
          null,
        email: email.trim(),
        phone: phone.trim(),
        verification_status: "Pending",
      })
      .select(
        "id, full_name, fide_id, chess_sa_id, date_of_birth, gender, club, province, rating, email, phone, verification_status"
      )
      .single();

    if (createError) throw createError;
    return createdPlayer as Player;
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
      const player = await getOrCreateTournamentPlayer(selectedChessSaPlayer);

      let proofOfPaymentUrl: string | null = null;

      if (paymentChoice === "proof" && proofFile) {
        const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const filePath = `${player.id}/${selectedTournamentId}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("proof-of-payments")
          .upload(filePath, proofFile, {
            upsert: false,
          });

        if (uploadError) throw uploadError;

        proofOfPaymentUrl = filePath;
      }

      const { error } = await supabase.from("registrations").insert({
        player_id: player.id,
        tournament_id: selectedTournamentId,
        section_id: selectedSectionId,
        payment_status:
          paymentChoice === "proof" ? "Proof Submitted" : "Pending",
        proof_of_payment_url: proofOfPaymentUrl,
        registration_status: "Pending",
      });

      if (error) {
        if (error.code === "23505") {
          setRegistrationMessage(
            "You are already registered for this tournament. Contact the organiser if you need changes."
          );
        } else {
          setRegistrationMessage(
            "Your registration could not be saved. Please try again."
          );
        }

        setSubmittingRegistration(false);
        return;
      }

      setRegistrationMessage(
        "Registration submitted successfully. PCC Tournament Services will review your entry and payment."
      );
    } catch {
      setRegistrationMessage(
        "Your registration could not be completed. Please check your details and try again."
      );
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
          <form
            onSubmit={handleRegistration}
            className="mt-10 rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8"
          >
            <h2 className="text-2xl font-bold">2. Complete your entry</h2>

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
                <input
                  type="text"
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                  Open tournament
                </label>

                <select
                  required
                  value={selectedTournamentId}
                  onChange={(event) =>
                    setSelectedTournamentId(event.target.value)
                  }
                  disabled={loadingTournaments}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500 disabled:opacity-60"
                >
                  <option value="">
                    {loadingTournaments
                      ? "Loading tournaments..."
                      : "Select a tournament"}
                  </option>

                  {tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.tournament_name} — {tournament.start_date}
                    </option>
                  ))}
                </select>
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
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500 disabled:opacity-60"
                >
                  <option value="">
                    {loadingSections
                      ? "Loading sections..."
                      : "Select a section"}
                  </option>

                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.section_name}
                      {section.minimum_age !== null ||
                      section.maximum_age !== null
                        ? ` (Age ${section.minimum_age ?? "?"}-${
                            section.maximum_age ?? "?"
                          })`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTournament && (
              <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-gray-300">
                <p>
                  <span className="font-semibold text-white">Venue:</span>{" "}
                  {selectedTournament.venue}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-white">Entry fee:</span>{" "}
                  {formatMoney(entryFee)}
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

            <div className="mt-8 border-t border-white/10 pt-8">
              <h3 className="text-lg font-bold">3. Payment option</h3>

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
            </div>

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
    </main>
  );
}
