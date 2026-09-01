"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import type { MemberMembership, MemberProfile } from "@/components/members/MemberGuard";

type CardOrder = {
  order_number: string;
  plan_name: string;
  verification_token: string;
  starts_on: string | null;
  expires_on: string | null;
  membership_plans: { card_image_url: string | null } | { card_image_url: string | null }[] | null;
};

function planImage(order: CardOrder) {
  const plan = Array.isArray(order.membership_plans) ? order.membership_plans[0] : order.membership_plans;
  return plan?.card_image_url ?? null;
}

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "Pending";
}

export default function DigitalMembershipCard({ membership, player, displayName }: { membership: MemberMembership; player: MemberProfile | null; displayName: string }) {
  const [order, setOrder] = useState<CardOrder | null>(null);
  const [verifyUrl, setVerifyUrl] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("membership_orders")
        .select("order_number,plan_name,verification_token,starts_on,expires_on,membership_plans(card_image_url)")
        .eq("membership_id", membership.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const cardOrder=(data as CardOrder | null) ?? null;
      setOrder(cardOrder);
      if(cardOrder){
        const url=`${window.location.origin}/membership/verify/${cardOrder.verification_token}`;
        setVerifyUrl(url);
        setQrImage(await QRCode.toDataURL(url,{width:320,margin:1,errorCorrectionLevel:"M"}));
      }
      setLoading(false);
    }
    void load();
  }, [membership.id]);

  if (loading) return <div className="grid aspect-[1.586/1] place-items-center rounded-2xl bg-zinc-900 text-sm font-bold text-zinc-400">Preparing digital card…</div>;
  if (!order) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Your membership is active, but no digital purchase card is linked yet. PCC can link older or manually-created memberships from Admin.</div>;

  const image = planImage(order);

  return (
    <section>
      <div className="relative aspect-[1.586/1] overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 to-red-900 text-white shadow-2xl">
        {image && <Image src={image} alt={`${order.plan_name} membership card`} fill sizes="(min-width:1024px) 700px,100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-between p-[5%]">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[clamp(.55rem,1.4vw,.75rem)] font-black uppercase tracking-[.25em] text-red-300">Polokwane Chess Club</p><p className="mt-1 text-[clamp(1rem,3vw,2rem)] font-black">Digital Membership</p></div>
            <span className="rounded-full bg-emerald-500 px-3 py-1 text-[clamp(.55rem,1.2vw,.7rem)] font-black uppercase">{membership.membership_status}</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0"><p className="truncate text-[clamp(1rem,3.5vw,2.2rem)] font-black">{displayName}</p><p className="mt-1 text-[clamp(.55rem,1.5vw,.85rem)] text-zinc-200">{order.plan_name} · Expires {date(order.expires_on ?? membership.end_date)}</p><p className="mt-1 text-[clamp(.5rem,1.2vw,.7rem)] font-bold text-zinc-300">{player?.chess_sa_id ? `Chess SA ${player.chess_sa_id}` : order.order_number}</p></div>
            <div className="relative h-[clamp(4.5rem,16vw,7.5rem)] w-[clamp(4.5rem,16vw,7.5rem)] shrink-0 overflow-hidden rounded-lg bg-white p-1">{qrImage&&<Image src={qrImage} alt="Scan to verify membership" fill sizes="120px" className="object-contain p-1" />}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">{qrImage&&<a href={qrImage} download={`PCC-${order.order_number}-QR.png`} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Save QR code</a>}<a href={verifyUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-black">Verify my card</a><LinkButton href="/membership">Renew membership</LinkButton></div>
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-black">{children}</a>;
}
