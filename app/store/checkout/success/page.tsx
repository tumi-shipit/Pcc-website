import PaymentResultPage from "@/components/store/PaymentResultPage";
import ClearBagOnSuccess from "@/components/store/ClearBagOnSuccess";
import { createServerSupabase } from "@/lib/serverSupabase";

const collectionAddress = "73 Hauptfleisch St, Flora Park, Polokwane, 0699, South Africa";

export default async function PaymentSuccessPage({ searchParams }: PageProps<"/store/checkout/success">) {
  const { order } = await searchParams;
  const reference = typeof order === "string" ? order.slice(0, 80) : "";
  const { data } = reference ? await createServerSupabase().from("store_orders").select("status,fulfillment_method").eq("order_number", reference).maybeSingle() : { data: null };
  const confirmedCollection = data?.status === "paid" && data.fulfillment_method === "collection";
  return <><ClearBagOnSuccess /><PaymentResultPage tone="success" title={data?.status === "paid" ? "Payment confirmed" : "Payment submitted"} message={confirmedCollection ? `Your order is paid. Collection is at ${collectionAddress}. PCC will contact you to arrange a collection time.` : "Your order is confirmed after PCC receives the secure payment confirmation. We will contact you using the details supplied during checkout."} /></>;
}
