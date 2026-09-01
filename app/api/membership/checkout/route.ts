import { createServerSupabase } from "@/lib/serverSupabase";
import { allowRequest, rateLimitResponse } from "@/lib/serverRateLimit";

export const runtime = "nodejs";

function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function POST(request: Request) {
  if (process.env.STORE_CHECKOUT_ENABLED !== "true") return Response.json({ error: "Online membership payment is not open." }, { status: 503 });
  if (!await allowRequest(request, "membership-checkout", 6, 600)) return rateLimitResponse();
  const key = process.env.YOCO_SECRET_KEY;
  if (!key) return Response.json({ error: "Payment service is unavailable." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const planId = clean(body.planId, 80), name = clean(body.memberName, 120), email = clean(body.memberEmail, 180).toLowerCase(), phone = clean(body.memberPhone, 40), chessSaId = clean(body.chessSaId, 40);
  if (!/^[0-9a-f-]{36}$/i.test(planId) || !name || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 7) return Response.json({ error: "Enter a valid name, email and phone number." }, { status: 400 });
  const supabase = createServerSupabase();
  const { data: plan } = await supabase.from("membership_plans").select("id,name,duration_months,price,published").eq("id", planId).eq("published", true).maybeSingle();
  if (!plan || Number(plan.price) < 2) return Response.json({ error: "This membership plan is unavailable." }, { status: 409 });
  const id = crypto.randomUUID(), orderNumber = `PCC-MEM-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`, amount = Number(plan.price), amountCents = Math.round(amount * 100);
  const { error } = await supabase.from("membership_orders").insert({ id, order_number: orderNumber, plan_id: plan.id, plan_name: plan.name, duration_months: plan.duration_months, amount, member_name: name, member_email: email, member_phone: phone, chess_sa_id: chessSaId || null });
  if (error) return Response.json({ error: "Could not prepare membership payment." }, { status: 500 });
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://polokwanechessclub.co.za").replace(/\/$/, "");
  const response = await fetch("https://payments.yoco.com/api/checkouts", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": id }, body: JSON.stringify({ amount: amountCents, currency: "ZAR", successUrl: `${site}/membership/payment/success?order=${encodeURIComponent(orderNumber)}`, cancelUrl: `${site}/membership?cancelled=1`, failureUrl: `${site}/membership?failed=1`, clientReferenceId: orderNumber, externalId: id, metadata: { orderId: id, orderKind: "membership" }, lineItems: [{ displayName: plan.name, quantity: 1, pricingDetails: { price: amountCents } }] }) });
  const checkout = await response.json().catch(() => null) as { id?: string; redirectUrl?: string; processingMode?: string } | null;
  if (!response.ok || !checkout?.id || !checkout.redirectUrl) { await supabase.from("membership_orders").update({ status: "failed" }).eq("id", id); return Response.json({ error: "The secure payment could not be started." }, { status: 502 }); }
  await supabase.from("membership_orders").update({ status: "payment_pending", yoco_checkout_id: checkout.id, yoco_mode: checkout.processingMode }).eq("id", id);
  return Response.json({ redirectUrl: checkout.redirectUrl });
}
