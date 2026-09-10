import { createServerSupabase } from "@/lib/serverSupabase";

export async function telegramCall<T>(method: "getMe" | "getUpdates" | "sendMessage", body: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram token is not configured. Save TELEGRAM_BOT_TOKEN in Vercel and redeploy.");
  // Never log fetch errors: Telegram puts the secret token in the request URL.
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    const data = await response.json() as { ok?: boolean; result?: T };
    if (!response.ok || !data.ok) throw new Error("Telegram rejected the request.");
    return data.result as T;
  } catch {
    throw new Error("Telegram could not complete the request. Check the bot token, chat access, and try again.");
  }
}

export async function deliverTelegramAlert(id: string, chatId: string) {
  const db = createServerSupabase();
  const { data: claimed, error } = await db.rpc("claim_telegram_payment_alert", { p_id: id });
  if (error) throw new Error("Could not claim alert.");
  const alert = claimed?.[0] as { id: string; message: string } | undefined;
  if (!alert) {
    const { data } = await db.from("telegram_payment_alerts").select("status").eq("id", id).single();
    return data?.status === "sent";
  }
  try {
    await telegramCall("sendMessage", { chat_id: chatId, text: alert.message, disable_notification: false, link_preview_options: { is_disabled: true } });
    const { error: saveError } = await db.from("telegram_payment_alerts").update({ status: "sent", sent_at: new Date().toISOString(), lease_until: null }).eq("id", id);
    if (saveError) throw new Error("Could not record alert delivery.");
    return true;
  } catch {
    await db.from("telegram_payment_alerts").update({ status: "pending", lease_until: null }).eq("id", id).neq("status", "sent");
    return false;
  }
}

export async function notifyTelegramPayment(orderKind: "store" | "membership" | "registration", orderId: string, amountCents: number, currency: string, mode: string) {
  // Sandbox events must never look like real receipts on the owner's phone.
  if (mode !== "live" || !process.env.TELEGRAM_BOT_TOKEN) return true;
  const db = createServerSupabase();
  const { data: settings, error: settingsError } = await db.from("telegram_alert_settings").select("chat_id").eq("id", true).maybeSingle();
  if (settingsError) throw new Error("Could not check Telegram settings.");
  if (!settings?.chat_id) return true; // Disabled until the owner explicitly pairs a chat.
  const label = { store: "Store order", membership: "Membership", registration: "Tournament entry" }[orderKind];
  const path = { store: "/admin/store-orders", membership: "/admin/membership", registration: "/admin/payments" }[orderKind];
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://polokwanechessclub.co.za").replace(/\/$/, "");
  const message = `PCC — PAYMENT RECEIVED\n${currency} ${(amountCents / 100).toFixed(2)}\n${label}\nReference: ${orderId}\nView details: ${site}${path}`;
  const { error } = await db.from("telegram_payment_alerts").upsert({ order_kind: orderKind, order_id: orderId, message }, { onConflict: "order_kind,order_id", ignoreDuplicates: true });
  if (error) throw new Error("Could not queue payment alert.");
  const { data } = await db.from("telegram_payment_alerts").select("id").eq("order_kind", orderKind).eq("order_id", orderId).single();
  if (!data) throw new Error("Queued payment alert not found.");
  return deliverTelegramAlert(data.id, settings.chat_id);
}
