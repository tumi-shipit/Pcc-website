import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/serverSupabase";
import { telegramCall, deliverTelegramAlert } from "@/lib/telegramPayments";
import { allowRequest, rateLimitResponse } from "@/lib/serverRateLimit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!await allowRequest(request, "telegram-admin", 20, 600)) return rateLimitResponse();
  const bearer = request.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) return Response.json({ error: "Sign in as super admin." }, { status: 401 });
  const db = createServerSupabase();
  const { data: identity, error: authError } = await db.auth.getUser(bearer.slice(7));
  if (authError || !identity.user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const scoped = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { global: { headers: { Authorization: bearer } }, auth: { persistSession: false } });
  const { data: role, error: roleError } = await scoped.rpc("current_admin_role");
  if (roleError || role !== "super_admin") return Response.json({ error: "Only the super admin can manage payment alerts." }, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    const { data: settings, error } = await db.from("telegram_alert_settings").select("*").eq("id", true).maybeSingle();
    if (error) throw new Error("Install telegram_payment_alerts.sql in Supabase first.");
    if (body?.action === "begin") {
      const bot = await telegramCall<{ username: string }>("getMe");
      const challenge = randomBytes(24).toString("hex");
      const { error: saveError } = await db.from("telegram_alert_settings").upsert({ id: true, challenge, challenge_owner: identity.user.id, challenge_expires_at: new Date(Date.now() + 15 * 60000).toISOString() });
      if (saveError) throw new Error("Could not prepare connection.");
      return Response.json({ link: `https://t.me/${bot.username}?start=${challenge}` });
    }
    if (body?.action === "connect") {
      if (!settings?.challenge || settings.challenge_owner !== identity.user.id || Date.parse(settings.challenge_expires_at) < Date.now()) throw new Error("Create a new connection link first; links expire after 15 minutes.");
      const updates = await telegramCall<Array<{ message?: { text?: string; date?: number; chat?: { id: number; type: string } } }>>("getUpdates", { limit: 100, timeout: 0, allowed_updates: ["message"] });
      const matches = updates.filter(item => item.message?.text === `/start ${settings.challenge}` && item.message?.chat?.type === "private" && (item.message.date || 0) * 1000 > Date.now() - 15 * 60000);
      const chats = [...new Set(matches.map(item => String(item.message!.chat!.id)))];
      if (chats.length !== 1) throw new Error("Open the private connection link, tap Start, then confirm here. No unique matching chat was found.");
      const { data: connected, error: connectError } = await db.from("telegram_alert_settings").update({ chat_id: chats[0], linked_by: identity.user.id, challenge: null, challenge_owner: null, challenge_expires_at: null, updated_at: new Date().toISOString() }).eq("id", true).eq("challenge", settings.challenge).select("id");
      if (connectError || !connected?.length) throw new Error("Could not save Telegram connection. Please retry.");
      return Response.json({ connected: true, message: "Chat connected. Send a test alert next." });
    }
    if (body?.action === "test") {
      if (!settings?.chat_id) throw new Error("Connect your Telegram chat first.");
      await telegramCall("sendMessage", { chat_id: settings.chat_id, text: "PCC PAYMENT ALERT TEST\nThis is a connection test, not a payment.\nIf this appeared on your phone, Telegram delivery is working. Enable sound for this chat in your phone settings.", disable_notification: false });
      return Response.json({ message: "Telegram accepted the test alert. Confirm it arrived on your phone." });
    }
    if (body?.action === "retry") {
      if (!settings?.chat_id) throw new Error("Connect your Telegram chat first.");
      const { data: queued, error: queueError } = await db.from("telegram_payment_alerts").select("id").neq("status", "sent").order("created_at").limit(5);
      if (queueError) throw new Error("Could not read pending alerts.");
      let sent = 0;
      for (const row of queued || []) { if (await deliverTelegramAlert(row.id, settings.chat_id)) sent++; }
      return Response.json({ message: `${sent} pending alert(s) delivered. Refresh status to check remaining alerts.` });
    }
    const { count } = await db.from("telegram_payment_alerts").select("id", { count: "exact", head: true }).neq("status", "sent");
    return Response.json({ connected: Boolean(settings?.chat_id), tokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN), pending: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Telegram setup could not be completed." }, { status: 400 });
  }
}
