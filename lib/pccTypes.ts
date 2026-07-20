// Path: lib/pccTypes.ts

export type UUID = string;

export type Player = {
  id: UUID;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string | null;
  phone: string | null;
  verification_status: string | null;
  profile_photo_url: string | null;
  biography: string | null;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PlayerLite = Pick<
  Player,
  | "id"
  | "full_name"
  | "chess_sa_id"
  | "fide_id"
  | "club"
  | "province"
  | "rating"
  | "verification_status"
  | "profile_photo_url"
  | "title"
>;

export type Tournament = {
  id: UUID;
  tournament_name: string;
  description: string | null;
  tournament_report: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: string;
  entry_fee: number;
  poster_image_url: string | null;
  payment_details: string | null;
  chess_results_url?: string | null;
  arbiter_player_id?: string | null;
  organiser_player_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TournamentLite = Pick<
  Tournament,
  "id" | "tournament_name" | "start_date" | "venue" | "province" | "registration_status"
>;

export type TournamentSection = {
  id: UUID;
  tournament_id?: UUID;
  section_name: string;
  minimum_birth_year?: number | null;
  maximum_birth_year?: number | null;
  minimum_rating?: number | null;
  maximum_rating?: number | null;
  gender_restriction?: string | null;
  entry_fee_override: number | null;
  maximum_players: number | null;
};

export type TournamentStats = {
  tournament_id: UUID;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

export type Registration = {
  id: UUID;
  player_id: UUID | null;
  tournament_id: UUID | null;
  section_id: UUID | null;
  payment_status: string | null;
  proof_of_payment_url: string | null;
  registration_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TournamentResult = {
  id: UUID;
  tournament_id: UUID;
  section_id: UUID | null;
  player_id: UUID | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
  created_at?: string | null;
  players?: PlayerLite | null;
  tournament_sections?: Pick<TournamentSection, "id" | "section_name"> | null;
  tournaments?: TournamentLite | null;
};

export type TournamentOfficial = {
  id: UUID;
  tournament_id: UUID;
  player_id: UUID;
  role: string;
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
  players?: PlayerLite | null;
  tournaments?: TournamentLite | null;
};

export type NewsPost = {
  id: UUID;
  title: string;
  excerpt: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type GalleryImage = {
  id: UUID;
  tournament_id: UUID;
  image_url: string;
  caption: string | null;
  display_order: number | null;
  created_at: string;
};

export type ImportSession = {
  id: UUID;
  import_type: string;
  source_page: string | null;
  tournament_id: UUID | null;
  file_name: string | null;
  status: string;
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  failed_rows: number;
  summary?: Record<string, unknown> | null;
  created_at: string;
  tournaments: Pick<Tournament, "id" | "tournament_name"> | null;
};

export type ImportSessionRow = {
  id: UUID;
  import_session_id: UUID;
  row_number: number | null;
  imported_name: string | null;
  matched_player_id: UUID | null;
  matched_player_name: string | null;
  confidence_score: number | null;
  status: string | null;
  message: string | null;
  row_data: Record<string, unknown> | null;
  created_at: string;
};
