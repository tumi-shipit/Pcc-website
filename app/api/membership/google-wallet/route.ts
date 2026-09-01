import { createSign } from "node:crypto";
import { createServerSupabase } from "@/lib/serverSupabase";

export const runtime = "nodejs";

type MembershipOrder = {
  order_number: string;
  plan_name: string;
  member_name: string;
  verification_token: string;
  starts_on: string | null;
  expires_on: string | null;
  status: string;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function localized(value: string) {
  return { defaultValue: { language: "en-ZA", value } };
}

function isoDate(value: string, endOfDay = false) {
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}+02:00`;
}

function signWalletJwt(payload: object, privateKey: string) {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey).toString("base64url")}`;
}

export async function POST(request: Request) {
  let body: { verificationToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.verificationToken === "string" ? body.verificationToken.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(token)) {
    return Response.json({ error: "Invalid membership card." }, { status: 400 });
  }

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const classId = process.env.GOOGLE_WALLET_CLASS_ID;
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  const encodedKey = process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64;
  if (!issuerId || !classId || !serviceAccountEmail || !encodedKey) {
    return Response.json({ error: "Google Wallet is being connected. Please try again later." }, { status: 503 });
  }

  const { data } = await createServerSupabase()
    .from("membership_orders")
    .select("order_number,plan_name,member_name,verification_token,starts_on,expires_on,status")
    .eq("verification_token", token)
    .eq("status", "paid")
    .maybeSingle();
  const order = data as MembershipOrder | null;
  if (!order) return Response.json({ error: "This membership card is not active." }, { status: 404 });

  let privateKey: string;
  try {
    privateKey = Buffer.from(encodedKey, "base64").toString("utf8");
  } catch {
    return Response.json({ error: "Google Wallet is not configured correctly." }, { status: 503 });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://polokwanechessclub.co.za").replace(/\/$/, "");
  const verifyUrl = `${site}/membership/verify/${order.verification_token}`;
  const objectSuffix = order.order_number.replace(/[^A-Za-z0-9_-]/g, "_");
  const genericObject = {
    id: `${issuerId}.${objectSuffix}`,
    classId,
    genericType: "GENERIC_OTHER",
    hexBackgroundColor: "#18181b",
    cardTitle: localized("Polokwane Chess Club"),
    subheader: localized(order.plan_name),
    header: localized(order.member_name),
    barcode: { type: "QR_CODE", value: verifyUrl, alternateText: order.order_number },
    ...(order.starts_on && order.expires_on
      ? {
          validTimeInterval: {
            start: { date: isoDate(order.starts_on) },
            end: { date: isoDate(order.expires_on, true) },
          },
          notifications: { expiryNotification: { enableNotification: true } },
        }
      : {}),
    textModulesData: [
      { id: "membership_period", header: "Membership period", body: `${order.starts_on ?? "Pending"} to ${order.expires_on ?? "Pending"}` },
      { id: "membership_reference", header: "PCC reference", body: order.order_number },
    ],
    linksModuleData: { uris: [{ id: "verify", uri: verifyUrl, description: "Verify membership" }] },
  };

  const jwt = signWalletJwt(
    {
      iss: serviceAccountEmail,
      aud: "google",
      origins: [new URL(site).host],
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: { genericObjects: [genericObject] },
    },
    privateKey,
  );

  return Response.json({ url: `https://pay.google.com/gp/v/save/${jwt}` });
}
