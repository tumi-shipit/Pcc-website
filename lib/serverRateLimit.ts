import { createHash } from "node:crypto";
import { createServerSupabase } from "@/lib/serverSupabase";

function requestIdentity(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 32);
}

export async function allowRequest(request: Request, scope: string, limit: number, windowSeconds: number) {
  const { data, error } = await createServerSupabase().rpc("consume_request_quota", {
    p_bucket_key: `${scope}:${requestIdentity(request)}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Rate-limit check failed", scope, error.message);
    return false;
  }
  return data === true;
}

export function rateLimitResponse() {
  return Response.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429, headers: { "Retry-After": "300" } });
}
