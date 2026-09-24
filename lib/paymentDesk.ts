import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentOrder = {
  id: string;
  registration_id: string;
  status: string;
  amount: number;
  currency: string;
  yoco_checkout_id: string | null;
  yoco_payment_id: string | null;
  yoco_mode: string | null;
  paid_at: string | null;
};

export type PaymentReferences = {
  registration_id: string;
  payment_status: string;
  proof_of_payment_url: string | null;
  order?: PaymentOrder | null;
  orderLookupFailed?: boolean;
};

export function paymentSource(row: PaymentReferences) {
  if (row.orderLookupFailed) return "Source unavailable";
  if (row.order?.status === "paid") {
    return row.order.yoco_mode === "live" ? "Yoco online payment" : "Yoco payment (test / unverified mode)";
  }
  if (row.proof_of_payment_url) return "Uploaded payment proof";
  if (row.payment_status === "Paid") return "Marked paid — method not recorded";
  if (row.order) return "Yoco checkout — payment not confirmed";
  return "No payment source recorded";
}

// A deadline also covers a stalled auth/client promise before fetch starts.
export async function paymentRequest<T>(request: PromiseLike<T>, signal?: AbortSignal, timeoutMs = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Payment loading timed out. Please retry.")), timeoutMs);
        onAbort = () => reject(new Error("Payment request cancelled."));
        if (signal?.aborted) onAbort();
        else signal?.addEventListener("abort", onAbort, { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

export async function attachPaymentOrders<T extends PaymentReferences>(db: SupabaseClient, rows: T[], signal: AbortSignal): Promise<T[]> {
  if (!rows.length) return rows;
  const orders = new Map<string, PaymentOrder>();
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { data, error } = await paymentRequest(db.from("registration_payment_orders")
      .select("id,registration_id,status,amount,currency,yoco_checkout_id,yoco_payment_id,yoco_mode,paid_at")
      .in("registration_id", rows.slice(offset, offset + 100).map(row => row.registration_id)).abortSignal(signal), signal);
    if (error) throw new Error(`Could not load payment references: ${error.message}`);
    for (const order of data as PaymentOrder[] ?? []) orders.set(order.registration_id, order);
  }
  return rows.map(row => ({ ...row, orderLookupFailed: false, order: orders.get(row.registration_id) ?? null }));
}

export function paymentDate(row: PaymentReferences) {
  if (row.orderLookupFailed) return "Unavailable";
  if (row.order?.status !== "paid" || !row.order.paid_at) return "Not recorded";
  const date = new Date(row.order.paid_at);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(date);
}

export function confirmedYocoPayment(row: PaymentReferences) {
  return !row.orderLookupFailed && row.order?.status === "paid" && row.order.yoco_mode === "live" && Boolean(row.order.yoco_payment_id);
}

export function paymentCsv(rows: unknown[][]) {
  return "\uFEFF" + rows.map(row => row.map(cell => {
    let value = String(cell ?? "");
    if (/^\s*[=+@-]/.test(value)) value = "'" + value;
    return '"' + value.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
}
