import PaymentResultPage from "@/components/store/PaymentResultPage";

export default function PaymentFailedPage() {
  return <PaymentResultPage tone="error" title="Payment unsuccessful" message="The payment could not be completed. Please return to the store and try again, or contact PCC before making another attempt if you are unsure." />;
}
