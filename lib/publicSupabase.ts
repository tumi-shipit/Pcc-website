import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env.local file."
  );
}

export const publicSupabase = createClient(supabaseUrl, supabasePublishableKey, {
  // Public pages never call Supabase Auth. Supplying an anonymous token provider
  // avoids creating a second GoTrue client beside the authenticated admin client.
  accessToken: async () => null,
});
