import { createServerSupabase } from "@/lib/serverSupabase";
import { allowRequest, rateLimitResponse } from "@/lib/serverRateLimit";
import { authorizeRegistrationRecovery } from "@/lib/registrationRecovery";
import { registrationStatusAt } from "@/lib/registrationSchedule";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await allowRequest(request, "registration-checkout", 8, 600)) return rateLimitResponse();
  const key = process.env.YOCO_SECRET_KEY;
  if (!key) return Response.json({ error: "Payment service is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { registrationId?: string; recoveryToken?: string } | null;
  const registrationId = body?.registrationId ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(registrationId)) return Response.json({ error: "Invalid registration." }, { status: 400 });
  if (!await authorizeRegistrationRecovery(registrationId, body?.recoveryToken)) return Response.json({ error: "Use your private registration recovery link, or contact the organiser." }, { status: 403 });
  const supabase = createServerSupabase();
  const { data: registration } = await supabase.from("registrations").select("id,tournament_id,section_id,payment_status,registration_status,players(full_name),tournaments(tournament_name,entry_fee,online_payment_enabled,registration_status,registration_open_date,registration_close_date,registration_schedule_enabled),tournament_sections(section_name,entry_fee_override)").eq("id", registrationId).single();
  if (!registration) return Response.json({ error: "Registration was not found." }, { status: 404 });
  const tournament = registration.tournaments as unknown as { tournament_name:string;entry_fee:number;online_payment_enabled:boolean;registration_status:string;registration_open_date:string|null;registration_close_date:string|null;registration_schedule_enabled:boolean|null };
  const section = registration.tournament_sections as unknown as { section_name:string;entry_fee_override:number|null };
  const player = registration.players as unknown as { full_name:string };
  if (!tournament || !section || !player || ["Rejected", "Withdrawn"].includes(registration.registration_status)) return Response.json({ error: "This entry cannot accept online payment. Contact the organiser." }, { status: 409 });
  if (!tournament.online_payment_enabled || registrationStatusAt(tournament) !== "Open") return Response.json({ error: "Online payment is not enabled for this tournament." }, { status: 403 });
  if (registration.payment_status === "Paid") return Response.json({ error: "This registration is already paid." }, { status: 409 });
  const amount = section.entry_fee_override ?? tournament.entry_fee;
  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 200) return Response.json({ error: "This entry does not have a valid online payment fee. Please contact the organiser." }, { status: 400 });
  let { data: order, error: lookupError } = await supabase.from("registration_payment_orders").select("id,status,amount").eq("registration_id",registration.id).maybeSingle();
  if (lookupError) return Response.json({ error: "Could not check existing payments. Please try again." }, { status: 503 });
  if (order && Math.round(Number(order.amount) * 100) !== amountCents) return Response.json({ error: "The entry fee has changed since payment started. Contact the organiser before paying." }, { status: 409 });
  if (order?.status === "paid") return Response.json({ error: "This registration is already paid." }, { status: 409 });
  if (!order) {
    const orderId = crypto.randomUUID();
    const { data: created, error: orderError } = await supabase.from("registration_payment_orders").insert({ id:orderId,registration_id:registration.id,tournament_id:registration.tournament_id,amount:Number(amount),status:"created" }).select("id,status,amount").single();
    if (orderError) return Response.json({ error: "Could not prepare payment." }, { status: 500 });
    order = created;
  }
  if (!order) return Response.json({ error: "Could not prepare payment." }, { status: 500 });
  const site=(process.env.NEXT_PUBLIC_SITE_URL||"https://polokwanechessclub.co.za").replace(/\/$/,"");
  const fragment = `#entry=${registrationId}&recovery=${body!.recoveryToken}`;
  const response=await fetch("https://payments.yoco.com/api/checkouts",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":order.id},body:JSON.stringify({amount:amountCents,currency:"ZAR",successUrl:`${site}/register?payment=success${fragment}`,cancelUrl:`${site}/register?payment=cancelled${fragment}`,failureUrl:`${site}/register?payment=failed${fragment}`,clientReferenceId:`REG-${registration.id.slice(0,8).toUpperCase()}`,externalId:order.id,metadata:{orderId:order.id,orderKind:"registration"},lineItems:[{displayName:`${tournament.tournament_name} · ${section.section_name}`,description:`Tournament entry for ${player.full_name}`,quantity:1,pricingDetails:{price:amountCents}}]})});
  const checkout=await response.json().catch(()=>null) as {id?:string;redirectUrl?:string;processingMode?:string}|null;
  if(!response.ok||!checkout?.id||!checkout.redirectUrl)return Response.json({error:"Secure payment could not be started."},{status:502});
  const { error: saveError } = await supabase.from("registration_payment_orders").update({status:"payment_pending",yoco_checkout_id:checkout.id,yoco_mode:checkout.processingMode,updated_at:new Date().toISOString()}).eq("id",order.id).neq("status", "paid");
  if (saveError) return Response.json({ error: "Could not save the payment link. Your entry remains saved; please retry." }, { status: 503 });
  return Response.json({redirectUrl:checkout.redirectUrl});
}
