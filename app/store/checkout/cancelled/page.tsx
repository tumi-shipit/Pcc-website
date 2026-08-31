import PaymentResultPage from "@/components/store/PaymentResultPage";

export default function PaymentCancelledPage() {
  return <PaymentResultPage tone="warning" title="Payment cancelled" message="No order will be fulfilled from this checkout. You can return to the store and try again, or contact PCC for assistance." />;
}
