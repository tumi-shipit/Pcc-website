import PublicPageShell from "@/components/PublicPageShell";
import CartCheckout from "@/components/store/CartCheckout";

export default function StoreCartPage(){return <PublicPageShell><main className="min-h-screen bg-white px-5 pb-20 pt-32 text-slate-950 sm:px-8"><div className="mx-auto max-w-7xl"><CartCheckout checkoutOpen={process.env.STORE_CHECKOUT_ENABLED==="true"}/></div></main></PublicPageShell>}
