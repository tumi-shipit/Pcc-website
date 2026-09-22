import { authorizeRegistrationRecovery } from "@/lib/registrationRecovery";
import { createServerSupabase } from "@/lib/serverSupabase";
import { allowRequest, rateLimitResponse } from "@/lib/serverRateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await allowRequest(request, "registration-recovery", 30, 600)) return rateLimitResponse();
  const form = await request.formData().catch(() => null);
  const id = form?.get("registrationId");
  const token = form?.get("recoveryToken");
  if (!await authorizeRegistrationRecovery(id, token)) return Response.json({ error: "This recovery link is invalid. Please contact the organiser." }, { status: 403 });
  const db = createServerSupabase();
  const { data: standardEntry, error } = await db.from("registrations").select("id,payment_status,registration_status,tournaments(registration_payment_required)").eq("id", id).single();
  const onlineResult = standardEntry ? null : await db.from("online_registrations").select("id,payment_status,registration_status,tournaments(registration_payment_required)").eq("id", id).single();
  const entry = standardEntry ?? onlineResult?.data;
  if ((error && onlineResult?.error) || !entry) return Response.json({ error: "Could not check your entry. Please try again." }, { status: 503 });
  const event = entry.tournaments as unknown as { registration_payment_required: boolean };
  const onlineOnly = event?.registration_payment_required === true;
  const allowsProof = !onlineResult?.data && !onlineOnly;
  if (form?.get("action") === "proof") {
    if (!allowsProof) return Response.json({ error: "Proof uploads are not available for this entry. Use online payment or contact the organiser." }, { status: 403 });
    if (entry.payment_status === "Paid" || ["Rejected", "Withdrawn"].includes(entry.registration_status)) return Response.json({ error: "This entry no longer accepts payment proof." }, { status: 409 });
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 4 * 1024 * 1024) return Response.json({ error: "Choose a PDF, JPEG or PNG no larger than 4 MB." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "jpg" : bytes.slice(0,8).join(",") === "137,80,78,71,13,10,26,10" ? "png" : new TextDecoder().decode(bytes.slice(0,5)) === "%PDF-" ? "pdf" : null;
    if (!extension) return Response.json({ error: "Only PDF, JPEG and PNG files are accepted." }, { status: 400 });
    const path = `registration-recovery/${entry.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage.from("proof-of-payments").upload(path, bytes, { contentType: extension === "pdf" ? "application/pdf" : `image/${extension === "jpg" ? "jpeg" : "png"}` });
    if (uploadError) return Response.json({ error: "Proof could not be uploaded. Please try again." }, { status: 503 });
    // Never overwrite a payment confirmed while the upload was running.
    const { data: updated, error: updateError } = await db.from("registrations").update({ proof_of_payment_url: path, payment_status: "Proof Submitted", updated_at: new Date().toISOString() }).eq("id", entry.id).neq("payment_status", "Paid").not("registration_status", "in", "(Rejected,Withdrawn)").select("id");
    if (updateError || !updated?.length) {
      await db.storage.from("proof-of-payments").remove([path]);
      return Response.json({ error: "The entry changed or proof could not be saved. Check its status before retrying." }, { status: 409 });
    }
    return Response.json({ paymentStatus: "Proof Submitted", registrationStatus: entry.registration_status }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ paymentStatus: entry.payment_status, registrationStatus: entry.registration_status, onlineOnly, allowsProof }, { headers: { "Cache-Control": "no-store" } });
}
