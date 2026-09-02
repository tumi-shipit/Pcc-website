import { createHmac, timingSafeEqual } from "node:crypto";

import { createServerSupabase } from "@/lib/serverSupabase";

export const runtime = "nodejs";

type YocoPaymentEvent = {
  id?: string;
  type?: "payment.succeeded" | "payment.failed";
  payload?: {
    id?: string;
    amount?: number;
    currency?: string;
    mode?: "test" | "live";
    metadata?: Record<string, unknown> | null;
  };
};

function validSignature(rawBody: string, request: Request, secret: string) {
  const webhookId = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signatureHeader = request.headers.get("webhook-signature");
  if (!webhookId || !timestamp || !signatureHeader || !secret.startsWith("whsec_")) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 180) return false;

  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", secretBytes)
    .update(`${webhookId}.${timestamp}.${rawBody}`)
    .digest();

  return signatureHeader.split(" ").some((versionedSignature) => {
    const [version, value] = versionedSignature.split(",", 2);
    if (version !== "v1" || !value) return false;
    try {
      const received = Buffer.from(value, "base64");
      return received.length === expected.length && timingSafeEqual(received, expected);
    } catch {
      return false;
    }
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.YOCO_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response("Webhook not configured", { status: 503 });

  const rawBody = await request.text();
  if (!validSignature(rawBody, request, webhookSecret)) {
    return new Response("Invalid webhook signature", { status: 403 });
  }

  let event: YocoPaymentEvent;
  try {
    event = JSON.parse(rawBody) as YocoPaymentEvent;
  } catch {
    return new Response("Invalid webhook body", { status: 400 });
  }

  const orderId = typeof event.payload?.metadata?.orderId === "string"
    ? event.payload.metadata.orderId
    : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return new Response("Order reference missing", { status: 400 });
  }

  const supabase = createServerSupabase();
  const requestedKind = event.payload?.metadata?.orderKind;
  const orderKind = requestedKind === "membership" ? "membership" : requestedKind === "registration" ? "registration" : "store";
  if (event.type === "payment.succeeded") {
    const completionFunction = orderKind === "membership" ? "complete_membership_order" : orderKind === "registration" ? "complete_registration_payment_order" : "complete_store_order";
    const { data, error } = await supabase.rpc(completionFunction, {
      p_order_id: orderId,
      p_payment_id: event.payload?.id ?? "",
      p_mode: event.payload?.mode ?? "test",
      p_amount_cents: event.payload?.amount ?? 0,
      p_currency: event.payload?.currency ?? "",
    });
    if (error || data !== true) {
      console.error(`${orderKind} payment validation failed`, event.id, error?.message);
      return new Response("Order validation failed", { status: 409 });
    }
  } else if (event.type === "payment.failed") {
    const { error } = await supabase
      .from(orderKind === "membership" ? "membership_orders" : orderKind === "registration" ? "registration_payment_orders" : "store_orders")
      .update({ status: "failed", yoco_payment_id: event.payload?.id ?? null })
      .eq("id", orderId)
      .neq("status", "paid");
    if (error) return new Response("Could not update order", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
