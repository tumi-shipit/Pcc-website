"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type SearchMethod = "fide" | "chesssa" | "surname";

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

type NewPlayerForm = {
  full_name: string;
  fide_id: string;
  chess_sa_id: string;
  date_of_birth: string;
  gender: string;
  club: string;
  province: string;
  rating: string;
  email: string;
  phone: string;
};

const emptyNewPlayer: NewPlayerForm = {
  full_name: "",
  fide_id: "",
  chess_sa_id: "",
  date_of_birth: "",
  gender: "",
  club: "",
  province: "",
  rating: "",
  email: "",
  phone: "",
};

function calculateAge(dateOfBirth: string) {
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
  const [searchMethod, setSearchMethod] = useState<SearchMethod>("fide");
  const [searchValue, setSearchValue] = useState("");
  const [searchBirthDate, setSearchBirthDate] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState<NewPlayerForm>(emptyNewPlayer);
  const [creatingPlayer, setCreatingPlayer] = useState(false);

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

  const playerAge = calculateAge(player?.date_of_birth ?? "");

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
    setPlayer(null);
    setShowNewPlayerForm(false);
    setRegistrationMessage("");

    const { data, error } = await supabase.rpc(
      "find_player_for_registration",
      {
        search_method: searchMethod,
        search_value: searchValue.trim(),
        birth_date: searchBirthDate,
      }
    );

    if (error) {
      setSearchMessage("Search failed. Please check your details and try again.");
      setSearching(false);
      return;
    }

    const foundPlayer = data?.[0] as Player | undefined;

    if (foundPlayer) {
      setPlayer(foundPlayer);
      setSearchMessage("Player profile found. Please confirm your details.");
    } else {
      setNewPlayer({
        ...emptyNewPlayer,
        full_name: searchMethod === "surname" ? searchValue.trim() : "",
        fide_id: searchMethod === "fide" ? searchValue.trim() : "",
        chess_sa_id: searchMethod === "chesssa" ? searchValue.trim() : "",
        date_of_birth: searchBirthDate,
      });

      setShowNewPlayerForm(true);
      setSearchMessage(
        "No matching profile was found. Create a new player profile below."
      );
    }

    setSearching(false);
  }

  async function handleCreatePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreatingPlayer(true);
    setRegistrationMessage("");

    const { data, error } = await supabase
      .from("players")
      .insert({
        full_name: newPlayer.full_name.trim(),
        fide_id: newPlayer.fide_id.trim() || null,
        chess_sa_id: newPlayer.chess_sa_id.trim() || null,
        date_of_birth: newPlayer.date_of_birth,
        gender: newPlayer.gender,
        club: newPlayer.club.trim() || null,
        province: newPlayer.province.trim() || null,
        rating: newPlayer.rating ? Number(newPlayer.rating) : null,
        email: newPlayer.email.trim(),
        phone: newPlayer.phone.trim(),
        verification_status: "Pending",
      })
      .select(
        "id, full_name, fide_id, chess_sa_id, date_of_birth, gender, club, province, rating, email, phone, verification_status"
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        setRegistrationMessage(
          "A player profile with that FIDE ID or Chess SA ID already exists. Please search again."
        );
      } else {
        setRegistrationMessage(
          "Could not create your profile. Please check the details and try again."
        );
      }

      setCreatingPlayer(false);
      return;
    }

    setPlayer(data as Player);
    setShowNewPlayerForm(false);
    setRegistrationMessage(
      "Player profile created successfully. It is pending verification, but you can continue with registration."
    );
    setCreatingPlayer(false);
  }

  async function handleRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!player || !selectedTournamentId || !selectedSectionId) {
      setRegistrationMessage(
        "Please confirm your player profile, tournament and section first."
      );
      return;
    }

    if (paymentChoice === "proof" && !proofFile) {
      setRegistrationMessage("Please choose your proof of payment file.");
      return;
    }

    setSubmittingRegistration(true);
    setRegistrationMessage("");

    let proofOfPaymentUrl: string | null = null;

    if (paymentChoice === "proof" && proofFile) {
      const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `${player.id}/${selectedTournamentId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("proof-of-payments")
        .upload(filePath, proofFile, {
          upsert: false,
        });

      if (uploadError) {
        setRegistrationMessage(
          "Your proof of payment could not be uploaded. Please try again."
        );
        setSubmittingRegistration(false);
        return;
      }

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
    setSubmittingRegistration(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-28 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.22),_transparent_38%)]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
            PCC Tournament Services
          </p>

          <h1 className="mt-4 text-4xl font-bold md:text-6xl">
            Register for a Tournament
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-300">
            Search for your player profile, choose an open tournament and
            section, then submit your entry.
          </p>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            Only tournaments managed through Polokwane Chess Club Tournament
            Services are listed here.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl md:p-10">
          <h2 className="text-2xl font-bold">1. Find your player profile</h2>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            Search using an ID or surname together with your date of birth.
            Player information is not publicly browsable.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["fide", "Search by FIDE ID"],
              ["chesssa", "Search by Chess SA ID"],
              ["surname", "Search by surname"],
            ].map(([method, label]) => (
              <button
                key={method}
                type="button"
                onClick={() => setSearchMethod(method as SearchMethod)}
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
                {searchMethod === "fide"
                  ? "FIDE ID"
                  : searchMethod === "chesssa"
                    ? "Chess SA ID"
                    : "Surname"}
              </label>

              <input
                type="text"
                required
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={
                  searchMethod === "fide"
                    ? "Enter your FIDE ID"
                    : searchMethod === "chesssa"
                      ? "Enter your Chess SA ID"
                      : "Enter your surname"
                }
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
              />
            </div>

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

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={searching}
                className="w-full rounded-lg bg-red-600 px-5 py-4 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searching ? "Searching..." : "Search Player Profile"}
              </button>
            </div>
          </form>

          {searchMessage && (
            <p className="mt-5 rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-300">
              {searchMessage}
            </p>
          )}
        </div>

        {player && (
          <div className="mt-10 rounded-2xl border border-green-500/30 bg-green-500/10 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300">
              Player profile confirmed
            </p>

            <h2 className="mt-3 text-2xl font-bold">{player.full_name}</h2>

            <div className="mt-6 grid gap-4 text-sm text-gray-200 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-white">FIDE ID:</span>{" "}
                {player.fide_id || "Not supplied"}
              </p>
              <p>
                <span className="font-semibold text-white">Chess SA ID:</span>{" "}
                {player.chess_sa_id || "Not supplied"}
              </p>
              <p>
                <span className="font-semibold text-white">Date of birth:</span>{" "}
                {player.date_of_birth}
              </p>
              <p>
                <span className="font-semibold text-white">Age:</span>{" "}
                {playerAge ?? "Not available"}
              </p>
              <p>
                <span className="font-semibold text-white">Gender:</span>{" "}
                {player.gender}
              </p>
              <p>
                <span className="font-semibold text-white">Club:</span>{" "}
                {player.club || "Not supplied"}
              </p>
              <p>
                <span className="font-semibold text-white">Province:</span>{" "}
                {player.province || "Not supplied"}
              </p>
              <p>
                <span className="font-semibold text-white">Rating:</span>{" "}
                {player.rating ?? "Not supplied"}
              </p>
              <p>
                <span className="font-semibold text-white">Email:</span>{" "}
                {player.email}
              </p>
              <p>
                <span className="font-semibold text-white">Phone:</span>{" "}
                {player.phone}
              </p>
            </div>

            {player.verification_status !== "Verified" && (
              <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                This profile is pending verification. You may submit your
                registration, but an administrator will verify your details.
              </p>
            )}
          </div>
        )}

        {showNewPlayerForm && (
          <form
            onSubmit={handleCreatePlayer}
            className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 md:p-8"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
              New player profile
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Create your player profile
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              Your profile will be marked as pending verification. Please enter
              accurate details.
            </p>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {[
                ["full_name", "Full name", "text", true],
                ["fide_id", "FIDE ID (if available)", "text", false],
                ["chess_sa_id", "Chess SA ID (if available)", "text", false],
                ["date_of_birth", "Date of birth", "date", true],
                ["club", "Club", "text", false],
                ["province", "Province", "text", false],
                ["rating", "Rating", "number", false],
                ["email", "Email address", "email", true],
                ["phone", "Phone number", "tel", true],
              ].map(([field, label, type, required]) => (
                <div key={field}>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">
                    {label}
                  </label>

                  <input
                    type={type}
                    required={required === true}
                    value={newPlayer[field as keyof NewPlayerForm]}
                    onChange={(event) =>
                      setNewPlayer((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                  />
                </div>
              ))}

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
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingPlayer}
              className="mt-7 rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingPlayer ? "Creating profile..." : "Save Player Profile"}
            </button>
          </form>
        )}

        {player && (
          <form
            onSubmit={handleRegistration}
            className="mt-10 rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8"
          >
            <h2 className="text-2xl font-bold">2. Choose your tournament</h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
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
                    Submit your registration first. Payment will remain pending.
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
                ? "Submitting registration..."
                : "Submit Tournament Registration"}
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
              ["1", "Search", "Confirm your player profile securely."],
              ["2", "Choose", "Select an open tournament and section."],
              ["3", "Pay", "Upload proof of payment or choose pay later."],
              ["4", "Confirm", "Your entry is submitted for review."],
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