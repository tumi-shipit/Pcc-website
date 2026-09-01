import type { Metadata } from "next";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";

export const metadata: Metadata = { title: "Delivery, Returns and Payments | PCC Store", description: "Collection, delivery, returns and secure online payment information for the PCC Store." };

export default function StorePoliciesPage() {
  return <PublicPageShell><main className="min-h-screen bg-white px-5 pb-20 pt-32 text-slate-950 sm:px-8"><article className="mx-auto max-w-3xl"><p className="text-xs font-black uppercase tracking-[.2em] text-red-700">PCC Store</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">Delivery, returns and payments</h1><p className="mt-5 leading-7 text-slate-600">Clear information about receiving an order and what to do if something is wrong.</p>
    <Section title="Collection"><p>Collection is free. For safety and privacy, the full collection address is shown only after payment has been confirmed. PCC will contact you to arrange a collection time.</p></Section>
    <Section title="Delivery options"><ul className="list-disc space-y-2 pl-5"><li>Within Polokwane: R70, normally same day or next day.</li><li>PAXI store to store outside Polokwane: R150, normally 3–7 days.</li><li>PAXI home to home outside Polokwane: R170, normally 3–7 days.</li><li>A courier of your choice can be arranged with PCC before ordering; its price and timing depend on the courier.</li></ul><p className="mt-3 text-sm text-slate-500">Delivery times are estimates and may be affected by the delivery provider or circumstances outside PCC’s control.</p></Section>
    <Section title="Returns and order problems"><p>Contact PCC as soon as possible if an item is damaged, incorrect or not as described. Keep the item and packaging while PCC reviews the order. Eligibility for a return, replacement or refund depends on the item’s condition, the reason for the request and applicable South African consumer law. Personalised or completed digital services may not be returnable once work has started.</p></Section>
    <Section title="Secure online payment"><p>Payments are completed through a secure online payment page. PCC does not receive or keep your card details. An order is confirmed only after PCC receives payment confirmation.</p></Section>
    <Section title="Need help?"><p>Email <a className="font-bold underline" href="mailto:support@polokwanechessclub.co.za">support@polokwanechessclub.co.za</a> or use the <Link className="font-bold underline" href="/contact">contact page</Link> before ordering.</p></Section>
  </article></main></PublicPageShell>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mt-10 border-t border-slate-200 pt-7"><h2 className="text-2xl font-black">{title}</h2><div className="mt-3 leading-7 text-slate-600">{children}</div></section>; }
