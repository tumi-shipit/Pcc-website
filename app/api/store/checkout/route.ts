import { createServerSupabase } from "@/lib/serverSupabase";
import { activeProductPrice } from "@/lib/storePayments";

export const runtime = "nodejs";
type RequestedItem={productId?:unknown;quantity?:unknown;option?:unknown};
type CheckoutRequest={items?:unknown;productId?:unknown;quantity?:unknown;option?:unknown;customerName?:unknown;customerEmail?:unknown;customerPhone?:unknown};
function text(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}

export async function POST(request:Request){
  if(process.env.STORE_CHECKOUT_ENABLED!=="true")return Response.json({error:"Online checkout is not open yet."},{status:503});
  const yocoSecret=process.env.YOCO_SECRET_KEY;if(!yocoSecret)return Response.json({error:"Payment service is not configured."},{status:503});
  let body:CheckoutRequest;try{body=await request.json() as CheckoutRequest}catch{return Response.json({error:"Invalid checkout request."},{status:400})}
  const customerName=text(body.customerName,100),customerEmail=text(body.customerEmail,180).toLowerCase(),customerPhone=text(body.customerPhone,40);
  if(!customerName||!/^\S+@\S+\.\S+$/.test(customerEmail)||customerPhone.length<7)return Response.json({error:"Enter a valid name, email address and phone number."},{status:400});
  const requested:Array<RequestedItem>=Array.isArray(body.items)?body.items as RequestedItem[]:[{productId:body.productId,quantity:body.quantity,option:body.option}];
  if(!requested.length||requested.length>20)return Response.json({error:"Your bag must contain between 1 and 20 products."},{status:400});
  const normal=requested.map((item)=>({productId:text(item.productId,80),quantity:Number(item.quantity),option:text(item.option,30)||null}));
  if(normal.some((item)=>!/^[0-9a-f-]{36}$/i.test(item.productId)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20))return Response.json({error:"Your bag contains an invalid item."},{status:400});
  const ids=[...new Set(normal.map((item)=>item.productId))];const supabase=createServerSupabase();
  const {data:products,error:productError}=await supabase.from("store_products").select("id,name,description,regular_price,sale_price,sale_starts_at,sale_ends_at,stock_status,stock_quantity,published").in("id",ids).eq("published",true);
  if(productError||!products||products.length!==ids.length)return Response.json({error:"One or more products are not available."},{status:409});
  const lines=[] as Array<{product_id:string;product_name:string;unit_price:number;quantity:number;selected_option:string|null;line_total:number;description:string|null;regular_price:number}>;
  for(const requestLine of normal){const product=products.find((item)=>item.id===requestLine.productId);if(!product||product.stock_status!=="available"||(product.stock_quantity!==null&&product.stock_quantity<requestLine.quantity))return Response.json({error:`${product?.name||"A product"} is not available in that quantity.`},{status:409});const unit=activeProductPrice(product);lines.push({product_id:product.id,product_name:product.name,unit_price:unit,quantity:requestLine.quantity,selected_option:requestLine.option,line_total:Number((unit*requestLine.quantity).toFixed(2)),description:product.description,regular_price:product.regular_price});}
  const totalAmount=Number(lines.reduce((sum,line)=>sum+line.line_total,0).toFixed(2)),amountCents=Math.round(totalAmount*100);if(amountCents<200)return Response.json({error:"Yoco requires a minimum payment of R2.00."},{status:400});
  const orderId=crypto.randomUUID(),orderNumber=`PCC-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0,4).toUpperCase()}`,first=lines[0];
  const {error:orderError}=await supabase.from("store_orders").insert({id:orderId,order_number:orderNumber,product_id:first.product_id,product_name:lines.length===1?first.product_name:`${lines.length} store items`,unit_price:totalAmount,quantity:1,total_amount:totalAmount,customer_name:customerName,customer_email:customerEmail,customer_phone:customerPhone});
  if(orderError){console.error("Could not create store order",orderError.message);return Response.json({error:"Could not prepare the order."},{status:500})}
  const {error:itemError}=await supabase.from("store_order_items").insert(lines.map((line)=>({order_id:orderId,product_id:line.product_id,product_name:line.product_name,unit_price:line.unit_price,quantity:line.quantity,selected_option:line.selected_option,line_total:line.line_total})));
  if(itemError){await supabase.from("store_orders").update({status:"failed"}).eq("id",orderId);console.error("Could not create order items",itemError.message);return Response.json({error:"Could not prepare the items in your order."},{status:500})}
  const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||"https://polokwanechessclub.co.za").replace(/\/$/,"");
  const checkoutResponse=await fetch("https://payments.yoco.com/api/checkouts",{method:"POST",headers:{Authorization:`Bearer ${yocoSecret}`,"Content-Type":"application/json","Idempotency-Key":orderId},body:JSON.stringify({amount:amountCents,currency:"ZAR",successUrl:`${siteUrl}/store/checkout/success?order=${encodeURIComponent(orderNumber)}`,cancelUrl:`${siteUrl}/store/checkout/cancelled?order=${encodeURIComponent(orderNumber)}`,failureUrl:`${siteUrl}/store/checkout/failed?order=${encodeURIComponent(orderNumber)}`,clientReferenceId:orderNumber,externalId:orderId,metadata:{orderId,orderNumber},subtotalAmount:lines.reduce((sum,line)=>sum+Math.round(line.regular_price*line.quantity*100),0),totalDiscount:lines.reduce((sum,line)=>sum+Math.max(0,Math.round((line.regular_price-line.unit_price)*line.quantity*100)),0),lineItems:lines.map((line)=>({displayName:line.selected_option?`${line.product_name} · ${line.selected_option}`:line.product_name,quantity:line.quantity,pricingDetails:{price:Math.round(line.unit_price*100),discountAmount:Math.max(0,Math.round((line.regular_price-line.unit_price)*100))},description:line.description}))})});
  const checkout=await checkoutResponse.json().catch(()=>null) as {id?:string;redirectUrl?:string;processingMode?:string;message?:string}|null;
  if(!checkoutResponse.ok||!checkout?.id||!checkout.redirectUrl){await supabase.from("store_orders").update({status:"failed"}).eq("id",orderId);console.error("Yoco checkout creation failed",checkoutResponse.status,checkout?.message);return Response.json({error:"Yoco could not start the payment."},{status:502})}
  await supabase.from("store_orders").update({status:"payment_pending",yoco_checkout_id:checkout.id,yoco_mode:checkout.processingMode==="live"?"live":"test"}).eq("id",orderId);
  return Response.json({redirectUrl:checkout.redirectUrl});
}
