import { createServerSupabase } from "@/lib/serverSupabase";

export async function authorizeRegistrationRecovery(registrationId: unknown, token: unknown) {
  if (typeof registrationId !== "string" || !/^[0-9a-f-]{36}$/i.test(registrationId) || typeof token !== "string" || !/^[0-9a-f]{64}$/i.test(token)) return false;
  const { data, error } = await createServerSupabase().from("registration_recovery")
    .select("registration_id").eq("registration_id", registrationId).eq("token", token).maybeSingle();
  return !error && Boolean(data);
}
