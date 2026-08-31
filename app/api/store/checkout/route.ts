import { createServerSupabase } from "@/lib/serverSupabase";
import { activeProductPrice } from "@/lib/storePayments";

export const runtime = "nodejs";

type CheckoutRequest = {
  productId?: unknown;
  quantity?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  if (process.env.STORE_CHECKOUT_ENABLED !== "true") {
    return Response.json({ error: "Online checkout is not open yet." }, { status: 503 });
  }

  const yocoSecret = process.env.YOCO_SECRET_KEY;
  if (!yocoSecret) {
    return Response.json({ error: "Payment service is not configured." }, { status: 503 });
  }

  let body: CheckoutRequest;
  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const productId = cleanText(body.productId, 80);
  const customerName = cleanText(body.customerName, 100);
  const customerEmail = cleanText(body.customerEmail, 180).toLowerCase();
  const customerPhone = cleanText(body.customerPhone, 40);
  const quantity = Number(body.quantity);

  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return Response.json({ error: "Invalid product." }, { status: 400 });
  }
  if (!customerName || !/^\S+@\S+\.\S+$/.test(customerEmail) || customerPhone.length < 7) {
    return Response.json({ error: "Enter a valid name, email address and phone number." }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return Response.json({ error: "Quantity must be between 1 and 20." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: product, error: productError } = await supabase
    .from("store_products")
    .select("id,name,description,regular_price,sale_price,sale_starts_at,sale_ends_at,stock_status,stock_quantity,published")
    .eq("id", productId)
    .eq("published", true)
    .maybeSingle();

  if (productError || !product || product.stock_status !== "available") {
    return Response.json({ error: "This product is not available for online purchase." }, { status: 409 });
  }
  if (product.stock_quantity !== null && product.stock_quantity < quantity) {
    return Response.json({ error: "The requested quantity is not available." }, { status: 409 });
  }

  const unitPrice = activeProductPrice(product);
  const totalAmount = Number((unitPrice * quantity).toFixed(2));
  const amountCents = Math.round(totalAmount * 100);
  if (amountCents < 200) {
    return Response.json({ error: "Yoco requires a minimum payment of R2.00." }, { status: 400 });
  }

  const orderId = crypto.randomUUID();
  const orderNumber = `PCC-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 4).toUpperCase()}`;
  const { error: orderError } = await supabase.from("store_orders").insert({
    id: orderId,
    order_number: orderNumber,
    product_id: product.id,
    product_name: product.name,
    unit_price: unitPrice,
    quantity,
    total_amount: totalAmount,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
  });

  if (orderError) {
    console.error("Could not create store order", orderError.message);
    return Response.json({ error: "Could not prepare the order." }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://polokwanechessclub.co.za").replace(/\/$/, "");
  const checkoutResponse = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${yocoSecret}`,
      "Content-Type": "application/json",
      "Idempotency-Key": orderId,
    },
    body: JSON.stringify({
      amount: amountCents,
      currency: "ZAR",
      successUrl: `${siteUrl}/store/checkout/success?order=${encodeURIComponent(orderNumber)}`,
      cancelUrl: `${siteUrl}/store/checkout/cancelled?order=${encodeURIComponent(orderNumber)}`,
      failureUrl: `${siteUrl}/store/checkout/failed?order=${encodeURIComponent(orderNumber)}`,
      clientReferenceId: orderNumber,
      externalId: orderId,
      metadata: { orderId, orderNumber, productId: product.id },
      subtotalAmount: Math.round(product.regular_price * quantity * 100),
      totalDiscount: Math.max(0, Math.round((product.regular_price - unitPrice) * quantity * 100)),
      lineItems: [{
        displayName: product.name,
        quantity,
        pricingDetails: {
          price: Math.round(unitPrice * 100),
          discountAmount: Math.max(0, Math.round((product.regular_price - unitPrice) * 100)),
        },
        description: product.description,
      }],
    }),
  });

  const checkout = (await checkoutResponse.json().catch(() => null)) as
    | { id?: string; redirectUrl?: string; processingMode?: string; message?: string }
    | null;

  if (!checkoutResponse.ok || !checkout?.id || !checkout.redirectUrl) {
    await supabase.from("store_orders").update({ status: "failed" }).eq("id", orderId);
    console.error("Yoco checkout creation failed", checkoutResponse.status, checkout?.message);
    return Response.json({ error: "Yoco could not start the payment." }, { status: 502 });
  }

  await supabase
    .from("store_orders")
    .update({
      status: "payment_pending",
      yoco_checkout_id: checkout.id,
      yoco_mode: checkout.processingMode === "live" ? "live" : "test",
    })
    .eq("id", orderId);

  return Response.json({ redirectUrl: checkout.redirectUrl });
}
