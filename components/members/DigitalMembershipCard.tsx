"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import type { MemberMembership, MemberProfile } from "@/components/members/MemberGuard";
import GoogleWalletButton from "@/components/members/GoogleWalletButton";

type CardOrder = {
  order_number: string;
  plan_name: string;
  verification_token: string;
  starts_on: string | null;
  expires_on: string | null;
  membership_plans: { card_image_url: string | null } | { card_image_url: string | null }[] | null;
};

const cardTemplates: Record<string, string> = {
  monthly: "/membership-card-templates/monthly.png",
  "1 month": "/membership-card-templates/monthly.png",
  "3-month": "/membership-card-templates/three-months.png",
  "3 months": "/membership-card-templates/three-months.png",
  "6-month": "/membership-card-templates/six-months.png",
  "6 months": "/membership-card-templates/six-months.png",
  yearly: "/membership-card-templates/yearly.png",
  annual: "/membership-card-templates/yearly.png",
  "12 months": "/membership-card-templates/yearly.png",
  lifetime: "/membership-card-templates/lifetime.png",
};

function planImage(order: CardOrder) {
  const planName = order.plan_name.trim().toLowerCase();
  const template = Object.entries(cardTemplates).find(([name]) => planName.includes(name));
  if (template) return template[1];
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
      const digitalCard=cardOrder??{
        order_number:`PCC-MEMBER-${membership.id.slice(0,8).toUpperCase()}`,
        plan_name:membership.membership_type,
        verification_token:membership.verification_token,
        starts_on:membership.start_date,
        expires_on:membership.end_date,
        membership_plans:{card_image_url:membership.card_image_url},
      };
      setOrder(digitalCard);
      if(digitalCard.verification_token){
        const url=`${window.location.origin}/membership/verify/${digitalCard.verification_token}`;
        setVerifyUrl(url);
        setQrImage(await QRCode.toDataURL(url,{width:320,margin:1,errorCorrectionLevel:"M"}));
      }
      setLoading(false);
    }
    void load();
  }, [membership.card_image_url, membership.end_date, membership.id, membership.membership_type, membership.start_date, membership.verification_token]);

  if (loading) return <div className="mx-auto grid aspect-[1.56/1] w-full max-w-[30rem] place-items-center rounded-2xl bg-zinc-900 text-sm font-bold text-zinc-400">Preparing digital card…</div>;
  if (!order) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Your digital membership card could not be prepared.</div>;

  const image = planImage(order);

  return (
    <section className="mx-auto w-full max-w-[30rem]">
      <div className="relative aspect-[1.56/1] overflow-hidden rounded-[clamp(.75rem,3vw,1.5rem)] bg-zinc-950 text-white shadow-xl ring-1 ring-black/10">
        {image && <Image src={image} alt={`${order.plan_name} membership card`} fill sizes="(min-width:520px) 480px,calc(100vw - 32px)" className="object-cover" priority />}
        {!image&&<div className="absolute inset-0 bg-gradient-to-br from-zinc-950 to-red-900 p-[6%]"><p className="text-xs font-black uppercase tracking-[.25em] text-red-300">Polokwane Chess Club</p><p className="mt-2 text-2xl font-black">Digital Membership</p></div>}
        <p className="absolute left-[13.7%] top-[52.5%] max-w-[29%] truncate text-[clamp(.42rem,2.1vw,.78rem)] font-black uppercase tracking-wide text-white drop-shadow-md">{displayName}</p>
        <p className="absolute left-[13.7%] top-[66%] max-w-[29%] truncate text-[clamp(.4rem,1.85vw,.7rem)] font-bold tracking-wide text-white drop-shadow-md">{order.order_number}</p>
        <p className="absolute left-[13.7%] top-[79.5%] max-w-[29%] truncate text-[clamp(.4rem,1.85vw,.7rem)] font-bold tracking-wide text-white drop-shadow-md">{order.expires_on ?? membership.end_date ? date(order.expires_on ?? membership.end_date) : "NO EXPIRY"}</p>
        <div className="absolute left-[77.2%] top-[50%] aspect-square w-[17.5%] overflow-hidden rounded-[8%] bg-white">{qrImage&&<Image src={qrImage} alt="Scan to verify membership" fill sizes="90px" className="object-contain p-[3%]" />}</div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-800">{membership.membership_status}</span><span className="text-xs font-bold text-zinc-500">{player?.chess_sa_id ? `Chess SA ${player.chess_sa_id}` : order.plan_name}</span></div>
      <div className="mt-4 flex flex-wrap items-start gap-2">{process.env.NEXT_PUBLIC_GOOGLE_WALLET_ENABLED==="true"&&<GoogleWalletButton verificationToken={order.verification_token}/>} {qrImage&&<a href={qrImage} download={`PCC-${order.order_number}-QR.png`} className="rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-black text-white">Save QR</a>}<a href={verifyUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-300 px-4 py-2.5 text-xs font-black">Verify card</a><LinkButton href="/membership">Renew</LinkButton></div>
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="rounded-lg border border-zinc-300 px-4 py-2.5 text-xs font-black">{children}</a>;
}
